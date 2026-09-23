"""CUDA thermal evolution for the CPU reference LPBF enthalpy-conduction model.

The common cell-integrated moving source is evaluated on the host and transferred
to CUDA. Conduction, enthalpy update, constitutive interpolation and melt state
run on CUDA in float64. This bounded pilot is not a registered worker backend.
"""

import math
import re
from unittest.mock import patch

import numpy as np

from lpbf_core_physics import calculate_mesh_domain, scan_segments, thermal_si_inputs
from lpbf_heat_source import source_limited_step
from lpbf_peak import PeakMeltTracker
from lpbf_simulation import validate, run as cpu_run
from lpbf_material_registry import enthalpy_table, property_at


MODEL_ID = "stationary-enthalpy-conduction-v1"
GPU_SOLVER_ID = "enthalpy-fv-6-cuda-pilot-1"
MAX_CELLS = 100000
MAX_STEPS = 20000
# Frozen before any GPU parity result: master plan §11 integral target <=1%;
# W/D phase boundaries are separately limited to one actual grid cell.
PARITY_TARGETS = {"integralRelativeMax": .01, "widthDepthAbsoluteCellsMax": 1.0,
                  "fieldRiseL2RelativeMax": .01, "fieldRiseMaxRelativeMax": .01,
                  "peakMeltVolumeRelativeMax": .01,
                  "source": "docs/DIGITAL_TWIN_MASTER_PLAN_2026-09-21.md#11"}


def require_cuda(device):
    if not isinstance(device, str) or not re.fullmatch(r"cuda:[0-9]+", device):
        raise ValueError("Explicit cuda:N device required; no CPU fallback")
    try:
        import torch
    except ImportError as exc:
        raise RuntimeError("PyTorch CUDA runtime unavailable") from exc
    if not torch.cuda.is_available() or int(device[5:]) >= torch.cuda.device_count():
        raise RuntimeError(f"CUDA device {device} unavailable; no CPU fallback")
    return torch, torch.device(device)


def _interp(torch, values, xp, fp):
    shape = values.shape
    flat = values.reshape(-1)
    index = torch.searchsorted(xp, flat).clamp(1, len(xp)-1)
    lo, hi = index-1, index
    out = fp[lo] + (flat-xp[lo])*(fp[hi]-fp[lo])/(xp[hi]-xp[lo])
    return torch.where(flat <= xp[0], fp[0], torch.where(flat >= xp[-1], fp[-1], out)).reshape(shape)


def _conduction(torch, temperature, conductivity, active, dx):
    rate = torch.zeros_like(temperature)
    diagonal = torch.zeros_like(temperature)
    for axis in range(3):
        left, right = [slice(None)]*3, [slice(None)]*3
        left[axis], right[axis] = slice(None, -1), slice(1, None)
        left, right = tuple(left), tuple(right)
        k_face = 2*conductivity[left]*conductivity[right]/(conductivity[left]+conductivity[right])
        face = k_face/(dx*dx)*(active[left]&active[right])
        flux = face*(temperature[right]-temperature[left])
        rate[left] += flux
        rate[right] -= flux
        diagonal[left] += face
        diagonal[right] += face
    return rate, diagonal


def run_gpu(raw, device="cuda:0", capture_final=False):
    """Run a bounded single-track/layer reference-physics case on explicit CUDA."""
    torch, cuda = require_cuda(device)
    p, material = validate(raw)
    if (p["mode"] != "standard" or p["backend"] != "reference" or p["study"] != "none"
            or p["tracks"] != 1 or p["layers"] != 1):
        raise ValueError("CUDA pilot supports one-track, one-layer standard/reference cases only")
    domain = calculate_mesh_domain(p)
    radius, span, nxy, nz, dx, substrate = (domain[k] for k in
        ("radius", "span", "nxy", "nz", "dx", "substrate_depth"))
    if nxy*nxy*nz > MAX_CELLS:
        raise ValueError("CUDA pilot cell budget exceeded")
    axis = (np.arange(nxy)+.5)*dx-span/2
    z = (np.arange(nz)+.5)*dx-substrate
    layer_m = p["layer_um"]*1e-6
    if not np.any(z < 0) or not np.any((z >= 0)&(z < layer_m)):
        raise ValueError("Mesh cannot resolve substrate and powder layer")
    _, _, zz = np.meshgrid(axis, axis, z, indexing="ij")
    # PeakMeltTracker receives exactly the CPU reference's C-order cell coordinates.
    xyz = np.stack(np.meshgrid(axis, axis, z, indexing="ij"), axis=-1).reshape(-1, 3)
    tracker = PeakMeltTracker(xyz, dx, material)
    ti = thermal_si_inputs(p, material)
    t0 = ti["preheat_K"]
    rho0 = float(property_at(material, t0, 1))
    rho = torch.as_tensor(rho0*np.where(zz > 0, p["packingFraction"], 1.), dtype=torch.float64, device=cuda)
    active = torch.as_tensor(zz < layer_m, device=cuda)
    powder = torch.as_tensor(zz > 0, device=cuda)
    temperature = torch.full((nxy, nxy, nz), t0, dtype=torch.float64, device=cuda)
    enthalpy = torch.zeros_like(temperature)
    ever = torch.zeros_like(active)
    table = torch.as_tensor(material["table"], dtype=torch.float64, device=cuda)
    table_t = table[:, 0].contiguous()
    table_k = table[:, 2].contiguous()
    table_cp = table[:, 3].contiguous()
    tt_np, hh_np = enthalpy_table(material)
    tt = torch.as_tensor(tt_np, dtype=torch.float64, device=cuda)
    hh = torch.as_tensor(hh_np, dtype=torch.float64, device=cuda)
    h0 = float(np.interp(t0, tt_np, hh_np))
    h_boil = float(np.interp(material["boiling_K"], tt_np, hh_np))
    cp_floor = min(row[3] for row in material["table"])
    segments, end = scan_segments(p)
    top_index = int(np.flatnonzero(z < layer_m)[-1])
    energy_in = energy_out = 0.
    peak = t0
    time = 0.
    step = 0
    min_dt = p["maxDt_s"]
    max_dt = 0.
    while time < end:
        if step >= MAX_STEPS:
            raise ValueError("CUDA pilot timestep budget exceeded")
        segment = next((s for s in segments if s["start_s"] <= time+1e-14 and time < s["end_s"]-1e-14), None)
        k = _interp(torch, temperature, table_t, table_k) * torch.where(
            powder & ~ever, p["powderConductivityRatio"], 1.)
        cp = _interp(torch, temperature, table_t, table_cp)
        dt = min(p["maxDt_s"], .12*dx*dx/torch.max(k/(rho*cp)).item(),
                 radius/(4*ti["speed_m_s"]), end-time)
        events = [s[v]-time for s in segments for v in ("start_s", "end_s") if s[v] > time+1e-14]
        if events:
            dt = min(dt, min(events))
        rate, diagonal = _conduction(torch, temperature, k, active, dx)
        bottom = 2*k[:, :, 0]*(temperature[:, :, 0]-t0)/dx**2
        rate[:, :, 0] -= bottom
        top = temperature[:, :, top_index]
        surface_loss = (p["convection_W_m2K"]*(top-t0)
            + material["emissivity"]*5.670374419e-8*(top**4-t0**4))/dx
        rate[:, :, top_index] -= surface_loss
        diagonal[:, :, 0] += 2*k[:, :, 0]/dx**2
        diagonal[:, :, top_index] += (p["convection_W_m2K"]
            + material["emissivity"]*5.670374419e-8*(top+t0)*(top**2+t0**2))/dx
        dt = min(dt, torch.min(.9*rho*cp_floor/torch.clamp(diagonal, min=1e-30)).item())
        dt, source_np, _, _, _ = source_limited_step(axis, z, dx, segment, time, dt, layer_m,
            radius, layer_m, ti["absorbed_power_W"], rate.cpu().numpy(), (rho*cp).cpu().numpy())
        source = torch.as_tensor(source_np, dtype=torch.float64, device=cuda)
        rate += source
        enthalpy += dt*rate
        specific_h = enthalpy/rho+h0
        if (not torch.isfinite(specific_h).all().item() or torch.min(specific_h).item() < hh_np[0]-1e-8
                or torch.max(specific_h).item() >= h_boil):
            raise ValueError("Thermal model validity exceeded (boiling or nonphysical enthalpy)")
        temperature = _interp(torch, specific_h, hh, tt)
        time += dt
        step += 1
        min_dt = min(min_dt, dt)
        max_dt = max(max_dt, dt)
        energy_in += float(source_np.sum())*dx**3*dt
        energy_out += (bottom.sum().item()+surface_loss.sum().item())*dx**3*dt
        ever |= (temperature >= material["liquidus_K"]) & active
        peak = max(peak, torch.max(temperature).item())
        melt_count = torch.count_nonzero((temperature >= material["liquidus_K"]) & active).item()
        if melt_count > tracker.count:
            tracker.observe(temperature.cpu().numpy(), layer_m, p["scanAngle_deg"], time, step,
                            sampled=True)
    stored = enthalpy.sum().item()*dx**3
    closure = abs(energy_in-energy_out-stored)/max(energy_in, 1e-12)
    if closure > .01:
        raise ValueError(f"CUDA energy balance failed: {closure:.3%}")
    metrics, extraction = tracker.finish(None, step)
    metrics["peakTemperature_K"] = peak
    result = {"solver": {"id": GPU_SOLVER_ID, "modelId": MODEL_ID,
                       "actualBackend": device, "thermalEvolutionDevice": device,
                       "sourceIntegrationDevice": "cpu", "sourceTimestepLimiterDevice": "cpu",
                       "dtype": "float64"},
            "material": {k: material[k] for k in ("name", "materialId", "materialRevisionSha256", "version")},
            "settings": p, "metrics": metrics, "peakExtraction": extraction,
            "energyBalance": {"input_J": energy_in, "losses_J": energy_out,
                              "stored_J": stored, "relativeError": closure},
            "discretization": {"cells": nxy*nxy*nz, "mesh_m": dx,
                               "minimumDt_s": min_dt, "maximumDt_s": max_dt,
                               "meanDt_s": end/step, "steps": step},
            "validationStatus": "unvalidated", "productionReady": False}
    if capture_final:
        return result, {"temperature_K": temperature.cpu().numpy().ravel(),
                        "coordinates_m": xyz, "time_s": time, "surface_m": layer_m,
                        "steps": step}
    return result


def _run_cpu_with_final(raw):
    """Observe the reference solver's sampled final field without filesystem IO."""
    captured = {}

    class FinalFieldRecorder:
        def __init__(self, folder, coords, spacing, material, process=None):
            self.coords = np.asarray(coords).copy()

        def record(self, time, temperature, surface):
            captured["frame"] = {"time_s": float(time), "surface_m": float(surface)}
            captured["temperature"] = np.asarray(temperature).ravel().copy()
            captured["coordinates"] = self.coords

        def finish(self):
            return None

    # The recorder observes accepted samples; it does not participate in physics.
    with patch("lpbf_simulation.FieldRecorder", FinalFieldRecorder):
        cpu = cpu_run(raw)
    if not captured:
        raise ValueError("CPU final temperature frame missing")
    return cpu, captured["frame"], captured["temperature"], captured["coordinates"]


def _field_parity(cpu, gpu, frame, cpu_temperature, cpu_coordinates, gpu_field):
    gpu_temperature = gpu_field["temperature_K"]
    gpu_coordinates = gpu_field["coordinates_m"]
    cpu_disc, gpu_disc = cpu["discretization"], gpu["discretization"]
    cpu_time = cpu["thermalHistory"][-1]["time_s"]
    expected_end = scan_segments(cpu["settings"])[1]
    aligned = (cpu_disc["cells"] == gpu_disc["cells"] == len(cpu_temperature) == len(gpu_temperature)
        and cpu_disc["steps"] == gpu_disc["steps"] == gpu_field["steps"]
        and math.isclose(cpu_disc["mesh_m"], gpu_disc["mesh_m"], rel_tol=1e-12)
        and math.isclose(frame["time_s"], cpu_time, rel_tol=1e-12, abs_tol=1e-14)
        and math.isclose(cpu_time, expected_end, rel_tol=1e-12, abs_tol=1e-14)
        and math.isclose(gpu_field["time_s"], cpu_time, rel_tol=1e-12, abs_tol=1e-14)
        and math.isclose(gpu_field["surface_m"], frame["surface_m"], rel_tol=1e-12)
        and cpu_coordinates.shape == gpu_coordinates.shape
        and np.array_equal(cpu_coordinates, gpu_coordinates))
    alignment = {"status": "pass" if aligned else "failed", "cpuFinalTime_s": cpu_time,
                 "cpuFrameTime_s": frame["time_s"], "gpuFinalTime_s": gpu_field["time_s"],
                 "expectedEnd_s": expected_end, "cpuSteps": cpu_disc["steps"],
                 "gpuSteps": gpu_disc["steps"], "cellCount": cpu_disc["cells"]}
    if not aligned:
        return alignment, {"status": "failed", "reason": "Grid, accepted steps, or final sampling time differs"}
    if not np.isfinite(cpu_temperature).all() or not np.isfinite(gpu_temperature).all():
        return alignment, {"status": "failed", "reason": "Nonfinite final temperature field"}
    t0 = cpu["settings"]["preheat_C"]+273.15
    difference = gpu_temperature-cpu_temperature
    rise = cpu_temperature-t0
    l2 = float(np.linalg.norm(difference)/max(np.linalg.norm(rise), 1.0))
    maximum = float(np.max(np.abs(difference))/max(np.max(np.abs(rise)), 1.0))
    status = ("pass" if l2 <= PARITY_TARGETS["fieldRiseL2RelativeMax"]
              and maximum <= PARITY_TARGETS["fieldRiseMaxRelativeMax"] else "failed")
    return alignment, {"status": status, "relativeRiseL2": l2,
                       "relativeRiseMax": maximum, "cpuEncoding": "float64 final recorder sample",
                       "gpuEncoding": "float64 final state"}


def compare_with_cpu(raw, device="cuda:0"):
    """Run the same fixed case and assess frozen integral and grid-cell targets."""
    gpu, gpu_field = run_gpu(raw, device, capture_final=True)
    cpu, frame, cpu_temperature, cpu_coordinates = _run_cpu_with_final(raw)
    if (cpu["coreContract"]["modelId"] != gpu["solver"]["modelId"]
            or cpu["material"]["materialRevisionSha256"] != gpu["material"]["materialRevisionSha256"]):
        raise ValueError("CPU/GPU model or material revision mismatch")
    comparisons = {}
    alignment, field = _field_parity(cpu, gpu, frame, cpu_temperature, cpu_coordinates, gpu_field)
    comparisons["finalSampling"] = alignment
    comparisons["finalTemperatureField"] = field
    for field, (a, b) in {
        "peakTemperature_K": (cpu["metrics"]["peakTemperature_K"], gpu["metrics"]["peakTemperature_K"]),
        "input_J": (cpu["energyBalance"]["input_J"], gpu["energyBalance"]["input_J"]),
        "losses_J": (cpu["energyBalance"]["losses_J"], gpu["energyBalance"]["losses_J"]),
        "stored_J": (cpu["energyBalance"]["stored_J"], gpu["energyBalance"]["stored_J"]),
    }.items():
        difference = abs(a-b)/max(abs(a), 1e-30)
        comparisons[field] = {"cpu": a, "gpu": b, "relativeDifference": difference,
                              "status": "pass" if difference <= PARITY_TARGETS["integralRelativeMax"] else "failed"}
    cell_um = gpu["discretization"]["mesh_m"]*1e6
    for field in ("width_um", "depth_um", "length_um"):
        a, b = cpu["metrics"][field], gpu["metrics"][field]
        difference = abs(a-b)
        comparisons[field] = {"cpu": a, "gpu": b, "absoluteDifference_um": difference,
            "status": "inconclusive" if a == b == 0 else (
                "pass" if difference <= PARITY_TARGETS["widthDepthAbsoluteCellsMax"]*cell_um else "failed")}
    a, b = cpu["metrics"]["volume_um3"], gpu["metrics"]["volume_um3"]
    difference = abs(a-b)/max(a, 1e-30)
    comparisons["volume_um3"] = {"cpu": a, "gpu": b, "relativeDifference": difference,
        "status": "inconclusive" if a == b == 0 else (
            "pass" if difference <= PARITY_TARGETS["peakMeltVolumeRelativeMax"] else "failed")}
    statuses = [x["status"] for x in comparisons.values()]
    status = "failed" if "failed" in statuses else "inconclusive" if "inconclusive" in statuses else "pass"
    return {"status": status, "scope": "same-model CPU/GPU numerical parity only",
            "experimentalValidation": False, "targets": dict(PARITY_TARGETS),
            "gpu": gpu, "cpu": {"solver": cpu["solver"], "coreContract": cpu["coreContract"],
                         "material": {k: cpu["material"][k] for k in ("name", "materialId", "materialRevisionSha256", "version")},
                         "discretization": cpu["discretization"]}, "comparisons": comparisons}

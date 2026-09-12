"""Conservative transient enthalpy finite-volume reference solver, SI internally.

Fixed material domain: no momentum, free surface, evaporation or shrinkage.
The boiling boundary is a validity STOP, never a clipped temperature result.
"""
import copy
import hashlib
import json
import math
import datetime
from pathlib import Path
import numpy as np
from lpbf_material_registry import material, property_at, enthalpy_table
from lpbf_verification import compare, convergence

VERSION = "enthalpy-fv-1"
DEFAULTS = dict(mode="screening", material="Inconel 718", power_W=200., speed_mm_s=800.,
                beamDiameter_um=80., preheat_C=80., layer_um=40., hatch_um=100.,
                mesh_um=20., maxDt_s=1e-6, trackLength_um=600., tracks=1, layers=1,
                dwell_s=0.0002, cooling_s=0.0005, scanAngle_deg=0., layerRotation_deg=67.,
                strategy="meander", packingFraction=0.55, powderConductivityRatio=0.12,
                convection_W_m2K=20., timeout_s=300., study="none", backend="auto")
BOUNDS = dict(power_W=(10, 1500), speed_mm_s=(10, 10000), beamDiameter_um=(20, 500),
              preheat_C=(0, 1200), layer_um=(10, 150), hatch_um=(10, 1000), mesh_um=(5, 80),
              maxDt_s=(1e-9, 1e-4), trackLength_um=(100, 3000), tracks=(1, 8), layers=(1, 5),
              dwell_s=(0, .1), cooling_s=(0, .1), scanAngle_deg=(-360, 360),
              layerRotation_deg=(-360, 360), packingFraction=(.2, 1),
              powderConductivityRatio=(.01, 1), convection_W_m2K=(0, 1000), timeout_s=(10, 3600))


def validate(raw):
    if not isinstance(raw, dict) or set(raw)-set(DEFAULTS)-{"properties", "measurements", "absorptivity"}:
        raise ValueError("Unknown simulation input fields")
    p = {**DEFAULTS, **raw}
    if p["backend"] not in ("auto", "reference", "openfoam-thermal"):
        raise ValueError("Unknown thermal backend")
    for k, (lo, hi) in BOUNDS.items():
        if isinstance(p[k], bool) or not isinstance(p[k], (int, float)) or not math.isfinite(p[k]) or not lo <= p[k] <= hi:
            raise ValueError(f"{k} must be finite in [{lo}, {hi}]")
        if k in ("tracks", "layers") and int(p[k]) != p[k]:
            raise ValueError(f"{k} must be integer")
    if p["mode"] not in ("screening", "standard", "high-fidelity", "calibration") or p["strategy"] not in ("meander", "unidirectional") or p["study"] not in ("none", "mesh", "timestep"):
        raise ValueError("Unknown mode, strategy or study")
    m = material(p["material"], p.get("properties"))
    if p["preheat_C"]+273.15 >= m["solidus_K"]:
        raise ValueError("Baseplate preheat must be below solidus")
    if "absorptivity" in p:
        a = p["absorptivity"]
        if isinstance(a, bool) or not isinstance(a, (int, float)) or not math.isfinite(a) or not 0 < a <= 1:
            raise ValueError("absorptivity must be in (0,1]")
        m["absorptivity"] = a
    for item in p.get("measurements", []):
        if not isinstance(item, dict) or set(item) != {"width_um", "depth_um", "source"} or not isinstance(item["source"], str) or not item["source"].strip():
            raise ValueError("Measurement requires width_um, depth_um and source")
        compare([item["width_um"]], [item["depth_um"]])
        if item["width_um"] <= 0: raise ValueError("Measured width must be positive")
    if len(p.get("measurements", [])) > 1000:
        raise ValueError("At most 1000 measurement replicates")
    if p["mode"] == "calibration" and not p.get("measurements"):
        raise ValueError("Calibration requires measured dimensions and source")
    return p, m


def fingerprint(p, m):
    # Source changes invalidate cache, including analytical and material dependencies.
    root = Path(__file__).parent
    h = hashlib.sha256()
    for f in sorted(root.glob("*.py")):
        h.update(f.name.encode()); h.update(f.read_bytes())
    for f in sorted((root/"openfoam").glob("*.C")):
        h.update(f.name.encode()); h.update(f.read_bytes())
    h.update(json.dumps([VERSION, p, m], sort_keys=True, allow_nan=False).encode())
    return h.hexdigest()


def screening(p, m):
    from goldak_solver import GoldakField, seed_goldak_axes
    t0 = p["preheat_C"]
    rho, k, cp = [float(property_at(m, t0+273.15, i)) for i in (1, 2, 3)]
    alpha = k/(rho*cp)
    power, speed = p["power_W"]*m["absorptivity"], p["speed_mm_s"]*1e-3
    goldak = GoldakField(t0, power, rho, cp, alpha, **seed_goldak_axes(p["beamDiameter_um"]*.5e-6)).bind_speed(speed)
    def rosenthal(x, y, z):
        r = np.maximum(np.sqrt(x*x+y*y+z*z), 1e-12)
        return t0+power/(2*math.pi*k*r)*np.exp(-speed*(x+r)/(2*alpha))
    out = {}
    # Fixed analytical scan grid, independent of the transient mesh.
    ax = np.linspace(-.003, .0005, 301)
    transverse = np.linspace(0, .001, 121)
    x, y = np.meshgrid(ax, transverse, indexing="ij")
    for model, field in (("rosenthal", rosenthal), ("goldak", goldak.temperature_C)):
        top = field(x, y, 0) >= m["liquidus_K"]-273.15
        cross = field(x, 0, y) >= m["liquidus_K"]-273.15
        ix, iy = np.where(top)
        iz = np.where(cross)[1]
        out[model] = dict(width_um=float(2*transverse[iy].max()*1e6) if len(iy) else 0.,
                          depth_um=float(transverse[iz].max()*1e6) if len(iz) else 0.,
                          length_um=float(np.ptp(ax[ix])*1e6) if len(ix) else 0.,
                          gridResolution_um=[float(np.diff(ax)[0]*1e6), float(np.diff(transverse)[0]*1e6)],
                          truncated=bool(top[0].any() or top[-1].any() or top[:, -1].any() or cross[:, -1].any()),
                          assumptions="Constant preheat properties; conduction only; discrete liquidus extent; no keyhole correction.")
    return out


def scan_segments(p):
    length, speed = p["trackLength_um"]*1e-6, p["speed_mm_s"]*1e-3
    time = 0.
    segments = []
    for layer in range(int(p["layers"])):
        theta = math.radians(p["scanAngle_deg"]+layer*p["layerRotation_deg"])
        u, v = np.array([math.cos(theta), math.sin(theta)]), np.array([-math.sin(theta), math.cos(theta)])
        for track in range(int(p["tracks"])):
            offset = (track-(p["tracks"]-1)/2)*p["hatch_um"]*1e-6*v
            direction = -1 if p["strategy"] == "meander" and track % 2 else 1
            start, end = offset-direction*length/2*u, offset+direction*length/2*u
            segments.append(dict(start_s=time, end_s=time+length/speed, start=start.tolist(),
                                 end=end.tolist(), layer=layer))
            time += length/speed+p["dwell_s"]
    return segments, time+p["cooling_s"]


def transient(p, m, report=lambda *args: None, artifact_dir=None):
    segments, end = scan_segments(p)
    dx_requested = p["mesh_um"]*1e-6
    radius = p["beamDiameter_um"]*0.5e-6  # 1/e^2 intensity radius
    span = p["trackLength_um"]*1e-6+(p["tracks"]-1)*p["hatch_um"]*1e-6+6*radius
    nxy = int(math.ceil(span/dx_requested))
    dx = span/nxy
    substrate = math.ceil(max(300e-6, 4*radius)/dx)*dx
    nz = int(math.ceil((substrate+p["layers"]*p["layer_um"]*1e-6)/dx))
    if nxy*nxy*nz > 600000:
        raise ValueError("Mesh exceeds 600000-cell reference solver limit; reduce domain or use coarser mesh")
    axis = (np.arange(nxy)+.5)*dx-span/2
    z = (np.arange(nz)+.5)*dx-substrate
    x, y, zz = np.meshgrid(axis, axis, z, indexing="ij")
    t0 = p["preheat_C"]+273.15
    T = np.full(x.shape, t0)
    tt, hh = enthalpy_table(m)
    h0 = np.interp(t0, tt, hh)
    # Fixed reference mass: avoids nonconservative rho(T)*h update on an immobile grid.
    rho = float(property_at(m, t0, 1))*np.where(zz > 0, p["packingFraction"], 1.)
    H = np.zeros_like(T)
    ever = np.zeros_like(T, dtype=bool)
    remelt = np.zeros_like(ever)
    previous_melt = np.zeros_like(ever)
    energy_in = energy_out = 0.
    history, fronts = [], []
    best = dict(width_um=0., depth_um=0., length_um=0., volume_um3=0., crossSectionArea_um2=0.)
    peak = t0
    time, step, next_sample = 0., 0, 0.
    min_dt = p["maxDt_s"]
    while time < end:
        seg = next((s for s in segments if s["start_s"] <= time+1e-14 and time < s["end_s"]-1e-14), None)
        active_layer = max([s["layer"] for s in segments if s["start_s"] <= time+1e-14] or [0])
        surface = (active_layer+1)*p["layer_um"]*1e-6
        active = zz < surface
        top_index = int(np.flatnonzero(z < surface)[-1])
        k = property_at(m, T, 2)*np.where((zz > 0)&~ever, p["powderConductivityRatio"], 1.)
        cp = property_at(m, T, 3)
        dt = min(p["maxDt_s"], .12*dx*dx/float(np.max(k/(rho*cp))), radius/(4*p["speed_mm_s"]*1e-3), end-time)
        # End exactly on scan/deposition events: never smear laser-on into a dwell.
        events = [s[v]-time for s in segments for v in ("start_s", "end_s") if s[v] > time+1e-14]
        if events:
            dt = min(dt, min(events))
        rate = np.zeros_like(T)
        for axis_id in range(3):
            left, right = [slice(None)]*3, [slice(None)]*3
            left[axis_id], right[axis_id] = slice(None, -1), slice(1, None)
            a, b = tuple(left), tuple(right)
            face_k = 2*k[a]*k[b]/(k[a]+k[b])
            flux = face_k*(T[b]-T[a])/dx**2*(active[a]&active[b])
            rate[a] += flux; rate[b] -= flux
        # Isothermal baseplate bottom at half-cell distance. Other side faces insulated.
        bottom = 2*k[:, :, 0]*(T[:, :, 0]-t0)/dx**2
        rate[:, :, 0] -= bottom
        surface_loss = (p["convection_W_m2K"]*(T[:, :, top_index]-t0)
                        +m["emissivity"]*5.670374419e-8*(T[:, :, top_index]**4-t0**4))/dx
        rate[:, :, top_index] -= surface_loss
        source = np.zeros_like(T)
        if seg:
            f = (time+.5*dt-seg["start_s"])/(seg["end_s"]-seg["start_s"])
            pos = (1-f)*np.array(seg["start"])+f*np.array(seg["end"])
            penetration = max(p["layer_um"]*1e-6, dx)
            shape = np.exp(-2*((x-pos[0])**2+(y-pos[1])**2)/radius**2-2*((zz-surface)/penetration)**2)*active
            source = shape*(p["power_W"]*m["absorptivity"]/(shape.sum()*dx**3))
            rate += source
        # Source-driven enthalpy increment limited to avoid jumping through phase interval.
        dt = min(dt, 25.*float(np.min(rho*cp))/max(float(np.max(np.abs(rate))), 1.))
        min_dt = min(min_dt, dt)
        old = T.copy()
        H += dt*rate
        h = H/rho+h0
        if not np.isfinite(h).all() or float(h.min()) < hh[0]-1e-8 or float(h.max()) >= np.interp(m["boiling_K"], tt, hh):
            raise ValueError("Thermal model validity exceeded (boiling or nonphysical enthalpy); evaporation/free-surface CFD required")
        T = np.interp(h, hh, tt)
        time += dt; step += 1
        energy_in += float(source.sum())*dx**3*dt
        energy_out += (float(bottom.sum())+float(surface_loss.sum()))*dx**3*dt
        melt = (T >= m["liquidus_K"])&active
        remelt |= melt&ever&~previous_melt
        ever |= melt
        crossing = (old >= m["liquidus_K"])&(T < m["liquidus_K"])
        if crossing.any():
            grad = np.sqrt(sum(a*a for a in np.gradient(T, dx)))
            cooling = (old[crossing]-T[crossing])/dt
            good = grad[crossing] > 1e-6
            if good.any():
                fronts.append([float(np.sum(grad[crossing][good])), float(np.sum(cooling[good]/grad[crossing][good])), float(np.sum(cooling[good])), int(good.sum())])
        previous_melt = melt
        peak = max(peak, float(T.max()))
        if time >= next_sample or time >= end:
            if melt.any():
                ids = np.where(melt)
                # Extents of all concurrently molten cells, not a fitted ellipsoid or pore geometry.
                angle = math.radians(p["scanAngle_deg"]+active_layer*p["layerRotation_deg"])
                along = x[melt]*math.cos(angle)+y[melt]*math.sin(angle)
                across = -x[melt]*math.sin(angle)+y[melt]*math.cos(angle)
                metrics = dict(length_um=float(np.ptp(along)+dx)*1e6, width_um=float(np.ptp(across)+dx)*1e6,
                               depth_um=max(0., surface-float(z[ids[2]].min())+dx/2)*1e6,
                               volume_um3=float(melt.sum())*dx**3*1e18,
                               crossSectionArea_um2=float(melt.sum(axis=(1, 2)).max())*dx**2*1e12)
                if metrics["volume_um3"] > best["volume_um3"]:
                    best = metrics
                    if artifact_dir:
                        np.savez_compressed(Path(artifact_dir)/"peak-field.npz", T_K=T, x_m=axis, y_m=axis, z_m=z,
                                            time_s=time, liquidus_K=m["liquidus_K"])
            history.append(dict(time_s=time, peak_K=float(T.max()), center_K=float(T[nxy//2, nxy//2, top_index]),
                                storedEnergy_J=float(H.sum())*dx**3, inputEnergy_J=energy_in, lossEnergy_J=energy_out))
            report(time/end, f"step={step} t={time:.7g}s peak={T.max():.1f}K cells={T.size}")
            next_sample = time+end/60
        if step > 250000:
            raise ValueError("Reference solver step budget exceeded")
    stored = float(H.sum())*dx**3
    balance = abs(energy_in-energy_out-stored)/max(energy_in, 1e-12)
    if balance > .01:
        raise ValueError(f"Energy balance failed: {balance:.3%}")
    G, R, cooling = (np.sum(fronts, axis=0)[:3]/np.sum(fronts, axis=0)[3]).tolist() if fronts else (None, None, None)
    width = best["width_um"]*1e-6
    alpha = float(property_at(m, m["liquidus_K"], 2)/(property_at(m, m["liquidus_K"], 1)*property_at(m, m["liquidus_K"], 3)))
    best.update(peakTemperature_K=peak, thermalGradient_K_m=G, solidificationRate_m_s=R,
                coolingRate_K_s=cooling, keyholeDepth_um=None, recoilPressure_Pa=None,
                marangoniNumber=abs(m["dGamma_dT"])*max(0, peak-m["liquidus_K"])*width/(float(property_at(m, peak, 4))*alpha),
                pecletNumber=p["speed_mm_s"]*1e-3*width/alpha,
                aspectRatio=best["depth_um"]/best["width_um"] if width else None,
                trackOverlapRatio=max(0., 1-p["hatch_um"]/best["width_um"]) if width else 0.,
                remeltingRatio=float(remelt.sum()/ever.sum()) if ever.any() else 0.)
    return dict(metrics=best, thermalHistory=history,
                energyBalance=dict(input_J=energy_in, losses_J=energy_out, stored_J=stored, relativeError=balance),
                discretization=dict(cells=int(T.size), mesh_m=dx, minimumDt_s=min_dt, meanDt_s=end/step, steps=step),
                scanPath=segments)


def run(raw, report=lambda *args: None, artifact_dir=None, capabilities=None):
    p, m = validate(raw)
    analytical = screening(p, m)
    fallback = p["mode"] == "high-fidelity"
    use_foam = p["backend"] == "openfoam-thermal" or (p["backend"] == "auto" and (capabilities or {}).get("openfoamThermal"))
    thermal_solver = transient
    if use_foam:
        from lpbf_openfoam import thermal
        thermal_solver = thermal
    result = dict(schemaVersion=1, requestedMode=p["mode"], effectiveMode="screening" if fallback else p["mode"],
                  solver=dict(id="rosenthal+goldak" if p["mode"] == "screening" or fallback else VERSION,
                              version=VERSION, openfoam=(capabilities or {}).get("openfoamVersion")),
                  settings=p, material=m, confidence="low", validationStatus="unvalidated", productionReady=False,
                  label="Screening only" if p["mode"] == "screening" or fallback else "Unvalidated transient conduction",
                  provenance=dict(inputHash=hashlib.sha256(json.dumps(p, sort_keys=True, allow_nan=False).encode()).hexdigest(),
                                  implementationHash=fingerprint(p, m), materialVersion=m["version"],
                                  solverBinaryHash=(capabilities or {}).get("binaryHash"),
                                  createdAt=datetime.datetime.now(datetime.timezone.utc).isoformat()),
                  analyticalComparison=analytical,
                  assumptions=["SI internal units; beam diameter is 1/e^2 intensity diameter.",
                               "No resolved momentum, Marangoni flow, evaporation, recoil, VOF, keyhole or pores.",
                               "Estimated material laws; fixed reference density conserves mass on a stationary grid.",
                               "Uniform effective powder, irreversible conductivity densification; no resolved powder particles.",
                               "Gaussian depth attenuation is assumed, not ray tracing; absorbed power normalized over domain.",
                               "Geometry is sampled molten-domain extent at maximum sampled volume; multi-track pools may be disconnected.",
                               "Cross section is the maximum YZ grid section; it is not scan-normal for rotated scans.",
                               "R = -dT/dt / |grad T| on cooling liquidus crossings. G, R, G×R are separately averaged.",
                               "Ma and laser-travel Pe are screening numbers, not resolved velocities.",
                               "Thermal history is input for subsequent mechanics; no residual stress, distortion or cracking prediction."],
                  fallbackReason=("OpenFOAM is installed but a qualified free-surface LPBF solver is not registered."
                                  if (capabilities or {}).get("openfoamVersion") else "OpenFOAM / a qualified free-surface LPBF solver is unavailable in this worker.") if fallback else None)
    if p["mode"] in ("standard", "calibration"):
        n_runs = 1 if p["study"] == "none" else 3
        result.update(thermal_solver(p, m, lambda f, msg: report(f/n_runs, msg), artifact_dir))
        if use_foam:
            result["solver"]["id"] = "metalliksaThermal-OpenFOAM14-1"
        if p["study"] != "none":
            trials = []
            key = "mesh_um" if p["study"] == "mesh" else "maxDt_s"
            # Coarse -> medium -> fine; finest result is the requested discretization.
            for index, scale in enumerate((2., math.sqrt(2.))):
                q = copy.deepcopy(p); q[key] *= scale
                trial = thermal_solver(q, m, lambda f, msg: report((index+1+f)/3, msg))
                trials.append(trial)
            trials.append(result)
            actual = [v["discretization"]["mesh_m" if key == "mesh_um" else "meanDt_s"] for v in trials]
            result["convergenceStudy"] = dict(kind=p["study"], spacings=actual,
                results=[v["metrics"] for v in trials],
                checks={k: convergence([v["metrics"][k] for v in trials], actual) for k in ("width_um", "depth_um", "volume_um3")})
    else:
        result["metrics"] = analytical["goldak"]
    g = result["metrics"]
    w, d, length = g["width_um"], g["depth_um"], g["length_um"]
    lof = w <= p["hatch_um"] or d <= p["layer_um"]
    kh = d/max(w, 1e-12) > .5
    result["regime"] = "keyhole-risk (screening)" if kh else "conduction assumption"
    result["mainRisk"] = "lack-of-fusion" if lof else "keyhole (screening)" if kh else "balling (screening)" if length > math.pi*w else "not established"
    result["recommendation"] = "Reduce hatch/layer spacing; verify penetration experimentally." if lof else "Reduce power or increase speed; verify with free-surface CFD." if kh else "Compare with measured tracks before changing process parameters."
    result["riskScope"] = "Geometric screening only; no probability, density qualification or solidification cracking assessment."
    if p["tracks"] > 1 and p["mode"] in ("standard", "calibration"):
        result["mainRisk"] = "not assessed from aggregate multi-track extents"
        result["regime"] = "conduction assumption; local flow regime unresolved"
        result["recommendation"] = "Inspect saved temperature fields and remelting history; aggregate width cannot establish inter-track fusion."
        g["trackOverlapRatio"] = None
    if p.get("measurements"):
        result["measurementComparison"] = {key: compare([g[key]]*len(p["measurements"]), [row[key] for row in p["measurements"]]) for key in ("width_um", "depth_um")}
    json.dumps(result, allow_nan=False)
    return result


if __name__ == "__main__":
    import sys
    print(json.dumps(run(json.load(sys.stdin)), allow_nan=False))

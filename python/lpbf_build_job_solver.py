#!/usr/bin/env python3
"""
Single LPBF Build Job engine: Rosenthal melt-pool screening + STL slicer + print verdict.

The industrial UI must display this verdict. TypeScript must not re-decide printability.
Fidelity flag (Eagar–Tsai / Goldak source) is reserved for a later step.
"""

import json
import sys
import time

from four_alloy_materials import (
    ALLOY_MATERIALS,
    LITERATURE_PV_WINDOWS,
    evaluate_literature_pv,
    resolve_alloy_id,
)
from lpbf_thermal_solver import calculate_meltpool_physics
from stl_slicer_build_time_solver import solve_slicer

# Hatch/layer used with literature-box mid P–v when LoF is the dominant gate.
# Matches src/utils/lpbfDemoVectors.ts printable demos (inputs only).
_LOF_HT = {
    "ti6al4v": {"hatch_um": 100, "layer_um": 30, "beamDiameter_um": 80},
    "ss316l": {"hatch_um": 90, "layer_um": 30, "beamDiameter_um": 80},
    "alsi10mg": {"hatch_um": 110, "layer_um": 30, "beamDiameter_um": 100},
    "in718": {"hatch_um": 90, "layer_um": 30, "beamDiameter_um": 80},
}


def _gate(gid, status, measured, required, unit, note):
    return {
        "id": gid,
        "status": status,
        "measured": measured,
        "required": required,
        "unit": unit,
        "note": note,
    }


def _suggested_patch(thermal, alloy_id, dominant_gate, verdict):
    if verdict == "printable" or dominant_gate in (None, "none"):
        return None
    box = LITERATURE_PV_WINDOWS[alloy_id]
    mid_p = int(round((box["powerMin_W"] + box["powerMax_W"]) / 2.0))
    mid_v = int(round((box["speedMin_mm_s"] + box["speedMax_mm_s"]) / 2.0))
    pp = thermal["processParameters"]
    cur_h = float(pp["hatchSpacing_um"])
    cur_t = float(pp["layerThickness_um"])
    cur_d = float(pp["beamDiameter_um"])
    ht = _LOF_HT.get(alloy_id, {"hatch_um": 100, "layer_um": 30, "beamDiameter_um": cur_d})
    if dominant_gate == "keyhole":
        return {
            "laserPower_W": int(box["powerMin_W"]),
            "scanSpeed_mms": int(box["speedMax_mm_s"]),
            "hatch_um": int(round(cur_h)),
            "layer_um": int(round(cur_t)),
            "beamDiameter_um": int(round(cur_d)),
        }
    if dominant_gate in ("lof_wh", "lof_dt"):
        return {
            "laserPower_W": mid_p,
            "scanSpeed_mms": mid_v,
            "hatch_um": ht["hatch_um"],
            "layer_um": ht["layer_um"],
            "beamDiameter_um": ht["beamDiameter_um"],
        }
    return {
        "laserPower_W": mid_p,
        "scanSpeed_mms": mid_v,
        "hatch_um": int(round(cur_h)),
        "layer_um": int(round(cur_t)),
        "beamDiameter_um": int(round(cur_d)),
    }


def compose_verdict(thermal, alloy_id):
    W = float(thermal["meltPoolGeometry"]["width_um"])
    D = float(thermal["meltPoolGeometry"]["depth_um"])
    h = float(thermal["processParameters"]["hatchSpacing_um"])
    t = float(thermal["processParameters"]["layerThickness_um"])
    width_over_hatch = W / max(1e-6, h)
    depth_over_layer = D / max(1e-6, t)

    def_ = thermal["defectDiagnostics"]
    lof_fail = def_["lackOfFusionStatus"] == "Fail"
    lof_warn = def_["lackOfFusionStatus"] == "Warning"
    keyhole_high = str(def_["keyholePorosityRisk"]).startswith("High")
    balling_high = str(def_["ballingInstabilityRisk"]).startswith("High")
    recoater_high = str(def_["recoaterCrashRisk"]).startswith("High")
    distortion_high = float(def_["distortionIndex"]) >= 0.65
    dh = float(thermal["processParameters"]["normalizedEnthalpy"])
    win = evaluate_literature_pv(
        alloy_id,
        float(thermal["processParameters"]["laserPower_W"]),
        float(thermal["processParameters"]["scanSpeed_mm_s"]),
    )

    reasons = []
    if lof_fail:
        reasons.append(
            f"Lack of fusion: W/h = {width_over_hatch:.2f} (need >1.05) or D/t = {depth_over_layer:.2f} (need >1.15)."
        )
    elif lof_warn:
        reasons.append(
            f"Hatch/layer overlap is marginal (W/h = {width_over_hatch:.2f}, D/t = {depth_over_layer:.2f})."
        )
    if keyhole_high:
        reasons.append(f"Keyhole porosity: ΔH/hₛ = {dh} (King onset ~30).")
    if balling_high:
        reasons.append(
            f"Plateau–Rayleigh balling: L/W = {thermal['meltPoolGeometry']['aspectRatio_L_over_W']}."
        )
    if recoater_high:
        reasons.append("Recoater crash / part curl risk from residual stress.")
    if distortion_high:
        reasons.append(f"Inherent-strain distortion index {def_['distortionIndex']} (≥0.65).")
    if not win["inside"]:
        box = win["box"]
        reasons.append(
            f"P–v is outside the {alloy_id} literature box "
            f"({box['powerMin_W']}–{box['powerMax_W']} W, {box['speedMin_mm_s']}–{box['speedMax_mm_s']} mm/s)."
        )

    verdict = "printable"
    if lof_fail or balling_high or (keyhole_high and dh > 35):
        verdict = "do-not-print"
    elif lof_warn or keyhole_high or recoater_high or distortion_high or (not win["inside"]):
        verdict = "risky"

    if not reasons:
        reasons.append(
            "Conduction-mode melt pool with hatch/layer overlap above LoF gates. VED is not used as the sole criterion."
        )

    headline = {
        "printable": "Printable — stay in the conduction window",
        "risky": "Risky — qualify with coupon builds before flight hardware",
        "do-not-print": "Do not print — change P, v, h, or t before a build",
    }[verdict]

    lw = round(width_over_hatch, 3)
    dt = round(depth_over_layer, 3)
    lw_status = "fail" if width_over_hatch < 1.05 else ("warn" if lof_warn else "pass")
    dt_status = "fail" if depth_over_layer < 1.15 else ("warn" if lof_warn else "pass")
    kh_status = "fail" if (keyhole_high and dh > 35) else ("warn" if keyhole_high else "pass")
    ball_status = "fail" if balling_high else "pass"
    lit_status = "pass" if win["inside"] else "warn"
    rec_status = "warn" if recoater_high else "pass"
    dist_status = "warn" if distortion_high else "pass"
    aspect = float(thermal["meltPoolGeometry"]["aspectRatio_L_over_W"])

    gates = [
        _gate("lof_wh", lw_status, lw, 1.05, "1", "Melt-pool width vs hatch (LoF)."),
        _gate("lof_dt", dt_status, dt, 1.15, "1", "Melt-pool depth vs layer (LoF)."),
        _gate("keyhole", kh_status, dh, 30.0, "1", "King ΔH/hₛ onset ~30; do-not-print if High and >35."),
        _gate("balling", ball_status, aspect, None, "1", "Plateau–Rayleigh L/W from Rosenthal length."),
        _gate(
            "literature_pv",
            lit_status,
            1.0 if win["inside"] else 0.0,
            1.0,
            "inside",
            "Four-alloy literature P–v box (not a machine envelope).",
        ),
        _gate(
            "recoater",
            rec_status,
            float(def_["distortionIndex"]),
            None,
            "index",
            "Residual-stress heuristic, not a recoater-blade simulation.",
        ),
        _gate(
            "distortion",
            dist_status,
            float(def_["distortionIndex"]),
            0.65,
            "index",
            "Inherent-strain screening index, not Goldak FEA.",
        ),
    ]
    dominant = "none"
    for g in gates:
        if g["status"] == "fail":
            dominant = g["id"]
            break
    if dominant == "none":
        for g in gates:
            if g["status"] == "warn":
                dominant = g["id"]
                break

    return {
        "verdict": verdict,
        "headline": headline,
        "reasons": reasons,
        "lofGeometry": {
            "widthOverHatch": lw,
            "depthOverLayer": dt,
        },
        "literatureWindow": win,
        "gates": gates,
        "dominantGate": dominant,
        "suggestedPatch": _suggested_patch(thermal, alloy_id, dominant, verdict),
    }


def solve_lpbf_build_job(data):
    t0 = time.time()
    alloy_id = resolve_alloy_id(data.get("alloyId") or "in718") or "in718"
    mats = ALLOY_MATERIALS[alloy_id]
    thermal_mat = data.get("thermalMaterial") or mats["thermal"]
    slicer_mat = data.get("slicerMaterial") or mats["slicer"]

    power = float(data.get("laserPower_W", 285.0))
    speed = float(data.get("scanSpeed_mm_s", data.get("scanSpeed_mms", 960.0)))
    beam = float(data.get("beamDiameter_um", 80.0))
    preheat = float(data.get("preheatTemp_C", 80.0))
    layer = float(data.get("layerThickness_um", 40.0))
    hatch = float(data.get("hatchSpacing_um", 110.0))
    wavelength = data.get("laserWavelength", "IR_1064nm")

    thermal = calculate_meltpool_physics(
        thermal_mat, power, speed, beam, preheat, layer, hatch, wavelength
    )
    slicer = solve_slicer(
        {
            "preset": data.get("preset", "nozzle"),
            "material": slicer_mat,
            "laserPower_W": power,
            "scanSpeed_mms": speed,
            "layerThickness_um": layer,
            "hatchSpacing_um": hatch,
            "recoatTimePerLayer_s": data.get("recoatTimePerLayer_s", 9.0),
            "customTriangles": data.get("customTriangles"),
            "cadAssetName": data.get("cadAssetName", ""),
            "triangleCountNative": data.get("triangleCountNative"),
        }
    )
    if slicer.get("error"):
        return {"success": False, "error": slicer["error"]}

    decision = compose_verdict(thermal, alloy_id)
    elapsed = round((time.time() - t0) * 1000.0, 1)
    thermal["computeTimeMs"] = elapsed

    return {
        "success": True,
        "engine": "lpbf_build_job",
        "modelId": "rosenthal-screening-v1",
        "assumptions": [
            "Melt-pool field is regularized Rosenthal (not volumetric Goldak FEA).",
            "LoF uses W vs h and D vs t; VED is not the sole gate.",
            "Keyhole uses King ΔH/hs ≈ 30.",
            "Slicer uses live customTriangles when present; otherwise a demo CAD preset.",
        ],
        "alloyId": alloy_id,
        "computeTimeMs": elapsed,
        "thermal": thermal,
        "slicer": slicer,
        "verdict": decision,
    }


def main():
    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"error": "Empty payload provided to LPBF build-job solver."}))
        sys.exit(1)
    try:
        data = json.loads(raw)
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
    result = solve_lpbf_build_job(data)
    if not result.get("success"):
        print(json.dumps(result))
        sys.exit(1)
    print(json.dumps(result))


if __name__ == "__main__":
    main()

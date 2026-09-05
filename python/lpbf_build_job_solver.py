#!/usr/bin/env python3
"""
Single LPBF Build Job engine: Rosenthal melt-pool screening + STL slicer + print verdict.

The industrial UI must display this verdict. TypeScript must not re-decide printability.
Fidelity flag (Eagar–Tsai / Goldak source) is reserved for a later step.
"""

import json
import sys
import time

from lpbf_thermal_solver import calculate_meltpool_physics
from stl_slicer_build_time_solver import solve_slicer

LITERATURE_PV_WINDOWS = {
    "ti6al4v": {"powerMin_W": 150, "powerMax_W": 280, "speedMin_mm_s": 700, "speedMax_mm_s": 1200},
    "ss316l": {"powerMin_W": 150, "powerMax_W": 230, "speedMin_mm_s": 600, "speedMax_mm_s": 1000},
    "alsi10mg": {"powerMin_W": 280, "powerMax_W": 380, "speedMin_mm_s": 900, "speedMax_mm_s": 1400},
    "in718": {"powerMin_W": 120, "powerMax_W": 300, "speedMin_mm_s": 550, "speedMax_mm_s": 1000},
}

ALLOY_MATERIALS = {
    "ti6al4v": {"thermal": "Ti-6Al-4V", "slicer": "Ti-6Al-4V ELI"},
    "ss316l": {"thermal": "316L Stainless Steel", "slicer": "SS 316L"},
    "alsi10mg": {"thermal": "AlSi10Mg", "slicer": "AlSi10Mg"},
    "in718": {"thermal": "Inconel 718", "slicer": "Inconel 718"},
}


def evaluate_literature_pv(alloy_id, power_W, speed_mm_s):
    box = LITERATURE_PV_WINDOWS.get(alloy_id, LITERATURE_PV_WINDOWS["in718"])
    inside = (
        box["powerMin_W"] <= power_W <= box["powerMax_W"]
        and box["speedMin_mm_s"] <= speed_mm_s <= box["speedMax_mm_s"]
    )
    return {"inside": inside, "box": box, "alloyId": alloy_id}


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

    return {
        "verdict": verdict,
        "headline": headline,
        "reasons": reasons,
        "lofGeometry": {
            "widthOverHatch": round(width_over_hatch, 3),
            "depthOverLayer": round(depth_over_layer, 3),
        },
        "literatureWindow": win,
    }


def solve_lpbf_build_job(data):
    t0 = time.time()
    alloy_id = str(data.get("alloyId") or "in718")
    if alloy_id not in ALLOY_MATERIALS:
        alloy_id = "in718"
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

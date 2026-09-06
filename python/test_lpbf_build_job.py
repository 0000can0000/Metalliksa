#!/usr/bin/env python3
"""Build-job verdict must come from Python, not a second TypeScript decision."""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOLVER = os.path.join(HERE, "lpbf_build_job_solver.py")


def run_job(payload):
    proc = subprocess.run(
        [sys.executable, SOLVER],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=HERE,
    )
    if proc.returncode != 0:
        raise AssertionError(proc.stderr or proc.stdout)
    return json.loads(proc.stdout)


def main():
    ti = run_job(
        {
            "alloyId": "ti6al4v",
            "laserPower_W": 200,
            "scanSpeed_mm_s": 900,
            "beamDiameter_um": 80,
            "preheatTemp_C": 150,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
            "preset": "nozzle",
            "processSeed": 42,
            "scanStrategy": "stripe",
            "stripeWidth_mm": 5,
            "scanRotation_deg": 67,
            "hatchDwell_ms": 0,
        }
    )
    assert ti["success"]
    assert ti["engine"] == "lpbf_build_job"
    assert ti["modelId"] == "rosenthal-screening-v1"
    assert ti["processSeed"] == 42
    assert ti["scanStrategy"]["id"] == "stripe"
    assert ti["scanStrategy"]["stripeWidth_mm"] == 5
    assert ti["scanStrategy"]["rotation_deg"] == 67
    assert ti["scanStrategy"]["hatchDwell_ms"] == 0
    assert len(ti["assumptions"]) >= 6
    assert any("Goldak" in a for a in ti["assumptions"])
    assert any("King" in a for a in ti["assumptions"])
    assert any("Tang" in a for a in ti["assumptions"])
    assert any("10.1115/1.4031649" in a for a in ti["assumptions"])
    assert any("jmapro.2020.01.039" in a for a in ti["assumptions"])
    assert any("jmrt.2022.04.055" in a for a in ti["assumptions"])
    assert any("matdes.2018.107552" in a for a in ti["assumptions"])
    assert any("Pydantic" in a or "pydantic" in a.lower() or "triangle" in a.lower() for a in ti["assumptions"])
    assert "verdict" in ti["verdict"]
    assert ti["verdict"]["verdict"] in ("printable", "risky", "do-not-print")
    assert ti["thermal"]["meltPoolGeometry"]["width_um"] > 0
    assert ti["verdict"]["lofGeometry"]["widthOverHatch"] > 0
    assert ti["verdict"]["lofGeometry"]["depthOverLayer"] > 0
    assert "tangIndex" in ti["verdict"]["lofGeometry"]
    assert ti["thermal"]["processParameters"]["normalizedEnthalpy"] > 0
    assert ti["thermal"]["processParameters"]["effectiveConductivity_W_mK"] > 0
    assert ti["thermal"]["hydrodynamicsAndRecoil"]["molarMass_kg_mol"] > 0
    assert ti["thermal"]["hydrodynamicsAndRecoil"]["marangoniGeometrySource"] == "thermal"
    assert ti["thermal"]["defectDiagnostics"]["tangIndex_hW_tD"] == ti["thermal"]["defectDiagnostics"]["lackOfFusionOverlapIndex"]
    assert ti["slicer"]["geometrySource"] == "demo-preset"
    assert ti["slicer"]["buildTimeSummary"]["totalBuildTime_hr"] > 0
    assert ti["slicer"]["meshMetrics"]["estimatedPartMass_g"] > 0
    assert ti["verdict"]["literatureWindow"]["inside"] is True
    assert "gates" in ti["verdict"] and len(ti["verdict"]["gates"]) >= 7
    gate_ids = {g["id"] for g in ti["verdict"]["gates"]}
    assert "lof_tang" in gate_ids
    assert "downskin" in gate_ids
    assert ti["verdict"]["dominantGate"] != "lof_wh"
    assert "suggestedPatch" in ti["verdict"]

    # R = v·cosθ: incline 60° must lower solidification rate vs flat.
    flat = run_job(
        {
            "alloyId": "ti6al4v",
            "laserPower_W": 200,
            "scanSpeed_mm_s": 900,
            "beamDiameter_um": 80,
            "preheatTemp_C": 150,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
            "inclineAngle_deg": 0,
        }
    )
    inclined = run_job(
        {
            "alloyId": "ti6al4v",
            "laserPower_W": 200,
            "scanSpeed_mm_s": 900,
            "beamDiameter_um": 80,
            "preheatTemp_C": 150,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
            "inclineAngle_deg": 60,
        }
    )
    r0 = flat["thermal"]["solidificationKinetics"]["solidificationRate_R_m_s"]
    r60 = inclined["thermal"]["solidificationKinetics"]["solidificationRate_R_m_s"]
    assert r60 < r0 * 0.6, (r0, r60)

    # Triangle cap via pydantic / slicer
    bloated = [[[0, 0, 0], [1, 0, 0], [0, 1, 0]]] * 15000
    capped = run_job(
        {
            "alloyId": "in718",
            "laserPower_W": 285,
            "scanSpeed_mm_s": 960,
            "beamDiameter_um": 80,
            "layerThickness_um": 40,
            "hatchSpacing_um": 110,
            "customTriangles": bloated,
            "triangleCountNative": 15000,
            "maxTriangles": 12000,
            "preset": "custom",
        }
    )
    assert capped["success"]
    assert capped["slicer"]["meshMetrics"]["triangleCount"] <= 12000

    lof = run_job(
        {
            "alloyId": "in718",
            "laserPower_W": 90,
            "scanSpeed_mm_s": 1400,
            "beamDiameter_um": 80,
            "preheatTemp_C": 80,
            "layerThickness_um": 40,
            "hatchSpacing_um": 110,
            "preset": "nozzle",
        }
    )
    assert lof["verdict"]["verdict"] in ("risky", "do-not-print"), lof["verdict"]
    assert lof["verdict"]["literatureWindow"]["inside"] is False
    assert lof["verdict"]["dominantGate"] in ("lof_tang", "lof_wh", "lof_dt", "literature_pv", "balling")
    assert lof["verdict"]["suggestedPatch"] is not None

    kh = run_job(
        {
            "alloyId": "ti6al4v",
            "laserPower_W": 400,
            "scanSpeed_mm_s": 400,
            "beamDiameter_um": 80,
            "preheatTemp_C": 80,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
            "preset": "nozzle",
        }
    )
    assert kh["verdict"]["dominantGate"] == "keyhole", kh["verdict"]
    patch = kh["verdict"]["suggestedPatch"]
    assert patch is not None
    assert patch["scanSpeed_mms"] >= kh["thermal"]["processParameters"]["scanSpeed_mm_s"]
    assert patch["laserPower_W"] <= kh["thermal"]["processParameters"]["laserPower_W"]
    assert patch["hatch_um"] == 100

    ds = run_job(
        {
            "alloyId": "ti6al4v",
            "laserPower_W": 200,
            "scanSpeed_mm_s": 900,
            "beamDiameter_um": 80,
            "preheatTemp_C": 150,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
            "downskinOverhang_deg": 60,
        }
    )
    assert ds["verdict"]["dominantGate"] == "downskin" or any(
        g["id"] == "downskin" and g["status"] == "fail" for g in ds["verdict"]["gates"]
    ), ds["verdict"]

    print("PASS: solve_lpbf_build_job Phase 0-2 (Tang, seed, strategy DOIs, k_eff, R*cos(theta), pydantic/cap)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

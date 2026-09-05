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
        }
    )
    assert ti["success"]
    assert ti["engine"] == "lpbf_build_job"
    assert ti["modelId"] == "rosenthal-screening-v1"
    assert len(ti["assumptions"]) >= 4
    assert any("Goldak" in a for a in ti["assumptions"])
    assert any("King" in a for a in ti["assumptions"])
    assert "verdict" in ti["verdict"]
    assert ti["verdict"]["verdict"] in ("printable", "risky", "do-not-print")
    assert ti["thermal"]["meltPoolGeometry"]["width_um"] > 0
    assert ti["verdict"]["lofGeometry"]["widthOverHatch"] > 0
    assert ti["verdict"]["lofGeometry"]["depthOverLayer"] > 0
    assert ti["thermal"]["processParameters"]["normalizedEnthalpy"] > 0
    assert ti["slicer"]["geometrySource"] == "demo-preset"
    assert ti["slicer"]["buildTimeSummary"]["totalBuildTime_hr"] > 0
    assert ti["slicer"]["meshMetrics"]["estimatedPartMass_g"] > 0
    assert ti["verdict"]["literatureWindow"]["inside"] is True

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

    print("PASS: solve_lpbf_build_job returns Python verdict")
    return 0


if __name__ == "__main__":
    sys.exit(main())

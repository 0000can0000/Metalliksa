#!/usr/bin/env python3
"""Build-job verdict must come from Python, not a second TypeScript decision.

Fast suite (default): Phase 0–2 + lazy defaults + cache + Murakami paste.
Slow suite (--slow): UQ Monte Carlo + NIST AM-Bench (opt-in path).
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOLVER = os.path.join(HERE, "lpbf_build_job_solver.py")
SLOW = "--slow" in sys.argv


def run_job(payload, *, clear_cache=False):
    body = {"enableUq": False, "includeAmbench": False, **payload}
    if clear_cache:
        from lpbf_job_cache import clear_cache as _clear

        _clear()
    # Prefer in-process for cache tests; subprocess for isolation of CLI path.
    if payload.get("_subprocess"):
        body.pop("_subprocess", None)
        proc = subprocess.run(
            [sys.executable, SOLVER],
            input=json.dumps(body),
            capture_output=True,
            text=True,
            cwd=HERE,
        )
        if proc.returncode != 0:
            raise AssertionError(proc.stderr or proc.stdout)
        return json.loads(proc.stdout)

    from lpbf_build_job_solver import solve_lpbf_build_job

    return solve_lpbf_build_job(body)


def main():
    from lpbf_job_cache import clear_cache
    from murakami_fatigue_screening import parse_defect_sqrt_areas_text

    clear_cache()

    # Paste parser
    assert parse_defect_sqrt_areas_text("40, 55; 62\n48 70") == [40.0, 55.0, 62.0, 48.0, 70.0]
    assert parse_defect_sqrt_areas_text("") == []

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
            "bypassCache": True,
        }
    )
    assert ti["success"]
    assert ti["engine"] == "lpbf_build_job"
    assert ti["modelId"] == "rosenthal-screening-v1"
    assert ti["processSeed"] == 42
    assert ti["scanStrategy"]["id"] == "stripe"
    assert ti["uq"] is None  # lazy default
    assert ti["ambench"] is None  # lazy default
    assert ti["cache"]["hit"] is False
    assert any("Hash cache" in a for a in ti["assumptions"])
    assert any("skips UQ" in a or "Default job skips" in a for a in ti["assumptions"])
    assert ti["murakami"]["status"] == "data_not_supplied"
    assert "pasteHint" in ti["murakami"]
    assert len(ti["assumptions"]) >= 6
    assert any("Goldak" in a for a in ti["assumptions"])
    assert any("King" in a for a in ti["assumptions"])
    assert any("Tang" in a for a in ti["assumptions"])
    assert any("10.1115/1.4031649" in a for a in ti["assumptions"])
    assert "verdict" in ti["verdict"]
    assert ti["verdict"]["verdict"] in ("printable", "risky", "do-not-print")
    assert ti["thermal"]["meltPoolGeometry"]["width_um"] > 0
    assert "gates" in ti["verdict"] and len(ti["verdict"]["gates"]) >= 7

    # Hash cache hit on identical request
    clear_cache()
    a = run_job(
        {
            "alloyId": "in718",
            "laserPower_W": 285,
            "scanSpeed_mm_s": 960,
            "beamDiameter_um": 80,
            "layerThickness_um": 40,
            "hatchSpacing_um": 110,
        }
    )
    b = run_job(
        {
            "alloyId": "in718",
            "laserPower_W": 285,
            "scanSpeed_mm_s": 960,
            "beamDiameter_um": 80,
            "layerThickness_um": 40,
            "hatchSpacing_um": 110,
        }
    )
    assert a["cache"]["hit"] is False
    assert b["cache"]["hit"] is True
    assert b["verdict"]["verdict"] == a["verdict"]["verdict"]
    assert b["cache"]["stats"]["hits"] >= 1

    # Murakami paste path + alloy HV default
    mur = run_job(
        {
            "alloyId": "in718",
            "laserPower_W": 285,
            "scanSpeed_mm_s": 960,
            "beamDiameter_um": 80,
            "layerThickness_um": 40,
            "hatchSpacing_um": 110,
            "defectSqrtAreasPaste": "40, 55, 62, 48, 70",
            "bypassCache": True,
        }
    )
    assert mur["murakami"]["status"] == "screening_estimate"
    assert mur["murakami"]["hardnessSource"] == "alloy_default"
    assert mur["murakami"]["hardness_HV"] == 380.0
    assert mur["murakami"]["fatigueLimit_internal_MPa"] > 0

    # R = v·cosθ
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
            "bypassCache": True,
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
            "bypassCache": True,
        }
    )
    r0 = flat["thermal"]["solidificationKinetics"]["solidificationRate_R_m_s"]
    r60 = inclined["thermal"]["solidificationKinetics"]["solidificationRate_R_m_s"]
    assert r60 < r0 * 0.6, (r0, r60)

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
            "bypassCache": True,
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
            "bypassCache": True,
        }
    )
    assert lof["verdict"]["verdict"] in ("risky", "do-not-print"), lof["verdict"]
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
            "bypassCache": True,
        }
    )
    assert kh["verdict"]["dominantGate"] == "keyhole", kh["verdict"]

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
            "bypassCache": True,
        }
    )
    assert ds["verdict"]["dominantGate"] == "downskin" or any(
        g["id"] == "downskin" and g["status"] == "fail" for g in ds["verdict"]["gates"]
    ), ds["verdict"]

    if not SLOW:
        print("PASS: solve_lpbf_build_job Phase 5 fast (cache, lazy UQ/NIST, Murakami paste)")
        print("HINT: re-run with --slow for UQ + NIST AM-Bench coverage")
        return 0

    # --- SLOW: UQ + NIST ---
    uq = run_job(
        {
            "alloyId": "ti6al4v",
            "laserPower_W": 200,
            "scanSpeed_mm_s": 900,
            "beamDiameter_um": 80,
            "preheatTemp_C": 150,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
            "processSeed": 42,
            "enableUq": True,
            "uqSamples": 24,
            "includeAmbench": True,
            "bypassCache": True,
        }
    )
    assert uq["uq"] is not None
    assert uq["uq"]["enabled"] is True
    assert uq["uq"]["nSamples"] == 24
    assert 0.0 <= uq["uq"]["P_printable"] <= 1.0
    assert "absorptivity" in uq["uq"]["sobolProxy"]
    assert uq["uq"].get("sensitivityMethod") == "spearman-proxy"
    assert uq["ambench"] is not None
    assert uq["ambench"]["source"]["doi"] == "10.1007/s40192-020-00169-1"
    assert len(uq["ambench"]["cases"]) == 3
    assert uq["ambench"]["cases"][0]["nist"]["length_um"] == 659.0
    assert uq["qualification"]["status"] == "not_executed"

    uq2 = run_job(
        {
            "alloyId": "ti6al4v",
            "laserPower_W": 200,
            "scanSpeed_mm_s": 900,
            "beamDiameter_um": 80,
            "preheatTemp_C": 150,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
            "processSeed": 42,
            "enableUq": True,
            "uqSamples": 24,
            "includeAmbench": False,
            "bypassCache": True,
        }
    )
    assert uq2["uq"]["P_printable"] == uq["uq"]["P_printable"]

    print("PASS: solve_lpbf_build_job Phase 5 slow (UQ Spearman-proxy + NIST AMB2018-02)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

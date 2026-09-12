#!/usr/bin/env python3
"""Goldak+Fabbro vs measured literature tracks (PROOF 022). Not Build Job."""
import sys

from lpbf_thermal_solver import calculate_meltpool_physics
from meltpool_literature_catalog import TRACKS, score_track


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(msg)


def main():
    nist = [t for t in TRACKS if t["id"].startswith("nist-amb2022-03")]
    guo = [t for t in TRACKS if t["id"].startswith("guo-316l")]
    assert_true(len(nist) == 7, "Lane Table 4 has 7 cases")
    assert_true(len(guo) == 4, "Guo Table 3 four experimental W/D rows")
    assert_true(all(t["kind"] == "measured" and t["doi"] for t in TRACKS), "DOI measured only")

    nist_pass = 0
    for t in nist:
        r = calculate_meltpool_physics(
            t["material"], t["laserPower_W"], t["scanSpeed_mm_s"], t["beamDiameter_um"],
            t["preheatTemp_C"], 40, 110, heat_source="goldak",
        )
        assert_true(r["modelId"] == "goldak-v1", "heat source")
        s = score_track(r["meltPoolGeometry"]["width_um"], r["meltPoolGeometry"]["depth_um"], t)
        assert_true(s["pass"], f"{t['id']} W/D out of ×0.5–2 band {s}")
        nist_pass += 1

    # Spot-size trend on Lane 1.1 vs 1.2 (measured deeper when smaller spot).
    d49 = calculate_meltpool_physics("Inconel 718", 285, 960, 49, 23.5, 40, 110, heat_source="goldak")
    d82 = calculate_meltpool_physics("Inconel 718", 285, 960, 82, 23.5, 40, 110, heat_source="goldak")
    assert_true(
        d49["meltPoolGeometry"]["depth_um"] > d82["meltPoolGeometry"]["depth_um"],
        "smaller D4σ must be deeper (Lane 1.1 vs 1.2)",
    )

    # Guo N04: conduction-ish; width in band. Depth may be Fabbro-light — still ×0.5–2.
    n04 = next(t for t in guo if t["id"] == "guo-316l-n04")
    ss = calculate_meltpool_physics(
        n04["material"], n04["laserPower_W"], n04["scanSpeed_mm_s"], n04["beamDiameter_um"],
        n04["preheatTemp_C"], 50, 100, heat_source="goldak",
    )
    s4 = score_track(ss["meltPoolGeometry"]["width_um"], ss["meltPoolGeometry"]["depth_um"], n04)
    assert_true(s4["widthInBand"], f"Guo N04 width {s4}")
    assert_true(s4["depthInBand"], f"Guo N04 depth {s4}")

    ros = calculate_meltpool_physics("Inconel 718", 285, 960, 80, 80, 40, 110)
    assert_true(ros["modelId"] == "rosenthal-screening-v1", "Build Job heat source unchanged")
    print(f"PASS: literature catalog Goldak+Fabbro ({nist_pass} NIST + Guo N04)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

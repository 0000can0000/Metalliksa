#!/usr/bin/env python3
"""Field G/R on the liquidus (PROOF 021). Does not change Build Job verdict."""
import sys

from lpbf_thermal_solver import calculate_meltpool_physics
from solidification_front import MODEL_ID, hunt_lu_pdas_um, hunt_morphology, phase_transformation_note


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(msg)


def main():
    gk = calculate_meltpool_physics(
        "Inconel 718", 285, 960, 67, 23.5, 40, 110, heat_source="goldak"
    )
    kin = gk["solidificationKinetics"]
    assert_true(kin["modelId"] == MODEL_ID, "solidification model id")
    assert_true(kin["usedFieldMap"] is True, "Goldak uses field G/R, not tail ΔT/L")
    G = kin["thermalGradient_G_K_m"]
    R = kin["solidificationRate_R_m_s"]
    Tdot = kin["coolingRate_K_s"]
    pdas = kin["primaryDendriteArmSpacing_PDAS_um"]
    # LPBF order of magnitude (Promoppatum / typical IN718): G ~ 10^5–10^8 K/m, Tdot ~ 10^4–10^7 K/s.
    assert_true(1.0e5 <= G <= 5.0e8, f"Goldak G {G}")
    assert_true(0.02 <= R <= 1.2, f"Goldak R {R} vs v=0.96 m/s")
    assert_true(1.0e4 <= Tdot <= 2.0e8, f"Goldak cooling {Tdot}")
    assert_true(0.1 <= pdas <= 15.0, f"Hunt–Lu PDAS should be LPBF µm-scale, got {pdas}")
    assert_true(abs(pdas - hunt_lu_pdas_um(G, R)) < 0.2, "PDAS matches Hunt–Lu helper")
    assert_true(kin["phaseTransformation"]["alloyClass"] == "IN718", "IN718 phase note")
    assert_true(gk["modelId"] == "goldak-v1", "heat source unchanged")

    slow = calculate_meltpool_physics(
        "Inconel 718", 285, 400, 67, 23.5, 40, 110, heat_source="goldak"
    )
    fast = calculate_meltpool_physics(
        "Inconel 718", 285, 1600, 67, 23.5, 40, 110, heat_source="goldak"
    )
    assert_true(
        fast["solidificationKinetics"]["solidificationRate_R_m_s"]
        > slow["solidificationKinetics"]["solidificationRate_R_m_s"] * 0.9,
        "faster scan not slower R",
    )

    ti = calculate_meltpool_physics(
        "Ti-6Al-4V", 200, 900, 80, 150, 30, 100, heat_source="eagar-tsai"
    )
    note = ti["solidificationKinetics"]["phaseTransformation"]
    assert_true(note["expected"] == "beta_to_alpha_prime_martensite", note)
    assert_true(ti["solidificationKinetics"]["coolingRate_K_s"] >= 410.0, "Ti64 LPBF >> 410 K/s")
    assert_true(note["doi"] == "10.1016/S0921-5093(97)00802-2", "Ahmed & Rack DOI")

    ros = calculate_meltpool_physics("Inconel 718", 285, 960, 80, 80, 40, 110)
    assert_true(ros["modelId"] == "rosenthal-screening-v1", "Build Job heat source unchanged")
    assert_true(ros["solidificationKinetics"]["modelId"] == MODEL_ID, "Rosenthal also reports field G")

    assert_true("Columnar" in hunt_morphology(1.0e8), "Hunt columnar bin")
    mart = phase_transformation_note("Ti-6Al-4V", 1.0e5)
    assert_true(mart["doi"] == "10.1016/S0921-5093(97)00802-2", "Ahmed & Rack DOI helper")
    print("PASS: solidification-front G/R")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Academic + functional checks for the Eagar–Tsai Gaussian field (PROOF 018)."""
import math
import sys

from eagar_tsai_solver import eagar_tsai_temperature_C
from lpbf_thermal_solver import calculate_meltpool_physics, rosenthal_temperature_C


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(msg)


def main():
    # IN718-like solid props used only for the integral unit checks.
    T0 = 23.5
    k = 11.4
    rho = 8190.0
    cp = 435.0
    alpha = k / (rho * cp)
    P_eff = 0.38 * 285.0
    v = 0.960
    r0 = 33.5e-6

    # 1) Finite peak at the origin (Rosenthal point source is singular).
    T_origin = eagar_tsai_temperature_C(0.0, 0.0, 0.0, T0, P_eff, k, v, alpha, r0)
    assert_true(math.isfinite(T_origin), "ET peak finite")
    assert_true(T_origin > T0 + 200.0, f"ET peak above preheat ({T_origin})")

    # 2) Spot-size: larger r0 lowers the centerline peak (Eagar–Tsai §2.4).
    T_small = eagar_tsai_temperature_C(0.0, 0.0, 0.0, T0, P_eff, k, v, alpha, 24.5e-6)
    T_large = eagar_tsai_temperature_C(0.0, 0.0, 0.0, T0, P_eff, k, v, alpha, 41.0e-6)
    assert_true(T_small > T_large, f"larger spot cooler peak {T_small} vs {T_large}")

    T_ahead = eagar_tsai_temperature_C(80e-6, 0.0, 0.0, T0, P_eff, k, v, alpha, r0)
    T_behind = eagar_tsai_temperature_C(-80e-6, 0.0, 0.0, T0, P_eff, k, v, alpha, r0)
    assert_true(T_behind > T_ahead, f"wake hotter than front {T_behind} vs {T_ahead}")

    # 3) Wake point: small but finite r0 approaches regularized Rosenthal (same +x frame).
    x_wake = -100e-6
    r_small = 8.0e-6
    T_et = eagar_tsai_temperature_C(x_wake, 0.0, 0.0, T0, P_eff, k, v, alpha, r_small)
    T_ros = rosenthal_temperature_C(x_wake, 0.0, 0.0, T0, P_eff, k, v, alpha, r_small)
    rel = abs(T_et - T_ros) / max(1.0, abs(T_ros - T0))
    assert_true(rel < 0.45, f"ET→Rosenthal wake rel={rel:.3f} ET={T_et:.1f} Ros={T_ros:.1f}")

    # 4) NIST AMB2022-03 IN718 baseline (Lane et al. 2024, DOI 10.1007/s40192-024-00355-5).
    # Bare plate, 285 W, 960 mm/s, D4σ = 67 µm, T0 = 23.5 °C. Measured W = 136.3 µm.
    # Depth 139.7 µm is keyhole — ET is conduction-only, so only width is bounded.
    nist = calculate_meltpool_physics(
        "Inconel 718", 285, 960, 67, 23.5, 40, 110, heat_source="eagar-tsai"
    )
    assert_true(nist["modelId"] == "eagar-tsai-v1", "model id")
    W = nist["meltPoolGeometry"]["width_um"]
    assert_true(0.45 * 136.3 <= W <= 2.2 * 136.3, f"NIST width envelope W={W}")

    # 5) Same NIST P–v: larger D4σ → wider and shallower conduction isotherm.
    tight = calculate_meltpool_physics(
        "Inconel 718", 285, 960, 49, 23.5, 40, 110, heat_source="eagar-tsai"
    )
    wide = calculate_meltpool_physics(
        "Inconel 718", 285, 960, 82, 23.5, 40, 110, heat_source="eagar-tsai"
    )
    # Compare conduction isotherm depth (total depth includes King extra).
    d_iso_tight = tight["meltPoolGeometry"]["depth_um"] - tight["meltPoolGeometry"]["keyholeVaporCavityDepth_um"]
    d_iso_wide = wide["meltPoolGeometry"]["depth_um"] - wide["meltPoolGeometry"]["keyholeVaporCavityDepth_um"]
    assert_true(
        wide["meltPoolGeometry"]["width_um"] >= tight["meltPoolGeometry"]["width_um"] * 0.92,
        "larger spot not narrower",
    )
    assert_true(d_iso_wide <= d_iso_tight * 1.08, "larger spot not deeper conduction isotherm")

    # 6) 316L conduction-ish point (Guo et al. Micromachines 2024: 260 W, 1.47 m/s, 100 µm).
    # Published keyhole W/D at 0.52 m/s only; at 1.47 m/s W/D > 1. Order-of-magnitude W.
    ss = calculate_meltpool_physics(
        "316L Stainless Steel", 260, 1470, 100, 25, 50, 100, heat_source="eagar-tsai"
    )
    assert_true(60 <= ss["meltPoolGeometry"]["width_um"] <= 280, f"316L W={ss['meltPoolGeometry']['width_um']}")
    assert_true(ss["processParameters"]["heatSource"] == "eagar-tsai", "316L heat source flag")

    # 7) Build-job default path is unchanged (no heat_source → Rosenthal).
    ros = calculate_meltpool_physics("Inconel 718", 285, 960, 80, 80, 40, 110)
    assert_true(ros["modelId"] == "rosenthal-screening-v1", "default remains Rosenthal")

    print("PASS: Eagar–Tsai field + NIST / 316L envelopes")
    return 0


if __name__ == "__main__":
    sys.exit(main())

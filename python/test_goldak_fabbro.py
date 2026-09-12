#!/usr/bin/env python3
"""Goldak field + Fabbro keyhole checks (PROOF 019)."""
import math
import sys

from fabbro_keyhole import fabbro_keyhole_depth_m
from goldak_solver import GoldakField, seed_goldak_axes
from lpbf_thermal_solver import calculate_meltpool_physics


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(msg)


def main():
    # NIST AMB2022-03 IN718 baseline: 285 W, 960 mm/s, 67 µm, T0=23.5 °C, D=139.7 µm.
    nist = fabbro_keyhole_depth_m(285.0, 0.960, 67e-6, 11.4, 11.4 / (8190.0 * 435.0), 2850.0, 23.5, 0.38, 35.0)
    D_um = nist["depth_m"] * 1e6
    assert_true(0.45 * 139.7 <= D_um <= 2.2 * 139.7, f"Fabbro NIST depth {D_um:.1f} vs 139.7")

    tight = fabbro_keyhole_depth_m(285.0, 0.960, 49e-6, 11.4, 11.4 / (8190.0 * 435.0), 2850.0, 23.5, 0.38, 40.0)
    wide = fabbro_keyhole_depth_m(285.0, 0.960, 82e-6, 11.4, 11.4 / (8190.0 * 435.0), 2850.0, 23.5, 0.38, 28.0)
    assert_true(tight["depth_m"] > wide["depth_m"], "smaller spot deeper Fabbro keyhole")

    cold = fabbro_keyhole_depth_m(80.0, 1.6, 100e-6, 11.4, 3.2e-6, 2850.0, 80.0, 0.38, 8.0)
    assert_true(cold["depth_m"] == 0.0, "no Fabbro cavity below King transition")

    axes = seed_goldak_axes(40e-6)
    field = GoldakField(23.5, 108.3, 8190.0, 435.0, 11.4 / (8190.0 * 435.0), **{
        "af_m": axes["af_m"], "ar_m": axes["ar_m"], "b_m": axes["b_m"], "c_m": axes["c_m"],
    }).bind_speed(0.960)
    T0 = field.temperature_C(0.0, 0.0, 0.0)
    assert_true(math.isfinite(T0) and T0 > 23.5, f"Goldak peak finite {T0}")
    T_b = field.temperature_C(-80e-6, 0.0, 0.0)
    T_f = field.temperature_C(80e-6, 0.0, 0.0)
    assert_true(T_b >= T_f * 0.85, f"Goldak wake not colder than front {T_b} vs {T_f}")

    gk = calculate_meltpool_physics(
        "Inconel 718", 285, 960, 67, 23.5, 40, 110, heat_source="goldak"
    )
    assert_true(gk["modelId"] == "goldak-v1", "goldak model id")
    assert_true(gk["keyholeModel"]["modelId"] == "fabbro-keyhole-v1", "fabbro on goldak path")
    W = gk["meltPoolGeometry"]["width_um"]
    D = gk["meltPoolGeometry"]["depth_um"]
    assert_true(0.35 * 136.3 <= W <= 2.8 * 136.3, f"Goldak NIST width {W}")
    assert_true(0.35 * 139.7 <= D <= 2.8 * 139.7, f"Goldak+Fabbro NIST depth {D}")

    ros = calculate_meltpool_physics("Inconel 718", 285, 960, 80, 80, 40, 110)
    assert_true(ros["modelId"] == "rosenthal-screening-v1", "Build Job default unchanged")
    assert_true(ros["keyholeModel"]["modelId"] == "king-increment", "Rosenthal keeps King increment")

    print("PASS: Goldak field + Fabbro keyhole")
    return 0


if __name__ == "__main__":
    sys.exit(main())

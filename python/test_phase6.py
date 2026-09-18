"""Phase 6 Verification Test Suite: Optics & Powder Physics.

Covers:
  1. Powder packing validation: D10 <= D50 <= D90, geometric non-overlap, realistic density.
  2. Fresnel angle-dependent reflection & multiple reflection cavity absorption oracle.
  3. Nonuniform powder bed initialization in OpenFOAM 0/alpha.metal and thermalProperties.
  4. Bayesian process window optimizer integration contract.
"""

import json
import math
import os
from pathlib import Path
import tempfile
import unittest

from lpbf_cfd import setup_cfd_multiphysics_case
from powder_packer import (
    compute_powder_bed_statistics,
    generate_powder_bed,
    validate_powder_bed,
)


class TestPhase6(unittest.TestCase):
    def test_10_phase6_powder_packing_statistics_and_nonoverlap(self):
        """Verify powder packing algorithm generates valid, non-overlapping spheres with sorted percentiles."""
        span_x = 150e-6
        span_y = 150e-6
        layer_z = 50e-6
        d10_target = 15e-6
        d50_target = 30e-6
        d90_target = 45e-6

        spheres = generate_powder_bed(
            span_x,
            span_y,
            layer_z,
            d10=d10_target,
            d50=d50_target,
            d90=d90_target,
            target_packing=0.50,
            seed=12345,
        )

        self.assertGreater(len(spheres), 10, "Expected at least 10 spheres in powder bed")

        # Validate non-overlap
        is_valid, msg = validate_powder_bed(spheres, span_x, span_y, layer_z)
        self.assertTrue(is_valid, f"Powder bed validation failed: {msg}")

        # Validate statistics
        stats = compute_powder_bed_statistics(spheres, span_x, span_y, layer_z)
        self.assertEqual(stats["numSpheres"], len(spheres))
        self.assertGreaterEqual(stats["packingFraction"], 0.20)
        self.assertLessEqual(stats["packingFraction"], 0.70)

        # Percentile ordering
        self.assertLessEqual(stats["d10_um"], stats["d50_um"] + 1e-6)
        self.assertLessEqual(stats["d50_um"], stats["d90_um"] + 1e-6)

    def test_11_phase6_fresnel_reflection_and_cavity_enhancement(self):
        """Verify Fresnel optical physics: grazing reflection drop and cavity multi-bounce enhancement."""
        A0 = 0.40
        disc = max(0.0, 4.0 - 4.0 * A0 - A0 * A0)
        n = (2.0 - A0 + math.sqrt(disc)) / (2.0 * A0)
        k = n

        def fresnel_A(cos_theta):
            cos_theta = max(0.0, min(1.0, cos_theta))
            if cos_theta < 1e-6:
                return 0.0
            cos2 = cos_theta * cos_theta
            n_cos = n * cos_theta
            Rs = ((n_cos - 1.0) ** 2 + k * k * cos2) / ((n_cos + 1.0) ** 2 + k * k * cos2)
            Rp = ((n - cos_theta) ** 2 + k * k) / ((n + cos_theta) ** 2 + k * k)
            return 1.0 - 0.5 * (Rs + Rp)

        # 1. Normal incidence check: A(0) == A0
        A_normal = fresnel_A(1.0)
        self.assertAlmostEqual(A_normal, A0, places=3, msg="Normal incidence absorption must match base A0")

        # 2. Grazing incidence check: A(theta -> pi/2) -> 0, R -> 1
        A_grazing = fresnel_A(0.05)
        self.assertLess(A_grazing, A_normal, "Grazing incidence absorption must be strictly less than normal incidence")

        # 3. Cavity multi-bounce absorption oracle
        A_single = fresnel_A(0.5)
        R_single = 1.0 - A_single
        bounces = 3
        A_cavity = 1.0 - (R_single ** bounces)
        self.assertGreater(
            A_cavity,
            A_single,
            "Multi-bounce reflection in a cavity must capture more total energy than a single bounce",
        )
        self.assertGreater(
            A_cavity,
            A_normal,
            "Keyhole cavity trapping must exceed flat normal absorption due to multiple reflections",
        )

    def test_12_phase6_powder_bed_field_nonuniform_dimensions(self):
        """Verify OpenFOAM case setup generates nonuniform alpha.metal and thermalProperties with ray tracing."""
        p = {
            "beamDiameter_um": 50,
            "power_W": 200,
            "speed_mm_s": 1000,
            "layers": 1,
            "layer_um": 30,
            "mesh_um": 10,
            "scanAngle_deg": 0.0,
            "layerRotation_deg": 67.0,
            "strategy": "raster",
            "stripeWidth_um": 500,
            "trackLength_um": 100,
            "tracks": 1,
            "hatch_um": 100,
            "dwell_s": 0.0,
            "cooling_s": 0.0,
            "preheat_C": 80,
            "maxDt_s": 1e-6,
            "d10_um": 15,
            "d50_um": 30,
            "d90_um": 45,
            "packingFraction": 0.55,
            "useRayTracing": True,
            "raysPerDim": 15,
        }
        m = {
            "solidus_K": 1650,
            "liquidus_K": 1700,
            "boiling_K": 3100,
            "absorptivity": 0.4,
        }
        with tempfile.TemporaryDirectory(prefix="phase6_case_") as d:
            dx, segments = setup_cfd_multiphysics_case(p, m, d)

            am_path = Path(d) / "0/alpha.metal"
            self.assertTrue(am_path.exists())
            am = am_path.read_text()
            self.assertIn("internalField nonuniform List<scalar>", am)
            self.assertIn("dimensions [0 0 0 0 0 0 0];", am)

            tp_path = Path(d) / "constant/thermalProperties"
            self.assertTrue(tp_path.exists())
            tp = tp_path.read_text()
            self.assertIn("useRayTracing   true;", tp)
            self.assertIn("raysPerDim      15;", tp)
            self.assertIn("laserAbsorptivity 0.4;", tp)

            info_path = Path(d) / "powder_bed_info.json"
            self.assertTrue(info_path.exists())
            info = json.loads(info_path.read_text())
            self.assertIn("packingFraction", info)
            self.assertIn("numSpheres", info)
            self.assertGreater(info["numSpheres"], 0)

    def test_13_phase6_bayesian_optimizer_contract(self):
        """Verify Bayesian optimizer runs a bounded parameter search and produces valid Pareto/score trajectory."""
        try:
            from lpbf_bayesian_optimizer import optimize_process_window
        except ImportError as e:
            raise unittest.SkipTest(f"Bayesian optimizer dependencies not available in this environment: {e}")

        bounds = {
            "laserPower_W": [150.0, 300.0],
            "scanSpeed_mms": [600.0, 1200.0],
            "hatch_um": [80.0, 120.0],
            "layer_um": [30.0, 50.0],
        }

        try:
            res = optimize_process_window(
                alloy_id="Ti-6Al-4V",
                bounds=bounds,
                n_iterations=5,
                n_initial=3,
                seed=42,
            )
        except (ImportError, ModuleNotFoundError) as e:
            raise unittest.SkipTest(f"Runtime dependencies not installed in this environment: {e}")

        self.assertTrue(res.get("success", False))
        self.assertIn("bestParams", res)
        self.assertIn("bestScore", res)
        self.assertIn("iterations", res)
        self.assertEqual(len(res["iterations"]), 5)
        self.assertGreaterEqual(res["bestScore"], 0.0)


if __name__ == "__main__":
    unittest.main()

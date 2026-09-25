"""Focused correctness coverage for the opt-in Warp thermal candidate."""

import unittest
from unittest.mock import patch

import lpbf_gpu_thermal_warp as candidate


CASE = {
    "mode": "standard", "backend": "reference", "material": "Inconel 718",
    "power_W": 60, "speed_mm_s": 1200, "mesh_um": 10, "maxDt_s": 2e-7,
    "layer_um": 80, "trackLength_um": 200, "cooling_s": 2e-5, "dwell_s": 0,
    "powderGridPolicy": "layer-conforming",
}


class WarpThermalCandidate(unittest.TestCase):
    def test_explicit_device_and_dependency_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "Explicit cuda:N"):
            candidate._require_warp_cuda("cpu")
        with patch.object(candidate, "wp", None):
            with self.assertRaisesRegex(RuntimeError, "Warp is unavailable"):
                candidate._require_warp_cuda("cuda:0")

    def test_exact_pilot_case_matches_cpu_full_temperature_field(self):
        try:
            import torch
            available = torch.cuda.is_available() and candidate.wp is not None
        except ImportError:
            available = False
        if not available:
            self.skipTest("Warp/CUDA unavailable; explicit candidate parity unverified")

        result = candidate.compare_with_cpu(CASE, "cuda:0")
        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["gpu"]["solver"]["id"], candidate.WARP_SOLVER_ID)
        self.assertEqual(result["gpu"]["solver"]["thermalEvolutionDevice"], "cuda:0")
        self.assertEqual(result["gpu"]["solver"]["sourceIntegrationDevice"], "cpu")
        self.assertEqual(result["gpu"]["discretization"]["cells"], 73_568)
        self.assertEqual(result["gpu"]["discretization"]["steps"], 934)
        self.assertEqual(result["comparisons"]["finalSampling"]["status"], "pass")
        field = result["comparisons"]["finalTemperatureField"]
        self.assertEqual(field["status"], "pass")
        self.assertLessEqual(field["relativeRiseL2"], .01)
        self.assertLessEqual(field["relativeRiseMax"], .01)
        self.assertLessEqual(result["gpu"]["energyBalance"]["relativeError"], .01)


if __name__ == "__main__":
    unittest.main()

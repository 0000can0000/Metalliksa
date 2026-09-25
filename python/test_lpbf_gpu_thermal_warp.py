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

    def test_four_registry_alloys_match_cpu_under_same_warp_model(self):
        try:
            import torch
            available = torch.cuda.is_available() and candidate.wp is not None
        except ImportError:
            available = False
        if not available:
            self.skipTest("Warp/CUDA unavailable; four-alloy parity unverified")

        from lpbf_simulation import validate
        alloys = (("Inconel 718", "in718"),
                  ("316L Stainless Steel", "ss316l"),
                  ("AlSi10Mg", "alsi10mg"),
                  ("Ti-6Al-4V", "ti6al4v"))
        for name, expected_id in alloys:
            with self.subTest(alloy=name):
                case = {**CASE, "material": name}
                _, material = validate(case)
                self.assertEqual(material["materialId"], expected_id)
                self.assertEqual(material["quality"], "estimated")
                result = candidate.compare_with_cpu(case, "cuda:0")
                self.assertEqual(result["status"], "pass")
                self.assertEqual(result["gpu"]["material"]["materialRevisionSha256"],
                                 material["materialRevisionSha256"])
                self.assertEqual(result["gpu"]["solver"]["modelId"],
                                 result["cpu"]["coreContract"]["modelId"])
                self.assertEqual(result["gpu"]["discretization"]["steps"],
                                 result["cpu"]["discretization"]["steps"])
                self.assertEqual(result["comparisons"]["finalTemperatureField"]["status"], "pass")
                self.assertLessEqual(result["gpu"]["energyBalance"]["relativeError"], .01)
                self.assertFalse(result["experimentalValidation"])


if __name__ == "__main__":
    unittest.main()

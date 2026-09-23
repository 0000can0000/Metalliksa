"""Existing LPBF queue dispatches an explicit, isolated CUDA parity pilot."""

import copy
import tempfile
import unittest
from unittest.mock import patch

from lpbf_gpu_thermal import (PILOT_JOB_TYPE, enforce_gpu_pilot_result,
                              validate_pilot_request)
from lpbf_worker import Queue


CASE = {"jobType": PILOT_JOB_TYPE, "mode": "standard", "backend": "cuda:0",
        "material": "Inconel 718", "power_W": 60, "speed_mm_s": 1200,
        "mesh_um": 40, "maxDt_s": 2e-7, "layer_um": 80,
        "trackLength_um": 200, "cooling_s": 2e-5, "dwell_s": 0}


class GpuQueue(unittest.TestCase):
    def test_requires_explicit_device_and_bounded_reference_case(self):
        for backend in ("reference", "auto", "cuda", "cpu", "cuda:-1"):
            with self.assertRaisesRegex(ValueError, "no CPU fallback"):
                validate_pilot_request({**CASE, "backend": backend})
        with patch("lpbf_gpu_thermal.require_cuda"):
            for invalid in ({"tracks": 2}, {"study": "mesh"},
                            {"surfaceMode": "bare-plate", "sourcePenetration_um": 40},
                            {"mode": "screening"}):
                with self.assertRaises(ValueError):
                    validate_pilot_request({**CASE, **invalid})

    def test_missing_device_is_explicit_submit_error(self):
        with patch("torch.cuda.is_available", return_value=False), tempfile.TemporaryDirectory() as tmp:
            queue = Queue(tmp, start=False)
            try:
                with self.assertRaisesRegex(RuntimeError, "no CPU fallback"):
                    queue.submit(CASE)
            finally:
                queue.close()

    def test_real_cuda_queue_result_and_integrity(self):
        try:
            import torch
            available = torch.cuda.is_available()
        except ImportError:
            available = False
        if not available:
            self.skipTest("CUDA unavailable; queued GPU execution unverified")
        with tempfile.TemporaryDirectory() as tmp:
            queue = Queue(tmp, start=False)
            try:
                submitted = queue.submit(CASE)
                self.assertEqual(submitted["requestSummary"]["backend"], "cuda:0")
                queue.update(submitted["id"], status="running")
                queue.execute(submitted["id"])
                state = queue.get(submitted["id"])
                self.assertEqual(state["status"], "completed", state.get("error"))
                result = state["result"]
                enforce_gpu_pilot_result(result)
                self.assertEqual(result["solver"]["thermalEvolutionDevice"], "cuda:0")
                self.assertEqual(result["solver"]["sourceIntegrationDevice"], "cpu")
                self.assertEqual(result["gpuPilot"]["status"], "pass")
                self.assertEqual(result["gpuPilot"]["comparisons"]["finalTemperatureField"]["status"], "pass")
                self.assertFalse(result["gpuPilot"]["experimentalValidation"])
                self.assertTrue(result["provenance"]["deviceEvidence"]["synchronizedAfterSolve"])
                with self.assertRaisesRegex(ValueError, "archive unavailable"):
                    queue.capture(submitted["id"])
                tampered = copy.deepcopy(result)
                tampered["solver"]["actualBackend"] = "numpy-reference"
                with self.assertRaises(ValueError):
                    enforce_gpu_pilot_result(tampered)
                tampered = copy.deepcopy(result)
                tampered["gpuPilot"]["comparisons"]["finalTemperatureField"]["relativeRiseL2"] = 1.
                with self.assertRaisesRegex(ValueError, "final-field parity"):
                    enforce_gpu_pilot_result(tampered)
            finally:
                queue.close()


if __name__ == "__main__":
    unittest.main()

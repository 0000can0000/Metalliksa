"""Numerical GPU parity checks with targets fixed before execution."""

import unittest
from unittest.mock import patch
import copy

import numpy as np

from lpbf_gpu_thermal import PARITY_TARGETS, compare_with_cpu, require_cuda, run_gpu
from lpbf_simulation import validate
from lpbf_core_physics import scan_segments


CASE = {"mode": "standard", "backend": "reference", "material": "Inconel 718",
        "power_W": 60, "speed_mm_s": 1200, "mesh_um": 40, "maxDt_s": 2e-7,
        "layer_um": 80, "trackLength_um": 200, "cooling_s": 2e-5, "dwell_s": 0}


class GpuThermal(unittest.TestCase):
    def test_gpu_path_rejects_truncated_source_capture(self):
        try:
            import torch
        except ImportError:
            self.skipTest("PyTorch unavailable for GPU-path driver test")
        import lpbf_gpu_thermal
        from lpbf_simulation import MINIMUM_SOURCE_CAPTURE_FRACTION

        settings, _ = validate(CASE)
        domain = lpbf_gpu_thermal.calculate_mesh_domain(settings)
        n = domain["nxy"]
        z_count = domain["nz"]
        capture = MINIMUM_SOURCE_CAPTURE_FRACTION - 1e-3
        with patch("lpbf_gpu_thermal.require_cuda", return_value=(torch, torch.device("cpu"))), \
             patch("lpbf_gpu_thermal.source_limited_step",
                   return_value=(settings["maxDt_s"], np.zeros((n, n, z_count)), None, capture, 0)):
            with self.assertRaisesRegex(ValueError, "Gaussian source capture .* below the 99% minimum"):
                run_gpu(CASE, "cuda:0")

    def test_equal_summaries_cannot_hide_wrong_final_field(self):
        settings, _ = validate(CASE)
        end = scan_segments(settings)[1]
        coords = np.array([[0., 0., 0.], [1e-5, 0., 0.]])
        metrics = {"peakTemperature_K": 1500., "width_um": 40., "depth_um": 40.,
                   "length_um": 100., "volume_um3": 1000.}
        energy = {"input_J": 1., "losses_J": .2, "stored_J": .8}
        disc = {"cells": 2, "mesh_m": 1e-5, "steps": 1}
        cpu = {"coreContract": {"modelId": "stationary-enthalpy-conduction-v1"},
               "material": {"name": "Inconel 718", "materialId": "in718",
                            "materialRevisionSha256": "a" * 64, "version": "lpbf-materials-1"},
               "settings": settings, "metrics": metrics, "energyBalance": energy,
               "discretization": disc, "thermalHistory": [{"time_s": end}],
               "solver": {"id": "enthalpy-fv-6"}}
        gpu = {"solver": {"modelId": "stationary-enthalpy-conduction-v1"},
               "material": copy.deepcopy(cpu["material"]), "metrics": copy.deepcopy(metrics),
               "energyBalance": copy.deepcopy(energy), "discretization": copy.deepcopy(disc)}
        frame = {"time_s": end, "surface_m": settings["layer_um"] * 1e-6}
        # Same peak and total temperature, but the hot cells are in wrong places.
        field = {"temperature_K": np.array([1500., 1000.]), "coordinates_m": coords,
                 "time_s": end, "surface_m": frame["surface_m"], "steps": 1}
        with patch("lpbf_gpu_thermal.run_gpu", return_value=(gpu, field)), \
             patch("lpbf_gpu_thermal._run_cpu_with_final",
                   return_value=(cpu, frame, np.array([1000., 1500.]), coords)):
            result = compare_with_cpu(CASE)
        self.assertEqual(result["comparisons"]["peakTemperature_K"]["status"], "pass")
        self.assertEqual(result["comparisons"]["stored_J"]["status"], "pass")
        self.assertEqual(result["comparisons"]["finalSampling"]["status"], "pass")
        self.assertEqual(result["comparisons"]["finalTemperatureField"]["status"], "failed")
        self.assertEqual(result["status"], "failed")

    def test_device_is_explicit_and_never_falls_back(self):
        for device in ("cpu", "cuda", "auto", "cuda:-1", "cuda:abc"):
            with self.assertRaisesRegex(ValueError, "no CPU fallback"):
                require_cuda(device)
        with patch("torch.cuda.is_available", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "no CPU fallback"):
                require_cuda("cuda:0")

    def test_cuda_reference_parity_for_molten_track(self):
        try:
            import torch
            available = torch.cuda.is_available()
        except ImportError:
            available = False
        if not available:
            self.skipTest("CUDA runtime unavailable; real GPU parity unverified")
        self.assertEqual(PARITY_TARGETS["integralRelativeMax"], .01)
        self.assertEqual(PARITY_TARGETS["widthDepthAbsoluteCellsMax"], 1.)
        self.assertEqual(PARITY_TARGETS["fieldRiseL2RelativeMax"], .01)
        self.assertEqual(PARITY_TARGETS["fieldRiseMaxRelativeMax"], .01)
        self.assertEqual(PARITY_TARGETS["peakMeltVolumeRelativeMax"], .01)
        result = compare_with_cpu(CASE, "cuda:0")
        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["gpu"]["solver"]["thermalEvolutionDevice"], "cuda:0")
        self.assertEqual(result["gpu"]["solver"]["sourceIntegrationDevice"], "cpu")
        self.assertEqual(result["gpu"]["solver"]["modelId"], result["cpu"]["coreContract"]["modelId"])
        self.assertEqual(result["gpu"]["material"]["materialRevisionSha256"],
                         result["cpu"]["material"]["materialRevisionSha256"])
        self.assertGreater(result["gpu"]["metrics"]["width_um"], 0)
        self.assertGreater(result["gpu"]["metrics"]["depth_um"], 0)
        self.assertLessEqual(result["gpu"]["energyBalance"]["relativeError"], .01)
        self.assertEqual(result["comparisons"]["finalSampling"]["status"], "pass")
        self.assertEqual(result["comparisons"]["finalTemperatureField"]["status"], "pass")
        self.assertEqual(result["comparisons"]["volume_um3"]["status"], "pass")
        self.assertEqual(result["comparisons"]["length_um"]["status"], "pass")
        self.assertFalse(result["experimentalValidation"])

    def test_cuda_reference_parity_for_316l_registry_material(self):
        """Check CUDA parity only for the existing estimated-legacy 316L snapshot."""
        try:
            import torch
            available = torch.cuda.is_available()
        except ImportError:
            available = False
        if not available:
            self.skipTest("CUDA runtime unavailable; real 316L GPU parity unverified")

        case = {**CASE, "material": "316L Stainless Steel"}
        _, material = validate(case)
        self.assertEqual(material["materialId"], "ss316l")
        self.assertEqual(material["quality"], "estimated")
        self.assertEqual(material["provenanceClass"], "estimated-legacy")

        self.assertEqual(PARITY_TARGETS["integralRelativeMax"], .01)
        self.assertEqual(PARITY_TARGETS["widthDepthAbsoluteCellsMax"], 1.)
        self.assertEqual(PARITY_TARGETS["fieldRiseL2RelativeMax"], .01)
        self.assertEqual(PARITY_TARGETS["fieldRiseMaxRelativeMax"], .01)
        self.assertEqual(PARITY_TARGETS["peakMeltVolumeRelativeMax"], .01)
        result = compare_with_cpu(case, "cuda:0")
        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["scope"], "same-model CPU/GPU numerical parity only")
        self.assertFalse(result["experimentalValidation"])
        self.assertEqual(result["gpu"]["validationStatus"], "unvalidated")
        self.assertFalse(result["gpu"]["productionReady"])
        self.assertEqual(result["gpu"]["material"]["materialId"], "ss316l")
        self.assertEqual(result["gpu"]["material"]["materialRevisionSha256"],
                         material["materialRevisionSha256"])
        self.assertEqual(result["gpu"]["solver"]["thermalEvolutionDevice"], "cuda:0")
        self.assertEqual(result["gpu"]["solver"]["sourceIntegrationDevice"], "cpu")
        self.assertLessEqual(result["gpu"]["energyBalance"]["relativeError"], .01)
        self.assertEqual(result["comparisons"]["finalSampling"]["status"], "pass")
        self.assertEqual(result["comparisons"]["finalTemperatureField"]["status"], "pass")
        self.assertEqual(result["comparisons"]["volume_um3"]["status"], "pass")
        self.assertEqual(result["comparisons"]["length_um"]["status"], "pass")


if __name__ == "__main__":
    unittest.main()

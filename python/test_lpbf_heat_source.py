"""Independent numerical oracles; synthetic verification, not measured validation."""
import math
import io
import os
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import unittest
import numpy as np
from lpbf_heat_source import gaussian_interval, cell_weights, integrated_source, source_limited_step, conduction_diagonal


class HeatSourceVerification(unittest.TestCase):
    @unittest.skipIf(os.name == "nt", "OpenFOAM dispatch is Linux-only")
    def test_reused_case_cannot_inherit_new_binary_diagnostics(self):
        from lpbf_openfoam import thermal
        with tempfile.TemporaryDirectory() as tmp:
            case = Path(tmp)/"openfoam-case"
            case.mkdir()
            stale = case/"numerical-diagnostics.json"
            stale.write_text('{"sourceIntegration":"cell-integrated-gaussian-gl2-v1"}')
            child = SimpleNamespace(stdout=io.StringIO(""), wait=lambda: 0)
            with patch("lpbf_openfoam.BINARY", Path(__file__)), patch("lpbf_openfoam.generate_case", return_value=(1., [])), patch("lpbf_openfoam.subprocess.Popen", return_value=child):
                with self.assertRaisesRegex(ValueError, "binary is outdated"):
                    thermal({}, {}, artifact_dir=tmp)
            self.assertFalse(stale.exists())

    def test_cell_integral_matches_independent_quadrature_including_tail(self):
        for a, b in [(-.2, .3), (2.8, 3.1), (-3.1, -2.8), (-10, 10)]:
            nodes, weights = np.polynomial.legendre.leggauss(128)
            x = (a+b)/2+(b-a)/2*nodes
            expected = float(np.sum(weights*np.sqrt(2/np.pi)*np.exp(-2*x*x))*(b-a)/2)
            self.assertAlmostEqual(float(gaussian_interval(a, b, 0, 1))/expected, 1, delta=1e-10)

    def test_refinement_additivity_and_translation_continuity(self):
        fine_edges = np.linspace(-.5, .5, 9)
        fine = gaussian_interval(fine_edges[:-1], fine_edges[1:], .23, .17)
        self.assertAlmostEqual(float(fine.sum()), float(gaussian_interval(-.5, .5, .23, .17)), delta=1e-14)
        self.assertLess(abs(float(gaussian_interval(-.5, .5, .5-1e-9, .2))-float(gaussian_interval(-.5, .5, .5+1e-9, .2))), 1e-7)

    def test_symmetry_power_and_future_powder(self):
        axis = (np.arange(12)+.5)*.25-1.5
        z = (np.arange(10)+.5)*.25-1.5
        segment = dict(start_s=0., end_s=1., start=[0., 0.], end=[0., 0.])
        source, capture = integrated_source(axis, z, .25, segment, 0, .2, .1, .4, .3, 70.)
        self.assertAlmostEqual(float(source.sum())*.25**3, 70., delta=1e-11)
        np.testing.assert_allclose(source, source[::-1], atol=1e-10)
        self.assertTrue((source >= 0).all())
        self.assertTrue((source[:, :, z >= .1] == 0).all())
        self.assertGreater(capture, 0)
        self.assertLessEqual(capture, 1)

    def test_moving_quadrature_beats_left_endpoint_and_reverses(self):
        axis = (np.arange(16)+.5)*.2-1.6
        z = (np.arange(8)+.5)*.2-1.6
        seg = dict(start_s=0., end_s=1., start=[-.1, 0.], end=[.1, 0.])
        actual, _ = integrated_source(axis, z, .2, seg, 0, 1, 0, .5, .3, 1)
        reference = np.zeros_like(actual)
        for t in (np.arange(1000)+.5)/1000:
            w = cell_weights(axis, z, .2, [-.1+.2*t, 0], 0, .5, .3)
            reference += w/(w.sum()*.2**3*1000)
        w = cell_weights(axis, z, .2, seg["start"], 0, .5, .3)
        left = w/(w.sum()*.2**3)
        self.assertLess(np.linalg.norm(actual-reference), np.linalg.norm(left-reference)*.01)
        reverse, _ = integrated_source(axis, z, .2, {**seg, "start":seg["end"], "end":seg["start"]}, 0, 1, 0, .5, .3, 1)
        np.testing.assert_allclose(actual, reverse, rtol=1e-13, atol=1e-13)

    def test_source_recomputed_after_cap_and_dwell_is_dark(self):
        axis = np.arange(-1.5, 2, 1.)
        z = np.array([-1.5, -.5, .5])
        seg = dict(start_s=0., end_s=1., start=[-1., 0.], end=[1., 0.])
        passive = np.zeros((4, 4, 3))
        capacity = np.ones_like(passive)
        dt, source, rate, _, retries = source_limited_step(axis, z, 1, seg, 0, 1, 0, .5, .5, 1000, passive, capacity)
        self.assertGreater(retries, 0)
        self.assertLessEqual(float((dt*np.abs(rate)/capacity).max()), 25*(1+1e-12))
        expected, _ = integrated_source(axis, z, 1, seg, 0, dt, 0, .5, .5, 1000)
        np.testing.assert_allclose(source, expected)
        dark, _ = integrated_source(axis, z, 1, None, 1, .1, 0, .5, .5, 1000)
        self.assertTrue((dark == 0).all())
        with self.assertRaises(ValueError):
            integrated_source(axis, z, 1, seg, .9, .2, 0, .5, .5, 1000)

    def test_heterogeneous_row_sum_preserves_temperature_bounds(self):
        from lpbf_simulation import conduction_rate
        k = np.array([1., 1000., 1.]).reshape(3, 1, 1)
        active = np.ones_like(k, dtype=bool)
        temperature = np.array([300., 900., 300.]).reshape(k.shape)
        diagonal = conduction_diagonal(k, active, 1)
        dt = .9/float(diagonal.max())
        advanced = temperature+dt*conduction_rate(temperature, k, active, 1)
        self.assertGreaterEqual(float(advanced.min()), 300.)
        self.assertLessEqual(float(advanced.max()), 900.)
        self.assertAlmostEqual(float(advanced.sum()), float(temperature.sum()))

    def test_scan_schedule_energy_and_resolution_diagnostics(self):
        from lpbf_simulation import run, scan_segments
        r = run(dict(mode="standard", backend="reference", material="316L Stainless Steel", power_W=20,
                     mesh_um=40, trackLength_um=100, tracks=2, layers=2, dwell_s=.00003, cooling_s=.00002))
        p = r["settings"]
        segments, end = scan_segments(p)
        expected = p["power_W"]*p["absorptivity"]*sum(s["end_s"]-s["start_s"] for s in segments)
        self.assertAlmostEqual(r["energyBalance"]["input_J"], expected, delta=expected*1e-10)
        self.assertAlmostEqual(r["thermalHistory"][-1]["time_s"], end, delta=1e-13)
        d = r["numericalDiagnostics"]
        self.assertLessEqual(d["maximumEnthalpyIncrement_K"], 25*(1+1e-10))
        self.assertLessEqual(d["maximumSurfaceOffset_um"], r["discretization"]["mesh_m"]*5e5+1e-9)
        self.assertEqual(r["geometricDefectScreen"]["status"], "unresolved")


if __name__ == "__main__":
    unittest.main()

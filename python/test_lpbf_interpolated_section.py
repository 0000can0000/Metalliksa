"""Focused checks for the supplementary, cell-center liquidus contour."""

import unittest

import numpy as np

from lpbf_peak import (interpolated_midtrack_bare_plate_section,
                       interpolated_peak_melt_pool, midtrack_bare_plate_section)
from lpbf_simulation import run


class InterpolatedMidtrackSection(unittest.TestCase):
    def test_peak_field_contour_interpolates_3d_edges(self):
        x, y, z = np.meshgrid(np.array([-1., 0., 1.])*1e-6,
                              np.array([-1., 0., 1.])*1e-6,
                              np.array([-2.5, -1.5, -.5])*1e-6, indexing="ij")
        xyz = np.column_stack((x.ravel(), y.ravel(), z.ravel()))
        temperature = np.full((3, 3, 3), 1000.)
        temperature[1, 1, 1] = 2000.
        contour = interpolated_peak_melt_pool(xyz, temperature, 0., 0., 1e-6, 1500.)
        self.assertEqual(contour["status"], "thermal-proxy")
        self.assertAlmostEqual(contour["width_um"], 1.)
        self.assertAlmostEqual(contour["depth_um"], 2.)
        temperature[0, 1, 1] = 2000.
        boundary = interpolated_peak_melt_pool(xyz, temperature, 0., 0., 1e-6, 1500.)
        self.assertEqual(boundary["status"], "inconclusive")

    def test_linear_crossings_are_fractional_and_do_not_change_cell_extent(self):
        axis = np.array([-1.5, -.5, .5, 1.5]) * 1e-6
        z = np.array([-2.5, -1.5, -.5]) * 1e-6
        maximum = np.full((4, 3), 1000.)
        maximum[1, 1] = 1800.
        maximum[2, 1] = 1300.
        section = interpolated_midtrack_bare_plate_section(
            axis, z, maximum, 1e-6, 1500., -.5e-6)
        self.assertEqual(section["status"], "thermal-proxy")
        self.assertEqual(section["operator"], "midtrack-accepted-max-liquidus-linear-contour-v1")
        self.assertAlmostEqual(section["width_um"], .975)
        self.assertAlmostEqual(section["depth_um"], 1.875)
        molten = np.zeros((4, 4, 3), dtype=bool)
        molten[1, 1, 1] = True
        discrete = midtrack_bare_plate_section(axis, z, molten, 1e-6)
        self.assertAlmostEqual(discrete["width_um"], 1.)
        self.assertAlmostEqual(discrete["depth_um"], 2.)

    def test_missing_contour_is_explicit(self):
        axis = np.array([-1.5, -.5, .5, 1.5]) * 1e-6
        z = np.array([-2.5, -1.5, -.5]) * 1e-6
        cold = np.full((4, 3), 1000.)
        no_melt = interpolated_midtrack_bare_plate_section(
            axis, z, cold, 1e-6, 1500., -.5e-6)
        self.assertEqual(no_melt["status"], "no-melt")
        self.assertIsNone(no_melt["width_um"])
        cold[0, 1] = 1800.
        boundary = interpolated_midtrack_bare_plate_section(
            axis, z, cold, 1e-6, 1500., -.5e-6)
        self.assertEqual(boundary["status"], "inconclusive")
        self.assertIn("boundary", boundary["reason"])

    def test_real_solver_emits_separate_operator(self):
        case = {"mode": "standard", "backend": "reference", "surfaceMode": "bare-plate",
                "sourcePenetration_um": 40, "material": "Inconel 718", "power_W": 80,
                "speed_mm_s": 1200, "mesh_um": 40, "maxDt_s": 2e-7,
                "trackLength_um": 200, "cooling_s": 2e-5, "dwell_s": 0}
        result = run(case)
        self.assertEqual(result["midTrackCrossSection"]["operator"],
                         "midtrack-ever-liquidus-cell-section-v1")
        interpolated = result["midTrackInterpolatedCrossSection"]
        self.assertEqual(interpolated["operator"],
                         "midtrack-accepted-max-liquidus-linear-contour-v1")
        self.assertEqual(interpolated["status"], "thermal-proxy")
        self.assertGreater(interpolated["width_um"], 0)
        self.assertGreater(interpolated["depth_um"], 0)
        peak = result["peakInterpolatedMeltPool"]
        self.assertEqual(peak["operator"], "peak-liquidus-cell-edge-linear-contour-v1")


if __name__ == "__main__":
    unittest.main()

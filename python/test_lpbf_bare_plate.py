"""Bare-plate reference physics and location-specific thermal section checks."""

import unittest

import numpy as np

from lpbf_peak import midtrack_bare_plate_section
from lpbf_core_physics import calculate_mesh_domain, scan_segments
from lpbf_evidence import resource_estimate
from lpbf_simulation import run, validate


CASE = {"mode": "standard", "backend": "reference", "surfaceMode": "bare-plate",
        "sourcePenetration_um": 40, "material": "Inconel 718", "power_W": 80,
        "speed_mm_s": 1200, "mesh_um": 40, "maxDt_s": 2e-7,
        "trackLength_um": 200, "cooling_s": 2e-5, "dwell_s": 0}


class BarePlate(unittest.TestCase):
    def test_midpoint_optical_operator_uses_widest_and_deepest_extent(self):
        axis = np.array([-1.5, -.5, .5, 1.5])
        z = np.array([-2.5, -1.5, -.5])
        molten = np.zeros((4, 4, 3), dtype=bool)
        molten[1, 0, 1] = True
        molten[1, 3, 1] = True
        molten[1, 2, 0] = True
        molten[2, 0, 0] = True  # Another plane must not widen/deepen this cut.
        section = midtrack_bare_plate_section(axis, z, molten, 1.)
        self.assertEqual(section["status"], "thermal-proxy")
        self.assertEqual(section["width_um"], 4e6)
        self.assertEqual(section["depth_um"], 3e6)
        self.assertEqual(section["sampleCells"], 3)
        self.assertEqual(section["planeOffset_um"], -5e5)
        self.assertFalse(section["midpointResolvedWithinQuarterCell"])

    def test_bare_plate_requires_explicit_model_inputs(self):
        for patch in ({"sourcePenetration_um": None}, {"backend": "auto"},
                      {"tracks": 2}, {"layers": 2}, {"scanAngle_deg": 45},
                      {"measurements": [{"width_um": 1, "depth_um": 1, "source": "synthetic"}]}):
            with self.assertRaises(ValueError):
                validate({**CASE, **patch})
        with self.assertRaises(ValueError):
            validate({**CASE, "spotD4sigma_um": 67})

    def test_reference_bare_plate_energy_mass_and_unavailable_experiment(self):
        result = run(CASE)
        section = result["midTrackCrossSection"]
        self.assertEqual(section["status"], "thermal-proxy")
        self.assertGreater(section["width_um"], 0)
        self.assertGreater(section["depth_um"], 0)
        self.assertLess(result["energyBalance"]["relativeError"], .01)
        self.assertEqual(result["massBalance"]["deposited_kg"], 0)
        self.assertEqual(result["experimentalComparison"]["status"], "unavailable")
        self.assertEqual(result["coreContract"]["actualBackend"], "numpy-reference")

    def test_powder_mode_default_retains_numerical_path(self):
        powder = {"mode": "standard", "backend": "reference", "power_W": 40,
                  "mesh_um": 40, "trackLength_um": 200, "cooling_s": .0001, "dwell_s": 0}
        original = run(powder)
        explicit = run({**powder, "surfaceMode": "powder-layer"})
        self.assertEqual(original["metrics"], explicit["metrics"])
        self.assertEqual(original["energyBalance"], explicit["energyBalance"])
        self.assertIsNone(original["midTrackCrossSection"])

    def test_rectangular_corridor_geometry_preserves_full_scan_and_energy(self):
        rectangular = {**CASE, "barePlateGeometry": "rectangular-corridor",
                       "trackLength_um": 600, "maxDt_s": 1e-6}
        result = run(rectangular)
        self.assertAlmostEqual(result["scanPath"][0]["start"][0], -300e-6)
        self.assertAlmostEqual(result["scanPath"][0]["end"][0], 300e-6)
        self.assertEqual(result["scanPath"][0]["start"][1], 0.0)
        self.assertEqual(result["scanPath"][0]["end"][1], 0.0)
        domain = calculate_mesh_domain(validate(rectangular)[0])
        self.assertGreater(domain["nx"], domain["ny"])
        self.assertEqual(result["discretization"]["cells"], domain["nx"]*domain["ny"]*domain["nz"])
        self.assertLess(result["energyBalance"]["relativeError"], .01)
        self.assertEqual(result["midTrackCrossSection"]["status"], "thermal-proxy")

    def test_rectangular_corridor_10mm_estimates_and_refuses_oversized_fine_meshes(self):
        p, m = validate({**CASE, "barePlateGeometry": "rectangular-corridor",
                         "trackLength_um": 10000, "mesh_um": 20})
        estimate = resource_estimate(p, m)
        self.assertLess(estimate["cells"], 600000)
        for mesh_um in (10, 5):
            p, m = validate({**CASE, "barePlateGeometry": "rectangular-corridor",
                             "trackLength_um": 10000, "mesh_um": mesh_um})
            estimate = resource_estimate(p, m)
            domain = calculate_mesh_domain(p)
            self.assertEqual(estimate["shape"], [domain["nx"], domain["ny"], domain["nz"]])
            self.assertEqual(estimate["cells"], domain["nx"]*domain["ny"]*domain["nz"])
            self.assertGreater(estimate["cells"], 600000)
            segments, _ = scan_segments(p)
            self.assertAlmostEqual(abs(segments[0]["end"][0]-segments[0]["start"][0]), .01)
            with self.assertRaisesRegex(ValueError, r"requires [\d,]+ cells, above the 600000-cell"):
                run({**CASE, "barePlateGeometry": "rectangular-corridor",
                     "trackLength_um": 10000, "mesh_um": mesh_um})

    def test_bare_plate_square_default_is_unchanged_by_explicit_square(self):
        implicit = run(CASE)
        explicit = run({**CASE, "barePlateGeometry": "square"})
        self.assertEqual(implicit["metrics"], explicit["metrics"])
        self.assertEqual(implicit["energyBalance"], explicit["energyBalance"])
        self.assertEqual(implicit["discretization"], explicit["discretization"])

    def test_10mm_track_requires_rectangular_bare_plate_opt_in(self):
        with self.assertRaisesRegex(ValueError, "only by the opt-in bare-plate rectangular-corridor"):
            validate({"trackLength_um": 10000})

    def test_separate_three_level_studies_keep_frozen_targets(self):
        mesh = run({**CASE, "mesh_um": 30, "maxDt_s": 1e-7, "study": "mesh"})
        time = run({**CASE, "mesh_um": 40, "maxDt_s": 1e-7, "study": "timestep"})
        for result, kind in ((mesh, "mesh"), (time, "timestep")):
            study = result["convergenceStudy"]
            self.assertEqual(study["kind"], kind)
            self.assertEqual(study["metricSource"], "midTrackCrossSection")
            self.assertEqual(len(study["results"]), 3)
            self.assertEqual(study["acceptance"]["targets"]["energyRelativeErrorMax"], .01)
            self.assertEqual(study["acceptance"]["targets"]["finestPairWidthDepthRelativeChangeMax"], .05)
            self.assertEqual(study["acceptance"]["status"], "inconclusive")
            self.assertEqual(study["acceptance"]["energyStatus"], "pass")
            self.assertEqual(result["experimentalComparison"]["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()

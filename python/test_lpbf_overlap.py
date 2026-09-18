import math
import os
import unittest
import numpy as np
from lpbf_overlap import FieldOverlapTracker, OVERLAP_MODEL_ID
from lpbf_worker import capabilities
from lpbf_simulation import validate, transient


class TestFieldOverlap(unittest.TestCase):
    def setUp(self):
        self.material = {
            "name": "Inconel 718",
            "liquidus_K": 1609.0,
            "solidus_K": 1533.0,
        }
        self.dx = 20e-6

    def test_single_track_behavior(self):
        # 3D grid
        nxy, nz = 21, 10
        axis = (np.arange(nxy) - 10) * self.dx
        z = (np.arange(nz) - 5) * self.dx  # z < 0 is substrate, z >= 0 is layer
        xx, yy, zz = np.meshgrid(axis, axis, z, indexing="ij")
        coords = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        settings = {"tracks": 1, "layers": 1, "hatch_um": 100.0, "layer_um": 40.0, "trackLength_um": 200.0}

        tracker = FieldOverlapTracker(coords, self.dx, self.material, settings)
        # Melt a central pool of radius 40 um centered at (0, 0, 0)
        r = np.sqrt(coords[:, 0]**2 + coords[:, 1]**2 + (coords[:, 2] - 20e-6)**2)
        T = np.where(r <= 40e-6, 1700.0, 300.0)

        tracker.observe(T, surface=40e-6, active_layer=0, active_track=0)
        metrics = tracker.finish()

        self.assertEqual(metrics["modelId"], OVERLAP_MODEL_ID)
        self.assertEqual(metrics["scope"], "single-track")
        self.assertIsNone(metrics["trackOverlapRatio"])
        self.assertFalse(metrics["hasInterTrackGap"])
        self.assertGreater(metrics["totalMeltVolume_um3"], 0)
        self.assertGreater(metrics["interLayerPenetrationDepth_um"], 0)

    def test_overlapping_tracks(self):
        # 2 tracks along x, separated along y by 40 um (hatch = 40 um, width = 80 um -> overlap)
        nxy, nz = 31, 10
        axis = (np.arange(nxy) - 15) * self.dx
        z = (np.arange(nz) - 3) * self.dx
        xx, yy, zz = np.meshgrid(axis, axis, z, indexing="ij")
        coords = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        hatch_um = 40.0
        settings = {"tracks": 2, "layers": 1, "hatch_um": hatch_um, "layer_um": 40.0, "trackLength_um": 300.0}

        tracker = FieldOverlapTracker(coords, self.dx, self.material, settings)

        # Track 0 at y = -20 um
        # Track 1 at y = +20 um
        # Each track melts an envelope of width 80 um (radius 40 um in y)
        y0, y1 = -20e-6, 20e-6
        # Track 0
        dist0 = np.abs(coords[:, 1] - y0)
        T0 = np.where((dist0 <= 40e-6) & (coords[:, 2] >= -20e-6) & (coords[:, 2] <= 40e-6), 1700.0, 300.0)
        tracker.observe(T0, surface=40e-6, active_layer=0, active_track=0)

        # Track 1
        dist1 = np.abs(coords[:, 1] - y1)
        T1 = np.where((dist1 <= 40e-6) & (coords[:, 2] >= -20e-6) & (coords[:, 2] <= 40e-6), 1700.0, 300.0)
        tracker.observe(T1, surface=40e-6, active_layer=0, active_track=1)

        metrics = tracker.finish()

        self.assertEqual(metrics["scope"], "multi-track-field")
        self.assertIsNotNone(metrics["trackOverlapRatio"])
        self.assertGreater(metrics["trackOverlapRatio"], 0.2)
        self.assertFalse(metrics["hasInterTrackGap"])
        self.assertEqual(metrics["interTrackGapVolume_um3"], 0.0)
        self.assertEqual(metrics["status"], "fused-inter-track")

    def test_separated_tracks_lack_of_fusion(self):
        # 2 tracks with large hatch (160 um), but melt pool width is only 60 um -> gap!
        nxy, nz = 31, 10
        axis = (np.arange(nxy) - 15) * self.dx
        z = (np.arange(nz) - 3) * self.dx
        xx, yy, zz = np.meshgrid(axis, axis, z, indexing="ij")
        coords = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        hatch_um = 160.0
        settings = {"tracks": 2, "layers": 1, "hatch_um": hatch_um, "layer_um": 40.0, "trackLength_um": 300.0}

        tracker = FieldOverlapTracker(coords, self.dx, self.material, settings)

        y0, y1 = -80e-6, 80e-6
        # Narrow melt pool of radius 25 um
        dist0 = np.abs(coords[:, 1] - y0)
        T0 = np.where((dist0 <= 25e-6) & (coords[:, 2] >= 0) & (coords[:, 2] <= 40e-6), 1700.0, 300.0)
        tracker.observe(T0, surface=40e-6, active_layer=0, active_track=0)

        dist1 = np.abs(coords[:, 1] - y1)
        T1 = np.where((dist1 <= 25e-6) & (coords[:, 2] >= 0) & (coords[:, 2] <= 40e-6), 1700.0, 300.0)
        tracker.observe(T1, surface=40e-6, active_layer=0, active_track=1)

        metrics = tracker.finish()

        self.assertEqual(metrics["scope"], "multi-track-field")
        self.assertEqual(metrics["trackOverlapRatio"], 0.0)
        self.assertTrue(metrics["hasInterTrackGap"])
        self.assertTrue(metrics["interTrackLackOfFusion"])
        self.assertGreater(metrics["interTrackGapVolume_um3"], 0.0)
        self.assertEqual(metrics["status"], "lack-of-fusion-gap")

    def test_rotated_tracks(self):
        # 45-degree rotated tracks
        nxy, nz = 41, 10
        axis = (np.arange(nxy) - 20) * self.dx
        z = (np.arange(nz) - 3) * self.dx
        xx, yy, zz = np.meshgrid(axis, axis, z, indexing="ij")
        coords = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        hatch_um = 40.0
        settings = {
            "tracks": 2, "layers": 1, "hatch_um": hatch_um,
            "layer_um": 40.0, "trackLength_um": 300.0, "scanAngle_deg": 45.0
        }
        tracker = FieldOverlapTracker(coords, self.dx, self.material, settings)

        # In 45 deg frame:
        # u = (x + y)/sqrt(2), v = (-x + y)/sqrt(2)
        # Track 0 at v = -20 um, Track 1 at v = +20 um
        v = (-coords[:, 0] + coords[:, 1]) / math.sqrt(2.0)
        u = (coords[:, 0] + coords[:, 1]) / math.sqrt(2.0)

        # Track 0
        T0 = np.where(
            (np.abs(v - (-20e-6)) <= 35e-6) & (np.abs(u) <= 150e-6) &
            (coords[:, 2] >= 0) & (coords[:, 2] < 40e-6),
            1700.0, 300.0
        )
        tracker.observe(T0, surface=40e-6, active_layer=0, active_track=0)

        # Track 1
        T1 = np.where(
            (np.abs(v - (20e-6)) <= 35e-6) & (np.abs(u) <= 150e-6) &
            (coords[:, 2] >= 0) & (coords[:, 2] < 40e-6),
            1700.0, 300.0
        )
        tracker.observe(T1, surface=40e-6, active_layer=0, active_track=1)

        metrics = tracker.finish()
        self.assertEqual(metrics["scope"], "multi-track-field")
        self.assertGreater(metrics["trackOverlapRatio"], 0.1)
        self.assertFalse(metrics["hasInterTrackGap"])
        self.assertEqual(metrics["status"], "fused-inter-track")

    def test_remelting_cycles(self):
        # Test remelting accumulation
        nxy, nz = 11, 5
        axis = (np.arange(nxy) - 5) * self.dx
        z = (np.arange(nz) - 2) * self.dx
        xx, yy, zz = np.meshgrid(axis, axis, z, indexing="ij")
        coords = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        settings = {"tracks": 1, "layers": 1, "hatch_um": 50.0, "layer_um": 40.0, "trackLength_um": 100.0}
        tracker = FieldOverlapTracker(coords, self.dx, self.material, settings)

        # Step 1: Melt center
        T1 = np.where((np.abs(coords[:, 0]) <= 20e-6) & (np.abs(coords[:, 1]) <= 20e-6), 1700.0, 300.0)
        tracker.observe(T1, surface=40e-6, active_layer=0, active_track=0)

        # Step 2: Cool down below solidus
        T2 = np.full(len(coords), 300.0)
        tracker.observe(T2, surface=40e-6, active_layer=0, active_track=0)

        # Step 3: Reheat and melt again -> remelting!
        tracker.observe(T1, surface=40e-6, active_layer=0, active_track=0)

        metrics = tracker.finish()
        self.assertGreater(metrics["totalRemeltVolume_um3"], 0)
        self.assertAlmostEqual(metrics["globalRemeltRatio"], 1.0)

    @unittest.skipUnless(os.name != "nt" and capabilities()["openfoamThermal"], "Requires compiled OpenFOAM 14 worker")
    def test_openfoam_field_overlap_parity(self):
        from lpbf_openfoam import thermal
        case = dict(mode="standard", backend="reference", power_W=40, mesh_um=40, trackLength_um=200,
                    cooling_s=.0001, dwell_s=0.00002, tracks=2, layers=1, hatch_um=40)
        p, m = validate(case)
        ref = transient(p, m)
        foam = thermal(p, m)
        self.assertIn("fieldOverlapDiagnostics", ref)
        self.assertIn("fieldOverlapDiagnostics", foam)
        r_diag = ref["fieldOverlapDiagnostics"]
        f_diag = foam["fieldOverlapDiagnostics"]
        self.assertEqual(r_diag["scope"], f_diag["scope"])
        self.assertEqual(r_diag["hasInterTrackGap"], f_diag["hasInterTrackGap"])
        self.assertEqual(r_diag["interTrackLackOfFusion"], f_diag["interTrackLackOfFusion"])
        self.assertAlmostEqual(r_diag["trackOverlapRatio"], f_diag["trackOverlapRatio"], places=1)

    @unittest.skipIf(os.name == 'nt', 'OpenFOAM dispatch is Linux-only')
    def test_previous_overlap_extraction_binary_rejected(self):
        import io
        import tempfile
        from pathlib import Path
        from types import SimpleNamespace
        from unittest.mock import patch
        from lpbf_openfoam import thermal
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)/'openfoam-case'; folder.mkdir()
            def launch(*args, **kwargs):
                (folder/'numerical-diagnostics.json').write_text(
                    '{"sourceIntegration":"cell-integrated-gaussian-gl2-v1",'
                    '"solidificationExtraction":"linear-liquidus-crossing-v1",'
                    '"meltPoolExtraction":"accepted-step-molten-volume-v1"}')
                return SimpleNamespace(stdout=io.StringIO(''), wait=lambda: 0)
            with patch('lpbf_openfoam.BINARY', Path(__file__)), patch('lpbf_openfoam.generate_case', return_value=(1., [])), patch('lpbf_openfoam.subprocess.Popen', side_effect=launch):
                with self.assertRaisesRegex(ValueError, 'overlap extraction contract mismatch'):
                    thermal({}, {}, artifact_dir=tmp)


if __name__ == "__main__":
    unittest.main()

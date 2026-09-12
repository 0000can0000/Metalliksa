"""Numerical verification only. Synthetic fixtures are never experimental truth."""
import copy
import json
import math
import os
from pathlib import Path
import tempfile
import time
import unittest
import numpy as np
from lpbf_material_registry import catalog, material, enthalpy_table
from lpbf_simulation import validate, run, transient, scan_segments, fingerprint
from lpbf_verification import compare, convergence
from lpbf_worker import Queue, capabilities

CASE = dict(mode="standard", backend="reference", power_W=40, mesh_um=40, trackLength_um=200,
            cooling_s=.0001, dwell_s=0)


class Verification(unittest.TestCase):
    def test_invalid_process(self):
        for patch in ({"power_W": float("nan")}, {"speed_mm_s": -1}, {"tracks": 1.5},
                      {"mesh_um": True}, {"mode": "validated"}, {"backend": "evil;rm"},
                      {"absorptivity": 2}, {"material": "unknown"}, {"preheat_C": 1200, "material": "AlSi10Mg"},
                      {"mode": "calibration"}, {"injected": "command"}):
            with self.subTest(patch=patch), self.assertRaises(ValueError): validate(patch)

    def test_catalog_and_missing_data(self):
        self.assertEqual(len(catalog()), 15)
        for item in catalog():
            if item["available"]:
                m = material(item["name"])
                self.assertEqual(m["quality"], "estimated")
            else:
                with self.assertRaises(ValueError): material(item["name"])

    def test_supplied_data_for_additional_alloy(self):
        # Synthetic table exercises schema only; explicitly marked synthetic source.
        supplied = material("Inconel 718")
        supplied["source"] = "Synthetic unit-test table, NOT measured IN625 properties"
        p, m = validate({"material": "Inconel 625", "properties": supplied})
        self.assertEqual(m["name"], "Inconel 625")
        self.assertEqual(m["quality"], "user-supplied-unverified")
        bad = copy.deepcopy(supplied); bad["table"][1][2] = -5
        with self.assertRaises(ValueError): material("Inconel 625", bad)

    def test_enthalpy_latent_heat_and_inverse(self):
        m = material("Inconel 718"); t, h = enthalpy_table(m)
        self.assertTrue((np.diff(h) > 0).all())
        energy = np.interp(m["liquidus_K"], t, h)-np.interp(m["solidus_K"], t, h)
        self.assertGreater(energy, m["latentHeat_J_kg"])
        for temperature in (353.15, m["solidus_K"], m["liquidus_K"], 2000):
            self.assertAlmostEqual(float(np.interp(np.interp(temperature, t, h), h, t)), temperature, places=8)

    def test_energy_and_physical_bounds(self):
        p, m = validate(CASE); r = transient(p, m)
        self.assertLess(r["energyBalance"]["relativeError"], 1e-10)
        expected = p["power_W"]*m["absorptivity"]*(p["trackLength_um"]*1e-6)/(p["speed_mm_s"]*.001)
        self.assertAlmostEqual(r["energyBalance"]["input_J"], expected, places=10)
        self.assertLess(r["metrics"]["peakTemperature_K"], m["boiling_K"])
        self.assertGreater(r["metrics"]["volume_um3"], 0)
        self.assertIsNone(r["metrics"]["keyholeDepth_um"])
        self.assertIsNone(r["metrics"]["recoilPressure_Pa"])
        self.assertGreater(r["metrics"]["coolingRate_K_s"], 0)
        json.dumps(r, allow_nan=False)

    def test_boil_is_failure_not_clipping(self):
        p, m = validate({**CASE, "power_W": 1000})
        with self.assertRaisesRegex(ValueError, "validity"): transient(p, m)

    def test_no_source_conservation_operator(self):
        # Zero power is used only internally to verify equilibrium, not accepted by public API.
        p, m = validate(CASE); p["power_W"] = 0
        r = transient(p, m)
        self.assertEqual(r["energyBalance"]["stored_J"], 0)
        self.assertAlmostEqual(r["metrics"]["peakTemperature_K"], p["preheat_C"]+273.15)

    def test_scan_rotation_and_dwell(self):
        p, _ = validate({"tracks": 2, "layers": 2, "layerRotation_deg": 90})
        scans, end = scan_segments(p)
        self.assertEqual(len(scans), 4)
        self.assertGreater(scans[1]["start_s"], scans[0]["end_s"])
        self.assertGreater(scans[0]["end"][0], scans[0]["start"][0])
        self.assertLess(scans[1]["end"][0], scans[1]["start"][0])
        self.assertAlmostEqual(scans[2]["end"][0], scans[2]["start"][0])

    def test_multiple_tracks_layers_energy(self):
        p, m = validate({**CASE, "power_W": 10, "tracks": 2, "layers": 2, "dwell_s": .00002})
        r = transient(p, m)
        duration = p["trackLength_um"]*1e-6/(p["speed_mm_s"]*.001)*4
        self.assertAlmostEqual(r["energyBalance"]["input_J"], p["power_W"]*m["absorptivity"]*duration, places=9)
        self.assertLess(r["energyBalance"]["relativeError"], 1e-10)
        self.assertEqual(len(r["scanPath"]), 4)

    def test_three_mesh_study_is_not_validation(self):
        r = run({**CASE, "power_W": 10, "study": "mesh"})
        self.assertEqual(len(r["convergenceStudy"]["results"]), 3)
        self.assertEqual(r["convergenceStudy"]["checks"]["width_um"]["status"], "inconclusive")
        self.assertEqual(r["validationStatus"], "unvalidated")

    def test_measurement_statistics(self):
        r = compare([110., 90.], [100., 100.])
        self.assertEqual(r["rmse_um"], 10)
        self.assertEqual(r["bias_um"], 0)
        self.assertAlmostEqual(r["calibrationFactor"], 20000/20200)
        self.assertIsNone(compare([0.], [100.])["calibrationFactor"])
        self.assertEqual(compare([0.], [100.])["errors_pct"], [-100.])
        for x in (-1, True, float("inf")):
            with self.assertRaises(ValueError): compare([x], [100.])

    def test_convergence_known_second_order(self):
        r = convergence([1.16, 1.04, 1.01], [.4, .2, .1])
        self.assertAlmostEqual(r["observedOrder"], 2)
        self.assertEqual(convergence([1, 1, 1], [4, 2, 1])["status"], "inconclusive")
        self.assertEqual(convergence([1, 2, 1], [4, 2, 1])["status"], "inconclusive")

    def test_fallback_is_honest(self):
        r = run({"mode": "high-fidelity"})
        self.assertEqual(r["label"], "Screening only")
        self.assertEqual(r["effectiveMode"], "screening")
        self.assertFalse(r["productionReady"])
        self.assertEqual(r["validationStatus"], "unvalidated")
        self.assertNotIn("thermalHistory", r)

    def test_cache_key_and_queue_cancel(self):
        p, m = validate(CASE)
        self.assertEqual(fingerprint(p, m), fingerprint(dict(reversed(list(p.items()))), m))
        q = {**p, "maxDt_s": p["maxDt_s"]*.5}
        self.assertNotEqual(fingerprint(p, m), fingerprint(q, m))
        test_root = Path(__file__).resolve().parents[1]/".lpbf-jobs"
        test_root.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=test_root) as tmp:
            queue = Queue(tmp, start=False)
            first = queue.submit(CASE); second = queue.submit(CASE)
            self.assertEqual(first["id"], second["id"]); self.assertTrue(second["cacheHit"])
            self.assertEqual(queue.cancel(first["id"])["status"], "cancelled")
            third = queue.submit(CASE); self.assertNotEqual(third["id"], first["id"])
            queue.update(third["id"], status="running")
            restarted = Queue(tmp, start=False)
            self.assertEqual(restarted.get(third["id"])["status"], "failed")

    @unittest.skipUnless(os.name != "nt" and capabilities()["openfoamThermal"], "Requires compiled OpenFOAM 14 worker")
    def test_openfoam_against_independent_reference(self):
        from lpbf_openfoam import thermal
        p, m = validate(CASE)
        a, b = transient(p, m), thermal(p, m)
        self.assertLess(b["energyBalance"]["relativeError"], 1e-10)
        for key in ("length_um", "width_um", "depth_um", "volume_um3"):
            self.assertAlmostEqual(a["metrics"][key]/b["metrics"][key], 1., places=8)
        self.assertLess(abs(a["metrics"]["peakTemperature_K"]-b["metrics"]["peakTemperature_K"])/a["metrics"]["peakTemperature_K"], .01)
        self.assertGreater(b["metrics"]["coolingRate_K_s"], 0)
        p.update(power_W=10, tracks=2, layers=2, dwell_s=.00002)
        multi = thermal(p, m)
        duration = p["trackLength_um"]*1e-6/(p["speed_mm_s"]*.001)*4
        self.assertAlmostEqual(multi["energyBalance"]["input_J"], p["power_W"]*m["absorptivity"]*duration, places=9)


if __name__ == "__main__": unittest.main(verbosity=2)

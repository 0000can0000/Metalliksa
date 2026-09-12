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
        bad = copy.deepcopy(supplied); bad["table"][1][2] = True
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
            self.assertEqual(first["id"], second["id"]); self.assertTrue(second["deduplicated"]); self.assertFalse(second["cacheHit"])
            self.assertEqual(queue.cancel(first["id"])["status"], "cancelled")
            queue.finish_running(first["id"], status="timed_out", error="Racing timeout fixture")
            self.assertEqual(queue.get(first["id"])["status"], "cancelled")
            third = queue.submit(CASE); self.assertNotEqual(third["id"], first["id"])
            queue.update(third["id"], status="running")
            restarted = Queue(tmp, start=False)
            self.assertEqual(restarted.get(third["id"])["status"], "failed")

    def test_nested_schema_and_measurement_evidence(self):
        from lpbf_evidence import PROCESS_KEYS
        p, _ = validate(CASE)
        row = dict(width_um=50., depth_um=45., source="Synthetic schema fixture")
        for patch in ({"measurements": {}}, {"measurements": [dict(row, width_um=True)]},
                      {"measurements": [dict(row, unknown=1)]}, {"emissivity": float("inf")}):
            with self.assertRaises(ValueError): validate({**CASE, **patch})
        vector = {k:p[k] for k in PROCESS_KEYS}
        matched = dict(row, processVector=vector, uncertainty_um=dict(width_um=2., depth_um=3.), independentHoldout=False)
        r = run({**CASE, "measurements": [matched]})
        self.assertEqual(r["measurementEvidence"][0]["sameProcessVector"], "matched")
        self.assertIsNotNone(r["measurementComparison"]["width_um"]["calibrationFactor"])
        unmatched = run({**CASE, "measurements": [row]})
        self.assertIsNone(unmatched["measurementComparison"]["width_um"]["calibrationFactor"])
        matched["processVector"]["power_W"] += 1
        with self.assertRaisesRegex(ValueError,"does not match"): validate({**CASE,"measurements":[matched]})

    def test_mass_and_phase_partition_with_deposition(self):
        p,m = validate({**CASE,"power_W":10,"layers":2,"layer_um":30,"mesh_um":20})
        r = transient(p,m)
        self.assertGreater(r["massBalance"]["deposited_kg"],0)
        self.assertLess(r["massBalance"]["relativeError"],1e-12)
        a = r["phaseAudit"]
        self.assertAlmostEqual((a["liquidVolume_m3"]+a["solidVolume_m3"])/a["activeVolume_m3"],1.)
        self.assertTrue(0 <= a["minFraction"] <= a["maxFraction"] <= 1)
        self.assertIsNone(a["interfaceConservation"])

    def test_artifact_manifest_and_corrupt_cache(self):
        import hashlib
        with tempfile.TemporaryDirectory() as tmp:
            q = Queue(tmp,start=False)
            job = q.submit(CASE); folder = Path(tmp)/job["id"]
            r = run(CASE,artifact_dir=folder)
            self.assertTrue(any(a["path"] == "thermal-history.csv" for a in r["artifacts"]))
            for a in r["artifacts"]:
                self.assertEqual(hashlib.sha256((folder/a["path"]).read_bytes()).hexdigest(),a["sha256"])
            (folder/"result.json").write_text(json.dumps(r))
            q.update(job["id"],status="completed")
            self.assertTrue(q.submit(CASE)["cacheHit"])
            (folder/"thermal-history.csv").write_text("corrupted")
            self.assertNotEqual(q.submit(CASE)["id"],job["id"])

    def test_source_depth_independent_of_mesh(self):
        from lpbf_openfoam import generate_case
        for mesh in (20,40,60):
            p,m = validate({**CASE,"mesh_um":mesh,"layer_um":30})
            with tempfile.TemporaryDirectory() as tmp:
                generate_case(p,m,tmp)
                values = (Path(tmp)/"thermalInput.dat").read_text().splitlines()[0].split()
                self.assertAlmostEqual(float(values[8]),30e-6)

    def test_manufactured_conduction_second_order(self):
        from lpbf_simulation import conduction_rate
        errors = []
        for n in (12,24,48):
            dx = 1./n
            x,y,z = np.meshgrid(*[(np.arange(n)+.5)*dx]*3,indexing="ij")
            T = 300+np.sin(np.pi*x)*np.sin(np.pi*y)*np.sin(np.pi*z)
            rates = conduction_rate(T,np.full(T.shape,2.),np.ones(T.shape,bool),dx)
            exact = -6*np.pi**2*(T-300)
            errors.append(float(np.sqrt(np.mean((rates[1:-1,1:-1,1:-1]-exact[1:-1,1:-1,1:-1])**2))))
            self.assertLess(abs(float(rates.sum())),1e-8)
        self.assertGreater(errors[0]/errors[1],3.5)
        self.assertGreater(errors[1]/errors[2],3.5)

    def test_exact_latent_heat_integral(self):
        m = material("Inconel 718"); t,h = enthalpy_table(m)
        from lpbf_material_registry import property_at
        mask = (t>=m["solidus_K"]) & (t<=m["liquidus_K"])
        cp = property_at(m,t[mask],3)
        sensible = float(np.sum(np.diff(t[mask])*(cp[:-1]+cp[1:])/2))
        total = float(h[mask][-1]-h[mask][0])
        self.assertAlmostEqual(total-sensible,m["latentHeat_J_kg"],places=6)

    def test_stripe_and_island_timing(self):
        for strategy in ("stripe","island"):
            p,m = validate({**CASE,"strategy":strategy,"tracks":3,"layers":2,"islandSize_um":100,"scanAngle_deg":35})
            scans,end = scan_segments(p)
            length = sum(np.linalg.norm(np.array(s["end"])-s["start"]) for s in scans)
            self.assertAlmostEqual(length, p["trackLength_um"]*1e-6*6)
            for a,b in zip(scans,scans[1:]): self.assertAlmostEqual(b["start_s"]-a["end_s"],p["dwell_s"])
            self.assertAlmostEqual(end,length/(p["speed_mm_s"]*.001)+len(scans)*p["dwell_s"]+p["cooling_s"])
            self.assertEqual({s["track"] for s in scans},{0,1,2})
            if strategy == "island": self.assertEqual(len(scans),12)

    def test_unresolved_layer_rejected(self):
        from lpbf_openfoam import generate_case
        p,m = validate({**CASE,"layer_um":30,"layers":2})
        with self.assertRaisesRegex(ValueError,"each powder layer"): transient(p,m)
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError,"each powder layer"): generate_case(p,m,tmp)

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
        for key in ("thermalGradient_K_m", "solidificationRate_m_s", "coolingRate_K_s"):
            self.assertLess(abs(a["metrics"][key]/b["metrics"][key]-1), .01, key)
        # Misaligned layer surface previously applied radiative losses to multiple cell planes.
        p.update(power_W=10, tracks=2, layers=2, layer_um=45, dwell_s=.00002)
        multi = thermal(p, m)
        ref_multi = transient(p,m)
        self.assertLess(abs(multi["energyBalance"]["losses_J"]-ref_multi["energyBalance"]["losses_J"])/max(ref_multi["energyBalance"]["losses_J"],1e-12),.02)
        duration = p["trackLength_um"]*1e-6/(p["speed_mm_s"]*.001)*4
        self.assertAlmostEqual(multi["energyBalance"]["input_J"], p["power_W"]*m["absorptivity"]*duration, places=9)
        p.update(strategy="island",islandSize_um=100,tracks=2,layers=1,layer_um=40)
        island = thermal(p,m)
        reference = transient(p,m)
        self.assertAlmostEqual(island["energyBalance"]["input_J"],reference["energyBalance"]["input_J"],places=10)
        self.assertLess(abs(island["metrics"]["peakTemperature_K"]-reference["metrics"]["peakTemperature_K"])/reference["metrics"]["peakTemperature_K"],.02)


if __name__ == "__main__": unittest.main(verbosity=2)

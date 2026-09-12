"""Opt-in integration tests against a locally running Metalliksa server."""
import json
import os
import time
import urllib.request
import urllib.error
import unittest

URL = os.environ.get("METALLIKSA_TEST_URL", "http://localhost:3000/api/lpbf")


def request(path, data=None, method="GET"):
    req = urllib.request.Request(URL+path, data=json.dumps(data).encode() if data is not None else None,
                                 method=method, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def finish(job, seconds=60):
    end = time.monotonic()+seconds
    while time.monotonic() < end:
        current = request("/jobs/"+job["id"])
        if current["status"] not in ("queued", "running"):
            return current
        time.sleep(.2)
    raise AssertionError("Job did not finish within test budget")


class Api(unittest.TestCase):
    def test_invalid_request(self):
        with self.assertRaises(urllib.error.HTTPError) as e:
            request("/jobs", {"power_W": -5}, "POST")
        self.assertEqual(e.exception.code, 400)
        e.exception.close()

    def test_real_openfoam_and_cache(self):
        caps = request("/capabilities")
        self.assertTrue(caps["openfoamThermal"])
        payload = dict(mode="standard", power_W=40, mesh_um=40, trackLength_um=200, cooling_s=.0001, dwell_s=0)
        job = request("/jobs", payload, "POST")
        done = finish(job)
        self.assertEqual(done["status"], "completed", done.get("error"))
        self.assertIn("OpenFOAM14", done["result"]["solver"]["id"])
        self.assertLess(done["result"]["energyBalance"]["relativeError"], 1e-10)
        self.assertLess(done["result"]["massBalance"]["relativeError"], 1e-12)
        self.assertEqual(done["result"]["fieldPreviews"], ["temperature-slice.svg", "phase-slice.svg"])
        for name in ("temperature-slice.svg", "phase-slice.svg", "thermal-history.csv"):
            with urllib.request.urlopen(URL+"/jobs/"+job["id"]+"/artifacts/"+name) as res:
                body = res.read()
                self.assertGreater(len(body), 50)
                if name.endswith(".svg"): self.assertIn(b"Resolved thermal field", body)
        with self.assertRaises(urllib.error.HTTPError) as denied:
            urllib.request.urlopen(URL+"/jobs/"+job["id"]+"/artifacts/input.json")
        self.assertEqual(denied.exception.code,400); denied.exception.close()
        again = request("/jobs", payload, "POST")
        self.assertEqual(again["id"], job["id"]); self.assertTrue(again["cacheHit"])

    def test_fallback_and_cancel(self):
        done = finish(request("/jobs", {"mode": "high-fidelity"}, "POST"))
        self.assertEqual(done["result"]["label"], "Screening only")
        long = request("/jobs", dict(mode="standard", power_W=10, mesh_um=20, cooling_s=.1, maxDt_s=1e-9), "POST")
        end = time.monotonic()+20
        while time.monotonic() < end:
            current = request("/jobs/"+long["id"])
            if current["status"] == "running" and current["log"]: break
            time.sleep(.2)
        self.assertEqual(current["status"], "running")
        self.assertTrue(current["log"])
        cancelled = request("/jobs/"+long["id"], method="DELETE")
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertEqual(finish(long)["status"], "cancelled")

    def test_timeout(self):
        long = request("/jobs", dict(mode="standard", backend="reference", power_W=10, mesh_um=20,
                                     cooling_s=.1, maxDt_s=1e-9, timeout_s=10), "POST")
        self.assertEqual(finish(long, 30)["status"], "timed_out")

    def test_timestep_study_and_calibration(self):
        p = dict(mode="calibration", backend="reference", power_W=40, mesh_um=40, trackLength_um=200,
                 cooling_s=.0001, dwell_s=0, maxDt_s=1e-7, study="timestep",
                 measurements=[dict(width_um=50., depth_um=45., source="Synthetic API fixture; NOT experimental evidence")])
        done = finish(request("/jobs", p, "POST"))
        self.assertEqual(done["status"], "completed", done.get("error"))
        r = done["result"]
        self.assertEqual(r["validationStatus"], "unvalidated")
        self.assertEqual(len(r["convergenceStudy"]["results"]), 3)
        self.assertIn("calibrationFactor", r["measurementComparison"]["width_um"])
        self.assertIsNone(r["measurementComparison"]["width_um"]["calibrationFactor"])

    def test_preflight_and_nested_contract(self):
        p = dict(mode="standard", power_W=40, mesh_um=40, trackLength_um=200)
        estimate = request("/estimate",p,"POST")
        self.assertEqual(estimate["cells"],1089)
        self.assertGreater(estimate["minimumEstimatedSteps"],0)
        for bad in ({"measurements":{}},{"unexpected":1},{"power_W":float("nan")},
                    {"properties":{"source":"source string is not validation","unknown":1}}):
            with self.assertRaises(urllib.error.HTTPError) as error:
                request("/jobs",{**p,**bad},"POST")
            self.assertEqual(error.exception.code,400); error.exception.close()


if __name__ == "__main__": unittest.main(verbosity=2)

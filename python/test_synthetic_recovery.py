"""Synthetic recovery is numerical evidence, not experimental qualification."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

import cnls_fitting_solver as solver


class SyntheticRecoveryTests(unittest.TestCase):
    def summary(self, truth, report):
        self.assertTrue(callable(getattr(solver, "summarize_synthetic_recovery", None)),
                        "Synthetic recovery must have an explicit missing-data contract")
        return solver.summarize_synthetic_recovery(truth, report)

    def test_missing_parameter_is_not_perfect_recovery(self):
        result = self.summary([dict(elementId="R", field="value", value=20)], {})
        row = result["parameterErrors"][0]
        for key in ("recoveredValue", "stdError", "absError", "pctError", "isReliable"):
            self.assertIsNone(row[key], key)
        for key in ("meanAbsolutePctError", "maxAbsolutePctError", "robustnessScore",
                    "robustnessGrade", "rSquared", "converged", "iterations", "computeTimeMs"):
            self.assertIsNone(result[key], key)

    def test_actual_error_and_null_uncertainty_survive(self):
        result = self.summary([dict(elementId="R", field="value", value=20)],
                              dict(parameters=[dict(elementId="R", field="value", fittedValue=22,
                                                    stdError=None)], rSquared=-2, converged=False,
                                   iterations=0, computeTimeMs=0, rmse=0, reducedChiSquare=0))
        self.assertEqual(result["meanAbsolutePctError"], 10)
        self.assertEqual(result["parameterErrors"][0]["absError"], 2)
        self.assertIsNone(result["parameterErrors"][0]["stdError"])
        self.assertIsNone(result["parameterErrors"][0]["isReliable"])
        self.assertEqual(result["rSquared"], -2)
        self.assertEqual(result["computeTimeMs"], 0)
        self.assertFalse(result["converged"])

    def test_zero_truth_and_partial_recovery_do_not_produce_aggregate_score(self):
        result = self.summary([dict(elementId="R", field="value", value=0),
                               dict(elementId="C", field="value", value=2)],
                              dict(parameters=[dict(elementId="R", field="value", fittedValue=1)]))
        self.assertEqual(result["parameterErrors"][0]["absError"], 1)
        self.assertIsNone(result["parameterErrors"][0]["pctError"])
        self.assertIsNone(result["meanAbsolutePctError"])
        self.assertIsNone(result["maxAbsolutePctError"])

    def test_constant_magnitude_benchmark_returns_json_with_unavailable_r_squared(self):
        payload = dict(action="synthetic_noise_benchmark",
                       topology=dict(branches=[dict(connection="series", elements=[
                           dict(id="R", name="R", type="R", value=20)])]),
                       noiseConfig=dict(whiteNoisePct=0, noiseFloorOhm=0, phaseJitterDeg=0,
                                        randomSeed=42),
                       frequencyConfig=dict(fMin=1, fMax=10, pointsPerDecade=2),
                       maxGenerations=1, populationSize=5, polishLM=True)
        proc = subprocess.run([sys.executable, str(Path(solver.__file__))],
                              input=json.dumps(payload), text=True, capture_output=True, timeout=30)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        result = json.loads(proc.stdout)
        self.assertTrue(result["success"])
        self.assertIsNone(result["rSquared"])
        self.assertIsNone(result["robustnessScore"])
        self.assertEqual(len(result["syntheticPoints"]), len(result["fitReport"]["residuals"]))
        json.dumps(result, allow_nan=False)


if __name__ == "__main__":
    unittest.main()

"""Analytic fixtures: numerical verification, not experimental validation."""
import math
import unittest
from unittest.mock import patch

import cnls_fitting_solver as solver


def parameter(name, value, lower=1e-9, upper=1e5, fixed=False):
    return dict(paramName=name, elementId=name, field="value", value=value,
                min=lower, max=upper, isFixed=fixed, paramType="Resistor", unit="Ohm")


RESISTOR = {"branches": [{"connection": "series", "elements": [
    {"id": "R", "name": "R", "type": "R", "value": 2.0}]}]}


def resistor_points():
    return [dict(frequency=10.0 ** (i / 4), zReal=20.0, minusZImag=0.0) for i in range(20)]


class CNLSNumericsTests(unittest.TestCase):
    def test_resistor_moves_toward_known_value_in_both_backends(self):
        for numpy in (False, True):
            with self.subTest(numpy=numpy), patch.object(solver, "HAS_NUMPY", numpy):
                report = solver.run_cnls_fit(RESISTOR, resistor_points(), [parameter("R", 2)], "unit")
                self.assertAlmostEqual(report["parameters"][0]["fittedValue"], 20, delta=1e-6)
                self.assertLess(report["reducedChiSquare"], 1e-12)

    def test_randles_recovers_three_known_parameters(self):
        # Independent closed form: Rs + Rct / (1 + j*w*Rct*Cdl).
        points = []
        for i in range(60):
            f = 10 ** (-1 + 6 * i / 59)
            z = 5 + 120 / (1 + 1j * 2 * math.pi * f * 120 * 2e-5)
            points.append(dict(frequency=f, zReal=z.real, minusZImag=-z.imag))
        params = [parameter("Rs", 12), parameter("Rct", 60), parameter("Cdl", 7e-5, 1e-9, 0.1)]
        report = solver.run_cnls_fit("standard_randles", points, params, "modulus", max_iter=150)
        for p, expected in zip(report["parameters"], (5, 120, 2e-5)):
            self.assertAlmostEqual(p["fittedValue"] / expected, 1, delta=1e-5)
        self.assertLess(report["reducedChiSquare"], 1e-12)


if __name__ == "__main__":
    unittest.main(verbosity=2)

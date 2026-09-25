"""Goldak total-power contract: manufactured normalization, not validation."""
import unittest

from goldak_solver import GoldakField, goldak_fractions, goldak_q_parameter_W


class GoldakPowerNormalization(unittest.TestCase):
    def test_asymmetric_lobes_integrate_to_requested_total_power(self):
        total_power_W = 100.0
        ff, fr = goldak_fractions(40e-6, 80e-6)
        q_parameter_W = goldak_q_parameter_W(total_power_W)

        # Each half-ellipsoid integrates to f_i * Q in the standard Goldak
        # equation, while f_f + f_r = 2.
        self.assertAlmostEqual(ff, 2.0 / 3.0)
        self.assertAlmostEqual(fr, 4.0 / 3.0)
        self.assertAlmostEqual(q_parameter_W, 50.0)
        self.assertAlmostEqual((ff + fr) * q_parameter_W, total_power_W)

    def test_field_interprets_input_as_physical_total_power(self):
        field = GoldakField(
            T0_C=25.0,
            Q_W=100.0,
            rho=8000.0,
            cp=500.0,
            alpha_th=1.0e-5,
            af_m=40e-6,
            ar_m=80e-6,
            b_m=40e-6,
            c_m=40e-6,
        )

        self.assertAlmostEqual(field.Q_W * (field.ff + field.fr), 100.0)


if __name__ == "__main__":
    unittest.main()

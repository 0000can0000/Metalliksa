import unittest

import numpy as np

from lpbf_transient_enthalpy_fdm import (
    TransientEnthalpyFDMSolver,
    _conduction_rate,
    _enthalpy_from_temperature,
    _temperature_from_enthalpy,
)


class TestTransientEnthalpyPhysics(unittest.TestCase):
    def test_enthalpy_inverse_is_continuous_at_phase_boundaries(self):
        rho, cp, latent = 4420.0, 526.0, 290000.0
        solidus, liquidus = 1878.0, 1928.0
        h_solidus = rho * cp * solidus
        h_liquidus = rho * (cp * liquidus + latent)
        h_midpoint = (h_solidus + h_liquidus) / 2
        result = _temperature_from_enthalpy(
            np.array([h_solidus, h_midpoint, h_liquidus]),
            rho, cp, latent, solidus, liquidus,
        )
        np.testing.assert_allclose(result, [solidus, (solidus + liquidus) / 2, liquidus])
        roundtrip = _temperature_from_enthalpy(
            _enthalpy_from_temperature(
                np.array([300.0, solidus, (solidus + liquidus) / 2, liquidus, 2100.0]),
                rho, cp, latent, solidus, liquidus,
            ), rho, cp, latent, solidus, liquidus,
        )
        np.testing.assert_allclose(roundtrip, [300.0, solidus, 1903.0, liquidus, 2100.0])

    def test_adiabatic_conduction_conserves_heat_without_wrapping(self):
        temperature = np.array([[900.0, 300.0], [300.0, 300.0]])
        rate = _conduction_rate(temperature, np.full_like(temperature, 20.0), 1e-5, 2e-5)
        self.assertLess(abs(float(rate.sum())) / float(np.abs(rate).sum()), 1e-14)
        self.assertLess(rate[0, 0], 0.0)
        self.assertGreater(rate[0, 1], 0.0)
        self.assertGreater(rate[1, 0], 0.0)
        self.assertEqual(rate[1, 1], 0.0)

    def test_screening_result_does_not_claim_physical_accuracy(self):
        result = TransientEnthalpyFDMSolver(nx=8, nz=5, dx=5e-6, dz=5e-6).solve_meltpool_cross_section(
            power_W=1.0, speed_m_s=0.8, T_preheat_K=300.0, rho=4420.0,
            cp=526.0, k_solid=20.0, k_liquid=25.0,
            latent_heat_J_kg=290000.0, T_solidus=1878.0,
            T_liquidus=1928.0, sim_time_s=1e-7, dt=1e-7,
        )
        self.assertFalse(result["is_physically_accurate"])
        self.assertEqual(result["model_scope"], "stationary-2d-cross-section-screening")

    def test_mushy_preheat_initializes_consistent_enthalpy(self):
        preheat = 1903.0
        result = TransientEnthalpyFDMSolver(nx=8, nz=5, dx=5e-6, dz=5e-6).solve_meltpool_cross_section(
            power_W=1e-6, speed_m_s=0.8, T_preheat_K=preheat, rho=4420.0,
            cp=526.0, k_solid=20.0, k_liquid=25.0,
            latent_heat_J_kg=290000.0, T_solidus=1878.0,
            T_liquidus=1928.0, sim_time_s=1e-12, dt=1e-12,
        )
        self.assertAlmostEqual(result["max_temperature_K"], preheat, delta=1e-4)


if __name__ == "__main__":
    unittest.main()

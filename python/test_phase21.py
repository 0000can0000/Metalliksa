import unittest
from lpbf_transient_enthalpy_fdm import TransientEnthalpyFDMSolver

class TestPhase21TransientFDM(unittest.TestCase):
    def test_latent_heat_meltpool(self):
        solver = TransientEnthalpyFDMSolver(nx=60, nz=30, dx=5e-6, dz=5e-6)
        res = solver.solve_meltpool_cross_section(
            power_W=200.0,
            speed_m_s=0.8,
            T_preheat_K=300.0,
            rho=4420.0,
            cp=526.0,
            k_solid=20.0,
            k_liquid=25.0,
            latent_heat_J_kg=290000.0,
            T_solidus=1878.0,
            T_liquidus=1928.0,
            sim_time_s=1e-4, # 100 microseconds
            dt=5e-7
        )
        self.assertTrue(res["latent_heat_accounted"])
        self.assertGreater(res["max_temperature_K"], 300.0)
        self.assertGreaterEqual(res["melt_pool_width_um"], 0.0)

if __name__ == "__main__":
    unittest.main()

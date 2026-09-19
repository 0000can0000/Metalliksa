import unittest
from lpbf_support_optimization import SupportStructureOptimizer

class TestPhase20SupportOptimization(unittest.TestCase):
    def setUp(self):
        # Ti-6Al-4V typical properties
        self.optimizer = SupportStructureOptimizer(
            E_modulus_Pa=110e9,
            cte_1_K=9e-6,
            yield_strength_Pa=830e6,
            thermal_k_W_mK=20.0,
            T_melt_K=1900.0,
            T_preheat_K=400.0
        )

    def test_thermal_requirement(self):
        # 250W laser, 5mm support length
        A_therm = self.optimizer.calculate_thermal_requirement(250.0, 5e-3)
        # q_req = 25W. dT = 1500K. A = (25 * 0.005) / (20 * 1500) = 4.16e-6 m^2 = 4.16 mm^2
        self.assertAlmostEqual(A_therm, 4.166666e-6, places=7)

    def test_mechanical_requirement(self):
        # 10x10mm layer = 1e-4 m^2
        A_mech = self.optimizer.calculate_mechanical_requirement(1e-4)
        # dT = 1500. shrink = 110e9 * 9e-6 * 1500 = 1.485e9 Pa
        # F = 1.485e9 * 1e-4 = 1.485e5 N
        # A_req = (1.485e5 * 1.5) / 830e6 = 2.68e-4 m^2 = 268 mm^2
        self.assertAlmostEqual(A_mech, 2.6837349e-4, places=7)

    def test_optimization_solver(self):
        res = self.optimizer.optimize_support_struts(
            heat_input_W=250.0,
            support_length_m=5e-3,
            layer_area_m2=1e-4,
            strut_diameter_m=0.5e-3 # 0.5mm struts
        )
        self.assertEqual(res["governing_constraint"], "Mechanical")
        self.assertGreater(res["recommended_strut_count"], 0)
        self.assertGreater(res["recommended_spacing_mm"], 0.0)

if __name__ == "__main__":
    unittest.main()

import unittest
from lpbf_thermomechanical import compute_inherent_strains, analyze_distortion
from lpbf_defect_diagnostics import defect_diagnostics

class TestPhase9(unittest.TestCase):
    def test_inherent_strain_computation(self):
        peak = 2000.0
        melt = 1673.15
        ambient = 298.15
        cte = 1.5e-5
        e_gpa = 110.0
        yield_mpa = 500.0
        
        strains = compute_inherent_strains(peak, melt, ambient, cte, e_gpa, yield_mpa)
        self.assertIn("exx", strains)
        self.assertIn("von_mises_mpa", strains)
        self.assertLessEqual(strains["von_mises_mpa"], yield_mpa)
        
        strains_zero = compute_inherent_strains(ambient, melt, ambient, cte, e_gpa, yield_mpa)
        self.assertEqual(strains_zero["exx"], 0.0)
        self.assertEqual(strains_zero["von_mises_mpa"], 0.0)

    def test_analyze_distortion_api(self):
        params = {"laserPower_W": 250, "scanSpeed_mms": 1000, "preheatTemp_C": 25}
        material = {"melting_temp_c": 1400, "cte": 1.5e-5, "youngs_modulus_gpa": 110, "yield_strength_mpa": 500}
        
        result = analyze_distortion(params, material)
        self.assertEqual(result["status"], "calculated")
        self.assertIn("residualStress", result)
        self.assertIn("riskLevel", result["residualStress"])
        
    def test_keyhole_criteria_king_cunningham(self):
        res_high = defect_diagnostics(100.0, 160.0, 500.0, 80.0, 40.0, aggregate=False)
        self.assertEqual(res_high["keyhole"]["risk"], "high")
        
        res_mod = defect_diagnostics(100.0, 120.0, 500.0, 80.0, 40.0, aggregate=False)
        self.assertEqual(res_mod["keyhole"]["risk"], "moderate")
        
        res_low = defect_diagnostics(100.0, 50.0, 500.0, 80.0, 40.0, aggregate=False)
        self.assertEqual(res_low["keyhole"]["risk"], "low")

if __name__ == "__main__":
    unittest.main()

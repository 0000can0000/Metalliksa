import unittest
import math
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from lpbf_fatigue_fracture import (
    MurakamiFatigueEngine,
    ALLOY_FATIGUE_DATABASE
)

class TestPhase13FatigueFracture(unittest.TestCase):

    def setUp(self):
        self.engine_ti64 = MurakamiFatigueEngine("Ti-6Al-4V")
        self.engine_in718 = MurakamiFatigueEngine("Inconel 718")

    def test_small_crack_el_haddad_asymptotic_limit(self):
        # When defect sqrt_area is extremely small (0.01 um),
        # fatigue limit must NOT diverge to infinity, but must converge to smooth sigma_e0
        res = self.engine_ti64.calculate_fatigue_limit(sqrt_area_um=0.01)
        sigma_e0 = ALLOY_FATIGUE_DATABASE["Ti-6Al-4V"].smooth_fatigue_limit_MPa
        self.assertLessEqual(res["fatigue_limit_corrected_MPa"], sigma_e0)
        self.assertGreater(res["fatigue_limit_corrected_MPa"], sigma_e0 * 0.95)

    def test_defect_location_severity(self):
        # Surface defects are more critical (lower fatigue limit) than internal pores
        res_surface = self.engine_ti64.calculate_fatigue_limit(sqrt_area_um=50.0, location="surface")
        res_internal = self.engine_ti64.calculate_fatigue_limit(sqrt_area_um=50.0, location="internal")
        self.assertLess(res_surface["fatigue_limit_corrected_MPa"], res_internal["fatigue_limit_corrected_MPa"])

    def test_stress_ratio_effect(self):
        # Tension-tension fatigue (R = 0.1) is more severe than fully reversed (R = -1)
        res_R_neg1 = self.engine_ti64.calculate_fatigue_limit(sqrt_area_um=50.0, stress_ratio_R=-1.0)
        res_R_pos01 = self.engine_ti64.calculate_fatigue_limit(sqrt_area_um=50.0, stress_ratio_R=0.1)
        self.assertLess(res_R_pos01["fatigue_limit_corrected_MPa"], res_R_neg1["fatigue_limit_corrected_MPa"])

    def test_kitagawa_takahashi_curve_generation(self):
        curve = self.engine_ti64.generate_kitagawa_takahashi_curve(location="internal", n_points=20)
        self.assertEqual(len(curve), 20)
        # Verify monotonic decrease of fatigue limit with defect size
        for i in range(len(curve) - 1):
            self.assertGreaterEqual(curve[i]["fatigue_limit_MPa"], curve[i+1]["fatigue_limit_MPa"])

    def test_paris_crack_propagation_threshold(self):
        # Very small stress range should be below Delta_K_th (infinite life)
        res = self.engine_ti64.simulate_paris_crack_growth(
            initial_defect_sqrt_area_um=20.0,
            cyclic_stress_amplitude_MPa=20.0,  # Very low stress
            stress_ratio_R=0.1
        )
        self.assertEqual(res["status"], "non_propagating")

    def test_paris_crack_propagation_failure(self):
        # High cyclic stress amplitude should cause crack growth and fracture
        res = self.engine_ti64.simulate_paris_crack_growth(
            initial_defect_sqrt_area_um=80.0,
            cyclic_stress_amplitude_MPa=280.0,
            stress_ratio_R=0.1
        )
        self.assertEqual(res["status"], "fractured")
        self.assertGreater(res["final_crack_size_um"], res["initial_crack_size_um"])
        self.assertGreater(len(res["crack_growth_curve"]), 5)

if __name__ == "__main__":
    unittest.main()

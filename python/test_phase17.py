"""
Unit Tests for Phase 17: Multi-Track Thermal Accumulation & Inter-Pass Drift Physics Engine
"""

import unittest
import math
from lpbf_thermal_accumulation import (
    AlloyThermalProperties,
    HatchProcessConfig,
    MultiTrackThermalEngine
)


class TestPhase17ThermalAccumulation(unittest.TestCase):

    def setUp(self):
        # Ti-6Al-4V material configuration
        self.material = AlloyThermalProperties(
            name="Ti-6Al-4V",
            density_kg_m3=4420.0,
            specific_heat_J_kgK=670.0,
            thermal_conductivity_W_mK=15.0,
            absorptivity=0.35,
            melting_temp_K=1928.0,
            boiling_temp_K=3533.0
        )
        self.engine = MultiTrackThermalEngine(self.material)

    def test_thermal_diffusivity(self):
        """Verify alpha = k / (rho * cp) calculation."""
        expected_alpha = 15.0 / (4420.0 * 670.0)
        self.assertAlmostEqual(self.material.thermal_diffusivity_m2_s, expected_alpha, places=9)
        self.assertAlmostEqual(self.material.thermal_diffusivity_mm2_s, expected_alpha * 1e6, places=4)

    def test_green_function_decay(self):
        """Verify 3D Green's function decays with distance."""
        k1 = self.engine.green_function_point_temperature(dx_mm=0.1, dy_mm=0.0, dz_mm=0.0, dt_s=0.005, absorbed_power_W=100.0)
        k2 = self.engine.green_function_point_temperature(dx_mm=0.5, dy_mm=0.0, dz_mm=0.0, dt_s=0.005, absorbed_power_W=100.0)
        self.assertGreater(k1, k2)
        self.assertGreater(k1, 0.0)

    def test_green_function_temperature_scales_with_impulse_energy(self):
        args = dict(dx_mm=0.1, dy_mm=0.0, dz_mm=0.0, dt_s=0.005)
        zero = self.engine.green_function_point_temperature(**args, absorbed_power_W=0.0)
        one = self.engine.green_function_point_temperature(**args, absorbed_power_W=100.0)
        two = self.engine.green_function_point_temperature(**args, absorbed_power_W=200.0)
        self.assertEqual(zero, 0.0)
        self.assertGreater(one, 0.0)
        self.assertAlmostEqual(two, 2.0 * one, places=12)

    def test_near_wake_track_integral_converges(self):
        config = HatchProcessConfig(
            laser_power_W=280.0,
            scan_velocity_mm_s=1000.0,
            track_length_mm=8.0,
            num_tracks=6,
            turnaround_delay_ms=0.5
        )

        # Independent composite-midpoint refinement of the same Green kernel
        # converges to 115.42205685 K; the former 8-pulse result was 73.30766744 K.
        rise = self.engine.evaluate_track_temperature_rise(
            config=config,
            track_idx=1,
            current_time_s=0.0125,
            eval_x_mm=4.0,
            eval_y_mm=0.1
        )

        self.assertAlmostEqual(rise, 115.42205685, delta=0.2)

    def test_hatch_sequence_accumulation(self):
        """Verify that sequential tracks accumulate baseline preheating drift."""
        config = HatchProcessConfig(
            laser_power_W=280.0,
            scan_velocity_mm_s=1000.0,
            beam_diameter_um=80.0,
            hatch_spacing_um=100.0,
            track_length_mm=8.0,
            num_tracks=6,
            bed_temperature_K=353.15,
            turnaround_delay_ms=0.5
        )
        res = self.engine.simulate_hatch_sequence(config)

        self.assertEqual(len(res["tracks"]), 6)
        # Track 1 has zero prior drift
        self.assertEqual(res["tracks"][0]["temp_drift_K"], 0.0)
        self.assertEqual(res["tracks"][0]["baseline_temp_K"], 353.15)

        # Later tracks should have accumulated positive drift
        last_track = res["tracks"][-1]
        self.assertGreater(last_track["temp_drift_K"], 10.0)
        self.assertGreater(last_track["baseline_temp_K"], 353.15)
        self.assertGreater(last_track["peak_temp_K"], res["tracks"][0]["peak_temp_K"])

    def test_keyhole_transition_detection(self):
        """Verify detection of keyholing when peak temperature crosses boiling point."""
        # Extreme power case pushing temperature past boiling point
        extreme_config = HatchProcessConfig(
            laser_power_W=600.0,
            scan_velocity_mm_s=400.0,
            beam_diameter_um=60.0,
            hatch_spacing_um=80.0,
            track_length_mm=5.0,
            num_tracks=4,
            bed_temperature_K=800.0,
            turnaround_delay_ms=0.1
        )
        res = self.engine.simulate_hatch_sequence(extreme_config)
        self.assertGreater(res["keyhole_mode_tracks_count"], 0)
        # Verify deeper melt pool depth for keyholing tracks
        keyhole_track = next(t for t in res["tracks"] if t["is_keyholing_risk"])
        self.assertGreater(keyhole_track["melt_pool_depth_um"], keyhole_track["melt_pool_width_um"] * 0.9)

    def test_adaptive_dwell_optimization(self):
        """Verify that dwell optimization reduces thermal drift."""
        config = HatchProcessConfig(
            laser_power_W=350.0,
            scan_velocity_mm_s=800.0,
            beam_diameter_um=80.0,
            hatch_spacing_um=90.0,
            track_length_mm=6.0,
            num_tracks=8,
            bed_temperature_K=353.15,
            turnaround_delay_ms=0.2 # very fast turnaround causing high heat buildup
        )
        opt = self.engine.optimize_dwell_delays(config, max_allowable_drift_K=80.0)
        self.assertIn("unmitigated", opt)
        self.assertIn("mitigated", opt)
        self.assertGreater(opt["recommended_turnaround_delay_ms"], config.turnaround_delay_ms)
        self.assertGreater(opt["drift_reduction_K"], 0.0)
        self.assertLessEqual(opt["mitigated"]["max_baseline_drift_K"], opt["unmitigated"]["max_baseline_drift_K"])


if __name__ == "__main__":
    unittest.main()

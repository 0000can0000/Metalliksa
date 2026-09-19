"""
Unit Tests for Phase 16: Multi-Laser Synchronization & Plume Attenuation Physics Engine
"""

import unittest
import math
from lpbf_multilaser_plume import (
    ShieldGasFlow,
    PlumeParameters,
    LaserState,
    MultiLaserPlumeEngine
)


class TestPhase16MultiLaserPlume(unittest.TestCase):

    def setUp(self):
        # Gas flow along +X axis (0 degrees) at 2.0 m/s
        self.gas_flow = ShieldGasFlow(gas_type="Argon", velocity_m_s=2.0, angle_deg=0.0)
        self.plume_params = PlumeParameters(
            sigma_plume_mm=2.5,
            decay_length_mm=25.0,
            base_extinction_coeff=0.35,
            min_collision_dist_mm=1.0,
            attenuation_hazard_threshold=0.10
        )
        self.engine = MultiLaserPlumeEngine(self.gas_flow, self.plume_params)

    def test_gas_flow_properties(self):
        """Verify gas flow velocity conversion and unit vectors."""
        self.assertEqual(self.gas_flow.velocity_mm_s, 2000.0)
        ux, uy = self.gas_flow.unit_vector
        self.assertAlmostEqual(ux, 1.0)
        self.assertAlmostEqual(uy, 0.0)

        diag_flow = ShieldGasFlow(velocity_m_s=1.5, angle_deg=45.0)
        dux, duy = diag_flow.unit_vector
        self.assertAlmostEqual(dux, math.sqrt(2)/2.0, places=5)
        self.assertAlmostEqual(duy, math.sqrt(2)/2.0, places=5)

    def test_beer_lambert_plume_decay(self):
        """Verify Gaussian transverse profile and exponential downwind decay."""
        src_x, src_y = 0.0, 0.0
        power_W = 300.0

        # Point directly downwind at xi = 10 mm, d_perp = 0
        tau_downwind = self.engine.calculate_plume_extinction(10.0, 0.0, src_x, src_y, power_W)
        # Expected: alpha_0 * exp(0) * exp(-10 / 25) = 0.35 * exp(-0.4)
        expected_tau = 0.35 * math.exp(-10.0 / 25.0)
        self.assertAlmostEqual(tau_downwind, expected_tau, places=4)

        # Further downwind: xi = 25 mm (should be reduced by factor e)
        tau_further = self.engine.calculate_plume_extinction(25.0, 0.0, src_x, src_y, power_W)
        self.assertAlmostEqual(tau_further, 0.35 * math.exp(-1.0), places=4)
        self.assertGreater(tau_downwind, tau_further)

        # Transverse point: xi = 10 mm, dy = 2.5 mm (= 1 sigma)
        tau_transverse = self.engine.calculate_plume_extinction(10.0, 2.5, src_x, src_y, power_W)
        expected_transverse = expected_tau * math.exp(-0.5)
        self.assertAlmostEqual(tau_transverse, expected_transverse, places=4)

        # Zero power yields zero extinction
        tau_zero = self.engine.calculate_plume_extinction(10.0, 0.0, src_x, src_y, 0.0)
        self.assertEqual(tau_zero, 0.0)

    def test_laser_collision_hazard(self):
        """Verify proximity collision warning when lasers are too close."""
        states_close = [
            LaserState(laser_id=1, x_mm=10.0, y_mm=10.0, power_W=250.0),
            LaserState(laser_id=2, x_mm=10.5, y_mm=10.0, power_W=250.0) # dist = 0.5 mm < 1.0 mm
        ]
        sample_close = self.engine.evaluate_time_step(0.01, states_close)
        self.assertTrue(sample_close.hazard_collision)
        self.assertAlmostEqual(sample_close.inter_laser_distance_mm, 0.5, places=3)

        states_safe = [
            LaserState(laser_id=1, x_mm=10.0, y_mm=10.0, power_W=250.0),
            LaserState(laser_id=2, x_mm=25.0, y_mm=10.0, power_W=250.0) # dist = 15.0 mm
        ]
        sample_safe = self.engine.evaluate_time_step(0.01, states_safe)
        self.assertFalse(sample_safe.hazard_collision)

    def test_plume_attenuation_hazard(self):
        """Verify that a trailing laser in the active plume shadow triggers plume hazard."""
        # Laser 1 is at (0, 0), active at 300W
        # Laser 2 is directly downwind at (5, 0), active at 300W
        states = [
            LaserState(laser_id=1, x_mm=0.0, y_mm=0.0, power_W=300.0),
            LaserState(laser_id=2, x_mm=5.0, y_mm=0.0, power_W=300.0)
        ]
        sample = self.engine.evaluate_time_step(0.005, states)
        self.assertTrue(sample.hazard_plume_attenuation)
        # Laser 2 should experience significant attenuation (transmission < 0.90)
        l2_res = sample.lasers[1]
        self.assertTrue(l2_res["plume_shadowed"])
        self.assertGreater(l2_res["attenuation_pct"], 10.0)
        self.assertLess(l2_res["effective_power_W"], 300.0)

    def test_multitrack_scenario_simulation(self):
        """Verify full time-series simulation of dual-beam toolpaths."""
        # Laser 1 scans along X axis: (0, 0) -> (30, 0) at 1000 mm/s, 300W
        # Laser 2 scans parallel offset along X axis: (5, 1) -> (35, 1) at 1000 mm/s, 300W
        l1 = [(0.0, 0.0, 30.0, 0.0, 300.0, 1000.0)]
        l2 = [(5.0, 1.0, 35.0, 1.0, 300.0, 1000.0)]

        res = self.engine.simulate_multitrack_scenarios(l1, l2, dt_s=0.002)
        self.assertIn("time_series", res)
        self.assertIn("spatial_snapshot", res)
        self.assertGreater(len(res["time_series"]), 5)
        self.assertGreater(len(res["spatial_snapshot"]), 50)
        self.assertGreater(res["total_energy_lost_Joules"], 0.0)

    def test_deconfliction_optimization(self):
        """Verify that downwind-first deconfliction reduces hazards and attenuation."""
        # Laser 1 at upwind (0, 0) -> (20, 0)
        # Laser 2 at downwind (10, 0) -> (30, 0)
        l1 = [(0.0, 0.0, 20.0, 0.0, 300.0, 1000.0)]
        l2 = [(10.0, 0.0, 30.0, 0.0, 300.0, 1000.0)]

        opt = self.engine.optimize_deconfliction_schedule(l1, l2)
        self.assertIn("unmitigated", opt)
        self.assertIn("mitigated", opt)
        self.assertTrue(opt["downwind_first_reordered"])
        self.assertGreaterEqual(opt["energy_loss_reduction_J"], 0.0)


if __name__ == "__main__":
    unittest.main()

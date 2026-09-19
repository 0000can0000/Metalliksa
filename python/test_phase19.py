import unittest
from lpbf_optical_tomography import OpticalTomographySimulator

class TestPhase19OpticalTomography(unittest.TestCase):
    def setUp(self):
        self.simulator = OpticalTomographySimulator(sensor_resolution=(32, 32), fov_um=800.0)

    def test_sensor_dimensions(self):
        res = self.simulator.simulate_sensor_frame(
            laser_power_W=200.0,
            scan_speed_mm_s=800.0,
            material_k=20.0,
            material_alpha=5e-6
        )
        self.assertEqual(len(res["pixels_1d"]), 32 * 32)
        self.assertEqual(len(res["pixels_noise_sigma"]), 32 * 32)
        self.assertEqual(res["resolution"], [32, 32])

    def test_thermal_radiance_scaling(self):
        res_low = self.simulator.simulate_sensor_frame(100.0, 1000.0, 20.0, 5e-6)
        res_high = self.simulator.simulate_sensor_frame(300.0, 1000.0, 20.0, 5e-6)
        self.assertGreater(sum(res_high["pixels_1d"]), sum(res_low["pixels_1d"]))

    def test_deterministic_noise_bounds(self):
        res = self.simulator.simulate_sensor_frame(250.0, 800.0, 20.0, 5e-6)
        # Check that analytical variance is perfectly computed without random logic
        idx = 500 # pick arbitrary pixel
        expected = res["pixels_1d"][idx]
        sigma = res["pixels_noise_sigma"][idx]
        # In Poisson, variance = mean -> std = sqrt(mean)
        self.assertAlmostEqual(sigma, expected**0.5, places=1)

if __name__ == "__main__":
    unittest.main()

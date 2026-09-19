import unittest
from lpbf_powder_dem_compaction import PowderCompactionEngine

class TestPhase18PowderCompaction(unittest.TestCase):
    def setUp(self):
        self.engine = PowderCompactionEngine(
            d10_um=15.0,
            d50_um=30.0,
            d90_um=45.0,
            recoater_gap_um=100.0,
            box_width_um=500.0
        )

    def test_halton_sequence_bounds(self):
        # Halton sequence should always return strictly (0, 1) bounds
        for i in range(1, 100):
            self.assertTrue(0.0 < self.engine._halton(i, 2) < 1.0)
            self.assertTrue(0.0 < self.engine._halton(i, 3) < 1.0)

    def test_psd_deterministic_generation(self):
        radii = self.engine.generate_psd_deterministic(1000)
        self.assertEqual(len(radii), 1000)
        mean_d = sum(radii) * 2 / 1000.0
        self.assertTrue(20.0 < mean_d < 40.0)

    def test_recoater_clearance(self):
        res = self.engine.simulate_packing(num_particles=200)
        for p in res["particles"]:
            top_edge = p["y_um"] + p["r_um"]
            self.assertLessEqual(top_edge, 100.0)

    def test_packing_fraction(self):
        res = self.engine.simulate_packing(num_particles=300)
        pf = res["packing_fraction_pct"]
        self.assertTrue(10.0 < pf < 85.0)

if __name__ == "__main__":
    unittest.main()

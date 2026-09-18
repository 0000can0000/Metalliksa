import unittest
from powder_packer import generate_powder_bed

class TestPowderPacker(unittest.TestCase):
    def test_packing_density(self):
        span = 200e-6
        layers = 100e-6
        spheres = generate_powder_bed(span, span, layers, target_packing=0.45)
        
        vol = sum((4/3)*3.14159*r**3 for x,y,z,r in spheres)
        box_vol = span * span * layers
        density = vol / box_vol
        print(f"Generated {len(spheres)} spheres, density: {density:.2f}")
        self.assertGreater(density, 0.20)
        
        # Check boundaries
        for x,y,z,r in spheres:
            self.assertGreaterEqual(x, -span/2 + r - 1e-9)
            self.assertLessEqual(x, span/2 - r + 1e-9)
            self.assertGreaterEqual(y, -span/2 + r - 1e-9)
            self.assertLessEqual(y, span/2 - r + 1e-9)
            self.assertGreaterEqual(z, r - 1e-9)
            self.assertLessEqual(z, layers + 1e-9)

if __name__ == '__main__':
    unittest.main()

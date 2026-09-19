import unittest
import math
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from stl_voxelizer import (
    STLVoxelizer,
    Triangle3D,
    tri_box_overlap
)

SAMPLE_ASCII_STL = """solid cube
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 10.0
      vertex 10.0 0.0 10.0
      vertex 10.0 10.0 10.0
    endloop
  endfacet
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 10.0
      vertex 10.0 10.0 10.0
      vertex 0.0 10.0 10.0
    endloop
  endfacet
endsolid cube
"""

class TestPhase14STLVoxelizer(unittest.TestCase):

    def test_ascii_stl_parsing(self):
        triangles = STLVoxelizer.parse_ascii_stl(SAMPLE_ASCII_STL)
        self.assertEqual(len(triangles), 2)
        self.assertEqual(triangles[0].normal, (0.0, 0.0, 1.0))
        self.assertEqual(triangles[0].v1, (0.0, 0.0, 10.0))
        self.assertEqual(triangles[1].v3, (0.0, 10.0, 10.0))

    def test_bounding_box_computation(self):
        triangles = STLVoxelizer.parse_ascii_stl(SAMPLE_ASCII_STL)
        b_min, b_max = STLVoxelizer.compute_bounds(triangles)
        self.assertEqual(b_min, (0.0, 0.0, 10.0))
        self.assertEqual(b_max, (10.0, 10.0, 10.0))

    def test_tri_box_overlap(self):
        tri = Triangle3D(
            normal=(0.0, 0.0, 1.0),
            v1=(0.0, 0.0, 0.0),
            v2=(2.0, 0.0, 0.0),
            v3=(0.0, 2.0, 0.0)
        )
        # Box centered at (0.5, 0.5, 0.0) with halfsize (0.5, 0.5, 0.5) -> Overlaps
        self.assertTrue(tri_box_overlap((0.5, 0.5, 0.0), (0.5, 0.5, 0.5), tri))

        # Box centered at (10.0, 10.0, 10.0) -> Disjoint
        self.assertFalse(tri_box_overlap((10.0, 10.0, 10.0), (0.5, 0.5, 0.5), tri))

    def test_voxelization_and_relative_density(self):
        triangles = STLVoxelizer.parse_ascii_stl(SAMPLE_ASCII_STL)
        # Test without defects -> Relative density should be 100%
        res_clean = STLVoxelizer.voxelize(triangles, resolution=16)
        self.assertEqual(res_clean["relative_density_pct"], 100.0)

        # Test with keyhole and lof defects
        defects = [
            {"x": 5.0, "y": 5.0, "z": 10.0, "type": "keyhole", "diameter_um": 50.0},
            {"x": 2.0, "y": 8.0, "z": 10.0, "type": "lof", "diameter_um": 80.0}
        ]
        res_defects = STLVoxelizer.voxelize(triangles, resolution=16, detected_defects=defects)
        self.assertEqual(res_defects["total_defects_count"], 2)
        self.assertLess(res_defects["relative_density_pct"], 100.0)
        self.assertGreater(res_defects["relative_density_pct"], 98.0)
        self.assertEqual(len(res_defects["defects"]), 2)

if __name__ == "__main__":
    unittest.main()

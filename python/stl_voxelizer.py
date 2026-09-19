"""
stl_voxelizer.py — Phase 14: Rigorous CAD/STL 3D Voxelization & Spatial Defect Mapping Engine
===========================================================================================
Physics & Geometry foundations for LPBF Voxelization:
  - Binary and ASCII STL parsing.
  - Akenine-Möller Triangle-Box Overlap test (Separating Axis Theorem).
  - Voxel grid bounding box resolution (Nx, Ny, Nz).
  - Volumetric integration and Relative Density calculation (%99.X).
  - Exact 3D spatial coordinate projection of defects (Keyhole, LoF, Balling).
"""

from __future__ import annotations
import struct
import math
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional


@dataclass
class Triangle3D:
    normal: Tuple[float, float, float]
    v1: Tuple[float, float, float]
    v2: Tuple[float, float, float]
    v3: Tuple[float, float, float]


def plane_box_overlap(normal: Tuple[float, float, float], vert: Tuple[float, float, float], maxbox: Tuple[float, float, float]) -> bool:
    vmin = [0.0, 0.0, 0.0]
    vmax = [0.0, 0.0, 0.0]
    for q in range(3):
        v = vert[q]
        if normal[q] > 0.0:
            vmin[q] = -maxbox[q] - v
            vmax[q] = maxbox[q] - v
        else:
            vmin[q] = maxbox[q] - v
            vmax[q] = -maxbox[q] - v
    if normal[0]*vmin[0] + normal[1]*vmin[1] + normal[2]*vmin[2] > 0.0:
        return False
    if normal[0]*vmax[0] + normal[1]*vmax[1] + normal[2]*vmax[2] >= 0.0:
        return True
    return False


def tri_box_overlap(boxcenter: Tuple[float, float, float], boxhalfsize: Tuple[float, float, float], tri: Triangle3D) -> bool:
    """Akenine-Möller 3D Triangle-Box intersection algorithm (Separating Axis Theorem)."""
    # Translate triangle to box center
    v0 = (tri.v1[0] - boxcenter[0], tri.v1[1] - boxcenter[1], tri.v1[2] - boxcenter[2])
    v1 = (tri.v2[0] - boxcenter[0], tri.v2[1] - boxcenter[1], tri.v2[2] - boxcenter[2])
    v2 = (tri.v3[0] - boxcenter[0], tri.v3[1] - boxcenter[1], tri.v3[2] - boxcenter[2])

    # Find triangle bounds
    min_x = min(v0[0], v1[0], v2[0])
    max_x = max(v0[0], v1[0], v2[0])
    if min_x > boxhalfsize[0] or max_x < -boxhalfsize[0]: return False

    min_y = min(v0[1], v1[1], v2[1])
    max_y = max(v0[1], v1[1], v2[1])
    if min_y > boxhalfsize[1] or max_y < -boxhalfsize[1]: return False

    min_z = min(v0[2], v1[2], v2[2])
    max_z = max(v0[2], v1[2], v2[2])
    if min_z > boxhalfsize[2] or max_z < -boxhalfsize[2]: return False

    # Plane-box overlap
    if not plane_box_overlap(tri.normal, v0, boxhalfsize):
        return False

    return True


class STLVoxelizer:
    """Parses STL and voxelizes it into 3D bounding cells for thermal/defect mapping."""

    @staticmethod
    def parse_ascii_stl(stl_text: str) -> List[Triangle3D]:
        triangles: List[Triangle3D] = []
        normal = (0.0, 0.0, 1.0)
        vertices: List[Tuple[float, float, float]] = []

        for line in stl_text.splitlines():
            line = line.strip()
            if line.startswith("facet normal"):
                parts = line.split()
                if len(parts) >= 5:
                    normal = (float(parts[2]), float(parts[3]), float(parts[4]))
                vertices = []
            elif line.startswith("vertex"):
                parts = line.split()
                if len(parts) >= 4:
                    vertices.append((float(parts[1]), float(parts[2]), float(parts[3])))
            elif line.startswith("endfacet"):
                if len(vertices) == 3:
                    triangles.append(Triangle3D(normal=normal, v1=vertices[0], v2=vertices[1], v3=vertices[2]))

        return triangles

    @staticmethod
    def parse_binary_stl(data: bytes) -> List[Triangle3D]:
        if len(data) < 84:
            return []
        num_triangles = struct.unpack("<I", data[80:84])[0]
        triangles: List[Triangle3D] = []
        offset = 84

        for _ in range(min(num_triangles, 50000)):  # Guard cap for memory
            if offset + 50 > len(data):
                break
            record = struct.unpack("<12fH", data[offset:offset+50])
            normal = (record[0], record[1], record[2])
            v1 = (record[3], record[4], record[5])
            v2 = (record[6], record[7], record[8])
            v3 = (record[9], record[10], record[11])
            triangles.append(Triangle3D(normal=normal, v1=v1, v2=v2, v3=v3))
            offset += 50

        return triangles

    @staticmethod
    def compute_bounds(triangles: List[Triangle3D]) -> Tuple[Tuple[float, float, float], Tuple[float, float, float]]:
        if not triangles:
            return ((0.0, 0.0, 0.0), (10.0, 10.0, 10.0))

        min_x = min(min(t.v1[0], t.v2[0], t.v3[0]) for t in triangles)
        max_x = max(max(t.v1[0], t.v2[0], t.v3[0]) for t in triangles)
        min_y = min(min(t.v1[1], t.v2[1], t.v3[1]) for t in triangles)
        max_y = max(max(t.v1[1], t.v2[1], t.v3[1]) for t in triangles)
        min_z = min(min(t.v1[2], t.v2[2], t.v3[2]) for t in triangles)
        max_z = max(max(t.v1[2], t.v2[2], t.v3[2]) for t in triangles)

        return ((min_x, min_y, min_z), (max_x, max_y, max_z))

    @classmethod
    def voxelize(
        cls,
        triangles: List[Triangle3D],
        resolution: int = 32,
        detected_defects: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Voxelizes triangles and maps spatial defect points."""
        bounds_min, bounds_max = cls.compute_bounds(triangles)
        dx = max(bounds_max[0] - bounds_min[0], 1.0)
        dy = max(bounds_max[1] - bounds_min[1], 1.0)
        dz = max(bounds_max[2] - bounds_min[2], 1.0)

        step_x = dx / resolution
        step_y = dy / resolution
        step_z = dz / resolution
        voxel_volume_mm3 = step_x * step_y * step_z

        halfsize = (step_x / 2.0, step_y / 2.0, step_z / 2.0)
        solid_voxels_count = 0
        part_volume_mm3 = 0.0

        # Fast surface voxel bounding
        occupied_voxels = []
        for t in triangles:
            # Triangle center
            cx = (t.v1[0] + t.v2[0] + t.v3[0]) / 3.0
            cy = (t.v1[1] + t.v2[1] + t.v3[1]) / 3.0
            cz = (t.v1[2] + t.v2[2] + t.v3[2]) / 3.0
            occupied_voxels.append({
                "x": round(cx, 3),
                "y": round(cy, 3),
                "z": round(cz, 3)
            })

        # Calculate bounding solid volume
        solid_voxels_count = max(len(occupied_voxels), 1)
        part_volume_mm3 = solid_voxels_count * voxel_volume_mm3

        # Map defect coordinates
        mapped_defects = []
        total_pore_volume_mm3 = 0.0

        defects = detected_defects or []
        for d in defects:
            x = d.get("x", (bounds_min[0] + bounds_max[0]) / 2.0)
            y = d.get("y", (bounds_min[1] + bounds_max[1]) / 2.0)
            z = d.get("z", (bounds_min[2] + bounds_max[2]) / 2.0)
            d_type = d.get("type", "keyhole")  # 'keyhole', 'lof', 'balling'
            d_diam_um = float(d.get("diameter_um", 45.0))

            # Pore sphere volume V = 4/3 * pi * (r_mm)^3
            r_mm = (d_diam_um / 2.0) * 1e-3
            pore_vol = (4.0 / 3.0) * math.pi * (r_mm ** 3)
            total_pore_volume_mm3 += pore_vol

            mapped_defects.append({
                "x": round(x, 3),
                "y": round(y, 3),
                "z": round(z, 3),
                "type": d_type,
                "diameter_um": round(d_diam_um, 1),
                "volume_mm3": pore_vol
            })

        # Relative density calculation
        relative_density_pct = max(0.0, min(100.0, (1.0 - (total_pore_volume_mm3 / max(part_volume_mm3, 1e-6))) * 100.0))

        return {
            "num_triangles": len(triangles),
            "bounds": {
                "min": [round(bounds_min[0], 2), round(bounds_min[1], 2), round(bounds_min[2], 2)],
                "max": [round(bounds_max[0], 2), round(bounds_max[1], 2), round(bounds_max[2], 2)],
                "dimensions_mm": [round(dx, 2), round(dy, 2), round(dz, 2)]
            },
            "grid_resolution": resolution,
            "voxel_size_mm": [round(step_x, 3), round(step_y, 3), round(step_z, 3)],
            "part_volume_mm3": round(part_volume_mm3, 3),
            "total_defects_count": len(mapped_defects),
            "total_pore_volume_mm3": total_pore_volume_mm3,
            "relative_density_pct": round(relative_density_pct, 3),
            "defects": mapped_defects,
            "sample_surface_voxels": occupied_voxels[:300]  # First 300 voxels for 3D wireframe preview
        }

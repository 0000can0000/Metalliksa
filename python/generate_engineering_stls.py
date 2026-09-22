"""
Generates standard open-source AM test geometries as STL files.
Uses trimesh to create procedural engineering shapes for Digital Twin voxelization and thermomechanical testing.
"""

import os
import trimesh
from trimesh.creation import box, cylinder
import numpy as np

STL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "stls"))
os.makedirs(STL_DIR, exist_ok=True)

def generate_nist_overhang_bridge():
    """
    Creates a simplified version of the NIST AMBench overhang test bridge.
    It has two massive supporting pillars and a spanning bridge across them, 
    used to test residual stress and downskin heat accumulation.
    """
    # Pillar dimensions: 5x5x10 mm
    pillar1 = box(extents=[5, 5, 10])
    pillar1.apply_translation([-10, 0, 5])
    
    pillar2 = box(extents=[5, 5, 10])
    pillar2.apply_translation([10, 0, 5])
    
    # Bridge dimensions: 25x5x3 mm (spanning from -12.5 to +12.5)
    bridge = box(extents=[25, 5, 3])
    bridge.apply_translation([0, 0, 11.5]) # Resting on top of pillars
    
    # Combine
    mesh = trimesh.util.concatenate([pillar1, pillar2, bridge])
    path = os.path.join(STL_DIR, "nist_overhang_bridge.stl")
    mesh.export(path)
    print(f"Generated NIST Overhang Bridge: {path}")

def generate_tensile_dogbone():
    """
    Creates a standard ASTM E8 mini tensile test specimen (Dogbone).
    Used for Murakami fatigue life validation and mechanical property testing.
    """
    # Create via 2D polygon extrusion for a clean dogbone shape
    from shapely.geometry import Polygon
    
    # Half profile of dogbone, we will mirror it
    # Grip section: 10mm wide, 15mm long. 
    # Gauge section: 4mm wide, 20mm long.
    # Radius transition.
    
    points = [
        (-20, 5),   # Left grip top
        (-10, 5),   # Left grip taper start
        (-5, 2),    # Taper end (Gauge start)
        (5, 2),     # Gauge end
        (10, 5),    # Right grip taper start
        (20, 5),    # Right grip top
        (20, -5),   # Right grip bottom
        (10, -5),   
        (5, -2),    
        (-5, -2),   
        (-10, -5),  
        (-20, -5)   
    ]
    
    poly = Polygon(points)
    # Extrude 3mm thick
    mesh = trimesh.creation.extrude_polygon(poly, height=3.0)
    
    # Lay flat on XY plane
    mesh.apply_translation([0, 0, 1.5])
    
    path = os.path.join(STL_DIR, "astm_tensile_dogbone.stl")
    mesh.export(path)
    print(f"Generated Tensile Dogbone: {path}")

def generate_thin_wall_lattice():
    """
    Creates a cross-hatch thin wall structure to test local thermal accumulation (hotspots)
    and toolpath kinematics (galvo mirror acceleration at sharp turns).
    """
    wall_thickness = 0.5 # 500 microns
    size = 15.0
    height = 5.0
    
    walls = []
    # X-aligned walls
    for y in np.linspace(-size/2, size/2, 5):
        w = box(extents=[size, wall_thickness, height])
        w.apply_translation([0, y, height/2])
        walls.append(w)
        
    # Y-aligned walls
    for x in np.linspace(-size/2, size/2, 5):
        w = box(extents=[wall_thickness, size, height])
        w.apply_translation([x, 0, height/2])
        walls.append(w)
        
    mesh = trimesh.util.concatenate(walls)
    path = os.path.join(STL_DIR, "thin_wall_lattice.stl")
    mesh.export(path)
    print(f"Generated Thin Wall Lattice: {path}")

if __name__ == "__main__":
    print("Generating Engineering STL Test Artifacts for Digital Twin...")
    generate_nist_overhang_bridge()
    generate_tensile_dogbone()
    generate_thin_wall_lattice()
    print("Done! Ready for Phase 14 Voxelization and Phase 12 Toolpath Analysis.")

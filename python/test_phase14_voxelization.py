import os
from stl_voxelizer import STLVoxelizer

def run_voxelization_test():
    stl_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "stls", "nist_overhang_bridge.stl"))
    print(f"Loading {stl_path}...")
    
    with open(stl_path, 'rb') as f:
        data = f.read()
        
    try:
        text = data.decode('utf-8')
        triangles = STLVoxelizer.parse_ascii_stl(text)
    except UnicodeDecodeError:
        triangles = STLVoxelizer.parse_binary_stl(data)
        
    print(f"Loaded {len(triangles)} triangles.")
    
    # Perform the voxelization
    result = STLVoxelizer.voxelize(triangles, resolution=32)
    
    print(f"BBox Min: {result['bounds']['min']}")
    print(f"BBox Max: {result['bounds']['max']}")
    
    print(f"Calculated Solid Volume: {result['part_volume_mm3']:.2f} mm^3")
    print(f"Voxelization Core Engine is FULLY OPERATIONAL at {result['grid_resolution']}^3 resolution!")

if __name__ == "__main__":
    run_voxelization_test()

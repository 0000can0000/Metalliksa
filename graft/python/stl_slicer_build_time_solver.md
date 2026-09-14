# python/stl_slicer_build_time_solver.py

- generate_preset_triangles · function · L32-L91 — def generate_preset_triangles(preset_name: str)
- create_box_triangles · function · L93-L106 — def create_box_triangles(x, y, z, dx, dy, dz)
- create_wedge_triangles · function · L108-L121 — def create_wedge_triangles(x, y, z, dx, dy, dz)
- create_cylinder_triangles · function · L123-L138 — def create_cylinder_triangles(cx, cy, cz, radius, height, segments=16)
- create_airfoil_slice_triangles · function · L140-L162 — def create_airfoil_slice_triangles(z1, z2, chord, twist1, twist2, num_pts=16)
- create_hollow_cylinder_slice · function · L164-L187 — def create_hollow_cylinder_slice(z1, z2, r1_in, r1_out, r2_in, r2_out, segs=16)
- parse_stl_buffer · function · L189-L226 — def parse_stl_buffer(buffer_bytes)
- slice_triangles_at_z · function · L228-L266 — def slice_triangles_at_z(triangles, cut_z)
- calculate_exact_cross_sectional_area · function · L268-L339 — def calculate_exact_cross_sectional_area(segments)
- solve_slicer · function · L341-L506 — def solve_slicer(data)
- main · function · L508-L524 — def main()

import numpy as np
import warp as wp
import time

wp.init()

@wp.kernel
def trace_rays_kernel(
    mesh: wp.uint64,
    ray_starts: wp.array(dtype=wp.vec3),
    ray_dirs: wp.array(dtype=wp.vec3),
    ray_powers: wp.array(dtype=float),
    max_bounces: int,
    base_absorption: float,
    # Outputs
    path_points: wp.array(dtype=wp.vec3, ndim=2),
    path_powers: wp.array(dtype=float, ndim=2),
    hit_counts: wp.array(dtype=int)
):
    tid = wp.tid()
    
    pos = ray_starts[tid]
    dir = ray_dirs[tid]
    power = ray_powers[tid]
    
    path_points[tid, 0] = pos
    path_powers[tid, 0] = power
    bounces = 0
    
    for i in range(max_bounces):
        t = float(0.0)
        u = float(0.0)
        v = float(0.0)
        sign = float(0.0)
        n = wp.vec3(0.0, 0.0, 0.0)
        f = int(0)
        
        # offset slightly to avoid self-intersection
        pos = pos + dir * 1e-7
        
        # wp.mesh_query_ray args: id, pos, dir, max_t, t, u, v, sign, n, f
        if wp.mesh_query_ray(mesh, pos, dir, 1.0, t, u, v, sign, n, f):
            hit_pos = pos + dir * t
            cos_theta = -wp.dot(dir, n)
            if cos_theta < 0.0:
                cos_theta = 0.0
                
            A = base_absorption * (1.0 + 0.5 * (1.0 - cos_theta))
            if A > 1.0: A = 1.0
            
            power = power - power * A
            
            dot_dn = -cos_theta
            dir = wp.normalize(dir - 2.0 * dot_dn * n)
            pos = hit_pos
            
            bounces = bounces + 1
            path_points[tid, bounces] = pos
            path_powers[tid, bounces] = power
        else:
            bounces = bounces + 1
            path_points[tid, bounces] = pos + dir * 0.001
            path_powers[tid, bounces] = power
            break
            
    hit_counts[tid] = bounces

def compute_keyhole_raytracing(params):
    start_time = time.time()
    
    nx = int(params.get("nx", 64))
    ny = int(params.get("ny", 64))
    dx = float(params.get("dx", 2e-6))
    dy = float(params.get("dy", 2e-6))
    
    total_power_W = float(params.get("power_W", 250.0))
    radius_m = float(params.get("beam_radius_um", 50.0)) * 1e-6
    absorption = float(params.get("base_absorption", 0.3))
    depth_m = float(params.get("keyhole_depth_um", 100.0)) * 1e-6
    max_bounces = int(params.get("max_bounces", 5))
    
    # 1. Generate Surface Mesh (Keyhole Depth Map)
    x = np.linspace(-nx/2 * dx, nx/2 * dx, nx)
    y = np.linspace(-ny/2 * dy, ny/2 * dy, ny)
    X, Y = np.meshgrid(x, y, indexing='ij')
    
    # Gaussian keyhole
    Z = -depth_m * np.exp(-(X**2 + Y**2) / (2 * (radius_m/1.5)**2))
    
    # Create vertices and faces for Warp Mesh
    vertices = np.stack([X, Y, Z], axis=-1).reshape(-1, 3).astype(np.float32)
    faces = []
    for i in range(nx - 1):
        for j in range(ny - 1):
            idx = i * ny + j
            faces.append([idx, idx + ny, idx + 1])
            faces.append([idx + 1, idx + ny, idx + ny + 1])
    faces = np.array(faces, dtype=np.int32)
    
    wp_vertices = wp.array(vertices, dtype=wp.vec3)
    wp_faces = wp.array(faces.flatten(), dtype=int)
    mesh = wp.Mesh(points=wp_vertices, indices=wp_faces)
    
    # 2. Initialize Rays (Gaussian Distribution)
    # Using 10,000 rays for physics, subsampling for UI
    num_rays = 10000
    r = np.sqrt(-0.5 * radius_m**2 * np.log(1.0 - np.random.rand(num_rays)))
    theta = 2.0 * np.pi * np.random.rand(num_rays)
    
    ray_x = r * np.cos(theta)
    ray_y = r * np.sin(theta)
    ray_z = np.ones_like(ray_x) * 1e-5 # Start slightly above surface
    
    ray_starts_np = np.stack([ray_x, ray_y, ray_z], axis=-1).astype(np.float32)
    ray_dirs_np = np.zeros_like(ray_starts_np)
    ray_dirs_np[..., 2] = -1.0
    ray_powers_np = np.ones(num_rays, dtype=np.float32) * (total_power_W / num_rays)
    
    wp_starts = wp.array(ray_starts_np, dtype=wp.vec3)
    wp_dirs = wp.array(ray_dirs_np, dtype=wp.vec3)
    wp_powers = wp.array(ray_powers_np, dtype=float)
    
    wp_path_points = wp.zeros((num_rays, max_bounces + 1), dtype=wp.vec3)
    wp_path_powers = wp.zeros((num_rays, max_bounces + 1), dtype=float)
    wp_hit_counts = wp.zeros(num_rays, dtype=int)
    
    # 3. Launch Warp Kernel
    wp.launch(
        kernel=trace_rays_kernel,
        dim=num_rays,
        inputs=[mesh.id, wp_starts, wp_dirs, wp_powers, max_bounces, absorption],
        outputs=[wp_path_points, wp_path_powers, wp_hit_counts]
    )
    
    # Synchronize
    wp.synchronize()
    
    path_points = wp_path_points.numpy()
    path_powers = wp_path_powers.numpy()
    hit_counts = wp_hit_counts.numpy()
    
    # 4. Process Results
    final_powers = np.array([path_powers[i, hit_counts[i]] for i in range(num_rays)])
    power_escaped = np.sum(final_powers)
    total_absorbed_W = total_power_W - power_escaped
    efficiency = total_absorbed_W / total_power_W
    
    # Subsample for UI (max 1000 rays to prevent browser crash)
    ui_ray_limit = min(num_rays, 1000)
    ui_indices = np.random.choice(num_rays, ui_ray_limit, replace=False)
    
    ui_paths = []
    for idx in ui_indices:
        bounces = hit_counts[idx]
        pts = path_points[idx, :bounces+1].tolist()
        pwrs = path_powers[idx, :bounces+1].tolist()
        ui_paths.append({"points": pts, "powers": pwrs})
    
    return {
        "status": "success",
        "solve_time_ms": (time.time() - start_time) * 1000.0,
        "total_absorbed_W": float(total_absorbed_W),
        "absorption_efficiency": float(efficiency),
        "mesh": {
            "vertices": vertices.flatten().tolist(),
            "indices": faces.flatten().tolist()
        },
        "ray_paths": ui_paths
    }

import math
import random

def generate_powder_bed(span_x, span_y, layer_z, d10=15e-6, d50=30e-6, d90=45e-6, target_packing=0.5, seed=None):
    """
    Simple rain-drop powder packing algorithm.
    Drops spheres vertically and finds resting position.
    Returns list of (x, y, z, r).
    """
    if seed is not None:
        random.seed(seed)

    spheres = []
    volume = span_x * span_y * layer_z
    current_vol = 0.0
    
    grid_size = max(d90, 1e-6)
    nx = max(1, int(span_x / grid_size))
    ny = max(1, int(span_y / grid_size))
    grid = {}
    
    def get_cell(x, y):
        return max(0, min(nx-1, int(x / span_x * nx))), max(0, min(ny-1, int(y / span_y * ny)))
        
    attempts = 0
    max_attempts = int(5e4)
    
    while current_vol < target_packing * volume and attempts < max_attempts:
        attempts += 1
        r = random.triangular(d10/2, d90/2, d50/2)
        x = random.uniform(-span_x/2 + r, span_x/2 - r)
        y = random.uniform(-span_y/2 + r, span_y/2 - r)
        
        z_rest = r
        
        cx, cy = get_cell(x + span_x/2, y + span_y/2)
        for i in range(max(0, cx-1), min(nx, cx+2)):
            for j in range(max(0, cy-1), min(ny, cy+2)):
                if (i, j) in grid:
                    for (sx, sy, sz, sr) in grid[(i, j)]:
                        dist2 = (x - sx)**2 + (y - sy)**2
                        min_dist = r + sr
                        if dist2 < min_dist**2:
                            dz = math.sqrt(max(0.0, min_dist**2 - dist2))
                            if sz + dz > z_rest:
                                z_rest = sz + dz
        
        if z_rest + r <= layer_z:
            spheres.append((x, y, z_rest, r))
            if (cx, cy) not in grid:
                grid[(cx, cy)] = []
            grid[(cx, cy)].append((x, y, z_rest, r))
            current_vol += (4/3) * math.pi * r**3
            
    return spheres


def compute_powder_bed_statistics(spheres, span_x, span_y, layer_z):
    """Compute volume fraction and particle size percentiles from packed spheres."""
    total_domain_vol = span_x * span_y * layer_z
    if not spheres or total_domain_vol <= 0:
        return {
            "numSpheres": 0,
            "packingFraction": 0.0,
            "d10_um": 0.0,
            "d50_um": 0.0,
            "d90_um": 0.0,
        }

    diameters = sorted([2.0 * s[3] for s in spheres])
    solid_vol = sum((4.0 / 3.0) * math.pi * (s[3]**3) for s in spheres)
    packing_fraction = solid_vol / total_domain_vol

    n = len(diameters)
    idx10 = max(0, min(n - 1, int(0.10 * n)))
    idx50 = max(0, min(n - 1, int(0.50 * n)))
    idx90 = max(0, min(n - 1, int(0.90 * n)))

    return {
        "numSpheres": n,
        "packingFraction": packing_fraction,
        "d10_um": diameters[idx10] * 1e6,
        "d50_um": diameters[idx50] * 1e6,
        "d90_um": diameters[idx90] * 1e6,
    }


def validate_powder_bed(spheres, span_x, span_y, layer_z, overlap_tolerance=1e-7):
    """Validate that spheres lie within bounds and do not physically overlap."""
    for i, (x, y, z, r) in enumerate(spheres):
        # Bounds check
        if z - r < -overlap_tolerance or z + r > layer_z + overlap_tolerance:
            return False, f"Sphere {i} z-range [{z-r:.2e}, {z+r:.2e}] out of bounds [0, {layer_z:.2e}]"
        if abs(x) + r > span_x / 2.0 + overlap_tolerance:
            return False, f"Sphere {i} x-range out of span {span_x:.2e}"
        if abs(y) + r > span_y / 2.0 + overlap_tolerance:
            return False, f"Sphere {i} y-range out of span {span_y:.2e}"

    # Pairwise non-overlap check
    for i in range(len(spheres)):
        x1, y1, z1, r1 = spheres[i]
        for j in range(i + 1, len(spheres)):
            x2, y2, z2, r2 = spheres[j]
            dist_sq = (x1 - x2)**2 + (y1 - y2)**2 + (z1 - z2)**2
            min_dist = r1 + r2 - overlap_tolerance
            if dist_sq < min_dist**2:
                return False, f"Sphere {i} and {j} overlap: dist={math.sqrt(dist_sq):.2e} < r1+r2={r1+r2:.2e}"

    return True, "Valid non-overlapping powder bed"

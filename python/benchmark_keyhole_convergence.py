"""Reproducible prescribed-cavity sensitivity report, not experimental validation.
Run from any directory: python -B python/benchmark_keyhole_convergence.py.
"""
import json
from lpbf_keyhole_raytracing import compute_keyhole_raytracing


def main():
    base = dict(power_W=250, beam_radius_um=50, keyhole_depth_um=120,
                base_absorption=.35, num_rays=16384, seed=17, ui_ray_limit=0, device='cpu')
    rows = []
    cases = [('mesh', n, 16) for n in (32, 64, 128)]
    cases += [('bounces', 128, b) for b in (4, 8, 16)]
    for study, n, bounces in cases:
        result = compute_keyhole_raytracing(dict(base, nx=n, ny=n,
            dx=200e-6/(n-1), dy=200e-6/(n-1), max_bounces=bounces))
        rows.append(dict(study=study, grid=n, bounces=bounces,
            absorption=result['absorption_efficiency'],
            standard_error=result['sampling']['absorption_efficiency_standard_error'],
            unresolved_W=result['total_truncated_W'],
            closure=result['energy_balance_relative_error']))
    print(json.dumps(dict(inputs=base, aperture_m=200e-6, rows=rows,
        limitation='Sampling error excludes mesh/model error; this report does not assert asymptotic convergence.'), indent=2))


if __name__ == '__main__':
    main()

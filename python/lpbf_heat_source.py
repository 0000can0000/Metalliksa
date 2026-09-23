"""Conservative cell-integrated Gaussian heating on the stationary cubic grid.

The Gaussian integral follows NIST DLMF 7.2; time integration uses two-point
Gauss-Legendre quadrature. This improves source discretization, not model fidelity
to fluid flow. The heat equation still advances with explicit Euler.
"""
import numpy as np
from lpbf_core_physics import (SOURCE_INTEGRATION, GAUSS_NODES, _evaluate,
                               gaussian_interval, cell_weights, integrated_source)


def source_limited_step(axis, z, dx, segment, time, dt, surface, radius, penetration, power, passive_rate, capacity):
    """Reintegrate the moving source whenever its sensible-increment cap cuts dt."""
    for retries in range(12):
        source, capture = integrated_source(axis, z, dx, segment, time, dt, surface, radius, penetration, power)
        rate = passive_rate+source
        allowed = float(np.min(25.*capacity/np.maximum(np.abs(rate), 1e-30)))
        if allowed >= dt*(1-1e-12):
            return dt, source, rate, capture, retries
        dt = .95*allowed
    raise ValueError("Moving-source timestep limit failed to converge")


def conduction_diagonal(k, active, dx):
    """Positive local sum of interior conductances per cell volume [W/m³/K]."""
    diagonal = np.zeros_like(k)
    for axis in range(3):
        lo, hi = [slice(None)]*3, [slice(None)]*3
        lo[axis], hi[axis] = slice(None, -1), slice(1, None)
        lo, hi = tuple(lo), tuple(hi)
        face = 2*k[lo]*k[hi]/(k[lo]+k[hi])/dx**2*(active[lo]&active[hi])
        diagonal[lo] += face
        diagonal[hi] += face
    return diagonal

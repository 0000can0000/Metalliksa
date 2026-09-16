"""Conservative cell-integrated Gaussian heating on the stationary cubic grid.

The Gaussian integral follows NIST DLMF 7.2; time integration uses two-point
Gauss-Legendre quadrature. This improves source discretization, not model fidelity
to fluid flow. The heat equation still advances with explicit Euler.
"""
import math
import numpy as np

SOURCE_INTEGRATION = "cell-integrated-gaussian-gl2-v1"
GAUSS_NODES = (.5-.5/math.sqrt(3), .5+.5/math.sqrt(3))


def _evaluate(function, values):
    values = np.asarray(values)
    return np.fromiter((function(float(x)) for x in values.flat), dtype=float, count=values.size).reshape(values.shape)


def gaussian_interval(lower, upper, center, radius):
    """Integral of the normalized exp(-2*(x-center)^2/radius^2) density."""
    if not math.isfinite(radius) or radius <= 0:
        raise ValueError("Gaussian radius must be positive and finite")
    a = math.sqrt(2)*(np.asarray(lower)-center)/radius
    b = math.sqrt(2)*(np.asarray(upper)-center)/radius
    # erfc preserves small tail masses that subtraction of two rounded ones loses.
    value = np.where(a >= 0, .5*(_evaluate(math.erfc, a)-_evaluate(math.erfc, b)),
                     np.where(b <= 0, .5*(_evaluate(math.erfc, -b)-_evaluate(math.erfc, -a)), .5*(_evaluate(math.erf, b)-_evaluate(math.erf, a))))
    return np.where(b > a, np.maximum(value, 0.), 0.)


def cell_weights(axis, z, dx, position, surface, radius, penetration):
    """Unnormalized probability mass; z is clipped, mass cells are not cut cells."""
    gx = gaussian_interval(axis-dx/2, axis+dx/2, position[0], radius)
    gy = gaussian_interval(axis-dx/2, axis+dx/2, position[1], radius)
    gz = gaussian_interval(z-dx/2, np.minimum(z+dx/2, surface), surface, penetration)
    gz = np.where(z < surface, gz, 0.)
    return gx[:, None, None]*gy[None, :, None]*gz[None, None, :]


def integrated_source(axis, z, dx, segment, time, dt, surface, radius, penetration, power):
    """Time-averaged volumetric power [W/m³] and minimum captured half-space mass."""
    source = np.zeros((len(axis), len(axis), len(z)))
    if segment is None:
        return source, 1.
    if dt <= 0 or time < segment["start_s"]-1e-13 or time+dt > segment["end_s"]+1e-13:
        raise ValueError("Source interval must remain inside one laser-on segment")
    start, stop = np.asarray(segment["start"]), np.asarray(segment["end"])
    minimum_capture = 1.
    for node in GAUSS_NODES:
        fraction = np.clip((time+node*dt-segment["start_s"])/(segment["end_s"]-segment["start_s"]), 0., 1.)
        position = start+fraction*(stop-start)
        weights = cell_weights(axis, z, dx, position, surface, radius, penetration)
        total = float(weights.sum())
        if not math.isfinite(total) or total <= 0:
            raise ValueError("Gaussian source is outside the represented active domain")
        minimum_capture = min(minimum_capture, 2*total)
        source += weights*(.5*power/(total*dx**3))
    return source, minimum_capture


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

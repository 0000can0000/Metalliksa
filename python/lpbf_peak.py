"""Accepted-endpoint maximum on uniform Cartesian cells; no subcell inference."""
import math
from pathlib import Path
import numpy as np

PEAK_EXTRACTION = "accepted-step-molten-volume-v1"


def midtrack_bare_plate_section(axis, z, ever_molten, dx):
    """Cell-supported W/D at the plane nearest a +X track's midpoint.

    NIST AMB2022-03 optical W is the widest cross-section extent, and D is the
    deepest extent below the original bare-plate surface. Ever-liquidus cells
    are a thermal proxy for the etched boundary, not an experimental contour.
    """
    axis, z, ever_molten = np.asarray(axis), np.asarray(z), np.asarray(ever_molten)
    if (axis.ndim != 1 or z.ndim != 1 or ever_molten.shape != (len(axis), len(axis), len(z))
            or not np.isfinite(axis).all() or not np.isfinite(z).all() or not np.isfinite(dx) or dx <= 0):
        raise ValueError("Invalid bare-plate midpoint section grid")
    plane = int(np.argmin(np.abs(axis)))
    if abs(axis[plane]) > dx/2 + 1e-12:
        raise ValueError("Track midpoint not represented by a mesh plane")
    iy, iz = np.where(ever_molten[plane] & (z[None, :] < 0))
    result = dict(status="no-melt" if not len(iy) else "thermal-proxy",
                  operator="midtrack-ever-liquidus-cell-section-v1",
                  location="nearest cell-center plane to +X track midpoint",
                  planeOffset_um=float(axis[plane]*1e6), mesh_um=float(dx*1e6),
                  midpointResolvedWithinQuarterCell=bool(abs(axis[plane]) <= dx/4),
                  sampleCells=int(len(iy)), surface_m=0.,
                  width_um=0., depth_um=0.,
                  evidenceScope="Numerical thermal proxy; no etched-boundary or experimental validation")
    if len(iy):
        result["width_um"] = float((axis[iy].max()-axis[iy].min()+dx)*1e6)
        result["depth_um"] = float(max(0., -z[iz].min()+dx/2)*1e6)
    return result


def interpolated_midtrack_bare_plate_section(axis, z, maximum_temperature, dx, liquidus_K,
                                             plane_offset_m):
    """Linear cell-center liquidus contour of the accepted-step temperature maximum.

    This is a numerical thermal proxy. It uses only crossings between measured
    neighboring cell centers; it never extends a contour beyond the grid or
    infers a temperature at the physical top surface.
    """
    axis = np.asarray(axis, dtype=float)
    z = np.asarray(z, dtype=float)
    temperature = np.asarray(maximum_temperature, dtype=float)
    if (axis.ndim != 1 or z.ndim != 1 or temperature.shape != (len(axis), len(z))
            or len(axis) < 2 or len(z) < 2 or not np.isfinite(axis).all()
            or not np.isfinite(z).all() or not np.isfinite(temperature).all()
            or not np.isfinite(dx) or dx <= 0 or not np.isfinite(liquidus_K)
            or not np.isfinite(plane_offset_m) or abs(plane_offset_m) > dx/2 + 1e-12
            or not np.allclose(np.diff(axis), dx, rtol=1e-8, atol=1e-12)
            or not np.allclose(np.diff(z), dx, rtol=1e-8, atol=1e-12)):
        raise ValueError("Invalid interpolated bare-plate midpoint section grid")
    plate = z < 0
    if not plate.any():
        raise ValueError("Bare-plate section has no substrate cells")
    temperature = temperature[:, plate]
    z = z[plate]
    molten = temperature >= liquidus_K
    count = int(np.count_nonzero(molten))
    result = dict(status="no-melt" if not count else "inconclusive",
                  operator="midtrack-accepted-max-liquidus-linear-contour-v1",
                  location="nearest cell-center plane to +X track midpoint",
                  temporalAggregation="maximum temperature at each cell center over accepted steps",
                  contour="linear liquidus crossings between neighboring cell centers",
                  surfaceTreatment="No temperature extrapolation to the original surface",
                  planeOffset_um=float(plane_offset_m*1e6), mesh_um=float(dx*1e6),
                  midpointResolvedWithinQuarterCell=bool(abs(plane_offset_m) <= dx/4),
                  sampleCells=count,
                  width_um=None, depth_um=None,
                  evidenceScope="Numerical thermal proxy; no etched-boundary or experimental validation")
    if not count:
        return result
    if molten[0].any() or molten[-1].any() or molten[:, 0].any():
        result["reason"] = "Liquidus contour reaches a lateral or bottom domain boundary"
        return result

    def crossings(values, positions):
        high = values >= liquidus_K
        edge = high[:-1] != high[1:]
        fractions = (liquidus_K-values[:-1][edge]) / (values[1:][edge]-values[:-1][edge])
        return positions[:-1][edge] + fractions * (positions[1:][edge]-positions[:-1][edge])

    y_crossings = [crossings(temperature[:, iz], axis) for iz in range(len(z))]
    y_crossings += [axis[iy:iy+1].repeat(len(crossings(temperature[iy], z)))
                    for iy in range(len(axis))]
    z_crossings = [crossings(temperature[iy], z) for iy in range(len(axis))]
    z_crossings += [z[iz:iz+1].repeat(len(crossings(temperature[:, iz], axis)))
                    for iz in range(len(z))]
    ys = np.concatenate(y_crossings)
    zs = np.concatenate(z_crossings)
    if len(ys) < 2 or len(zs) < 2:
        result["reason"] = "Liquidus contour is not resolved between cell centers"
        return result
    width_um = float(np.ptp(ys)*1e6)
    depth_um = float(max(0., -np.min(zs))*1e6)
    if width_um <= 0 or depth_um <= 0:
        result["reason"] = "Liquidus contour has no positive resolved width or depth"
        return result
    result.update(status="thermal-proxy", width_um=width_um, depth_um=depth_um)
    return result


def interpolated_peak_melt_pool(coordinates, temperature, surface, angle, dx, liquidus_K):
    """Width/depth from linear liquidus crossings on a Cartesian peak field.

    The field is the same accepted step selected by the cell-volume peak
    tracker. Contour vertices are reconstructed only between active neighboring
    cell centers; no boundary or surface extrapolation is performed.
    """
    xyz = np.asarray(coordinates, dtype=float)
    temperature = np.asarray(temperature, dtype=float).ravel()
    result = dict(status="inconclusive", operator="peak-liquidus-cell-edge-linear-contour-v1",
                  temporalSelection=PEAK_EXTRACTION,
                  contour="linear liquidus crossings between neighboring active cell centers",
                  surfaceTreatment="No temperature extrapolation to the model surface",
                  width_um=None, depth_um=None,
                  evidenceScope="Numerical thermal proxy; no experimental validation")
    if (xyz.ndim != 2 or xyz.shape[1] != 3 or len(xyz) != len(temperature)
            or not len(xyz) or not np.isfinite(xyz).all() or not np.isfinite(temperature).all()
            or not np.isfinite(surface) or not np.isfinite(angle) or not np.isfinite(dx)
            or not np.isfinite(liquidus_K) or dx <= 0):
        raise ValueError("Invalid peak field for interpolated melt-pool contour")
    indices = np.rint((xyz - xyz.min(axis=0)) / dx).astype(int)
    shape = tuple((indices.max(axis=0) + 1).tolist())
    expected = np.arange(len(xyz))
    linear = (indices[:, 0] * shape[1] + indices[:, 1]) * shape[2] + indices[:, 2]
    if (np.prod(shape) != len(xyz) or not np.array_equal(linear, expected)
            or not np.allclose(xyz, xyz.min(axis=0) + indices*dx, rtol=0, atol=dx*1e-6)):
        result["reason"] = "Peak field is not an ordered uniform Cartesian grid"
        return result
    if any(n < 2 for n in shape):
        result["reason"] = "Peak field has fewer than two centers on an axis"
        return result
    grid = xyz.reshape(*shape, 3)
    values = temperature.reshape(shape)
    active = grid[..., 2] < surface
    molten = (values >= liquidus_K) & active
    result["sampleCells"] = int(np.count_nonzero(molten))
    if not result["sampleCells"]:
        result["status"] = "no-melt"
        return result
    if (molten[0].any() or molten[-1].any() or molten[:, 0].any()
            or molten[:, -1].any() or molten[:, :, 0].any()):
        result["reason"] = "Liquidus contour reaches a lateral or bottom domain boundary"
        return result
    normal = np.array([-math.sin(math.radians(angle)), math.cos(math.radians(angle)), 0.])
    width_min, width_max, deepest = math.inf, -math.inf, math.inf
    crossing_count = 0
    for dimension in range(3):
        lower = [slice(None)]*3
        upper = [slice(None)]*3
        lower[dimension] = slice(None, -1)
        upper[dimension] = slice(1, None)
        lower, upper = tuple(lower), tuple(upper)
        pairs = ((values[lower] >= liquidus_K) != (values[upper] >= liquidus_K))
        pairs &= active[lower] & active[upper]
        if not pairs.any():
            continue
        fraction = (liquidus_K-values[lower][pairs]) / (values[upper][pairs]-values[lower][pairs])
        point = grid[lower][pairs] + fraction[:, None]*(grid[upper][pairs]-grid[lower][pairs])
        widths = point @ normal
        width_min = min(width_min, float(widths.min()))
        width_max = max(width_max, float(widths.max()))
        deepest = min(deepest, float(point[:, 2].min()))
        crossing_count += len(point)
    result["crossingCount"] = crossing_count
    if crossing_count < 2 or width_max <= width_min or deepest >= surface:
        result["reason"] = "Liquidus contour is not resolved between cell centers"
        return result
    result.update(status="thermal-proxy", width_um=(width_max-width_min)*1e6,
                  depth_um=(surface-deepest)*1e6)
    return result


class PeakMeltTracker:
    def __init__(self, coordinates, dx, material):
        self.xyz = np.asarray(coordinates)
        self.dx, self.m = dx, material
        self.count = self.sampled_count = 0
        self.state = None
        self.equal_maximum_count = 0
        self.first_equal_maximum_time = self.last_equal_maximum_time = None

    def observe(self, temperature, surface, angle, time, step, sampled=False):
        temperature = np.asarray(temperature).ravel()
        active = self.xyz[:, 2] < surface
        count = int(np.count_nonzero((temperature >= self.m['liquidus_K']) & active))
        if sampled:
            self.sampled_count = max(self.sampled_count, count)
        if count > self.count:
            self.count = count
            self.state = (temperature.copy(), active, surface, angle, float(time), int(step))
            self.equal_maximum_count = 1
            self.first_equal_maximum_time = self.last_equal_maximum_time = float(time)
        elif count > 0 and count == self.count:
            self.equal_maximum_count += 1
            self.last_equal_maximum_time = float(time)

    def finish(self, artifact_dir, observed_steps):
        metrics = dict(length_um=0., width_um=0., depth_um=0., volume_um3=0., crossSectionArea_um2=0.)
        time = step = None
        path = Path(artifact_dir)/'peak-field.npz' if artifact_dir else None
        if self.state is not None:
            temperature, active, surface, angle, time, step = self.state
            interpolated = interpolated_peak_melt_pool(
                self.xyz, temperature, surface, angle, self.dx, self.m['liquidus_K'])
            melt = (temperature >= self.m['liquidus_K']) & active
            x, y, z = self.xyz[melt].T
            c, s = math.cos(math.radians(angle)), math.sin(math.radians(angle))
            extent = self.dx*(abs(c)+abs(s))
            # Generated Cartesian x planes can differ by roundoff in OpenFOAM.
            planes = np.rint((x-self.xyz[:, 0].min())/self.dx).astype(int)
            metrics.update(length_um=float(np.ptp(x*c+y*s)+extent)*1e6,
                           width_um=float(np.ptp(-x*s+y*c)+extent)*1e6,
                           depth_um=max(0., surface-float(z.min())+self.dx/2)*1e6,
                           volume_um3=self.count*self.dx**3*1e18,
                           crossSectionArea_um2=float(np.bincount(planes).max())*self.dx**2*1e12)
            if path:
                np.savez_compressed(path, coordinates_m=self.xyz, T_K=temperature,
                                    active=active, liquid_fraction=np.clip((temperature-self.m['solidus_K'])/
                                    (self.m['liquidus_K']-self.m['solidus_K']), 0, 1)*active,
                                    surface_m=surface, scanAngle_deg=angle, time_s=time, step=step,
                                    liquidus_K=self.m['liquidus_K'], mesh_m=self.dx)
        elif path:
            path.unlink(missing_ok=True)
        if self.state is None:
            interpolated = dict(status="no-melt", operator="peak-liquidus-cell-edge-linear-contour-v1",
                                temporalSelection=PEAK_EXTRACTION, width_um=None, depth_um=None,
                                evidenceScope="Numerical thermal proxy; no experimental validation")
        diagnostics = dict(meltPoolExtraction=PEAK_EXTRACTION, peakMeltTime_s=time,
                           peakMeltStep=step, meltPoolObservedSteps=int(observed_steps),
                           peakMeltCellCount=self.count,
                           equalMaximumEndpointCount=self.equal_maximum_count,
                           firstEqualMaximumTime_s=self.first_equal_maximum_time,
                           lastEqualMaximumTime_s=self.last_equal_maximum_time,
                           sampledPeakMeltVolume_um3=self.sampled_count*self.dx**3*1e18,
                           peakMeltSamplingLossFraction=(self.count-self.sampled_count)/self.count if self.count else 0.,
                           interpolatedPeakMeltPool=interpolated)
        return metrics, diagnostics

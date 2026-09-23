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


class PeakMeltTracker:
    def __init__(self, coordinates, dx, material):
        self.xyz = np.asarray(coordinates)
        self.dx, self.m = dx, material
        self.count = self.sampled_count = 0
        self.state = None

    def observe(self, temperature, surface, angle, time, step, sampled=False):
        temperature = np.asarray(temperature).ravel()
        active = self.xyz[:, 2] < surface
        count = int(np.count_nonzero((temperature >= self.m['liquidus_K']) & active))
        if sampled:
            self.sampled_count = max(self.sampled_count, count)
        if count > self.count:
            self.count = count
            self.state = (temperature.copy(), active, surface, angle, float(time), int(step))

    def finish(self, artifact_dir, observed_steps):
        metrics = dict(length_um=0., width_um=0., depth_um=0., volume_um3=0., crossSectionArea_um2=0.)
        time = step = None
        path = Path(artifact_dir)/'peak-field.npz' if artifact_dir else None
        if self.state is not None:
            temperature, active, surface, angle, time, step = self.state
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
        diagnostics = dict(meltPoolExtraction=PEAK_EXTRACTION, peakMeltTime_s=time,
                           peakMeltStep=step, meltPoolObservedSteps=int(observed_steps),
                           sampledPeakMeltVolume_um3=self.sampled_count*self.dx**3*1e18,
                           peakMeltSamplingLossFraction=(self.count-self.sampled_count)/self.count if self.count else 0.)
        return metrics, diagnostics

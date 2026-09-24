import math
import numpy as np
from lpbf_material_registry import property_at as _registry_property_at
from lpbf_material_registry import enthalpy_table as _registry_enthalpy_table

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


def cell_weights(axis, z, dx, position, surface, radius, penetration, axis_y=None):
    """Unnormalized probability mass; z is clipped, mass cells are not cut cells."""
    axis_y = axis if axis_y is None else np.asarray(axis_y)
    gx = gaussian_interval(axis-dx/2, axis+dx/2, position[0], radius)
    gy = gaussian_interval(axis_y-dx/2, axis_y+dx/2, position[1], radius)
    gz = gaussian_interval(z-dx/2, np.minimum(z+dx/2, surface), surface, penetration)
    gz = np.where(z < surface, gz, 0.)
    return gx[:, None, None]*gy[None, :, None]*gz[None, None, :]


def integrated_source(axis, z, dx, segment, time, dt, surface, radius, penetration, power, axis_y=None):
    """Time-averaged volumetric power [W/m³] and minimum captured half-space mass."""
    axis_y = axis if axis_y is None else np.asarray(axis_y)
    source = np.zeros((len(axis), len(axis_y), len(z)))
    if segment is None:
        return source, 1.
    if dt <= 0 or time < segment["start_s"]-1e-13 or time+dt > segment["end_s"]+1e-13:
        raise ValueError("Source interval must remain inside one laser-on segment")
    start, stop = np.asarray(segment["start"]), np.asarray(segment["end"])
    minimum_capture = 1.
    for node in GAUSS_NODES:
        fraction = np.clip((time+node*dt-segment["start_s"])/(segment["end_s"]-segment["start_s"]), 0., 1.)
        position = start+fraction*(stop-start)
        weights = cell_weights(axis, z, dx, position, surface, radius, penetration, axis_y)
        total = float(weights.sum())
        if not math.isfinite(total) or total <= 0:
            raise ValueError("Gaussian source is outside the represented active domain")
        minimum_capture = min(minimum_capture, 2*total)
        source += weights*(.5*power/(total*dx**3))
    return source, minimum_capture

def calculate_mesh_domain(p):
    """Calculates the 3D computational domain size and discretization (SI units)."""
    radius = p["beamDiameter_um"] * 0.5e-6
    dx_requested = p["mesh_um"] * 1e-6
    span = p["trackLength_um"] * 1e-6 + (p["tracks"] - 1) * p["hatch_um"] * 1e-6 + 6 * radius
    layer_conforming = p.get("powderGridPolicy") == "layer-conforming"
    rectangular_corridor = (p.get("surfaceMode", "powder-layer") == "bare-plate"
                            and p.get("barePlateGeometry", "square") == "rectangular-corridor")
    if rectangular_corridor:
        # One +X track: preserve the full scan history in a centered frame.
        # The default retains twelve beam radii total; explicit widths support
        # bounded transverse-width sensitivity without changing the square path.
        span_y = (p.get("corridorWidth_um") or 12 * radius * 1e6) * 1e-6
        nx = int(math.ceil(span / dx_requested))
        dx = span / nx
        ny = int(math.ceil(span_y / dx))
        if ny % 2 == 0:
            ny += 1  # keep y=0 on a cell center for the centered single-track source
        nxy = nx  # compatibility alias for the legacy square-domain field
    elif layer_conforming:
        # Preserve whole-cell material semantics by placing z=0 and every
        # equal-thickness powder-layer surface on a cell face. Pad X/Y by less
        # than one cell when necessary so the grid remains cubic and centered.
        layer_m = p["layer_um"] * 1e-6
        layer_cells = max(1, int(math.ceil(layer_m / dx_requested - 1e-12)))
        dx = layer_m / layer_cells
        nxy_ratio = span / dx
        nxy_nearest = round(nxy_ratio)
        nxy = (int(nxy_nearest) if math.isclose(nxy_ratio, nxy_nearest, rel_tol=1e-12, abs_tol=1e-12)
               else int(math.ceil(nxy_ratio)))
        span = nxy * dx
        nx = ny = nxy
        span_y = span
    else:
        nxy = int(math.ceil(span / dx_requested))
        dx = span / nxy
        nx = ny = nxy
        span_y = span
    substrate_depth = math.ceil(max(300e-6, 4 * radius) / dx) * dx
    height = 0. if p.get("surfaceMode", "powder-layer") == "bare-plate" else p["layers"] * p["layer_um"] * 1e-6
    nz_ratio = (substrate_depth + height) / dx
    nz = int(round(nz_ratio)) if layer_conforming else int(math.ceil(nz_ratio))
    
    return {
        "radius": radius,
        "span": span,
        "span_x": span,
        "span_y": span_y,
        "effective_span_y": ny * dx,
        "nx": nx,
        "ny": ny,
        "nxy": nxy,
        "nz": nz,
        "dx": dx,
        "substrate_depth": substrate_depth
    }


def thermal_si_inputs(p, material):
    """Resolve shared reference/OpenFOAM thermal inputs to SI units."""
    return {
        "preheat_K": p["preheat_C"] + 273.15,
        "layer_m": p["layer_um"] * 1e-6,
        "speed_m_s": p["speed_mm_s"] * 1e-3,
        "absorbed_power_W": p["power_W"] * material["absorptivity"],
    }


def property_at(material, temperature, column):
    """Shared LPBF material-property interpolation boundary (temperature in K)."""
    return _registry_property_at(material, temperature, column)


def enthalpy_table(material):
    """Shared LPBF enthalpy boundary; preserves the versioned registry law."""
    return _registry_enthalpy_table(material)


def scan_segments(p):
    length, speed = p["trackLength_um"]*1e-6, p["speed_mm_s"]*1e-3
    time = 0.
    segments = []
    for layer in range(int(p["layers"])):
        theta = math.radians(p["scanAngle_deg"]+layer*p["layerRotation_deg"])
        u, v = np.array([math.cos(theta), math.sin(theta)]), np.array([-math.sin(theta), math.cos(theta)])
        tracks = int(p["tracks"])
        groups = []
        if p["strategy"] == "island":
            across = max(1, int(p["islandSize_um"]/p["hatch_um"]))
            columns = math.ceil(p["trackLength_um"]/p["islandSize_um"])
            for row_start in range(0,tracks,across):
                order = range(columns) if (row_start//across)%2 == 0 else reversed(range(columns))
                for col in order:
                    a = -length/2+col*length/columns
                    b = a+length/columns
                    groups.extend((track,a,b,(-1 if (track-row_start)%2 else 1),f"{row_start//across}:{col}")
                                  for track in range(row_start,min(tracks,row_start+across)))
        else:
            stripe_tracks = max(1,int(p["stripeWidth_um"]/p["hatch_um"]))
            for track in range(tracks):
                parity = track%stripe_tracks if p["strategy"] == "stripe" else track
                direction = -1 if p["strategy"] != "unidirectional" and parity%2 else 1
                groups.append((track,-length/2,length/2,direction,None))
        for track,a,b,direction,island in groups:
            offset = (track-(tracks-1)/2)*p["hatch_um"]*1e-6*v
            start,end = offset+(a if direction>0 else b)*u,offset+(b if direction>0 else a)*u
            duration = (b-a)/speed
            segments.append(dict(start_s=time,end_s=time+duration,start=start.tolist(),end=end.tolist(),
                                 layer=layer,track=track,island=island))
            time += duration+p["dwell_s"]
    return segments, time+p["cooling_s"]


def evaluate_material_properties(m, T):
    """
    Evaluates temperature-dependent material properties at temperature T (K).
    Returns density, thermal conductivity, specific heat, and dynamic viscosity.
    """
    rho = float(property_at(m, T, 1))
    k = float(property_at(m, T, 2))
    cp = float(property_at(m, T, 3))
    mu = float(property_at(m, T, 4))
    return rho, k, cp, mu

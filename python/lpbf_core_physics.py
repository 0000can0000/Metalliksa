import math
import numpy as np
from lpbf_material_registry import property_at as _registry_property_at
from lpbf_material_registry import enthalpy_table as _registry_enthalpy_table

def calculate_mesh_domain(p):
    """Calculates the 3D computational domain size and discretization (SI units)."""
    radius = p["beamDiameter_um"] * 0.5e-6
    dx_requested = p["mesh_um"] * 1e-6
    span = p["trackLength_um"] * 1e-6 + (p["tracks"] - 1) * p["hatch_um"] * 1e-6 + 6 * radius
    nxy = int(math.ceil(span / dx_requested))
    dx = span / nxy
    substrate_depth = math.ceil(max(300e-6, 4 * radius) / dx) * dx
    nz = int(math.ceil((substrate_depth + p["layers"] * p["layer_um"] * 1e-6) / dx))
    
    return {
        "radius": radius,
        "span": span,
        "nxy": nxy,
        "nz": nz,
        "dx": dx,
        "substrate_depth": substrate_depth
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

import math
import numpy as np

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
from lpbf_material_registry import property_at, enthalpy_table

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

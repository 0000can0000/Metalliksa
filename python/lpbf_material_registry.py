"""Versioned material evidence. Never silently substitute an unknown alloy.

Legacy solid/liquid values are retained, not promoted to measured curves.
Interpolation is an explicitly estimated constitutive law, not new literature data.
Additional alloy identities accept user-supplied, sourced property tables.
"""
import math
import numpy as np
from four_alloy_materials import four_alloy_thermophysical_db, resolve_alloy_id, THERMAL_NAME
from lpbf_thermal_solver import SECONDARY_THERMOPHYSICAL_DB

VERSION = "lpbf-materials-1"
LEGACY = {**four_alloy_thermophysical_db(), **SECONDARY_THERMOPHYSICAL_DB}
NAMES = ["Ti-6Al-4V", "316L Stainless Steel", "AlSi10Mg", "Inconel 718",
         *SECONDARY_THERMOPHYSICAL_DB,
         "Inconel 625", "17-4PH", "15-5PH", "Maraging Steel 18Ni300",
         "AlSi7Mg", "CuCrZr", "Ti-5553"]


def catalog():
    return [{"name": n, "quality": "estimated" if n in LEGACY else "missing",
             "available": n in LEGACY,
             "note": "Legacy solid/liquid endpoints; estimated interpolation, constant viscosity."
             if n in LEGACY else "Supply a sourced property table; no surrogate alloy is substituted."}
            for n in NAMES]


def material(name, supplied=None):
    aid = resolve_alloy_id(name)
    name = THERMAL_NAME[aid] if aid else name
    if name not in NAMES:
        raise ValueError("Unknown alloy identity")
    if supplied is not None:
        m = dict(supplied)
        if not isinstance(m.get("source"), str) or not m["source"].strip():
            raise ValueError("A property-table source is required")
        m["quality"] = "user-supplied-unverified"
    else:
        if name not in LEGACY:
            raise ValueError(f"{name}: thermophysical data missing; supply sourced properties")
        p = LEGACY[name]
        m = dict(solidus_K=p["solidus_C"]+273.15, liquidus_K=p["liquidus_C"]+273.15,
                 boiling_K=p["boiling_C"]+273.15, latentHeat_J_kg=p["latent_heat_fusion_J_kg"],
                 absorptivity=p["absorptivity_IR"], emissivity=0.35,
                 dGamma_dT=p["d_gamma_dT_N_mK"],
                 source="Existing four_alloy_materials.py / lpbf_thermal_solver.py; endpoint provenance not independently verified",
                 quality="estimated")
        m["table"] = [[t, rho, k, cp, p["viscosity_Pa_s"]] for t, rho, k, cp in [
            (273.15, p["density_kg_m3"], p["thermal_conductivity_W_mK"], p["specific_heat_J_kgK"]),
            (m["liquidus_K"], p["density_liquid_kg_m3"], p["thermal_conductivity_liquid_W_mK"], p["specific_heat_liquid_J_kgK"]),
            (m["boiling_K"], p["density_liquid_kg_m3"], p["thermal_conductivity_liquid_W_mK"], p["specific_heat_liquid_J_kgK"])]]
    for key in ("solidus_K", "liquidus_K", "boiling_K", "latentHeat_J_kg", "absorptivity", "emissivity", "dGamma_dT"):
        if isinstance(m.get(key), bool) or not isinstance(m.get(key), (int, float)) or not math.isfinite(m[key]):
            raise ValueError(f"Invalid material property: {key}")
    if m["solidus_K"] == m["liquidus_K"]:
        m["physicalMeltingPoint_K"] = m["solidus_K"]
        m["phaseRegularization_K"] = 1.
        m["solidus_K"] -= .5; m["liquidus_K"] += .5
        m["source"] += "; pure-metal latent heat regularized over 1 K for numerical inversion"
    if not 0 < m["solidus_K"] < m["liquidus_K"] < m["boiling_K"] <= 10000:
        raise ValueError("Require 0 < solidus < liquidus < boiling <= 10000 K")
    if not 0 < m["latentHeat_J_kg"] <= 2e6 or not 0 < m["absorptivity"] <= 1 or not 0 <= m["emissivity"] <= 1:
        raise ValueError("Invalid latent heat / optical properties")
    a = np.asarray(m.get("table"), dtype=float)
    if a.ndim != 2 or a.shape[1] != 5 or not 2 <= len(a) <= 200 or not np.isfinite(a).all():
        raise ValueError("table rows must be [T_K, rho_kg_m3, k_W_mK, cp_J_kgK, viscosity_Pa_s]")
    if (a <= 0).any() or (np.diff(a[:, 0]) <= 0).any() or a[0, 0] > 273.15 or a[-1, 0] < m["boiling_K"]:
        raise ValueError("Positive properties, increasing temperatures and full temperature coverage required")
    for col, lo, hi in ((1, 100, 30000), (2, .01, 2000), (3, 50, 10000), (4, 1e-5, 10)):
        if (a[:, col] < lo).any() or (a[:, col] > hi).any():
            raise ValueError(f"Property column {col} outside physical model bounds [{lo}, {hi}]")
    if abs(m["dGamma_dT"]) > .01:
        raise ValueError("Surface tension slope outside model bounds")
    m.update(name=name, version=VERSION, table=a.tolist())
    return m


def property_at(m, temperature, column):
    a = np.asarray(m["table"])
    return np.interp(temperature, a[:, 0], a[:, column])


def enthalpy_table(m):
    """Integrate piecewise-linear cp exactly; resolve latent heat at phase boundaries."""
    t = np.unique(np.r_[np.linspace(273.15, m["boiling_K"], 12000),
                        np.asarray(m["table"])[:, 0], m["solidus_K"], m["liquidus_K"]])
    cp = property_at(m, t, 3)
    h = np.r_[0, np.cumsum(np.diff(t)*(cp[1:]+cp[:-1])/2)]
    h += m["latentHeat_J_kg"]*np.clip((t-m["solidus_K"])/(m["liquidus_K"]-m["solidus_K"]), 0, 1)
    return t, h

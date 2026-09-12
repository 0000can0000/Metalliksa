#!/usr/bin/env python3
"""
Heiple–Roper Marangoni screening (not Navier–Stokes CFD).

Heiple & Roper, *Welding Journal* 61 (1982) / follow-on 1983: surface-active S (or O)
flips ∂γ/∂T and therefore the surface-flow direction — outward (wide, shallow) when
∂γ/∂T < 0, inward (narrow, deep) when ∂γ/∂T > 0.

Inversion band 30–60 ppm S is the welding / LPBF review range (Heiple–Roper;
Ebrahimi et al., *Int. J. Heat Mass Transfer* 2021, DOI 10.1016/j.ijheatmasstransfer.2020.120801).
Alloy ∂γ/∂T comes from `four_alloy_materials.py`. This module does **not** refit W/D.
"""

from __future__ import annotations

import math

MODEL_ID = "marangoni-heiple-v1"
SULFUR_OUTWARD_PPM = 30.0
SULFUR_INWARD_PPM = 60.0


def heiple_roper_d_gamma_dT(d_gamma_pure_N_mK: float, sulfur_ppm: float) -> float:
    """Linear blend across the 30–60 ppm inversion band. Sign follows Heiple–Roper."""
    s = max(0.0, float(sulfur_ppm))
    mag = abs(float(d_gamma_pure_N_mK))
    if mag < 1e-9:
        return 0.0
    low_s = -mag if d_gamma_pure_N_mK <= 0.0 else float(d_gamma_pure_N_mK)
    high_s = mag
    if s <= SULFUR_OUTWARD_PPM:
        return low_s
    if s >= SULFUR_INWARD_PPM:
        return high_s
    blend = (s - SULFUR_OUTWARD_PPM) / (SULFUR_INWARD_PPM - SULFUR_OUTWARD_PPM)
    return low_s + (high_s - low_s) * blend


def marangoni_screening(
    d_gamma_pure_N_mK: float,
    viscosity_Pa_s: float,
    alpha_m2_s: float,
    density_kg_m3: float,
    half_width_m: float,
    T_surface_C: float,
    T_liquidus_C: float,
    sulfur_ppm: float = 15.0,
) -> dict:
    """Dimensionless Ma / Pe_Ma and flow direction. Geometry stays thermal."""
    d_gamma = heiple_roper_d_gamma_dT(d_gamma_pure_N_mK, sulfur_ppm)
    delta_T = max(10.0, float(T_surface_C) - float(T_liquidus_C))
    L = max(4e-6, float(half_width_m))
    mu = max(1e-6, float(viscosity_Pa_s))
    alpha = max(1e-12, float(alpha_m2_s))
    rho = max(100.0, float(density_kg_m3))

    Ma = (abs(d_gamma) * delta_T * L) / (mu * alpha)
    # Inertial thermocapillary scale (same form as the existing pore-instability lab).
    u_m_s = math.sqrt((abs(d_gamma) * delta_T) / rho)
    Pe_Ma = (u_m_s * L) / alpha
    if d_gamma > 0.0:
        direction = "inward"
        aspect_note = "Heiple–Roper: inward jet — deeper / narrower pool expected (not applied to W/D)."
    elif d_gamma < 0.0:
        direction = "outward"
        aspect_note = "Heiple–Roper: outward rolls — wider / shallower pool expected (not applied to W/D)."
    else:
        direction = "neutral"
        aspect_note = "∂γ/∂T ≈ 0 in the 30–60 ppm inversion band."

    return {
        "modelId": MODEL_ID,
        "dGamma_dT_N_mK": float(d_gamma),
        "sulfur_ppm": float(sulfur_ppm),
        "flowDirection": direction,
        "marangoniNumber": float(Ma),
        "surfaceVelocity_m_s": float(u_m_s),
        "pecletMarangoni": float(Pe_Ma),
        "geometrySource": "thermal",
        "aspectNote": aspect_note,
        "doi": "10.1016/j.ijheatmasstransfer.2020.120801",
    }

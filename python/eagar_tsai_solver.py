#!/usr/bin/env python3
"""
Eagar–Tsai 3D traveling Gaussian heat source (Welding Journal, Dec 1983, 346-s–354-s).

Quasi-steady temperature on a semi-infinite solid. The dimensionless integral
matches METALLURGY_VALIDATION.md §2.3 with the LPBF 1/e² beam radius r0
(q = 2 ηP / (π r0²) exp(−2 r²/r0²); σ = r0/2).

Conduction only: no Marangoni advection, no recoil keyhole. Finite peak T
and explicit spot-size dependence are the physical gains over a point source.
"""

from __future__ import annotations

import math

import numpy as np
from numpy.polynomial.legendre import leggauss

MODEL_ID = "eagar-tsai-v1"

# Gauss–Legendre nodes on [−1, 1]; mapped to u ∈ [0, u_max], τ = u².
_GL_N = 64
_GL_XI, _GL_W = leggauss(_GL_N)


def _as_float64(value):
    return np.asarray(value, dtype=np.float64)


class EagarTsaiField:
    """Cached quadrature for T(x, y, z) in the laser-attached frame (laser at origin, +x travel)."""

    def __init__(self, T0_C: float, P_eff: float, k_th: float, alpha_th: float, r0_m: float):
        self.T0_C = float(T0_C)
        self.P_eff = float(P_eff)
        self.k_th = max(1e-6, float(k_th))
        self.alpha_th = max(1e-12, float(alpha_th))
        self.r0_m = max(1e-7, float(r0_m))
        # n* uses an arbitrary ΔT scale that cancels when converting θ → T.
        self._dT_ref = 1.0
        self.n_star = self.P_eff / (math.pi * self.k_th * self.r0_m * self._dT_ref)
        self.v_star = 0.0  # set in bind_speed
        self._u = None
        self._w = None
        self._tau = None
        self._den = None
        self._pref = self.n_star / math.sqrt(2.0 * math.pi)

    def bind_speed(self, v_scan_m_s: float) -> "EagarTsaiField":
        v = max(1e-6, float(v_scan_m_s))
        self.v_star = v * self.r0_m / (2.0 * self.alpha_th)
        tau_max = max(16.0 / max(self.v_star, 0.08), 24.0)
        u_max = math.sqrt(tau_max)
        # Map ξ ∈ [−1, 1] → u ∈ [0, u_max]
        self._u = 0.5 * u_max * (_GL_XI + 1.0)
        self._w = _GL_W * (0.5 * u_max)
        self._tau = self._u * self._u
        self._den = self._tau + 1.0
        return self

    def temperature_C(self, x_m, y_m, z_m):
        """Scalar or numpy array temperature in °C. z ≥ 0 is depth into the solid."""
        if self._tau is None:
            raise RuntimeError("EagarTsaiField.bind_speed() must be called first.")
        x = _as_float64(x_m)
        y = _as_float64(y_m)
        z = _as_float64(np.abs(z_m))
        scalar = x.ndim == 0 and y.ndim == 0 and z.ndim == 0
        x = np.atleast_1d(x)
        y = np.atleast_1d(y)
        z = np.atleast_1d(z)
        # Broadcast to a common point cloud.
        x, y, z = np.broadcast_arrays(x, y, z)
        shape = x.shape
        x = x.reshape(-1)
        y = y.reshape(-1)
        z = z.reshape(-1)

        s2 = math.sqrt(2.0)
        x_s = s2 * x / self.r0_m
        y_s = s2 * y / self.r0_m
        z_s = s2 * z / self.r0_m

        tau = self._tau[:, None]
        den = self._den[:, None]
        u = self._u[:, None]
        w = self._w[:, None]

        dx = x_s[None, :] - self.v_star * tau
        # τ = u², dτ = 2u du → τ^{−1/2} dτ = 2 du, integrand becomes 2/(τ+1) exp(...)
        z2 = z_s[None, :] ** 2
        u2 = u * u
        z_term = np.divide(z2, 2.0 * u2, out=np.zeros_like(z2, dtype=np.float64), where=u2 > 1e-18)
        z_term = np.where((u2 <= 1e-18) & (z2 > 0.0), 1.0e6, z_term)
        expo = -((dx * dx + (y_s[None, :] ** 2)) / (2.0 * den)) - z_term
        expo = np.clip(expo, -60.0, 20.0)
        integrand = (2.0 / den) * np.exp(expo)
        theta = self._pref * np.sum(w * integrand, axis=0)
        T = self.T0_C + theta * self._dT_ref
        T = T.reshape(shape)
        if scalar:
            return float(T.reshape(-1)[0])
        return T


def eagar_tsai_temperature_C(x_m, y_m, z_m, T0_C, P_eff, k_th, v_scan, alpha_th, r0_m):
    field = EagarTsaiField(T0_C, P_eff, k_th, alpha_th, r0_m).bind_speed(v_scan)
    return field.temperature_C(x_m, y_m, z_m)

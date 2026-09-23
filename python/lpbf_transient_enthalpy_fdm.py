import numpy as np


def _temperature_from_enthalpy(enthalpy, rho, cp, latent_heat, solidus, liquidus):
    """Invert a linear solid/mushy/liquid specific-enthalpy law."""
    h_solidus = rho * cp * solidus
    h_liquidus = rho * (cp * liquidus + latent_heat)
    return np.where(
        enthalpy < h_solidus,
        enthalpy / (rho * cp),
        np.where(
            enthalpy <= h_liquidus,
            solidus + (liquidus - solidus) * (enthalpy - h_solidus) / (h_liquidus - h_solidus),
            liquidus + (enthalpy - h_liquidus) / (rho * cp),
        ),
    )


def _enthalpy_from_temperature(temperature, rho, cp, latent_heat, solidus, liquidus):
    """Evaluate the same linear phase-change law used by the inverse."""
    h_solidus = rho * cp * solidus
    h_liquidus = rho * (cp * liquidus + latent_heat)
    return np.where(
        temperature < solidus,
        rho * cp * temperature,
        np.where(
            temperature <= liquidus,
            h_solidus + (h_liquidus - h_solidus) * (temperature - solidus) / (liquidus - solidus),
            h_liquidus + rho * cp * (temperature - liquidus),
        ),
    )


def _conduction_rate(temperature, conductivity, dx, dz):
    """Conservative two-dimensional face fluxes with adiabatic outer faces."""
    # Thermal state and material properties are physical floating-point fields.
    # Preserve that dtype even if a caller supplies integer-valued temperatures;
    # otherwise zeros_like would silently truncate every face-flux update.
    temperature = np.asarray(temperature, dtype=float)
    conductivity = np.asarray(conductivity, dtype=float)
    rate = np.zeros_like(temperature)
    face_x = 2 * conductivity[:, :-1] * conductivity[:, 1:] / (
        conductivity[:, :-1] + conductivity[:, 1:]
    )
    flux_x = face_x * (temperature[:, 1:] - temperature[:, :-1]) / dx**2
    rate[:, :-1] += flux_x
    rate[:, 1:] -= flux_x
    face_z = 2 * conductivity[:-1, :] * conductivity[1:, :] / (
        conductivity[:-1, :] + conductivity[1:, :]
    )
    flux_z = face_z * (temperature[1:, :] - temperature[:-1, :]) / dz**2
    rate[:-1, :] += flux_z
    rate[1:, :] -= flux_z
    return rate


class TransientEnthalpyFDMSolver:
    """
    Phase 21 stationary two-dimensional cross-section thermal screening solver.

    The scan-speed argument is retained for the API but cannot be represented by
    this stationary cross-section model. Results are not validated melt-pool data.
    """
    def __init__(self, nx=100, nz=50, dx=2e-6, dz=2e-6):
        self.nx = nx
        self.nz = nz
        self.dx = dx
        self.dz = dz
        
    def solve_meltpool_cross_section(self, power_W, speed_m_s, T_preheat_K, rho, cp, k_solid, k_liquid, latent_heat_J_kg, T_solidus, T_liquidus, sim_time_s=1e-3, dt=1e-6):
        positive = (self.dx, self.dz, power_W, speed_m_s, T_preheat_K, rho, cp,
                    k_solid, k_liquid, latent_heat_J_kg, sim_time_s, dt)
        if self.nx < 2 or self.nz < 2 or any(not np.isfinite(value) or value <= 0 for value in positive):
            raise ValueError("Positive finite dimensions and physical inputs are required")
        if not np.isfinite(T_solidus) or not np.isfinite(T_liquidus) or T_liquidus <= T_solidus:
            raise ValueError("Liquidus must exceed solidus")
        # Initialize temperature and enthalpy fields
        T = np.full((self.nz, self.nx), float(T_preheat_K))
        H = _enthalpy_from_temperature(T, rho, cp, latent_heat_J_kg, T_solidus, T_liquidus)
        
        # Explicit two-axis stability bound uses the largest possible k.
        alpha_max = max(k_solid, k_liquid) / (rho * cp)
        stable_dt = 0.4 / (alpha_max * (self.dx**-2 + self.dz**-2))
        steps = max(1, int(np.ceil(sim_time_s / min(dt, stable_dt))))
        step_dt = sim_time_s / steps
        
        # Laser parameters (Gaussian surface flux)
        beam_radius = 30e-6
        # Stationary transverse profile; this 2D source does not resolve travel.
        x_coords = (np.arange(self.nx) - (self.nx - 1) / 2) * self.dx
        laser_intensity = (2.0 * power_W * 0.4 / (np.pi * beam_radius**2)) * np.exp(-2.0 * (x_coords / beam_radius)**2)
        
        for _ in range(steps):
            liquid_fraction = np.clip((T - T_solidus) / (T_liquidus - T_solidus), 0, 1)
            conductivity = k_solid + (k_liquid - k_solid) * liquid_fraction
            q_conduct = _conduction_rate(T, conductivity, self.dx, self.dz)
            
            # Update enthalpy
            H_new = H + step_dt * q_conduct
            
            # Apply laser heat flux at the top surface (z=0)
            H_new[0, :] += step_dt * (laser_intensity / self.dz)
            
            T = _temperature_from_enthalpy(
                H_new, rho, cp, latent_heat_J_kg, T_solidus, T_liquidus
            )
            H = H_new
            
        # Compute Melt Pool Dimensions
        melted = T >= T_liquidus
        if np.any(melted):
            # Depth: max z index where melted is true
            z_indices, x_indices = np.where(melted)
            depth_um = (np.max(z_indices) + 1) * self.dz * 1e6
            width_um = (np.max(x_indices) - np.min(x_indices) + 1) * self.dx * 1e6
        else:
            depth_um = 0.0
            width_um = 0.0

        return {
            "melt_pool_width_um": float(width_um),
            "melt_pool_depth_um": float(depth_um),
            "max_temperature_K": float(np.max(T)),
            "is_physically_accurate": False,
            "latent_heat_accounted": True,
            "model_scope": "stationary-2d-cross-section-screening",
            "ignored_inputs": ["speed_m_s"],
            "limitations": [
                "Fixed 30 um beam radius and 0.4 absorptivity",
                "2D heat input has no resolved out-of-plane power normalization",
                "No scan travel or independent experimental validation",
            ],
        }

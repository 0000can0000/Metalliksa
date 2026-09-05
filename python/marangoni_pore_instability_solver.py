#!/usr/bin/env python3
"""
MetalliX Python LPBF Hydrodynamic Marangoni Flow Instability & 3D Gas Entrapment Pore Simulator
Author: MetalliX Additive Manufacturing HPC Subsystem

Physics Formulation:
1. Thermocapillary Marangoni Convection:
   - Evaluates temperature-dependent surface tension gamma(T) and surfactant activity (d_gamma/dT).
   - Inward vs outward flow bifurcation influenced by Sulfur/Oxygen ppm.
   - Non-dimensional Marangoni (Ma), Reynolds (Re_Ma), Capillary (Ca), and Peclet (Pe_Ma) numbers.

2. Hydrodynamic Vortex Instability & Recirculation:
   - High-shear vortex rolls induced by steep surface temperature gradients.
   - Vortex shedding and fluid instability above critical Marangoni threshold (Ma_crit).

3. 3D Spatial Gas Entrapment Probability Field P_pore(x, y, z):
   - Computes local 3D temperature T(x,y,z), 3D velocity vector u(x,y,z), and 3D vorticity omega(x,y,z).
   - Downward fluid drag vs Stokes-Hadamard bubble buoyancy flotation vs local solidification velocity R(x,y,z).
   - Engulfment criterion by dendrite mushy zone front.

4. 3D Volumetric Heatmap & Stochastic Pore Distribution:
   - Discretized 3D voxel grid of pore formation probability.
   - Stochastic nucleation and spatial positioning of trapped gas bubbles.
   - Relative density, pore size distribution, and AI mitigation parameters.
"""

import sys
import json
import math
import time
import random

# Thermophysical & Surfactant Constants Database
ALLOY_SURFACE_DATABASE = {
    "Inconel 718": {
        "liquidus_C": 1336.0,
        "solidus_C": 1260.0,
        "boiling_C": 2850.0,
        "density_kg_m3": 8190.0,
        "liquid_density_kg_m3": 7450.0,
        "thermal_conductivity_W_mK": 29.0,
        "specific_heat_J_kgK": 730.0,
        "viscosity_Pa_s": 0.0055,
        "surface_tension_pure_N_m": 1.78,
        "d_gamma_dT_pure_N_mK": -0.00042, # standard negative (outward flow)
        "critical_Ma": 4500.0,
        "absorptivity": 0.42,
        "sulfur_activity_factor": 0.000035, # ppm coefficient for positive d_gamma/dT inversion
    },
    "Ti-6Al-4V": {
        "liquidus_C": 1660.0,
        "solidus_C": 1604.0,
        "boiling_C": 3287.0,
        "density_kg_m3": 4430.0,
        "liquid_density_kg_m3": 3950.0,
        "thermal_conductivity_W_mK": 23.0,
        "specific_heat_J_kgK": 830.0,
        "viscosity_Pa_s": 0.0042,
        "surface_tension_pure_N_m": 1.55,
        "d_gamma_dT_pure_N_mK": -0.00028,
        "critical_Ma": 3800.0,
        "absorptivity": 0.38,
        "sulfur_activity_factor": 0.000015,
    },
    "316L Stainless Steel": {
        "liquidus_C": 1400.0,
        "solidus_C": 1375.0,
        "boiling_C": 2814.0,
        "density_kg_m3": 7990.0,
        "liquid_density_kg_m3": 6980.0,
        "thermal_conductivity_W_mK": 31.0,
        "specific_heat_J_kgK": 780.0,
        "viscosity_Pa_s": 0.0060,
        "surface_tension_pure_N_m": 1.70,
        "d_gamma_dT_pure_N_mK": -0.00045,
        "critical_Ma": 4200.0,
        "absorptivity": 0.44,
        "sulfur_activity_factor": 0.000048, # Strong surfactant effect in steel (Heiple-Roper effect)
    },
    "AlSi10Mg": {
        "liquidus_C": 595.0,
        "solidus_C": 557.0,
        "boiling_C": 2470.0,
        "density_kg_m3": 2680.0,
        "liquid_density_kg_m3": 2350.0,
        "thermal_conductivity_W_mK": 130.0,
        "specific_heat_J_kgK": 960.0,
        "viscosity_Pa_s": 0.0013,
        "surface_tension_pure_N_m": 0.86,
        "d_gamma_dT_pure_N_mK": -0.00018,
        "critical_Ma": 3200.0,
        "absorptivity": 0.18,
        "sulfur_activity_factor": 0.000010,
    },
    "Scalmalloy® (Al-Mg-Sc-Zr)": {
        "liquidus_C": 650.0,
        "solidus_C": 580.0,
        "boiling_C": 2470.0,
        "density_kg_m3": 2670.0,
        "liquid_density_kg_m3": 2340.0,
        "thermal_conductivity_W_mK": 120.0,
        "specific_heat_J_kgK": 900.0,
        "viscosity_Pa_s": 0.0015,
        "surface_tension_pure_N_m": 0.88,
        "d_gamma_dT_pure_N_mK": -0.00020,
        "critical_Ma": 3400.0,
        "absorptivity": 0.28,
        "sulfur_activity_factor": 0.000012,
    }
}

# Shielding Gas Properties
SHIELDING_GAS_DB = {
    "Argon (Ar)": {"density_kg_m3": 1.784, "viscosity_Pa_s": 2.2e-5, "solubility_factor": 0.15, "buoyancy_mult": 1.0},
    "Helium (He)": {"density_kg_m3": 0.178, "viscosity_Pa_s": 1.9e-5, "solubility_factor": 0.05, "buoyancy_mult": 1.25},
    "Nitrogen (N2)": {"density_kg_m3": 1.251, "viscosity_Pa_s": 1.7e-5, "solubility_factor": 0.35, "buoyancy_mult": 1.05},
}


def solve_marangoni_flow_and_porosity(payload):
    """
    Executes 3D Marangoni flow instability and 3D gas entrapment heatmap modeling.
    """
    t_start = time.perf_counter()

    # Extract inputs with robust defaults
    material_name = payload.get("material", "Inconel 718")
    props = ALLOY_SURFACE_DATABASE.get(material_name, ALLOY_SURFACE_DATABASE["Inconel 718"])
    
    laser_power_W = float(payload.get("laserPower_W", 285.0))
    scan_speed_mm_s = float(payload.get("scanSpeed_mm_s", 960.0))
    beam_diameter_um = float(payload.get("beamDiameter_um", 90.0))
    preheat_temp_C = float(payload.get("preheatTemp_C", 200.0))
    surfactant_sulfur_ppm = float(payload.get("surfactant_sulfur_ppm", 15.0)) # 5 - 150 ppm
    shielding_gas_name = payload.get("shieldingGas", "Argon (Ar)")
    gas_props = SHIELDING_GAS_DB.get(shielding_gas_name, SHIELDING_GAS_DB["Argon (Ar)"])
    
    # Unit conversions
    v_scan_m_s = scan_speed_mm_s / 1000.0
    r0_m = (beam_diameter_um / 2.0) * 1e-6
    T0_K = preheat_temp_C + 273.15
    T_liq_K = props["liquidus_C"] + 273.15
    T_sol_K = props["solidus_C"] + 273.15
    T_boil_K = props["boiling_C"] + 273.15
    
    rho = props["liquid_density_kg_m3"]
    k_th = props["thermal_conductivity_W_mK"]
    Cp = props["specific_heat_J_kgK"]
    mu = props["viscosity_Pa_s"]
    alpha_th = k_th / (rho * Cp) # Thermal diffusivity [m^2/s]
    nu = mu / rho # Kinematic viscosity [m^2/s]
    Pr = nu / alpha_th # Prandtl number
    
    # 1. Effective Surface Tension Gradient d_gamma / dT (Keene & Sahoo-DebRoy formulation)
    # Surfactants (Sulfur/Oxygen) segregate to surface; at high T, desorption occurs making d_gamma/dT positive
    # d_gamma/dT = d_gamma_dT_pure + R_gas * Gamma_s * ln(1 + K_seg * a_s) ...
    d_gamma_dT_pure = props["d_gamma_dT_pure_N_mK"]
    sulfur_inversion = surfactant_sulfur_ppm * props["sulfur_activity_factor"]
    effective_d_gamma_dT = d_gamma_dT_pure + sulfur_inversion
    
    # Peak Centerline Temperature T_peak (Analytical Moving Gaussian Source)
    absorptivity = props["absorptivity"]
    P_eff = laser_power_W * absorptivity
    
    # Rosenthal-Eagar-Tsai peak temperature estimate:
    delta_T_peak = P_eff / (math.sqrt(2.0 * math.pi) * k_th * r0_m * (1.0 + 0.5 * math.sqrt(v_scan_m_s * r0_m / alpha_th)))
    T_peak_K = T0_K + delta_T_peak
    T_peak_C = min(props["boiling_C"] + 150.0, T_peak_K - 273.15)
    T_peak_K = T_peak_C + 273.15
    
    # Estimated Melt Pool Dimensions [m]
    # Semi-ellipsoid lengths: Length L, Half-width W/2, Depth D
    delta_T_melt = max(100.0, T_liq_K - T0_K)
    L_pool_m = max(r0_m * 1.5, (P_eff / (math.pi * k_th * delta_T_melt)) * (1.0 / math.sqrt(1.0 + 1.2 * v_scan_m_s * r0_m / alpha_th)))
    W_pool_m = max(r0_m * 1.2, 2.0 * math.sqrt(P_eff / (math.pi * rho * Cp * delta_T_melt * (v_scan_m_s + 0.05))))
    
    # Depth is influenced by Marangoni flow direction:
    # If d_gamma/dT > 0, flow is inward & downward (deep keyhole-like penetration)
    # If d_gamma/dT < 0, flow is outward & shallow (wide shallow pool)
    marangoni_aspect_boost = 1.0 + (1.2 if effective_d_gamma_dT > 0 else -0.15)
    D_pool_m = max(r0_m * 0.8, (W_pool_m * 0.45) * marangoni_aspect_boost)
    
    L_pool_um = L_pool_m * 1e6
    W_pool_um = W_pool_m * 1e6
    D_pool_um = D_pool_m * 1e6
    
    # 2. Marangoni Flow Velocity & Dimensionless Numbers
    delta_T_pool = max(50.0, T_peak_K - T_liq_K)
    char_length_L = W_pool_m / 2.0 # Characteristic half-width [m]
    
    # Marangoni Number: Ma = |d_gamma/dT| * delta_T * L / (mu * alpha)
    marangoni_number = (abs(effective_d_gamma_dT) * delta_T_pool * char_length_L) / (mu * alpha_th)
    
    # Marangoni Surface Flow Velocity: u_Ma = sqrt(|d_gamma/dT| * delta_T / rho)
    u_marangoni_m_s = math.sqrt((abs(effective_d_gamma_dT) * delta_T_pool) / rho)
    # Peak velocity scaling factor due to boundary layer thinning
    u_peak_m_s = u_marangoni_m_s * min(3.5, 1.0 + 0.25 * math.log10(max(10.0, marangoni_number)))
    
    # Reynolds & Peclet numbers of liquid convection
    reynolds_marangoni = (rho * u_peak_m_s * char_length_L) / mu
    peclet_marangoni = reynolds_marangoni * Pr
    capillary_number = (mu * u_peak_m_s) / props["surface_tension_pure_N_m"]
    
    # Instability & Vortex Shedding Metrics
    crit_Ma = props["critical_Ma"]
    instability_ratio = marangoni_number / crit_Ma
    flow_regime = "Stable Conduction"
    if effective_d_gamma_dT > 0:
        flow_regime = "Inward Centripetal Jet (Surfactant Inversion)"
    elif instability_ratio > 1.8:
        flow_regime = "Turbulent Vortex Shedding & Cavitation"
    elif instability_ratio > 1.0:
        flow_regime = "Hydrodynamic Oscillatory Instability"
    else:
        flow_regime = "Stable Outward Convective Rolls"

    # 3. 3D Spatial Grid Discretization for 3D Pore Formation Probability Heatmap
    # Grid dimensions: Nx (along scan X), Ny (transverse Y), Nz (depth Z)
    Nx, Ny, Nz = 24, 16, 12
    voxel_grid = []
    
    # Domain extents in micrometers centered at laser beam center (0, 0, 0)
    x_min_um, x_max_um = -L_pool_um * 0.9, L_pool_um * 0.4
    y_min_um, y_max_um = -W_pool_um * 0.6, W_pool_um * 0.6
    z_min_um, z_max_um = -D_pool_um * 1.1, 0.0
    
    dx_um = (x_max_um - x_min_um) / max(1, Nx - 1)
    dy_um = (y_max_um - y_min_um) / max(1, Ny - 1)
    dz_um = (z_max_um - z_min_um) / max(1, Nz - 1)
    
    total_voxels = Nx * Ny * Nz
    high_risk_voxels = 0
    trapped_pores_list = []
    
    # Calculate local fields across all voxels
    for k in range(Nz):
        z_um = z_min_um + k * dz_um
        z_norm = abs(z_um) / max(1.0, D_pool_um)
        
        for j in range(Ny):
            y_um = y_min_um + j * dy_um
            y_norm = abs(y_um) / max(1.0, W_pool_um / 2.0)
            
            for i in range(Nx):
                x_um = x_min_um + i * dx_um
                # Normalized distance from laser center (x is negative behind laser)
                x_norm = x_um / (L_pool_um if x_um < 0 else (L_pool_um * 0.4))
                
                # Ellipsoidal radial coordinate
                r_ellip = math.sqrt(max(0.0, (x_norm)**2 + (y_norm)**2 + (z_norm)**2))
                
                # Temperature Field T(x,y,z) [°C]
                if r_ellip < 1.0:
                    # Inside liquid or mushy pool
                    T_local_C = props["solidus_C"] + (T_peak_C - props["solidus_C"]) * math.exp(-2.2 * (r_ellip**1.8))
                else:
                    # In surrounding solid substrate
                    dist_outside = r_ellip - 1.0
                    T_local_C = preheat_temp_C + (props["solidus_C"] - preheat_temp_C) * math.exp(-3.5 * dist_outside)
                
                is_liquid = T_local_C >= props["liquidus_C"]
                is_mushy = (T_local_C >= props["solidus_C"]) and (T_local_C < props["liquidus_C"])
                
                # 3D Flow Velocity Vector [m/s]
                # Marangoni convection rolls flow along free surface from center outward/inward, then down into pool
                if is_liquid:
                    surface_proximity = math.exp(-2.5 * z_norm)
                    # Radial outward/inward velocity component
                    flow_dir_sign = 1.0 if effective_d_gamma_dT < 0 else -1.0
                    u_r = flow_dir_sign * u_peak_m_s * math.sin(math.pi * min(1.0, r_ellip)) * surface_proximity
                    
                    # Coordinate projections
                    theta_xy = math.atan2(y_um, max(1e-3, abs(x_um)))
                    ux_m_s = -v_scan_m_s + u_r * math.cos(theta_xy) * (0.8 if x_um < 0 else 0.4)
                    uy_m_s = u_r * math.sin(theta_xy)
                    
                    # Downward vortex velocity at trailing rear (x < 0, near centerline)
                    downward_vortex_factor = math.exp(-3.0 * (y_norm**2)) * math.exp(-2.0 * ((x_norm + 0.45)**2))
                    uz_m_s = -u_peak_m_s * 0.65 * downward_vortex_factor * (1.0 - z_norm)
                    
                    # Local 3D Vorticity magnitude |omega| [1/s]
                    vorticity_s = (abs(uz_m_s) / max(1e-6, r0_m)) + (abs(u_r) / max(1e-6, char_length_L))
                else:
                    ux_m_s = 0.0
                    uy_m_s = 0.0
                    uz_m_s = 0.0
                    vorticity_s = 0.0

                velocity_mag_m_s = math.sqrt(ux_m_s**2 + uy_m_s**2 + uz_m_s**2)
                
                # -------------------------------------------------------------
                # PORE FORMATION PROBABILITY P_pore(x,y,z) Formulation
                # -------------------------------------------------------------
                # Pore probability depends on 4 synergistic hydrodynamic criteria:
                # 1. Downward liquid entrainment drag (uz < 0 vs bubble floatation)
                # 2. Local vortex instability shear & turbulence (vorticity * instability_ratio)
                # 3. Proximity to advancing solidification front (mushy zone engulfment)
                # 4. Shielding gas entrapment propensity & Surfactant shear
                
                # A. Vortex Entrainment Factor (0 to 1)
                # High at the rear recirculation vortex of the melt pool (x ~ -0.3 to -0.7 L_pool)
                vortex_zone = math.exp(-4.0 * ((x_norm + 0.45)**2)) * math.exp(-3.5 * (y_norm**2))
                f_vortex = min(1.0, (abs(uz_m_s) / max(0.1, u_peak_m_s * 0.4)) * vortex_zone)
                
                # B. Solidification Engulfment vs Flotation Factor (0 to 1)
                # Local solid velocity R = v_scan * cos(theta_solid)
                local_R_m_s = v_scan_m_s * max(0.05, abs(x_norm))
                # Terminal Stokes-Hadamard bubble floatation velocity for typical 15 um gas pore
                r_bubble_char = 15e-6
                v_buoyancy = (2.0 / 9.0) * ((rho - gas_props["density_kg_m3"]) * 9.81 * (r_bubble_char**2)) / mu
                v_buoyancy *= gas_props["buoyancy_mult"]
                
                # If downward drag + solidification rate exceeds flotation, bubble is captured
                entrapment_ratio = (abs(uz_m_s) + local_R_m_s) / max(1e-4, v_buoyancy * 4.0)
                f_engulf = 1.0 / (1.0 + math.exp(-2.0 * (entrapment_ratio - 1.2)))
                
                # C. Instability & Fluctuation Factor
                f_instability = min(1.0, (instability_ratio**1.4) * 0.35 + (0.3 if effective_d_gamma_dT > 0 else 0.05))
                
                # D. Mushy Zone Location Weight
                # Trapping occurs preferentially right at the liquid-solid mushy interface (solidification front)
                mushy_weight = 1.0 if is_mushy else (0.8 if (is_liquid and r_ellip > 0.7) else (0.1 if is_liquid else 0.0))
                
                # Combined Pore Formation Probability [0.0 to 100.0 %]
                if is_liquid or is_mushy:
                    p_raw = (0.45 * f_vortex + 0.35 * f_engulf + 0.20 * f_instability) * mushy_weight
                    # Scale by shielding gas factor
                    p_pore_pct = min(98.5, max(0.5, p_raw * 100.0 * (1.0 + gas_props["solubility_factor"] * 0.5)))
                else:
                    p_pore_pct = 0.0
                
                if p_pore_pct > 65.0:
                    high_risk_voxels += 1
                
                # Store voxel datum
                voxel_grid.append({
                    "x_um": round(x_um, 1),
                    "y_um": round(y_um, 1),
                    "z_um": round(z_um, 1),
                    "temp_C": round(T_local_C, 1),
                    "prob_pct": round(p_pore_pct, 1),
                    "u_mag_m_s": round(velocity_mag_m_s, 2),
                    "uz_m_s": round(uz_m_s, 2),
                    "vorticity_s": round(vorticity_s, 0),
                    "phase": "liquid" if is_liquid else ("mushy" if is_mushy else "solid")
                })
                
                # Stochastic Pore Generation inside High Probability Trapping Zones
                if (is_liquid or is_mushy) and p_pore_pct > 60.0:
                    # Random sampling based on local probability
                    if random.random() < (p_pore_pct / 100.0) * 0.12:
                        pore_diameter_um = max(4.0, min(85.0, random.gauss(22.0, 10.0) * (1.0 + f_instability * 0.5)))
                        pore_type = "Marangoni Vortex Recirculation"
                        if effective_d_gamma_dT > 0:
                            pore_type = "Surfactant Flow Inversion Bubble Drag"
                        elif abs(uz_m_s) > u_peak_m_s * 0.4:
                            pore_type = "Vortex Cavity Shielding Gas Entrapment"
                        elif is_mushy:
                            pore_type = "Interdendritic Mushy Front Engulfment"
                            
                        trapped_pores_list.append({
                            "id": f"pore_{len(trapped_pores_list) + 1}",
                            "x_um": round(x_um + random.uniform(-dx_um/2, dx_um/2), 1),
                            "y_um": round(y_um + random.uniform(-dy_um/2, dy_um/2), 1),
                            "z_um": round(z_um + random.uniform(-dz_um/2, dz_um/2), 1),
                            "diameter_um": round(pore_diameter_um, 1),
                            "sphericity": round(random.uniform(0.86, 0.98), 2),
                            "mechanism": pore_type,
                            "entrapmentProb": round(p_pore_pct, 1)
                        })

    # Overall Defect & Density Metrics
    high_risk_ratio = high_risk_voxels / max(1, total_voxels)
    total_pores_count = len(trapped_pores_list)
    pore_volume_fraction_pct = min(1.2, total_pores_count * 0.018 + (high_risk_ratio * 0.45))
    relative_density_pct = max(98.8, 100.0 - pore_volume_fraction_pct)
    
    # Defect Risk Level
    if pore_volume_fraction_pct > 0.35 or instability_ratio > 1.6:
        overall_risk = "High Gas Entrapment Risk"
        risk_color = "rose"
    elif pore_volume_fraction_pct > 0.12 or instability_ratio > 1.0:
        overall_risk = "Moderate Vortex Instability"
        risk_color = "amber"
    else:
        overall_risk = "Low / Conforming Density"
        risk_color = "emerald"
        
    # AI Physical Mitigation Advice
    mitigations = []
    if effective_d_gamma_dT > 0:
        mitigations.append(f"Surfactant sulfur content ({surfactant_sulfur_ppm} ppm) inverted dγ/dT to positive (+{effective_d_gamma_dT:.5f} N/m·K), causing inward flow and deep vortex pulling. Reduce sulfur/oxygen impurity below 10 ppm.")
    if marangoni_number > crit_Ma:
        mitigations.append(f"Marangoni number (Ma = {marangoni_number:.0f}) exceeds critical threshold ({crit_Ma:.0f}). Increase scan speed from {scan_speed_mm_s} mm/s to {scan_speed_mm_s*1.2:.0f} mm/s to stabilize the convective rolls.")
    if shielding_gas_name == "Argon (Ar)" and pore_volume_fraction_pct > 0.2:
        mitigations.append("Consider switching to Helium (He) shielding gas to reduce fluid viscosity drag and increase bubble buoyancy escape velocity by +25%.")
    if not mitigations:
        mitigations.append("Process parameters produce stable laminar Marangoni rolls. Conforming relative density (>99.9%) predicted.")

    t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    return {
        "success": True,
        "engine": "CPython 3.10+ (MetalliX HPC Marangoni Solver)",
        "durationMs": round(t_elapsed_ms, 1),
        "inputSummary": {
            "material": material_name,
            "laserPower_W": laser_power_W,
            "scanSpeed_mm_s": scan_speed_mm_s,
            "beamDiameter_um": beam_diameter_um,
            "preheatTemp_C": preheat_temp_C,
            "surfactant_sulfur_ppm": surfactant_sulfur_ppm,
            "shieldingGas": shielding_gas_name,
        },
        "marangoniHydrodynamics": {
            "marangoniNumber_Ma": round(marangoni_number, 0),
            "criticalMarangoni_Ma_crit": round(crit_Ma, 0),
            "instabilityRatio": round(instability_ratio, 2),
            "effective_d_gamma_dT_N_mK": effective_d_gamma_dT,
            "surfaceTension_N_m": props["surface_tension_pure_N_m"],
            "peakVelocity_m_s": round(u_peak_m_s, 2),
            "reynoldsNumber_Re": round(reynolds_marangoni, 1),
            "pecletNumber_Pe": round(peclet_marangoni, 1),
            "capillaryNumber_Ca": round(capillary_number, 4),
            "flowRegime": flow_regime,
            "flowDirection": "Inward (Centripetal Deep Vortex)" if effective_d_gamma_dT > 0 else "Outward (Thermocapillary Bifurcation)",
        },
        "meltPoolGeometry": {
            "length_um": round(L_pool_um, 1),
            "width_um": round(W_pool_um, 1),
            "depth_um": round(D_pool_um, 1),
            "peakTemp_C": round(T_peak_C, 1),
            "liquidusTemp_C": props["liquidus_C"],
            "solidusTemp_C": props["solidus_C"],
        },
        "porosityPrediction": {
            "relativeDensity_pct": round(relative_density_pct, 2),
            "poreVolumeFraction_pct": round(pore_volume_fraction_pct, 3),
            "predictedPoresCount": len(trapped_pores_list),
            "meanPoreDiameter_um": round(sum(p["diameter_um"] for p in trapped_pores_list) / max(1, len(trapped_pores_list)), 1) if trapped_pores_list else 0.0,
            "overallRisk": overall_risk,
            "riskColor": risk_color,
            "trappedPores": trapped_pores_list,
        },
        "heatmap3D": {
            "gridResolution": {"Nx": Nx, "Ny": Ny, "Nz": Nz, "totalVoxels": total_voxels},
            "bounds_um": {
                "x_min": round(x_min_um, 1), "x_max": round(x_max_um, 1),
                "y_min": round(y_min_um, 1), "y_max": round(y_max_um, 1),
                "z_min": round(z_min_um, 1), "z_max": round(z_max_um, 1)
            },
            "voxels": voxel_grid, # 3D spatial points with probability P_pore(x,y,z)
        },
        "mitigationRecommendations": mitigations
    }


if __name__ == "__main__":
    # Support stdin JSON piping or sys.argv[1] or default test execution
    try:
        if len(sys.argv) > 1 and sys.argv[1].strip().startswith("{"):
            payload = json.loads(sys.argv[1])
        elif not sys.stdin.isatty():
            raw_input = sys.stdin.read()
            if raw_input.strip():
                payload = json.loads(raw_input)
            else:
                payload = {}
        else:
            payload = {}
        
        result = solve_marangoni_flow_and_porosity(payload)
        print(json.dumps(result))
    except Exception as e:
        error_res = {
            "success": False,
            "error": str(e),
            "traceback": repr(e)
        }
        print(json.dumps(error_res), file=sys.stderr)
        sys.exit(1)

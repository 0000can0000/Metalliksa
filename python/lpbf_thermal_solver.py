#!/usr/bin/env python3
"""
MetalliX Python LPBF Thermal, Melt Pool Geometry & Multi-Defect Physics Solver
Author: MetalliX Additive Manufacturing HPC Subsystem

Simulates:
1. 3D Goldak double-ellipsoid moving laser heat source & Eagar-Tsai / Rosenthal thermal fields
2. Multi-regime melt pool geometry (Conduction, Transition, Keyhole Vapor Cavity)
3. 3-View geometric contours (Top-Down X-Y, Longitudinal X-Z, Transverse Y-Z with Hatch Overlap)
4. Hydrodynamic Marangoni convection, Knudsen recoil vapor pressure, & multiple-reflection absorptivity
5. Comprehensive defect analytics: Lack of Fusion (LoF), Keyhole Porosity, Plateau-Rayleigh Balling, Spatter Denudation
6. Solidification kinetics: G(x,y,z), R(x,y,z), Cooling Rate G*R, Hunt CET morphology, PDAS & SDAS
7. Full 2D Power-Velocity (P-V) Process Window map generation
"""

import sys
import json
import math
import time

# Comprehensive High-Temperature Thermophysical Alloy Database
THERMOPHYSICAL_DB = {
    "Inconel 718": {
        "base": "Ni",
        "liquidus_C": 1336.0,
        "solidus_C": 1260.0,
        "boiling_C": 2850.0,
        "density_kg_m3": 8190.0,
        "density_liquid_kg_m3": 7450.0,
        "thermal_conductivity_W_mK": 11.4,
        "thermal_conductivity_liquid_W_mK": 29.0,
        "specific_heat_J_kgK": 435.0,
        "specific_heat_liquid_J_kgK": 730.0,
        "latent_heat_fusion_J_kg": 270000.0,
        "latent_heat_vap_J_kg": 6400000.0,
        "absorptivity_IR": 0.38,
        "absorptivity_Green": 0.58,
        "surface_tension_N_m": 1.78,
        "d_gamma_dT_N_mK": -0.00040,  # Negative: outwards Marangoni flow
        "viscosity_Pa_s": 0.0055,
        "thermal_expansion_1_K": 13.0e-6,
        "youngs_modulus_GPa": 205.0,
        "poissons_ratio": 0.29,
        "pdas_A1": 80.0,
        "sdas_B1": 42.0
    },
    "Ti-6Al-4V": {
        "base": "Ti",
        "liquidus_C": 1660.0,
        "solidus_C": 1604.0,
        "boiling_C": 3287.0,
        "density_kg_m3": 4430.0,
        "density_liquid_kg_m3": 3950.0,
        "thermal_conductivity_W_mK": 6.7,
        "thermal_conductivity_liquid_W_mK": 23.0,
        "specific_heat_J_kgK": 526.0,
        "specific_heat_liquid_J_kgK": 830.0,
        "latent_heat_fusion_J_kg": 290000.0,
        "latent_heat_vap_J_kg": 8900000.0,
        "absorptivity_IR": 0.35,
        "absorptivity_Green": 0.52,
        "surface_tension_N_m": 1.55,
        "d_gamma_dT_N_mK": -0.00028,
        "viscosity_Pa_s": 0.0042,
        "thermal_expansion_1_K": 8.6e-6,
        "youngs_modulus_GPa": 114.0,
        "poissons_ratio": 0.34,
        "pdas_A1": 65.0,
        "sdas_B1": 35.0
    },
    "316L Stainless Steel": {
        "base": "Fe",
        "liquidus_C": 1400.0,
        "solidus_C": 1375.0,
        "boiling_C": 2814.0,
        "density_kg_m3": 7990.0,
        "density_liquid_kg_m3": 6980.0,
        "thermal_conductivity_W_mK": 16.3,
        "thermal_conductivity_liquid_W_mK": 31.0,
        "specific_heat_J_kgK": 500.0,
        "specific_heat_liquid_J_kgK": 780.0,
        "latent_heat_fusion_J_kg": 270000.0,
        "latent_heat_vap_J_kg": 6250000.0,
        "absorptivity_IR": 0.42,
        "absorptivity_Green": 0.62,
        "surface_tension_N_m": 1.70,
        "d_gamma_dT_N_mK": -0.00045,
        "viscosity_Pa_s": 0.0060,
        "thermal_expansion_1_K": 16.0e-6,
        "youngs_modulus_GPa": 193.0,
        "poissons_ratio": 0.30,
        "pdas_A1": 95.0,
        "sdas_B1": 48.0
    },
    "AlSi10Mg": {
        "base": "Al",
        "liquidus_C": 595.0,
        "solidus_C": 557.0,
        "boiling_C": 2470.0,
        "density_kg_m3": 2680.0,
        "density_liquid_kg_m3": 2390.0,
        "thermal_conductivity_W_mK": 130.0,
        "thermal_conductivity_liquid_W_mK": 85.0,
        "specific_heat_J_kgK": 910.0,
        "specific_heat_liquid_J_kgK": 1180.0,
        "latent_heat_fusion_J_kg": 397000.0,
        "latent_heat_vap_J_kg": 10500000.0,
        "absorptivity_IR": 0.18,
        "absorptivity_Green": 0.38,
        "surface_tension_N_m": 0.85,
        "d_gamma_dT_N_mK": -0.00035,
        "viscosity_Pa_s": 0.0013,
        "thermal_expansion_1_K": 20.5e-6,
        "youngs_modulus_GPa": 70.0,
        "poissons_ratio": 0.33,
        "pdas_A1": 45.0,
        "sdas_B1": 22.0
    },
    "CoCrMo": {
        "base": "Co",
        "liquidus_C": 1395.0,
        "solidus_C": 1330.0,
        "boiling_C": 2870.0,
        "density_kg_m3": 8300.0,
        "density_liquid_kg_m3": 7500.0,
        "thermal_conductivity_W_mK": 14.8,
        "thermal_conductivity_liquid_W_mK": 28.0,
        "specific_heat_J_kgK": 450.0,
        "specific_heat_liquid_J_kgK": 740.0,
        "latent_heat_fusion_J_kg": 275000.0,
        "latent_heat_vap_J_kg": 6300000.0,
        "absorptivity_IR": 0.40,
        "absorptivity_Green": 0.60,
        "surface_tension_N_m": 1.75,
        "d_gamma_dT_N_mK": -0.00038,
        "viscosity_Pa_s": 0.0052,
        "thermal_expansion_1_K": 14.2e-6,
        "youngs_modulus_GPa": 230.0,
        "poissons_ratio": 0.30,
        "pdas_A1": 85.0,
        "sdas_B1": 44.0
    },
    "Scalmalloy (Al-Mg-Sc-Zr)": {
        "base": "Al",
        "liquidus_C": 645.0,
        "solidus_C": 580.0,
        "boiling_C": 2470.0,
        "density_kg_m3": 2670.0,
        "density_liquid_kg_m3": 2380.0,
        "thermal_conductivity_W_mK": 115.0,
        "thermal_conductivity_liquid_W_mK": 78.0,
        "specific_heat_J_kgK": 920.0,
        "specific_heat_liquid_J_kgK": 1200.0,
        "latent_heat_fusion_J_kg": 405000.0,
        "latent_heat_vap_J_kg": 10500000.0,
        "absorptivity_IR": 0.22,
        "absorptivity_Green": 0.42,
        "surface_tension_N_m": 0.88,
        "d_gamma_dT_N_mK": -0.00032,
        "viscosity_Pa_s": 0.0014,
        "thermal_expansion_1_K": 22.0e-6,
        "youngs_modulus_GPa": 72.0,
        "poissons_ratio": 0.33,
        "pdas_A1": 38.0,
        "sdas_B1": 18.0
    },
    "Hastelloy X": {
        "base": "Ni",
        "liquidus_C": 1355.0,
        "solidus_C": 1260.0,
        "boiling_C": 2880.0,
        "density_kg_m3": 8220.0,
        "density_liquid_kg_m3": 7480.0,
        "thermal_conductivity_W_mK": 12.0,
        "thermal_conductivity_liquid_W_mK": 30.0,
        "specific_heat_J_kgK": 485.0,
        "specific_heat_liquid_J_kgK": 760.0,
        "latent_heat_fusion_J_kg": 265000.0,
        "latent_heat_vap_J_kg": 6450000.0,
        "absorptivity_IR": 0.39,
        "absorptivity_Green": 0.59,
        "surface_tension_N_m": 1.76,
        "d_gamma_dT_N_mK": -0.00042,
        "viscosity_Pa_s": 0.0058,
        "thermal_expansion_1_K": 14.5e-6,
        "youngs_modulus_GPa": 205.0,
        "poissons_ratio": 0.30,
        "pdas_A1": 82.0,
        "sdas_B1": 43.0
    },
    "Pure Copper (Cu-OF)": {
        "base": "Cu",
        "liquidus_C": 1083.0,
        "solidus_C": 1083.0,
        "boiling_C": 2562.0,
        "density_kg_m3": 8960.0,
        "density_liquid_kg_m3": 8020.0,
        "thermal_conductivity_W_mK": 390.0,
        "thermal_conductivity_liquid_W_mK": 160.0,
        "specific_heat_J_kgK": 385.0,
        "specific_heat_liquid_J_kgK": 540.0,
        "latent_heat_fusion_J_kg": 205000.0,
        "latent_heat_vap_J_kg": 4730000.0,
        "absorptivity_IR": 0.08,   # Very low IR absorption
        "absorptivity_Green": 0.45, # High Green 515nm absorption
        "surface_tension_N_m": 1.30,
        "d_gamma_dT_N_mK": -0.00028,
        "viscosity_Pa_s": 0.0040,
        "thermal_expansion_1_K": 16.5e-6,
        "youngs_modulus_GPa": 120.0,
        "poissons_ratio": 0.34,
        "pdas_A1": 50.0,
        "sdas_B1": 25.0
    }
}

def calculate_meltpool_physics(
    material_name: str,
    laser_power_W: float,
    scan_speed_mm_s: float,
    beam_diameter_um: float,
    preheat_temp_C: float = 80.0,
    layer_thickness_um: float = 40.0,
    hatch_spacing_um: float = 100.0,
    laser_wavelength: str = "IR_1064nm"
):
    """
    Evaluates 3D multi-regime melt pool physics, geometry, defects, and microstructure.
    """
    props = THERMOPHYSICAL_DB.get(material_name, THERMOPHYSICAL_DB["Inconel 718"])
    
    P_laser = max(10.0, float(laser_power_W))
    v_scan = max(10.0, float(scan_speed_mm_s)) * 1e-3  # m/s
    d_beam = max(10.0, float(beam_diameter_um)) * 1e-6  # m
    r_beam = d_beam / 2.0
    T_preheat = float(preheat_temp_C)
    t_layer_m = float(layer_thickness_um) * 1e-6
    hatch_m = float(hatch_spacing_um) * 1e-6

    T_liq = props["liquidus_C"]
    T_sol = props["solidus_C"]
    T_vap = props["boiling_C"]
    rho = props["density_kg_m3"]
    k_th = props["thermal_conductivity_W_mK"]
    cp = props["specific_heat_J_kgK"]
    alpha_th = k_th / (rho * cp)  # Thermal diffusivity (m^2/s)

    # Base optical absorptivity
    eta_base = props["absorptivity_Green"] if "Green" in laser_wavelength else props["absorptivity_IR"]

    # 1. Volumetric and Linear Energy Densities
    ved_J_mm3 = P_laser / (max(1.0, float(scan_speed_mm_s)) * (float(hatch_spacing_um) * 1e-3) * (float(layer_thickness_um) * 1e-3))
    led_J_m = P_laser / max(1e-4, v_scan)

    # 2. Normalized Enthalpy & Keyhole Criterion (King et al. & Ye et al.)
    # Delta_H / h_s = (eta * P) / (rho * cp * T_liq * sqrt(pi * alpha * v * r_beam^3))
    enthalpy_denom = rho * cp * (T_liq - T_preheat) * math.sqrt(math.pi * alpha_th * v_scan * (r_beam ** 3))
    normalized_enthalpy = (eta_base * P_laser) / max(1e-9, enthalpy_denom)

    # 3. Peak Temperature & Vapor Cavity Formation
    # T_max = T_preheat + (2 * eta * P) / (pi * k * d_beam * sqrt(pi))
    t_peak_C = T_preheat + (2.0 * eta_base * P_laser) / (math.pi * k_th * d_beam * math.sqrt(math.pi))
    t_peak_C = min(3900.0, t_peak_C)

    # 4. Multi-Reflection Absorption Enhancement in Deep Keyhole
    # If vapor depression occurs, multiple bounces increase effective absorption eta_eff
    if normalized_enthalpy > 6.0:
        cavity_aspect = min(4.0, (normalized_enthalpy - 6.0) / 4.0)
        n_reflections = 1.0 + 1.8 * cavity_aspect
        eta_eff = 1.0 - (1.0 - eta_base) ** n_reflections
    else:
        eta_eff = eta_base
        cavity_aspect = 0.0

    effective_power = eta_eff * P_laser

    # 5. Melt Pool Width (W) - Eagar-Tsai / Rosenthal Calibration
    denom_thermal = rho * cp * max(50.0, T_liq - T_preheat) * v_scan
    w_analytical = math.sqrt(max(1e-12, (8.0 / (math.pi * math.e)) * (effective_power / denom_thermal)))
    # Add beam diameter convolution
    w_melt_m = math.sqrt(w_analytical ** 2 + d_beam ** 2)
    w_melt_um = w_melt_m * 1e6

    # 6. Melt Pool Depth (D) & Regime Classification
    if normalized_enthalpy < 5.5:
        # Conduction Mode: Semicircular / Ellipsoidal (D ~ 0.35 - 0.55 * W)
        regime = "Conduction Mode (Stable)"
        depth_factor = 0.40 + 0.12 * (normalized_enthalpy / 5.5)
        d_melt_um = w_melt_um * depth_factor
        keyhole_porosity_risk = "Negligible (<0.01%)"
        keyhole_depth_um = 0.0
    elif normalized_enthalpy < 11.0:
        # Transition Mode: Deepening depression
        regime = "Transition Mode"
        transition_interp = (normalized_enthalpy - 5.5) / 5.5
        depth_factor = 0.52 + 0.45 * transition_interp
        d_melt_um = w_melt_um * depth_factor
        keyhole_porosity_risk = "Low-Moderate (Occasional Fluctuations)"
        keyhole_depth_um = d_melt_um * 0.35 * transition_interp
    else:
        # Keyhole Mode: Deep vapor depression cavity
        regime = "Keyhole Mode (Deep Vapor Cavity)"
        keyhole_factor = 0.95 + 0.55 * math.log10((normalized_enthalpy - 11.0) / 4.0 + 1.0)
        d_melt_um = w_melt_um * keyhole_factor
        keyhole_porosity_risk = "High (Vapor Bubble Entrapment / Pore Defect Risk)"
        keyhole_depth_um = d_melt_um * 0.75

    # 7. Melt Pool Length (L) & Elongation (Peclet Number Pe)
    peclet_number = (v_scan * w_melt_m) / (2.0 * alpha_th)
    elongation_factor = 1.6 + 0.55 * min(6.0, peclet_number)
    l_melt_um = w_melt_um * elongation_factor

    # Goldak Double-Ellipsoid Semi-Axes (front af, rear ar, b, c) in microns
    goldak_af_um = (l_melt_um * 0.32)
    goldak_ar_um = (l_melt_um * 0.68)
    goldak_b_um = (w_melt_um / 2.0)
    goldak_c_um = d_melt_um

    # 8. Marangoni Convection & Knudsen Recoil Pressure
    # Recoil vapor pressure P_recoil (Pa)
    R_gas = 8.314
    M_molar = 0.058  # kg/mol average
    delta_H_vap = props["latent_heat_vap_J_kg"] * M_molar
    T_peak_K = t_peak_C + 273.15
    T_vap_K = T_vap + 273.15
    
    if t_peak_C >= T_vap * 0.8:
        recoil_exp = (delta_H_vap / R_gas) * (1.0 / T_vap_K - 1.0 / max(500.0, T_peak_K))
        p_recoil_atm = 0.54 * math.exp(max(-20.0, min(12.0, recoil_exp)))
        p_recoil_kPa = p_recoil_atm * 101.325
    else:
        p_recoil_kPa = 0.1

    # Marangoni Number Ma = - (d_gamma/dT) * Delta_T * L / (mu * alpha)
    d_gamma = abs(props["d_gamma_dT_N_mK"])
    delta_T_mushy = max(10.0, t_peak_C - T_liq)
    mu_visc = props["viscosity_Pa_s"]
    marangoni_number = (d_gamma * delta_T_mushy * (w_melt_m / 2.0)) / max(1e-9, (mu_visc * alpha_th))

    # 9. Defect Diagnostics
    # A) Lack of Fusion (LoF) - Tang et al. Criterion: (w/h)^2 + (d/t)^2 >= 1.0
    w_over_h = w_melt_um / max(10.0, float(hatch_spacing_um))
    d_over_t = d_melt_um / max(10.0, float(layer_thickness_um))
    lof_criterion_val = (w_over_h ** 2) / 1.0 + (d_over_t ** 2) / 1.0
    
    if w_over_h < 1.05 or d_over_t < 1.15:
        lof_risk = "Severe Lack of Fusion (Inter-Track Unmelted Pores)"
        lof_status = "Fail"
    elif w_over_h < 1.25 or d_over_t < 1.4:
        lof_risk = "Marginal Overlap (Porosity Risk at Scan Boundaries)"
        lof_status = "Warning"
    else:
        lof_risk = "Full Fusion Bonding (Dense Inter-Pass Remelting)"
        lof_status = "Pass"

    # B) Plateau-Rayleigh Capillary Balling Defect (L / W > pi)
    aspect_L_over_W = l_melt_um / max(1.0, w_melt_um)
    if aspect_L_over_W > 3.8:
        balling_risk = "High Balling Risk (Capillary Pinch-Off & Humping)"
    elif aspect_L_over_W > 3.1416:
        balling_risk = "Moderate (Melt Bead Undulation)"
    else:
        balling_risk = "Stable Continuous Track (No Balling)"

    # C) Powder Denudation & Spatter Entrainment Width
    # Denudation width w_denude ~ W * (1 + 0.45 * (P_recoil / 50))
    denudation_width_um = w_melt_um * (1.0 + 0.35 * min(3.0, p_recoil_kPa / 30.0))

    # 10. Solidification Kinetics (G, R, G*R, G/R) & Microstructure
    tail_length_m = max(1e-6, goldak_ar_um * 1e-6)
    delta_T_sol = max(10.0, t_peak_C - T_sol)
    thermal_gradient_G_K_m = max(100.0, delta_T_sol / tail_length_m)
    solidification_rate_R_m_s = max(1e-4, v_scan * 0.88)  # Solidification velocity along centerline
    cooling_rate_K_s = max(1.0, thermal_gradient_G_K_m * solidification_rate_R_m_s)
    g_over_r = max(1.0, thermal_gradient_G_K_m / solidification_rate_R_m_s)

    # Hunt CET Solidification Morphology
    if g_over_r > 1.0e10:
        morphology = "Planar Front (Segregation-Free Solidification)"
    elif g_over_r > 5.0e8:
        morphology = "Fine Cellular (High Creep & Yield Strength)"
    elif g_over_r > 1.0e7:
        morphology = "Columnar Dendritic (Epitaxial Texture Along Build Z)"
    else:
        morphology = "Equiaxed Dendritic (Isotropic Grain Structure)"

    # Primary (PDAS) & Secondary (SDAS) Dendrite Arm Spacings
    a1_const = props.get("pdas_A1", 75.0)
    pdas_val = a1_const * (max(1.0, thermal_gradient_G_K_m) ** -0.5) * (max(1e-3, solidification_rate_R_m_s) ** -0.25) * 1e3
    pdas_um = max(0.15, min(20.0, float(abs(pdas_val))))
    b1_const = props.get("sdas_B1", 40.0)
    sdas_val = b1_const * ((max(10.0, cooling_rate_K_s)) ** -0.33)
    sdas_um = max(0.08, min(8.0, float(abs(sdas_val))))

    # 11. Residual Stress & Recoater Crash Upper Bound
    e_gpa = props["youngs_modulus_GPa"]
    alpha_exp = props["thermal_expansion_1_K"]
    nu = props["poissons_ratio"]
    delta_t_stress = max(10.0, T_sol - T_preheat)
    elastic_stress_max_mpa = (e_gpa * 1e3 * alpha_exp * delta_t_stress) / max(0.01, 1.0 - nu)
    effective_residual_stress_mpa = min(1200.0, elastic_stress_max_mpa * 0.72)
    distortion_index = (effective_residual_stress_mpa * (float(layer_thickness_um) / 40.0)) / 420.0
    
    if distortion_index > 2.0:
        recoater_risk = "High (Blade Collision & Part Curl Risk)"
    elif distortion_index > 1.2:
        recoater_risk = "Moderate (Anchor Support Structures Required)"
    else:
        recoater_risk = "Low (Safe Thermal Stress Window)"

    # 12. Geometric 2D Contours for 3 Orthogonal Views
    
    # A) Top-Down (X-Y) Profile: Teardrop with Front Semi-Ellipse & Rear Chevron Tail
    top_down_contour = []
    num_pts = 48
    for i in range(num_pts + 1):
        theta = (2.0 * math.pi * i) / num_pts
        sin_t = math.sin(theta)
        cos_t = math.cos(theta)
        if cos_t >= 0:
            # Front elliptical cap
            x_pt = goldak_af_um * cos_t
            y_pt = goldak_b_um * sin_t
        else:
            # Rear elongated teardrop
            x_pt = -goldak_ar_um * abs(cos_t)
            # Tapered tail width
            norm_ratio = min(1.0, abs(x_pt) / max(1.0, goldak_ar_um))
            tail_taper = max(0.0, 1.0 - (norm_ratio ** 1.3))
            y_pt = goldak_b_um * sin_t * max(0.05, tail_taper)
        
        top_down_contour.append({"x_um": round(float(x_pt), 1), "y_um": round(float(y_pt), 1)})

    # B) Longitudinal (X-Z) Profile: Depth penetration along scan axis
    longitudinal_contour = []
    for i in range(num_pts + 1):
        s = i / num_pts  # 0 to 1
        x_pt = goldak_af_um - (goldak_af_um + goldak_ar_um) * s
        if x_pt >= 0:
            norm_x = min(1.0, max(0.0, x_pt / max(1.0, goldak_af_um)))
            z_depth = d_melt_um * math.sqrt(max(0.0, 1.0 - norm_x ** 2))
        else:
            norm_x = min(1.0, max(0.0, abs(x_pt) / max(1.0, goldak_ar_um)))
            # Power law tail depth decay
            z_depth = d_melt_um * (max(0.0, 1.0 - norm_x) ** 1.4)
            
        longitudinal_contour.append({
            "x_um": round(float(x_pt), 1),
            "z_depth_um": round(float(z_depth), 1),
            "isKeyhole": keyhole_depth_um > 0 and abs(x_pt) < (r_beam * 1e6 * 0.8)
        })

    # C) Transverse (Y-Z) Cross-Section: Single track + Neighboring Hatch Overlap
    transverse_contour = []
    for i in range(33):
        phi = (math.pi * i) / 32.0
        y_pt = goldak_b_um * math.cos(phi)
        
        if regime.startswith("Keyhole"):
            # U-shape / Keyhole deeper bottom
            z_pt = d_melt_um * (max(0.0, math.sin(phi)) ** 0.75)
        else:
            # Half-ellipse
            z_pt = d_melt_um * max(0.0, math.sin(phi))
            
        transverse_contour.append({"y_um": round(float(y_pt), 1), "z_depth_um": round(float(z_pt), 1)})

    # Transverse Multi-Track Overlap with left & right hatch lines
    hatch_val_um = float(hatch_spacing_um)
    overlap_tracks = [
        {"trackId": "Left Track (-1)", "y_center_um": -hatch_val_um, "contour": [{"y_um": round(pt["y_um"] - hatch_val_um, 1), "z_depth_um": pt["z_depth_um"]} for pt in transverse_contour]},
        {"trackId": "Current Track (0)", "y_center_um": 0.0, "contour": transverse_contour},
        {"trackId": "Right Track (+1)", "y_center_um": hatch_val_um, "contour": [{"y_um": round(pt["y_um"] + hatch_val_um, 1), "z_depth_um": pt["z_depth_um"]} for pt in transverse_contour]}
    ]

    # 13. Dynamic P-V Process Window Map (2D Grid: Power 50-600W, Speed 200-2500 mm/s)
    process_map_grid = []
    p_steps = [80, 150, 220, 300, 380, 460, 540]
    v_steps = [300, 600, 900, 1200, 1600, 2000, 2400]

    for p_val in p_steps:
        for v_val in v_steps:
            # Quick evaluation of regime
            v_m = v_val * 1e-3
            denom_th = rho * cp * (T_liq - T_preheat) * math.sqrt(math.pi * alpha_th * v_m * (r_beam ** 3))
            enth = (eta_base * p_val) / max(1e-9, denom_th)
            
            # Width & Depth proxy
            eff_p = (1.0 - (1.0 - eta_base) ** 2.2) * p_val if enth > 6.0 else eta_base * p_val
            w_m = math.sqrt(max(1e-12, (8.0 / (math.pi * math.e)) * (eff_p / (rho * cp * max(50.0, T_liq - T_preheat) * v_m))) + d_beam ** 2)
            w_um = w_m * 1e6
            
            if enth < 5.5:
                d_um = w_um * 0.45
                pt_regime = "Optimal Conduction"
                color_code = "#10b981"  # Emerald
            elif enth > 11.0:
                d_um = w_um * 1.25
                pt_regime = "Keyhole Defect Zone"
                color_code = "#ef4444"  # Red
            else:
                d_um = w_um * 0.70
                pt_regime = "Transition"
                color_code = "#38bdf8"  # Sky

            # Check Lack of Fusion
            if (w_um / float(hatch_spacing_um) < 1.05) or (d_um / float(layer_thickness_um) < 1.15):
                pt_regime = "Lack of Fusion Zone"
                color_code = "#f59e0b"  # Amber
            # Check Balling
            elif (w_um * (1.6 + 0.55 * min(6.0, (v_m * w_m) / (2.0 * alpha_th)))) / max(1.0, w_um) > 3.8:
                pt_regime = "Balling Instability Zone"
                color_code = "#a855f7"  # Purple

            process_map_grid.append({
                "power_W": p_val,
                "speed_mm_s": v_val,
                "normalizedEnthalpy": round(enth, 2),
                "regime": pt_regime,
                "color": color_code,
                "width_um": round(w_um, 1),
                "depth_um": round(d_um, 1)
            })

    return {
        "success": True,
        "engine": "MetalliX-Python-HPC-LPBF-MeltPool-v4.0",
        "material": material_name,
        "baseMetal": props["base"],
        "laserWavelength": laser_wavelength,
        "processParameters": {
            "laserPower_W": P_laser,
            "scanSpeed_mm_s": float(scan_speed_mm_s),
            "beamDiameter_um": float(beam_diameter_um),
            "preheatTemp_C": T_preheat,
            "layerThickness_um": float(layer_thickness_um),
            "hatchSpacing_um": float(hatch_spacing_um),
            "effectiveAbsorptivity": round(eta_eff, 3),
            "volumetricEnergyDensity_J_mm3": round(ved_J_mm3, 2),
            "linearEnergyDensity_J_m": round(led_J_m, 1),
            "normalizedEnthalpy": round(normalized_enthalpy, 2)
        },
        "meltPoolGeometry": {
            "length_um": round(l_melt_um, 1),
            "width_um": round(w_melt_um, 1),
            "depth_um": round(d_melt_um, 1),
            "aspectRatio_L_over_W": round(aspect_L_over_W, 2),
            "depthToWidthRatio_D_over_W": round(d_melt_um / max(1.0, w_melt_um), 2),
            "keyholeVaporCavityDepth_um": round(keyhole_depth_um, 1),
            "regime": regime,
            "goldakParameters": {
                "semiAxis_af_front_um": round(goldak_af_um, 1),
                "semiAxis_ar_rear_um": round(goldak_ar_um, 1),
                "semiAxis_b_halfwidth_um": round(goldak_b_um, 1),
                "semiAxis_c_depth_um": round(goldak_c_um, 1)
            }
        },
        "hydrodynamicsAndRecoil": {
            "peakTemperature_C": round(t_peak_C, 1),
            "knudsenRecoilPressure_kPa": round(p_recoil_kPa, 2),
            "marangoniNumber": round(marangoni_number, 0),
            "pecletThermalNumber": round(peclet_number, 2),
            "powderDenudationWidth_um": round(denudation_width_um, 1)
        },
        "defectDiagnostics": {
            "lackOfFusionStatus": lof_status,
            "lackOfFusionRisk": lof_risk,
            "lackOfFusionOverlapIndex": round(lof_criterion_val, 2),
            "keyholePorosityRisk": keyhole_porosity_risk,
            "ballingInstabilityRisk": balling_risk,
            "recoaterCrashRisk": recoater_risk,
            "effectiveResidualStress_MPa": round(effective_residual_stress_mpa, 1),
            "distortionIndex": round(distortion_index, 2)
        },
        "solidificationKinetics": {
            "thermalGradient_G_K_m": round(thermal_gradient_G_K_m, 0),
            "thermalGradient_G_K_um": round(thermal_gradient_G_K_m * 1e-6, 3),
            "solidificationRate_R_m_s": round(solidification_rate_R_m_s, 3),
            "solidificationRate_R_mm_s": round(solidification_rate_R_m_s * 1e3, 1),
            "coolingRate_K_s": round(cooling_rate_K_s, 0),
            "coolingRate_log10": round(math.log10(max(10.0, cooling_rate_K_s)), 2),
            "g_over_r_ratio": round(g_over_r, 0),
            "microstructureMorphology": morphology,
            "primaryDendriteArmSpacing_PDAS_um": round(pdas_um, 2),
            "secondaryDendriteArmSpacing_SDAS_um": round(sdas_um, 2)
        },
        "geometricContours": {
            "topDownXY": top_down_contour,
            "longitudinalXZ": longitudinal_contour,
            "transverseYZ": transverse_contour,
            "multiTrackHatchOverlap": overlap_tracks
        },
        "processWindowMap": {
            "currentOperatingPoint": {
                "power_W": P_laser,
                "speed_mm_s": float(scan_speed_mm_s),
                "regime": regime,
                "lofStatus": lof_status
            },
            "grid": process_map_grid
        }
    }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--status":
        print(json.dumps({
            "status": "ready",
            "engine": "MetalliX Python LPBF Thermal & Solidification Solver v4.0",
            "materials": list(THERMOPHYSICAL_DB.keys())
        }))
        sys.exit(0)
        
    try:
        if len(sys.argv) > 1 and sys.argv[1].strip().startswith("{"):
            data = json.loads(sys.argv[1])
        elif not sys.stdin.isatty():
            raw_input = sys.stdin.read()
            if raw_input.strip():
                data = json.loads(raw_input)
            else:
                data = {}
        else:
            data = {}
            
        mat = data.get("material", "Inconel 718")
        power = float(data.get("laserPower_W", 285.0))
        speed = float(data.get("scanSpeed_mm_s", 960.0))
        beam = float(data.get("beamDiameter_um", 80.0))
        preheat = float(data.get("preheatTemp_C", 80.0))
        layer = float(data.get("layerThickness_um", 40.0))
        hatch = float(data.get("hatchSpacing_um", 110.0))
        wavelength = data.get("laserWavelength", "IR_1064nm")
        
        t0 = time.time()
        result = calculate_meltpool_physics(mat, power, speed, beam, preheat, layer, hatch, wavelength)
        result["computeTimeMs"] = round((time.time() - t0) * 1000.0, 1)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

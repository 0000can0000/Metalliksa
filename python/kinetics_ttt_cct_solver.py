#!/usr/bin/env python3
"""
MetalliX Python JMAK & Diffusion Phase Transformation Kinetics Solver
Computes TTT (Time-Temperature-Transformation), CCT (Continuous Cooling Transformation via Scheil Additivity),
isothermal kinetics (Johnson-Mehl-Avrami-Kolmogorov), LSW precipitate coarsening, and CALPHAD vs. Kinetics gap.
"""

import sys
import json
import math
import time

# Material Kinetics Database with thermodynamic transition temperatures, activation energies, and JMAK parameters
ALLOY_KINETICS_DB = {
    "AISI 4140": {
        "type": "Low-Alloy Steel",
        "composition_wt": {"Fe": 96.8, "C": 0.40, "Mn": 0.85, "Cr": 1.00, "Mo": 0.20, "Si": 0.25},
        "Ae3_C": 780.0,
        "Ae1_C": 725.0,
        "Ms_C": 330.0,
        "Mf_C": 180.0,
        "Q_diff_kJ_mol": 240.0,
        "grain_size_d_um_default": 25.0,
        "aust_temp_C_default": 860.0,
        "phases": ["Ferrite", "Pearlite", "Bainite", "Martensite"],
        "critical_cooling_rate_C_s": 45.0, # Rate to get >90% Martensite
        "description": "Medium-carbon Cr-Mo through-hardening alloy steel for shafts and landing gears."
    },
    "AISI 4340": {
        "type": "High-Strength Ni-Cr-Mo Steel",
        "composition_wt": {"Fe": 95.7, "C": 0.40, "Ni": 1.85, "Cr": 0.80, "Mo": 0.25, "Mn": 0.70, "Si": 0.30},
        "Ae3_C": 765.0,
        "Ae1_C": 710.0,
        "Ms_C": 290.0,
        "Mf_C": 140.0,
        "Q_diff_kJ_mol": 265.0,
        "grain_size_d_um_default": 20.0,
        "aust_temp_C_default": 845.0,
        "phases": ["Ferrite", "Pearlite", "Bainite", "Martensite"],
        "critical_cooling_rate_C_s": 8.5, # Deep hardenability due to Ni+Cr+Mo
        "description": "Ultra-high strength structural steel with high hardenability and fracture toughness."
    },
    "AISI D2": {
        "type": "Cold-Work High-Carbon High-Cr Tool Steel",
        "composition_wt": {"Fe": 82.5, "C": 1.55, "Cr": 12.0, "Mo": 0.90, "V": 0.80, "Si": 0.40, "Mn": 0.35},
        "Ae3_C": 860.0,
        "Ae1_C": 800.0,
        "Ms_C": 210.0,
        "Mf_C": 40.0,
        "Q_diff_kJ_mol": 310.0,
        "grain_size_d_um_default": 15.0,
        "aust_temp_C_default": 1020.0,
        "phases": ["Proeutectoid Carbides", "Pearlite", "Bainite", "Martensite", "Retained Austenite"],
        "critical_cooling_rate_C_s": 2.2, # Air hardening
        "description": "High wear-resistant ledeburitic tool steel with M7C3 carbides."
    },
    "Inconel 718": {
        "type": "Precipitation-Hardenable Ni-Fe Superalloy",
        "composition_wt": {"Ni": 52.5, "Cr": 19.0, "Fe": 18.5, "Nb": 5.1, "Mo": 3.05, "Ti": 0.90, "Al": 0.55, "C": 0.04},
        "Ae3_C": 1020.0, # Gamma Solvus
        "Ae1_C": 620.0,
        "Ms_C": -50.0, # Stable FCC matrix (no martensite)
        "Mf_C": -100.0,
        "Q_diff_kJ_mol": 285.0, # Nb diffusion in Ni
        "grain_size_d_um_default": 35.0,
        "aust_temp_C_default": 980.0, # Solutionizing temp
        "phases": ["Gamma Prime (Ni3Al,Ti)", "Gamma Double Prime (Ni3Nb)", "Delta (Ni3Nb orthorhombic)", "Laves TCP"],
        "critical_cooling_rate_C_s": 150.0, # To suppress delta & Laves in LPBF
        "description": "Aerospace superalloy hardened by coherent metastable gamma double prime (bct-DO22)."
    },
    "Ti-6Al-4V": {
        "type": "Alpha-Beta Titanium Alloy",
        "composition_wt": {"Ti": 90.0, "Al": 6.0, "V": 4.0, "Fe": 0.25, "O": 0.18},
        "Ae3_C": 995.0, # Beta Transus
        "Ae1_C": 700.0,
        "Ms_C": 800.0, # Alpha-prime (hexagonal martensite) start
        "Mf_C": 650.0,
        "Q_diff_kJ_mol": 220.0,
        "grain_size_d_um_default": 50.0,
        "aust_temp_C_default": 1050.0, # Beta anneal
        "phases": ["Equiaxed Alpha", "Lamellar Alpha+Beta (Widmanstatten)", "Alpha-Prime Martensite (HCP)"],
        "critical_cooling_rate_C_s": 410.0, # Rate for complete martensitic alpha-prime
        "description": "Workhorse titanium alloy; transformation kinetics govern lamellar vs equiaxed microstructure."
    },
    "Al 7075": {
        "type": "Precipitation-Hardenable Al-Zn-Mg-Cu Alloy",
        "composition_wt": {"Al": 90.0, "Zn": 5.6, "Mg": 2.5, "Cu": 1.6, "Cr": 0.23},
        "Ae3_C": 480.0, # Solvus
        "Ae1_C": 100.0,
        "Ms_C": -200.0,
        "Mf_C": -273.0,
        "Q_diff_kJ_mol": 130.0,
        "grain_size_d_um_default": 20.0,
        "aust_temp_C_default": 475.0,
        "phases": ["GP Zones", "Eta-Prime (MgZn2)", "Eta Equilibrium (MgZn2)"],
        "critical_cooling_rate_C_s": 250.0, # Water quench required to retain SSSS
        "description": "Ultra-high strength aerospace aluminum susceptible to quench-sensitivity and stress corrosion."
    }
}

def calculate_jmak_isothermal_kinetics(t_c, alloy_data, grain_size_um, phase_type="Pearlite"):
    """
    Computes JMAK time for 1% (start), 50%, and 99% (finish) transformation at isothermal temperature T.
    Using classic nucleation and growth driving force:
    tau(T) = A * (d_grain)^p * (Delta T)^(-m) * exp(Q / (R * T))
    """
    t_k = t_c + 273.15
    r_gas = 8.314 # J/(mol*K)
    
    t_eq = alloy_data["Ae3_C"] if phase_type in ["Ferrite", "Pearlite", "Equiaxed Alpha"] else (alloy_data["Ae1_C"] + 150.0)
    delta_t = t_eq - t_c
    
    if delta_t <= 5.0 or t_c < 100.0:
        return None # No driving force or frozen kinetics
        
    q_act = alloy_data["Q_diff_kJ_mol"] * 1000.0 # J/mol
    
    # Nose temperature calibration (C-curve)
    # At high T, delta_t is small -> slow nucleation.
    # At low T, exp(Q/RT) is huge -> slow diffusion.
    # Nose occurs where d(tau)/dT = 0, usually around 500-600 C for steels.
    
    if "Steel" in alloy_data["type"]:
        if phase_type == "Pearlite":
            t_nose = 560.0
            n_avrami = 3.0
            c_factor = 0.00045 * (grain_size_um / 25.0) ** 0.8
        elif phase_type == "Bainite":
            t_nose = 420.0
            n_avrami = 2.0
            c_factor = 0.00085 * (grain_size_um / 25.0) ** 0.5
        else: # Ferrite
            t_nose = 650.0
            n_avrami = 2.5
            c_factor = 0.00030 * (grain_size_um / 25.0) ** 1.0
    elif "Superalloy" in alloy_data["type"]:
        t_nose = 750.0
        n_avrami = 1.5
        c_factor = 0.0080
    elif "Titanium" in alloy_data["type"]:
        t_nose = 820.0
        n_avrami = 2.2
        c_factor = 0.00012
    else: # Al alloy
        t_nose = 320.0
        n_avrami = 2.0
        c_factor = 0.00015

    # Phenomenological incubation & transformation time
    # tau_nose is typically 0.5s to 50s depending on hardenability
    tau_geom = math.exp(((t_c - t_nose) / 85.0) ** 2)
    diff_term = math.exp((q_act / r_gas) * (1.0 / t_k - 1.0 / (t_nose + 273.15)))
    
    # Incubation time for 1% transformed (start)
    t_start_s = max(0.001, c_factor * tau_geom * diff_term * (100.0 / max(10.0, delta_t)) ** 1.2)
    
    # 50% transformed time: t_50 = t_start * [ ln(2) / -ln(0.99) ]^(1/n)
    ratio_50 = (math.log(2.0) / -math.log(0.99)) ** (1.0 / n_avrami)
    t_50_s = t_start_s * ratio_50
    
    # 99% transformed time: t_99 = t_start * [ -ln(0.01) / -ln(0.99) ]^(1/n)
    ratio_99 = (-math.log(0.01) / -math.log(0.99)) ** (1.0 / n_avrami)
    t_finish_s = t_start_s * ratio_99
    
    return {
        "temperature_C": t_c,
        "phase": phase_type,
        "tStart_s": round(t_start_s, 4),
        "t50_s": round(t_50_s, 4),
        "tFinish_s": round(t_finish_s, 4),
        "avramiExponent_n": n_avrami,
        "drivingForce_DeltaT_C": round(delta_t, 1)
    }

def solve_phase_transformation_kinetics(alloy_name="AISI 4140", cooling_rate_c_s=10.0,
                                       grain_size_um=25.0, aust_temp_c=860.0,
                                       aging_time_h=8.0, aging_temp_c=720.0):
    """
    Solves TTT curves, CCT cooling trajectory via Scheil additivity, room temp phase constituents, and LSW coarsening.
    """
    start_time = time.perf_counter()
    
    alloy = ALLOY_KINETICS_DB.get(alloy_name, ALLOY_KINETICS_DB["AISI 4140"])
    
    ae3 = alloy["Ae3_C"]
    ae1 = alloy["Ae1_C"]
    ms = alloy["Ms_C"]
    mf = alloy["Mf_C"]
    ccr = alloy["critical_cooling_rate_C_s"]
    
    # 1. GENERATE ISOTHERMAL TTT DIAGRAM CURVES
    ttt_curves = []
    temp_steps = 45
    t_min = max(50.0, ms - 50.0)
    t_max = ae3 - 5.0
    
    for i in range(temp_steps + 1):
        tc = t_min + (t_max - t_min) * (i / temp_steps)
        
        # Decide primary active transformation regime
        if tc >= ae1 - 30.0:
            pt = "Ferrite" if "Steel" in alloy["type"] else "Equiaxed Alpha"
        elif tc >= 480.0:
            pt = "Pearlite" if "Steel" in alloy["type"] else "Gamma Prime"
        elif tc >= ms:
            pt = "Bainite" if "Steel" in alloy["type"] else "Delta"
        else:
            pt = "Sub-Ms"
            
        if pt != "Sub-Ms":
            res = calculate_jmak_isothermal_kinetics(tc, alloy, grain_size_um, pt)
            if res and res["tStart_s"] < 1.0e6:
                ttt_curves.append(res)

    # 2. CONTINUOUS COOLING TRANSFORMATION (CCT) & SCHEIL ADDITIVITY
    # Scheil integral: Sum( dt / tau(T) ) >= 1.0
    # Cooling path: T(t) = T_aust - cooling_rate * t
    cooling_rates_to_test = [0.05, 0.2, 1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 500.0, 2000.0]
    cct_transformation_map = []
    
    for cr in cooling_rates_to_test:
        curr_t = aust_temp_c
        dt = 0.05 / max(1.0, cr * 0.01)
        cum_time = 0.0
        scheil_sum = 0.0
        trans_start_temp = None
        trans_start_time = None
        trans_phase = "Martensite"
        
        while curr_t > ms and curr_t > 50.0 and cum_time < 50000.0:
            cum_time += dt
            curr_t = aust_temp_c - cr * cum_time
            if curr_t < ms:
                break
                
            pt = "Pearlite" if curr_t > 520.0 else "Bainite"
            pt_kin = calculate_jmak_isothermal_kinetics(curr_t, alloy, grain_size_um, pt)
            if pt_kin:
                tau_start = pt_kin["tStart_s"]
                scheil_sum += dt / max(1e-4, tau_start)
                if scheil_sum >= 1.0 and trans_start_temp is None:
                    trans_start_temp = curr_t
                    trans_start_time = cum_time
                    trans_phase = pt
                    break

        # Calculate phase fractions at room temperature for this cooling rate
        if cr >= ccr * 1.5:
            pct_martensite = 98.0
            pct_bainite = 1.0
            pct_pearlite = 0.5
            pct_austenite = 0.5
            hard_hrc = 58.0 if "4140" in alloy_name or "4340" in alloy_name else 64.0
        elif cr >= ccr * 0.7:
            pct_martensite = 85.0
            pct_bainite = 12.0
            pct_pearlite = 2.0
            pct_austenite = 1.0
            hard_hrc = 54.0
        elif cr >= ccr * 0.15:
            pct_martensite = 25.0
            pct_bainite = 55.0
            pct_pearlite = 18.0
            pct_austenite = 2.0
            hard_hrc = 42.0
        elif cr >= 0.5:
            pct_martensite = 0.0
            pct_bainite = 20.0
            pct_pearlite = 78.0
            pct_austenite = 2.0
            hard_hrc = 28.0
        else: # Furnace slow cool (Anneal)
            pct_martensite = 0.0
            pct_bainite = 0.0
            pct_pearlite = 98.5
            pct_austenite = 1.5
            hard_hrc = 18.0

        cct_transformation_map.append({
            "coolingRate_C_s": cr,
            "transformedStartTemp_C": round(trans_start_temp, 1) if trans_start_temp else ms,
            "transformedStartTime_s": round(trans_start_time, 2) if trans_start_time else round((aust_temp_c - ms)/cr, 2),
            "primaryMicrostructure": trans_phase if trans_start_temp else "Martensite (Athermal)",
            "phaseFractions": {
                "Martensite_pct": pct_martensite,
                "Bainite_pct": pct_bainite,
                "Pearlite_Ferrite_pct": pct_pearlite,
                "RetainedAustenite_pct": pct_austenite
            },
            "predictedHardness_HRC": round(hard_hrc, 1),
            "predictedHardness_HV": round(hard_hrc * 10.5 + 40.0, 0)
        })

    # 3. CURRENT EVALUATION AT USER-SELECTED COOLING RATE
    user_cr = float(cooling_rate_c_s)
    # Koistinen-Marburger Martensite Kinetics: f_M = 1 - exp( -alpha_KM * (Ms - T) )
    alpha_km = 0.011 # 1/K
    martensite_fraction_at_rt = max(0.0, 1.0 - math.exp(-alpha_km * max(0.0, ms - 25.0))) if user_cr >= ccr * 0.8 else (user_cr / ccr) * 0.95
    martensite_fraction_at_rt = min(0.99, max(0.0, martensite_fraction_at_rt))
    
    # 4. LIFSHITZ-SLYOZOV-WAGNER (LSW) PRECIPITATE COARSENING
    # r^3(t) - r_0^3 = K_LSW * t
    # K_LSW = (8 * gamma * D * C_e * Vm^2) / (9 * R * T)
    aging_t_k = aging_temp_c + 273.15
    q_precip = alloy["Q_diff_kJ_mol"] * 1000.0
    d_diff = 1.2e-4 * math.exp(-q_precip / (8.314 * aging_t_k))
    k_lsw = (8.0 * 0.045 * d_diff * 0.02 * (1.1e-5 ** 2)) / (9.0 * 8.314 * aging_t_k) # m^3/s
    k_lsw_nm3_h = k_lsw * (1e9 ** 3) * 3600.0 # nm^3/h
    
    r0_nm = 1.5 # Initial nucleus radius
    aging_time_steps = [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 24.0, 48.0, 100.0]
    lsw_coarsening_profile = []
    
    for t_h in aging_time_steps:
        r_cube = (r0_nm ** 3) + max(1e-3, k_lsw_nm3_h) * t_h
        r_mean_nm = r_cube ** (1.0 / 3.0)
        
        # Orowan looping strengthening contribution (MPa) vs Cutting
        # Cutting: Delta sigma ~ sqrt(r)
        # Orowan looping: Delta sigma ~ 1 / r
        # Peak strength occurs around r_crit ~ 6-12 nm
        r_crit_nm = 9.0
        if r_mean_nm <= r_crit_nm:
            orowan_boost_mpa = 280.0 * math.sqrt(r_mean_nm / r_crit_nm)
            regime = "Weak-Pair / Strong-Pair Cutting"
        else:
            orowan_boost_mpa = 280.0 * (r_crit_nm / r_mean_nm)
            regime = "Orowan Dislocation Looping (Over-aged)"
            
        lsw_coarsening_profile.append({
            "agingTime_h": t_h,
            "meanRadius_nm": round(r_mean_nm, 2),
            "precipitationHardening_MPa": round(orowan_boost_mpa, 1),
            "strengtheningMechanism": regime
        })

    # 5. CALPHAD (Equilibrium) vs KINETICS (Non-Equilibrium) Gap Metrics
    calphad_vs_kinetics_gap = {
        "equilibriumPrediction": {
            "stablePhasesAtRT": "Ferrite + Cementite / Equilibrium intermetallics",
            "martensiteFraction": "0.0% (Thermodynamically Forbidden in Equilibrium)",
            "soluteSupersaturation": "Near Zero (<0.01 wt% C in ferrite)"
        },
        "kineticRealityAtSelectedCooling": {
            "coolingRate_C_s": user_cr,
            "criticalCoolingRate_C_s": ccr,
            "isSuppressedEquilibrium": user_cr >= 2.0,
            "predictedMartensite_pct": round(martensite_fraction_at_rt * 100.0, 1),
            "diffusionSuppressionIndex": round(min(1.0, user_cr / max(1e-2, ccr)), 3),
            "verdict": "Full Martensitic / Metastable Quench" if user_cr >= ccr else (
                "Mixed Microstructure (Martensite + Bainite)" if user_cr >= ccr * 0.2 else "Diffusional Equilibrium Decomposition"
            )
        }
    }

    compute_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return {
        "success": True,
        "engine": "MetalliX-Python-HPC-JMAK-Kinetics-v3.10",
        "computeTimeMs": compute_time_ms,
        "alloy": alloy_name,
        "alloyMetadata": alloy,
        "inputParameters": {
            "selectedCoolingRate_C_s": user_cr,
            "austSolutionTemp_C": aust_temp_c,
            "priorGrainSize_um": grain_size_um,
            "agingTemp_C": aging_temp_c,
            "agingTime_h": aging_time_h
        },
        "criticalTransformationTemperatures": {
            "Ae3_BetaTransus_GammaSolvus_C": ae3,
            "Ae1_C": ae1,
            "Ms_C": ms,
            "Mf_C": mf,
            "CriticalCoolingRate_CCR_C_s": ccr
        },
        "tttIsothermalCurves": ttt_curves,
        "cctContinuousCoolingMap": cct_transformation_map,
        "lswPrecipitateCoarsening": lsw_coarsening_profile,
        "calphadVsKineticsGap": calphad_vs_kinetics_gap
    }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--status":
        print(json.dumps({
            "status": "ready",
            "engine": "MetalliX Python JMAK & Diffusion Transformation Kinetics Solver",
            "capabilities": ["JMAK TTT C-Curves (1%, 50%, 99%)", "Scheil Additivity CCT Map", "Koistinen-Marburger Martensite", "LSW Precipitate Coarsening", "CALPHAD vs Kinetics Gap"]
        }))
        sys.exit(0)
        
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Empty stdin payload"}))
            sys.exit(1)
            
        data = json.loads(raw_input)
        mat = data.get("alloy", "AISI 4140")
        cr = data.get("coolingRate_C_s", 10.0)
        d_grain = data.get("grainSize_um", 25.0)
        t_aust = data.get("austTemp_C", 860.0)
        t_aging = data.get("agingTemp_C", 720.0)
        time_aging = data.get("agingTime_h", 8.0)
        
        result = solve_phase_transformation_kinetics(mat, cr, d_grain, t_aust, time_aging, t_aging)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

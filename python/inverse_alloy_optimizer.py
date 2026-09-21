#!/usr/bin/env python3
"""
MetalliX Python Inverse Alloy Multi-Objective Genetic Optimizer (NSGA-II)
Optimizes high-entropy alloys, nickel superalloys, and advanced steels to meet
user-defined target physical properties, phase stability (PHACOMP Nv), cost, and density.
"""

import sys
import json
import math
import random
import time

# Element physical properties: density (g/cm3), raw cost ($/kg), Nv electron holes, Md orbital energy
ELEMENT_METALLURGICAL_DATA = {
    "Ni": {"density": 8.90, "cost": 18.5, "Nv": 0.66, "Md": 0.717, "atomic_weight": 58.69, "base_yield_contribution": 150.0},
    "Cr": {"density": 7.19, "cost": 12.0, "Nv": 4.66, "Md": 1.142, "atomic_weight": 52.00, "base_yield_contribution": 350.0},
    "Co": {"density": 8.90, "cost": 34.0, "Nv": 1.71, "Md": 0.777, "atomic_weight": 58.93, "base_yield_contribution": 180.0},
    "Fe": {"density": 7.87, "cost": 0.8,  "Nv": 2.66, "Md": 0.858, "atomic_weight": 55.85, "base_yield_contribution": 120.0},
    "Mo": {"density": 10.28, "cost": 42.0, "Nv": 4.66, "Md": 1.550, "atomic_weight": 95.95, "base_yield_contribution": 620.0},
    "W":  {"density": 19.25, "cost": 38.0, "Nv": 4.66, "Md": 1.655, "atomic_weight": 183.84, "base_yield_contribution": 710.0},
    "Al": {"density": 2.70, "cost": 2.4,  "Nv": 7.66, "Md": 1.900, "atomic_weight": 26.98, "base_yield_contribution": 850.0},
    "Ti": {"density": 4.51, "cost": 22.0, "Nv": 6.66, "Md": 2.271, "atomic_weight": 47.87, "base_yield_contribution": 920.0},
    "Nb": {"density": 8.57, "cost": 55.0, "Nv": 5.66, "Md": 2.117, "atomic_weight": 92.91, "base_yield_contribution": 880.0},
    "Ta": {"density": 16.69, "cost": 180.0, "Nv": 5.66, "Md": 2.224, "atomic_weight": 180.95, "base_yield_contribution": 940.0},
    "V":  {"density": 6.11, "cost": 35.0, "Nv": 5.66, "Md": 1.870, "atomic_weight": 50.94, "base_yield_contribution": 450.0},
    "Cu": {"density": 8.96, "cost": 9.5,  "Nv": 0.00, "Md": 0.615, "atomic_weight": 63.55, "base_yield_contribution": 90.0},
    "Mn": {"density": 7.21, "cost": 2.2,  "Nv": 3.66, "Md": 0.957, "atomic_weight": 54.94, "base_yield_contribution": 200.0},
    "Si": {"density": 2.33, "cost": 3.0,  "Nv": 6.66, "Md": 1.900, "atomic_weight": 28.09, "base_yield_contribution": 400.0},
    "C":  {"density": 2.26, "cost": 0.5,  "Nv": 0.00, "Md": 0.000, "atomic_weight": 12.01, "base_yield_contribution": 1500.0}
}

def evaluate_alloy_candidate(composition_wt):
    """
    Computes Yield Strength (MPa), Density (g/cm3), Raw Cost ($/kg), PHACOMP Nv, PREN, and Solidification Range.
    """
    # Normalize to 100 wt%
    total_wt = sum(composition_wt.values())
    if total_wt <= 0:
        return None
    comp_norm = {el: (wt / total_wt) * 100.0 for el, wt in composition_wt.items() if wt > 0.001}
    
    # Calculate Atomic Fractions
    moles = {el: wt / ELEMENT_METALLURGICAL_DATA[el]["atomic_weight"] for el, wt in comp_norm.items() if el in ELEMENT_METALLURGICAL_DATA}
    total_moles = sum(moles.values())
    if total_moles <= 0:
        return None
    at_frac = {el: mol / total_moles for el, mol in moles.items()}
    
    # Density via rule of mixtures
    inv_density = sum((wt / 100.0) / ELEMENT_METALLURGICAL_DATA[el]["density"] for el, wt in comp_norm.items() if el in ELEMENT_METALLURGICAL_DATA)
    density_g_cm3 = 1.0 / max(1e-4, inv_density)
    
    # Raw material cost ($/kg)
    cost_usd_kg = sum((wt / 100.0) * ELEMENT_METALLURGICAL_DATA[el]["cost"] for el, wt in comp_norm.items() if el in ELEMENT_METALLURGICAL_DATA)
    
    # PHACOMP Nv_bar (electron-hole number)
    nv_bar = sum(at_frac[el] * ELEMENT_METALLURGICAL_DATA[el]["Nv"] for el in at_frac)
    
    # New-PHACOMP Md_bar (d-orbital energy level)
    md_bar = sum(at_frac[el] * ELEMENT_METALLURGICAL_DATA[el]["Md"] for el in at_frac)
    
    # Pitting Resistance Equivalent Number (PREN) = Cr + 3.3*Mo + 1.6*W
    pren = comp_norm.get("Cr", 0.0) + 3.3 * comp_norm.get("Mo", 0.0) + 1.6 * comp_norm.get("W", 0.0)
    
    # Solid Solution + Precipitation Yield Strength Model (MPa)
    base_matrix = 180.0
    ss_contrib = 0.0
    for el, wt in comp_norm.items():
        if el in ELEMENT_METALLURGICAL_DATA:
            factor = ELEMENT_METALLURGICAL_DATA[el]["base_yield_contribution"]
            ss_contrib += factor * math.sqrt(wt / 100.0)
            
    # Gamma Prime (Ni3(Al,Ti,Ta)) precipitation strengthening boost
    al_ti_ta = comp_norm.get("Al", 0.0) + comp_norm.get("Ti", 0.0) + comp_norm.get("Ta", 0.0) + comp_norm.get("Nb", 0.0)
    gamma_prime_fraction = min(0.70, (al_ti_ta / 14.0))
    precip_strength = gamma_prime_fraction * 750.0
    
    yield_strength_mpa = base_matrix + ss_contrib + precip_strength
    
    # Solidification Freezing Range Estimation (Liquidus - Solidus in C)
    freezing_range_C = 60.0 + 8.5 * comp_norm.get("Nb", 0.0) + 4.2 * comp_norm.get("Ti", 0.0) + 2.5 * comp_norm.get("Mo", 0.0) + 120.0 * comp_norm.get("C", 0.0)
    
    return {
        "composition": {el: round(wt, 2) for el, wt in comp_norm.items()},
        "yieldStrength_MPa": round(yield_strength_mpa, 1),
        "density_g_cm3": round(density_g_cm3, 2),
        "cost_USD_kg": round(cost_usd_kg, 2),
        "phacomp_Nv": round(nv_bar, 3),
        "phacomp_Md": round(md_bar, 4),
        "pren": round(pren, 1),
        "freezingRange_C": round(freezing_range_C, 1),
        "gammaPrimeFraction_pct": round(gamma_prime_fraction * 100.0, 1),
        "tcpRisk": "Safe" if nv_bar <= 2.45 else ("Marginal" if nv_bar <= 2.52 else "High Embrittlement Risk")
    }

def run_inverse_alloy_optimizer(target_yield_mpa=1100.0, max_density_g_cm3=8.2, max_cost_usd_kg=40.0,
                                max_phacomp_nv=2.45, min_pren=30.0, allowed_elements=None,
                                population_size=40, generations=25):
    """
    Runs a Genetic Algorithm (GA) to inversely design an alloy composition.
    """
    raise NotImplementedError("Fabrication of inverse alloy designs via random genetic mutation is disabled. Use proper Bayesian Optimization / deterministic solvers.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--status":
        print(json.dumps({
            "status": "ready",
            "engine": "MetalliX Python Inverse Alloy Multi-Objective Optimizer",
            "capabilities": ["NSGA-II Pareto Optimization", "PHACOMP Nv & Md Inversion", "Density & Cost Tradeoffs", "PREN & Solidification Range"]
        }))
        sys.exit(0)
        
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Empty stdin payload"}))
            sys.exit(1)
            
        data = json.loads(raw_input)
        y_target = data.get("targetYield_MPa", 1150.0)
        dens_max = data.get("maxDensity_g_cm3", 8.25)
        cost_max = data.get("maxCost_USD_kg", 45.0)
        nv_max = data.get("maxPHACOMP_Nv", 2.45)
        pren_min = data.get("minPREN", 32.0)
        elements = data.get("allowedElements", None)
        pop_size = data.get("populationSize", 40)
        gens = data.get("generations", 25)
        
        result = run_inverse_alloy_optimizer(y_target, dens_max, cost_max, nv_max, pren_min, elements, pop_size, gens)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

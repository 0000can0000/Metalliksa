"""Macro-scale thermomechanical and inherent strain evaluation."""

import math

MODEL_ID = "inherent-strain-analytical-v1"

def compute_inherent_strains(peak_temp_k, melting_temp_k, ambient_temp_k, cte_k_inv, youngs_modulus_gpa, yield_strength_mpa):
    """Estimate inherent strain components based on local thermal history."""
    if peak_temp_k < ambient_temp_k:
        peak_temp_k = ambient_temp_k
        
    delta_T = min(peak_temp_k, melting_temp_k) - ambient_temp_k
    if delta_T <= 0:
        return {"exx": 0.0, "eyy": 0.0, "ezz": 0.0, "von_mises_mpa": 0.0, "max_deflection_mm": 0.0}

    # Simplistic analytical inherent strain model:
    # e_star = - alpha * delta_T (modified by constraints)
    constraint_in_plane = 0.7
    constraint_out_of_plane = 0.1
    
    thermal_strain = cte_k_inv * delta_T
    exx = -constraint_in_plane * thermal_strain
    eyy = exx
    ezz = -constraint_out_of_plane * thermal_strain
    
    # Estimate residual stress using plane stress / simple elasticity bound by yield
    stress_estimate = abs(exx * youngs_modulus_gpa * 1000) # MPa
    von_mises_mpa = min(stress_estimate, float(yield_strength_mpa))
    
    # Simple cantilever/beam deflection estimate for a typical component (L=50mm, t=5mm)
    L_mm = 50.0
    t_mm = 5.0
    max_deflection_mm = abs(exx) * (L_mm ** 2) / (2 * t_mm)
    
    return {
        "exx": float(exx),
        "eyy": float(eyy),
        "ezz": float(ezz),
        "von_mises_mpa": float(von_mises_mpa),
        "max_deflection_mm": float(max_deflection_mm)
    }

def analyze_distortion(params, material, cfd_result=None):
    """
    Main API for calculating macro-scale distortion metrics.
    """
    melting_temp_k = float(material.get("melting_temp_c", 1400)) + 273.15
    ambient_temp_k = float(params.get("preheatTemp_C", 25)) + 273.15
    
    # Basic properties fallback
    cte_k_inv = float(material.get("cte", 1.5e-5))
    
    # These might not be standard in all materials, supply defaults
    youngs_modulus_gpa = float(material.get("youngs_modulus_gpa", 110.0))
    yield_strength_mpa = float(material.get("yield_strength_mpa", 500.0))
    
    if cfd_result and "diagnostics" in cfd_result and "maxT_K" in cfd_result["diagnostics"]:
        peak_temp_k = float(cfd_result["diagnostics"]["maxT_K"])
    elif cfd_result and "maxT_K" in cfd_result:
        peak_temp_k = float(cfd_result["maxT_K"])
    else:
        power = float(params.get("laserPower_W", 200))
        speed = float(params.get("scanSpeed_mms", 1000)) / 1000.0
        peak_temp_k = melting_temp_k + (power / (speed * 1e-3 + 1e-6)) * 0.1
    
    strain_metrics = compute_inherent_strains(
        peak_temp_k, melting_temp_k, ambient_temp_k, 
        cte_k_inv, youngs_modulus_gpa, yield_strength_mpa
    )
    
    risk_level = "low"
    if strain_metrics["von_mises_mpa"] >= yield_strength_mpa * 0.9:
        risk_level = "high"
    elif strain_metrics["von_mises_mpa"] >= yield_strength_mpa * 0.5:
        risk_level = "moderate"
        
    return {
        "modelId": MODEL_ID,
        "status": "calculated",
        "strains": {
            "exx": strain_metrics["exx"],
            "eyy": strain_metrics["eyy"],
            "ezz": strain_metrics["ezz"],
        },
        "residualStress": {
            "vonMises_MPa": strain_metrics["von_mises_mpa"],
            "yieldLimit_MPa": yield_strength_mpa,
            "riskLevel": risk_level
        },
        "distortion": {
            "maxDeflection_mm": strain_metrics["max_deflection_mm"],
            "referenceLength_mm": 50.0,
            "referenceThickness_mm": 5.0
        }
    }

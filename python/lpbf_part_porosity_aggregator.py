import math
import statistics

def aggregate_part_porosity(defect_samples, powder_gas_prior_percent=0.01):
    """
    Aggregate track/layer risks back to the CAD part and report a porosity interval,
    dominant mechanism, confidence, and relative density (%99.X).
    
    defect_samples is a list of results from defect_diagnostics() evaluated
    across a Monte Carlo sweep of inputs (power, speed, etc.).
    """
    if not defect_samples:
        return {"error": "No defect samples provided for aggregation."}

    lof_risks = []
    keyhole_risks = []
    balling_risks = []
    
    # Simple volume fraction estimators (calibration parameters)
    LOF_VOLUME_PENALTY = 0.05
    KEYHOLE_VOLUME_PENALTY = 0.02
    BALLING_VOLUME_PENALTY = 0.08
    
    porosity_samples = []
    mechanism_counts = {"lackOfFusion": 0, "keyhole": 0, "balling": 0, "gasPore": len(defect_samples)}
    
    for sample in defect_samples:
        sample_porosity = powder_gas_prior_percent
        
        # Lack of fusion
        lof = sample.get("lackOfFusion", {})
        if lof.get("status") in ("inadequate-penetration", "no-melt") or (lof.get("riskScreened") is False and lof.get("status") != "marginal"):
            sample_porosity += LOF_VOLUME_PENALTY
            mechanism_counts["lackOfFusion"] += 1
            lof_risks.append(1.0)
        elif lof.get("status") == "marginal":
            sample_porosity += LOF_VOLUME_PENALTY * 0.5
            lof_risks.append(0.5)
        else:
            lof_risks.append(0.0)
            
        # Keyhole
        kh = sample.get("keyhole", {})
        kh_risk = kh.get("risk")
        if kh_risk == "high":
            sample_porosity += KEYHOLE_VOLUME_PENALTY
            mechanism_counts["keyhole"] += 1
            keyhole_risks.append(1.0)
        elif kh_risk == "moderate":
            sample_porosity += KEYHOLE_VOLUME_PENALTY * 0.2
            keyhole_risks.append(0.5)
        else:
            keyhole_risks.append(0.0)
            
        # Balling
        bl = sample.get("balling", {})
        bl_risk = bl.get("risk")
        if bl_risk == "high":
            sample_porosity += BALLING_VOLUME_PENALTY
            mechanism_counts["balling"] += 1
            balling_risks.append(1.0)
        elif bl_risk == "moderate":
            sample_porosity += BALLING_VOLUME_PENALTY * 0.3
            balling_risks.append(0.5)
        else:
            balling_risks.append(0.0)
            
        porosity_samples.append(sample_porosity)
        
    avg_porosity = statistics.mean(porosity_samples)
    if len(porosity_samples) > 1:
        stdev_porosity = statistics.stdev(porosity_samples)
    else:
        stdev_porosity = 0.0
        
    p95_porosity = avg_porosity + 1.96 * stdev_porosity
    p05_porosity = max(0.0, avg_porosity - 1.96 * stdev_porosity)
    
    relative_density = 100.0 - (avg_porosity * 100.0)
    relative_density_lower = 100.0 - (p95_porosity * 100.0)
    
    dominant_mechanism = max(mechanism_counts, key=mechanism_counts.get)
    if mechanism_counts[dominant_mechanism] == 0:
        dominant_mechanism = "none"
        
    return {
        "status": "aggregated",
        "relativeDensity": {
            "mean_percent": round(max(0.0, relative_density), 3),
            "p05_percent": round(max(0.0, relative_density_lower), 3),
            "p95_percent": round(max(0.0, 100.0 - (p05_porosity * 100.0)), 3)
        },
        "porosity": {
            "mean_fraction": round(avg_porosity, 5),
            "stdev_fraction": round(stdev_porosity, 5)
        },
        "dominantMechanism": dominant_mechanism,
        "mechanismCounts": mechanism_counts,
        "confidence": "high" if len(defect_samples) > 10 else "low",
        "sampleCount": len(defect_samples)
    }

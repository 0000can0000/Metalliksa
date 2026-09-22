import os
import itertools
import pandas as pd
from lpbf_thermal_solver import calculate_meltpool_physics
from lpbf_defect_diagnostics import defect_diagnostics
from murakami_fatigue_screening import murakami_fatigue_limit_MPa

def generate_dataset():
    materials = ["Ti-6Al-4V", "Inconel 718"]
    powers = [100, 150, 200, 250, 300, 350, 400, 450]
    speeds = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000]
    hatch_spacings = [70, 90, 110]
    layers = [30, 40, 50]

    data = []
    
    total_combinations = len(materials) * len(powers) * len(speeds) * len(hatch_spacings) * len(layers)
    print(f"Generating synthetic dataset from physics models ({total_combinations} combinations)...")
    
    for mat in materials:
        for P, V, H, L in itertools.product(powers, speeds, hatch_spacings, layers):
            try:
                # Physics Calculation
                res = calculate_meltpool_physics(
                    material_name=mat,
                    laser_power_W=P,
                    scan_speed_mm_s=V,
                    beam_diameter_um=80.0,
                    preheat_temp_C=25.0,
                    layer_thickness_um=L,
                    hatch_spacing_um=H
                )
                
                geom = res.get("meltPoolGeometry", {})
                w = geom.get("width_um", 0)
                d = geom.get("depth_um", 0)
                length = geom.get("length_um", 0)
                cooling_rate = res.get("thermal", {}).get("coolingRate_K_s", 0)
                
                # Defect Diagnostics
                if w > 0 and d > 0:
                    diag = defect_diagnostics(w, d, length, H, L, aggregate=False)
                    lof_risk = diag.get("lackOfFusion", {}).get("riskScreened", "unknown")
                    keyhole_ratio = diag.get("keyhole", {}).get("depthToWidth", 0)
                    
                    # Estimate defect size purely for fatigue screening based on risk category
                    if lof_risk == "high":
                        defect_size_um = 60.0
                    elif lof_risk == "moderate":
                        defect_size_um = 30.0
                    else:
                        if keyhole_ratio is not None and keyhole_ratio > 0.6:
                            defect_size_um = 40.0
                        else:
                            defect_size_um = 5.0 # baseline intrinsic inclusion
                            
                    # Hardness baseline
                    hv = 340.0 if mat == "Ti-6Al-4V" else 440.0
                    fatigue = murakami_fatigue_limit_MPa(defect_size_um, hv, "internal")
                    
                    data.append({
                        "Material": mat,
                        "Power_W": P,
                        "Speed_mm_s": V,
                        "Hatch_um": H,
                        "Layer_um": L,
                        "Width_um": w,
                        "Depth_um": d,
                        "Length_um": length,
                        "CoolingRate_K_s": cooling_rate,
                        "LOF_Risk": lof_risk,
                        "Keyhole_Ratio": keyhole_ratio,
                        "DefectSize_um": defect_size_um,
                        "FatigueLimit_MPa": fatigue
                    })
            except Exception as e:
                pass

    df = pd.DataFrame(data)
    os.makedirs("../data", exist_ok=True)
    df.to_csv("../data/synthetic_process_map.csv", index=False)
    print(f"Generated {len(df)} data points successfully!")
    print("Sample output:")
    print(df.head())

if __name__ == "__main__":
    generate_dataset()

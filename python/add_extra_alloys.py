import os
import itertools
import pandas as pd
from lpbf_thermal_solver import calculate_meltpool_physics
from lpbf_defect_diagnostics import defect_diagnostics
from murakami_fatigue_screening import murakami_fatigue_limit_MPa
from phase9_surrogate import train_surrogate

def generate_extra_alloys_data():
    # Define materials and their approximate Vickers Hardness (HV)
    materials = [
        {"name": "Inconel 625", "hv": 280.0},
        {"name": "CoCrMo", "hv": 350.0},
        {"name": "Hastelloy X", "hv": 240.0}
    ]
    
    powers = [100, 150, 200, 250, 300, 350, 400, 450]
    speeds = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000]
    hatch_spacings = [70, 90, 110]
    layers = [30, 40, 50]

    all_data = []
    
    for mat_info in materials:
        mat = mat_info["name"]
        hv = mat_info["hv"]
        print(f"Generating {mat} physical dataset...")
        
        count = 0
        for P, V, H, L in itertools.product(powers, speeds, hatch_spacings, layers):
            try:
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
                
                if w > 0 and d > 0:
                    diag = defect_diagnostics(w, d, length, H, L, aggregate=False)
                    lof_risk = diag.get("lackOfFusion", {}).get("riskScreened", "unknown")
                    keyhole_ratio = diag.get("keyhole", {}).get("depthToWidth", 0)
                    
                    if lof_risk == "high":
                        defect_size_um = 60.0
                    elif lof_risk == "moderate":
                        defect_size_um = 30.0
                    else:
                        if keyhole_ratio is not None and keyhole_ratio > 0.6:
                            defect_size_um = 40.0
                        else:
                            defect_size_um = 5.0
                            
                    fatigue = murakami_fatigue_limit_MPa(defect_size_um, hv, "internal")
                    
                    all_data.append({
                        "Material": mat, "Power_W": P, "Speed_mm_s": V, "Hatch_um": H,
                        "Layer_um": L, "Width_um": w, "Depth_um": d, "Length_um": length,
                        "CoolingRate_K_s": cooling_rate, "LOF_Risk": lof_risk,
                        "Keyhole_Ratio": keyhole_ratio, "DefectSize_um": defect_size_um,
                        "FatigueLimit_MPa": fatigue
                    })
                    count += 1
            except Exception as e:
                pass
        print(f" -> Generated {count} valid combinations for {mat}.")

    df_new = pd.DataFrame(all_data)
    csv_path = "../data/synthetic_process_map.csv"
    if os.path.exists(csv_path):
        df_old = pd.read_csv(csv_path)
        # Remove existing rows for these materials if any
        mat_names = [m["name"] for m in materials]
        df_old = df_old[~df_old["Material"].isin(mat_names)]
        df_combined = pd.concat([df_old, df_new], ignore_index=True)
    else:
        df_combined = df_new
        
    df_combined.to_csv(csv_path, index=False)
    print(f"\nAdded {len(df_new)} total rows. Dataset size: {len(df_combined)}")

    for mat_info in materials:
        mat = mat_info["name"]
        print(f"Training surrogate for {mat}...")
        train_surrogate(mat, 200)

if __name__ == "__main__":
    generate_extra_alloys_data()
    print("Done!")

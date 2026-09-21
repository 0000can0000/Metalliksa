import json
from meltpool_literature_catalog import TRACKS
from lpbf_simulation import run

results = []
for t in TRACKS:
    if t["material"] not in ("Inconel 718", "316L Stainless Steel"): continue
    
    try:
        p = {
            "mode": "standard",
            "material": t["material"],
            "power_W": t["laserPower_W"],
            "speed_mm_s": t["scanSpeed_mm_s"],
            "beamDiameter_um": t["beamDiameter_um"],
            "preheat_C": t["preheatTemp_C"],
            "mesh_um": 20,
            "layer_um": 40,
            "trackLength_um": 300,
            "backend": "reference"
        }
        res = run(p)
        w = res["metrics"]["width_um"]
        d = res["metrics"]["depth_um"]
        
        results.append({
            "id": t["id"],
            "material": t["material"],
            "measured_W": t["width_um"],
            "measured_D": t["depth_um"],
            "sim_W": w,
            "sim_D": d
        })
    except Exception as e:
        print(f"Error on {t['id']}: {e}")

print(f"{'ID':<20} | {'Meas W':<10} | {'Sim W':<10} | {'Meas D':<10} | {'Sim D':<10}")
print("-" * 70)
for r in results:
    print(f"{r['id']:<20} | {r['measured_W']:<10.1f} | {r['sim_W']:<10.1f} | {r['measured_D']:<10.1f} | {r['sim_D']:<10.1f}")

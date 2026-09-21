import json
from lpbf_simulation import run

# Default 40um mesh (dt ~ 1.5e-5)
res40 = run({"mode":"standard", "power_W": 40, "mesh_um": 40, "trackLength_um": 200, "cooling_s": .0001, "dwell_s": 0, "backend":"reference"})
print("40um Peak (auto dt):", res40["metrics"]["peakTemperature_K"])

# 40um mesh with 20um's dt (approx 3.7e-6)
res40_small_dt = run({"mode":"standard", "power_W": 40, "mesh_um": 40, "maxDt_s": 1e-6, "trackLength_um": 200, "cooling_s": .0001, "dwell_s": 0, "backend":"reference"})
print("40um Peak (maxDt=1e-6):", res40_small_dt["metrics"]["peakTemperature_K"])

# 20um mesh
res20 = run({"mode":"standard", "power_W": 40, "mesh_um": 20, "trackLength_um": 200, "cooling_s": .0001, "dwell_s": 0, "backend":"reference"})
print("20um Peak:", res20["metrics"]["peakTemperature_K"])

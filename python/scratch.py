import json
from lpbf_simulation import run

print("Running 40um mesh:")
res40 = run({"mode":"standard", "power_W": 40, "mesh_um": 40, "trackLength_um": 200, "cooling_s": .0001, "dwell_s": 0, "backend":"reference"})
print("40um Peak:", res40["metrics"]["peakTemperature_K"])

print("Running 20um mesh:")
res20 = run({"mode":"standard", "power_W": 40, "mesh_um": 20, "trackLength_um": 200, "cooling_s": .0001, "dwell_s": 0, "backend":"reference"})
print("20um Peak:", res20["metrics"]["peakTemperature_K"])

import json
from pathlib import Path
from lpbf_simulation import run
from lpbf_material_registry import catalog

m = next(m for m in catalog() if m["name"] == "Ti-6Al-4V")
p = {
    "backend": "openfoam-cfd",
    "mode": "high-fidelity",
    "study": "none",
    "mesh_um": 20,
    "maxDt_s": 1e-6,
    "preheat_C": 20,
    "tracks": 1,
    "layers": 1,
    "layer_um": 40,
    "hatch_um": 100,
    "trackLength_um": 100,
    "scanAngle_deg": 0,
    "layerRotation_deg": 0,
    "power_W": 200,
    "beamDiameter_um": 70,
    "speed_mm_s": 800,
    "packingFraction": 0.5,
    "powderConductivityRatio": 0.1,
    "convection_W_m2K": 10
}

caps = {"openfoamThermal": True, "openfoamVersion": "OpenFOAM-14"}
print("Running full CFD pipeline...")
res = run({"settings": p, "material": m}, capabilities=caps)
print("Keys in result:", res.keys())
print("CFD Diagnostics:", res.get("numericalDiagnostics"))

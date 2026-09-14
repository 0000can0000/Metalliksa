# src/components/ElectrochemicalAnalysisSuite.tsx

- ElectrochemicalDomain · type · L72-L87 — type ElectrochemicalDomain = | "battery" | "corrosion" | "circuit-builder" | "preset-library" | "cnls-fitter" | "eis-upload-insights" | "batch-degradation" | "physical-validation" | "ocp-g59" | "pourbaix-studio" | "multi-material" | "transmission-line" | "synthetic-noise" | "dual-overview" | "python-data-upload";
- BatteryTechMode · type · L89-L96 — type BatteryTechMode = | "eis-impedance" | "circuit-builder" | "dq-dv-spectrogram" | "cv-kinetics" | "li-plating-safety" | "full-chemistry-lab" | "python-upload";
- CorrosionTechMode · type · L98-L107 — type CorrosionTechMode = | "tafel-polarization" | "annual-corrosion-rate" | "pourbaix-e-ph" | "circuit-builder" | "galvanic-mixed" | "coating-eis" | "ocp-astm-g59" | "full-corrosion-lab" | "python-upload";
- BatteryChemPreset · interface · L110-L127 — interface BatteryChemPreset
- CorrosionMetalPreset · interface · L217-L232 — interface CorrosionMetalPreset
- ElectrochemicalAnalysisSuite · function · L349-L813 — function ElectrochemicalAnalysisSuite()

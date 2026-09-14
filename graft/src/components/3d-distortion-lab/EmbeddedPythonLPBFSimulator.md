# src/components/3d-distortion-lab/EmbeddedPythonLPBFSimulator.tsx

- EmbeddedPythonLPBFSimulatorProps · interface · L25-L35 — interface EmbeddedPythonLPBFSimulatorProps
- PythonScriptTemplate · type · L37-L41 — type PythonScriptTemplate = | "solidification-gxr-rosenthal" | "porosity-keyhole-lof" | "hunt-cet-kinetics" | "multi-track-accumulation";
- EmbeddedPythonLPBFSimulator · function · L43-L541 — EmbeddedPythonLPBFSimulator: React.FC<EmbeddedPythonLPBFSimulatorProps> = ({ alloy, laserPower_W, scanSpeed_mms, beamDiameter_um, bedPreheat_C, layerThickness_um, hatchSpacing_um, effectiveN0_m3, onSimulationComplete, })
- handleSelectTemplate · function · L285-L288 — handleSelectTemplate = (template: PythonScriptTemplate)
- handleInjectParameters · function · L291-L293 — handleInjectParameters = ()
- handleCopyCode · function · L296-L300 — handleCopyCode = ()
- handleDownloadPy · function · L303-L311 — handleDownloadPy = ()
- runPythonSimulation · function · L316-L378 — runPythonSimulation = async ()

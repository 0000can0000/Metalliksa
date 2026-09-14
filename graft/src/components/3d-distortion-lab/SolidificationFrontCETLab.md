# src/components/3d-distortion-lab/SolidificationFrontCETLab.tsx

- ScanStrategyType · type · L69-L69 — type ScanStrategyType = "meander" | "unidirectional" | "rotate90" | "rotate67";
- VisualizationMode · type · L70-L70 — type VisualizationMode = "cet-map" | "cooling-rate-gxr" | "thermal-gradient-g" | "solidification-rate-r" | "grain-growth-angle" | "microstructure-synthetic";
- AlloySolidificationData · interface · L72-L101 — interface AlloySolidificationData
- SolidificationCETLabProps · interface · L262-L276 — interface SolidificationCETLabProps
- SolidificationFrontCETLab · function · L278-L1861 — SolidificationFrontCETLab: React.FC<SolidificationCETLabProps> = ({ currentPower_W = 285, currentSpeed_mms = 960, currentHatch_um = 110, currentBeamDiameter_um = 80, currentPreheat_C = 80, currentLayer_um = 40, currentMaterial = "Inconel 718", onApplyParameters, })
- scaleX · function · L582-L582 — scaleX = (y_um: number)
- scaleZ · function · L583-L583 — scaleZ = (z_um: number)
- handleCopyPython · function · L987-L991 — handleCopyPython = ()

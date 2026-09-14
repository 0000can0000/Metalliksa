# src/components/LaserMeltPoolThermalMap.tsx

- Props · interface · L32-L49 — interface Props
- ThermalMapMode · type · L51-L51 — type ThermalMapMode = "temperature" | "cooling-rate" | "solidification-front" | "thermal-gradient";
- ViewAngle · type · L52-L52 — type ViewAngle = "top-down" | "longitudinal-side" | "transverse-front";
- LaserMeltPoolThermalMap · function · L54-L1266 — LaserMeltPoolThermalMap: React.FC<Props> = ({ candidate, targets, laserPower_W: initialLaserPower, scanSpeed_mms: initialScanSpeed, beamDiameter_um: initialBeamDiameter, preheatTemp_C: initialPreheatTemp, layerThickness_um: initialLayerThickness = 40, hatchSpacing_um: initialHatchSpacing = 100, onParametersChange, })
- handleCanvasMouseMove · function · L615-L662 — handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>)
- exportGoldakCard · function · L684-L716 — exportGoldakCard = ()

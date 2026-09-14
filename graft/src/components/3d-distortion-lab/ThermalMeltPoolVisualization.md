# src/components/3d-distortion-lab/ThermalMeltPoolVisualization.tsx

- AlloyThermalProfile · interface · L39-L56 — interface AlloyThermalProfile
- ViewPlane · type · L169-L169 — type ViewPlane = "xy-longitudinal" | "xz-side" | "yz-transverse";
- HeatmapColorMode · type · L170-L170 — type HeatmapColorMode = "cooling-rate" | "temperature" | "gradient" | "solidification-velocity" | "hunt-microstructure";
- SolidificationProbeData · interface · L172-L183 — interface SolidificationProbeData
- ThermalMeltPoolVisualization · function · L185-L1487 — ThermalMeltPoolVisualization: React.FC = ()
- setLaserPower_W · function · L220-L220 — setLaserPower_W = (v: number)
- setScanSpeed_mms · function · L221-L221 — setScanSpeed_mms = (v: number)
- setBeamSpotRadius_um · function · L222-L222 — setBeamSpotRadius_um = (v: number)
- setPreheatTemp_C · function · L223-L223 — setPreheatTemp_C = (v: number)
- setBeamProfile · function · L224-L225 — setBeamProfile = (v: "gaussian" | "top-hat")
- handleSelectAlloy · function · L248-L250 — handleSelectAlloy = (aId: string)
- formatSvgPath · function · L494-L498 — formatSvgPath = (topPts: { x: number; y: number }[], botPts: { x: number; y: number }[])
- handleSvgClick · function · L693-L703 — handleSvgClick = (e: React.MouseEvent<SVGSVGElement>)
- handleExportCsv · function · L706-L718 — handleExportCsv = ()

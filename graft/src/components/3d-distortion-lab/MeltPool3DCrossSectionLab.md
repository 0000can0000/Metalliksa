# src/components/3d-distortion-lab/MeltPool3DCrossSectionLab.tsx

- MeltPool3DCrossSectionProps · interface · L49-L66 — interface MeltPool3DCrossSectionProps
- SlicingPlane · type · L68-L68 — type SlicingPlane = "longitudinal-xz" | "transverse-yz" | "top-xy" | "isometric-3d" | "quarter-cutaway";
- MeltPool3DCrossSectionLab · function · L70-L1358 — MeltPool3DCrossSectionLab: React.FC<MeltPool3DCrossSectionProps> = ({ initialPower_W = 285, initialSpeed_mms = 960, initialBeamDiameter_um = 80, initialPreheat_C = 80, initialLayer_um = 40, initialHatch_um = 110, initialMaterial = "Inconel 718", onParametersChange, })
- handleMouseDown · function · L287-L291 — handleMouseDown = (e: MouseEvent)
- handleMouseMove · function · L292-L298 — handleMouseMove = (e: MouseEvent)
- handleMouseUp · function · L299-L301 — handleMouseUp = ()
- handleWheel · function · L302-L307 — handleWheel = (e: WheelEvent)
- animate · function · L326-L332 — animate = ()
- applyPreset · function · L561-L587 — applyPreset = (preset: "conduction-safe" | "transition-deep" | "keyhole-danger" | "lack-of-fusion")
- exportGoldakCard · function · L590-L623 — exportGoldakCard = ()

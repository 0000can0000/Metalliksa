# src/components/3d-distortion-lab/SolidificationMeltPool3DWebGL.tsx

- SolidificationMeltPool3DProps · interface · L39-L49 — interface SolidificationMeltPool3DProps
- WebGL3DViewMode · type · L51-L57 — type WebGL3DViewMode = | "cooling-rate-gxr" | "thermal-gradient-g" | "solidification-rate-r" | "cet-morphology" | "porosity-defects" | "temperature-field";
- ClippingSliceMode · type · L59-L59 — type ClippingSliceMode = "none" | "quarter-cut" | "longitudinal-xz" | "transverse-yz" | "top-xy";
- SimulatedPore · interface · L61-L70 — interface SimulatedPore
- SolidificationMeltPool3DWebGL · function · L72-L1188 — SolidificationMeltPool3DWebGL: React.FC<SolidificationMeltPool3DProps> = ({ alloy, laserPower_W, scanSpeed_mms, beamDiameter_um, bedPreheat_C, layerThickness_um, hatchSpacing_um, effectiveN0_m3, onProbeChange, })
- makeAxisArrow · function · L494-L497 — makeAxisArrow = (dir: THREE.Vector3, color: number, label: string)
- handleResize · function · L697-L704 — handleResize = ()
- animate · function · L710-L738 — animate = (time: number)
- handleMouseDown · function · L767-L770 — handleMouseDown = (e: React.MouseEvent)
- handleMouseMove · function · L772-L784 — handleMouseMove = (e: React.MouseEvent)
- handleMouseUp · function · L786-L788 — handleMouseUp = ()
- handleWheel · function · L790-L793 — handleWheel = (e: React.WheelEvent)
- applyCameraPreset · function · L795-L810 — applyCameraPreset = (preset: "iso" | "top" | "side" | "front")

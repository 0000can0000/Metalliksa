# src/components/3d-distortion-lab/CADStlSlicerDistortionLab.tsx

- CADModelType · type · L51-L51 — type CADModelType = "bracket" | "turbine" | "nozzle" | "gyroid" | "hip_implant" | "custom_stl";
- SlicerHeatmapMode · type · L52-L58 — type SlicerHeatmapMode = | "residual-stress" | "total-distortion" | "recoater-upward-warp" | "inherent-strain" | "hot-tearing-rdg" | "energy-density";
- BoundaryConditionMode · type · L60-L60 — type BoundaryConditionMode = "as_built_clamped" | "post_cutoff_released";
- AlloyDefinition · interface · L62-L74 — interface AlloyDefinition
- CADStlSlicerDistortionLabProps · interface · L144-L160 — interface CADStlSlicerDistortionLabProps
- CADStlSlicerDistortionLab · function · L162-L1808 — CADStlSlicerDistortionLab: React.FC<CADStlSlicerDistortionLabProps> = ({ laserPower_W: jobPower, scanSpeed_mms: jobSpeed, hatchSpacing_um: jobHatch, layerThickness_um: jobLayer, bedPreheat_C: jobPreheat, scanStrategy: jobScan, onProcessChange, })
- handleFileUpload · function · L450-L475 — handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>)
- handleClearStl · function · L477-L484 — handleClearStl = ()
- updateCameraPos · function · L701-L706 — updateCameraPos = ()
- onMouseDown · function · L709-L712 — onMouseDown = (e: MouseEvent)
- onMouseMove · function · L714-L722 — onMouseMove = (e: MouseEvent)
- onMouseUp · function · L724-L726 — onMouseUp = ()
- onWheel · function · L728-L732 — onWheel = (e: WheelEvent)
- animate · function · L742-L745 — animate = ()
- handleExportWarpedSTL · function · L874-L883 — handleExportWarpedSTL = ()
- handleExportCertificationReport · function · L886-L934 — handleExportCertificationReport = ()

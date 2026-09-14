# src/components/3d-distortion-lab/MarangoniPoreInstabilityLab.tsx

- MarangoniLabProps · interface · L36-L43 — interface MarangoniLabProps
- MarangoniPoreInstabilityLab · function · L123-L1292 — MarangoniPoreInstabilityLab: React.FC<MarangoniLabProps> = ({ initialPower_W = 285, initialSpeed_mms = 960, initialBeamDiameter_um = 90, initialPreheat_C = 200, initialMaterial = "Inconel 718", onApplyParameters, })
- runSimulation · function · L184-L234 — runSimulation = async ()
- getScalarColor · function · L242-L282 — getScalarColor = ( voxel: VoxelHeatmapDatum, scalar: "pore-prob" | "temperature" | "velocity" | "downward-drag" | "vorticity", result: PythonMarangoniPoreResult ): THREE.Color
- updateCameraPos · function · L360-L365 — updateCameraPos = ()
- handleMouseDown · function · L368-L372 — handleMouseDown = (e: MouseEvent)
- handleMouseMove · function · L374-L384 — handleMouseMove = (e: MouseEvent)
- handleMouseUp · function · L386-L388 — handleMouseUp = ()
- handleWheel · function · L390-L394 — handleWheel = (e: WheelEvent)
- animate · function · L417-L432 — animate = ()
- setCameraPreset · function · L656-L670 — setCameraPreset = (preset: "iso" | "top" | "side" | "front")
- handleCopyCode · function · L673-L678 — handleCopyCode = ()
- handleDownloadCode · function · L681-L690 — handleDownloadCode = ()
- getPythonCodeSnippet · function · L693-L764 — getPythonCodeSnippet = ()

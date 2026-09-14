# src/components/GrainGrowthKineticsPanel.tsx

- GrainGrowthKineticsPanelProps · interface · L24-L31 — interface GrainGrowthKineticsPanelProps
- KineticsTimePoint · interface · L33-L46 — interface KineticsTimePoint
- StageGrowthAudit · interface · L48-L62 — interface StageGrowthAudit
- GrainGrowthKineticsPanel · function · L64-L1347 — GrainGrowthKineticsPanel: React.FC<GrainGrowthKineticsPanelProps> = ({ stages, material, initialGrainSize_um, onInitialGrainSizeChange, onSeekTime, activePlaybackTime_min = 0, })
- handleD0Change · function · L98-L104 — handleD0Change = (newVal: number)
- handleResetToMaterial · function · L107-L116 — handleResetToMaterial = ()
- calcASTM_G · function · L119-L124 — calcASTM_G = (d_um: number): number
- getZenerBoundary · function · L127-L149 — getZenerBoundary = (temp_C: number): number
- handleCopyAuditTable · function · L321-L343 — handleCopyAuditTable = ()
- handleExportJSON · function · L346-L373 — handleExportJSON = ()
- getX · function · L398-L398 — getX = (t: number)
- getY_Grain · function · L399-L399 — getY_Grain = (d: number)
- getY_Temp · function · L400-L400 — getY_Temp = (temp: number)
- handleSvgMouseMove · function · L442-L465 — handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>)

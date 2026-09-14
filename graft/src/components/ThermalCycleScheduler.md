# src/components/ThermalCycleScheduler.tsx

- StageType · type · L44-L44 — type StageType = "ramp" | "soak" | "quench";
- ThermalStage · interface · L46-L56 — interface ThermalStage
- MaterialThermalProfile · interface · L58-L75 — interface MaterialThermalProfile
- HeatTreatmentPreset · interface · L296-L302 — interface HeatTreatmentPreset
- SimulationTimePoint · interface · L593-L604 — interface SimulationTimePoint
- ThermalCycleSchedulerProps · interface · L606-L608 — interface ThermalCycleSchedulerProps
- ThermalCycleScheduler · function · L610-L1893 — ThermalCycleScheduler: React.FC<ThermalCycleSchedulerProps> = ({ onNavigate })
- getZenerAndPrecip · function · L717-L757 — getZenerAndPrecip = (T_C: number)
- getASTM_G · function · L760-L764 — getASTM_G = (D_um: number)
- getYieldAndHardness · function · L767-L775 — getYieldAndHardness = (D_um: number, precipPct: number, T_C: number)
- handleApplyPreset · function · L1011-L1019 — handleApplyPreset = (presetId: string)
- handleAddStage · function · L1021-L1066 — handleAddStage = (type: StageType)
- handleUpdateStage · function · L1068-L1086 — handleUpdateStage = (updated: Partial<ThermalStage>)
- handleDeleteStage · function · L1088-L1093 — handleDeleteStage = (idToDelete: string)
- handleCopyRecipeTable · function · L1095-L1115 — handleCopyRecipeTable = ()
- handleExportThermalTrace · function · L1117-L1123 — handleExportThermalTrace = ()
- handleExportRecipeJSON · function · L1125-L1149 — handleExportRecipeJSON = ()
- handleLoadIngestedCycle · function · L1152-L1211 — handleLoadIngestedCycle = ()

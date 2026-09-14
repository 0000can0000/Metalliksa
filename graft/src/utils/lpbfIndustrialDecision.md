# src/utils/lpbfIndustrialDecision.ts

- PrintVerdict · type · L12-L12 — type PrintVerdict = "printable" | "risky" | "do-not-print";
- SolverMaterialMap · interface · L14-L18 — interface SolverMaterialMap
- mapSpecimenToSolverMaterials · function · L20-L38 — function mapSpecimenToSolverMaterials( name: string, baseMetal: BaseMetalType ): SolverMaterialMap
- inferSlicerPreset · function · L40-L47 — function inferSlicerPreset(cadAssetName: string): "nozzle" | "turbine" | "bracket" | "gyroid" | "hip_implant"
- LiteratureMatch · interface · L49-L52 — interface LiteratureMatch
- LiteratureLiveDerived · interface · L54-L58 — interface LiteratureLiveDerived
- LiteratureOverlayPoint · interface · L60-L66 — interface LiteratureOverlayPoint
- alloyRecordPool · function · L68-L73 — function alloyRecordPool(alloyId: LPBFAlloyId): TraceableLPBFRecord[]
- literatureOverlayPoints · function · L75-L83 — function literatureOverlayPoints(alloyId: LPBFAlloyId): LiteratureOverlayPoint[]
- findNearestLiteratureRecord · function · L85-L102 — function findNearestLiteratureRecord( alloyId: LPBFAlloyId, power_W: number, speed_mm_s: number, hatch_um: number, layer_um: number, live?: LiteratureLiveDerived ): LiteratureMatch | null
- livePeakIntensity · function · L104-L112 — function livePeakIntensity(power_W: number, live?: LiteratureLiveDerived): number | undefined
- nearestInPool · function · L114-L147 — function nearestInPool( pool: TraceableLPBFRecord[], power_W: number, speed_mm_s: number, hatch_um: number, layer_um: number, live?: LiteratureLiveDerived ): LiteratureMatch | null

# src/store/useMaterialSpecimenStore.ts

- BaseMetalType · type · L7-L7 — type BaseMetalType = "Ni" | "Fe" | "Ti" | "Al" | "Cu" | "Co" | "Mg" | "Refractory" | "Other";
- LpbfScanStrategy · type · L9-L9 — type LpbfScanStrategy = "island" | "meander-67" | "stripe";
- LpbfBeamProfile · type · L10-L10 — type LpbfBeamProfile = "gaussian" | "flat-top";
- LpbfSpecimenState · interface · L12-L44 — interface LpbfSpecimenState
- LpbfProcessPatch · type · L46-L63 — type LpbfProcessPatch = Partial< Pick< LpbfSpecimenState, | "laserPower_W" | "scanSpeed_mms" | "hatch_um" | "layer_um" | "beamDiameter_um" | "preheatTemp_C" | "scanStrategy" | "beamProfile" | "cadAssetName" | "specimenDoi" | "processSeed" | "inclineAngle_deg" | "downskinOverhang_deg" > >;
- withLpbfProcessDefaults · function · L65-L95 — function withLpbfProcessDefaults(lpbf: Partial<LpbfSpecimenState> & Pick<LpbfSpecimenState, "recommendedLaserPower_W" | "recommendedScanSpeed_mms" | "recommendedHatch_um" | "recommendedLayer_um" | "recommendedPreheatTemp_C">): LpbfSpecimenState
- ActiveSpecimenState · interface · L97-L140 — interface ActiveSpecimenState
- MaterialSpecimenStore · interface · L142-L156 — interface MaterialSpecimenStore
- detectBaseMetalFromComposition · function · L162-L181 — function detectBaseMetalFromComposition(comp: Record<string, number>): BaseMetalType
- calculateAlloyDensity · function · L210-L224 — function calculateAlloyDensity(comp: Record<string, number>): number
- generateChemicalFormula · function · L227-L247 — function generateChemicalFormula(comp: Record<string, number>, baseMetal: BaseMetalType): string
- deriveSpecimenProperties · function · L250-L467 — function deriveSpecimenProperties( composition: Record<string, number>, customName?: string, forcedBase?: BaseMetalType ): Omit<ActiveSpecimenState, "id" | "sourceTab" | "lastModified" | "isCustomModified">

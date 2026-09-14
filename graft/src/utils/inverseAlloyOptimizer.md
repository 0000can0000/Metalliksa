# src/utils/inverseAlloyOptimizer.ts

- AlloyComposition · interface · L3-L5 — interface AlloyComposition
- InverseDesignTargets · interface · L7-L26 — interface InverseDesignTargets
- StrengthBreakdown · interface · L28-L39 — interface StrengthBreakdown
- TempYieldPoint · interface · L41-L44 — interface TempYieldPoint
- ScheilKouSolidificationMetrics · interface · L46-L55 — interface ScheilKouSolidificationMetrics
- CandidateAlloySolution · interface · L57-L130 — interface CandidateAlloySolution
- getBinaryEnthalpy · function · L142-L149 — function getBinaryEnthalpy(elem1: string, elem2: string): number
- weightToAtomicFractions · function · L152-L172 — function weightToAtomicFractions(compWt: AlloyComposition): { [elem: string]: number }
- calculateThermodynamicProfile · function · L175-L291 — function calculateThermodynamicProfile(compWt: AlloyComposition)
- calculatePhysicalStrengthBreakdown · function · L298-L388 — function calculatePhysicalStrengthBreakdown( baseMatrix: InverseDesignTargets["baseMatrix"], compWt: AlloyComposition, deltaMismatchPct: number, targetYield_MPa: number ): StrengthBreakdown
- calculateTemperatureYieldCurve · function · L391-L448 — function calculateTemperatureYieldCurve( baseMatrix: InverseDesignTargets["baseMatrix"], yield25C_MPa: number, meltingPoint_C: number, maxServiceTemp_C: number ): TempYieldPoint[]
- calculateScheilKouMetrics · function · L451-L497 — function calculateScheilKouMetrics( avgMeltingPoint: number, freezingRange_C: number, deltaMismatchPct: number, manufacturingRoute: InverseDesignTargets["manufacturingRoute"] ): ScheilKouSolidificationMetrics
- solveInverseAlloyCandidates · function · L500-L1050 — function solveInverseAlloyCandidates(targets: InverseDesignTargets): CandidateAlloySolution[]
- normalizeComposition · function · L1052-L1062 — function normalizeComposition(comp: AlloyComposition)
- generatePythonJupyterScript · function · L1065-L1175 — function generatePythonJupyterScript(target: InverseDesignTargets, candidate: CandidateAlloySolution): string

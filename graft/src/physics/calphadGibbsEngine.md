# src/physics/calphadGibbsEngine.ts

- PureElementSGTE · interface · L8-L15 — interface PureElementSGTE
- PhaseModel · interface · L17-L32 — interface PhaseModel
- BinarySystemThermodynamics · interface · L34-L52 — interface BinarySystemThermodynamics
- CommonTangentResult · interface · L543-L552 — interface CommonTangentResult
- PhaseEquilibriumState · interface · L554-L565 — interface PhaseEquilibriumState
- ScheilSolidificationPoint · interface · L567-L575 — interface ScheilSolidificationPoint
- ScheilSolidificationResult · interface · L577-L587 — interface ScheilSolidificationResult
- evaluatePhaseGibbsEnergy · function · L592-L597 — function evaluatePhaseGibbsEnergy(phase: PhaseModel, T_K: number, xB: number): number
- calculateChemicalPotentials · function · L604-L620 — function calculateChemicalPotentials( phase: PhaseModel, T_K: number, xB: number ): { muA: number; muB: number; dG_dx: number }
- solveCommonTangent · function · L629-L700 — function solveCommonTangent( phase1: PhaseModel, phase2: PhaseModel, T_K: number, searchRange1: [number, number] = [0.01, 0.49], searchRange2: [number, number] = [0.51, 0.99] ): CommonTangentResult | null
- calculatePhaseEquilibrium · function · L706-L807 — function calculatePhaseEquilibrium( system: BinarySystemThermodynamics, T_K: number, xB_nominal: number ): PhaseEquilibriumState
- simulateScheilSolidification · function · L817-L918 — function simulateScheilSolidification( system: BinarySystemThermodynamics, nominalCompositionB: number ): ScheilSolidificationResult
- exportCALPHAD_TDB · function · L923-L971 — function exportCALPHAD_TDB(system: BinarySystemThermodynamics): string

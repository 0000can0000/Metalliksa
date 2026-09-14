# src/utils/cnlsOptimizer.ts

- AdjustableParam · interface · L15-L27 — interface AdjustableParam
- ComplexNumber · interface · L29-L32 — interface ComplexNumber
- complexAdd · function · L34-L36 — function complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber
- complexDivide · function · L38-L45 — function complexDivide(a: ComplexNumber, b: ComplexNumber): ComplexNumber
- complexInvert · function · L47-L49 — function complexInvert(a: ComplexNumber): ComplexNumber
- evalElementImpedance · function · L51-L83 — function evalElementImpedance(el: CircuitElement, omega: number): ComplexNumber
- evalTopologyImpedance · function · L85-L125 — function evalTopologyImpedance(topology: CircuitTopology, omega: number): ComplexNumber
- extractAdjustableParameters · function · L130-L189 — function extractAdjustableParameters(topology: CircuitTopology): AdjustableParam[]
- applyParametersToTopology · function · L194-L215 — function applyParametersToTopology( baseTopology: CircuitTopology, params: AdjustableParam[] ): CircuitTopology
- solveLinearSystem · function · L220-L264 — function solveLinearSystem(A: number[][], b: number[]): number[] | null
- evaluateKramersKronig · function · L269-L349 — function evaluateKramersKronig(dataset: ExperimentalEISDataset): KramersKronigResult
- runCNLSFit · function · L355-L678 — function runCNLSFit( topology: CircuitTopology, dataset: ExperimentalEISDataset, userParams?: AdjustableParam[], weighting: WeightingMethod = "modulus", maxIterations: number = 80, tolerance: number = 1e-7 ): CNLSFitReport
- calculateCost · function · L409-L432 — function calculateCost(params: AdjustableParam[]): { chiSq: number; residuals: number[] }
- computeJacobian · function · L435-L460 — function computeJacobian(params: AdjustableParam[], baseResiduals: number[]): number[][]
- runAsyncAutoFit · function · L684-L737 — async function runAsyncAutoFit( topology: CircuitTopology, dataset: ExperimentalEISDataset, userParams?: AdjustableParam[], weighting: WeightingMethod = "modulus", maxGenerations: number = 80 ): Promise<CNLSFitReport>

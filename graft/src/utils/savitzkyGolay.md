# src/utils/savitzkyGolay.ts

- SavitzkyGolayOptions · interface · L9-L14 — interface SavitzkyGolayOptions
- computeSavitzkyGolayCoefficients · function · L20-L71 — function computeSavitzkyGolayCoefficients( windowSize: number, polynomialOrder: number, derivativeOrder: number = 0 ): number[][]
- invertMatrix · function · L76-L135 — function invertMatrix(matrix: number[][]): number[][]
- factorial · function · L140-L145 — function factorial(num: number): number
- applySavitzkyGolayFilter · function · L151-L210 — function applySavitzkyGolayFilter( yData: number[], options: SavitzkyGolayOptions ): number[]
- calculateNoiseMetrics · function · L215-L263 — function calculateNoiseMetrics( raw: number[], filtered: number[] ): { residualRmsNoise: number; snrImprovement_dB: number; rawPeakSnr_dB: number; filteredPeakSnr_dB: number; noiseSuppression_pct: number; }
- ParsedXRDPointRef · interface · L265-L269 — interface ParsedXRDPointRef
- applySavitzkyGolayToPoints · function · L274-L286 — function applySavitzkyGolayToPoints<T extends ParsedXRDPointRef>( points: T[], options: SavitzkyGolayOptions ): T[]

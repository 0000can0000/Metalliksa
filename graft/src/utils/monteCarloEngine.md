# src/utils/monteCarloEngine.ts

- DistributionParams · interface · L9-L15 — interface DistributionParams
- MonteCarloResult · interface · L17-L30 — interface MonteCarloResult
- sampleGaussian · function · L35-L42 — function sampleGaussian(mean: number, stdDev: number): number
- sampleDistribution · function · L47-L69 — function sampleDistribution(params: DistributionParams): number
- runMonteCarloSimulation · function · L74-L126 — function runMonteCarloSimulation( evaluator: () => number, iterations: number = 5000 ): MonteCarloResult
- calculateTaborTensileMonteCarlo · function · L136-L186 — function calculateTaborTensileMonteCarlo(params: { hardnessHv: number; hardnessUncertaintyHv?: number; // default ± 3.5% cahoonC1?: number; // empirical constant ~3.0 - 3.4 cahoonC1StdDev?: number; // ~0.08 hollomonN?: number; // ~0.12 - 0.22 hollomonNStdDev?: number; // ~0.015 iterations?: number; }): { yieldStrengthMpa: MonteCarloResult; ultimateTensileMpa: MonteCarloResult; fractureToughnessMpaM: MonteCarloResult; }
- calculateWilliamsonHallMonteCarlo · function · L192-L270 — function calculateWilliamsonHallMonteCarlo(params: { peaks: { twoThetaDeg: number; fwhmRad: number; fwhmErrorRad?: number }[]; wavelengthNm?: number; // 0.15406 nm (Cu Kα) scherrerK?: number; // 0.94 scherrerKStdDev?: number; // 0.04 iterations?: number; }): { crystalliteSizeNm: MonteCarloResult; microstrainPercent: MonteCarloResult; rSquared: MonteCarloResult; }
- calculateHallPetchMonteCarlo · function · L276-L313 — function calculateHallPetchMonteCarlo(params: { grainSizeUm: number; grainSizeStdDevUm?: number; // ASTM E112 intercept standard deviation frictionStressSigma0Mpa: number; // σ_0 (MPa) frictionStressStdDevMpa?: number; hallPetchKyMpaSqrtUm: number; // k_y (MPa·µm^0.5) hallPetchKyStdDev?: number; iterations?: number; }): { yieldStrengthMpa: MonteCarloResult; hallPetchStrengtheningMpa: MonteCarloResult; }
- calculateEDSQuantMonteCarlo · function · L319-L367 — function calculateEDSQuantMonteCarlo(elements: { symbol: string; measuredCounts: number; backgroundCounts: number; zafFactor: number; zafUncertaintyPercent?: number; // ~2.5% }[]): { [symbol: string]: MonteCarloResult; }

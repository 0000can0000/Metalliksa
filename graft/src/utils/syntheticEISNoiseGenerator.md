# src/utils/syntheticEISNoiseGenerator.ts

- SeededRandom · class · L207-L227 — class SeededRandom
- constructor · method · L210-L212 — constructor(seed: number = 42)
- next · method · L214-L217 — next(): number
- gaussian · method · L219-L226 — gaussian(mean: number = 0, stdDev: number = 1): number
- FrequencySweepConfig · interface · L233-L239 — interface FrequencySweepConfig
- generateFrequencyGrid · function · L248-L268 — function generateFrequencyGrid(config: FrequencySweepConfig = DEFAULT_FREQ_CONFIG): number[]
- computeCleanSpectrum · function · L273-L292 — function computeCleanSpectrum( topology: CircuitTopology, frequencies: number[] ): RawEISPoint[]
- injectSyntheticNoise · function · L298-L517 — function injectSyntheticNoise( cleanPoints: RawEISPoint[], config: SyntheticNoiseConfig ): SyntheticEISPoint[]
- buildSyntheticDataset · function · L522-L551 — function buildSyntheticDataset( syntheticPoints: SyntheticEISPoint[], topology: CircuitTopology, config: SyntheticNoiseConfig, presetId?: string ): ExperimentalEISDataset
- evaluateAutoFitRobustness · function · L557-L677 — function evaluateAutoFitRobustness( groundTruthTopology: CircuitTopology, syntheticPoints: SyntheticEISPoint[], config: SyntheticNoiseConfig, fitReport: CNLSFitReport, presetId?: string ): RobustnessBenchmarkResult
- runNoiseSweepStressTest · function · L683-L742 — function runNoiseSweepStressTest( topology: CircuitTopology, cleanPoints: RawEISPoint[], baseConfig: SyntheticNoiseConfig, sweepLevels: number[] = [0.1, 0.5, 1.0, 2.0, 3.5, 5.0, 7.5, 10.0], weighting: WeightingMethod = "modulus" ): SweepStressPoint[]

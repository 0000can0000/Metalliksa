# src/utils/tafelParser.ts

- AlloyMaterialPreset · interface · L11-L18 — interface AlloyMaterialPreset
- parseTafelFile · function · L37-L269 — function parseTafelFile( rawText: string, filename: string = "uploaded_polarization.csv", customAreaCm2: number = 1.0, defaultMaterial?: AlloyMaterialPreset ): TafelDataset
- splitLineToTokens · function · L274-L293 — function splitLineToTokens(line: string): string[]
- parseNumericToken · function · L298-L308 — function parseNumericToken(token?: string): number | null
- linearRegression · function · L313-L356 — function linearRegression(xArr: number[], yArr: number[]): { m: number; b: number; r2: number }
- autoFitTafel · function · L364-L631 — function autoFitTafel( dataset: TafelDataset, customCathodicRange?: [number, number], customAnodicRange?: [number, number], manualEcorrOverride?: number, manualIcorrOverride?: number ): TafelFitResult
- BenchmarkParams · interface · L696-L710 — interface BenchmarkParams
- createBenchmarkDataset · function · L712-L772 — function createBenchmarkDataset(params: BenchmarkParams): TafelDataset
- exportTafelToCSV · function · L777-L813 — function exportTafelToCSV(dataset: TafelDataset, fitResult: TafelFitResult): string

# src/utils/eisFileParser.ts

- createEISPoint · function · L6-L37 — function createEISPoint( freq: number, zReal: number, zImagRaw: number, isNegatedImag: boolean = false ): RawEISPoint | null
- parseBioLogicMpt · function · L43-L173 — function parseBioLogicMpt(text: string, filename: string = "biologic.mpt"): ExperimentalEISDataset
- parseGamryDta · function · L180-L182 — function parseGamryDta(text: string, filename: string = "gamry.dta"): ExperimentalEISDataset
- parseGamryFile · function · L184-L358 — function parseGamryFile(text: string, filename: string = "gamry.dta"): ExperimentalEISDataset
- parseDelimitedEIS · function · L363-L450 — function parseDelimitedEIS(text: string, filename: string = "dataset.csv"): ExperimentalEISDataset
- parseEISFile · function · L455-L547 — function parseEISFile(content: string, filename: string): ExperimentalEISDataset
- generateRealisticExperimentalData · function · L556-L587 — function generateRealisticExperimentalData( freqs: number[], evalFn: (f: number) => { zReal: number; zImag: number }, noiseStdPct: number = 1.2 ): RawEISPoint[]
- makeLogFrequencies · function · L589-L598 — function makeLogFrequencies(minF: number, maxF: number, pointsPerDecade: number = 10): number[]
- exportDatasetToCSV · function · L999-L1008 — function exportDatasetToCSV(dataset: ExperimentalEISDataset): string

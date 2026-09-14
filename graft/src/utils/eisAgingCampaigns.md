# src/utils/eisAgingCampaigns.ts

- AgingIntervalRecord · interface · L3-L25 — interface AgingIntervalRecord
- AgingCampaign · interface · L27-L35 — interface AgingCampaign
- makeLogFrequencies · function · L37-L46 — function makeLogFrequencies(minF: number, maxF: number, pointsPerDecade: number = 10): number[]
- synthesizeRealisticSpectrum · function · L51-L79 — function synthesizeRealisticSpectrum( freqs: number[], evalFn: (f: number) => { zReal: number; zImag: number }, noiseStdPct: number = 0.8, seedOffset: number = 0 ): RawEISPoint[]
- generateBatteryFastChargeCampaign · function · L84-L205 — function generateBatteryFastChargeCampaign(): AgingCampaign
- generateCorrosionCoatingCampaign · function · L210-L329 — function generateCorrosionCoatingCampaign(): AgingCampaign
- extractIntervalFromFilename · function · L335-L362 — function extractIntervalFromFilename(filename: string): { value: number; unit: "cycles" | "hours" } | null

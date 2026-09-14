# src/components/WilliamsonHallVisualizer.tsx

- WHPeakPoint · interface · L44-L76 — interface WHPeakPoint
- WilliamsonHallVisualizerProps · interface · L78-L94 — interface WilliamsonHallVisualizerProps
- WHMethod · type · L96-L96 — type WHMethod = "standard" | "ungar_mwh";
- WHModelType · type · L97-L97 — type WHModelType = "UDDM" | "UDSM" | "UDEDM";
- parseMillerIndices · function · L100-L118 — function parseMillerIndices(hklStr: string): { h: number; k: number; l: number }
- computeOrientationFactorH2 · function · L121-L127 — function computeOrientationFactorH2(h: number, k: number, l: number): number
- WilliamsonHallVisualizer · function · L129-L1098 — WilliamsonHallVisualizer: React.FC<WilliamsonHallVisualizerProps> = ({ peaks, wavelength_A = 1.5406, youngModulus_GPa = 205, poissonRatio = 0.30, burgersVector_nm = 0.254, phaseName = "Austenite γ / Inconel 718", crystalStructure = "FCC", })
- togglePeakInclusion · function · L572-L577 — togglePeakInclusion = (id: string)
- handleExportData · function · L579-L594 — handleExportData = ()

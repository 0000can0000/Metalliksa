# src/components/RapidXRDAnalysisLab.tsx

- XRDPresetPhase · interface · L76-L95 — interface XRDPresetPhase
- RapidXRDAnalysisLabProps · interface · L287-L289 — interface RapidXRDAnalysisLabProps
- RapidXRDAnalysisLab · function · L291-L1748 — RapidXRDAnalysisLab: React.FC<RapidXRDAnalysisLabProps> = ({ onNavigate })
- handleApplyStandardFromLibrary · function · L402-L419 — handleApplyStandardFromLibrary = (standard: XRDStandardRef)
- handleRefFileUpload · function · L427-L449 — handleRefFileUpload = (e: React.ChangeEvent<HTMLInputElement>)
- handleRefFileParsed · function · L451-L456 — handleRefFileParsed = (data: ParsedXRDPoint[], fileName: string, minTheta: number, maxTheta: number)
- handleClearRefFile · function · L458-L462 — handleClearRefFile = ()
- handleSampleFileUpload · function · L465-L488 — handleSampleFileUpload = (e: React.ChangeEvent<HTMLInputElement>)
- handleSampleFileParsed · function · L490-L496 — handleSampleFileParsed = (data: ParsedXRDPoint[], fileName: string, minTheta: number, maxTheta: number)
- handleClearSampleFile · function · L498-L503 — handleClearSampleFile = ()
- handleLoadPresetSample · function · L505-L537 — handleLoadPresetSample = (presetType: "lpbf_in718" | "rolled_ti64" | "nist_lab6" | "nist_si")
- handleClearData · function · L540-L550 — handleClearData = ()
- handleRunAutoCalibration · function · L553-L560 — handleRunAutoCalibration = ()
- getInstrumentalFwhm · function · L566-L573 — getInstrumentalFwhm = (twoTheta_deg: number): number
- handleExportCSV · function · L894-L905 — handleExportCSV = ()
- handleAutoDeconvolve · function · L908-L963 — handleAutoDeconvolve = ()
- togglePhase · function · L965-L969 — togglePhase = (phaseId: string)

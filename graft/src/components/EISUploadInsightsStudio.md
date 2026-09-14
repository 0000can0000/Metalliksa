# src/components/EISUploadInsightsStudio.tsx

- EISUploadInsightsStudioProps · interface · L65-L71 — interface EISUploadInsightsStudioProps
- UploadedFileRecord · interface · L73-L79 — interface UploadedFileRecord
- EISUploadInsightsStudio · function · L81-L1781 — function EISUploadInsightsStudio({ onNavigateToCNLS, onNavigateToBatteryLab, onNavigateToCorrosionLab, onNavigateToPythonUpload, onNavigateToBatchTracker, }: EISUploadInsightsStudioProps)
- runDeepEISAnalysis · function · L131-L313 — runDeepEISAnalysis = async (datasetToAnalyze: ExperimentalEISDataset)
- handleProcessRawFiles · function · L323-L348 — handleProcessRawFiles = async (files: FileList | File[])
- handleDrop · function · L350-L356 — handleDrop = (e: React.DragEvent)
- handlePasteSubmit · function · L358-L375 — handlePasteSubmit = ()
- handleSelectBenchmark · function · L377-L391 — handleSelectBenchmark = (bench: ExperimentalEISDataset)
- handleDeleteRecord · function · L393-L401 — handleDeleteRecord = (id: string, e: React.MouseEvent)
- handleExportCSV · function · L403-L413 — handleExportCSV = ()
- handleExportJSONReport · function · L415-L432 — handleExportJSONReport = ()
- handleCopyMarkdownSummary · function · L434-L470 — handleCopyMarkdownSummary = ()
- handleSendToCNLSStudio · function · L472-L478 — handleSendToCNLSStudio = ()

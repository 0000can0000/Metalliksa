# src/components/XRDDataFileUploader.tsx

- XRDDataFileUploaderProps · interface · L27-L42 — interface XRDDataFileUploaderProps
- XRDDataFileUploader · function · L44-L553 — XRDDataFileUploader: React.FC<XRDDataFileUploaderProps> = ({ uploadedRefFileName, rawUploadedRefData, onRefFileParsed, onClearRefFile, uploadedSampleFileName, rawUploadedSampleData, onSampleFileParsed, onClearSampleFile, onLoadPresetSample, })
- handleRefFileProcess · function · L69-L96 — handleRefFileProcess = async (file: File)
- handleSampleFileProcess · function · L99-L124 — handleSampleFileProcess = async (file: File)
- handleRunBenchmark500MB · function · L127-L146 — handleRunBenchmark500MB = async (sizeMB: number = 250)
- cancelStreaming · function · L148-L153 — cancelStreaming = ()
- handleDownloadTemplate · function · L156-L202 — handleDownloadTemplate = (type: "nist_lab6" | "in718_sample" | "csv_blank")
- handleQuickLoadPreset · function · L204-L210 — handleQuickLoadPreset = (type: "lpbf_in718" | "rolled_ti64" | "nist_lab6" | "nist_si")

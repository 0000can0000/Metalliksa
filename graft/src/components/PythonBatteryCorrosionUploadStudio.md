# src/components/PythonBatteryCorrosionUploadStudio.tsx

- ScriptTemplateKey · type · L56-L61 — type ScriptTemplateKey = | "battery-cycler-gcd" | "corrosion-tafel-astm" | "eis-impedance-fitting" | "ocp-passivation-drift" | "custom-python-pipeline";
- ScriptTemplate · interface · L63-L69 — interface ScriptTemplate
- PythonBatteryCorrosionUploadStudioProps · interface · L292-L298 — interface PythonBatteryCorrosionUploadStudioProps
- PythonBatteryCorrosionUploadStudio · function · L300-L1191 — PythonBatteryCorrosionUploadStudio: React.FC<PythonBatteryCorrosionUploadStudioProps> = ({ initialDomain = "battery", onSendToCNLS, onSendToEISInsights, onSendToBatteryEIS, onSendToCorrosionEIS, })
- handleSelectTemplate · function · L332-L338 — handleSelectTemplate = (templateKey: ScriptTemplateKey)
- handleRunPythonScript · function · L357-L387 — handleRunPythonScript = async ()
- processUploadedFile · function · L390-L477 — processUploadedFile = async (file: File)
- handleCopyCode · function · L479-L483 — handleCopyCode = ()
- handleDownloadScript · function · L485-L493 — handleDownloadScript = ()
- handleCopySnippet · function · L534-L538 — handleCopySnippet = ()

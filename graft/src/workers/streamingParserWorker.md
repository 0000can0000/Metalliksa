# src/workers/streamingParserWorker.ts

- WorkerProgressMessage · interface · L7-L15 — interface WorkerProgressMessage
- WorkerResultMessage · interface · L17-L31 — interface WorkerResultMessage
- WorkerErrorMessage · interface · L33-L36 — interface WorkerErrorMessage
- WorkerOutgoingMessage · type · L38-L38 — type WorkerOutgoingMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage;
- WorkerIncomingMessage · interface · L40-L47 — interface WorkerIncomingMessage
- parseEBSDStreamChunked · function · L86-L280 — async function parseEBSDStreamChunked(file: File, chunkSize: number, downsampleTarget: number, startTime: number)
- parseXRDStreamChunked · function · L285-L551 — async function parseXRDStreamChunked(file: File, chunkSize: number, downsampleTarget: number, startTime: number)
- generateAndParseSyntheticEBSD · function · L556-L667 — async function generateAndParseSyntheticEBSD(targetMB: number, downsampleTarget: number, startTime: number)
- generateAndParseSyntheticXRD · function · L672-L757 — async function generateAndParseSyntheticXRD(targetMB: number, downsampleTarget: number, startTime: number)

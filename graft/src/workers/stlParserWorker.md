# src/workers/stlParserWorker.ts

- STLWorkerInputMessage · interface · L7-L10 — interface STLWorkerInputMessage
- STLWorkerProgressMessage · interface · L12-L17 — interface STLWorkerProgressMessage
- STLWorkerSuccessMessage · interface · L19-L30 — interface STLWorkerSuccessMessage
- STLWorkerErrorMessage · interface · L32-L35 — interface STLWorkerErrorMessage
- STLWorkerOutputMessage · type · L37-L40 — type STLWorkerOutputMessage = | STLWorkerProgressMessage | STLWorkerSuccessMessage | STLWorkerErrorMessage;
- checkIfBinary · function · L66-L72 — function checkIfBinary(buffer: ArrayBuffer): boolean
- parseBinarySTLInWorker · function · L74-L173 — function parseBinarySTLInWorker(buffer: ArrayBuffer, startTime: number)
- parseAsciiSTLInWorker · function · L175-L260 — function parseAsciiSTLInWorker(buffer: ArrayBuffer, startTime: number)

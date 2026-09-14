# src/utils/streamingFileParser.ts

- StreamParseOptions · interface · L13-L18 — interface StreamParseOptions
- StreamingParserService · class · L20-L135 — class StreamingParserService
- createWorker · method · L23-L28 — private createWorker(): Worker
- parseEBSDFileStream · method · L33-L47 — public parseEBSDFileStream( file: File, options?: StreamParseOptions ): Promise<WorkerResultMessage>
- parseXRDFileStream · method · L52-L66 — public parseXRDFileStream( file: File, options?: StreamParseOptions ): Promise<WorkerResultMessage>
- runBenchmarkStream · method · L71-L85 — public runBenchmarkStream( fileType: "ebsd" | "xrd", sizeMB: number, options?: StreamParseOptions ): Promise<WorkerResultMessage>
- runWorkerTask · method · L87-L123 — private runWorkerTask( msg: WorkerIncomingMessage, options?: StreamParseOptions ): Promise<WorkerResultMessage>
- cancel · method · L125-L127 — public cancel(): void
- terminate · method · L129-L134 — private terminate(): void

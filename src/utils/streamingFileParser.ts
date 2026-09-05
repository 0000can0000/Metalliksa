/**
 * Client-side interface to the Streaming WebWorker Parser.
 * Seamlessly starts WebWorker, streams chunked files (500MB+), and manages progress and cancellations.
 */

import {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
  WorkerProgressMessage,
  WorkerResultMessage,
} from "../workers/streamingParserWorker";

export interface StreamParseOptions {
  chunkSizeBytes?: number; // default 4MB
  downsampleTarget?: number; // default 2000
  onProgress?: (progress: WorkerProgressMessage) => void;
  onStageChange?: (stage: string) => void;
}

export class StreamingParserService {
  private worker: Worker | null = null;

  private createWorker(): Worker {
    return new Worker(
      new URL("../workers/streamingParserWorker.ts", import.meta.url),
      { type: "module" }
    );
  }

  /**
   * Parses an EBSD file (.ctf, .ang, .csv, .txt) with chunked background streaming.
   */
  public parseEBSDFileStream(
    file: File,
    options?: StreamParseOptions
  ): Promise<WorkerResultMessage> {
    return this.runWorkerTask(
      {
        command: "parse_chunked",
        fileType: "ebsd",
        file,
        chunkSizeBytes: options?.chunkSizeBytes || 4 * 1024 * 1024,
        downsampleTarget: options?.downsampleTarget || 2000,
      },
      options
    );
  }

  /**
   * Parses an XRD file (.xy, .xrdml, .csv, .raw, .dat) with chunked background streaming.
   */
  public parseXRDFileStream(
    file: File,
    options?: StreamParseOptions
  ): Promise<WorkerResultMessage> {
    return this.runWorkerTask(
      {
        command: "parse_chunked",
        fileType: "xrd",
        file,
        chunkSizeBytes: options?.chunkSizeBytes || 4 * 1024 * 1024,
        downsampleTarget: options?.downsampleTarget || 2500,
      },
      options
    );
  }

  /**
   * Generates and parses a synthetic massive dataset (e.g. 50MB - 500MB) for stress testing.
   */
  public runBenchmarkStream(
    fileType: "ebsd" | "xrd",
    sizeMB: number,
    options?: StreamParseOptions
  ): Promise<WorkerResultMessage> {
    return this.runWorkerTask(
      {
        command: "generate_benchmark_sample",
        fileType,
        benchmarkSizeMB: sizeMB,
        downsampleTarget: options?.downsampleTarget || 2000,
      },
      options
    );
  }

  private runWorkerTask(
    msg: WorkerIncomingMessage,
    options?: StreamParseOptions
  ): Promise<WorkerResultMessage> {
    return new Promise((resolve, reject) => {
      // Terminate previous if running
      this.cancel();

      try {
        this.worker = this.createWorker();
      } catch (err: any) {
        reject(new Error("Failed to initialize WebWorker: " + err.message));
        return;
      }

      this.worker.onmessage = (e: MessageEvent<WorkerOutgoingMessage>) => {
        const data = e.data;
        if (data.type === "progress") {
          options?.onProgress?.(data);
          options?.onStageChange?.(data.stage);
        } else if (data.type === "result") {
          this.terminate();
          resolve(data);
        } else if (data.type === "error") {
          this.terminate();
          reject(new Error(data.error));
        }
      };

      this.worker.onerror = (err) => {
        this.terminate();
        reject(new Error(`WebWorker parsing error: ${err.message || "Unknown error"}`));
      };

      this.worker.postMessage(msg);
    });
  }

  public cancel(): void {
    this.terminate();
  }

  private terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const streamingParserService = new StreamingParserService();

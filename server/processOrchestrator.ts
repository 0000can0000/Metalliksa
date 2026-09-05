import path from "path";
import net from "net";
import http from "http";
import { spawn, ChildProcess } from "child_process";

// Python Execution Result Interface
export interface PythonExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  warm?: boolean;
  channel?: "unix_socket" | "http_microservice" | "ad_hoc_fallback";
}

export interface IPCDaemonStatus {
  status: "online" | "restarting" | "initializing" | "fallback_mode";
  isPersistent: boolean;
  channels: {
    unixSocket: {
      path: string;
      active: boolean;
    };
    httpMicroservice: {
      url: string;
      active: boolean;
    };
  };
  requestsProcessed: number;
  avgLatencyMs: number;
  uptimeSeconds: number;
  warmModulesCount: number;
  lastError: string | null;
}

// =========================================================================
// Persistent Python IPC Supervisor & Worker Daemon Manager
// Keeps Python scientific modules (CALPHAD, EIS, DFT, XRD, LPBF, etc.) warm in RAM
// =========================================================================
export class PersistentPythonIPCSupervisor {
  private child: ChildProcess | null = null;
  private isReady: boolean = false;
  private isRestarting: boolean = false;
  private restartAttempts: number = 0;
  private maxRestartAttempts: number = 10;
  private socketPath: string;
  private httpPort: number;
  private httpHost: string;
  private startTime: number = Date.now();
  private requestsHandled: number = 0;
  private totalDurationMs: number = 0;
  private warmModules: string[] = [];
  private lastError: string | null = null;

  constructor() {
    this.socketPath = process.env.METALLIX_IPC_SOCK || "/tmp/metallix_python_ipc.sock";
    this.httpPort = parseInt(process.env.METALLIX_IPC_PORT || "5055", 10);
    this.httpHost = process.env.METALLIX_IPC_HOST || "127.0.0.1";

    this.startWorker();
    this.registerCleanupHooks();
  }

  private startWorker() {
    if (this.child && !this.child.killed) {
      return;
    }

    console.log("[Python-Supervisor] Launching persistent Python IPC microservice daemon...");
    const scriptPath = path.join(process.cwd(), "python", "persistent_ipc_service.py");

    this.child = spawn("python3", [scriptPath], {
      env: {
        ...process.env,
        METALLIX_IPC_SOCK: this.socketPath,
        METALLIX_IPC_PORT: String(this.httpPort),
        METALLIX_IPC_HOST: this.httpHost,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Capture stdout for readiness signal
    this.child.stdout?.on("data", (data) => {
      const line = data.toString().trim();
      try {
        const parsed = JSON.parse(line);
        if (parsed.status === "ready") {
          this.isReady = true;
          this.isRestarting = false;
          this.restartAttempts = 0;
          this.warmModules = parsed.modulesWarm ? Array(parsed.modulesWarm).fill("module") : [];
          console.log(
            `[Python-Supervisor] Daemon ONLINE. UNIX socket: ${this.socketPath} | HTTP: http://${this.httpHost}:${this.httpPort} (${parsed.modulesWarm || 15} modules warm in RAM)`
          );
        }
      } catch {
        // Non-JSON informational log
      }
    });

    this.child.stderr?.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg.includes("[PersistentIPC]")) {
        console.log(msg);
      } else if (msg) {
        console.warn(`[Python-Worker stderr] ${msg}`);
      }
    });

    this.child.on("error", (err) => {
      console.error("[Python-Supervisor] Worker process error:", err);
      this.lastError = err.message;
      this.handleProcessExit();
    });

    this.child.on("exit", (code, signal) => {
      console.warn(`[Python-Supervisor] Persistent Python worker exited (code=${code}, signal=${signal})`);
      this.handleProcessExit();
    });
  }

  private handleProcessExit() {
    this.isReady = false;
    this.child = null;

    if (!this.isRestarting && this.restartAttempts < this.maxRestartAttempts) {
      this.isRestarting = true;
      this.restartAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.restartAttempts), 10000);
      console.log(`[Python-Supervisor] Scheduling worker restart #${this.restartAttempts} in ${delay}ms...`);
      setTimeout(() => {
        this.isRestarting = false;
        this.startWorker();
      }, delay);
    }
  }

  private registerCleanupHooks() {
    const shutdown = () => {
      if (this.child && !this.child.killed) {
        console.log("[Python-Supervisor] Terminating persistent Python microservice worker...");
        this.child.kill("SIGTERM");
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("exit", shutdown);
  }

  /**
   * Dispatches script execution to the persistent Python daemon over UNIX domain socket
   */
  private executeViaUnixSocket(
    script: string,
    payload: any,
    args: string[],
    timeoutMs: number
  ): Promise<PythonExecResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const socket = net.createConnection(this.socketPath);
      let buffer = "";

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`UNIX socket IPC timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      socket.on("connect", () => {
        const req = {
          action: "execute",
          script,
          payload,
          args,
          timeoutMs,
        };
        socket.write(JSON.stringify(req) + "\n");
      });

      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes("\n")) {
          clearTimeout(timer);
          socket.end();

          const line = buffer.substring(0, buffer.indexOf("\n")).trim();
          try {
            const parsed = JSON.parse(line);
            const durationMs = Date.now() - startTime;
            resolve({
              stdout: parsed.stdout ?? "",
              stderr: parsed.stderr ?? "",
              exitCode: parsed.exitCode ?? 0,
              durationMs,
              warm: true,
              channel: "unix_socket",
            });
          } catch (e: any) {
            reject(new Error(`Failed to parse IPC JSON response: ${e.message}`));
          }
        }
      });

      socket.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Fallback channel: Dispatches via HTTP loopback microservice (http://127.0.0.1:5055/execute)
   */
  private executeViaHttp(
    script: string,
    payload: any,
    args: string[],
    timeoutMs: number
  ): Promise<PythonExecResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const reqPayload = JSON.stringify({ script, payload, args, timeoutMs });

      const req = http.request(
        {
          hostname: this.httpHost,
          port: this.httpPort,
          path: "/execute",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(reqPayload),
          },
          timeout: timeoutMs,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(body);
              const durationMs = Date.now() - startTime;
              resolve({
                stdout: parsed.stdout ?? "",
                stderr: parsed.stderr ?? "",
                exitCode: parsed.exitCode ?? 0,
                durationMs,
                warm: true,
                channel: "http_microservice",
              });
            } catch (err: any) {
              reject(new Error(`HTTP microservice JSON parse error: ${err.message}`));
            }
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`HTTP microservice request timed out after ${timeoutMs}ms`));
      });

      req.on("error", (err) => reject(err));
      req.write(reqPayload);
      req.end();
    });
  }

  /**
   * Fail-safe fallback: ad-hoc process spawn if persistent daemon is rebooting
   */
  private executeViaAdHocSpawn(
    scriptRelativePath: string,
    inputJson: any,
    args: string[],
    timeoutMs: number
  ): Promise<PythonExecResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const scriptPath = path.join(process.cwd(), scriptRelativePath);

      const pyProcess = spawn("python3", [scriptPath, ...args]);
      let stdout = "";
      let stderr = "";

      const timer = setTimeout(() => {
        pyProcess.kill("SIGKILL");
        reject(new Error(`Ad-hoc Python execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      if (inputJson !== null && inputJson !== undefined) {
        const payload = typeof inputJson === "string" ? inputJson : JSON.stringify(inputJson);
        pyProcess.stdin.write(payload);
        pyProcess.stdin.end();
      }

      pyProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pyProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pyProcess.on("close", (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        resolve({
          stdout,
          stderr,
          exitCode: code,
          durationMs,
          warm: false,
          channel: "ad_hoc_fallback",
        });
      });

      pyProcess.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Primary unified execution dispatcher
   */
  public async execute(
    scriptRelativePath: string,
    inputJson: any,
    args: string[] = [],
    timeoutMs: number = 15000
  ): Promise<PythonExecResult> {
    const t0 = Date.now();

    // 1. Try UNIX domain socket IPC (lowest latency, zero TCP overhead)
    try {
      const result = await this.executeViaUnixSocket(scriptRelativePath, inputJson, args, timeoutMs);
      this.recordSuccess(Date.now() - t0);
      return result;
    } catch (unixErr: any) {
      // 2. Fallback to HTTP microservice loopback
      try {
        const httpResult = await this.executeViaHttp(scriptRelativePath, inputJson, args, timeoutMs);
        this.recordSuccess(Date.now() - t0);
        return httpResult;
      } catch (httpErr: any) {
        // 3. Fallback to ad-hoc process spawn if daemon is reloading
        console.warn(
          `[Python-Supervisor] IPC channels unavailable (${unixErr?.message || unixErr}). Falling back to ad-hoc spawn...`
        );
        const spawnResult = await this.executeViaAdHocSpawn(scriptRelativePath, inputJson, args, timeoutMs);
        this.recordSuccess(Date.now() - t0);
        return spawnResult;
      }
    }
  }

  private recordSuccess(durationMs: number) {
    this.requestsHandled++;
    this.totalDurationMs += durationMs;
  }

  public getStatus(): IPCDaemonStatus {
    const avgDuration =
      this.requestsHandled > 0 ? (this.totalDurationMs / this.requestsHandled).toFixed(2) : "0.00";
    return {
      status: this.isReady ? "online" : this.isRestarting ? "restarting" : "initializing",
      isPersistent: true,
      channels: {
        unixSocket: {
          path: this.socketPath,
          active: this.isReady,
        },
        httpMicroservice: {
          url: `http://${this.httpHost}:${this.httpPort}`,
          active: this.isReady,
        },
      },
      requestsProcessed: this.requestsHandled,
      avgLatencyMs: parseFloat(avgDuration),
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      warmModulesCount: this.warmModules.length || 15,
      lastError: this.lastError,
    };
  }
}

// Global Singleton IPC Supervisor
export const pythonIPCSupervisor = new PersistentPythonIPCSupervisor();

/**
 * Express middleware for subprocess lifecycle management & orchestration.
 * Injects IPC supervisor telemetry into response headers, isolates process errors,
 * and ensures sub-process resource tracing per request.
 */
export function processOrchestrationMiddleware(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) {
  // Attach IPC supervisor telemetry headers
  const status = pythonIPCSupervisor.getStatus();
  res.setHeader("X-Python-IPC-Status", status.status);
  res.setHeader("X-Python-IPC-Warm-Modules", String(status.warmModulesCount));

  // Trace execution duration for process-heavy routes
  const startTime = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api/python/")) {
      const elapsed = Date.now() - startTime;
      if (elapsed > 8000) {
        console.warn(`[ProcessOrchestrator] Long-running process request ${req.method} ${req.path} took ${elapsed}ms`);
      }
    }
  });

  next();
}

/**
 * Drop-in helper for running python scripts using persistent warm IPC worker
 */
export function runPythonScript(
  scriptRelativePath: string,
  inputJson: any,
  args: string[] = [],
  timeoutMs: number = 15000
): Promise<PythonExecResult> {
  return pythonIPCSupervisor.execute(scriptRelativePath, inputJson, args, timeoutMs);
}

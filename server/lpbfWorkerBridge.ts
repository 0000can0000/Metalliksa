import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";

/** A single WSL worker owns the queue. Requests never become shell text. */
class LpbfWorkerBridge {
  private process?: ChildProcessWithoutNullStreams;
  private starting?: Promise<void>;
  private pending = new Map<number, { resolve: (x: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private sequence = 0;
  private localFallback = false;
  private stderr = "";

  private async start() {
    if (this.process) return;
    if (this.starting) return this.starting;
    this.starting = this.launch().finally(() => { this.starting = undefined; });
    return this.starting;
  }

  private async launch(): Promise<void> {
    const file = path.resolve("python/lpbf_worker.py");
    const onWindows = process.platform === "win32";
    const linuxPath = file.replace(/^([A-Za-z]):/, (_, drive: string) => `/mnt/${drive.toLowerCase()}`).replaceAll("\\", "/");
    const command = onWindows ? (this.localFallback ? "py" : "wsl.exe") : "python3";
    const args = onWindows ? (this.localFallback ? ["-3", "-u", file] : ["-d", process.env.METALLIKSA_WSL_DISTRO || "Ubuntu-22.04", "--", "python3", "-u", linuxPath]) : ["-u", file];
    const child = spawn(command, args, { windowsHide: true, stdio: "pipe" });
    this.process = child;
    this.stderr = "";
    createInterface({ input: child.stdout }).on("line", line => {
      try {
        const reply = JSON.parse(line);
        const wait = this.pending.get(reply.id);
        if (!wait) return;
        clearTimeout(wait.timer); this.pending.delete(reply.id);
        if (reply.error) wait.reject(new Error(reply.error)); else wait.resolve(reply.data);
      } catch { this.stderr = (this.stderr + line).slice(-4000); }
    });
    child.stderr.on("data", data => { this.stderr = (this.stderr + data.toString()).slice(-4000); });
    const fail = (error: Error) => {
      if (this.process !== child) return;
      this.process = undefined;
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); }
      this.pending.clear();
    };
    child.on("error", fail);
    child.on("exit", code => fail(new Error(`LPBF worker exited (${code}): ${this.stderr}`)));
    try { await this.send("capabilities", null); }
    catch (error) {
      child.kill(); this.process = undefined;
      if (onWindows && !this.localFallback) { this.localFallback = true; return this.launch(); }
      throw error;
    }
  }

  private send(method: string, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error("LPBF worker RPC timeout")); }, 20000);
      this.pending.set(id, { resolve, reject, timer });
      this.process!.stdin.write(JSON.stringify({ id, method, payload }) + "\n", error => {
        if (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
      });
    });
  }

  async request(method: string, payload: unknown = null) {
    await this.start();
    return this.send(method, payload);
  }
}

export const lpbfWorker = new LpbfWorkerBridge();

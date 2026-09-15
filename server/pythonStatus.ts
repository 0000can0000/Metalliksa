// Startup observations describe the daemon, not solver dependency validation.
export class PythonReadiness {
  private buffer = "";
  ready = false;
  pythonVersion: string | null = null;
  warmModules: string[] = [];
  unixActive = false;
  httpActive = false;

  reset() {
    this.buffer = "";
    this.ready = false;
    this.pythonVersion = null;
    this.warmModules = [];
    this.unixActive = false;
    this.httpActive = false;
  }

  consume(chunk: string): boolean {
    this.buffer += chunk;
    let observed = false;
    let end: number;
    while ((end = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end + 1);
      try {
        const message = JSON.parse(line);
        if (message?.status !== "ready") continue;
        this.unixActive = message.unixSocketActive === true;
        this.httpActive = message.httpActive === true;
        this.ready = this.unixActive || this.httpActive;
        this.pythonVersion = typeof message.pythonVersion === "string" ? message.pythonVersion : null;
        this.warmModules = Array.isArray(message.warmModules)
          ? [...new Set<string>(message.warmModules.filter((name: unknown) => typeof name === "string"))] : [];
        observed = true;
      } catch { /* Informational output is not a readiness signal. */ }
    }
    // Bound unterminated informational output.
    if (this.buffer.length > 65536) this.buffer = "";
    return observed;
  }
}

export function pythonStatusResponse<T extends {
  status: string; pythonVersion: string | null; warmModulesCount: number;
  channels: { unixSocket: { active: boolean }; httpMicroservice: { active: boolean } };
}>(ipc: T, platform: string) {
  const online = ipc.status === "online";
  return {
    online, status: ipc.status, pythonVersion: ipc.pythonVersion, platform,
    warm: online && ipc.warmModulesCount > 0,
    channel: online ? (ipc.channels.unixSocket.active ? "unix_socket" : ipc.channels.httpMicroservice.active ? "http_microservice" : null) : null,
    ipcDaemon: ipc,
    subsystemStatus: "unverified",
    // Omit availability until individual solver capability checks exist.
  };
}

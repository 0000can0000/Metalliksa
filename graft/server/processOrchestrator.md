# server/processOrchestrator.ts

- resolvePythonCommand · function · L7-L27 — function resolvePythonCommand(): { cmd: string; prefix: string[] }
- PythonExecResult · interface · L32-L39 — interface PythonExecResult
- IPCDaemonStatus · interface · L41-L59 — interface IPCDaemonStatus
- PersistentPythonIPCSupervisor · class · L65-L425 — class PersistentPythonIPCSupervisor
- constructor · method · L80-L91 — constructor()
- startWorker · method · L93-L152 — private startWorker()
- handleProcessExit · method · L154-L168 — private handleProcessExit()
- registerCleanupHooks · method · L170-L181 — private registerCleanupHooks()
- shutdown · function · L171-L176 — shutdown = ()
- executeViaUnixSocket · method · L186-L242 — private executeViaUnixSocket( script: string, payload: any, args: string[], timeoutMs: number ): Promise<PythonExecResult>
- executeViaHttp · method · L247-L300 — private executeViaHttp( script: string, payload: any, args: string[], timeoutMs: number ): Promise<PythonExecResult>
- executeViaAdHocSpawn · method · L305-L356 — private executeViaAdHocSpawn( scriptRelativePath: string, inputJson: any, args: string[], timeoutMs: number ): Promise<PythonExecResult>
- execute · method · L361-L395 — public async execute( scriptRelativePath: string, inputJson: any, args: string[] = [], timeoutMs: number = 15000 ): Promise<PythonExecResult>
- recordSuccess · method · L397-L400 — private recordSuccess(durationMs: number)
- getStatus · method · L402-L424 — public getStatus(): IPCDaemonStatus
- processOrchestrationMiddleware · function · L435-L457 — function processOrchestrationMiddleware( req: import("express").Request, res: import("express").Response, next: import("express").NextFunction )
- runPythonScript · function · L462-L469 — function runPythonScript( scriptRelativePath: string, inputJson: any, args: string[] = [], timeoutMs: number = 15000 ): Promise<PythonExecResult>

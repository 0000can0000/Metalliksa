# server/processOrchestrator.ts

- PythonExecResult · interface · L10-L17 — interface PythonExecResult
- IPCDaemonStatus · interface · L19-L39 — interface IPCDaemonStatus
- PersistentPythonIPCSupervisor · class · L45-L403 — class PersistentPythonIPCSupervisor
- constructor · method · L60-L72 — constructor()
- startWorker · method · L74-L126 — private startWorker()
- handleProcessExit · method · L128-L143 — private handleProcessExit()
- registerCleanupHooks · method · L145-L156 — private registerCleanupHooks()
- shutdown · function · L146-L151 — shutdown = ()
- executeViaUnixSocket · method · L161-L217 — private executeViaUnixSocket( script: string, payload: any, args: string[], timeoutMs: number ): Promise<PythonExecResult>
- executeViaHttp · method · L222-L275 — private executeViaHttp( script: string, payload: any, args: string[], timeoutMs: number ): Promise<PythonExecResult>
- executeViaAdHocSpawn · method · L280-L332 — private executeViaAdHocSpawn( scriptRelativePath: string, inputJson: any, args: string[], timeoutMs: number ): Promise<PythonExecResult>
- execute · method · L337-L371 — public async execute( scriptRelativePath: string, inputJson: any, args: string[] = [], timeoutMs: number = 15000 ): Promise<PythonExecResult>
- recordSuccess · method · L373-L376 — private recordSuccess(durationMs: number)
- getStatus · method · L378-L402 — public getStatus(): IPCDaemonStatus
- processOrchestrationMiddleware · function · L413-L435 — function processOrchestrationMiddleware( req: import("express").Request, res: import("express").Response, next: import("express").NextFunction )
- runPythonScript · function · L440-L447 — function runPythonScript( scriptRelativePath: string, inputJson: any, args: string[] = [], timeoutMs: number = 15000 ): Promise<PythonExecResult>

# src/store/useLpbfBuildJobStore.ts

- LpbfMurakamiSessionInput · interface · L22-L26 — interface LpbfMurakamiSessionInput
- LpbfBuildJobPythonState · interface · L28-L42 — interface LpbfBuildJobPythonState
- meshIdentity · function · L65-L69 — function meshIdentity(mesh: object | null): number
- LpbfBuildJobRequestOptions · type · L75-L81 — type LpbfBuildJobRequestOptions = { force?: boolean; enableUq?: boolean; includeAmbench?: boolean; uqSamples?: number; bypassCache?: boolean; };
- buildJobKey · function · L83-L133 — function buildJobKey(flags: { enableUq: boolean; includeAmbench: boolean; uqSamples: number }): { key: string; evidenceKey: string; payload: Parameters<typeof pythonComputationService.solveLpbfBuildJob>[0]; }
- peekLpbfBuildJobKey · function · L135-L142 — function peekLpbfBuildJobKey(): string
- setLpbfMurakamiInput · function · L144-L147 — function setLpbfMurakamiInput( partial: Partial<LpbfMurakamiSessionInput>): void
- requestLpbfBuildJob · function · L149-L240 — async function requestLpbfBuildJob(options?: LpbfBuildJobRequestOptions): Promise<void>
- useLpbfBuildJobPython · function · L243-L300 — function useLpbfBuildJobPython()

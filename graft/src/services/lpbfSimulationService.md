# src/services/lpbfSimulationService.ts

- SimulationMode · type · L1-L1 — type SimulationMode = "screening" | "standard" | "high-fidelity" | "calibration";
- SimulationInput · interface · L2-L13 — interface SimulationInput
- ResourceEstimate · interface · L14-L19 — interface ResourceEstimate
- SimulationResult · interface · L20-L46 — interface SimulationResult
- SimulationJob · interface · L47-L51 — interface SimulationJob
- SimulationCapabilities · interface · L52-L55 — interface SimulationCapabilities
- object · function · L56-L56 — function object(value: unknown): value is Record<string, unknown>
- finiteTree · function · L57-L61 — function finiteTree(value: unknown): boolean
- dimensions · function · L62-L64 — function dimensions(value: unknown): boolean
- checkClosure · function · L65-L69 — function checkClosure(value: unknown, keys: string[], tolerance: number): void
- parseSimulationJob · function · L70-L103 — function parseSimulationJob(value: unknown): SimulationJob
- request · function · L104-L109 — async function request(url: string, options?: RequestInit): Promise<unknown>
- capabilities · method · L111-L116 — async capabilities(): Promise<SimulationCapabilities>
- estimate · method · L117-L121 — async estimate(input: SimulationInput): Promise<ResourceEstimate>
- submit · method · L122-L122 — async submit(input: SimulationInput)
- get · method · L123-L123 — async get(id: string)
- cancel · method · L124-L124 — async cancel(id: string)

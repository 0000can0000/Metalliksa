# src/services/lpbfSimulationService.ts

- SimulationMode · type · L1-L1 — type SimulationMode = "screening" | "standard" | "high-fidelity" | "calibration";
- SimulationInput · interface · L2-L13 — interface SimulationInput
- ResourceEstimate · interface · L14-L19 — interface ResourceEstimate
- SimulationResult · interface · L20-L68 — interface SimulationResult
- SimulationJob · interface · L69-L73 — interface SimulationJob
- SimulationCapabilities · interface · L74-L77 — interface SimulationCapabilities
- object · function · L78-L78 — function object(value: unknown): value is Record<string, unknown>
- finiteTree · function · L79-L83 — function finiteTree(value: unknown): boolean
- dimensions · function · L84-L86 — function dimensions(value: unknown): boolean
- checkClosure · function · L87-L91 — function checkClosure(value: unknown, keys: string[], tolerance: number): void
- parseSimulationJob · function · L92-L168 — function parseSimulationJob(value: unknown): SimulationJob
- request · function · L169-L174 — async function request(url: string, options?: RequestInit): Promise<unknown>
- capabilities · method · L176-L181 — async capabilities(): Promise<SimulationCapabilities>
- estimate · method · L182-L186 — async estimate(input: SimulationInput): Promise<ResourceEstimate>
- submit · method · L187-L187 — async submit(input: SimulationInput)
- get · method · L188-L188 — async get(id: string)
- cancel · method · L189-L189 — async cancel(id: string)

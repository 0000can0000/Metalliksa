# src/components/3d-distortion-lab/LpbfEngineeringSimulation.tsx

- ReadinessStatus · type · L26-L26 — type ReadinessStatus = "pass" | "warn" | "fail" | "pending";
- ReadinessItem · type · L27-L27 — type ReadinessItem = { status: ReadinessStatus; label: string; details: string };
- ParsedMeasurementState · type · L40-L47 — type ParsedMeasurementState = { status: "valid" | "invalid" | "empty"; measurements?: NonNullable<SimulationInput["measurements"]>; errors: string[]; mismatchedCount: number; missingProcessVectorCount: number; count: number; };
- isFiniteNumber · function · L49-L49 — isFiniteNumber = (value: unknown): value is number
- normalizeProcessVector · function · L50-L58 — normalizeProcessVector = (value: unknown)
- currentProcessVectorFromInput · function · L59-L67 — currentProcessVectorFromInput = (nextInput: SimulationInput, strategy: string)
- processVectorMatches · function · L68-L68 — processVectorMatches = (a: Record<string, unknown>, b: Record<string, unknown>)
- parseMeasurementPayload · function · L69-L132 — parseMeasurementPayload = (raw: string, nextInput: SimulationInput, strategy: string): ParsedMeasurementState
- LpbfEngineeringSimulation · function · L134-L320 — function LpbfEngineeringSimulation({input:providedInput}:{input:SimulationInput})
- cancel · function · L163-L163 — cancel=async()
- payload · function · L216-L218 — payload = (selectedMode:SimulationMode):SimulationInput
- submit · function · L232-L251 — submit=async()
- download · function · L252-L252 — download=()

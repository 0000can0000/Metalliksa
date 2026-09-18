# src/components/3d-distortion-lab/LpbfEngineeringSimulation.tsx

- ReadinessStatus · type · L27-L27 — type ReadinessStatus = "pass" | "warn" | "fail" | "pending";
- ReadinessItem · type · L28-L28 — type ReadinessItem = { status: ReadinessStatus; label: string; details: string };
- ParsedMeasurementState · type · L41-L48 — type ParsedMeasurementState = { status: "valid" | "invalid" | "empty"; measurements?: NonNullable<SimulationInput["measurements"]>; errors: string[]; mismatchedCount: number; missingProcessVectorCount: number; count: number; };
- isFiniteNumber · function · L50-L50 — isFiniteNumber = (value: unknown): value is number
- normalizeProcessVector · function · L51-L59 — normalizeProcessVector = (value: unknown)
- currentProcessVectorFromInput · function · L60-L68 — currentProcessVectorFromInput = (nextInput: SimulationInput, strategy: string)
- processVectorMatches · function · L69-L69 — processVectorMatches = (a: Record<string, unknown>, b: Record<string, unknown>)
- parseMeasurementPayload · function · L70-L133 — parseMeasurementPayload = (raw: string, nextInput: SimulationInput, strategy: string): ParsedMeasurementState
- LpbfEngineeringSimulation · function · L135-L322 — function LpbfEngineeringSimulation({input:providedInput}:{input:SimulationInput})
- cancel · function · L164-L164 — cancel=async()
- payload · function · L217-L219 — payload = (selectedMode:SimulationMode):SimulationInput
- submit · function · L233-L252 — submit=async()
- download · function · L253-L253 — download=()

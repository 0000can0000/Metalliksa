# src/components/3d-distortion-lab/LpbfResultPresentation.tsx

- number · function · L6-L6 — number = (value: unknown)
- MatchState · type · L8-L8 — type MatchState = "match" | "mismatch" | "missing";
- measurementMatchState · function · L9-L12 — measurementMatchState = (value: string | null | undefined): MatchState
- pluralize · function · L13-L13 — pluralize = (count: number, singular: string, plural: string)
- measurementMatchLabel · function · L14-L14 — measurementMatchLabel = (match: MatchState)
- measurementSummary · function · L16-L36 — measurementSummary = (result: SimulationResult): { status: MatchState; details: string[] }
- Badge · function · L37-L39 — function Badge({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "active" | "error" | "neutral" })
- ResultHeader · function · L40-L56 — function ResultHeader({ job, material, availability, stale, elapsed, cancel, cancelling }: { job?: SimulationJob; material: string; availability: string; stale: boolean; elapsed: number; cancel: () => void; cancelling: boolean })
- ThermalHistory · function · L58-L66 — function ThermalHistory({ result, currentTime }: { result: SimulationResult; currentTime?: number })
- ConvergencePanel · function · L68-L72 — function ConvergencePanel({ study }: { study: SimulationResult["convergenceStudy"] })
- MeasurementPanel · function · L74-L78 — function MeasurementPanel({ result }: { result: SimulationResult })

# src/components/3d-distortion-lab/LpbfResultPresentation.tsx

- number · function · L6-L6 — number = (value: unknown)
- Badge · function · L8-L10 — function Badge({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "active" | "error" | "neutral" })
- ResultHeader · function · L11-L26 — function ResultHeader({ job, material, availability, stale, elapsed, cancel, cancelling }: { job?: SimulationJob; material: string; availability: string; stale: boolean; elapsed: number; cancel: () => void; cancelling: boolean })
- ThermalHistory · function · L28-L36 — function ThermalHistory({ result, currentTime }: { result: SimulationResult; currentTime?: number })
- ConvergencePanel · function · L38-L42 — function ConvergencePanel({ study }: { study: SimulationResult["convergenceStudy"] })
- MeasurementPanel · function · L44-L47 — function MeasurementPanel({ result }: { result: SimulationResult })

# src/components/MeltPoolMeasuredTrackPanel.tsx

- IntakeRow · type · L8-L18 — type IntakeRow = { material: string; laserPower_W: string; scanSpeed_mm_s: string; beamDiameter_um: string; preheatTemp_C: string; width_um: string; depth_um: string; doi: string; source: string; };
- coverageFor · function · L32-L46 — function coverageFor(material: string): string
- validateMeasuredTrackIntake · function · L48-L77 — function validateMeasuredTrackIntake(row: IntakeRow): { ok: boolean; reason: string }
- MeltPoolMeasuredTrackPanel · function · L79-L152 — MeltPoolMeasuredTrackPanel: React.FC = ()

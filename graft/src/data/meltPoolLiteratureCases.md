# src/data/meltPoolLiteratureCases.ts

- MeltPoolLiteratureKind · type · L1-L1 — type MeltPoolLiteratureKind = "measured" | "asymptotic" | "no-measured-track";
- MeltPoolLiteratureCase · type · L3-L19 — type MeltPoolLiteratureCase = { id: string; label: string; material: string; laserPower_W: number | null; scanSpeed_mm_s: number | null; beamDiameter_um: number | null; preheatTemp_C: number | null; layerThickness_um: number | null; hatchSpacing_um: number | null; publishedWidth_um: number | null; publishedDepth_um: number | null; publishedRegime: "Conduction" | "Transition" | "Keyhole" | null; kind: MeltPoolLiteratureKind; source: string; doi: string; };
- nist718 · function · L21-L47 — function nist718( id: string, label: string, power: number, speed: number, d4sigma: number, w: number, d: number, ): MeltPoolLiteratureCase
- guo316l · function · L49-L75 — function guo316l( id: string, label: string, power: number, speed: number, w: number, d: number, regime: "Conduction" | "Transition" | "Keyhole", ): MeltPoolLiteratureCase
- regimeFamily · function · L154-L159 — function regimeFamily(regime: string): "Conduction" | "Transition" | "Keyhole"
- relativeErrorPct · function · L161-L163 — function relativeErrorPct(predicted: number, published: number): number
- isLoadableLiteratureCase · function · L165-L175 — function isLoadableLiteratureCase(c: MeltPoolLiteratureCase): boolean

export type MeltPoolLiteratureCase = {
  id: string;
  label: string;
  material: string;
  laserPower_W: number;
  scanSpeed_mm_s: number;
  beamDiameter_um: number;
  preheatTemp_C: number;
  layerThickness_um: number;
  hatchSpacing_um: number;
  publishedWidth_um: number;
  publishedDepth_um: number;
  publishedRegime: "Conduction" | "Transition" | "Keyhole";
  source: string;
  doi: string;
};

/** Representative single-track anchors (King / Rosenthal asymptotic / typical LPBF windows). */
export const MELT_POOL_LITERATURE_CASES: MeltPoolLiteratureCase[] = [
  {
    id: "ti64-rosenthal-proof003",
    label: "Ti-6Al-4V Rosenthal asymptotic",
    material: "Ti-6Al-4V",
    laserPower_W: 200,
    scanSpeed_mm_s: 900,
    beamDiameter_um: 80,
    preheatTemp_C: 150,
    layerThickness_um: 30,
    hatchSpacing_um: 100,
    publishedWidth_um: 125,
    publishedDepth_um: 62.5,
    publishedRegime: "Transition",
    source: "Rosenthal 3D moving source high-speed asymptotic (PROOF 003)",
    doi: "10.1063/1.1712881",
  },
  {
    id: "ss316l-king-window",
    label: "316L King-style P-v window",
    material: "316L Stainless Steel",
    laserPower_W: 200,
    scanSpeed_mm_s: 800,
    beamDiameter_um: 70,
    preheatTemp_C: 80,
    layerThickness_um: 30,
    hatchSpacing_um: 100,
    publishedWidth_um: 140,
    publishedDepth_um: 70,
    publishedRegime: "Transition",
    source: "King et al., J. Mater. Process. Technol. (2014) — normalized-enthalpy map",
    doi: "10.1016/j.jmatprotec.2014.04.021",
  },
  {
    id: "in718-eos-like",
    label: "IN718 typical LPBF track",
    material: "Inconel 718",
    laserPower_W: 285,
    scanSpeed_mm_s: 960,
    beamDiameter_um: 80,
    preheatTemp_C: 80,
    layerThickness_um: 40,
    hatchSpacing_um: 110,
    publishedWidth_um: 160,
    publishedDepth_um: 90,
    publishedRegime: "Keyhole",
    source: "Typical IN718 single-track window near King ΔH/hs ≈ 30 onset",
    doi: "10.1016/j.jmatprotec.2014.04.021",
  },
  {
    id: "in718-amb2022-03-baseline",
    label: "IN718 NIST AMB2022-03 baseline",
    material: "Inconel 718",
    laserPower_W: 285,
    scanSpeed_mm_s: 960,
    beamDiameter_um: 67,
    preheatTemp_C: 23.5,
    layerThickness_um: 40,
    hatchSpacing_um: 110,
    publishedWidth_um: 136.3,
    publishedDepth_um: 139.7,
    publishedRegime: "Keyhole",
    source: "Lane et al., Integr. Mater. Manuf. Innov. (2024) — bare-plate single track, D4σ = 67 µm",
    doi: "10.1007/s40192-024-00355-5",
  },
];

export function regimeFamily(regime: string): "Conduction" | "Transition" | "Keyhole" {
  const r = regime.toLowerCase();
  if (r.includes("keyhole")) return "Keyhole";
  if (r.includes("transition")) return "Transition";
  return "Conduction";
}

export function relativeErrorPct(predicted: number, published: number): number {
  return (100 * (predicted - published)) / Math.max(1, published);
}

export type MeltPoolLiteratureKind = "measured" | "asymptotic";

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
  kind: MeltPoolLiteratureKind;
  source: string;
  doi: string;
};

function nist718(
  id: string,
  label: string,
  power: number,
  speed: number,
  d4sigma: number,
  w: number,
  d: number,
): MeltPoolLiteratureCase {
  return {
    id,
    label,
    material: "Inconel 718",
    laserPower_W: power,
    scanSpeed_mm_s: speed,
    beamDiameter_um: d4sigma,
    preheatTemp_C: 23.5,
    layerThickness_um: 40,
    hatchSpacing_um: 110,
    publishedWidth_um: w,
    publishedDepth_um: d,
    publishedRegime: d / (w / 2) > 1 ? "Keyhole" : "Transition",
    kind: "measured",
    source: "Lane et al., Integr. Mater. Manuf. Innov. (2024) Table 4 — AMMT bare plate",
    doi: "10.1007/s40192-024-00355-5",
  };
}

/** Measured single-track anchors only (plus one labeled Rosenthal asymptotic). */
export const MELT_POOL_LITERATURE_CASES: MeltPoolLiteratureCase[] = [
  {
    id: "ti64-rosenthal-proof003",
    label: "Ti-6Al-4V Rosenthal asymptotic (not a micrograph)",
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
    kind: "asymptotic",
    source: "Rosenthal 3D high-speed asymptotic (PROOF 003) — theory, not a measured track",
    doi: "10.1063/1.1712881",
  },
  nist718("nist-amb2022-03-0", "IN718 NIST AMB2022-03 baseline", 285, 960, 67, 136.3, 139.7),
  nist718("nist-amb2022-03-1.1", "IN718 NIST spot 49 µm", 285, 960, 49, 106.2, 227.2),
  nist718("nist-amb2022-03-1.2", "IN718 NIST spot 82 µm", 285, 960, 82, 141.7, 102.4),
  nist718("nist-amb2022-03-2.1", "IN718 NIST 1200 mm/s", 285, 1200, 67, 112.9, 109.7),
  nist718("nist-amb2022-03-2.2", "IN718 NIST 800 mm/s", 285, 800, 67, 156.1, 176.5),
  nist718("nist-amb2022-03-3.1", "IN718 NIST 325 W", 325, 960, 67, 134.3, 166.1),
  nist718("nist-amb2022-03-3.2", "IN718 NIST 245 W", 245, 960, 67, 129.4, 116.9),
  {
    id: "guo-316l-n01",
    label: "316L Guo N01 (260 W, 0.52 m/s)",
    material: "316L Stainless Steel",
    laserPower_W: 260,
    scanSpeed_mm_s: 520,
    beamDiameter_um: 100,
    preheatTemp_C: 25,
    layerThickness_um: 50,
    hatchSpacing_um: 100,
    publishedWidth_um: 114,
    publishedDepth_um: 180,
    publishedRegime: "Keyhole",
    kind: "measured",
    source: "Guo et al., Micromachines 15(2):170 (2024) Table 3 experimental",
    doi: "10.3390/mi15020170",
  },
  {
    id: "guo-316l-n04",
    label: "316L Guo N04 (260 W, 1.47 m/s)",
    material: "316L Stainless Steel",
    laserPower_W: 260,
    scanSpeed_mm_s: 1470,
    beamDiameter_um: 100,
    preheatTemp_C: 25,
    layerThickness_um: 50,
    hatchSpacing_um: 100,
    publishedWidth_um: 94,
    publishedDepth_um: 61,
    publishedRegime: "Conduction",
    kind: "measured",
    source: "Guo et al., Micromachines 15(2):170 (2024) Table 3 experimental",
    doi: "10.3390/mi15020170",
  },
  {
    id: "guo-316l-n05",
    label: "316L Guo N05 (260 W, 2.20 m/s)",
    material: "316L Stainless Steel",
    laserPower_W: 260,
    scanSpeed_mm_s: 2200,
    beamDiameter_um: 100,
    preheatTemp_C: 25,
    layerThickness_um: 50,
    hatchSpacing_um: 100,
    publishedWidth_um: 83,
    publishedDepth_um: 41,
    publishedRegime: "Conduction",
    kind: "measured",
    source: "Guo et al., Micromachines 15(2):170 (2024) Table 3 experimental",
    doi: "10.3390/mi15020170",
  },
  {
    id: "guo-316l-n06",
    label: "316L Guo N06 (440 W, 1.47 m/s)",
    material: "316L Stainless Steel",
    laserPower_W: 440,
    scanSpeed_mm_s: 1470,
    beamDiameter_um: 100,
    preheatTemp_C: 25,
    layerThickness_um: 50,
    hatchSpacing_um: 100,
    publishedWidth_um: 98,
    publishedDepth_um: 104,
    publishedRegime: "Keyhole",
    kind: "measured",
    source: "Guo et al., Micromachines 15(2):170 (2024) Table 3 experimental",
    doi: "10.3390/mi15020170",
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

import {
  LPBFAlloyId,
  TraceableLPBFRecord,
} from "../types/lpbfDataFoundation";
import {
  MASTER_LPBF_REFERENCE_DATASETS,
  loadUserLPBFRecords,
} from "../data/lpbfReferenceDatasets";
import type { BaseMetalType } from "../store/useMaterialSpecimenStore";

export type PrintVerdict = "printable" | "risky" | "do-not-print";

export interface SolverMaterialMap {
  pythonThermal: string;
  pythonSlicer: string;
  alloyId: LPBFAlloyId;
}

export function mapSpecimenToSolverMaterials(
  name: string,
  baseMetal: BaseMetalType
): SolverMaterialMap {
  const n = `${name} ${baseMetal}`.toLowerCase();
  if (n.includes("ti-6") || n.includes("ti64") || n.includes("titanium") || baseMetal === "Ti") {
    return { pythonThermal: "Ti-6Al-4V", pythonSlicer: "Ti-6Al-4V ELI", alloyId: "ti6al4v" };
  }
  if (n.includes("alsi") || n.includes("aluminum") || baseMetal === "Al") {
    return { pythonThermal: "AlSi10Mg", pythonSlicer: "AlSi10Mg", alloyId: "alsi10mg" };
  }
  if (n.includes("316") || n.includes("stainless") || baseMetal === "Fe") {
    return { pythonThermal: "316L Stainless Steel", pythonSlicer: "SS 316L", alloyId: "ss316l" };
  }
  if (n.includes("cocr") || baseMetal === "Co") {
    return { pythonThermal: "CoCrMo", pythonSlicer: "CoCrMo", alloyId: "ss316l" };
  }
  return { pythonThermal: "Inconel 718", pythonSlicer: "Inconel 718", alloyId: "in718" };
}

export function inferSlicerPreset(cadAssetName: string): "nozzle" | "turbine" | "bracket" | "gyroid" | "hip_implant" {
  const n = cadAssetName.toLowerCase();
  if (n.includes("turbine")) return "turbine";
  if (n.includes("bracket")) return "bracket";
  if (n.includes("gyroid")) return "gyroid";
  if (n.includes("hip")) return "hip_implant";
  return "nozzle";
}

export interface LiteratureMatch {
  record: TraceableLPBFRecord;
  distance: number;
}

export function findNearestLiteratureRecord(
  alloyId: LPBFAlloyId,
  power_W: number,
  speed_mm_s: number,
  hatch_um: number,
  layer_um: number
): LiteratureMatch | null {
  const pool: TraceableLPBFRecord[] = [
    ...(MASTER_LPBF_REFERENCE_DATASETS[alloyId] || []),
    ...loadUserLPBFRecords().filter((r) => r.build.alloyId === alloyId),
  ];

  if (pool.length === 0) {
    const fallback = Object.values(MASTER_LPBF_REFERENCE_DATASETS).flat();
    if (fallback.length === 0) return null;
    return nearestInPool(fallback, power_W, speed_mm_s, hatch_um, layer_um);
  }

  return nearestInPool(pool, power_W, speed_mm_s, hatch_um, layer_um);
}

function nearestInPool(
  pool: TraceableLPBFRecord[],
  power_W: number,
  speed_mm_s: number,
  hatch_um: number,
  layer_um: number
): LiteratureMatch | null {
  let best: LiteratureMatch | null = null;
  for (const record of pool) {
    const p = record.params;
    const distance =
      Math.abs(p.laserPower_W - power_W) / Math.max(1, power_W) +
      Math.abs(p.scanSpeed_mm_s - speed_mm_s) / Math.max(1, speed_mm_s) +
      Math.abs(p.hatchSpacing_um - hatch_um) / Math.max(1, hatch_um) +
      Math.abs(p.layerThickness_um - layer_um) / Math.max(1, layer_um);
    if (!best || distance < best.distance) {
      best = { record, distance };
    }
  }
  return best;
}

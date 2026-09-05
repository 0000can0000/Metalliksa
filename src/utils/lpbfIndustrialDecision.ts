import {
  LPBFAlloyId,
  TraceableLPBFRecord,
  classifyHatchLayerOverlap,
} from "../types/lpbfDataFoundation";
import {
  MASTER_LPBF_REFERENCE_DATASETS,
  loadUserLPBFRecords,
} from "../data/lpbfReferenceDatasets";
import type { PythonLPBFResult } from "../services/pythonComputationService";
import type { BaseMetalType } from "../store/useMaterialSpecimenStore";
import { evaluateLiteraturePvWindow } from "./lpbfFourAlloySchema";

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

export interface IndustrialVerdict {
  verdict: PrintVerdict;
  headline: string;
  reasons: string[];
  lofGeometry: { widthOverHatch: number; depthOverLayer: number };
}

export function composeIndustrialVerdict(
  result: PythonLPBFResult,
  alloyId?: LPBFAlloyId
): IndustrialVerdict {
  const W = result.meltPoolGeometry.width_um;
  const D = result.meltPoolGeometry.depth_um;
  const h = result.processParameters.hatchSpacing_um;
  const t = result.processParameters.layerThickness_um;
  const geom = classifyHatchLayerOverlap(W, D, h, t);
  const widthOverHatch = geom.widthOverHatch;
  const depthOverLayer = geom.depthOverLayer;

  const def = result.defectDiagnostics;
  const lofFail = def.lackOfFusionStatus === "Fail";
  const lofWarn = def.lackOfFusionStatus === "Warning";
  const keyholeHigh = def.keyholePorosityRisk.startsWith("High");
  const ballingHigh = def.ballingInstabilityRisk.startsWith("High");
  const recoaterHigh = def.recoaterCrashRisk.startsWith("High");
  const distortionHigh = def.distortionIndex >= 0.65;

  const reasons: string[] = [];
  if (lofFail) reasons.push(`Lack of fusion: W/h = ${widthOverHatch.toFixed(2)} (need >1.05) or D/t = ${depthOverLayer.toFixed(2)} (need >1.15).`);
  else if (lofWarn) reasons.push(`Hatch/layer overlap is marginal (W/h = ${widthOverHatch.toFixed(2)}, D/t = ${depthOverLayer.toFixed(2)}).`);
  if (keyholeHigh) reasons.push(`Keyhole porosity: ΔH/hₛ = ${result.processParameters.normalizedEnthalpy} (King onset ~30).`);
  if (ballingHigh) reasons.push(`Plateau–Rayleigh balling: L/W = ${result.meltPoolGeometry.aspectRatio_L_over_W}.`);
  if (recoaterHigh) reasons.push("Recoater crash / part curl risk from residual stress.");
  if (distortionHigh) reasons.push(`Inherent-strain distortion index ${def.distortionIndex} (≥0.65).`);
  const win = alloyId
    ? evaluateLiteraturePvWindow(
        alloyId,
        result.processParameters.laserPower_W,
        result.processParameters.scanSpeed_mm_s
      )
    : null;
  if (win && !win.inside) {
    reasons.push(
      `P–v is outside the ${alloyId} literature box (${win.box.powerMin_W}–${win.box.powerMax_W} W, ${win.box.speedMin_mm_s}–${win.box.speedMax_mm_s} mm/s).`
    );
  }

  let verdict: PrintVerdict = "printable";
  if (lofFail || ballingHigh || (keyholeHigh && result.processParameters.normalizedEnthalpy > 35)) {
    verdict = "do-not-print";
  } else if (lofWarn || keyholeHigh || recoaterHigh || distortionHigh || (win && !win.inside)) {
    verdict = "risky";
  }

  if (reasons.length === 0) {
    reasons.push("Conduction-mode melt pool with hatch/layer overlap above LoF gates. VED is not used as the sole criterion.");
  }

  const headline =
    verdict === "printable"
      ? "Printable — stay in the conduction window"
      : verdict === "risky"
        ? "Risky — qualify with coupon builds before flight hardware"
        : "Do not print — change P, v, h, or t before a build";

  return { verdict, headline, reasons, lofGeometry: { widthOverHatch, depthOverLayer } };
}

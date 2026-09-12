export type SimulationMode = "screening" | "standard" | "high-fidelity" | "calibration";
export interface SimulationInput {
  material: string; power_W: number; speed_mm_s: number; beamDiameter_um: number;
  preheat_C: number; layer_um: number; hatch_um: number;
  mode?: SimulationMode; backend?: "auto" | "reference" | "openfoam-thermal";
  mesh_um?: number; maxDt_s?: number; tracks?: number; layers?: number;
  strategy?: "meander" | "unidirectional" | "stripe" | "island"; stripeWidth_um?: number; islandSize_um?: number; scanAngle_deg?: number; layerRotation_deg?: number;
  dwell_s?: number; trackLength_um?: number; cooling_s?: number; timeout_s?: number;
  packingFraction?: number; powderConductivityRatio?: number; convection_W_m2K?: number;
  absorptivity?: number; emissivity?: number; study?: "none" | "mesh" | "timestep";
  properties?: unknown;
  measurements?: { width_um: number; depth_um: number; source: string; processVector?: Record<string, unknown>; uncertainty_um?: { width_um: number; depth_um: number }; independentHoldout?: boolean }[];
}
export interface ResourceEstimate {
  cells: number; spacing_m: number; shape: number[]; duration_s: number;
  minimumRequiredSteps?: number; stepBudget?: number; exceedsStepBudget?: boolean;
  minimumEstimatedSteps: number; workingMemoryEstimate_MB: number; runs: number;
  cellBudget: number; exceedsCellBudget: boolean; runtimeEstimate: string; note: string;
}
export interface SimulationResult {
  schemaVersion: 1; requestedMode: SimulationMode; effectiveMode: SimulationMode;
  solver: { id: string; version: string; openfoam: string | null };
  settings: SimulationInput; confidence: "low"; validationStatus: "unvalidated";
  productionReady: false; label: string; fallbackReason: string | null;
  metrics: { width_um: number; depth_um: number; length_um: number; [key: string]: unknown };
  material: { name: string; quality: string; source: string };
  analyticalComparison: Record<string, { width_um: number; depth_um: number; length_um: number }>;
  assumptions: string[]; regime: string; mainRisk: string; recommendation: string; riskScope: string;
  thermalHistory?: { time_s: number; peak_K: number }[];
  energyBalance?: { input_J: number; losses_J: number; stored_J: number; relativeError: number };
  measurementComparison?: Record<string, { count: number; errors_pct: number[]; rmse_um: number; bias_um: number; calibrationFactor: number | null; note: string }>;
  convergenceStudy?: unknown;
  resourceEstimate?: ResourceEstimate;
  confidenceReason?: string;
  scanPath?: { start_s: number; end_s: number; layer: number }[];
  massBalance?: { initial_kg: number; deposited_kg: number; final_kg: number; relativeError: number; scope: string };
  phaseAudit?: { liquidVolume_m3: number; solidVolume_m3: number; activeVolume_m3: number; minFraction: number; maxFraction: number; scope: string };
  fieldSeries?: "field-series.json" | null;
  fieldPreviews?: string[];
  artifacts?: { path: string; size_bytes: number; sha256: string }[];
  retentionPolicy?: string;
  measurementEvidence?: { source: string; sameProcessVector: string; uncertainty_um: unknown; independentHoldout: boolean | null }[];
  discretization?: { cells: number; mesh_m: number; minimumDt_s: number; meanDt_s: number; steps: number };

}
export interface SimulationJob {
  id: string; status: "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out";
  requestSummary?: { mode: string; backend: string; material: string };
  progress: number; log: string; error: string | null; cacheHit?: boolean; deduplicated?: boolean; result?: SimulationResult;
}
export interface SimulationCapabilities {
  openfoamVersion: string | null; openfoamThermal: boolean; freeSurfaceSolver: boolean; platform: string;
  limitation: string; materials: { name: string; quality: string; available: boolean; note: string }[];
}
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function finiteTree(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  return !object(value) || Object.values(value).every(finiteTree);
}
function dimensions(value: unknown): boolean {
  return object(value) && ["width_um", "depth_um", "length_um"].every(k => typeof value[k] === "number" && Number.isFinite(value[k]) && (value[k] as number) >= 0);
}
export function parseSimulationJob(value: unknown): SimulationJob {
  if (!object(value) || !finiteTree(value) || typeof value.id !== "string" || !/^[a-f0-9]{32}$/.test(value.id)
    || !["queued", "running", "completed", "failed", "cancelled", "timed_out"].includes(String(value.status))
    || typeof value.progress !== "number" || value.progress < 0 || value.progress > 1 || typeof value.log !== "string"
    || !(value.error === null || typeof value.error === "string")) throw new Error("Invalid LPBF job response");
  if (value.status !== "completed" && value.result !== undefined) throw new Error("Unfinished job must not contain a result");
  if (value.status === "completed") {
    const r = value.result;
    if (!object(r) || r.schemaVersion !== 1 || r.validationStatus !== "unvalidated" || r.productionReady !== false
      || r.confidence !== "low" || !dimensions(r.metrics) || !object(r.settings) || !object(r.solver)
      || typeof r.solver.id !== "string" || typeof r.solver.version !== "string" || !object(r.material)
      || !["name", "quality", "source"].every(k => typeof (r.material as Record<string, unknown>)[k] === "string")
      || !["label", "regime", "mainRisk", "recommendation", "riskScope"].every(k => typeof r[k] === "string")
      || !Array.isArray(r.assumptions) || !r.assumptions.every(a => typeof a === "string")
      || !object(r.analyticalComparison) || !Object.values(r.analyticalComparison).every(dimensions)) throw new Error("Invalid LPBF result contract");
    if (r.thermalHistory !== undefined && (!Array.isArray(r.thermalHistory) || !r.thermalHistory.every(h => object(h) && typeof h.time_s === "number" && h.time_s >= 0 && typeof h.peak_K === "number" && h.peak_K > 0))) throw new Error("Invalid thermal history");
    if (!object(r.metrics) || Object.values(r.metrics).some(v => typeof v === "number" && v < 0)) throw new Error("Negative physical result");
    if (r.energyBalance !== undefined && (!object(r.energyBalance) || !["input_J", "losses_J", "stored_J", "relativeError"].every(k => typeof (r.energyBalance as Record<string, unknown>)[k] === "number"))) throw new Error("Invalid energy audit");
    if (r.massBalance !== undefined && (!object(r.massBalance) || !["initial_kg", "deposited_kg", "final_kg", "relativeError"].every(k => typeof (r.massBalance as Record<string, unknown>)[k] === "number" && Number((r.massBalance as Record<string, unknown>)[k]) >= 0) || typeof r.massBalance.scope !== "string")) throw new Error("Invalid mass audit");
    if (r.phaseAudit !== undefined && (!object(r.phaseAudit) || !["liquidVolume_m3", "solidVolume_m3", "activeVolume_m3", "minFraction", "maxFraction"].every(k => typeof (r.phaseAudit as Record<string, unknown>)[k] === "number" && Number((r.phaseAudit as Record<string, unknown>)[k]) >= 0) || Number(r.phaseAudit.maxFraction) > 1 || Number(r.phaseAudit.minFraction) > Number(r.phaseAudit.maxFraction) || typeof r.phaseAudit.scope !== "string")) throw new Error("Invalid phase audit");
    if (r.artifacts !== undefined && (!Array.isArray(r.artifacts) || !r.artifacts.every(a => object(a) && typeof a.path === "string" && !a.path.includes("..") && !a.path.startsWith("/") && typeof a.size_bytes === "number" && Number.isSafeInteger(a.size_bytes) && a.size_bytes >= 0 && typeof a.sha256 === "string" && /^[a-f0-9]{64}$/.test(a.sha256)))) throw new Error("Invalid artifact manifest");
    if (r.fieldSeries != null && r.fieldSeries !== "field-series.json") throw new Error("Invalid field series artifact");
    if (r.fieldPreviews !== undefined && (!Array.isArray(r.fieldPreviews) || !r.fieldPreviews.every(a => a === "temperature-slice.svg" || a === "phase-slice.svg"))) throw new Error("Invalid field preview");
    if (r.measurementComparison !== undefined && (!object(r.measurementComparison) || !Object.values(r.measurementComparison).every(c => object(c)
      && ["count", "rmse_um", "bias_um"].every(k => typeof c[k] === "number") && (c.calibrationFactor === null || typeof c.calibrationFactor === "number")
      && Array.isArray(c.errors_pct) && c.errors_pct.every(e => typeof e === "number") && typeof c.note === "string"))) throw new Error("Invalid measurement comparison");
  }
  return value as unknown as SimulationJob;
}
async function request(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(25000), headers: { "Content-Type": "application/json" } });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(object(data) && typeof data.error === "string" ? data.error : `LPBF HTTP ${res.status}`);
  return data;
}
export const simulationApi = {
  async capabilities(): Promise<SimulationCapabilities> {
    const c = await request("/api/lpbf/capabilities");
    if (!object(c) || typeof c.openfoamThermal !== "boolean" || typeof c.freeSurfaceSolver !== "boolean" || typeof c.limitation !== "string"
      || !Array.isArray(c.materials) || !c.materials.every(m => object(m) && typeof m.name === "string" && typeof m.available === "boolean" && typeof m.quality === "string" && typeof m.note === "string")) throw new Error("Invalid worker capabilities");
    return c as unknown as SimulationCapabilities;
  },
  async estimate(input: SimulationInput): Promise<ResourceEstimate> {
    const e = await request("/api/lpbf/estimate", { method: "POST", body: JSON.stringify(input) });
    if (!object(e) || !finiteTree(e) || typeof e.cells !== "number" || e.cells <= 0 || typeof e.minimumEstimatedSteps !== "number") throw new Error("Invalid resource estimate");
    return e as unknown as ResourceEstimate;
  },
  async submit(input: SimulationInput) { return parseSimulationJob(await request("/api/lpbf/jobs", { method: "POST", body: JSON.stringify(input) })); },
  async get(id: string) { return parseSimulationJob(await request(`/api/lpbf/jobs/${encodeURIComponent(id)}`)); },
  async cancel(id: string) { return parseSimulationJob(await request(`/api/lpbf/jobs/${encodeURIComponent(id)}`, { method: "DELETE" })); },
};

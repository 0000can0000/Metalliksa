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
const CORE_UNITS = { power: 'W', speed: 'mm/s', length: 'um', preheat: 'degC', temperature: 'K', internalLength: 'm', time: 's', energy: 'J', beamDiameter: '1/e2-intensity' } as const;
export interface CoreContract {
  schemaVersion: 1;
  modelId: 'analytical-conduction-screening-v1' | 'stationary-enthalpy-conduction-v1';
  actualBackend: 'analytical' | 'numpy-reference' | 'openfoam-thermal';
  requestedBackend: 'auto' | 'reference' | 'openfoam-thermal';
  effectiveMode: 'screening' | 'standard' | 'calibration';
  solverId: string; inputSha256: string; materialSha256: string;
  units: typeof CORE_UNITS;
  resolvedPhysics: { conduction: true; transient: boolean; latentHeat: boolean; momentum: false; freeSurface: false; evaporation: false };
  evidenceClass: 'unvalidated-model';
}
export interface SimulationResult {
  coreContract?: CoreContract;
  numericalDiagnostics?: {
    meltPoolExtraction?: string;
    overlapExtraction?: string;
    peakMeltTime_s?: number | null; peakMeltStep?: number | null;
    meltPoolObservedSteps?: number; sampledPeakMeltVolume_um3?: number; peakMeltSamplingLossFraction?: number;
    sourceIntegration: string; stabilityLimit: string; minimumCapturedSourceFraction: number;
    maximumSourceRenormalization: number; maximumSurfaceOffset_um: number;
    maximumTimestep_s: number; maximumEnthalpyIncrement_K: number; sourceTimestepRetries: number;
  };
  fieldOverlapDiagnostics?: {
    modelId: string; scope: string; tracks: number; layers: number;
    trackOverlapRatio: number | null; meanInterTrackOverlapRatio: number | null; minInterTrackOverlapRatio: number | null;
    pairwiseOverlapRatios?: number[]; interTrackGapVolume_um3: number; hasInterTrackGap: boolean;
    interTrackLackOfFusion: boolean; midpointPenetrationDepth_um?: number; interLayerPenetrationDepth_um?: number;
    interLayerRemeltRatio?: number; globalRemeltRatio: number; totalMeltVolume_um3: number; totalRemeltVolume_um3: number;
    status: string; note: string;
  };
  geometricDefectScreen?: {
    modelId: string; scope: string; status: string; limitations: string[];
    lackOfFusion: { status: string; ellipseIndex: number | null; signedMargin: number | null;
      overlapDepth_um: number | null; maximumHatch_um: number | null; riskScreened: boolean | null; reason: string | null };
  };
  schemaVersion: 1; requestedMode: SimulationMode; effectiveMode: SimulationMode;
  solver: { id: string; version: string; openfoam: string | null };
  settings: SimulationInput; confidence: "low"; validationStatus: "unvalidated";
  productionReady: false; label: string; fallbackReason: string | null;
  metrics: { width_um: number; depth_um: number; length_um: number; [key: string]: unknown };
  material: { name: string; quality: string; source: string; temperatureCoverage_K?: number[]; liquidus_K?: number; solidus_K?: number; table?: number[][]; uncertaintyNote?: string };
  analyticalComparison: Record<string, { width_um: number; depth_um: number; length_um: number }>;
  assumptions: string[]; regime: string; mainRisk: string; recommendation: string; riskScope: string;
  thermalHistory?: { time_s: number; peak_K: number }[];
  energyBalance?: { input_J: number; losses_J: number; stored_J: number; relativeError: number };
  measurementComparison?: Record<string, { count: number; errors_pct: number[]; rmse_um: number; bias_um: number; calibrationFactor: number | null; note: string }>;
  convergenceStudy?: unknown;
  resourceEstimate?: ResourceEstimate;
  confidenceReason?: string;
  scanPath?: { start_s: number; end_s: number; layer: number; track?: number; start?: number[]; end?: number[] }[];
  provenance?: { createdAt: string; inputHash: string; implementationHash: string; solverBinaryHash: string | null; runtime_s?: number };
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
  cudaThermalPilot?: { selection: string; availability: 'checked-on-submit'; cpuAlternative: string; evidenceScope: string };
}
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function literalFields(value: unknown, expected: Record<string, unknown>): boolean {
  return object(value) && Object.keys(value).length === Object.keys(expected).length
    && Object.entries(expected).every(([key, item]) => value[key] === item);
}
function checkCoreContract(result: Record<string, unknown>): void {
  if (result.coreContract === undefined) return; // Preserve legacy absence without inventing a binding.
  const c = result.coreContract;
  const fail = () => { throw new Error('Invalid LPBF core contract'); };
  if (!object(c) || !object(result.settings) || !object(result.solver)) return fail();
  const requested = result.settings.backend;
  const mode = result.effectiveMode;
  const solver = result.solver.id;
  let backend: CoreContract['actualBackend'];
  let transient: boolean;
  if (mode === 'screening' && solver === 'rosenthal+goldak') {
    backend = 'analytical'; transient = false;
  } else if ((mode === 'standard' || mode === 'calibration')
    && (solver === 'enthalpy-fv-6' || solver === 'metalliksaThermal-OpenFOAM14-6')) {
    backend = solver === 'enthalpy-fv-6' ? 'numpy-reference' : 'openfoam-thermal';
    transient = true;
    if (requested !== 'auto' && requested !== (backend === 'numpy-reference' ? 'reference' : 'openfoam-thermal')) return fail();
  } else return fail();
  if (typeof requested !== 'string' || !['auto', 'reference', 'openfoam-thermal'].includes(requested)) return fail();
  // Structural check only. Python verifies these hashes against full resolved snapshots.
  if (![c.inputSha256, c.materialSha256].every(v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v))) return fail();
  if (!literalFields(c.units, CORE_UNITS) || !literalFields(c.resolvedPhysics, {
    conduction: true, transient, latentHeat: transient, momentum: false, freeSurface: false, evaporation: false,
  }) || !literalFields(c, {
    schemaVersion: 1, modelId: transient ? 'stationary-enthalpy-conduction-v1' : 'analytical-conduction-screening-v1',
    actualBackend: backend, requestedBackend: requested, effectiveMode: mode, solverId: solver,
    inputSha256: c.inputSha256, materialSha256: c.materialSha256, units: c.units,
    resolvedPhysics: c.resolvedPhysics, evidenceClass: 'unvalidated-model',
  })) return fail();
}
function finiteTree(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  return !object(value) || Object.values(value).every(finiteTree);
}
function dimensions(value: unknown): boolean {
  return object(value) && ["width_um", "depth_um", "length_um"].every(k => typeof value[k] === "number" && Number.isFinite(value[k]) && (value[k] as number) >= 0);
}
function checkClosure(value: unknown, keys: string[], tolerance: number): void {
  if (!object(value) || !keys.every(k => typeof value[k] === "number" && Number(value[k]) >= 0)) throw new Error("Missing or invalid thermal conservation audit");
  const [total, a, b] = keys.map(k => Number(value[k]));
  if (Math.abs(total-a-b)/Math.max(total,1e-30) > tolerance || (value.relativeError !== undefined && (typeof value.relativeError !== "number" || value.relativeError < 0 || value.relativeError > tolerance))) throw new Error("Failed thermal conservation audit");
}
export function parseSimulationJob(value: unknown): SimulationJob {
  if (!object(value) || !finiteTree(value) || typeof value.id !== "string" || !/^[a-f0-9]{32}$/.test(value.id)
    || !["queued", "running", "completed", "failed", "cancelled", "timed_out"].includes(String(value.status))
    || typeof value.progress !== "number" || value.progress < 0 || value.progress > 1 || typeof value.log !== "string"
    || !(value.error === null || typeof value.error === "string")) throw new Error("Invalid LPBF job response");
  if (value.status !== "completed" && value.result !== undefined) throw new Error("Unfinished job must not contain a result");
  if (value.status === "completed") {
    const r = value.result;
    if (!object(r)
      || typeof r.requestedMode !== "string" || !["screening", "standard", "high-fidelity", "calibration"].includes(r.requestedMode)
      || typeof r.effectiveMode !== "string" || !["screening", "standard", "calibration"].includes(r.effectiveMode)
      || !(r.fallbackReason === null || typeof r.fallbackReason === "string")
      || (r.requestedMode !== r.effectiveMode && (r.effectiveMode !== "screening" || typeof r.fallbackReason !== "string" || !r.fallbackReason.trim()))
      || (object(r.settings) && r.settings.mode !== undefined && r.settings.mode !== r.requestedMode)) throw new Error("Invalid LPBF execution mode or fallback provenance");
    if (!object(r) || r.schemaVersion !== 1 || r.validationStatus !== "unvalidated" || r.productionReady !== false
      || r.confidence !== "low" || !dimensions(r.metrics) || !object(r.settings) || !object(r.solver)
      || typeof r.solver.id !== "string" || typeof r.solver.version !== "string" || !object(r.material)
      || !["name", "quality", "source"].every(k => typeof (r.material as Record<string, unknown>)[k] === "string")
      || !["label", "regime", "mainRisk", "recommendation", "riskScope"].every(k => typeof r[k] === "string")
      || !Array.isArray(r.assumptions) || !r.assumptions.every(a => typeof a === "string")
      || !object(r.analyticalComparison) || !Object.values(r.analyticalComparison).every(dimensions)) throw new Error("Invalid LPBF result contract");
    checkCoreContract(r);
    if (r.thermalHistory !== undefined && (!Array.isArray(r.thermalHistory) || !r.thermalHistory.every((h, index, history) => object(h) && typeof h.time_s === "number" && h.time_s >= 0 && typeof h.peak_K === "number" && h.peak_K > 0
      && (index === 0 || h.time_s > history[index - 1].time_s)))) throw new Error("Invalid thermal history");
    if (!object(r.metrics) || Object.values(r.metrics).some(v => typeof v === "number" && v < 0)) throw new Error("Negative physical result");
    if (r.energyBalance !== undefined && (!object(r.energyBalance) || !["input_J", "losses_J", "stored_J", "relativeError"].every(k => typeof (r.energyBalance as Record<string, unknown>)[k] === "number"))) throw new Error("Invalid energy audit");
    if (r.massBalance !== undefined && (!object(r.massBalance) || !["initial_kg", "deposited_kg", "final_kg", "relativeError"].every(k => typeof (r.massBalance as Record<string, unknown>)[k] === "number" && Number((r.massBalance as Record<string, unknown>)[k]) >= 0) || typeof r.massBalance.scope !== "string")) throw new Error("Invalid mass audit");
    if (r.phaseAudit !== undefined && (!object(r.phaseAudit) || !["liquidVolume_m3", "solidVolume_m3", "activeVolume_m3", "minFraction", "maxFraction"].every(k => typeof (r.phaseAudit as Record<string, unknown>)[k] === "number" && Number((r.phaseAudit as Record<string, unknown>)[k]) >= 0) || Number(r.phaseAudit.maxFraction) > 1 || Number(r.phaseAudit.minFraction) > Number(r.phaseAudit.maxFraction) || typeof r.phaseAudit.scope !== "string")) throw new Error("Invalid phase audit");
    if (r.effectiveMode === "standard" || r.effectiveMode === "calibration") {
      checkClosure(r.energyBalance, ["input_J", "losses_J", "stored_J"], .01);
      checkClosure(r.massBalance, ["final_kg", "initial_kg", "deposited_kg"], 1e-10);
      checkClosure(r.phaseAudit, ["activeVolume_m3", "liquidVolume_m3", "solidVolume_m3"], 1e-10);
    }
    if (r.artifacts !== undefined && (!Array.isArray(r.artifacts) || !r.artifacts.every(a => object(a) && typeof a.path === "string" && !a.path.includes("..") && !a.path.startsWith("/") && typeof a.size_bytes === "number" && Number.isSafeInteger(a.size_bytes) && a.size_bytes >= 0 && typeof a.sha256 === "string" && /^[a-f0-9]{64}$/.test(a.sha256)))) throw new Error("Invalid artifact manifest");
    if (r.fieldSeries != null && r.fieldSeries !== "field-series.json") throw new Error("Invalid field series artifact");
    if (r.numericalDiagnostics !== undefined) {
      const d = r.numericalDiagnostics;
      if (!object(d) || d.sourceIntegration !== "cell-integrated-gaussian-gl2-v1" || d.stabilityLimit !== "local-conductance-row-sum"
        || !["minimumCapturedSourceFraction", "maximumSourceRenormalization", "maximumSurfaceOffset_um", "maximumTimestep_s", "maximumEnthalpyIncrement_K", "sourceTimestepRetries"].every(k => typeof d[k] === "number" && Number(d[k]) >= 0)
        || Number(d.minimumCapturedSourceFraction) <= 0 || Number(d.minimumCapturedSourceFraction) > 1
        || Number(d.maximumSourceRenormalization) < 1 || !Number.isSafeInteger(d.sourceTimestepRetries)) throw new Error("Invalid numerical source diagnostics");
      if (d.meltPoolExtraction !== undefined && (d.meltPoolExtraction !== "accepted-step-molten-volume-v1"
        || !Number.isSafeInteger(d.meltPoolObservedSteps) || Number(d.meltPoolObservedSteps) < 1
        || typeof d.sampledPeakMeltVolume_um3 !== "number" || d.sampledPeakMeltVolume_um3 < 0
        || typeof d.peakMeltSamplingLossFraction !== "number" || d.peakMeltSamplingLossFraction < 0 || d.peakMeltSamplingLossFraction > 1
        || !(d.peakMeltTime_s === null && d.peakMeltStep === null
          || typeof d.peakMeltTime_s === "number" && d.peakMeltTime_s > 0 && Number.isSafeInteger(d.peakMeltStep)
            && Number(d.peakMeltStep) > 0 && Number(d.peakMeltStep) <= Number(d.meltPoolObservedSteps)))) throw new Error("Invalid melt pool extraction diagnostics");
    }
    if (r.fieldOverlapDiagnostics !== undefined) {
      const d = r.fieldOverlapDiagnostics;
      if (!object(d) || d.modelId !== "field-inter-track-overlap-v1" || typeof d.scope !== "string"
        || !Number.isSafeInteger(d.tracks) || Number(d.tracks) < 1 || !Number.isSafeInteger(d.layers) || Number(d.layers) < 1
        || !(d.trackOverlapRatio === null || (typeof d.trackOverlapRatio === "number" && d.trackOverlapRatio >= 0 && d.trackOverlapRatio <= 1))
        || typeof d.interTrackGapVolume_um3 !== "number" || d.interTrackGapVolume_um3 < 0
        || typeof d.hasInterTrackGap !== "boolean" || typeof d.interTrackLackOfFusion !== "boolean"
        || typeof d.globalRemeltRatio !== "number" || d.globalRemeltRatio < 0 || d.globalRemeltRatio > 1
        || typeof d.totalMeltVolume_um3 !== "number" || d.totalMeltVolume_um3 < 0
        || typeof d.totalRemeltVolume_um3 !== "number" || d.totalRemeltVolume_um3 < 0
        || typeof d.status !== "string" || typeof d.note !== "string") throw new Error("Invalid field overlap diagnostics");
    }
    if (r.geometricDefectScreen !== undefined) {
      const d = r.geometricDefectScreen;
      const loss = object(d) ? d.lackOfFusion : undefined;
      if (!object(d) || d.modelId !== "elliptic-overlap-screening-v1" || typeof d.scope !== "string" || typeof d.status !== "string"
        || !Array.isArray(d.limitations) || !d.limitations.every(v => typeof v === "string") || !object(loss)
        || typeof loss.status !== "string" || !(loss.reason === null || typeof loss.reason === "string")
        || !(loss.riskScreened === null || typeof loss.riskScreened === "boolean")
        || !["ellipseIndex", "signedMargin", "overlapDepth_um", "maximumHatch_um"].every(k => loss[k] === null || typeof loss[k] === "number")) throw new Error("Invalid geometric defect screening");
    }
    if (r.fieldPreviews !== undefined && (!Array.isArray(r.fieldPreviews) || !r.fieldPreviews.every(a => a === "temperature-slice.svg" || a === "phase-slice.svg"))) throw new Error("Invalid field preview");
    if (r.measurementComparison !== undefined && (!object(r.measurementComparison) || !Object.values(r.measurementComparison).every(c => object(c)
      && typeof c.count === "number" && Number.isSafeInteger(c.count) && c.count > 0
      && typeof c.rmse_um === "number" && c.rmse_um >= 0 && typeof c.bias_um === "number"
      && (c.calibrationFactor === null || (typeof c.calibrationFactor === "number" && c.calibrationFactor > 0))
      && Array.isArray(c.errors_pct) && c.errors_pct.length === c.count && c.errors_pct.every(e => typeof e === "number") && typeof c.note === "string"))) throw new Error("Invalid measurement comparison");
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


/** Separate CUDA pilot contract. It must never be parsed as a standard CPU job. */
export interface GpuPilotInput extends Omit<SimulationInput, 'backend' | 'mode' | 'study' | 'tracks' | 'layers' | 'measurements'> {
  jobType: 'gpu-thermal-pilot';
  backend: `cuda:${number}`;
  mode: 'standard';
  surfaceMode: 'powder-layer';
  study: 'none';
  tracks: 1;
  layers: 1;
}
const GPU_PILOT_OPTIONAL_FIELDS = [
  'mesh_um', 'maxDt_s', 'stripeWidth_um', 'islandSize_um', 'scanAngle_deg', 'layerRotation_deg',
  'dwell_s', 'trackLength_um', 'cooling_s', 'timeout_s', 'packingFraction',
  'powderConductivityRatio', 'convection_W_m2K', 'absorptivity', 'emissivity',
] as const;

/** Build only fields accepted by the CPU reference validator, even from older runtime inputs. */
export function buildGpuPilotInput(input: SimulationInput, settings: Partial<SimulationInput>,
  device: `cuda:${number}`, material: string, strategy: SimulationInput['strategy'], properties?: unknown): GpuPilotInput {
  const merged = { ...input, ...settings };
  const optional = Object.fromEntries(GPU_PILOT_OPTIONAL_FIELDS
    .filter(key => merged[key] !== undefined).map(key => [key, merged[key]])) as Partial<GpuPilotInput>;
  return {
    ...optional, material, power_W: input.power_W, speed_mm_s: input.speed_mm_s,
    beamDiameter_um: input.beamDiameter_um, preheat_C: input.preheat_C,
    layer_um: input.layer_um, hatch_um: input.hatch_um, strategy,
    ...(properties !== undefined ? { properties } : {}),
    jobType: 'gpu-thermal-pilot', backend: device, mode: 'standard',
    surfaceMode: 'powder-layer', study: 'none', tracks: 1, layers: 1,
  };
}
export type GpuPilotStatus = 'pass' | 'failed' | 'inconclusive';
export interface GpuPilotComparison {
  status: GpuPilotStatus;
  cpu?: number; gpu?: number; relativeDifference?: number;
  absoluteDifference_um?: number; relativeRiseL2?: number; relativeRiseMax?: number;
  reason?: string;
}
export interface GpuPilotResult {
  schemaVersion: 1; jobType: 'gpu-thermal-pilot';
  requestedMode: 'standard'; effectiveMode: 'gpu-pilot';
  validationStatus: 'unvalidated'; productionReady: false; label: string;
  settings: GpuPilotInput;
  solver: { id: 'enthalpy-fv-6-cuda-pilot-1'; modelId: 'stationary-enthalpy-conduction-v1';
    actualBackend: string; thermalEvolutionDevice: string; sourceIntegrationDevice: 'cpu';
    sourceTimestepLimiterDevice: 'cpu'; dtype: 'float64' };
  material: { name: string; materialId: string; materialRevisionSha256: string; version: string };
  metrics: { width_um: number; depth_um: number; length_um: number; volume_um3: number; peakTemperature_K: number };
  energyBalance: { input_J: number; losses_J: number; stored_J: number; relativeError: number };
  discretization: { cells: number; mesh_m: number; minimumDt_s: number; maximumDt_s: number; meanDt_s: number; steps: number };
  gpuPilot: { status: GpuPilotStatus; scope: string; experimentalValidation: false;
    targets: { integralRelativeMax: number; widthDepthAbsoluteCellsMax: number;
      fieldRiseL2RelativeMax: number; fieldRiseMaxRelativeMax: number; peakMeltVolumeRelativeMax: number; source: string };
    cpu: { solver: { id: string }; coreContract: { modelId: 'stationary-enthalpy-conduction-v1'; actualBackend: 'numpy-reference' };
      material: { materialRevisionSha256: string }; discretization: { cells: number; steps: number; mesh_m: number } };
    comparisons: Record<string, GpuPilotComparison> };
  provenance: { inputHash: string; implementationHash: string; materialVersion: string; createdAt: string;
    deviceEvidence: { selected: string; name: string; computeCapability: number[];
      torch: string; cudaRuntime: string; thermalEvolution: string; sourceIntegration: 'cpu'; synchronizedAfterSolve: true };
    runtime_s?: number };
  artifacts: [];
}
export interface GpuPilotJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timed_out';
  requestSummary: { jobType: 'gpu-thermal-pilot'; backend: string; mode: string; material: string };
  progress: number; log: string; error: string | null;
  cacheHit?: boolean; deduplicated?: boolean;
  result?: GpuPilotResult;
}

const GPU_COMPARISON_KEYS = ['finalSampling', 'finalTemperatureField', 'peakTemperature_K',
  'input_J', 'losses_J', 'stored_J', 'width_um', 'depth_um', 'length_um', 'volume_um3'] as const;
const gpuStatus = (value: unknown): value is GpuPilotStatus =>
  value === 'pass' || value === 'failed' || value === 'inconclusive';

export function parseGpuPilotJob(value: unknown): GpuPilotJob {
  if (!object(value) || !finiteTree(value) || typeof value.id !== 'string' || !/^[a-f0-9]{32}$/.test(value.id)
    || !['queued', 'running', 'completed', 'failed', 'cancelled', 'timed_out'].includes(String(value.status))
    || typeof value.progress !== 'number' || value.progress < 0 || value.progress > 1
    || typeof value.log !== 'string' || !(value.error === null || typeof value.error === 'string')
    || !object(value.requestSummary) || value.requestSummary.jobType !== 'gpu-thermal-pilot'
    || typeof value.requestSummary.backend !== 'string' || !/^cuda:[0-9]+$/.test(value.requestSummary.backend)
    || typeof value.requestSummary.mode !== 'string' || typeof value.requestSummary.material !== 'string') {
    throw new Error('Invalid CUDA pilot job response');
  }
  if (value.status !== 'completed') {
    if (value.result !== undefined) throw new Error('Unfinished CUDA pilot job must not contain a result');
    return value as unknown as GpuPilotJob;
  }
  const r = value.result;
  if (!object(r) || r.schemaVersion !== 1 || r.jobType !== 'gpu-thermal-pilot'
    || r.requestedMode !== 'standard' || r.effectiveMode !== 'gpu-pilot'
    || r.validationStatus !== 'unvalidated' || r.productionReady !== false
    || typeof r.label !== 'string' || !object(r.settings) || r.settings.jobType !== 'gpu-thermal-pilot'
    || r.settings.backend !== value.requestSummary.backend || r.settings.mode !== 'standard'
    || r.settings.study !== 'none' || r.settings.surfaceMode !== 'powder-layer'
    || r.settings.tracks !== 1 || r.settings.layers !== 1
    || !object(r.solver) || r.solver.id !== 'enthalpy-fv-6-cuda-pilot-1'
    || r.solver.modelId !== 'stationary-enthalpy-conduction-v1'
    || r.solver.actualBackend !== r.settings.backend
    || r.solver.thermalEvolutionDevice !== r.settings.backend
    || r.solver.sourceIntegrationDevice !== 'cpu' || r.solver.sourceTimestepLimiterDevice !== 'cpu'
    || r.solver.dtype !== 'float64' || !object(r.material)
    || typeof r.material.name !== 'string' || typeof r.material.materialId !== 'string'
    || typeof r.material.materialRevisionSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(r.material.materialRevisionSha256)
    || !object(r.metrics) || !dimensions(r.metrics) || typeof r.metrics.volume_um3 !== 'number'
    || r.metrics.volume_um3 < 0 || typeof r.metrics.peakTemperature_K !== 'number' || r.metrics.peakTemperature_K <= 0
    || !object(r.discretization) || !Number.isSafeInteger(r.discretization.cells) || Number(r.discretization.cells) <= 0
    || !Number.isSafeInteger(r.discretization.steps) || Number(r.discretization.steps) <= 0
    || typeof r.discretization.mesh_m !== 'number' || r.discretization.mesh_m <= 0
    || !object(r.provenance) || !object(r.provenance.deviceEvidence)
    || r.provenance.deviceEvidence.selected !== r.settings.backend
    || r.provenance.deviceEvidence.thermalEvolution !== r.settings.backend
    || r.provenance.deviceEvidence.sourceIntegration !== 'cpu'
    || r.provenance.deviceEvidence.synchronizedAfterSolve !== true
    || typeof r.provenance.deviceEvidence.name !== 'string' || !r.provenance.deviceEvidence.name.trim()
    || !object(r.gpuPilot) || r.gpuPilot.experimentalValidation !== false
    || !gpuStatus(r.gpuPilot.status) || !object(r.gpuPilot.cpu)
    || !object(r.gpuPilot.cpu.coreContract)
    || r.gpuPilot.cpu.coreContract.modelId !== r.solver.modelId
    || r.gpuPilot.cpu.coreContract.actualBackend !== 'numpy-reference'
    || !object(r.gpuPilot.cpu.material)
    || r.gpuPilot.cpu.material.materialRevisionSha256 !== r.material.materialRevisionSha256
    || !object(r.gpuPilot.targets) || !object(r.gpuPilot.comparisons)
    || !Array.isArray(r.artifacts) || r.artifacts.length !== 0) {
    throw new Error('Invalid CUDA pilot result identity');
  }
  checkClosure(r.energyBalance, ['input_J', 'losses_J', 'stored_J'], .01);
  const comparisons = r.gpuPilot.comparisons as Record<string, unknown>;
  if (!GPU_COMPARISON_KEYS.every(key => {
    const item = comparisons[key];
    return object(item) && gpuStatus(item.status);
  })) {
    throw new Error('Incomplete CUDA pilot parity report');
  }
  const statuses = GPU_COMPARISON_KEYS.map(key => (comparisons[key] as Record<string, unknown>).status);
  const status = statuses.includes('failed') ? 'failed' : statuses.includes('inconclusive') ? 'inconclusive' : 'pass';
  if (status !== r.gpuPilot.status) throw new Error('CUDA pilot parity status mismatch');
  const targets = r.gpuPilot.targets;
  if (targets.integralRelativeMax !== .01 || targets.widthDepthAbsoluteCellsMax !== 1
    || targets.fieldRiseL2RelativeMax !== .01 || targets.fieldRiseMaxRelativeMax !== .01
    || targets.peakMeltVolumeRelativeMax !== .01
    || targets.source !== 'docs/DIGITAL_TWIN_MASTER_PLAN_2026-09-21.md#11') {
    throw new Error('CUDA pilot frozen parity targets changed');
  }
  if (status === 'pass') {
    const field = comparisons.finalTemperatureField as Record<string, unknown>;
    if (typeof field.relativeRiseL2 !== 'number' || field.relativeRiseL2 < 0
      || typeof field.relativeRiseMax !== 'number' || field.relativeRiseMax < 0
      || field.relativeRiseL2 > targets.fieldRiseL2RelativeMax
      || field.relativeRiseMax > targets.fieldRiseMaxRelativeMax) {
      throw new Error('CUDA pilot field parity exceeds target');
    }
    for (const key of ['peakTemperature_K', 'input_J', 'losses_J', 'stored_J']) {
      const item = comparisons[key] as Record<string, unknown>;
      if (typeof item.cpu !== 'number' || typeof item.gpu !== 'number'
        || Math.abs(item.cpu-item.gpu)/Math.max(Math.abs(item.cpu), 1e-30) > targets.integralRelativeMax) {
        throw new Error('CUDA pilot integral parity exceeds target');
      }
    }
    for (const key of ['width_um', 'depth_um', 'length_um']) {
      const item = comparisons[key] as Record<string, unknown>;
      if (typeof item.cpu !== 'number' || typeof item.gpu !== 'number'
        || Math.abs(item.cpu-item.gpu) > targets.widthDepthAbsoluteCellsMax * Number(r.discretization.mesh_m) * 1e6) {
        throw new Error('CUDA pilot geometry parity exceeds target');
      }
    }
    const volume = comparisons.volume_um3 as Record<string, unknown>;
    if (typeof volume.cpu !== 'number' || typeof volume.gpu !== 'number'
      || Math.abs(volume.cpu-volume.gpu)/Math.max(volume.cpu, 1e-30) > targets.peakMeltVolumeRelativeMax) {
      throw new Error('CUDA pilot melt-volume parity exceeds target');
    }
  }
  return value as unknown as GpuPilotJob;
}

export const gpuPilotApi = {
  async submit(input: GpuPilotInput) {
    return parseGpuPilotJob(await request('/api/lpbf/jobs', { method: 'POST', body: JSON.stringify(input) }));
  },
  async get(id: string) {
    return parseGpuPilotJob(await request(`/api/lpbf/jobs/${encodeURIComponent(id)}`));
  },
  async cancel(id: string) {
    return parseGpuPilotJob(await request(`/api/lpbf/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' }));
  },
};

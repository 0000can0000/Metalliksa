/**
 * Session-only Python Build Job result. Not persisted.
 * Industrial UI (rail + Decision lab) must display job.verdict and must not re-score in TypeScript.
 *
 * Faz 5: default job is fast (enableUq=false, includeAmbench=false).
 * Session retains last UQ / NIST blocks when subsequent jobs skip them.
 */
import { useEffect } from "react";
import { create } from "zustand";
import {
  pythonComputationService,
  PythonLpbfAmbenchBlock,
  PythonLpbfBuildJobResult,
  PythonLpbfMurakamiBlock,
  PythonLpbfUqBlock,
} from "../services/pythonComputationService";
import { inferSlicerPreset, mapSpecimenToSolverMaterials } from "../utils/lpbfIndustrialDecision";
import { useMaterialSpecimenStore } from "./useMaterialSpecimenStore";
import { useLpbfBuildMeshStore } from "./useLpbfBuildMeshStore";

export interface LpbfMurakamiSessionInput {
  defectSqrtAreasPaste: string;
  hardness_HV: number | null;
  ctDetectionThreshold_um: number | null;
}

interface LpbfBuildJobPythonState {
  job: PythonLpbfBuildJobResult | null;
  error: string | null;
  busy: boolean;
  roundTripMs: number | null;
  lastKey: string | null;
  seq: number;
  /** Retained when a later fast job omits UQ. */
  sessionUq: PythonLpbfUqBlock | null;
  sessionAmbench: PythonLpbfAmbenchBlock | null;
  murakamiInput: LpbfMurakamiSessionInput;
  lastFlags: { enableUq: boolean; includeAmbench: boolean };
}

export const useLpbfBuildJobStore = create<LpbfBuildJobPythonState>(() => ({
  job: null,
  error: null,
  busy: false,
  roundTripMs: null,
  lastKey: null,
  seq: 0,
  sessionUq: null,
  sessionAmbench: null,
  murakamiInput: {
    defectSqrtAreasPaste: "",
    hardness_HV: null,
    ctDetectionThreshold_um: null,
  },
  lastFlags: { enableUq: false, includeAmbench: false },
}));

let inFlightKey: string | null = null;
let inFlightPromise: Promise<void> | null = null;

export type LpbfBuildJobRequestOptions = {
  force?: boolean;
  enableUq?: boolean;
  includeAmbench?: boolean;
  uqSamples?: number;
  bypassCache?: boolean;
};

function buildJobKey(flags: { enableUq: boolean; includeAmbench: boolean; uqSamples: number }): {
  key: string;
  payload: Parameters<typeof pythonComputationService.solveLpbfBuildJob>[0];
} {
  const specimen = useMaterialSpecimenStore.getState().activeSpecimen;
  const liveMesh = useLpbfBuildMeshStore.getState().mesh;
  const murakamiInput = useLpbfBuildJobStore.getState().murakamiInput;
  const lpbf = specimen.lpbf;
  const materials = mapSpecimenToSolverMaterials(specimen.name, specimen.baseMetal);
  const payload: Parameters<typeof pythonComputationService.solveLpbfBuildJob>[0] = {
    alloyId: materials.alloyId,
    thermalMaterial: materials.pythonThermal,
    slicerMaterial: materials.pythonSlicer,
    laserPower_W: lpbf.laserPower_W,
    scanSpeed_mm_s: lpbf.scanSpeed_mms,
    beamDiameter_um: lpbf.beamDiameter_um,
    preheatTemp_C: lpbf.preheatTemp_C,
    layerThickness_um: lpbf.layer_um,
    hatchSpacing_um: lpbf.hatch_um,
    laserWavelength: "IR_1064nm",
    preset: liveMesh ? "custom" : inferSlicerPreset(lpbf.cadAssetName),
    customTriangles: liveMesh?.triangles ?? null,
    cadAssetName: liveMesh?.name || lpbf.cadAssetName,
    triangleCountNative: liveMesh?.nativeTriangleCount,
    processSeed: lpbf.processSeed ?? 42,
    scanStrategy: lpbf.scanStrategy,
    stripeWidth_mm: 5,
    scanRotation_deg: 67,
    hatchDwell_ms: 0,
    inclineAngle_deg: lpbf.inclineAngle_deg ?? 0,
    enableUq: flags.enableUq,
    uqSamples: flags.uqSamples,
    includeAmbench: flags.includeAmbench,
    ...(lpbf.downskinOverhang_deg > 0
      ? { downskinOverhang_deg: lpbf.downskinOverhang_deg }
      : {}),
    ...(murakamiInput.defectSqrtAreasPaste.trim()
      ? { defectSqrtAreasPaste: murakamiInput.defectSqrtAreasPaste }
      : {}),
    ...(murakamiInput.hardness_HV != null ? { hardness_HV: murakamiInput.hardness_HV } : {}),
    ...(murakamiInput.ctDetectionThreshold_um != null
      ? { ctDetectionThreshold_um: murakamiInput.ctDetectionThreshold_um }
      : {}),
  };
  const key = [
    materials.alloyId,
    payload.laserPower_W,
    payload.scanSpeed_mm_s,
    payload.beamDiameter_um,
    payload.preheatTemp_C,
    payload.layerThickness_um,
    payload.hatchSpacing_um,
    payload.preset,
    payload.cadAssetName,
    liveMesh?.usedTriangleCount ?? 0,
    liveMesh?.nativeTriangleCount ?? 0,
    payload.processSeed,
    payload.scanStrategy,
    payload.inclineAngle_deg,
    payload.downskinOverhang_deg,
    flags.enableUq ? 1 : 0,
    flags.includeAmbench ? 1 : 0,
    flags.enableUq ? flags.uqSamples : 0,
    murakamiInput.defectSqrtAreasPaste.trim().slice(0, 80),
    murakamiInput.hardness_HV ?? "",
  ].join("|");
  return { key, payload };
}

export function peekLpbfBuildJobKey(): string {
  const st = useLpbfBuildJobStore.getState();
  return buildJobKey({
    enableUq: st.lastFlags.enableUq,
    includeAmbench: st.lastFlags.includeAmbench,
    uqSamples: 96,
  }).key;
}

export function setLpbfMurakamiInput( partial: Partial<LpbfMurakamiSessionInput>): void {
  const prev = useLpbfBuildJobStore.getState().murakamiInput;
  useLpbfBuildJobStore.setState({ murakamiInput: { ...prev, ...partial } });
}

export async function requestLpbfBuildJob(options?: LpbfBuildJobRequestOptions): Promise<void> {
  const force = options?.force === true;
  const enableUq = options?.enableUq === true;
  const includeAmbench = options?.includeAmbench === true;
  const uqSamples = options?.uqSamples ?? 96;
  const { key, payload } = buildJobKey({ enableUq, includeAmbench, uqSamples });
  if (options?.bypassCache || force) {
    payload.bypassCache = true;
  }
  const st = useLpbfBuildJobStore.getState();

  // Client-side short-circuit only for identical fast jobs (no force).
  if (
    !force &&
    !enableUq &&
    !includeAmbench &&
    st.lastKey === key &&
    st.job &&
    !st.error &&
    st.lastFlags.enableUq === false &&
    st.lastFlags.includeAmbench === false
  ) {
    return;
  }
  if (!force && inFlightKey === key && inFlightPromise) {
    return inFlightPromise;
  }

  const seq = st.seq + 1;
  useLpbfBuildJobStore.setState({
    busy: true,
    seq,
    error: force ? null : st.error,
    lastFlags: { enableUq, includeAmbench },
  });

  const run = (async () => {
    try {
      const t0 = performance.now();
      const job = await pythonComputationService.solveLpbfBuildJob(payload);
      if (useLpbfBuildJobStore.getState().seq !== seq) return;
      const prev = useLpbfBuildJobStore.getState();
      const sessionUq = job.uq ?? prev.sessionUq;
      const sessionAmbench = job.ambench ?? prev.sessionAmbench;
      // Attach retained blocks for UI when this call skipped them.
      const displayJob: PythonLpbfBuildJobResult = {
        ...job,
        uq: job.uq ?? prev.sessionUq,
        ambench: job.ambench ?? prev.sessionAmbench,
      };
      useLpbfBuildJobStore.setState({
        job: displayJob,
        error: null,
        busy: false,
        lastKey: key,
        roundTripMs: Math.round(performance.now() - t0),
        sessionUq,
        sessionAmbench,
        lastFlags: { enableUq, includeAmbench },
      });
    } catch (err: unknown) {
      if (useLpbfBuildJobStore.getState().seq !== seq) return;
      const prev = useLpbfBuildJobStore.getState();
      useLpbfBuildJobStore.setState({
        error: err instanceof Error ? err.message : "Python LPBF engines unavailable.",
        busy: false,
        lastKey: key,
        job: prev.lastKey === key ? prev.job : null,
      });
    } finally {
      if (inFlightKey === key) {
        inFlightKey = null;
        inFlightPromise = null;
      }
    }
  })();

  inFlightKey = key;
  inFlightPromise = run;
  return run;
}

/** Debounced Python fetch. Mount on the industrial rail and Decision lab so they share one verdict. */
export function useLpbfBuildJobPython() {
  const specimen = useMaterialSpecimenStore((s) => s.activeSpecimen);
  const liveMesh = useLpbfBuildMeshStore((s) => s.mesh);
  const job = useLpbfBuildJobStore((s) => s.job);
  const error = useLpbfBuildJobStore((s) => s.error);
  const busy = useLpbfBuildJobStore((s) => s.busy);
  const roundTripMs = useLpbfBuildJobStore((s) => s.roundTripMs);
  const lastKey = useLpbfBuildJobStore((s) => s.lastKey);
  const lastFlags = useLpbfBuildJobStore((s) => s.lastFlags);
  const murakamiInput = useLpbfBuildJobStore((s) => s.murakamiInput);
  const aligned = lastKey === peekLpbfBuildJobKey();

  const lpbf = specimen.lpbf;

  useEffect(() => {
    const timer = setTimeout(() => {
      // Debounced default = fast path (no UQ / NIST).
      void requestLpbfBuildJob({ enableUq: false, includeAmbench: false });
    }, 280);
    return () => clearTimeout(timer);
  }, [
    specimen.name,
    specimen.baseMetal,
    lpbf.laserPower_W,
    lpbf.scanSpeed_mms,
    lpbf.beamDiameter_um,
    lpbf.preheatTemp_C,
    lpbf.layer_um,
    lpbf.hatch_um,
    lpbf.cadAssetName,
    lpbf.processSeed,
    lpbf.scanStrategy,
    lpbf.inclineAngle_deg,
    lpbf.downskinOverhang_deg,
    liveMesh?.name,
    liveMesh?.usedTriangleCount,
    liveMesh?.nativeTriangleCount,
    murakamiInput.defectSqrtAreasPaste,
    murakamiInput.hardness_HV,
    murakamiInput.ctDetectionThreshold_um,
  ]);

  return {
    job: aligned ? job : null,
    error,
    busy,
    roundTripMs: aligned ? roundTripMs : null,
    lastFlags,
    murakamiInput,
    cache: aligned ? job?.cache ?? null : null,
    rerun: () => requestLpbfBuildJob({ force: true, bypassCache: true, enableUq: false, includeAmbench: false }),
    runUq: () =>
      requestLpbfBuildJob({ force: true, enableUq: true, includeAmbench: false, uqSamples: 96 }),
    validateNist: () =>
      requestLpbfBuildJob({ force: true, enableUq: false, includeAmbench: true }),
    setMurakamiInput: setLpbfMurakamiInput,
  };
}

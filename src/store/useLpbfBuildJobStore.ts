import { useEffect } from "react";
import { create } from "zustand";
import { pythonComputationService, PythonLpbfBuildJobResult } from "../services/pythonComputationService";
import { inferSlicerPreset, mapSpecimenToSolverMaterials } from "../utils/lpbfIndustrialDecision";
import { useMaterialSpecimenStore } from "./useMaterialSpecimenStore";
import { useLpbfBuildMeshStore } from "./useLpbfBuildMeshStore";

/**
 * Session-only Python Build Job result. Not persisted.
 * Industrial UI (rail + Decision lab) must display job.verdict and must not re-score in TypeScript.
 */
interface LpbfBuildJobPythonState {
  job: PythonLpbfBuildJobResult | null;
  error: string | null;
  busy: boolean;
  roundTripMs: number | null;
  lastKey: string | null;
  seq: number;
}

export const useLpbfBuildJobStore = create<LpbfBuildJobPythonState>(() => ({
  job: null,
  error: null,
  busy: false,
  roundTripMs: null,
  lastKey: null,
  seq: 0,
}));

let inFlightKey: string | null = null;
let inFlightPromise: Promise<void> | null = null;

function buildJobKey(): { key: string; payload: Parameters<typeof pythonComputationService.solveLpbfBuildJob>[0] } {
  const specimen = useMaterialSpecimenStore.getState().activeSpecimen;
  const liveMesh = useLpbfBuildMeshStore.getState().mesh;
  const lpbf = specimen.lpbf;
  const materials = mapSpecimenToSolverMaterials(specimen.name, specimen.baseMetal);
  const payload = {
    alloyId: materials.alloyId,
    thermalMaterial: materials.pythonThermal,
    slicerMaterial: materials.pythonSlicer,
    laserPower_W: lpbf.laserPower_W,
    scanSpeed_mm_s: lpbf.scanSpeed_mms,
    beamDiameter_um: lpbf.beamDiameter_um,
    preheatTemp_C: lpbf.preheatTemp_C,
    layerThickness_um: lpbf.layer_um,
    hatchSpacing_um: lpbf.hatch_um,
    laserWavelength: "IR_1064nm" as const,
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
    enableUq: true,
    uqSamples: 48,
    includeAmbench: true,
    ...(lpbf.downskinOverhang_deg > 0
      ? { downskinOverhang_deg: lpbf.downskinOverhang_deg }
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
  ].join("|");
  return { key, payload };
}

export function peekLpbfBuildJobKey(): string {
  return buildJobKey().key;
}

export async function requestLpbfBuildJob(options?: { force?: boolean }): Promise<void> {
  const force = options?.force === true;
  const { key, payload } = buildJobKey();
  const st = useLpbfBuildJobStore.getState();

  if (!force && st.lastKey === key && st.job && !st.error) {
    return;
  }
  if (!force && inFlightKey === key && inFlightPromise) {
    return inFlightPromise;
  }

  const seq = st.seq + 1;
  useLpbfBuildJobStore.setState({ busy: true, seq, error: force ? null : st.error });

  const run = (async () => {
    try {
      const t0 = performance.now();
      const job = await pythonComputationService.solveLpbfBuildJob(payload);
      if (useLpbfBuildJobStore.getState().seq !== seq) return;
      useLpbfBuildJobStore.setState({
        job,
        error: null,
        busy: false,
        lastKey: key,
        roundTripMs: Math.round(performance.now() - t0),
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
  const aligned = lastKey === peekLpbfBuildJobKey();

  const lpbf = specimen.lpbf;

  useEffect(() => {
    const timer = setTimeout(() => {
      void requestLpbfBuildJob();
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
  ]);

  return {
    job: aligned ? job : null,
    error,
    busy,
    roundTripMs: aligned ? roundTripMs : null,
    rerun: () => requestLpbfBuildJob({ force: true }),
  };
}

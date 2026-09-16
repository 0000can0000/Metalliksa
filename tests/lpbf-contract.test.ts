import assert from "node:assert/strict";
import { parseSimulationJob } from "../src/services/lpbfSimulationService";

const base = { id: "a".repeat(32), status: "running", progress: .5, log: "test fixture", error: null };
assert.equal(parseSimulationJob(base).status, "running");
for (const bad of [{ ...base, progress: NaN }, { ...base, progress: 2 }, { ...base, id: "../case" }, { ...base, status: "completed" }]) {
  assert.throws(() => parseSimulationJob(bad));
}
const result = {
  requestedMode: "screening", effectiveMode: "screening", fallbackReason: null,
  schemaVersion: 1, validationStatus: "unvalidated", productionReady: false, confidence: "low",
  settings: {}, solver: { id: "synthetic-contract-test", version: "1" },
  material: { name: "fixture", quality: "synthetic", source: "Unit test; not experimental" },
  label: "Screening only", regime: "test", mainRisk: "test", recommendation: "test", riskScope: "test",
  metrics: { width_um: 100, depth_um: 50, length_um: 200 }, assumptions: ["Synthetic fixture"],
  analyticalComparison: { goldak: { width_um: 100, depth_um: 50, length_um: 200 } },
};
assert.equal(parseSimulationJob({ ...base, status: "completed", result }).result?.label, "Screening only");
for (const patch of [
  { validationStatus: "validated" }, { productionReady: true },
  { metrics: { width_um: -1, depth_um: 50, length_um: 200 } },
  { thermalHistory: [{ time_s: 0, peak_K: Infinity }] },
  { measurementComparison: { width_um: { errors_pct: "bad" } } },
  { energyBalance: { input_J: "bad" } },
  { massBalance: { initial_kg: -1, deposited_kg: 0, final_kg: 1, relativeError: 0, scope: "fixture" } },
  { phaseAudit: { liquidVolume_m3: 1, solidVolume_m3: 0, activeVolume_m3: 1, minFraction: 0, maxFraction: 1.1, scope: "fixture" } },
  { artifacts: [{ path: "../secret", size_bytes: 0, sha256: "a".repeat(64) }] },
  { fieldPreviews: ["https://untrusted.example/field.svg"] },
]) assert.throws(() => parseSimulationJob({ ...base, status: "completed", result: { ...result, ...patch } }));
assert.throws(() => parseSimulationJob({ ...base, status: "cancelled", result }));
assert.throws(() => parseSimulationJob({ ...base, status: "completed", result: {...result,effectiveMode:"standard"} }));
const thermal={...result,requestedMode:"standard",effectiveMode:"standard",energyBalance:{input_J:1,losses_J:.2,stored_J:.8,relativeError:0},massBalance:{initial_kg:1,deposited_kg:1,final_kg:2,relativeError:0,scope:"stationary"},phaseAudit:{liquidVolume_m3:1,solidVolume_m3:1,activeVolume_m3:2,minFraction:0,maxFraction:1,scope:"enthalpy"}};
assert.doesNotThrow(()=>parseSimulationJob({...base,status:"completed",result:thermal}));
assert.throws(()=>parseSimulationJob({...base,status:"completed",result:{...thermal,massBalance:{...thermal.massBalance,final_kg:3}}}));
assert.throws(()=>parseSimulationJob({...base,status:"completed",result:{...thermal,phaseAudit:{...thermal.phaseAudit,activeVolume_m3:3}}}));
console.log("PASS: LPBF runtime contract rejects invalid, nonfinite and false-validation responses");

// Synthetic transport fixtures; no experimental or numerical validation claim.
const completed = (patch: Record<string, unknown>) => ({ ...base, status: "completed", result: { ...result, ...patch } });
for (const effectiveMode of [undefined, null, "standrad", "high-fidelity", ["screening"]]) {
  assert.throws(() => parseSimulationJob(completed({ effectiveMode })), /execution mode/);
}
for (const requestedMode of [undefined, null, "unknown", ["screening"]]) {
  assert.throws(() => parseSimulationJob(completed({ requestedMode })), /execution mode/);
}
for (const fallbackReason of [undefined, null, "", "   "]) {
  assert.throws(() => parseSimulationJob(completed({ requestedMode: "high-fidelity", fallbackReason })), /fallback provenance/);
}
assert.doesNotThrow(() => parseSimulationJob(completed({ requestedMode: "high-fidelity", fallbackReason: "Free-surface solver unavailable" })));
assert.throws(() => parseSimulationJob(completed({ settings: { mode: "standard" } })), /execution mode/);
for (const mode of ["standard", "calibration"]) {
  assert.throws(() => parseSimulationJob(completed({ requestedMode: mode, effectiveMode: mode })), /conservation audit/);
  assert.doesNotThrow(() => parseSimulationJob({ ...base, status: "completed", result: { ...thermal, requestedMode: mode, effectiveMode: mode } }));
}
for (const times of [[1, 0], [0, 0]]) {
  assert.throws(() => parseSimulationJob(completed({ thermalHistory: times.map(time_s => ({ time_s, peak_K: 300 })) })), /thermal history/);
}
assert.doesNotThrow(() => parseSimulationJob(completed({ thermalHistory: [{ time_s: 0, peak_K: 300 }, { time_s: .01, peak_K: 1000 }] })));
const comparison = { count: 2, errors_pct: [-10, 10], rmse_um: 10, bias_um: -1, calibrationFactor: null, note: "Synthetic comparison" };
assert.doesNotThrow(() => parseSimulationJob(completed({ measurementComparison: { width_um: comparison } })));
assert.doesNotThrow(() => parseSimulationJob(completed({ measurementComparison: { width_um: { ...comparison, calibrationFactor: 1.1 } } })));
for (const patch of [{ count: 0 }, { count: -1 }, { count: 1.5 }, { count: 3 }, { rmse_um: -1 }, { calibrationFactor: 0 }, { calibrationFactor: -1 }]) {
  assert.throws(() => parseSimulationJob(completed({ measurementComparison: { width_um: { ...comparison, ...patch } } })), /measurement comparison/);
}

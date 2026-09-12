import assert from "node:assert/strict";
import { parseSimulationJob } from "../src/services/lpbfSimulationService";

const base = { id: "a".repeat(32), status: "running", progress: .5, log: "test fixture", error: null };
assert.equal(parseSimulationJob(base).status, "running");
for (const bad of [{ ...base, progress: NaN }, { ...base, progress: 2 }, { ...base, id: "../case" }, { ...base, status: "completed" }]) {
  assert.throws(() => parseSimulationJob(bad));
}
const result = {
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
]) assert.throws(() => parseSimulationJob({ ...base, status: "completed", result: { ...result, ...patch } }));
console.log("PASS: LPBF runtime contract rejects invalid, nonfinite and false-validation responses");

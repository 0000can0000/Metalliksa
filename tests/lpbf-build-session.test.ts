import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { pythonComputationService, type PythonLpbfBuildJobResult } from "../src/services/pythonComputationService";
import { peekLpbfBuildJobKey, requestLpbfBuildJob, setLpbfMurakamiInput, useLpbfBuildJobStore } from "../src/store/useLpbfBuildJobStore";
import { useMaterialSpecimenStore } from "../src/store/useMaterialSpecimenStore";
import { useLpbfBuildMeshStore } from "../src/store/useLpbfBuildMeshStore";

// Deliberately incomplete service fixtures exercise session routing, never physical truth.
const initialSpecimen = useMaterialSpecimenStore.getState().activeSpecimen;
const initialBuild = useLpbfBuildJobStore.getState();
const originalSolve = pythonComputationService.solveLpbfBuildJob;
let calls = 0;
const fixture = (extra: Partial<PythonLpbfBuildJobResult> = {}) => ({
  modelId: "synthetic-session-fixture", uq: null, ambench: null, ...extra,
}) as unknown as PythonLpbfBuildJobResult;

beforeEach(() => {
  useMaterialSpecimenStore.setState({ activeSpecimen: initialSpecimen });
  useMaterialSpecimenStore.getState().loadPreset("inconel-718");
  useLpbfBuildMeshStore.setState({ mesh: null });
  useLpbfBuildJobStore.setState(initialBuild);
  calls = 0;
  pythonComputationService.solveLpbfBuildJob = async () => { calls++; return fixture(); };
});
after(() => { pythonComputationService.solveLpbfBuildJob = originalSolve; });

test("identical fast requests reuse the result; changed CT threshold recomputes", async () => {
  setLpbfMurakamiInput({ ctDetectionThreshold_um: 10 });
  await requestLpbfBuildJob();
  await requestLpbfBuildJob();
  assert.equal(calls, 1);
  setLpbfMurakamiInput({ ctDetectionThreshold_um: 25 });
  await requestLpbfBuildJob();
  assert.equal(calls, 2);
});

test("defect records differing beyond their first 80 characters cannot collide", async () => {
  const prefix = "40 ".repeat(40);
  setLpbfMurakamiInput({ defectSqrtAreasPaste: `${prefix}50` });
  await requestLpbfBuildJob();
  const firstKey = peekLpbfBuildJobKey();
  setLpbfMurakamiInput({ defectSqrtAreasPaste: `${prefix}500` });
  assert.notEqual(peekLpbfBuildJobKey(), firstKey);
  await requestLpbfBuildJob();
  assert.equal(calls, 2);
});

test("different geometry with identical filename and triangle counts recomputes", async () => {
  const mesh = (size: number) => ({ name: "specimen.stl", nativeTriangleCount: 1, usedTriangleCount: 1, triangles: [[[0, 0, 0], [size, 0, 0], [0, size, 0]]] });
  useLpbfBuildMeshStore.setState({ mesh: mesh(1) });
  await requestLpbfBuildJob();
  useLpbfBuildMeshStore.setState({ mesh: mesh(10) });
  await requestLpbfBuildJob();
  assert.equal(calls, 2);
});

test("UQ sample count remains aligned and evidence is retained only for the same process", async () => {
  const uq = { enabled: true, nSamples: 24, source: "Synthetic session fixture" } as unknown as NonNullable<PythonLpbfBuildJobResult["uq"]>;
  const ambench = { source: { doi: "Synthetic session fixture; not experimental" } } as unknown as NonNullable<PythonLpbfBuildJobResult["ambench"]>;
  pythonComputationService.solveLpbfBuildJob = async payload => fixture({ uq: payload.enableUq ? uq : null, ambench: payload.includeAmbench ? ambench : null });
  await requestLpbfBuildJob({ enableUq: true, includeAmbench: true, uqSamples: 24 });
  assert.equal(useLpbfBuildJobStore.getState().lastKey, peekLpbfBuildJobKey());
  await requestLpbfBuildJob();
  assert.equal(useLpbfBuildJobStore.getState().job?.uq, uq);
  assert.equal(useLpbfBuildJobStore.getState().job?.ambench, ambench);
  const currentSpecimen = useMaterialSpecimenStore.getState().activeSpecimen;
  useMaterialSpecimenStore.setState({ activeSpecimen: { ...currentSpecimen, lpbf: { ...currentSpecimen.lpbf, laserPower_W: currentSpecimen.lpbf.laserPower_W + 25 } } });
  await requestLpbfBuildJob();
  assert.equal(useLpbfBuildJobStore.getState().job?.uq, null);
  assert.equal(useLpbfBuildJobStore.getState().job?.ambench, null);
  assert.equal(useLpbfBuildJobStore.getState().sessionUq, null);
  assert.equal(useLpbfBuildJobStore.getState().sessionAmbench, null);
});

test("a slower superseded job cannot overwrite a newer process result", async () => {
  let release: (result: PythonLpbfBuildJobResult) => void = () => {};
  const older = new Promise<PythonLpbfBuildJobResult>(resolve => { release = resolve; });
  const latest = fixture();
  pythonComputationService.solveLpbfBuildJob = async () => ++calls === 1 ? older : latest;
  const pending = requestLpbfBuildJob();
  setLpbfMurakamiInput({ ctDetectionThreshold_um: 99 });
  await requestLpbfBuildJob();
  const currentKey = useLpbfBuildJobStore.getState().lastKey;
  release(fixture({ engine: "older-synthetic-fixture" } as Partial<PythonLpbfBuildJobResult>));
  await pending;
  assert.equal(useLpbfBuildJobStore.getState().lastKey, currentKey);
  assert.notEqual(useLpbfBuildJobStore.getState().job?.engine, "older-synthetic-fixture");
});

test("unsupported alloy identity refuses computation and clears a previous supported result", async () => {
  await requestLpbfBuildJob();
  assert.equal(calls, 1);
  assert.ok(useLpbfBuildJobStore.getState().job);
  const supported = useMaterialSpecimenStore.getState().activeSpecimen;
  useMaterialSpecimenStore.setState({ activeSpecimen: { ...supported, id: "synthetic-unknown-alloy", name: "Unknown nickel alloy", baseMetal: "Ni" } });
  await requestLpbfBuildJob();
  assert.equal(calls, 1, "Unknown Ni alloy must not silently submit an IN718 surrogate");
  assert.equal(useLpbfBuildJobStore.getState().job, null);
  assert.equal(useLpbfBuildJobStore.getState().busy, false);
  assert.match(useLpbfBuildJobStore.getState().error!, /no supported material mapping.*no surrogate alloy was submitted/);
});

test("returning to a supported alloy cannot reuse a request superseded by an unsupported identity", async () => {
  const supported = useMaterialSpecimenStore.getState().activeSpecimen;
  let release: (result: PythonLpbfBuildJobResult) => void = () => {};
  const oldResponse = new Promise<PythonLpbfBuildJobResult>(resolve => {release=resolve;});
  pythonComputationService.solveLpbfBuildJob = async () => ++calls === 1 ? oldResponse : fixture({engine:"latest-fixture"});
  const older = requestLpbfBuildJob();
  useMaterialSpecimenStore.setState({activeSpecimen:{...supported,name:"Unknown nickel alloy"}});
  await requestLpbfBuildJob();
  useMaterialSpecimenStore.setState({activeSpecimen:supported});
  const resumed = requestLpbfBuildJob();
  release(fixture({engine:"superseded-fixture"}));
  await Promise.all([older,resumed]);
  assert.equal(calls,2);
  assert.equal(useLpbfBuildJobStore.getState().job?.engine,"latest-fixture");
  assert.equal(useLpbfBuildJobStore.getState().busy,false);
});

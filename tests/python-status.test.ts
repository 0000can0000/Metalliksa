import assert from "node:assert/strict";
import { test } from "node:test";
import { PythonReadiness, pythonStatusResponse } from "../server/pythonStatus.ts";

const signal = JSON.stringify({ status: "ready", pythonVersion: "3.12.10", warmModules: ["numpy", "numpy", "scipy"], unixSocketActive: false, httpActive: true });

test("readiness survives split stdout chunks and ignores informational output", () => {
  const state = new PythonReadiness();
  assert.equal(state.consume("Loading modules\n" + signal.slice(0, 30)), false);
  assert.equal(state.ready, false);
  assert.equal(state.consume(signal.slice(30) + "\r\n"), true);
  assert.equal(state.pythonVersion, "3.12.10");
  assert.deepEqual(state.warmModules, ["numpy", "scipy"]);
  assert.equal(state.ready, true);
  assert.equal(state.unixActive, false);
  assert.equal(state.httpActive, true);
});

test("worker exit clears version, imports, channels and partial messages", () => {
  const state = new PythonReadiness();
  state.consume(signal + "\npartial");
  state.reset();
  assert.equal(state.ready, false);
  assert.equal(state.pythonVersion, null);
  assert.deepEqual(state.warmModules, []);
  assert.equal(state.httpActive, false);
  assert.equal(state.consume(signal + "\n"), true);
});

test("ready text without a bound channel does not declare online or invent imports", () => {
  const state = new PythonReadiness();
  state.consume('{"status":"ready","modulesWarm":15}\n');
  assert.equal(state.ready, false);
  assert.equal(state.pythonVersion, null);
  assert.deepEqual(state.warmModules, []);
});

test("public status describes actual HTTP channel without solver availability claims", () => {
  const ipc = { status: "online", pythonVersion: "3.12.10", warmModulesCount: 2,
    channels: { unixSocket: { active: false }, httpMicroservice: { active: true } } };
  const response = pythonStatusResponse(ipc, "win32");
  assert.equal(response.channel, "http_microservice");
  assert.equal(response.pythonVersion, "3.12.10");
  assert.equal(response.warm, true);
  assert.equal("subsystems" in response, false);
  assert.equal(response.subsystemStatus, "unverified");
  const offline = pythonStatusResponse({ ...ipc, status: "restarting", pythonVersion: null, warmModulesCount: 0 }, "win32");
  assert.equal(offline.online, false);
  assert.equal(offline.warm, false);
  assert.equal(offline.channel, null);
  assert.equal(offline.pythonVersion, null);
});

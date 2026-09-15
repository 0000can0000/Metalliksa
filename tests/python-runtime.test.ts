import assert from "node:assert/strict";
import { test } from "node:test";
import dotenv from "dotenv";
import { createPythonRuntime, lpbfWorkerCommand, probePythonCommand, resolvePythonCommand,
  type PythonCommand, type PythonResolutionOptions } from "../server/pythonRuntime.ts";

function fixture(platform = "win32", env: Record<string, string | undefined> = {}) {
  const calls: PythonCommand[] = [];
  const files = new Set<string>();
  const working = new Set<string>();
  const options: PythonResolutionOptions = { platform, cwd: platform === "win32" ? "C:\\project space" : "/project space", env,
    exists: file => files.has(file), probe: command => { calls.push(command); return working.has(command.cmd); } };
  return { options, calls, files, working };
}

for (const [platform, executable] of [["win32", "C:\\GPU environment\\Scripts\\python.exe"], ["linux", "/gpu environment/bin/python"]]) {
  test(`${platform}: explicit executable with spaces remains one argument`, () => {
    const f = fixture(platform, { METALLIX_PYTHON: executable });
    f.working.add(executable);
    assert.deepEqual(resolvePythonCommand(f.options), { cmd: executable, prefix: [] });
    assert.equal(f.calls.length, 1);
  });
  test(`${platform}: invalid explicit selection never falls back`, () => {
    const f = fixture(platform, { METALLIX_PYTHON: executable });
    f.working.add("python3");
    assert.throws(() => resolvePythonCommand(f.options), /METALLIX_PYTHON.*no fallback/);
    assert.equal(f.calls.length, 1);
  });
}

for (const [platform, project, active] of [
  ["win32", "C:\\project space\\.venv\\Scripts\\python.exe", "C:\\active space\\Scripts\\python.exe"],
  ["linux", "/project space/.venv/bin/python", "/active space/bin/python"],
]) {
  test(`${platform}: project venv precedes active venv, then system`, () => {
    const f = fixture(platform, { VIRTUAL_ENV: platform === "win32" ? "C:\\active space" : "/active space" });
    f.files.add(project); f.files.add(active);
    f.working.add(project); f.working.add(active);
    assert.equal(resolvePythonCommand(f.options).cmd, project);
    f.working.delete(project);
    assert.equal(resolvePythonCommand(f.options).cmd, active);
    f.working.delete(active); f.working.add("python");
    assert.equal(resolvePythonCommand(f.options).cmd, "python");
  });
}

test("missing venvs are skipped; Windows launcher keeps -3 prefix", () => {
  const f = fixture(); f.working.add("py");
  assert.deepEqual(resolvePythonCommand(f.options), { cmd: "py", prefix: ["-3"] });
  assert.equal(f.calls.length, 1);
});

test("Unix system preference and complete failure", () => {
  const f = fixture("linux"); f.working.add("python3"); f.working.add("python");
  assert.equal(resolvePythonCommand(f.options).cmd, "python3");
  f.working.clear();
  assert.throws(() => resolvePythonCommand(f.options), /No working host Python/);
});

test("runtime is lazy, loads environment before selection and caches successful result", () => {
  const f = fixture(); f.working.add("configured after dotenv");
  let loads = 0;
  const runtime = createPythonRuntime(f.options, () => {
    loads++; f.options.env.METALLIX_PYTHON = "configured after dotenv";
  });
  assert.equal(loads, 0); assert.equal(f.calls.length, 0);
  assert.equal(runtime().cmd, "configured after dotenv");
  runtime().prefix.push("unwanted");
  assert.deepEqual(runtime().prefix, []);
  assert.equal(loads, 1); assert.equal(f.calls.length, 1);
});

test("WSL remains first and never resolves host Python", () => {
  const command = lpbfWorkerCommand({ platform: "win32", file: "C:\\project space\\python\\lpbf_worker.py",
    localFallback: false, env: { METALLIKSA_WSL_DISTRO: "Research Linux" },
    hostPython: () => { throw new Error("must not probe host"); } });
  assert.deepEqual(command, { cmd: "wsl.exe", args: ["-d", "Research Linux", "--", "python3", "-u", "/mnt/c/project space/python/lpbf_worker.py"] });
});

test("preexisting process override wins over dotenv values", () => {
  const f = fixture("win32", { METALLIX_PYTHON: "shell python" });
  f.working.add("shell python");
  const runtime = createPythonRuntime(f.options, () => {
    dotenv.populate(f.options.env as Record<string, string>, { METALLIX_PYTHON: "file python" }, { override: false });
  });
  assert.equal(runtime().cmd, "shell python");
});

test("LPBF Windows host fallback and Unix host use exact shared command", () => {
  for (const platform of ["win32", "linux"]) {
    for (const python of [{ cmd: "C:/GPU environment/python.exe", prefix: [] }, { cmd: "py", prefix: ["-3"] }]) {
      assert.deepEqual(lpbfWorkerCommand({ platform, file: "/project space/python/lpbf_worker.py",
        localFallback: true, env: {}, hostPython: () => python }),
      { cmd: python.cmd, args: [...python.prefix, "-u", "/project space/python/lpbf_worker.py"] });
    }
  }
});

test("LPBF propagates invalid host configuration", () => {
  assert.throws(() => lpbfWorkerCommand({ platform: "win32", file: "C:/worker.py", localFallback: true,
    env: {}, hostPython: () => { throw new Error("METALLIX_PYTHON invalid"); } }), /METALLIX_PYTHON invalid/);
});

test("version probe is bounded, hidden, shell-free, and requires Python 3", () => {
  const run = ((cmd, args, options) => {
    assert.equal(cmd, "C:/path with spaces/python.exe");
    assert.deepEqual(args, ["--version"]);
    assert.equal(options.timeout, 5000);
    assert.equal(options.windowsHide, true); assert.equal(options.shell, false);
    return { status: 0, stdout: "Python 3.12.10\n", stderr: "" };
  }) as Parameters<typeof probePythonCommand>[1];
  const command = { cmd: "C:/path with spaces/python.exe", prefix: [] };
  assert.equal(probePythonCommand(command, run), true);
  for (const result of [{ status: 0, stdout: "Python 2.7.18" }, { status: 0, stdout: "v24.0.0" },
    { status: null, error: new Error("ETIMEDOUT") }, { status: 1, stdout: "Python 3.12" }]) {
    assert.equal(probePythonCommand(command, (() => result) as Parameters<typeof probePythonCommand>[1]), false);
  }
});

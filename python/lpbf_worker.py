"""Persistent JSON-lines RPC worker, SQLite queue and isolated cancellable job processes.

Normally launched inside WSL by the Node bridge. No browser-supplied shell commands.
"""
import hashlib
import base64
import json
import os
from pathlib import Path
import signal
import sqlite3
import subprocess
import sys
import threading
import time
import uuid
from contextlib import contextmanager
from lpbf_material_registry import catalog
from lpbf_simulation import run, validate, fingerprint
from lpbf_openfoam import BINARY
from lpbf_evidence import resource_estimate

ROOT = Path(os.environ.get("METALLIKSA_JOB_ROOT", str(Path(__file__).resolve().parents[1]/".lpbf-jobs")))


def capabilities():
    foam = Path("/opt/openfoam14/etc/bashrc")
    version = None
    if foam.exists():
        try:
            r = subprocess.run(["bash", "-lc", "source /opt/openfoam14/etc/bashrc; foamVersion"], capture_output=True, text=True, timeout=10)
            if r.returncode == 0 and "OpenFOAM-14" in r.stdout+r.stderr:
                version = "OpenFOAM-14"
        except (OSError, subprocess.TimeoutExpired):
            pass
    return dict(openfoamVersion=version, openfoamThermal=bool(version and BINARY.is_file()),
                binaryHash=hashlib.sha256(BINARY.read_bytes()).hexdigest() if BINARY.is_file() else None,
                freeSurfaceSolver=False, platform=sys.platform,
                thermalSolver=True, materials=catalog(),
                limitation="No qualified LPBF free-surface CFD solver. High-Fidelity requests return explicitly labelled analytical screening.")


class Queue:
    def __init__(self, root=ROOT, start=True):
        self.root = Path(root); self.root.mkdir(parents=True, exist_ok=True)
        self.db = self.root/"queue.sqlite"
        self.caps = capabilities()
        self.lock = threading.RLock()
        self.closed = threading.Event()
        self.thread = None
        with self.connect() as c:
            c.execute("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, cache_key TEXT, status TEXT, progress REAL, log TEXT, error TEXT, created REAL)")
            c.execute("UPDATE jobs SET status='failed',error='Worker restarted during execution' WHERE status='running'")
        if start:
            self.thread = threading.Thread(target=self.work, daemon=True)
            self.thread.start()

    def close(self):
        self.closed.set()
        if self.thread:
            self.thread.join(timeout=6)

    @contextmanager
    def connect(self):
        c = sqlite3.connect(self.db, timeout=10)
        c.row_factory = sqlite3.Row
        try:
            with c:
                yield c
        finally:
            c.close()

    def update(self, job, **values):
        with self.connect() as c:
            c.execute("UPDATE jobs SET "+",".join(k+"=?" for k in values)+" WHERE id=?", [*values.values(), job])

    def get(self, job):
        if not isinstance(job, str) or len(job) != 32 or any(ch not in "0123456789abcdef" for ch in job):
            raise ValueError("Invalid job id")
        with self.connect() as c:
            row = c.execute("SELECT * FROM jobs WHERE id=?", (job,)).fetchone()
        if row is None:
            raise ValueError("Job not found")
        out = dict(row)
        settings = json.loads((self.root/job/"input.json").read_text())
        out["requestSummary"] = {k:settings[k] for k in ("mode","backend","material")}
        if out["status"] == "completed":
            out["result"] = json.loads((self.root/job/"result.json").read_text())
        return out

    def artifact(self, payload):
        state = self.get(payload["id"])
        name = payload.get("name")
        if state["status"] != "completed" or name not in ("temperature-slice.svg", "phase-slice.svg", "thermal-history.csv"):
            raise ValueError("Artifact unavailable")
        entry = next((a for a in state["result"].get("artifacts",[]) if a["path"] == name),None)
        if not entry or entry["size_bytes"] > 8_000_000: raise ValueError("Artifact unavailable or too large")
        content = (self.root/payload["id"]/name).read_bytes()
        if hashlib.sha256(content).hexdigest() != entry["sha256"]: raise ValueError("Artifact integrity failed")
        return dict(content=base64.b64encode(content).decode(),type="image/svg+xml" if name.endswith(".svg") else "text/csv")

    def submit(self, raw):
        p, m = validate(raw)
        key = hashlib.sha256((fingerprint(p, m)+json.dumps(self.caps, sort_keys=True)).encode()).hexdigest()
        with self.lock, self.connect() as c:
            row = c.execute("SELECT id FROM jobs WHERE cache_key=? AND status IN ('queued','running','completed') ORDER BY created DESC LIMIT 1", (key,)).fetchone()
            if row:
                try:
                    cached = self.get(row["id"])
                    if cached["status"] == "completed":
                        for artifact in cached["result"].get("artifacts", []):
                            path = self.root/row["id"]/artifact["path"]
                            if not path.is_file() or path.stat().st_size != artifact["size_bytes"]:
                                raise ValueError("Cached artifact missing or size changed")
                            digest = hashlib.sha256()
                            with path.open("rb") as stream:
                                for chunk in iter(lambda: stream.read(1024*1024), b""): digest.update(chunk)
                            if digest.hexdigest() != artifact["sha256"]:
                                raise ValueError("Cached artifact checksum mismatch")
                    return {**cached, "cacheHit": cached["status"] == "completed",
                            "deduplicated": cached["status"] != "completed"}
                except (OSError, ValueError, KeyError):
                    c.execute("UPDATE jobs SET status='failed',error='Cached result/artifacts unavailable or corrupt' WHERE id=?", (row["id"],))
            if c.execute("SELECT count(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0] >= 16:
                raise ValueError("Queue full (16 jobs)")
            job = uuid.uuid4().hex
            folder = self.root/job; folder.mkdir()
            (folder/"input.json").write_text(json.dumps(p, allow_nan=False))
            (folder/"capabilities.json").write_text(json.dumps(self.caps))
            c.execute("INSERT INTO jobs VALUES (?,?,?,?,?,?,?)", (job, key, "queued", 0., "", None, time.time()))
        return {**self.get(job), "cacheHit": False}

    def cancel(self, job):
        with self.lock:
            state = self.get(job)
            if state["status"] in ("queued", "running"):
                self.update(job, status="cancelled", error="Cancelled by user")
        return self.get(job)

    def work(self):
        while not self.closed.is_set():
            row = None
            try:
                with self.lock, self.connect() as c:
                    row = c.execute("SELECT id FROM jobs WHERE status='queued' ORDER BY created LIMIT 1").fetchone()
                    if row:
                        c.execute("UPDATE jobs SET status='running' WHERE id=?", (row["id"],))
                if not row:
                    time.sleep(.1); continue
                self.execute(row["id"])
            except Exception as e:
                if row:
                    self.update(row["id"], status="failed", error=str(e))
                time.sleep(.1)

    def execute(self, job):
        folder = self.root/job
        params = json.loads((folder/"input.json").read_text())
        with (folder/"progress.log").open("w") as log:
            child = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "--execute", str(folder)],
                                     stdout=log, stderr=log, start_new_session=(os.name != "nt"))
            started = time.monotonic()
            try:
                while child.poll() is None:
                    state = self.get(job)["status"]
                    timed_out = time.monotonic()-started > params["timeout_s"]
                    if state == "cancelled" or timed_out or self.closed.is_set():
                        if os.name == "nt":
                            child.kill()
                        else:
                            os.killpg(child.pid, signal.SIGKILL)
                        child.wait(timeout=5)
                        if state == "cancelled":
                            pass
                        elif timed_out:
                            self.update(job, status="timed_out", error="Simulation timeout")
                        elif self.closed.is_set():
                            self.update(job, status="failed", error="Worker stopped during execution")
                        return
                    text = (folder/"progress.log").read_text(errors="replace")[-16000:]
                    progress = 0.
                    for line in text.splitlines():
                        try:
                            event = json.loads(line)
                            progress = max(progress, min(.99, event.get("progress", 0.)))
                        except (ValueError, AttributeError, TypeError):
                            pass
                    self.update(job, progress=progress, log=text)
                    time.sleep(.15)
                with self.lock:
                    if self.get(job)["status"] == "cancelled":
                        return
                    final_log = (folder/"progress.log").read_text(errors="replace")[-16000:]
                    if child.returncode == 0 and (folder/"result.json").exists():
                        self.update(job, status="completed", progress=1., log=final_log)
                    else:
                        self.update(job, status="failed", error=final_log[-4000:] or f"Solver exit {child.returncode}", log=final_log)
            finally:
                if child.poll() is None:
                    if os.name == "nt": child.kill()
                    else: os.killpg(child.pid, signal.SIGKILL)
                    child.wait()


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--execute":
        folder = Path(sys.argv[2])
        if os.name != "nt":
            parent_pid = os.getppid()
            def monitor_parent():
                while True:
                    time.sleep(.5)
                    if os.getppid() != parent_pid:
                        os.killpg(os.getpgrp(), signal.SIGKILL)
            threading.Thread(target=monitor_parent, daemon=True).start()
        def report(progress, message):
            print(json.dumps(dict(progress=progress, message=message)), flush=True)
        try:
            result = run(json.loads((folder/"input.json").read_text()), report, folder,
                         json.loads((folder/"capabilities.json").read_text()))
            (folder/"result.tmp").write_text(json.dumps(result, allow_nan=False))
            (folder/"result.tmp").replace(folder/"result.json")
        except Exception as e:
            print(str(e), flush=True); sys.exit(1)
        return
    ROOT.mkdir(parents=True, exist_ok=True)
    # OS-held lock prevents a second worker from invalidating live running jobs.
    instance_lock = (ROOT/"worker.lock").open("a+b")
    try:
        if os.name == "nt":
            import msvcrt
            instance_lock.seek(0); instance_lock.write(b"0"); instance_lock.flush(); instance_lock.seek(0)
            msvcrt.locking(instance_lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(instance_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("Another LPBF worker owns this job root", file=sys.stderr); sys.exit(2)
    queue = Queue()
    for line in sys.stdin:
        request = {}
        try:
            if len(line) > 1000000: raise ValueError("RPC payload too large")
            request = json.loads(line)
            method = request["method"]
            if method == "capabilities": data = queue.caps
            elif method == "estimate":
                p, m = validate(request["payload"])
                data = resource_estimate(p,m)
            elif method == "submit": data = queue.submit(request["payload"])
            elif method == "artifact": data = queue.artifact(request["payload"])
            elif method == "get": data = queue.get(request["payload"])
            elif method == "cancel": data = queue.cancel(request["payload"])
            else: raise ValueError("Unknown method")
            response = dict(id=request["id"], data=data)
        except Exception as e:
            response = dict(id=request.get("id"), error=str(e))
        print(json.dumps(response, allow_nan=False), flush=True)
    queue.close()


if __name__ == "__main__":
    main()

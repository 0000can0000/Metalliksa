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
from four_alloy_materials import resolve_alloy_id, thermal_props, THERMAL_NAME
from lpbf_simulation import run, validate, fingerprint
from lpbf_openfoam import BINARY
from lpbf_evidence import resource_estimate, enforce_thermal_balances
from lpbf_run_capture import capture_run
from lpbf_solidification_microstructure import compute_solidification_microstructure  # Phase 8
from lpbf_adaptive_feedforward import AdaptiveFeedforwardMitigator
from lpbf_experimental_validation import validate_experiment
from lpbf_fatigue_fracture import MurakamiFatigueEngine
from lpbf_multilaser_plume import ShieldGasFlow, PlumeParameters, MultiLaserPlumeEngine
from lpbf_optical_tomography import OpticalTomographySimulator
from lpbf_powder_dem_compaction import PowderCompactionEngine
from lpbf_support_optimization import SupportStructureOptimizer
from lpbf_thermal_accumulation import AlloyThermalProperties, HatchProcessConfig, MultiTrackThermalEngine
from lpbf_thermomechanical import analyze_distortion
from lpbf_toolpath_kinematics import LPBFToolpathParser, GalvanometerKinematicsEngine, ScannerProfile
from lpbf_transient_enthalpy_fdm import TransientEnthalpyFDMSolver
from stl_voxelizer import STLVoxelizer

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
                freeSurfaceSolver=bool(version and (Path(__file__).parent/"openfoam/bin/metalliksaMeltPoolFoam").is_file()), platform=sys.platform,
                thermalSolver=True, materials=catalog(),
                cudaThermalPilot=dict(selection="jobType=gpu-thermal-pilot; backend=cuda:N",
                    availability="checked-on-submit", cpuAlternative="backend=reference",
                    evidenceScope="same-model numerical parity only"),
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

    def finish_running(self, job, **values):
        # Atomic terminal transition: a cancellation winning the race stays cancelled.
        with self.lock, self.connect() as c:
            c.execute("UPDATE jobs SET "+",".join(k+"=?" for k in values)+" WHERE id=? AND status='running'",
                      [*values.values(), job])

    def get(self, job):
        if not isinstance(job, str) or len(job) != 32 or any(ch not in "0123456789abcdef" for ch in job):
            raise ValueError("Invalid job id")
        with self.connect() as c:
            row = c.execute("SELECT * FROM jobs WHERE id=?", (job,)).fetchone()
        if row is None:
            raise ValueError("Job not found")
        out = dict(row)
        settings = json.loads((self.root/job/"input.json").read_text())
        out["requestSummary"] = {k:settings.get(k) for k in ("jobType","mode","backend","material")}
        if out["status"] == "completed":
            try:
                out["result"] = json.loads((self.root/job/"result.json").read_text())
                if settings.get("jobType") == "gpu-thermal-pilot":
                    from lpbf_gpu_thermal import enforce_gpu_pilot_result
                    enforce_gpu_pilot_result(out["result"])
                else:
                    enforce_thermal_balances(out["result"])
            except (OSError, ValueError) as error:
                out.pop("result", None)
                out.update(status="failed", error=f"Saved result integrity failed: {error}")
                self.update(job, status=out["status"], error=out["error"])
        return out

    def capture(self, job):
        with self.lock:
            state = self.get(job)
            if state['status'] != 'completed':
                raise ValueError('Only completed jobs can be captured')
            if state['result'].get('jobType') == 'gpu-thermal-pilot':
                raise ValueError('CUDA pilot archive unavailable until the run-document contract supports its distinct backend')
            return capture_run(self.root/job, job)

    def archive_capture(self, job):
        # Internal RPC only: Node maps this root; HTTP never supplies a path.
        return dict(capture=self.capture(job), root=str(self.root.absolute()), platform=sys.platform)

    def artifact(self, payload):
        state = self.get(payload["id"])
        name = payload.get("name")
        import re
        allowed = isinstance(name, str) and (name in ("temperature-slice.svg", "phase-slice.svg", "thermal-history.csv", "field-series.json", "field-coordinates.bin") or re.fullmatch(r"field-frame-[0-9]{3}\.bin", name))
        if state["status"] != "completed" or not allowed:
            raise ValueError("Artifact unavailable")
        entry = next((a for a in state["result"].get("artifacts",[]) if a["path"] == name),None)
        if not entry or entry["size_bytes"] > 8_000_000: raise ValueError("Artifact unavailable or too large")
        path = self.root/payload["id"]/name
        if path.stat().st_size != entry["size_bytes"]: raise ValueError("Artifact size mismatch")
        content = path.read_bytes()
        if len(content) != entry["size_bytes"] or hashlib.sha256(content).hexdigest() != entry["sha256"]: raise ValueError("Artifact integrity failed")
        return dict(content=base64.b64encode(content).decode(),type="image/svg+xml" if name.endswith(".svg") else "application/octet-stream" if name.endswith(".bin") else "application/json" if name.endswith(".json") else "text/csv")

    def submit(self, raw):
        job_type = raw.get("jobType")
        if job_type == "build-job":
            p, m = raw, raw
        elif job_type == "gpu-thermal-pilot":
            from lpbf_gpu_thermal import validate_pilot_request
            p, m = validate_pilot_request(raw)
        else:
            p, m = validate(raw)
        # A rebuilt binary must invalidate a long-lived worker's cache identity.
        self.caps["binaryHash"] = hashlib.sha256(BINARY.read_bytes()).hexdigest() if BINARY.is_file() else None
        self.caps["openfoamThermal"] = bool(self.caps["openfoamVersion"] and self.caps["binaryHash"])
        key = hashlib.sha256((fingerprint(p, m)+json.dumps(self.caps, sort_keys=True)).encode()).hexdigest()
        with self.lock, self.connect() as c:
            row = c.execute("SELECT id FROM jobs WHERE cache_key=? AND status IN ('queued','running','completed') ORDER BY created DESC LIMIT 1", (key,)).fetchone()
            if row:
                try:
                    cached = self.get(row["id"])
                    if cached["status"] not in ("queued", "running", "completed"):
                        raise ValueError("Cached result no longer usable")
                    if cached["status"] == "completed":
                        for artifact in cached["result"].get("artifacts", []):
                            folder = (self.root/row["id"]).resolve()
                            path = (folder/artifact["path"]).resolve()
                            if folder not in path.parents:
                                raise ValueError("Cached artifact escapes job directory")
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
                    self.finish_running(row["id"], status="failed", error=str(e))
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
                            self.finish_running(job, status="timed_out", error="Simulation timeout")
                        elif self.closed.is_set():
                            self.finish_running(job, status="failed", error="Worker stopped during execution")
                        return
                    text = (folder/"progress.log").read_text(errors="replace")[-16000:]
                    progress = self.get(job)["progress"]
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
                    if time.monotonic()-started > params["timeout_s"] or self.closed.is_set():
                        self.finish_running(job, status="timed_out" if not self.closed.is_set() else "failed",
                                            error="Simulation timeout" if not self.closed.is_set() else "Worker stopped during execution", log=final_log)
                        return
                    if child.returncode == 0 and (folder/"result.json").exists():
                        result = json.loads((folder/"result.json").read_text())
                        if params.get("jobType") == "gpu-thermal-pilot":
                            from lpbf_gpu_thermal import enforce_gpu_pilot_result
                            enforce_gpu_pilot_result(result)
                        else:
                            enforce_thermal_balances(result)
                        self.finish_running(job, status="completed", progress=1., log=final_log)
                    else:
                        self.finish_running(job, status="failed", error=final_log[-4000:] or f"Solver exit {child.returncode}", log=final_log)
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
            execution_start = time.monotonic()
            input_data = json.loads((folder/"input.json").read_text())
            job_type = input_data.get("jobType")

            if job_type == "gpu-thermal-pilot":
                from lpbf_gpu_thermal import run_queued_pilot
                result = run_queued_pilot(input_data)
            elif job_type == "build-job":
                from lpbf_build_job_solver import solve_lpbf_build_job
                result = solve_lpbf_build_job(input_data)
                if "provenance" not in result:
                    result["provenance"] = {}
                result["settings"] = input_data
                result["material"] = {
                    "id": result.get("alloyId"),
                    "propertySha256": result.get("materialPropertySha256"),
                }
                from lpbf_evidence import write_artifacts
                write_artifacts(result, folder)
            else:
                result = run(input_data, report, folder,
                             json.loads((folder/"capabilities.json").read_text()))

            result["provenance"]["runtime_s"] = time.monotonic()-execution_start
            import platform
            import numpy
            result["provenance"]["executionRuntime"] = dict(
                executable=sys.executable, python=platform.python_version(),
                platform=platform.platform(), numpy=numpy.__version__)
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
            elif method == "capture": data = queue.capture(request["payload"])
            elif method == "archive-capture": data = queue.archive_capture(request["payload"])
            elif method == "get": data = queue.get(request["payload"])
            elif method == "cancel": data = queue.cancel(request["payload"])
            elif method == "solidification-microstructure":   # Phase 8
                payload = request["payload"]
                p = payload.get("params", {})
                m = payload.get("material", {})
                cfd = payload.get("cfdResult", None)
                data = compute_solidification_microstructure(p, m, cfd)
            elif method == "thermomechanical-distortion":     # Phase 9
                payload = request["payload"]
                p = payload.get("params", {})
                m = payload.get("material", {})
                from lpbf_thermomechanical import analyze_distortion
                data = analyze_distortion(p, m)
            elif method == "industrial-fatigue":              # Phase 10 (New)
                payload = request["payload"]
                from phase10_industrial import run_industrial_fatigue_analysis
                alloy = payload.get("alloy", "IN718")
                power = float(payload.get("power_W", 300))
                speed = float(payload.get("speed_mms", 1000))
                layer = float(payload.get("layer_um", 30.0))
                hatch = float(payload.get("hatch_um", 100.0))
                data = run_industrial_fatigue_analysis(alloy, power, speed, layer, hatch)
            elif method == "experimental-validation":         # Phase 10
                payload = request["payload"]
                p = payload.get("params", {})
                m = payload.get("material", {})
                sim = payload.get("simulationResult", {})
                exp = payload.get("experimentalData", {})
                data = validate_experiment(p, m, sim, exp)
            elif method == "modulus-fno":                     # Phase 11
                from lpbf_modulus_fno import predict_part_scale_thermal_history
                payload = request["payload"]
                power_W = payload.get("laserPower_W", 250.0)
                speed_mms = payload.get("scanSpeed_mms", 1000.0)
                preheat_C = payload.get("preheatTemp_C", 25.0)
                hatch_um = payload.get("hatch_um", 100.0)
                layer_um = payload.get("layer_um", 40.0)
                data = predict_part_scale_thermal_history(
                    power_W=power_W, speed_mms=speed_mms, preheat_C=preheat_C, hatch_um=hatch_um, layer_um=layer_um
                )
            elif method == "toolpath-kinematics":             # Phase 12
                payload = request["payload"]
                raw_text = payload.get("content", "")
                fmt = payload.get("format", "gcode").lower()
                power = payload.get("defaultPower_W", 250.0)
                speed = payload.get("defaultSpeed_mms", 1000.0)
                skywriting = payload.get("skywritingEnabled", False)

                if fmt == "cli":
                    vectors = LPBFToolpathParser.parse_cli(raw_text, default_power_W=power, default_speed_mms=speed)
                else:
                    vectors = LPBFToolpathParser.parse_gcode(raw_text, default_power_W=power, default_speed_mms=speed)

                prof = ScannerProfile(
                    accel_max_mms2=payload.get("accelMax_mms2", 40000.0),
                    jump_speed_mms=payload.get("jumpSpeed_mms", 3000.0),
                    laser_on_delay_us=payload.get("laserOnDelay_us", 100.0),
                    laser_off_delay_us=payload.get("laserOffDelay_us", 120.0),
                    mark_delay_us=payload.get("markDelay_us", 200.0),
                    jump_delay_us=payload.get("jumpDelay_us", 350.0),
                    skywriting_enabled=skywriting
                )
                engine = GalvanometerKinematicsEngine(prof)
                data = engine.simulate_toolpath(vectors)
            elif method == "fatigue-fracture":                # Phase 13
                payload = request["payload"]
                alloy = payload.get("alloyName", "Ti-6Al-4V")
                engine = MurakamiFatigueEngine(alloy)
                sqrt_area = float(payload.get("sqrtArea_um", 45.0))
                location = payload.get("location", "internal")
                r_ratio = float(payload.get("stressRatio_R", -1.0))
                calc_type = payload.get("type", "full")

                fatigue_res = engine.calculate_fatigue_limit(sqrt_area, location, r_ratio)
                kt_curve = engine.generate_kitagawa_takahashi_curve(location, r_ratio, n_points=30)
                paris_res = engine.simulate_paris_crack_growth(
                    initial_defect_sqrt_area_um=sqrt_area,
                    cyclic_stress_amplitude_MPa=float(payload.get("stressAmplitude_MPa", 220.0)),
                    stress_ratio_R=r_ratio
                )
                data = {
                    "fatigue_limit": fatigue_res,
                    "kitagawa_takahashi_curve": kt_curve,
                    "paris_crack_growth": paris_res
                }
            elif method == "toolpath-thermal-map":            # Option 1 Toolpath 3D Viz
                payload = request["payload"]
                from lpbf_toolpath_thermal_api import generate_toolpath_thermal_map
                alloy = payload.get("alloy", "IN718")
                power = float(payload.get("power_W", 250))
                speed = float(payload.get("speed_mms", 1000))
                strategy = payload.get("strategy", "chessboard")
                hatch = float(payload.get("hatch_um", 100))
                angle = float(payload.get("angle_deg", 45))
                island = float(payload.get("island_size_mm", 5.0))
                data = generate_toolpath_thermal_map(alloy, power, speed, strategy, hatch, angle, island)

            elif method == "stl-voxelize":                    # Phase 14
                payload = request["payload"]
                stl_text = payload.get("stlContent", "")
                resolution = int(payload.get("resolution", 32))
                defects = payload.get("defects", [])

                if stl_text.strip().startswith("solid"):
                    triangles = STLVoxelizer.parse_ascii_stl(stl_text)
                else:
                    try:
                        raw_bytes = base64.b64decode(stl_text)
                        triangles = STLVoxelizer.parse_binary_stl(raw_bytes)
                    except Exception:
                        triangles = STLVoxelizer.parse_ascii_stl(stl_text)

                data = STLVoxelizer.voxelize(triangles, resolution=resolution, detected_defects=defects)
            elif method == "adaptive-feedforward":            # Phase 15
                payload = request["payload"]
                raw_text = payload.get("content", "")
                fmt = payload.get("format", "gcode").lower()
                power = float(payload.get("defaultPower_W", 280.0))
                speed = float(payload.get("defaultSpeed_mms", 1000.0))
                apply_rot = bool(payload.get("apply67DegRotation", False))
                layer_idx = int(payload.get("layerIndex", 1))

                if fmt == "cli":
                    vectors = LPBFToolpathParser.parse_cli(raw_text, default_power_W=power, default_speed_mms=speed)
                else:
                    vectors = LPBFToolpathParser.parse_gcode(raw_text, default_power_W=power, default_speed_mms=speed)

                prof = ScannerProfile(
                    accel_max_mms2=float(payload.get("accelMax_mms2", 40000.0)),
                    jump_speed_mms=float(payload.get("jumpSpeed_mms", 3000.0))
                )
                mitigator = AdaptiveFeedforwardMitigator(prof)
                data = mitigator.process_toolpath(vectors, apply_67_deg_rotation=apply_rot, layer_index=layer_idx)
            elif method == "multilaser-plume":               # Phase 16
                payload = request["payload"]
                gas_cfg = payload.get("gasFlow", {})
                flow = ShieldGasFlow(
                    gas_type=gas_cfg.get("gasType", "Argon"),
                    velocity_m_s=float(gas_cfg.get("velocity_m_s", 2.0)),
                    angle_deg=float(gas_cfg.get("angle_deg", 0.0))
                )
                plume_cfg = payload.get("plumeParams", {})
                plume_params = PlumeParameters(
                    sigma_plume_mm=float(plume_cfg.get("sigma_plume_mm", 2.5)),
                    decay_length_mm=float(plume_cfg.get("decay_length_mm", 25.0)),
                    base_extinction_coeff=float(plume_cfg.get("base_extinction_coeff", 0.35)),
                    min_collision_dist_mm=float(plume_cfg.get("min_collision_dist_mm", 1.0)),
                    attenuation_hazard_threshold=float(plume_cfg.get("attenuation_hazard_threshold", 0.10))
                )
                engine = MultiLaserPlumeEngine(flow, plume_params)
                l1_vecs = [tuple(v) for v in payload.get("laser1_vectors", [])]
                l2_vecs = [tuple(v) for v in payload.get("laser2_vectors", [])]
                if not l1_vecs:
                    l1_vecs = [(0.0, 0.0, 40.0, 0.0, 300.0, 1000.0)]
                if not l2_vecs:
                    l2_vecs = [(10.0, 1.0, 50.0, 1.0, 300.0, 1000.0)]

                mode = payload.get("mode", "simulate")
                if mode == "optimize":
                    data = engine.optimize_deconfliction_schedule(l1_vecs, l2_vecs)
                else:
                    data = engine.simulate_multitrack_scenarios(l1_vecs, l2_vecs)
            elif method == "thermal-accumulation":           # Phase 17
                payload = request["payload"]
                mat_cfg = payload.get("material", {})
                alloy_name = mat_cfg.get("name")
                alloy_id = resolve_alloy_id(alloy_name)
                if alloy_id is None:
                    raise ValueError("Unknown or missing alloy for thermal accumulation")
                # Shared screening constants; this model uses IR absorptivity.
                props = thermal_props(alloy_id)
                mat = AlloyThermalProperties(
                    name=THERMAL_NAME[alloy_id],
                    density_kg_m3=props["density_kg_m3"],
                    specific_heat_J_kgK=props["specific_heat_J_kgK"],
                    thermal_conductivity_W_mK=props["thermal_conductivity_W_mK"],
                    absorptivity=props["absorptivity_IR"],
                    melting_temp_K=props["liquidus_C"] + 273.15,
                    boiling_temp_K=props["boiling_C"] + 273.15
                )
                hatch_cfg = payload.get("config", {})
                cfg = HatchProcessConfig(
                    laser_power_W=float(hatch_cfg.get("laserPower_W", 280.0)),
                    scan_velocity_mm_s=float(hatch_cfg.get("scanVelocity_mms", 1000.0)),
                    beam_diameter_um=float(hatch_cfg.get("beamDiameter_um", 80.0)),
                    hatch_spacing_um=float(hatch_cfg.get("hatchSpacing_um", 100.0)),
                    track_length_mm=float(hatch_cfg.get("trackLength_mm", 10.0)),
                    num_tracks=int(hatch_cfg.get("numTracks", 10)),
                    bed_temperature_K=float(hatch_cfg.get("bedTemperature_K", 353.15)),
                    turnaround_delay_ms=float(hatch_cfg.get("turnaroundDelay_ms", 0.5))
                )
                engine = MultiTrackThermalEngine(mat)
                mode = payload.get("mode", "simulate")
                if mode == "optimize":
                    allowable_drift = float(payload.get("maxAllowableDrift_K", 120.0))
                    data = engine.optimize_dwell_delays(cfg, max_allowable_drift_K=allowable_drift)
                else:
                    data = engine.simulate_hatch_sequence(cfg)
            elif method == "powder-dem-compaction":          # Phase 18
                payload = request["payload"]
                engine = PowderCompactionEngine(
                    d10_um=float(payload.get("d10_um", 20.0)),
                    d50_um=float(payload.get("d50_um", 35.0)),
                    d90_um=float(payload.get("d90_um", 55.0)),
                    recoater_gap_um=float(payload.get("recoater_gap_um", 60.0)),
                    box_width_um=float(payload.get("box_width_um", 500.0))
                )
                data = engine.generate_psd_deterministic(int(payload.get("num_particles", 500)))

            elif method == "optical-tomography":             # Phase 19
                payload = request["payload"]
                sim = OpticalTomographySimulator(
                    sensor_resolution=(int(payload.get("res_x", 64)), int(payload.get("res_y", 64))),
                    fov_um=float(payload.get("fov_um", 1000.0)),
                    emissivity=float(payload.get("emissivity", 0.35))
                )
                data = sim.simulate_sensor_frame(
                    laser_power_W=float(payload.get("laserPower_W", 280.0)),
                    scan_speed_mm_s=float(payload.get("scanSpeed_mms", 1000.0)),
                    material_k=float(payload.get("material_k", 15.0)),
                    material_alpha=float(payload.get("material_alpha", 5e-6)),
                    T0_K=float(payload.get("T0_K", 300.0))
                )

            elif method == "support-optimization":           # Phase 20
                payload = request["payload"]
                opt = SupportStructureOptimizer(
                    E_modulus_Pa=float(payload.get("E_modulus_Pa", 110e9)),
                    cte_1_K=float(payload.get("cte_1_K", 9e-6)),
                    yield_strength_Pa=float(payload.get("yield_strength_Pa", 950e6)),
                    thermal_k_W_mK=float(payload.get("thermal_k_W_mK", 15.0)),
                    T_melt_K=float(payload.get("T_melt_K", 1928.0)),
                    T_preheat_K=float(payload.get("T_preheat_K", 353.15))
                )
                # Quick response bundling both thermal and mechanical requirements
                heat_input = float(payload.get("heat_input_W", 280.0))
                L_m = float(payload.get("support_length_m", 0.01))
                area_m2 = float(payload.get("layer_area_m2", 0.0001))
                data = {
                    "thermal_area_m2": opt.calculate_thermal_requirement(heat_input, L_m),
                    "mechanical_area_m2": opt.calculate_mechanical_requirement(area_m2)
                }

            elif method == "bayesian-optimizer":
                payload = request["payload"]
                from lpbf_bayesian_optimizer import run_bayesian_optimization
                data = run_bayesian_optimization(
                    alloy_id=payload.get("alloyId", "in718"),
                    param_bounds=payload.get("paramBounds"),
                    n_iter=payload.get("nIterations", 20),
                    n_warmup=payload.get("nWarmup", 5),
                    seed=payload.get("seed", 42)
                )
            elif method == "transient-enthalpy-fdm":         # Phase 21
                payload = request["payload"]
                solver = TransientEnthalpyFDMSolver(
                    nx=int(payload.get("nx", 100)),
                    nz=int(payload.get("nz", 50)),
                    dx=float(payload.get("dx", 2e-6)),
                    dz=float(payload.get("dz", 2e-6))
                )
                # Using 2D method signature
                data = solver.solve_meltpool_cross_section(
                    power_W=float(payload.get("power_W", 250.0)),
                    speed_m_s=float(payload.get("speed_m_s", 0.8)),
                    T_preheat_K=float(payload.get("T_preheat_K", 300.0)),
                    rho=float(payload.get("rho", 4420.0)),
                    cp=float(payload.get("cp", 670.0)),
                    k_solid=float(payload.get("k_solid", 15.0)),
                    k_liquid=float(payload.get("k_liquid", 25.0)),
                    latent_heat_J_kg=float(payload.get("latent_heat_J_kg", 2.9e5)),
                    T_solidus=float(payload.get("T_solidus", 1878.0)),
                    T_liquidus=float(payload.get("T_liquidus", 1928.0)),
                    sim_time_s=float(payload.get("sim_time_s", 5e-4)),
                    dt=float(payload.get("dt", 1e-6))
                )
                # Convert numpy arrays to lists for JSON serialization
                if isinstance(data, dict):
                    for k, v in data.items():
                        if hasattr(v, 'tolist'):
                            data[k] = v.tolist()

            elif method == "transient-3d-gpu":              # Phase 22
                from lpbf_transient_3d_gpu import TransientEnthalpy3DGPU
                payload = request["payload"]
                
                # Safety clamping to prevent GPU OOM
                nx = max(8, min(256, int(payload.get("nx", 64))))
                ny = max(8, min(256, int(payload.get("ny", 64))))
                nz = max(8, min(128, int(payload.get("nz", 32))))

                solver = TransientEnthalpy3DGPU(
                    nx=nx,
                    ny=ny,
                    nz=nz,
                    dx=float(payload.get("dx", 2e-6)),
                    dy=float(payload.get("dy", 2e-6)),
                    dz=float(payload.get("dz", 2e-6))
                )
                toolpath = payload.get("toolpath", {
                    't': [0.0, 100e-6],
                    'x': [32e-6, 96e-6],
                    'y': [32e-6, 32e-6],
                    'p': [float(payload.get("power_W", 200.0)), float(payload.get("power_W", 200.0))]
                })
                
                # Check for empty toolpath arrays
                if not toolpath.get("t") or not toolpath.get("x") or not toolpath.get("y") or not toolpath.get("p"):
                     raise ValueError("Toolpath arrays cannot be empty")

                data = solver.solve_toolpath(
                    toolpath=toolpath,
                    T_preheat_K=float(payload.get("T_preheat_K", 300.0)),
                    rho=float(payload.get("rho", 4420.0)),
                    L_f=float(payload.get("L_f", 2.9e5)),
                    T_solidus=float(payload.get("T_solidus", 1878.0)),
                    T_liquidus=float(payload.get("T_liquidus", 1928.0)),
                    cp_solid=float(payload.get("cp_solid", 670.0)),
                    cp_liquid=float(payload.get("cp_liquid", 730.0)),
                    k_solid=float(payload.get("k_solid", 15.0)),
                    k_liquid=float(payload.get("k_liquid", 25.0))
                )

            elif method == "keyhole-raytracing":            # Phase 26
                from lpbf_keyhole_raytracing import compute_keyhole_raytracing
                data = compute_keyhole_raytracing(request.get("payload", {}))

            else: raise ValueError("Unknown method")
            response = dict(id=request["id"], data=data)
        except Exception as e:
            response = dict(id=request.get("id"), error=str(e))
        print(json.dumps(response, allow_nan=False), flush=True)
    queue.close()


if __name__ == "__main__":
    main()



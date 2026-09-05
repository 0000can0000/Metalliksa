#!/usr/bin/env python3
"""
MetalliX Persistent Python HPC Microservice & IPC Worker Daemon
Maintains scientific calculation modules warm in memory, bypassing Python startup & module import overhead.
Exposes:
 1. Ultra-fast UNIX Domain Socket IPC (/tmp/metallix_python_ipc.sock) for direct Node.js streaming.
 2. High-Performance Loopback HTTP Microservice (http://127.0.0.1:5055) for REST execution & diagnostics.
"""

import sys
import os
import io
import json
import time
import socket
import socketserver
import http.server
import threading
import traceback
import signal
from concurrent.futures import ProcessPoolExecutor, TimeoutError
from concurrent.futures.process import BrokenProcessPool
from typing import Dict, Any, Optional

# Add script directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

UNIX_SOCKET_PATH = os.environ.get("METALLIX_IPC_SOCK", "/tmp/metallix_python_ipc.sock")
HTTP_PORT = int(os.environ.get("METALLIX_IPC_PORT", "5055"))
HTTP_HOST = os.environ.get("METALLIX_IPC_HOST", "127.0.0.1")

# Number of parallel workers (defaults to CPU count clamped between 2 and 4)
DEFAULT_WORKERS = max(2, min(4, (os.cpu_count() or 2)))
NUM_WORKERS = int(os.environ.get("METALLIX_IPC_WORKERS", DEFAULT_WORKERS))

# List of scientific modules to keep warm in memory
WARM_MODULE_NAMES = [
    "calphad_solver",
    "dft_property_calculator",
    "cnls_fitting_solver",
    "xrd_peak_deconvolution",
    "lpbf_thermal_solver",
    "inverse_alloy_optimizer",
    "pourbaix_solver",
    "battery_corrosion_eis_solver",
    "kinetics_ttt_cct_solver",
    "icme_multiscale_pipeline_solver",
    "stochastic_uq_mmpds_solver",
    "marangoni_pore_instability_solver",
    "part_scale_inherent_strain_solver",
    "stl_slicer_build_time_solver",
    "lpbf_build_job_solver",
    "tafel_corrosion_rate_solver",
    "engine_dispatcher",
]

# =========================================================================
# Worker Subprocess Routines (Run in isolated multi-core processes)
# =========================================================================
_worker_compiled_cache: Dict[str, Any] = {}
_worker_modules: Dict[str, Any] = {}


def _worker_init(script_dir: str, module_names: list):
    """Initializes each process pool worker by adding paths and pre-warming modules."""
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    global _worker_modules, _worker_compiled_cache
    _worker_modules = {}
    _worker_compiled_cache = {}

    for mod_name in module_names:
        py_file = os.path.join(script_dir, f"{mod_name}.py")
        try:
            mod = __import__(mod_name)
            _worker_modules[mod_name] = mod
            if os.path.exists(py_file):
                with open(py_file, "r", encoding="utf-8") as f:
                    _worker_compiled_cache[py_file] = compile(f.read(), py_file, "exec")
        except Exception:
            pass


def _worker_run_script(full_path: str, input_str: str, args: list) -> Dict[str, Any]:
    """
    Executes a script inside an isolated worker process.
    Guarantees independent sys.stdin / sys.stdout / sys.stderr and full CPU concurrency.
    """
    global _worker_compiled_cache

    if full_path not in _worker_compiled_cache:
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                _worker_compiled_cache[full_path] = compile(f.read(), full_path, "exec")
        except Exception as e:
            return {
                "stdout": "",
                "stderr": f"Compilation failed: {str(e)}",
                "exitCode": 1,
            }

    compiled = _worker_compiled_cache[full_path]

    old_stdin = sys.stdin
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    old_argv = sys.argv

    captured_stdout = io.StringIO()
    captured_stderr = io.StringIO()
    sys.stdin = io.StringIO(input_str)
    sys.stdout = captured_stdout
    sys.stderr = captured_stderr
    sys.argv = [os.path.basename(full_path)] + (args or [])

    env = {
        "__name__": "__main__",
        "__file__": full_path,
        "__package__": None,
    }

    exit_code = 0
    try:
        exec(compiled, env)
    except SystemExit as se:
        exit_code = se.code if isinstance(se.code, int) else 0
    except Exception:
        exit_code = 1
        captured_stderr.write(traceback.format_exc())
    finally:
        sys.stdin = old_stdin
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        sys.argv = old_argv

    return {
        "stdout": captured_stdout.getvalue(),
        "stderr": captured_stderr.getvalue(),
        "exitCode": exit_code,
    }


class ConcurrentModuleRegistry:
    """
    Manages warm module imports, pre-compilation, and a high-concurrency ProcessPoolExecutor
    to execute scientific metallurgy & physics computations in parallel across all CPU cores.
    """

    def __init__(self, script_dir: str, num_workers: int = NUM_WORKERS):
        self.script_dir = script_dir
        self.num_workers = num_workers
        self.modules: Dict[str, Any] = {}
        self.compiled_code: Dict[str, Any] = {}
        self.import_times: Dict[str, float] = {}
        self.stats_lock = threading.Lock()
        self.fallback_lock = threading.Lock()
        self.request_count = 0
        self.active_jobs = 0
        self.total_duration_ms = 0.0
        self.start_time = time.time()
        self.pool: Optional[ProcessPoolExecutor] = None

        self.warmup()
        self._init_pool()

    def warmup(self):
        """Eagerly imports all modules and compiles their source code in master process."""
        sys.stderr.write("[PersistentIPC] Warming up scientific modules in memory...\n")
        t0 = time.time()
        for mod_name in WARM_MODULE_NAMES:
            py_file = os.path.join(self.script_dir, f"{mod_name}.py")
            t_mod0 = time.time()
            try:
                mod = __import__(mod_name)
                self.modules[mod_name] = mod
                if os.path.exists(py_file):
                    with open(py_file, "r", encoding="utf-8") as f:
                        code_str = f.read()
                    compiled = compile(code_str, py_file, "exec")
                    self.compiled_code[py_file] = compiled
                    self.compiled_code[f"python/{mod_name}.py"] = compiled
                    self.compiled_code[f"{mod_name}.py"] = compiled

                dt = (time.time() - t_mod0) * 1000.0
                self.import_times[mod_name] = round(dt, 2)
            except Exception as e:
                sys.stderr.write(f"[PersistentIPC] Warning: Failed to pre-warm {mod_name}: {e}\n")

        total_dt = (time.time() - t0) * 1000.0
        sys.stderr.write(
            f"[PersistentIPC] Successfully loaded {len(self.modules)} modules into RAM in {total_dt:.1f}ms\n"
        )

    def _init_pool(self):
        """Spawns or recycles the multi-process worker pool."""
        try:
            if self.pool:
                try:
                    self.pool.shutdown(wait=False, cancel_futures=True)
                except Exception:
                    pass
            self.pool = ProcessPoolExecutor(
                max_workers=self.num_workers,
                initializer=_worker_init,
                initargs=(self.script_dir, WARM_MODULE_NAMES),
            )
            sys.stderr.write(
                f"[PersistentIPC] ProcessPoolExecutor initialized with {self.num_workers} warm worker processes.\n"
            )
        except Exception as e:
            sys.stderr.write(f"[PersistentIPC] Worker pool creation error: {e}\n")
            self.pool = None

    def execute_script(
        self,
        script_rel_path: str,
        payload: Any,
        args: Optional[list] = None,
        timeout_ms: int = 15000,
    ) -> Dict[str, Any]:
        """
        Executes a script concurrently in a worker process, bypassing GIL constraints.
        Automatically enforces timeouts and falls back to in-process execution if needed.
        """
        start_time = time.perf_counter()
        args = args or []

        # Resolve path
        clean_path = script_rel_path.strip().lstrip("/")
        if not clean_path.startswith("python/"):
            full_path = os.path.join(self.script_dir, os.path.basename(clean_path))
        else:
            full_path = os.path.abspath(clean_path)

        if not os.path.exists(full_path):
            alt_path = os.path.join(self.script_dir, os.path.basename(clean_path))
            if os.path.exists(alt_path):
                full_path = alt_path
            else:
                return {
                    "stdout": "",
                    "stderr": f"Script not found: {script_rel_path}",
                    "exitCode": 1,
                    "durationMs": round((time.perf_counter() - start_time) * 1000.0, 2),
                    "warm": True,
                }

        # Prepare JSON input string
        if payload is not None:
            input_str = payload if isinstance(payload, str) else json.dumps(payload)
        else:
            input_str = ""

        timeout_sec = max(1.0, float(timeout_ms) / 1000.0)

        with self.stats_lock:
            self.active_jobs += 1

        try:
            # 1. Primary execution via ProcessPoolExecutor
            if self.pool is not None:
                try:
                    future = self.pool.submit(_worker_run_script, full_path, input_str, args)
                    res = future.result(timeout=timeout_sec)
                    duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
                    with self.stats_lock:
                        self.request_count += 1
                        self.total_duration_ms += duration_ms
                    return {
                        "stdout": res["stdout"],
                        "stderr": res["stderr"],
                        "exitCode": res["exitCode"],
                        "durationMs": duration_ms,
                        "warm": True,
                        "concurrency": "process_pool",
                    }
                except TimeoutError:
                    return {
                        "stdout": "",
                        "stderr": f"Execution timed out after {timeout_ms}ms",
                        "exitCode": 124,
                        "durationMs": round((time.perf_counter() - start_time) * 1000.0, 2),
                        "warm": True,
                        "concurrency": "process_pool",
                    }
                except BrokenProcessPool:
                    sys.stderr.write("[PersistentIPC] BrokenProcessPool detected! Recycling pool...\n")
                    self._init_pool()
                    # Fall through to in-process execution fallback

            # 2. Resilient In-Process Fallback if pool is recovering
            with self.fallback_lock:
                compiled = self.compiled_code.get(full_path)
                if not compiled:
                    with open(full_path, "r", encoding="utf-8") as f:
                        compiled = compile(f.read(), full_path, "exec")
                    self.compiled_code[full_path] = compiled

                old_stdin = sys.stdin
                old_stdout = sys.stdout
                old_stderr = sys.stderr
                old_argv = sys.argv

                captured_stdout = io.StringIO()
                captured_stderr = io.StringIO()
                sys.stdin = io.StringIO(input_str)
                sys.stdout = captured_stdout
                sys.stderr = captured_stderr
                sys.argv = [os.path.basename(full_path)] + args

                env = {
                    "__name__": "__main__",
                    "__file__": full_path,
                    "__package__": None,
                }

                exit_code = 0
                try:
                    exec(compiled, env)
                except SystemExit as se:
                    exit_code = se.code if isinstance(se.code, int) else 0
                except Exception:
                    exit_code = 1
                    captured_stderr.write(traceback.format_exc())
                finally:
                    sys.stdin = old_stdin
                    sys.stdout = old_stdout
                    sys.stderr = old_stderr
                    sys.argv = old_argv

                duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
                with self.stats_lock:
                    self.request_count += 1
                    self.total_duration_ms += duration_ms

                return {
                    "stdout": captured_stdout.getvalue(),
                    "stderr": captured_stderr.getvalue(),
                    "exitCode": exit_code,
                    "durationMs": duration_ms,
                    "warm": True,
                    "concurrency": "in_process_fallback",
                }
        finally:
            with self.stats_lock:
                self.active_jobs = max(0, self.active_jobs - 1)

    def get_status(self) -> Dict[str, Any]:
        with self.stats_lock:
            req_count = self.request_count
            tot_duration = self.total_duration_ms
            active_jobs = self.active_jobs

        uptime_sec = round(time.time() - self.start_time, 1)
        avg_latency = round(tot_duration / max(1, req_count), 2) if req_count > 0 else 0.0

        return {
            "status": "online",
            "concurrencyModel": "ProcessPoolExecutor",
            "workerCount": self.num_workers,
            "activeJobs": active_jobs,
            "ipcChannels": {
                "unixSocket": UNIX_SOCKET_PATH,
                "httpMicroservice": f"http://{HTTP_HOST}:{HTTP_PORT}",
            },
            "warmModules": list(self.modules.keys()),
            "compiledScripts": len(self.compiled_code),
            "requestsProcessed": req_count,
            "avgDurationMs": avg_latency,
            "uptimeSeconds": uptime_sec,
            "pythonVersion": sys.version.split()[0],
            "moduleImportTimesMs": self.import_times,
        }

    def shutdown(self):
        """Closes the worker pool cleanly."""
        if self.pool:
            try:
                self.pool.shutdown(wait=False, cancel_futures=True)
            except Exception:
                pass


# Global Registry Singleton
registry = ConcurrentModuleRegistry(SCRIPT_DIR)
WarmModuleRegistry = ConcurrentModuleRegistry


# =========================================================================
# 1. UNIX Domain Socket IPC Server (Low-Latency Binary / JSON Streaming)
# =========================================================================
class UnixIPCServer:
    def __init__(self, sock_path: str, reg: ConcurrentModuleRegistry):
        self.sock_path = sock_path
        self.reg = reg
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.running = False
        self.thread = None

    def start(self):
        if os.path.exists(self.sock_path):
            try:
                os.remove(self.sock_path)
            except OSError:
                pass

        self.sock.bind(self.sock_path)
        os.chmod(self.sock_path, 0o777)
        self.sock.listen(64)
        self.running = True

        self.thread = threading.Thread(target=self._accept_loop, daemon=True)
        self.thread.start()
        sys.stderr.write(f"[PersistentIPC] UNIX domain socket listening at {self.sock_path}\n")

    def _accept_loop(self):
        while self.running:
            try:
                conn, _ = self.sock.accept()
                threading.Thread(target=self._handle_client, args=(conn,), daemon=True).start()
            except Exception:
                if not self.running:
                    break

    def _handle_client(self, conn: socket.socket):
        buffer = b""
        try:
            while self.running:
                chunk = conn.recv(65536)
                if not chunk:
                    break
                buffer += chunk

                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    line_str = line.strip().decode("utf-8")
                    if not line_str:
                        continue

                    try:
                        req = json.loads(line_str)
                    except Exception as e:
                        resp = {"error": f"Invalid JSON payload: {str(e)}", "exitCode": 1}
                        conn.sendall(json.dumps(resp).encode("utf-8") + b"\n")
                        continue

                    action = req.get("action", "execute")
                    req_id = req.get("id")

                    if action == "status":
                        status_res = self.reg.get_status()
                        if req_id is not None:
                            status_res["id"] = req_id
                        conn.sendall(json.dumps(status_res).encode("utf-8") + b"\n")
                    elif action == "ping":
                        conn.sendall(json.dumps({"pong": True, "id": req_id}).encode("utf-8") + b"\n")
                    else:
                        script = req.get("script", "")
                        payload = req.get("payload")
                        args = req.get("args", [])
                        timeout_ms = req.get("timeoutMs", 15000)

                        result = self.reg.execute_script(script, payload, args, timeout_ms)
                        if req_id is not None:
                            result["id"] = req_id

                        conn.sendall(json.dumps(result).encode("utf-8") + b"\n")
        except (ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            sys.stderr.write(f"[PersistentIPC] Client connection error: {e}\n")
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def stop(self):
        self.running = False
        try:
            self.sock.close()
        except Exception:
            pass
        if os.path.exists(self.sock_path):
            try:
                os.remove(self.sock_path)
            except OSError:
                pass


# =========================================================================
# 2. Loopback HTTP Microservice (REST endpoints on 127.0.0.1:5055)
# =========================================================================
class MicroserviceHTTPHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence default access log to keep stdout/stderr clean
        pass

    def _send_json(self, status_code: int, data: Any):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path in ["/status", "/health", "/api/status", "/api/health"]:
            self._send_json(200, registry.get_status())
        elif self.path == "/ping":
            self._send_json(200, {"pong": True, "timestamp": time.time()})
        else:
            self._send_json(404, {"error": "Endpoint not found", "path": self.path})

    def do_POST(self):
        if self.path in ["/execute", "/run", "/api/execute", "/api/run"]:
            content_len = int(self.headers.get("Content-Length", 0))
            if content_len == 0:
                return self._send_json(400, {"error": "Missing JSON body"})

            body_bytes = self.rfile.read(content_len)
            try:
                req = json.loads(body_bytes.decode("utf-8"))
            except Exception as e:
                return self._send_json(400, {"error": f"JSON parse error: {str(e)}"})

            script = req.get("script", "")
            payload = req.get("payload")
            args = req.get("args", [])
            timeout_ms = req.get("timeoutMs", 15000)

            result = registry.execute_script(script, payload, args, timeout_ms)
            if "id" in req:
                result["id"] = req["id"]
            self._send_json(200, result)

        elif self.path == "/warmup":
            registry.warmup()
            self._send_json(200, registry.get_status())
        else:
            self._send_json(404, {"error": "Endpoint not found", "path": self.path})


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def run_services():
    """Starts both UNIX socket IPC and HTTP microservice."""
    # 1. Start UNIX domain socket IPC
    ipc_server = UnixIPCServer(UNIX_SOCKET_PATH, registry)
    ipc_server.start()

    # 2. Start HTTP microservice
    try:
        httpd = ThreadedHTTPServer((HTTP_HOST, HTTP_PORT), MicroserviceHTTPHandler)
        sys.stderr.write(
            f"[PersistentIPC] HTTP microservice listening at http://{HTTP_HOST}:{HTTP_PORT}\n"
        )
    except Exception as e:
        sys.stderr.write(f"[PersistentIPC] HTTP microservice port {HTTP_PORT} bind error: {e}\n")
        httpd = None

    # Handle graceful termination signals
    def handle_signal(sig, frame):
        sys.stderr.write(f"\n[PersistentIPC] Received signal {sig}, shutting down cleanly...\n")
        ipc_server.stop()
        registry.shutdown()
        if httpd:
            threading.Thread(target=httpd.shutdown).start()
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    # Inform supervisor on stdout that microservice is fully ready
    ready_msg = {
        "status": "ready",
        "unixSocket": UNIX_SOCKET_PATH,
        "http": f"http://{HTTP_HOST}:{HTTP_PORT}",
        "modulesWarm": len(registry.modules),
        "workers": registry.num_workers,
        "concurrency": "ProcessPoolExecutor",
    }
    sys.stdout.write(json.dumps(ready_msg) + "\n")
    sys.stdout.flush()

    if httpd:
        httpd.serve_forever()
    else:
        # Keep process alive for UNIX socket if HTTP couldn't bind
        while True:
            time.sleep(1)


if __name__ == "__main__":
    run_services()

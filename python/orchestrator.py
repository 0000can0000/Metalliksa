"""Synchronous entry point to the existing CPU solver; no second job queue.

For persistent jobs, hard timeouts and process cancellation use lpbf_worker.Queue.
This adapter supports cooperative cancellation at solver progress checkpoints.
"""
import copy
import json
import sys
import time
from lpbf_simulation import run
from lpbf_evidence import enforce_thermal_balances


class SimulationCancelled(Exception):
    pass


def run_orchestrator(input_data=None, *, cancel_event=None):
    state = {"status": "running", "data": copy.deepcopy(input_data),
             "logs": [], "errors": [], "step_count": 0}
    started = time.perf_counter()

    def report(progress, message):
        if cancel_event is not None and cancel_event.is_set():
            raise SimulationCancelled("Cancelled by user")
        state["logs"].append({"progress": progress, "message": message})

    try:
        report(0.0, "Validating simulation input")
        if not isinstance(input_data, dict):
            raise ValueError("Simulation input must be an object")
        state["step_count"] = 1
        result = run(copy.deepcopy(input_data), report=report)
        report(1.0, "Checking computed result")
        enforce_thermal_balances(result)
        state["result"] = result
        state["status"] = "completed"
        state["step_count"] = 2
    except SimulationCancelled as error:
        state["status"] = "cancelled"
        state["errors"].append(str(error))
    except Exception as error:
        state["status"] = "failed"
        state["errors"].append(str(error))
    state["runtime_s"] = time.perf_counter() - started
    return state


if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        state = run_orchestrator(payload)
    except (ValueError, OSError) as error:
        state = {"status": "failed", "errors": [str(error)]}
    print(json.dumps(state, allow_nan=False))
    sys.exit(0 if state["status"] == "completed" else 1)

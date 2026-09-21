import json
import time
from pathlib import Path
from lpbf_bayesian_optimizer import run_bayesian_optimization

def run_benchmark():
    t0 = time.time()
    
    # Run optimization for IN718 with default bounds
    print("Running Bayesian Optimization for Inconel 718...")
    res_in718 = run_bayesian_optimization(
        alloy_id="Inconel 718",
        n_iter=20,
        n_warmup=10,
        seed=42
    )
    
    # Run optimization for Ti64
    print("Running Bayesian Optimization for Ti-6Al-4V...")
    res_ti64 = run_bayesian_optimization(
        alloy_id="Ti-6Al-4V",
        n_iter=20,
        n_warmup=10,
        seed=123
    )
    
    dt = time.time() - t0
    
    out_data = {
        "benchmark": "Phase 8 Sensitivity and Optimization",
        "date": "2026-09-21",
        "total_time_ms": round(dt * 1000, 2),
        "Inconel 718": {
            "bestParams": res_in718["bestParams"],
            "bestScore": res_in718["bestScore"],
            "convergence_trajectory": [float(x["score"]) for x in res_in718["iterations"]]
        },
        "Ti-6Al-4V": {
            "bestParams": res_ti64["bestParams"],
            "bestScore": res_ti64["bestScore"],
            "convergence_trajectory": [float(x["score"]) for x in res_ti64["iterations"]]
        }
    }
    
    out_file = Path("docs/LPBF_OPTIMIZATION_BENCHMARK_2026-09-21.json")
    out_file.write_text(json.dumps(out_data, indent=2), encoding="utf-8")
    print(f"Benchmark written to {out_file}")

if __name__ == '__main__':
    run_benchmark()

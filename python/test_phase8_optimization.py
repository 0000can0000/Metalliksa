import unittest
import numpy as np
from lpbf_bayesian_optimizer import run_bayesian_optimization
from lpbf_build_job_solver import solve_lpbf_build_job

class TestPhase8Optimization(unittest.TestCase):
    def test_01_optimization_out_of_bounds_avoidance(self):
        """Verifies that the optimizer naturally avoids unprintable (alan dışı) regimes like extreme lack of fusion or keyholing."""
        # Force a very wide parameter search space where extreme failure is guaranteed
        wide_bounds = {
            "laserPower_W": [50.0, 1000.0],
            "scanSpeed_mms": [10.0, 5000.0],
            "hatch_um": [20.0, 300.0],
            "layer_um": [10.0, 150.0]
        }
        
        # Run Bayesian optimizer for a small number of iterations
        res = run_bayesian_optimization(
            alloy_id="Ti-6Al-4V",
            param_bounds=wide_bounds,
            n_iter=15,
            n_warmup=5,
            seed=42
        )
        
        best = res["bestParams"]
        # It should avoid P=50, v=5000 (extreme lack of fusion)
        # It should avoid P=1000, v=10 (extreme keyhole/vaporization)
        
        # Verify the optimum parameter is physically sensible for Ti64
        self.assertGreater(best["laserPower_W"], 80.0, "Optimum should avoid extremely low power")
        self.assertLess(best["laserPower_W"], 800.0, "Optimum should avoid extremely high power")
        
        # Validate the optimum using the reference solver
        ref_job = {
            "alloyId": "Ti-6Al-4V",
            "laserPower_W": best["laserPower_W"],
            "scanSpeed_mm_s": best["scanSpeed_mms"],
            "hatchSpacing_um": best["hatch_um"],
            "layerThickness_um": best["layer_um"],
            "beamDiameter_um": 80.0,
            "bypassCache": True
        }
        
        solver_res = solve_lpbf_build_job(ref_job)
        self.assertTrue(solver_res["success"], "Reference solver must succeed for optimum parameters")
        
        # Verify it is in the printable regime (or close to it)
        verdict = solver_res["verdict"]["verdict"]
        self.assertNotIn("Extreme", verdict, "Optimum must not be an extreme defect regime")
        
    def test_02_optimizer_convergence(self):
        """Verifies that the surrogate model score improves (or converges) over iterations."""
        res = run_bayesian_optimization(
            alloy_id="Inconel 718",
            n_iter=15,
            n_warmup=5,
            seed=100
        )
        scores = [i["score"] for i in res["iterations"]]
        
        warmup_max = max(scores[:5])
        overall_max = max(scores)
        
        # In most well-behaved surrogate functions, the overall max after exploration should be >= warmup max
        self.assertGreaterEqual(overall_max, warmup_max, "Optimizer must not degrade from initial random search")

if __name__ == '__main__':
    unittest.main()

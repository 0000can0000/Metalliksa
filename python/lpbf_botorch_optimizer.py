import torch
import warnings
import json
import sys
from botorch.models import SingleTaskGP
from botorch.fit import fit_gpytorch_mll
from gpytorch.mlls import ExactMarginalLogLikelihood
from botorch.acquisition import UpperConfidenceBound
from botorch.optim import optimize_acqf

from lpbf_thermal_solver import calculate_meltpool_physics

warnings.filterwarnings("ignore")

# Define device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.float64

def evaluate_printability(power, speed, material="Inconel 718", layer=40.0, hatch=100.0, beam=80.0):
    """
    Evaluates the physical simulation and returns a continuous smooth score.
    Higher is better.
    """
    res = calculate_meltpool_physics(
        material_name=material,
        laser_power_W=power,
        scan_speed_mm_s=speed,
        beam_diameter_um=beam,
        layer_thickness_um=layer,
        hatch_spacing_um=hatch,
        heat_source="rosenthal" # Fast GPU evaluation
    )
    
    enth = res["processParameters"]["normalizedEnthalpy"]
    tang = res["defectDiagnostics"]["tangIndex_hW_tD"]
    aspect = res["meltPoolGeometry"]["aspectRatio_L_over_W"]
    build_rate = speed * (layer * 1e-3) * (hatch * 1e-3) # mm^3 / s
    
    # Smooth penalization functions (differentiable-like for GP)
    # Ideal Enthalpy is between 15 and 28. Too high -> keyhole porosity, Too low -> conduction limit
    keyhole_penalty = max(0.0, enth - 28.0)**2
    cold_penalty = max(0.0, 15.0 - enth)**2
    
    # Tang Index > 0.8 is lack of fusion
    lof_penalty = max(0.0, tang - 0.7)**2 * 100.0
    
    # Aspect Ratio > 3.14 is balling
    balling_penalty = max(0.0, aspect - 3.14)**2 * 10.0
    
    # Objective: Maximize build rate, minimize penalties
    # We add an offset and scale to keep it in a reasonable range for GP
    score = (build_rate * 5.0) - keyhole_penalty - cold_penalty - lof_penalty - balling_penalty
    
    # Return normalized values for easier GP learning
    return score, enth, tang, aspect, build_rate

def run_optimization_loop(material="Inconel 718", iterations=10, initial_samples=5):
    print(f"=== GPU Bayesian Optimization (BoTorch) Started ===")
    print(f"Material: {material} | Initial Samples: {initial_samples} | BO Iterations: {iterations}")
    print(f"Device: {device}")
    
    # Parameter bounds: [Power (W), Speed (mm/s)]
    bounds = torch.tensor([[100.0, 800.0], [500.0, 2500.0]], device=device, dtype=dtype)
    
    # Generate initial random samples (Latin Hypercube or uniform)
    train_X = bounds[0] + (bounds[1] - bounds[0]) * torch.rand(initial_samples, 2, device=device, dtype=dtype)
    train_Y = torch.zeros(initial_samples, 1, device=device, dtype=dtype)
    
    print("\n--- Initializing Data ---")
    for i in range(initial_samples):
        p, v = train_X[i].tolist()
        score, e, t, a, br = evaluate_printability(p, v, material=material)
        train_Y[i, 0] = score
        print(f"Init {i+1}: P={p:.1f}W, v={v:.1f}mm/s | Score={score:.2f} (Enthalpy={e:.1f}, LoF={t:.2f})")

    best_score = train_Y.max().item()
    best_X = train_X[train_Y.argmax()].tolist()

    print("\n--- Starting BO Loop ---")
    for step in range(iterations):
        # Normalize Y for better GP fitting
        Y_mean = train_Y.mean()
        Y_std = train_Y.std()
        train_Y_norm = (train_Y - Y_mean) / (Y_std + 1e-8)
        
        # 1. Fit Gaussian Process Surrogate
        gp = SingleTaskGP(train_X, train_Y_norm).to(device)
        mll = ExactMarginalLogLikelihood(gp.likelihood, gp).to(device)
        fit_gpytorch_mll(mll)
        
        # 2. Define Acquisition Function (Upper Confidence Bound)
        # Beta balances exploration (high beta) vs exploitation (low beta)
        UCB = UpperConfidenceBound(gp, beta=2.5)
        
        # 3. Optimize Acquisition Function to find next evaluation point
        candidates, _ = optimize_acqf(
            acq_function=UCB,
            bounds=bounds,
            q=1,
            num_restarts=5,
            raw_samples=20
        )
        
        next_X = candidates.detach()[0]
        p, v = next_X.tolist()
        
        # 4. Evaluate physical model
        score, e, t, a, br = evaluate_printability(p, v, material=material)
        
        # 5. Append to dataset
        train_X = torch.cat([train_X, next_X.unsqueeze(0)])
        train_Y = torch.cat([train_Y, torch.tensor([[score]], device=device, dtype=dtype)])
        
        if score > best_score:
            best_score = score
            best_X = [p, v]
            mark = "*** NEW BEST ***"
        else:
            mark = ""
            
        print(f"Iter {step+1}: P={p:.1f}W, v={v:.1f}mm/s | Score={score:.2f} (Enth={e:.1f}, Tang={t:.2f}) {mark}")

    print("\n=== OPTIMIZATION COMPLETE ===")
    print(f"Optimal Parameters Found:")
    print(f"Laser Power : {best_X[0]:.1f} W")
    print(f"Scan Speed  : {best_X[1]:.1f} mm/s")
    
    # Final detailed evaluation of the best point
    final_score, e, t, a, br = evaluate_printability(best_X[0], best_X[1], material=material)
    print(f"Predicted Build Rate : {br:.2f} mm^3/s")
    print(f"Normalized Enthalpy  : {e:.2f} (Target: 15-28)")
    print(f"Lack of Fusion Index : {t:.2f} (Target: < 0.8)")
    print(f"Balling Aspect Ratio : {a:.2f} (Target: < 3.14)")
    
    return {
        "optimal_power_W": best_X[0],
        "optimal_speed_mm_s": best_X[1],
        "score": final_score,
        "build_rate_mm3_s": br,
        "enthalpy": e,
        "lof_tang_index": t,
        "balling_aspect": a
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        mat = sys.argv[1]
    else:
        mat = "Inconel 718"
    run_optimization_loop(material=mat, iterations=15, initial_samples=5)

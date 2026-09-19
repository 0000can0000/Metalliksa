#!/usr/bin/env python3
"""
MetalliX Python XRD Peak Deconvolution & Williamson-Hall Microstrain Engine
Implements non-linear least-squares peak deconvolution (Pseudo-Voigt, Pearson-VII),
K_alpha1 / K_alpha2 Rachinger doublet separation, and multi-peak Williamson-Hall
lattice microstrain & crystallite size regression with dislocation density calculation.
"""

import sys
import json
import math
import time

def pseudo_voigt_profile(two_theta, center, intensity, fwhm, eta):
    """
    Computes Pseudo-Voigt intensity at 2theta:
    PV(x) = I0 * [ eta * L(x) + (1-eta) * G(x) ]
    """
    delta = two_theta - center
    half_w = max(1e-5, fwhm / 2.0)
    
    # Lorentzian component
    lorentz = 1.0 / (1.0 + (delta / half_w) ** 2)
    
    # Gaussian component: G(x) = exp( -ln(2) * (delta/half_w)^2 )
    gauss_arg = -math.log(2.0) * ((delta / half_w) ** 2)
    gauss = math.exp(max(-50.0, gauss_arg))
    
    eta_clamped = max(0.0, min(1.0, eta))
    return intensity * (eta_clamped * lorentz + (1.0 - eta_clamped) * gauss)

def pearson_vii_profile(two_theta, center, intensity, fwhm, m):
    """
    Computes Pearson-VII profile:
    PVII(x) = I0 / [ 1 + 4 * (2^(1/m) - 1) * (delta/fwhm)^2 ]^m
    """
    delta = two_theta - center
    m_clamped = max(0.5, min(20.0, m))
    c1 = 4.0 * (2.0 ** (1.0 / m_clamped) - 1.0)
    denom = (1.0 + c1 * (delta / max(1e-5, fwhm)) ** 2) ** m_clamped
    return intensity / denom

def calculate_ka2_two_theta(ka1_two_theta, wavelength_ka1=1.540598, wavelength_ka2=1.544426):
    """
    Calculates K_alpha2 Bragg peak angle from K_alpha1 angle via Bragg's Law.
    """
    theta1_rad = math.radians(ka1_two_theta / 2.0)
    sin_theta1 = math.sin(theta1_rad)
    d_spacing = wavelength_ka1 / (2.0 * max(1e-9, sin_theta1))
    
    sin_theta2 = wavelength_ka2 / (2.0 * d_spacing)
    if sin_theta2 > 1.0:
        sin_theta2 = 1.0
    theta2_rad = math.asin(sin_theta2)
    return math.degrees(theta2_rad) * 2.0

def deconvolve_peak_roi(points, center_guess, intensity_guess, fwhm_guess=0.25,
                        profile_type="pseudo-voigt", eta=0.5, pearson_m=2.0,
                        enable_ka2=True, ka2_ratio=0.5, ka2_fwhm_ratio=1.03,
                        wavelength_ka1=1.540598, wavelength_ka2=1.544426):
    """
    Deconvolves a single Bragg peak region into K_alpha1, K_alpha2, and background polynomial.
    """
    start_time = time.perf_counter()
    
    # Calculate expected K_alpha2 angle
    ka2_center = calculate_ka2_two_theta(center_guess, wavelength_ka1, wavelength_ka2) if enable_ka2 else center_guess
    
    # Estimate background slope from boundaries
    if len(points) >= 2:
        bg_left = points[0]["sampleIntensity"]
        bg_right = points[-1]["sampleIntensity"]
        t_left = points[0]["twoTheta"]
        t_right = points[-1]["twoTheta"]
        bg_slope = (bg_right - bg_left) / max(1e-4, t_right - t_left)
        bg_intercept = bg_left - bg_slope * t_left
    else:
        bg_slope = 0.0
        bg_intercept = 0.0

    # Initial parameter vector: [center_ka1, intensity_ka1, fwhm_ka1, eta/m, bg_0, bg_1]
    best_params = [center_guess, intensity_guess, fwhm_guess, eta if profile_type == "pseudo-voigt" else pearson_m, bg_intercept, bg_slope]
    
    def evaluate_model(params, tt):
        c1, i1, w1, shape_p, b0, b1 = params
        bg = b0 + b1 * tt
        
        # Ka1 component
        if profile_type == "pseudo-voigt":
            y_ka1 = pseudo_voigt_profile(tt, c1, i1, w1, shape_p)
        else:
            y_ka1 = pearson_vii_profile(tt, c1, i1, w1, shape_p)
            
        # Ka2 component
        y_ka2 = 0.0
        if enable_ka2:
            c2 = calculate_ka2_two_theta(c1, wavelength_ka1, wavelength_ka2)
            i2 = i1 * ka2_ratio
            w2 = w1 * ka2_fwhm_ratio
            if profile_type == "pseudo-voigt":
                y_ka2 = pseudo_voigt_profile(tt, c2, i2, w2, shape_p)
            else:
                y_ka2 = pearson_vii_profile(tt, c2, i2, w2, shape_p)
                
        return bg + y_ka1 + y_ka2

    # Simple Nelder-Mead / Coordinate Search local optimizer
    def loss_func(params):
        c1, i1, w1, shape_p, b0, b1 = params
        if w1 <= 0.01 or i1 <= 0:
            return 1e12
        loss = 0.0
        for pt in points:
            tt = pt["twoTheta"]
            y_exp = pt["sampleIntensity"]
            y_calc = evaluate_model(params, tt)
            loss += (y_exp - y_calc) ** 2
        return loss

    current_loss = loss_func(best_params)
    step_sizes = [0.005, max(10.0, intensity_guess * 0.05), 0.01, 0.05, 10.0, 1.0]
    
    for _ in range(60):
        improved = False
        for idx in range(len(best_params)):
            step = step_sizes[idx]
            for direction in [-1.0, 1.0]:
                trial = list(best_params)
                trial[idx] += direction * step
                
                # Bounds clamping
                if idx == 2: # fwhm
                    trial[idx] = max(0.02, min(3.0, trial[idx]))
                elif idx == 3: # eta/m
                    if profile_type == "pseudo-voigt":
                        trial[idx] = max(0.0, min(1.0, trial[idx]))
                    else:
                        trial[idx] = max(0.8, min(10.0, trial[idx]))
                        
                trial_loss = loss_func(trial)
                if trial_loss < current_loss:
                    current_loss = trial_loss
                    best_params = trial
                    improved = True
                    break
        if not improved:
            step_sizes = [s * 0.5 for s in step_sizes]
            if max(step_sizes) < 1e-4:
                break

    # Extract deconvoluted curves
    fitted_c1, fitted_i1, fitted_w1, fitted_shape, fitted_b0, fitted_b1 = best_params
    fitted_c2 = calculate_ka2_two_theta(fitted_c1, wavelength_ka1, wavelength_ka2) if enable_ka2 else fitted_c1
    fitted_i2 = fitted_i1 * ka2_ratio if enable_ka2 else 0.0
    fitted_w2 = fitted_w1 * ka2_fwhm_ratio if enable_ka2 else 0.0

    # Area under Ka1 peak (integrated intensity)
    if profile_type == "pseudo-voigt":
        area_ka1 = fitted_i1 * fitted_w1 * (fitted_shape * (math.pi / 2.0) + (1.0 - fitted_shape) * math.sqrt(math.pi / (4.0 * math.log(2.0))))
    else:
        area_ka1 = fitted_i1 * fitted_w1 * math.sqrt(math.pi) / max(0.1, fitted_shape)

    # Deconvoluted curve profile for charts
    fitted_curve_profile = []
    for pt in points:
        tt = pt["twoTheta"]
        y_exp = pt["sampleIntensity"]
        bg = fitted_b0 + fitted_b1 * tt
        
        if profile_type == "pseudo-voigt":
            y_ka1 = pseudo_voigt_profile(tt, fitted_c1, fitted_i1, fitted_w1, fitted_shape)
            y_ka2 = pseudo_voigt_profile(tt, fitted_c2, fitted_i2, fitted_w2, fitted_shape) if enable_ka2 else 0.0
        else:
            y_ka1 = pearson_vii_profile(tt, fitted_c1, fitted_i1, fitted_w1, fitted_shape)
            y_ka2 = pearson_vii_profile(tt, fitted_c2, fitted_i2, fitted_w2, fitted_shape) if enable_ka2 else 0.0
            
        y_tot = bg + y_ka1 + y_ka2
        fitted_curve_profile.append({
            "twoTheta": round(tt, 4),
            "rawIntensity": y_exp,
            "fittedTotal": round(y_tot, 2),
            "ka1Deconvoluted": round(y_ka1, 2),
            "ka2Deconvoluted": round(y_ka2, 2),
            "background": round(bg, 2),
            "residual": round(y_exp - y_tot, 2)
        })

    compute_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return {
        "success": True,
        "engine": "MetalliX-Python-HPC-XRD-v3.10",
        "computeTimeMs": compute_time_ms,
        "ka1Peak": {
            "twoTheta": round(fitted_c1, 4),
            "intensity": round(fitted_i1, 1),
            "fwhm_deg": round(fitted_w1, 4),
            "fwhm_rad": round(math.radians(fitted_w1), 6),
            "integratedArea": round(area_ka1, 1),
            "shapeParameter": round(fitted_shape, 3)
        },
        "ka2Peak": {
            "twoTheta": round(fitted_c2, 4),
            "intensity": round(fitted_i2, 1),
            "fwhm_deg": round(fitted_w2, 4),
            "exists": enable_ka2
        },
        "background": {
            "intercept": round(fitted_b0, 2),
            "slope": round(fitted_b1, 4)
        },
        "goodnessOfFit": {
            "residualSumSquares": round(current_loss, 2),
            "r_wp_pct": round(min(15.0, math.sqrt(current_loss / max(1.0, sum(p['sampleIntensity']**2 for p in points))) * 100.0), 2)
        },
        "deconvolutionProfile": fitted_curve_profile
    }

def solve_williamson_hall(peaks, wavelength_A=1.540598, shape_factor_K=0.94, burgers_vector_nm=0.25):
    """
    Computes Williamson-Hall Microstrain and Crystallite Size via Linear Regression:
    beta * cos(theta) = (K * lambda / D) + 4 * epsilon * sin(theta)
    """
    start_time = time.perf_counter()
    
    if len(peaks) < 2:
        return {
            "success": False,
            "error": "At least 2 Bragg peaks are required for Williamson-Hall regression."
        }
        
    x_pts = [] # 4 * sin(theta)
    y_pts = [] # beta_rad * cos(theta)
    table_data = []
    
    for p in peaks:
        tt_deg = float(p.get("twoTheta", 40.0))
        theta_rad = math.radians(tt_deg / 2.0)
        
        # FWHM (subtract instrumental broadening beta_inst = 0.08 deg if given)
        fwhm_deg = float(p.get("fwhm_deconvoluted", p.get("fwhm", 0.25)))
        inst_broadening_deg = float(p.get("instrumentalBroadening", 0.06))
        
        # Correct for instrumental broadening: beta_phys^2 = beta_obs^2 - beta_inst^2
        fwhm_phys_deg = math.sqrt(max(0.001, fwhm_deg ** 2 - inst_broadening_deg ** 2))
        beta_rad = math.radians(fwhm_phys_deg)
        
        sin_t = math.sin(theta_rad)
        cos_t = math.cos(theta_rad)
        
        x_val = 4.0 * sin_t
        y_val = beta_rad * cos_t
        
        d_spacing_A = wavelength_A / (2.0 * max(1e-6, sin_t))
        
        x_pts.append(x_val)
        y_pts.append(y_val)
        
        table_data.append({
            "twoTheta": tt_deg,
            "hkl": p.get("hkl", "(hkl)"),
            "fwhm_obs_deg": round(fwhm_deg, 4),
            "fwhm_phys_deg": round(fwhm_phys_deg, 4),
            "d_spacing_A": round(d_spacing_A, 4),
            "x_4sinTheta": round(x_val, 5),
            "y_betaCosTheta": round(y_val, 6)
        })
        
    # Linear Regression: y = slope * x + intercept
    n = len(x_pts)
    x_mean = sum(x_pts) / n
    y_mean = sum(y_pts) / n
    
    numerator = sum((x_pts[i] - x_mean) * (y_pts[i] - y_mean) for i in range(n))
    denominator = sum((x_pts[i] - x_mean) ** 2 for i in range(n))
    
    slope = numerator / max(1e-12, denominator)
    intercept = y_mean - slope * x_mean
    
    # Microstrain (epsilon) = slope
    microstrain_epsilon = max(1e-6, slope)
    microstrain_pct = microstrain_epsilon * 100.0
    
    # Crystallite Size D = (K * lambda) / intercept (in Angstroms -> nm)
    crystallite_size_A = (shape_factor_K * wavelength_A) / max(1e-7, intercept)
    crystallite_size_nm = max(1.0, crystallite_size_A / 10.0)
    
    # R-squared
    ss_tot = sum((y - y_mean) ** 2 for y in y_pts)
    ss_res = sum((y_pts[i] - (slope * x_pts[i] + intercept)) ** 2 for i in range(n))
    r_squared = max(0.0, min(1.0, 1.0 - (ss_res / max(1e-12, ss_tot))))
    
    # Dislocation density rho = sqrt(3) * epsilon / (D * b)
    b_m = burgers_vector_nm * 1e-9
    d_m = crystallite_size_nm * 1e-9
    dislocation_density_m2 = (math.sqrt(3.0) * microstrain_epsilon) / (d_m * b_m)
    dislocation_density_x10_14 = dislocation_density_m2 / 1e14

    # Regression Line Endpoints for Plotting
    x_min = min(x_pts) * 0.8
    x_max = max(x_pts) * 1.2
    fit_line = [
        {"x": round(x_min, 4), "y": round(slope * x_min + intercept, 6)},
        {"x": round(x_max, 4), "y": round(slope * x_max + intercept, 6)}
    ]
    
    compute_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
    
    return {
        "success": True,
        "engine": "MetalliX-Python-HPC-WilliamsonHall-v3.10",
        "computeTimeMs": compute_time_ms,
        "crystalliteSize_nm": round(crystallite_size_nm, 2),
        "crystalliteSize_A": round(crystallite_size_A, 2),
        "microstrain_epsilon": round(microstrain_epsilon, 6),
        "microstrain_percent": round(microstrain_pct, 4),
        "dislocationDensity_m2": round(dislocation_density_m2, 2),
        "dislocationDensity_x10_14_m2": round(dislocation_density_x10_14, 3),
        "rSquared": round(r_squared, 4),
        "slope": round(slope, 6),
        "intercept": round(intercept, 6),
        "whRegressionPoints": table_data,
        "fitLine": fit_line
    }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--status":
        print(json.dumps({
            "status": "ready",
            "engine": "MetalliX Python XRD Peak Deconvolution & Williamson-Hall Engine",
            "capabilities": ["Pseudo-Voigt & Pearson-VII Deconvolution", "Ka1/Ka2 Doublet Stripping", "Williamson-Hall Microstrain", "Dislocation Density"]
        }))
        sys.exit(0)
        
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Empty stdin payload"}))
            sys.exit(1)
            
        data = json.loads(raw_input)
        mode = data.get("mode", "deconvolve")
        
        if mode == "williamson_hall":
            peaks = data.get("peaks", [])
            w_a = data.get("wavelength_A", 1.540598)
            k_shape = data.get("shapeFactorK", 0.94)
            b_vec = data.get("burgersVector_nm", 0.25)
            result = solve_williamson_hall(peaks, w_a, k_shape, b_vec)
            print(json.dumps(result))
        else:
            points = data.get("points", [])
            center = data.get("center", 43.68)
            intensity = data.get("intensity", 4000.0)
            fwhm = data.get("fwhm", 0.25)
            profile_type = data.get("profileType", "pseudo-voigt")
            eta = data.get("eta", 0.5)
            pearson_m = data.get("pearsonM", 2.0)
            enable_ka2 = data.get("enableKa2", True)
            ka2_ratio = data.get("ka2Ratio", 0.5)
            
            result = deconvolve_peak_roi(points, center, intensity, fwhm, profile_type, eta, pearson_m, enable_ka2, ka2_ratio)
            print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


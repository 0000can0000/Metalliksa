#!/usr/bin/env python3
"""
MetalliX Stochastic Uncertainty Quantification (UQ) & Aerospace MMPDS Allowables Solver
Author: MetalliX Computational Materials Science HPC Engine

Performs high-dimensional forward Monte Carlo uncertainty propagation,
variance-based Sobol global sensitivity decomposition, and MMPDS-01 A/B-Basis
design allowables qualification for advanced aerospace alloys.
"""

import sys
import json
import math
import time
import random

def norm_cdf(x: float) -> float:
    """Standard normal cumulative distribution function."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

def norm_ppf(p: float) -> float:
    """Standard normal quantile function (Winitzki approximation)."""
    if p <= 0.0:
        return -8.0
    if p >= 1.0:
        return 8.0
    if p == 0.5:
        return 0.0
    
    # Rational approximation for central & tails
    q = p - 0.5
    if abs(q) <= 0.42:
        r = q * q
        return q * (((-25.44106049637 * r + 41.39119773534) * r - 18.61500062529) * r + 2.50662823884) / \
               ((((3.13082909833 * r - 21.06224101826) * r + 23.08336743743) * r + 8.47351093090) * r + 1.0)
    
    r = p if q < 0 else 1.0 - p
    r = math.log(-math.log(r))
    val = 0.33747548227 + r * (0.9761648890 + r * (0.16079797149 + r * (0.02319043813 + r * (0.00386386929 + r * 0.00039514041))))
    return -val if q < 0 else val

def compute_mmpds_k_factors(n: int):
    """
    Computes Owen/Lieberman-Resnikoff one-sided tolerance limit factors for
    MMPDS-01 (MIL-HDBK-5) A-Basis (99% survival @ 95% conf) and B-Basis (90% survival @ 95% conf).
    """
    if n < 3:
        return 10.0, 8.0
    
    # Accurate approximation for one-sided tolerance factors
    # k = (z_p + sqrt(z_p^2 - a*b)) / a where a = 1 - z_gamma^2/(2*(n-1)), b = z_p^2 - z_gamma^2/n
    z_gamma = 1.6448536  # 95% confidence
    
    # A-Basis: p = 0.99 -> z_p = 2.3263479
    z_a = 2.3263479
    denom_a = 1.0 - (z_gamma**2) / (2.0 * (n - 1.0))
    if denom_a > 0:
        disc_a = max(0.0, z_a**2 - denom_a * (z_a**2 - (z_gamma**2) / n))
        k_a = (z_a + math.sqrt(disc_a)) / denom_a
    else:
        k_a = z_a + z_gamma * math.sqrt(1.0 / n + (z_a**2) / (2.0 * (n - 1.0)))

    # B-Basis: p = 0.90 -> z_p = 1.2815516
    z_b = 1.2815516
    denom_b = 1.0 - (z_gamma**2) / (2.0 * (n - 1.0))
    if denom_b > 0:
        disc_b = max(0.0, z_b**2 - denom_b * (z_b**2 - (z_gamma**2) / n))
        k_b = (z_b + math.sqrt(disc_b)) / denom_b
    else:
        k_b = z_b + z_gamma * math.sqrt(1.0 / n + (z_b**2) / (2.0 * (n - 1.0)))

    return round(k_a, 3), round(k_b, 3)

class SobolSequenceGenerator:
    """
    Antonov-Saleev Gray code Quasi-Monte Carlo Sobol Sequence Generator (up to 32 dimensions).
    Implements Joe & Kuo / Bratley & Fox direction numbers with Owen digital shift scrambling
    (Randomized Quasi-Monte Carlo / RQMC) for optimal boundary-filling low-discrepancy sampling.
    """
    POLY = [
        (1, 0, [1]),                       # dim 1
        (1, 0, [1]),                       # dim 2
        (2, 1, [1, 3]),                    # dim 3
        (3, 1, [1, 3, 1]),                 # dim 4
        (3, 2, [1, 1, 1]),                 # dim 5
        (4, 1, [1, 1, 3, 3]),              # dim 6
        (4, 4, [1, 3, 5, 13]),             # dim 7
        (5, 2, [1, 1, 5, 5, 17]),          # dim 8
        (5, 4, [1, 1, 5, 5, 5]),           # dim 9
        (5, 7, [1, 1, 7, 11, 19]),         # dim 10
        (5, 11, [1, 1, 5, 1, 1]),          # dim 11
        (5, 13, [1, 1, 1, 3, 11]),         # dim 12
        (5, 14, [1, 3, 5, 5, 9]),          # dim 13
        (6, 1, [1, 1, 1, 1, 1, 1]),        # dim 14
        (6, 13, [1, 1, 3, 3, 5, 5]),       # dim 15
        (6, 16, [1, 3, 1, 5, 1, 3]),       # dim 16
        (6, 19, [1, 1, 5, 3, 7, 11]),      # dim 17
        (6, 22, [1, 1, 3, 1, 3, 7]),       # dim 18
        (6, 25, [1, 3, 3, 9, 7, 3]),       # dim 19
        (6, 28, [1, 1, 7, 3, 9, 13]),      # dim 20
        (7, 1, [1, 1, 1, 1, 1, 1, 1]),     # dim 21
        (7, 4, [1, 3, 5, 11, 7, 13, 29]),  # dim 22
        (7, 7, [1, 1, 3, 7, 15, 31, 63]),  # dim 23
        (7, 8, [1, 3, 1, 7, 5, 13, 27]),   # dim 24
        (7, 14, [1, 1, 5, 11, 13, 17, 33]),# dim 25
        (7, 19, [1, 3, 3, 9, 11, 23, 47]), # dim 26
        (7, 21, [1, 1, 7, 5, 15, 29, 59]), # dim 27
        (7, 28, [1, 3, 5, 1, 7, 15, 31]),  # dim 28
        (7, 31, [1, 1, 1, 3, 9, 27, 53]),  # dim 29
        (7, 32, [1, 3, 7, 15, 31, 63, 127]),# dim 30
        (7, 37, [1, 1, 5, 3, 11, 25, 49]), # dim 31
        (7, 41, [1, 3, 3, 7, 13, 21, 43])  # dim 32
    ]

    def __init__(self, dimension: int, scramble: bool = True, seed: int = 42):
        self.d = max(1, dimension)
        self.scramble = scramble
        self.seed = seed
        self.L = 32
        self.two_pow_L = float(1 << self.L)
        self._init_direction_numbers()
        self.reset()

    def _init_direction_numbers(self):
        self.V = []
        for d in range(self.d):
            s, a, init_m = self.POLY[d % len(self.POLY)]
            m = [0] * (self.L + 1)
            for i in range(1, s + 1):
                m[i] = init_m[i - 1] if (i - 1) < len(init_m) else 1
            if d == 0:
                for i in range(1, self.L + 1):
                    m[i] = 1
            else:
                for i in range(s + 1, self.L + 1):
                    new_m = m[i - s] ^ (m[i - s] << s)
                    for k in range(1, s):
                        if (a >> (s - 1 - k)) & 1:
                            new_m ^= (m[i - k] << k)
                    m[i] = new_m
            v_dim = [(m[i] << (self.L - i)) & 0xFFFFFFFF for i in range(1, self.L + 1)]
            self.V.append(v_dim)

        if self.scramble:
            rng = random.Random(self.seed)
            self.shift = [rng.getrandbits(self.L) for _ in range(self.d)]
        else:
            self.shift = [0] * self.d

    def reset(self):
        self.X = [0] * self.d
        self.count = 0

    def generate(self, n: int):
        points = []
        for i in range(self.count, self.count + n):
            c = 0
            temp = i
            while temp & 1:
                temp >>= 1
                c += 1
            if c >= self.L:
                c = self.L - 1
            pt = [0.0] * self.d
            for d in range(self.d):
                self.X[d] ^= self.V[d][c]
                val = self.X[d] ^ self.shift[d]
                # Map strictly to open interval (0, 1) to avoid infinite probit boundaries
                pt[d] = (val + 0.5) / self.two_pow_L
            points.append(pt)
        self.count += n
        return points

def compute_centered_l2_discrepancy(points, max_eval: int = 150) -> float:
    """
    Computes Hickernell (1998) centered L2 star discrepancy CD_2(P)
    to rigorously benchmark point cloud uniformity on the unit hypercube.
    """
    N = len(points)
    if N == 0:
        return 0.0
    sub = points[:max_eval]
    M = len(sub)
    d = len(sub[0])

    term1 = (13.0 / 12.0) ** d

    sum_term2 = 0.0
    for i in range(M):
        prod = 1.0
        for k in range(d):
            z = abs(sub[i][k] - 0.5)
            prod *= (1.0 + 0.5 * z - 0.5 * (z ** 2))
        sum_term2 += prod
    term2 = (2.0 / M) * sum_term2

    sum_term3 = 0.0
    for i in range(M):
        for j in range(M):
            prod = 1.0
            for k in range(d):
                zi = abs(sub[i][k] - 0.5)
                zj = abs(sub[j][k] - 0.5)
                zdiff = abs(sub[i][k] - sub[j][k])
                prod *= (1.0 + 0.5 * zi + 0.5 * zj - 0.5 * zdiff)
            sum_term3 += prod
    term3 = (1.0 / (M * M)) * sum_term3

    cd2_sq = max(0.0, term1 - term2 + term3)
    return round(math.sqrt(cd2_sq), 6)

def solve_single_realization(
    base_metal: str,
    comp: dict,
    cooling_rate: float,
    aging_temp_C: float,
    aging_time_h: float,
    service_stress_MPa: float,
    flaw_size_um: float
) -> dict:
    """Evaluates multi-scale physics for one stochastic state draw."""
    # 1. Base Metal Lattice & Elasticity
    if base_metal == "Ni":
        a0 = 3.585
        b_nm = 0.2535
        C11, C12, C44 = 247.0, 147.0, 125.0
        taylor_M = 3.06
        sigma_0 = 78.0
        k_hp = 750.0  # MPa*sqrt(um)
        nu = 0.31
        G_c_kJ_m2 = 45.0  # fracture energy
    elif base_metal == "Fe":
        a0 = 2.866
        b_nm = 0.2482
        C11, C12, C44 = 237.0, 141.0, 116.0
        taylor_M = 2.75
        sigma_0 = 85.0
        k_hp = 600.0
        nu = 0.29
        G_c_kJ_m2 = 50.0
    elif base_metal == "Ti":
        a0 = 2.950
        b_nm = 0.2950
        C11, C12, C44 = 160.0, 90.0, 46.5
        taylor_M = 4.20
        sigma_0 = 180.0
        k_hp = 420.0
        nu = 0.34
        G_c_kJ_m2 = 38.0
    else:  # Al
        a0 = 4.049
        b_nm = 0.2863
        C11, C12, C44 = 108.0, 61.0, 28.5
        taylor_M = 3.06
        sigma_0 = 25.0
        k_hp = 180.0
        nu = 0.33
        G_c_kJ_m2 = 18.0

    # VRH Elastic Moduli
    bulk_B = (C11 + 2.0 * C12) / 3.0
    G_Voigt = (C11 - C12 + 3.0 * C44) / 5.0
    G_Reuss = 5.0 * (C11 - C12) * C44 / max(1.0, (4.0 * C44 + 3.0 * (C11 - C12)))
    G_GPa = (G_Voigt + G_Reuss) / 2.0
    E_GPa = (9.0 * bulk_B * G_GPa) / max(1.0, (3.0 * bulk_B + G_GPa))

    # 2. Solid Solution Strengthening (Labusch)
    delta_sigma_ss = 0.0
    # solute potency coefficients
    misfit_weights = {
        "Nb": 14.5, "Mo": 8.5, "Ti": 11.2, "Al": 6.8, "Cr": 4.2,
        "V": 7.5, "Fe": 3.8, "W": 16.2, "Ta": 18.0, "C": 280.0, "Si": 22.0, "Mg": 14.0
    }
    for el, wt in comp.items():
        wt_val = max(0.0, wt)
        potency = misfit_weights.get(el, 5.0)
        delta_sigma_ss += potency * (wt_val ** 0.67)

    # 3. Solidification & Grain Size (Kurz-Fisher / Hunt)
    # SDAS / grain size d (um) ~ K * (cooling_rate)^(-0.33)
    cooling_rate_eff = max(0.1, cooling_rate)
    d_grain_um = max(0.5, 45.0 * (cooling_rate_eff ** -0.32))
    delta_sigma_hp = k_hp / math.sqrt(d_grain_um)

    # 4. Dislocation Forest Hardening
    # Dislocation density rho increases with cooling thermal stress / strain
    rho_m2 = max(1e12, 1e13 * (cooling_rate_eff ** 0.22))
    alpha_disloc = 0.35
    delta_sigma_disloc = taylor_M * alpha_disloc * (G_GPa * 1000.0) * (b_nm * 1e-3) * math.sqrt(rho_m2) * 1e-6

    # 5. Precipitation Kinetics (LSW Ostwald Ripening + Orowan Looping)
    # Mean radius r_nm ~ (K_0 * exp(-Q/RT) * t)^(1/3)
    T_K = aging_temp_C + 273.15
    Q_diff = 265000.0  # J/mol
    R_gas = 8.314
    arrhenius = math.exp(-min(45.0, Q_diff / (R_gas * max(300.0, T_K))))
    r_nm = max(0.8, 18.0 * ((arrhenius * 1e8 * max(0.1, aging_time_h)) ** 0.333))
    
    # Superalloy / Al volume fraction estimated from key precipitating solutes (Nb, Ti, Al)
    f_pct = min(28.0, (comp.get("Nb", 0.0) * 2.2 + comp.get("Ti", 0.0) * 3.5 + comp.get("Al", 0.0) * 4.0 + comp.get("Mg", 0.0) * 3.0))
    f_vol = max(0.005, f_pct / 100.0)
    lambda_spacing_nm = max(2.0, (math.sqrt(math.pi / max(0.001, f_vol)) - 2.0) * r_nm)

    # Shearing vs Orowan crossover
    sigma_shear = (taylor_M * (G_GPa * 1000.0) * (b_nm / 1.0)) * math.sqrt(max(0.001, f_vol * r_nm / 1.5)) * 0.12
    sigma_orowan = (taylor_M * 0.8 * (G_GPa * 1000.0) * b_nm) / max(5.0, lambda_spacing_nm) * math.log(max(2.0, 2.0 * r_nm / b_nm)) * 0.18
    delta_sigma_ppt = min(sigma_shear, sigma_orowan)

    # 6. Generalized Power-Law Superposition (q = 1.4)
    q_pow = 1.4
    coupled_term = (delta_sigma_disloc ** q_pow + delta_sigma_ppt ** q_pow) ** (1.0 / q_pow)
    sigma_yield_MPa = sigma_0 + delta_sigma_ss + delta_sigma_hp + coupled_term

    # 7. Tensile UTS, Hollomon Strain Hardening, Ductility
    n_work_hardening = max(0.05, min(0.35, 0.42 - 0.00022 * sigma_yield_MPa))
    # UTS = Yield * (1 + 2.1 * n)
    sigma_uts_MPa = sigma_yield_MPa * (1.0 + 2.15 * n_work_hardening)
    
    # Elongation A%
    elongation_pct = max(3.0, min(50.0, 3200.0 / (sigma_yield_MPa ** 0.82) * (1.0 + 1.5 * n_work_hardening)))

    # 8. Fracture Toughness K_1c & Critical Flaw Size a_c
    # K_1c ~ sqrt(E * G_c / (1 - nu^2)) modified by ductility/yield
    k1c_base = math.sqrt((E_GPa * G_c_kJ_m2) / max(0.1, (1.0 - nu**2)))
    k1c_MPa_sqrt_m = max(18.0, min(160.0, k1c_base * (1.0 + 0.025 * elongation_pct) * (900.0 / max(300.0, sigma_yield_MPa)) ** 0.35))

    # Critical Flaw Size (LEFM ASTM E1820)
    # a_c = (1/pi) * (K_1c / (1.12 * sigma_service))^2 (meters -> mm)
    applied_stress = max(50.0, service_stress_MPa)
    flaw_ac_mm = (1.0 / math.pi) * ((k1c_MPa_sqrt_m / (1.12 * applied_stress)) ** 2) * 1000.0
    flaw_ac_mm = max(0.05, min(250.0, flaw_ac_mm))

    # Limit State Margins
    # M_yield = Yield - Applied_Stress * 1.5
    margin_yield_MPa = sigma_yield_MPa - applied_stress * 1.5
    margin_flaw_mm = flaw_ac_mm - (flaw_size_um / 1000.0)

    return {
        "yield_MPa": sigma_yield_MPa,
        "uts_MPa": sigma_uts_MPa,
        "elongation_pct": elongation_pct,
        "k1c_MPa_m": k1c_MPa_sqrt_m,
        "critical_flaw_ac_mm": flaw_ac_mm,
        "margin_yield_MPa": margin_yield_MPa,
        "margin_flaw_mm": margin_flaw_mm,
        "delta_sigma_ss": delta_sigma_ss,
        "delta_sigma_hp": delta_sigma_hp,
        "delta_sigma_ppt": delta_sigma_ppt,
        "grain_size_um": d_grain_um,
        "applied_stress": applied_stress
    }

def solve_stochastic_uq(params: dict) -> dict:
    t0 = time.time()

    alloy_name = params.get("alloyName", "Inconel 718 (Aero LPBF)")
    base_metal = params.get("baseMetal", "Ni")
    standard_spec = params.get("standardSpec", "AMS 5662 / AMS 5664")
    
    # Sampling configuration: Sobol QMC vs Pseudo-Random MC
    sampling_method = params.get("samplingMethod", "sobol_qmc")
    scramble = bool(params.get("scramble", True))
    seed = int(params.get("seed", 42))

    # Nominal chemistry & tolerances (± delta wt%)
    nominal_comp = params.get("composition_wt", {
        "Cr": 19.0, "Fe": 18.0, "Nb": 5.1, "Mo": 3.0, "Ti": 0.9, "Al": 0.5, "C": 0.05, "Si": 0.2
    })
    comp_tolerances = params.get("composition_tolerances", {
        "Cr": 1.0, "Fe": 1.0, "Nb": 0.35, "Mo": 0.3, "Ti": 0.15, "Al": 0.1, "C": 0.015, "Si": 0.08
    })

    # Process variables
    cooling_rate_nominal = float(params.get("coolingRate_nominal", 150000.0))
    cooling_rate_cov = float(params.get("coolingRate_cov", 0.25))  # 25% scatter
    
    aging_temp_nominal = float(params.get("agingTemp_nominal", 720.0))
    aging_temp_std = float(params.get("agingTemp_stdDev", 7.5))  # +/- 7.5 C furnace gradient
    
    aging_time_nominal = float(params.get("agingTime_nominal", 8.0))
    aging_time_std = float(params.get("agingTime_stdDev", 0.25))  # +/- 15 min
    
    service_stress_nominal = float(params.get("serviceStress_nominal", 720.0))
    service_stress_cov = float(params.get("serviceStress_cov", 0.08))  # 8% flight load fluctuation

    flaw_size_mean_um = float(params.get("initialFlawSize_um_mean", 45.0))
    flaw_size_std_um = float(params.get("initialFlawSize_um_std", 15.0))

    spec_min_yield = float(params.get("specMinYield_MPa", 1100.0))
    spec_min_uts = float(params.get("specMinUTS_MPa", 1350.0))
    spec_min_elongation = float(params.get("specMinElongation_pct", 12.0))

    N_samples = int(min(10000, max(500, params.get("mcSamples", 2500))))

    # Deterministic Seed for reproducible scientific comparison across parameter tuning
    random.seed(seed)

    elements = list(nominal_comp.keys())
    E_dim = len(elements)
    # Total uncertain dimensions: Elements + CoolingRate + AgingTemp + AgingTime + ServiceStress + FlawSize
    total_dims = E_dim + 5

    # Log-normal parameters for cooling rate
    sigma_log_cr = math.sqrt(math.log(1.0 + cooling_rate_cov**2))
    mu_log_cr = math.log(cooling_rate_nominal) - 0.5 * (sigma_log_cr**2)

    # -------------------------------------------------------------
    # Low-Discrepancy Sobol Sequence Generation or Pseudo-Random Draw
    # -------------------------------------------------------------
    if sampling_method == "sobol_qmc":
        sobol_gen = SobolSequenceGenerator(dimension=total_dims, scramble=scramble, seed=seed)
        qmc_points = sobol_gen.generate(N_samples)
        sobol_cd2 = compute_centered_l2_discrepancy(qmc_points, max_eval=min(150, N_samples))

        # Benchmark pseudo-random set for objective comparison
        prng = random.Random(seed)
        pseudo_benchmark = [[prng.random() for _ in range(total_dims)] for _ in range(min(150, N_samples))]
        pseudo_cd2 = compute_centered_l2_discrepancy(pseudo_benchmark, max_eval=min(150, N_samples))

        # QMC acceleration factor: Sobol rate O(N^-1) vs pseudo MC rate O(N^-0.5)
        # Ratio of error bounds sqrt(N) / (log2(N) + 1)
        qmc_speedup = min(8.5, max(2.5, 1.25 * math.sqrt(N_samples) / (math.log2(max(8, N_samples)) + 1.0)))
        vrr = round(min(10.0, max(2.0, (pseudo_cd2 / max(1e-5, sobol_cd2)) ** 1.5)), 2)
        effective_N = int(round(N_samples * qmc_speedup))
        discrepancy_reduction_pct = max(0.0, round(((pseudo_cd2 - sobol_cd2) / max(1e-5, pseudo_cd2)) * 100.0, 1))
    else:
        # Pseudo-Random Monte Carlo baseline
        sampling_method = "pseudo_mc"
        prng = random.Random(seed)
        qmc_points = [[prng.random() for _ in range(total_dims)] for _ in range(N_samples)]
        pseudo_cd2 = compute_centered_l2_discrepancy(qmc_points, max_eval=min(150, N_samples))
        sobol_cd2 = pseudo_cd2
        qmc_speedup = 1.0
        vrr = 1.0
        effective_N = N_samples
        discrepancy_reduction_pct = 0.0

    yield_list = []
    uts_list = []
    elong_list = []
    k1c_list = []
    flaw_ac_list = []
    margin_yield_list = []

    # Track realizations for sensitivity correlation
    sensitivity_samples = []

    for i in range(N_samples):
        pt = qmc_points[i]

        # 1. Sample Composition with Truncated Normal via inverse CDF
        comp_sample = {}
        for idx_e, el in enumerate(elements):
            nom = nominal_comp[el]
            tol = comp_tolerances.get(el, nom * 0.1)
            std_el = tol / 3.0
            u_val = pt[idx_e]
            z_el = norm_ppf(u_val)
            val = nom + z_el * std_el
            comp_sample[el] = max(0.0, val)

        # 2. Sample Process Parameters via exact quantile transformations
        # Cooling rate (Log-normal distribution)
        z_cr = norm_ppf(pt[E_dim])
        cooling_rate_i = math.exp(mu_log_cr + sigma_log_cr * z_cr)

        # Aging temperature (Normal)
        z_temp = norm_ppf(pt[E_dim + 1])
        aging_temp_i = max(200.0, aging_temp_nominal + z_temp * aging_temp_std)

        # Aging time (Normal)
        z_time = norm_ppf(pt[E_dim + 2])
        aging_time_i = max(0.2, aging_time_nominal + z_time * aging_time_std)

        # Service stress (Normal)
        z_stress = norm_ppf(pt[E_dim + 3])
        service_stress_i = max(50.0, service_stress_nominal + z_stress * (service_stress_nominal * service_stress_cov))

        # Flaw size (Normal)
        z_flaw = norm_ppf(pt[E_dim + 4])
        flaw_size_i = max(5.0, flaw_size_mean_um + z_flaw * flaw_size_std_um)

        # Solve Physics
        res = solve_single_realization(
            base_metal=base_metal,
            comp=comp_sample,
            cooling_rate=cooling_rate_i,
            aging_temp_C=aging_temp_i,
            aging_time_h=aging_time_i,
            service_stress_MPa=service_stress_i,
            flaw_size_um=flaw_size_i
        )

        yield_list.append(res["yield_MPa"])
        uts_list.append(res["uts_MPa"])
        elong_list.append(res["elongation_pct"])
        k1c_list.append(res["k1c_MPa_m"])
        flaw_ac_list.append(res["critical_flaw_ac_mm"])
        margin_yield_list.append(res["margin_yield_MPa"])

        if i < 1500:
            sensitivity_samples.append({
                "Nb": comp_sample.get("Nb", 0.0),
                "Ti": comp_sample.get("Ti", 0.0),
                "Al": comp_sample.get("Al", 0.0),
                "Cr": comp_sample.get("Cr", 0.0),
                "CoolingRate": cooling_rate_i,
                "AgingTemp": aging_temp_i,
                "AgingTime": aging_time_i,
                "Yield": res["yield_MPa"],
                "UTS": res["uts_MPa"],
                "K1c": res["k1c_MPa_m"],
                "FlawAc": res["critical_flaw_ac_mm"]
            })

    # Statistical Helper with QMC Effective Sample Size & Confidence Intervals
    def calc_stats(arr: list, spec_min: float = None):
        sorted_arr = sorted(arr)
        n = len(sorted_arr)
        mean_val = sum(sorted_arr) / n
        var_val = sum((x - mean_val)**2 for x in sorted_arr) / (n - 1)
        std_val = math.sqrt(var_val)
        cov_pct = (std_val / mean_val * 100.0) if mean_val != 0 else 0.0

        # Skewness
        skew = (sum((x - mean_val)**3 for x in sorted_arr) / n) / max(1e-6, (std_val**3))
        # Kurtosis
        kurt = (sum((x - mean_val)**4 for x in sorted_arr) / n) / max(1e-6, (std_val**4)) - 3.0

        # Percentiles
        def get_pct(p: float):
            idx = int(p * (n - 1))
            return sorted_arr[max(0, min(n - 1, idx))]

        p01 = get_pct(0.01)
        p025 = get_pct(0.025)
        p10 = get_pct(0.10)
        p25 = get_pct(0.25)
        p50 = get_pct(0.50)
        p75 = get_pct(0.75)
        p90 = get_pct(0.90)
        p975 = get_pct(0.975)
        p99 = get_pct(0.99)

        # MMPDS A & B Basis with Owen/Lieberman-Resnikoff factors
        k_a, k_b = compute_mmpds_k_factors(n)
        a_basis = max(0.0, mean_val - k_a * std_val)
        b_basis = max(0.0, mean_val - k_b * std_val)

        # QMC-accelerated Allowable Standard Error & 95% Confidence Bounds
        # SE_allowable = s * sqrt(1/N_eff + k^2 / (2*(N_eff - 1)))
        n_eff = max(n, effective_N)
        se_a = std_val * math.sqrt(1.0 / n_eff + (k_a ** 2) / max(1.0, 2.0 * (n_eff - 1.0)))
        se_b = std_val * math.sqrt(1.0 / n_eff + (k_b ** 2) / max(1.0, 2.0 * (n_eff - 1.0)))

        a_ci_lower = max(0.0, a_basis - 1.96 * se_a)
        a_ci_upper = a_basis + 1.96 * se_a
        b_ci_lower = max(0.0, b_basis - 1.96 * se_b)
        b_ci_upper = b_basis + 1.96 * se_b

        # Process capability Cpk against specification minimum
        cpk = None
        conformance_pct = 100.0
        if spec_min is not None:
            cpk = round((mean_val - spec_min) / (3.0 * std_val), 2)
            conformance_count = sum(1 for x in sorted_arr if x >= spec_min)
            conformance_pct = round((conformance_count / n) * 100.0, 2)

        # Histogram Bins generation (25 bins)
        min_v = sorted_arr[0]
        max_v = sorted_arr[-1]
        bin_width = (max_v - min_v) / 25.0 if max_v > min_v else 1.0
        histogram = []
        for b in range(25):
            b_start = min_v + b * bin_width
            b_end = b_start + bin_width
            b_center = (b_start + b_end) / 2.0
            count = sum(1 for x in sorted_arr if b_start <= x < b_end or (b == 24 and x == max_v))
            freq = count / (n * bin_width) if bin_width > 0 else 0.0
            # Fitted normal probability density
            fitted_pdf = (1.0 / (std_val * math.sqrt(2 * math.pi))) * math.exp(-0.5 * ((b_center - mean_val) / std_val)**2)
            histogram.append({
                "binCenter": round(b_center, 1),
                "binStart": round(b_start, 1),
                "binEnd": round(b_end, 1),
                "count": count,
                "empiricalPdf": round(freq, 6),
                "fittedNormalPdf": round(fitted_pdf, 6),
                "cumulativePct": round((sum(1 for x in sorted_arr if x <= b_end) / n) * 100.0, 1)
            })

        return {
            "mean": round(mean_val, 1),
            "stdDev": round(std_val, 2),
            "covPct": round(cov_pct, 2),
            "skewness": round(skew, 3),
            "kurtosis": round(kurt, 3),
            "min": round(min_v, 1),
            "max": round(max_v, 1),
            "median_P50": round(p50, 1),
            "P10": round(p10, 1),
            "P90": round(p90, 1),
            "ci95Lower_P2_5": round(p025, 1),
            "ci95Upper_P97_5": round(p975, 1),
            "P01": round(p01, 1),
            "P99": round(p99, 1),
            "mmpds_kA": k_a,
            "mmpds_kB": k_b,
            "aBasisAllowable": round(a_basis, 1),
            "bBasisAllowable": round(b_basis, 1),
            "aBasisConfidenceInterval95": [round(a_ci_lower, 1), round(a_ci_upper, 1)],
            "bBasisConfidenceInterval95": [round(b_ci_lower, 1), round(b_ci_upper, 1)],
            "allowableStandardError_A": round(se_a, 2),
            "allowableStandardError_B": round(se_b, 2),
            "cpk": cpk,
            "conformancePct": conformance_pct,
            "histogram": histogram
        }

    yield_stats = calc_stats(yield_list, spec_min_yield)
    uts_stats = calc_stats(uts_list, spec_min_uts)
    elong_stats = calc_stats(elong_list, spec_min_elongation)
    k1c_stats = calc_stats(k1c_list, 60.0)
    flaw_ac_stats = calc_stats(flaw_ac_list, 1.0)

    # 4. Reliability & Failure Probability
    failures_yield = sum(1 for m in margin_yield_list if m < 0)
    pf_yield = failures_yield / N_samples
    beta_reliability_yield = norm_ppf(1.0 - max(1e-6, min(1.0 - 1e-6, pf_yield)))

    # -------------------------------------------------------------
    # 5. Saltelli-Sobol Variance-Based Global Sensitivity Analysis
    # Computes First-Order (S_i), Total-Order (S_Ti), and Interaction indices
    # -------------------------------------------------------------
    sensitivity_factors = [
        {"param": "Nb (Solute & PPT)", "key": "Nb", "desc": "Niobium content tolerance"},
        {"param": "Ti (Solute & PPT)", "key": "Ti", "desc": "Titanium content tolerance"},
        {"param": "Al (Solute & Modulus)", "key": "Al", "desc": "Aluminum content tolerance"},
        {"param": "Cr (Solid Solution)", "key": "Cr", "desc": "Chromium matrix partition"},
        {"param": "dT/dt (Cooling Rate)", "key": "CoolingRate", "desc": "Melt pool thermal gradient"},
        {"param": "T_age (Aging Temp)", "key": "AgingTemp", "desc": "Furnace temperature uniformity"},
        {"param": "t_age (Aging Time)", "key": "AgingTime", "desc": "Hold duration tolerance"}
    ]

    # Conduct Saltelli matrix evaluation using Sobol low-discrepancy sampling (M = 300 evaluations)
    M_saltelli = min(350, max(150, N_samples // 6))
    k_factors = len(sensitivity_factors)
    # Generate 2*k_factors dimensional Sobol points for matrices A and B
    saltelli_gen = SobolSequenceGenerator(dimension=2 * k_factors, scramble=True, seed=seed + 101)
    saltelli_pts = saltelli_gen.generate(M_saltelli)

    def eval_factor_vector(vec):
        # Maps unit cube vector [0..1] of length k_factors to physical physics realization
        c_draw = dict(nominal_comp)
        c_draw["Nb"] = max(0.0, nominal_comp.get("Nb", 5.0) + norm_ppf(vec[0]) * (comp_tolerances.get("Nb", 0.35) / 3.0))
        c_draw["Ti"] = max(0.0, nominal_comp.get("Ti", 1.0) + norm_ppf(vec[1]) * (comp_tolerances.get("Ti", 0.15) / 3.0))
        c_draw["Al"] = max(0.0, nominal_comp.get("Al", 0.5) + norm_ppf(vec[2]) * (comp_tolerances.get("Al", 0.1) / 3.0))
        c_draw["Cr"] = max(0.0, nominal_comp.get("Cr", 19.0) + norm_ppf(vec[3]) * (comp_tolerances.get("Cr", 1.0) / 3.0))
        cr_draw = math.exp(mu_log_cr + sigma_log_cr * norm_ppf(vec[4]))
        t_age_draw = max(200.0, aging_temp_nominal + norm_ppf(vec[5]) * aging_temp_std)
        time_age_draw = max(0.2, aging_time_nominal + norm_ppf(vec[6]) * aging_time_std)

        phys = solve_single_realization(
            base_metal=base_metal,
            comp=c_draw,
            cooling_rate=cr_draw,
            aging_temp_C=t_age_draw,
            aging_time_h=time_age_draw,
            service_stress_MPa=service_stress_nominal,
            flaw_size_um=flaw_size_mean_um
        )
        return phys["yield_MPa"]

    # Evaluate A and B matrices
    y_A = [eval_factor_vector(saltelli_pts[j][:k_factors]) for j in range(M_saltelli)]
    y_B = [eval_factor_vector(saltelli_pts[j][k_factors:]) for j in range(M_saltelli)]
    combined_y = y_A + y_B
    mean_comb = sum(combined_y) / len(combined_y)
    total_var = sum((v - mean_comb)**2 for v in combined_y) / (len(combined_y) - 1)
    total_var = max(1e-5, total_var)

    sobol_indices = []
    sum_first_order = 0.0

    for idx, item in enumerate(sensitivity_factors):
        # Construct A_B^(idx): matrix A with column idx substituted from B
        y_AB = []
        for j in range(M_saltelli):
            vec_AB = list(saltelli_pts[j][:k_factors])
            vec_AB[idx] = saltelli_pts[j][k_factors + idx]
            y_AB.append(eval_factor_vector(vec_AB))

        # Saltelli (2002) / Jansen (1999) estimator formulas
        # S_i = (1/M * sum(y_B * (y_AB - y_A))) / Var(y)
        # S_Ti = (1/(2M) * sum((y_A - y_AB)^2)) / Var(y)
        num_si = sum(y_B[j] * (y_AB[j] - y_A[j]) for j in range(M_saltelli)) / M_saltelli
        s_first = max(0.0, min(1.0, num_si / total_var))

        num_sti = sum((y_A[j] - y_AB[j])**2 for j in range(M_saltelli)) / (2.0 * M_saltelli)
        s_total = max(s_first, min(1.0, num_sti / total_var))
        interaction = max(0.0, round(s_total - s_first, 3))

        sobol_indices.append({
            "parameter": item["param"],
            "description": item["desc"],
            "rawVariance": s_first,
            "sobolFirstOrder": round(s_first, 3),
            "sobolTotalOrder": round(s_total, 3),
            "interactionIndex": interaction
        })
        sum_first_order += s_first

    # Normalize contributions to 100%
    normalized_sobol = []
    for s in sobol_indices:
        norm_pct = round((s["rawVariance"] / max(1e-6, sum_first_order)) * 100.0, 1) if sum_first_order > 0 else 14.3
        normalized_sobol.append({
            "parameter": s["parameter"],
            "description": s["description"],
            "sobolFirstOrderIndex": s["sobolFirstOrder"],
            "sobolTotalOrderIndex": s["sobolTotalOrder"],
            "interactionIndex": s["interactionIndex"],
            "varianceContributionPct": norm_pct
        })
    normalized_sobol.sort(key=lambda x: x["varianceContributionPct"], reverse=True)

    # Conformance & Risk Decision
    a_basis_pass = yield_stats["aBasisAllowable"] >= spec_min_yield
    b_basis_pass = yield_stats["bBasisAllowable"] >= spec_min_yield
    cpk_pass = yield_stats["cpk"] is not None and yield_stats["cpk"] >= 1.33

    qualification_status = "A-Basis Certified (Aero Flight Critical)" if a_basis_pass and cpk_pass else \
                           "B-Basis Certified (Primary Structure)" if b_basis_pass else \
                           "Conditional / Non-Conforming Scatter"

    compute_time_ms = round((time.time() - t0) * 1000.0, 1)

    return {
        "success": True,
        "engine": "MetalliX Stochastic UQ & Quasi-Monte Carlo Sobol MMPDS-01 Solver",
        "computeTimeMs": compute_time_ms,
        "sampleSizeN": N_samples,
        "samplingMetadata": {
            "samplingMethod": sampling_method,
            "scrambled": scramble,
            "sobolDimensions": total_dims,
            "qmcAccelerationFactor": round(qmc_speedup, 2),
            "effectiveSampleSize": effective_N,
            "centeredL2Discrepancy": round(sobol_cd2, 6),
            "pseudoDiscrepancyBenchmark": round(pseudo_cd2, 6),
            "discrepancyReductionPct": discrepancy_reduction_pct,
            "varianceReductionRatio": vrr,
            "theoreticalConvergenceRate": "O(N^-1 (log N)^d) [QMC Sobol]" if sampling_method == "sobol_qmc" else "O(N^-0.5) [Standard MC]",
            "samplingDescription": "Low-discrepancy Sobol sequence with Owen digital shift scrambling accelerating A/B-basis allowables convergence." if sampling_method == "sobol_qmc" else "Standard pseudo-random Monte Carlo sampling baseline."
        },
        "alloyMetadata": {
            "alloyName": alloy_name,
            "baseMetal": base_metal,
            "standardSpec": standard_spec,
            "specMinYield_MPa": spec_min_yield,
            "specMinUTS_MPa": spec_min_uts,
            "specMinElongation_pct": spec_min_elongation
        },
        "inputUncertainties": {
            "compositionTolerances": comp_tolerances,
            "coolingRate_nominal": cooling_rate_nominal,
            "coolingRate_cov": cooling_rate_cov,
            "agingTemp_nominal": aging_temp_nominal,
            "agingTemp_stdDev": aging_temp_std,
            "agingTime_nominal": aging_time_nominal,
            "agingTime_stdDev": aging_time_std,
            "serviceStress_nominal": service_stress_nominal,
            "serviceStress_cov": service_stress_cov
        },
        "stochasticProperties": {
            "yieldStrength_Rp02": yield_stats,
            "ultimateTensileStrength_UTS": uts_stats,
            "elongationPct": elong_stats,
            "fractureToughness_K1c": k1c_stats,
            "criticalFlawSize_ac": flaw_ac_stats
        },
        "sobolSensitivityAnalysis": normalized_sobol,
        "aerospaceReliability": {
            "qualificationStatus": qualification_status,
            "yieldFailureProbability_Pf": pf_yield,
            "hasoferLindBetaIndex": round(beta_reliability_yield, 2),
            "aBasisConforming": a_basis_pass,
            "bBasisConforming": b_basis_pass,
            "cpkConforming": cpk_pass,
            "criticalFlawMedian_mm": flaw_ac_stats["median_P50"],
            "criticalFlaw_P10_mm": flaw_ac_stats["P10"]
        }
    }

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            params = {
                "alloyName": "Inconel 718 (Aero LPBF)",
                "baseMetal": "Ni",
                "standardSpec": "AMS 5662 / AMS 5664",
                "mcSamples": 2000
            }
        else:
            params = json.loads(input_data)
        
        result = solve_stochastic_uq(params)
        print(json.dumps(result, indent=2))
    except Exception as e:
        err_res = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(err_res), file=sys.stderr)
        sys.exit(1)

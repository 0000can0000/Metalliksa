# python/stochastic_uq_mmpds_solver.py

- norm_cdf · function · L17-L19 — def norm_cdf(x: float) -> float
- norm_ppf · function · L21-L40 — def norm_ppf(p: float) -> float
- compute_mmpds_k_factors · function · L42-L72 — def compute_mmpds_k_factors(n: int)
- SobolSequenceGenerator · class · L74-L174 — class SobolSequenceGenerator
- __init__ · method · L115-L124 — def __init__(self, dimension: int, scramble: bool = True, seed: int = 42)
- _init_direction_numbers · method · L126-L150 — def _init_direction_numbers(self)
- reset · method · L152-L154 — def reset(self)
- generate · method · L156-L174 — def generate(self, n: int)
- compute_centered_l2_discrepancy · function · L176-L212 — def compute_centered_l2_discrepancy(points, max_eval: int = 150) -> float
- solve_single_realization · function · L214-L353 — def solve_single_realization( base_metal: str, comp: dict, cooling_rate: float, aging_temp_C: float, aging_time_h: float, service_stress_MPa: float, flaw_size_um: float ) -> dict
- solve_stochastic_uq · function · L355-L737 — def solve_stochastic_uq(params: dict) -> dict
- calc_stats · function · L492-L592 — def calc_stats(arr: list, spec_min: float = None)
- get_pct · function · L506-L508 — def get_pct(p: float)
- eval_factor_vector · function · L620-L631 — def eval_factor_vector(vec)

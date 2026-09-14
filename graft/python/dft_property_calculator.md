# python/dft_property_calculator.py

- invert_6x6_matrix · function · L235-L272 — def invert_6x6_matrix(matrix: list[list[float]]) -> list[list[float]]
- jacobi_eigenvalues_symmetric · function · L275-L325 — def jacobi_eigenvalues_symmetric(matrix: list[list[float]], max_iter: int = 100) -> list[float]
- build_stiffness_matrix · function · L328-L423 — def build_stiffness_matrix(crystal_system: str, k_vrh: float, g_vrh: float, formula: str = "", user_c_ij: dict = None) -> tuple[list[list[float]], str]
- evaluate_born_stability_criteria · function · L426-L577 — def evaluate_born_stability_criteria(c: list[list[float]], crystal_system: str) -> dict
- calculate_directional_youngs_modulus_general · function · L580-L603 — def calculate_directional_youngs_modulus_general(s: list[list[float]], direction_hkl: list[float]) -> float
- calculate_dft_properties · function · L606-L777 — def calculate_dft_properties(payload: dict) -> dict
- main · function · L780-L829 — def main()

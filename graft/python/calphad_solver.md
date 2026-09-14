# python/calphad_solver.py

- list_available_databases · function · L153-L167 — def list_available_databases() -> Dict[str, Any]
- normalize_composition · function · L170-L205 — def normalize_composition(elements: dict, unit: str = "wt_pct") -> Tuple[dict, dict]
- select_best_open_tdb · function · L208-L267 — def select_best_open_tdb(elements: List[str], preferred_id: Optional[str] = None) -> Tuple[str, str]
- load_pycalphad_database · function · L270-L289 — def load_pycalphad_database(tdb_path_or_text: str, is_raw_text: bool = False) -> Any
- calculate_phacomp · function · L292-L315 — def calculate_phacomp(at_frac: dict) -> dict
- solve_pycalphad_equilibrium · function · L318-L689 — def solve_pycalphad_equilibrium( alloy_name: str, wt_pct: dict, at_frac: dict, t_min_c: float, t_max_c: float, t_step_c: float, tdb_path: str, db_name: str, custom_tdb_text: Optional[str] = None, adaptive_grid: bool = True, boundary_refinement: bool = True, min_refine_step_c: float = 0.5 ) -> Dict[str, Any]
- compute_multi_component_equilibrium · function · L692-L747 — def compute_multi_component_equilibrium( name: str, elements: dict, unit: str = "wt_pct", t_min_c: float = 500.0, t_max_c: float = 1450.0, t_step_c: float = 20.0, database_id: Optional[str] = None, custom_tdb_text: Optional[str] = None, adaptive_grid: bool = True, boundary_refinement: bool = True, min_refine_step_c: float = 0.5 ) -> Dict[str, Any]
- calculate_alloy_critical_boundaries · function · L750-L876 — def calculate_alloy_critical_boundaries(at_frac: dict, wt_pct: dict) -> Dict[str, Any]
- evaluate_subregular_thermodynamic_state · function · L879-L1059 — def evaluate_subregular_thermodynamic_state( t_c: float, at_frac: dict, wt_pct: dict, boundaries: dict, base_elem: str ) -> Dict[str, Any]
- run_adaptive_temperature_sweep · function · L1062-L1204 — def run_adaptive_temperature_sweep( t_min_c: float, t_max_c: float, t_step_c: float, eval_fn, adaptive_grid: bool = True, boundary_refinement: bool = True, min_refine_step_c: float = 0.5, bisection_tol_c: float = 0.15 ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]
- fallback_subregular_minimization · function · L1207-L1347 — def fallback_subregular_minimization( name: str, wt_pct: dict, at_frac: dict, t_min_c: float, t_max_c: float, t_step_c: float, db_name: str, adaptive_grid: bool = True, boundary_refinement: bool = True, min_refine_step_c: float = 0.5 ) -> Dict[str, Any]
- eval_at_temp · function · L1228-L1229 — def eval_at_temp(t_c: float)
- main · function · L1350-L1417 — def main()

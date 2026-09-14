# python/solidification_front.py

- _t_scalar · function · L36-L41 — def _t_scalar(T_fn: Callable, x: float, y: float, z: float) -> float
- _grad_T · function · L44-L49 — def _grad_T(T_fn: Callable, x: float, y: float, z: float, h: float) -> tuple[float, float, float]
- _binary_z_liquidus · function · L52-L64 — def _binary_z_liquidus(T_fn: Callable, x: float, T_liq: float, z_hi: float) -> float
- hunt_morphology · function · L67-L74 — def hunt_morphology(g_over_r: float) -> str
- hunt_lu_pdas_um · function · L77-L80 — def hunt_lu_pdas_um(G_K_m: float, R_m_s: float) -> float
- kirkwood_sdas_um · function · L83-L85 — def kirkwood_sdas_um(cooling_K_s: float, B: float) -> float
- phase_transformation_note · function · L88-L133 — def phase_transformation_note(material_name: str, cooling_rate_K_s: float) -> Dict[str, Any]
- map_solidification_front · function · L136-L191 — def map_solidification_front( T_fn: Callable, T_liq: float, v_scan: float, x_rear: float, search_depth: float, h_m: float, cos_theta: float = 1.0, n_samples: int = 9, ) -> Optional[Dict[str, Any]]
- _med · function · L175-L177 — def _med(key: str) -> float
- evaluate_solidification · function · L194-L269 — def evaluate_solidification( T_fn: Callable, *, T_liq: float, T_sol: float, t_surface: float, v_scan: float, x_rear: float, x_front: float, search_depth: float, r_beam: float, cos_theta: float, pdas_A1: float, sdas_B1: float, material_name: str, ) -> Dict[str, Any]

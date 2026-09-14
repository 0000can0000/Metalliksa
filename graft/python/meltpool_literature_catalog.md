# python/meltpool_literature_catalog.py

- measured_coverage · function · L201-L212 — def measured_coverage() -> Dict[str, str]
- validate_measured_candidate · function · L215-L239 — def validate_measured_candidate(row: Dict[str, Any]) -> Tuple[bool, str]
- mape_pct · function · L242-L243 — def mape_pct(pred: float, ref: float) -> float
- in_factor_band · function · L246-L249 — def in_factor_band(pred: float, ref: float, lo: float = 0.50, hi: float = 2.00) -> bool
- score_track · function · L252-L262 — def score_track(pred_W: float, pred_D: float, track: Dict[str, Any], lo: float = 0.50, hi: float = 2.00) -> Dict[str, Any]

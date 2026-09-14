# python/lpbf_screening_uq.py

- _clamp · function · L30-L31 — def _clamp(x: float, lo: float, hi: float) -> float
- _mean_std · function · L34-L42 — def _mean_std(vals: List[float]) -> tuple[float, float]
- _pearson · function · L45-L56 — def _pearson(xs: List[float], ys: List[float]) -> float
- _rankdata · function · L59-L73 — def _rankdata(vals: List[float]) -> List[float]
- _spearman · function · L76-L79 — def _spearman(xs: List[float], ys: List[float]) -> float
- _verdict_score · function · L82-L87 — def _verdict_score(v: str) -> float
- run_screening_uq · function · L90-L193 — def run_screening_uq( *, base_power_W: float, base_beam_um: float, thermal_runner: Callable[[float, float, Optional[Dict[str, float]]], Dict[str, Any]], verdict_fn: Callable[[Dict[str, Any]], Dict[str, Any]], n_samples: int = DEFAULT_UQ_SAMPLES, seed: int = 42, ) -> Dict[str, Any]
- apply_uq_prop_scales · function · L196-L222 — def apply_uq_prop_scales(props: Dict[str, Any], overrides: Optional[Dict[str, float]]) -> Dict[str, Any]

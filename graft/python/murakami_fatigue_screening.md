# python/murakami_fatigue_screening.py

- parse_defect_sqrt_areas_text · function · L28-L43 — def parse_defect_sqrt_areas_text(text: Optional[str]) -> List[float]
- resolve_hardness_HV · function · L46-L51 — def resolve_hardness_HV(hardness_HV: Optional[float], alloy_id: Optional[str] = None) -> tuple[Optional[float], str]
- gumbel_fit_maxima · function · L54-L72 — def gumbel_fit_maxima(samples: List[float]) -> Optional[Dict[str, float]]
- murakami_fatigue_limit_MPa · function · L75-L79 — def murakami_fatigue_limit_MPa(sqrt_area_um: float, hardness_HV: float, location: str = "internal") -> float
- evaluate_murakami_block · function · L82-L140 — def evaluate_murakami_block( defect_sqrt_areas_um: Optional[List[float]], hardness_HV: Optional[float] = None, ct_detection_threshold_um: Optional[float] = None, alloy_id: Optional[str] = None, defect_paste: Optional[str] = None, ) -> Dict[str, Any]
- build_qualification_block · function · L167-L185 — def build_qualification_block(alloy_id: str, input_hash: str, git_sha: Optional[str] = None) -> Dict[str, Any]

# python/goldak_solver.py

- _erf · function · L22-L23 — def _erf(arr)
- goldak_fractions · function · L30-L36 — def goldak_fractions(af_m: float, ar_m: float) -> tuple[float, float]
- seed_goldak_axes · function · L39-L47 — def seed_goldak_axes(r0_m: float) -> dict
- GoldakField · class · L50-L124 — class GoldakField
- __init__ · method · L51-L76 — def __init__( self, T0_C: float, Q_W: float, rho: float, cp: float, alpha_th: float, af_m: float, ar_m: float, b_m: float, c_m: float, )
- bind_speed · method · L78-L85 — def bind_speed(self, v_scan_m_s: float) -> "GoldakField"
- temperature_C · method · L87-L124 — def temperature_C(self, x_m, y_m, z_m)

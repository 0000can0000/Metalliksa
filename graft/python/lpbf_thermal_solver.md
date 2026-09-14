# python/lpbf_thermal_solver.py

- classify_enthalpy_regime · function · L141-L146 — def classify_enthalpy_regime(normalized_enthalpy: float) -> str
- rosenthal_temperature_C · function · L149-L154 — def rosenthal_temperature_C(x_m, y_m, z_m, T0_C, P_eff, k_th, v_scan, alpha_th, r_reg)
- _binary_extent · function · L157-L169 — def _binary_extent(pred, lo, hi, iters=18)
- sample_thermal_slice · function · L172-L179 — def sample_thermal_slice(eval_T, axis_a, axis_b, na, nb)
- _normalize_heat_source · function · L182-L188 — def _normalize_heat_source(heat_source: str | None) -> str
- calculate_meltpool_physics · function · L191-L760 — def calculate_meltpool_physics( material_name: str, laser_power_W: float, scan_speed_mm_s: float, beam_diameter_um: float, preheat_temp_C: float = 80.0, layer_thickness_um: float = 40.0, hatch_spacing_um: float = 100.0, laser_wavelength: str = "IR_1064nm", incline_angle_deg: float = 0.0, process_seed: int = 42, prop_overrides: dict | None = None, heat_source: str | None = None, sulfur_ppm: float = 15.0, )
- T_field · function · L289-L290 — def T_field(x_m, y_m, z_m)
- T_field · function · L299-L300 — def T_field(x_m, y_m, z_m)
- T_field · function · L304-L305 — def T_field(x_m, y_m, z_m)
- T_xz · function · L542-L543 — def T_xz(x_um, z_um)
- T_yz · function · L545-L546 — def T_yz(y_um, z_um)

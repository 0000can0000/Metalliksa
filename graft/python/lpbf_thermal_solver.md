# python/lpbf_thermal_solver.py

- classify_enthalpy_regime · function · L142-L147 — def classify_enthalpy_regime(normalized_enthalpy: float) -> str
- rosenthal_temperature_C · function · L150-L155 — def rosenthal_temperature_C(x_m, y_m, z_m, T0_C, P_eff, k_th, v_scan, alpha_th, r_reg)
- _binary_extent · function · L158-L170 — def _binary_extent(pred, lo, hi, iters=18)
- sample_thermal_slice · function · L173-L180 — def sample_thermal_slice(eval_T, axis_a, axis_b, na, nb)
- _normalize_heat_source · function · L183-L189 — def _normalize_heat_source(heat_source: str | None) -> str
- calculate_meltpool_physics · function · L192-L791 — def calculate_meltpool_physics( material_name: str, laser_power_W: float, scan_speed_mm_s: float, beam_diameter_um: float, preheat_temp_C: float = 80.0, layer_thickness_um: float = 40.0, hatch_spacing_um: float = 100.0, laser_wavelength: str = "IR_1064nm", incline_angle_deg: float = 0.0, process_seed: int = 42, prop_overrides: dict | None = None, heat_source: str | None = None, sulfur_ppm: float = 15.0, )
- T_field · function · L301-L302 — def T_field(x_m, y_m, z_m)
- T_field · function · L311-L312 — def T_field(x_m, y_m, z_m)
- T_field · function · L316-L317 — def T_field(x_m, y_m, z_m)
- T_xz · function · L554-L555 — def T_xz(x_um, z_um)
- T_yz · function · L557-L558 — def T_yz(y_um, z_um)

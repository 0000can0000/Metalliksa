# python/pourbaix_solver.py

- calculate_nernst_slope · function · L448-L452 — def calculate_nernst_slope(temperature_C=25.0)
- generate_water_stability_lines · function · L454-L476 — def generate_water_stability_lines(temperature_C=25.0)
- calculate_chloride_pitting_boundary · function · L478-L521 — def calculate_chloride_pitting_boundary(element="Fe", temperature_C=25.0, chloride_ppm=0.0)
- evaluate_point_mechanism · function · L523-L889 — def evaluate_point_mechanism(element, ph, e_she, temperature_C=25.0, ion_act_log10=-6.0, chloride_ppm=0.0)
- solve_pourbaix_diagram · function · L891-L1059 — def solve_pourbaix_diagram(element="Fe", temperature_C=25.0, ion_activity_log10=-6.0, chloride_ppm=0.0, experimental_points=None)

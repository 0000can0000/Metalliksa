# python/xrd_peak_deconvolution.py

- pseudo_voigt_profile · function · L14-L30 — def pseudo_voigt_profile(two_theta, center, intensity, fwhm, eta)
- pearson_vii_profile · function · L32-L41 — def pearson_vii_profile(two_theta, center, intensity, fwhm, m)
- calculate_ka2_two_theta · function · L43-L55 — def calculate_ka2_two_theta(ka1_two_theta, wavelength_ka1=1.540598, wavelength_ka2=1.544426)
- deconvolve_peak_roi · function · L57-L217 — def deconvolve_peak_roi(points, center_guess, intensity_guess, fwhm_guess=0.25, profile_type="pseudo-voigt", eta=0.5, pearson_m=2.0, enable_ka2=True, ka2_ratio=0.5, ka2_fwhm_ratio=1.03, wavelength_ka1=1.540598, wavelength_ka2=1.544426)
- evaluate_model · function · L84-L105 — def evaluate_model(params, tt)
- loss_func · function · L108-L118 — def loss_func(params)
- solve_williamson_hall · function · L219-L324 — def solve_williamson_hall(peaks, wavelength_A=1.540598, shape_factor_K=0.94, burgers_vector_nm=0.25)

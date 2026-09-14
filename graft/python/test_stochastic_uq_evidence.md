# python/test_stochastic_uq_evidence.py

- SamplingEvidenceTests · class · L10-L81 — class SamplingEvidenceTests(unittest.TestCase)
- setUpClass · method · L12-L14 — def setUpClass(cls)
- test_single_run_does_not_invent_performance_or_effective_samples · method · L16-L24 — def test_single_run_does_not_invent_performance_or_effective_samples(self)
- test_qmc_uncertainty_is_unavailable_without_replicates · method · L26-L34 — def test_qmc_uncertainty_is_unavailable_without_replicates(self)
- test_material_distribution_baseline_preserved · method · L36-L41 — def test_material_distribution_baseline_preserved(self): # Recorded from the previous implementation, seed 42 / 500 draws.
- test_sensitivity_matches_actual_supplied_chemistry · method · L43-L54 — def test_sensitivity_matches_actual_supplied_chemistry(self)
- observe · function · L46-L48 — def observe(*args, **kwargs)
- test_raw_indices_are_not_clamped_or_normalized · method · L56-L62 — def test_raw_indices_are_not_clamped_or_normalized(self)
- test_constant_population_has_no_invented_sensitivity_or_cpk · method · L64-L73 — def test_constant_population_has_no_invented_sensitivity_or_cpk(self)
- test_sobol_dimensions_never_silently_repeat · method · L75-L77 — def test_sobol_dimensions_never_silently_repeat(self)
- test_discrepancy_is_a_point_set_diagnostic · method · L79-L81 — def test_discrepancy_is_a_point_set_diagnostic(self): # One centered 1D point has centered L2 squared discrepancy 1/12.

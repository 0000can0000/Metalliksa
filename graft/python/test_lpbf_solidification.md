# python/test_lpbf_solidification.py

- CrossingVerification · class · L14-L83 — class CrossingVerification(unittest.TestCase)
- setUp · method · L15-L17 — def setUp(self)
- rotating · method · L19-L22 — def rotating(self, t): # A static z gradient separates planes. Multiple cells cross; compare # their independently calculated event sums below.
- oracle · method · L24-L32 — def oracle(self, a, b)
- test_rotating_vectors_and_step_subdivision · method · L34-L43 — def test_rotating_vectors_and_step_subdivision(self)
- test_inactive_boundary_has_one_sided_gradient · method · L45-L54 — def test_inactive_boundary_has_one_sided_gradient(self)
- test_cancellation_zero_gradient_and_no_cooling · method · L56-L61 — def test_cancellation_zero_gradient_and_no_cooling(self): # Gradients +x and -x cancel at the centre's theta=.5 crossing.
- test_equality_counted_once_and_units · method · L63-L70 — def test_equality_counted_once_and_units(self)
- test_previous_extraction_binary_rejected · method · L73-L83 — def test_previous_extraction_binary_rejected(self)
- launch · function · L78-L80 — def launch(*args, **kwargs)

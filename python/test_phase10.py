import math
import unittest
from lpbf_experimental_validation import validate_experiment


class TestPhase10(unittest.TestCase):
    def compare(self, simulation=None, experiment=None):
        return validate_experiment({'laserPower_W': 250, 'scanSpeed_mms': 1000},
            {'id': 'ti64'}, simulation if simulation is not None else {'pdas_um': 1.5},
            experiment if experiment is not None else {'pdas_um': 1.6, 'source': 'Synthetic test pair'})

    def test_arithmetic_is_not_experimental_validation(self):
        result = self.compare()
        self.assertEqual(result['status'], 'comparison-only')
        self.assertEqual(result['validationStatus'], 'unvalidated')
        self.assertFalse(result['productionReady'])
        self.assertEqual(result['overallMatch'], 'unknown')
        self.assertEqual(result['metrics'][0]['status'], 'review')
        self.assertAlmostEqual(result['metrics'][0]['error_pct'], 6.25)
        self.assertEqual(result['metrics'][0]['source'], 'Synthetic test pair')
        self.assertEqual(result['traceability']['sourceIntegrity'], 'not-verified')

    def test_exact_match_does_not_qualify_model(self):
        result = self.compare({'keyhole_depth_um': 120}, {'keyhole_depth_um': 120, 'source': 'Synthetic'})
        self.assertEqual(result['metrics'][0]['error_pct'], 0)
        self.assertEqual(result['metrics'][0]['status'], 'review')
        self.assertEqual(result['overallMatch'], 'unknown')

    def test_empty_or_unpaired_metrics_fail(self):
        for simulation, experiment in [({}, {}), ({'pdas_um': 1}, {'source': 'test'}),
                ({'pdas_um': 1}, {'keyhole_depth_um': 2, 'source': 'test'})]:
            with self.subTest(simulation=simulation):
                with self.assertRaises(ValueError): self.compare(simulation, experiment)

    def test_invalid_numbers_and_zero_denominator_fail(self):
        for invalid in (True, '1.5', None, math.nan, math.inf, -1):
            with self.subTest(value=invalid):
                with self.assertRaises(ValueError): self.compare({'pdas_um': invalid})
                with self.assertRaises(ValueError): self.compare(experiment={'pdas_um': invalid, 'source': 'test'})
        with self.assertRaises(ValueError): self.compare(experiment={'pdas_um': 0, 'source': 'test'})

    def test_no_invented_material_process_or_source(self):
        for params, material, exp in [({}, {'id': 'ti64'}, {'pdas_um': 1.6, 'source': 'test'}),
            ({'laserPower_W': 250, 'scanSpeed_mms': 1000}, {}, {'pdas_um': 1.6, 'source': 'test'}),
            ({'laserPower_W': 250, 'scanSpeed_mms': 1000}, {'id': 'ti64'}, {'pdas_um': 1.6})]:
            with self.assertRaises(ValueError): validate_experiment(params, material, {'pdas_um': 1.5}, exp)


if __name__ == '__main__': unittest.main()

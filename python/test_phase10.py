import unittest
from lpbf_experimental_validation import validate_experiment

class TestPhase10(unittest.TestCase):
    def test_experimental_validation_ebsd(self):
        params = {'laserPower_W': 250, 'scanSpeed_mms': 1000}
        material = {'id': 'ti64'}
        sim_result = {'pdas_um': 1.5, 'sdas_um': 0.8}
        exp_data = {'pdas_um': 1.6, 'source': 'EBSD Measurement'}
        
        result = validate_experiment(params, material, sim_result, exp_data)
        self.assertEqual(result['status'], 'validated')
        self.assertIn('traceability', result)
        self.assertEqual(result['traceability']['evidenceSource'], 'EBSD Measurement')
        
        metrics = result['metrics']
        self.assertEqual(len(metrics), 1)
        self.assertEqual(metrics[0]['metric'], 'Primary Dendrite Arm Spacing (PDAS)')
        self.assertLess(metrics[0]['error_pct'], 10.0)
        self.assertEqual(metrics[0]['status'], 'pass')
        self.assertEqual(result['overallMatch'], 'high')

    def test_experimental_validation_ct(self):
        params = {'laserPower_W': 250, 'scanSpeed_mms': 1000}
        material = {'id': 'ti64'}
        sim_result = {'keyhole_depth_um': 120.0}
        exp_data = {'keyhole_depth_um': 150.0, 'source': 'X-Ray CT'}
        
        result = validate_experiment(params, material, sim_result, exp_data)
        metrics = result['metrics']
        self.assertEqual(len(metrics), 1)
        self.assertEqual(metrics[0]['metric'], 'Keyhole Depth')
        self.assertEqual(metrics[0]['status'], 'review')
        self.assertEqual(result['overallMatch'], 'moderate')

if __name__ == '__main__':
    unittest.main()

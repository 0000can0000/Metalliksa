import copy
import tempfile
import unittest
from pathlib import Path
from benchmark_manifest import HDF5_SIGNATURE, local_file, sha256, verify


class BenchmarkManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.file = self.root / 'signal.h5'
        self.file.write_bytes(HDF5_SIGNATURE + b'synthetic fixture, not real HDF5 data')
        self.manifest = {'schema_version': 1, 'dataset_id': 'synthetic-test', 'version': '1', 'material': 'IN718',
                         'process_scope': 'bare-plate', 'citation': 'Synthetic unit test', 'split': 'unassigned',
                         'files': [{'path': 'signal.h5', 'kind': 'raw-thermography', 'source_url': 'https://data.nist.gov/example',
                                    'bytes': self.file.stat().st_size, 'sha256': sha256(self.file)}]}

    def test_intact_raw_data_never_becomes_validation_or_training(self):
        self.manifest['calibrated'] = True  # Untrusted flag cannot promote data.
        result = verify(self.manifest, self.root)
        self.assertEqual(result['integrity'], 'pass')
        self.assertTrue(result['module_readiness']['source_archive']['ready'])
        for module in ('thermal_validation', 'powder_bed_validation', 'ml_training'):
            self.assertFalse(result['module_readiness'][module]['ready'])

    def test_mutation_missing_and_wrong_format_fail(self):
        self.file.write_bytes(b'X' * self.file.stat().st_size)
        report = verify(self.manifest, self.root)
        self.assertEqual(report['integrity'], 'fail')
        self.assertIn('SHA-256 mismatch', report['files'][0]['errors'])
        self.assertIn('HDF5 signature missing', report['files'][0]['errors'])
        self.file.unlink()
        self.assertEqual(verify(self.manifest, self.root)['files'][0]['errors'], ['missing file'])

    def test_path_escape_and_duplicate_rejected(self):
        for path in ('../outside', '/outside', 'C:/outside', '..\\outside', ''):
            with self.assertRaises(ValueError): local_file(self.root, path)
        self.manifest['files'].append(copy.deepcopy(self.manifest['files'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate'): verify(self.manifest, self.root)

    def test_invalid_provenance_and_metadata_rejected(self):
        for url in ('http://data.nist.gov/x', 'https://data.nist.gov.evil.test/x', 'https://user@data.nist.gov/x'):
            changed = copy.deepcopy(self.manifest); changed['files'][0]['source_url'] = url
            with self.assertRaises(ValueError): verify(changed, self.root)
        for key, value in (('sha256', '123'), ('bytes', True), ('kind', 'temperature')):
            changed = copy.deepcopy(self.manifest); changed['files'][0][key] = value
            with self.assertRaises(ValueError): verify(changed, self.root)


if __name__ == '__main__':
    unittest.main()

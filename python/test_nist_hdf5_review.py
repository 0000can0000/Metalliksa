import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import h5py
import numpy as np
from nist_hdf5_review import inspect_hdf5


class Hdf5ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.file = Path(self.temp.name) / 'synthetic.h5'

    def test_metadata_preserves_malformed_model_and_never_reads_signal(self):
        with h5py.File(self.file, 'w') as f:
            cal = f.create_group('Calibration')
            cal.attrs['Model'] = 'T(x)=bad('
            cal.attrs['Coeff'] = np.array([0., 2.])
            signal = f.create_dataset('Signal', shape=(40001, 640, 304), dtype='uint16', chunks=(25, 25, 25))
            signal.attrs['units'] = 'digital levels'
        with patch.object(h5py.Dataset, '__getitem__', side_effect=AssertionError('Signal read forbidden')):
            rows = inspect_hdf5(self.file)
        self.assertEqual([row['path'] for row in rows], ['/', '/Calibration', '/Signal'])
        self.assertEqual(rows[1]['attributes']['Model'], 'T(x)=bad(')
        self.assertEqual(rows[1]['attributes']['Coeff'], [0., 2.])
        self.assertEqual(rows[2]['shape'], [40001, 640, 304])
        self.assertEqual(rows[2]['attributes']['units'], 'digital levels')
        self.assertNotIn('values', rows[2])

    def test_external_soft_and_cyclic_links_are_rejected(self):
        for kind in ('external', 'soft', 'cycle'):
            with self.subTest(kind=kind):
                with h5py.File(self.file, 'w') as f:
                    if kind == 'external': f['outside'] = h5py.ExternalLink('outside.h5', '/')
                    elif kind == 'soft': f['alias'] = h5py.SoftLink('/')
                    else: f['cycle'] = f['/']
                with self.assertRaisesRegex(ValueError, 'link|cycle|alias'):
                    inspect_hdf5(self.file)

    def test_oversized_attributes_fail_instead_of_silently_truncating_evidence(self):
        with h5py.File(self.file, 'w') as f:
            f.attrs['oversized'] = np.zeros(4097)
        with self.assertRaisesRegex(ValueError, 'attribute'):
            inspect_hdf5(self.file)

    def test_nonfinite_metadata_is_rejected(self):
        with h5py.File(self.file, 'w') as f:
            f.attrs['invalid'] = float('nan')
        with self.assertRaisesRegex(ValueError, 'finite'):
            inspect_hdf5(self.file)


if __name__ == '__main__':
    unittest.main()

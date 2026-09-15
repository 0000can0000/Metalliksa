import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import cmu_ti64_import as importer


def table(name, row):
    return ','.join(importer.HEADERS[name]) + '\n' + row + '\n'


class CmuTi64Tests(unittest.TestCase):
    def test_missing_single_track_power_is_not_inferred(self):
        rows = importer.parse_measurements(table('STMeasurements.csv', '1,0,1300,147,148,19'), 'STMeasurements.csv')
        self.assertIsNone(rows[0]['power_W'])
        self.assertIsNone(rows[0]['condition_group_candidate'])
        self.assertEqual(rows[0]['remelt_depth_um'], 148)
        self.assertEqual(rows[0]['cap_height_um'], 19)
        self.assertEqual(rows[0]['source']['line'], 2)
        self.assertEqual(rows[0]['split'], 'unassigned')

    def test_repeated_slices_and_orientations_stay_in_same_candidate_group(self):
        text = table('MTMeasurements.csv', '1,0,370,1300,200,240,20') + '6,315,370,1300,210,245,25\n'
        rows = importer.parse_measurements(text, 'MTMeasurements.csv')
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['condition_group_candidate'], rows[1]['condition_group_candidate'])
        self.assertNotEqual(rows[0]['id'], rows[1]['id'])
        self.assertTrue(all(row['independent_build_id'] is None for row in rows))

    def test_missing_sentinel_remains_null_with_field_identity(self):
        row = importer.parse_measurements(table('MTMeasurements.csv', '-1,-1,-1,1300,-1,240,-1'), 'MTMeasurements.csv')[0]
        self.assertIsNone(row['slice'])
        self.assertIsNone(row['width_um'])
        self.assertIn('Width (um)', row['missing_fields'])
        self.assertIsNone(row['condition_group_candidate'])

    def test_invalid_values_fail_without_partial_records(self):
        for invalid in ['NaN', 'inf', '', 'bad', '0', '-2']:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                importer.parse_measurements(table('STMeasurements.csv', f'1,0,1300,{invalid},148,19'), 'STMeasurements.csv')
        for row in ['0,0,1300,147,148,19', '1.5,0,1300,147,148,19', '1,360,1300,147,148,19']:
            with self.assertRaises(ValueError):
                importer.parse_measurements(table('STMeasurements.csv', row), 'STMeasurements.csv')

    def test_units_columns_and_blank_rows_are_not_silently_reinterpreted(self):
        valid = table('STMeasurements.csv', '1,0,1300,147,148,19')
        for invalid in [valid.replace('Width (um)', 'Width (mm)'), valid + '\n', valid.replace('148,19', '148'), valid.replace('148,19', '148,19,20')]:
            with self.assertRaises(ValueError):
                importer.parse_measurements(invalid, 'STMeasurements.csv')

    def fixture(self, directory):
        root = Path(directory)
        (root / 'raw').mkdir()
        tables = {
            'STMeasurements.csv': table('STMeasurements.csv', '1,0,1300,147,148,19'),
            'MTMeasurements.csv': table('MTMeasurements.csv', '1,0,370,1300,200,240,20'),
            'README.txt': 'Synthetic unit test fixture, not experimental evidence.',
        }
        pins, entries = {}, []
        for index, (name, text) in enumerate(tables.items()):
            payload = text.encode()
            (root / 'raw' / name).write_bytes(payload)
            md5 = hashlib.md5(payload).hexdigest()
            pins[name] = (index, len(payload), md5)
            entries.append({'name': name, 'path': f'raw/{name}', 'source_url': f'https://ndownloader.figshare.com/files/{index}',
                            'bytes': len(payload), 'publisher_md5': md5, 'sha256': hashlib.sha256(payload).hexdigest()})
        manifest = {'schema_version': 1, 'doi': importer.DOI, 'files': entries}
        (root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
        return root, pins, manifest

    def test_integrity_pins_reject_mutation_and_metadata_relabeling(self):
        with tempfile.TemporaryDirectory() as directory:
            root, pins, manifest = self.fixture(directory)
            with patch.object(importer, 'PUBLISHER_FILES', pins):
                self.assertEqual(len(importer.verified_payloads(root, manifest)), 3)
                for key, value in [('path', '../outside'), ('source_url', 'https://example.org/file'), ('publisher_md5', '0'*32), ('sha256', '0'*64)]:
                    changed = copy.deepcopy(manifest)
                    changed['files'][0][key] = value
                    with self.assertRaises(ValueError):
                        importer.verified_payloads(root, changed)
                file = root / 'raw' / 'STMeasurements.csv'
                file.write_bytes(file.read_bytes().replace(b'147', b'146'))
                with self.assertRaisesRegex(ValueError, 'Publisher MD5 mismatch'):
                    importer.verified_payloads(root, manifest)

    def test_complete_archive_never_promotes_data_or_assigns_holdouts(self):
        with tempfile.TemporaryDirectory() as directory:
            root, pins, manifest = self.fixture(directory)
            manifest.update(eligibility={'ml_training': True}, split='holdout')
            (root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
            with patch.object(importer, 'PUBLISHER_FILES', pins), patch.object(importer, 'EXPECTED_ROWS', {'STMeasurements.csv': 1, 'MTMeasurements.csv': 1}):
                report = importer.import_archive(root)
            self.assertEqual(len(report['records']), 2)
            self.assertTrue(all(value is False for value in report['eligibility'].values()))
            self.assertTrue(all(row['split'] == 'unassigned' and len(row['source']['sha256']) == 64 for row in report['records']))

    def test_missing_duplicate_and_wrong_version_archives_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            root, pins, manifest = self.fixture(directory)
            with patch.object(importer, 'PUBLISHER_FILES', pins):
                for changed in [{**manifest, 'schema_version': True}, {**manifest, 'doi': 'wrong-version'}, {**manifest, 'files': manifest['files'][:2]}, {**manifest, 'files': [manifest['files'][0]] * 3}]:
                    with self.assertRaises(ValueError):
                        importer.verified_payloads(root, changed)


if __name__ == '__main__':
    unittest.main()

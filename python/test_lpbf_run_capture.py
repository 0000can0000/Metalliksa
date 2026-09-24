"""Isolated capture integrity; synthetic solver output is not experiment evidence."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from lpbf_simulation import run
from lpbf_run_capture import capture_run


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root/'case').mkdir()
        (self.root/'case'/'empty').write_bytes(b'')
        (self.root/'case'/'field').write_bytes(b'synthetic nested output')
        self.result = run({'mode': 'screening'}, artifact_dir=self.root)
        self.save()

    def save(self):
        (self.root/'result.json').write_text(json.dumps(self.result), encoding='utf-8')

    def test_full_manifest_and_python_snapshots(self):
        captured = capture_run(self.root, 'a'*32)
        self.assertEqual(captured['contractStatus'], 'core-v1-bound')
        self.assertNotIn('runKind', captured)
        self.assertEqual(json.loads(captured['materialJson']), self.result['material'])
        self.assertEqual(hashlib.sha256(captured['inputJson'].encode()).hexdigest(),
                         self.result['coreContract']['inputSha256'])
        self.assertEqual(len(json.loads(captured['resultJson'])['artifacts']), 2)
        self.assertNotIn('executionRuntime', self.result['provenance'])

    def test_classification_comes_from_the_captured_result(self):
        self.result.pop('coreContract')
        self.result['runKind'] = 'build-screening'
        self.result['settings']['jobType'] = 'build-job'
        self.save()
        self.assertEqual(capture_run(self.root, 'a'*32)['runKind'], 'build-screening')
        self.result['settings']['jobType'] = 'gpu-thermal-pilot'
        self.save()
        with self.assertRaisesRegex(ValueError, 'captured build-job settings'):
            capture_run(self.root, 'a'*32)
        self.result['runKind'] = 'transient-thermal'
        self.result['settings'].pop('jobType')
        self.save()
        self.assertEqual(capture_run(self.root, 'a'*32)['runKind'], 'transient-thermal')

    def test_missing_changed_or_unlisted_output_fails(self):
        for action in ('changed', 'missing', 'extra'):
            with self.subTest(action=action):
                file = self.root/'case'/'field'
                file.write_bytes(b'synthetic nested output')
                if action == 'changed': file.write_bytes(b'bad')
                if action == 'missing': file.unlink()
                if action == 'extra': (self.root/'extra').write_bytes(b'new')
                with self.assertRaises((ValueError, OSError)):
                    capture_run(self.root, 'a'*32)

    def test_drift_unsafe_duplicate_null_fail(self):
        original = json.loads(json.dumps(self.result))
        for action in ('settings', 'path', 'duplicate', 'null'):
            with self.subTest(action=action):
                self.result = json.loads(json.dumps(original))
                if action == 'settings': self.result['settings']['power_W'] += 1
                if action == 'path': self.result['artifacts'][0]['path'] = '../outside'
                if action == 'duplicate': self.result['artifacts'].append(self.result['artifacts'][0])
                if action == 'null': self.result['coreContract'] = None
                self.save()
                with self.assertRaises(ValueError): capture_run(self.root, 'a'*32)

    def test_legacy_is_explicit_not_upgraded(self):
        del self.result['coreContract']
        self.save()
        captured = capture_run(self.root, 'a'*32)
        self.assertEqual(captured['contractStatus'], 'legacy-unbound')
        self.assertNotIn('coreContract', json.loads(captured['resultJson']))

    def test_queue_executes_and_captures_actual_runtime(self):
        from lpbf_worker import Queue
        queue = Queue(self.root/'queue', start=False)
        self.addCleanup(queue.close)
        job = queue.submit({'mode': 'screening'})['id']
        with self.assertRaisesRegex(ValueError, 'completed'): queue.capture(job)
        queue.update(job, status='running')
        queue.execute(job)
        captured = queue.capture(job)
        located = queue.archive_capture(job)
        self.assertEqual(located['capture'], captured)
        self.assertEqual(located['root'], str(queue.root.absolute()))
        self.assertEqual(located['platform'], __import__('sys').platform)
        result = json.loads(captured['resultJson'])
        self.assertTrue(result['provenance']['executionRuntime']['executable'])
        self.assertTrue(result['provenance']['executionRuntime']['numpy'])
        self.assertEqual({a['path'] for a in result['artifacts']}, {'input.json', 'capabilities.json'})
        with self.assertRaises(ValueError): queue.capture('../outside')

    def test_build_job_queue_capture_is_screening_and_keeps_core_contract_unbound(self):
        from lpbf_worker import Queue
        queue = Queue(self.root/'build-queue', start=False)
        self.addCleanup(queue.close)
        job = queue.submit({'jobType': 'build-job', 'alloyId': 'in718'})['id']
        queue.update(job, status='running')
        queue.execute(job)
        captured = queue.capture(job)
        result = json.loads(captured['resultJson'])
        self.assertEqual(captured['runKind'], 'build-screening')
        self.assertEqual(result['runKind'], 'build-screening')
        self.assertEqual(result['settings']['jobType'], 'build-job')
        self.assertNotIn('coreContract', result)
        self.assertEqual(captured['contractStatus'], 'legacy-unbound')


if __name__ == '__main__': unittest.main()

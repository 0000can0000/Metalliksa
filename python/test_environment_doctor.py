import contextlib
import io
import json
import subprocess
import types
import unittest
from unittest.mock import patch

import environment_doctor as doctor


class EnvironmentDoctorTests(unittest.TestCase):
    def test_timeout_is_reported(self):
        with patch.object(doctor.subprocess, 'run', side_effect=subprocess.TimeoutExpired('x', 1)):
            self.assertEqual(doctor.run_command(['x'], 1)['status'], 'timeout')

    def test_missing_executable(self):
        with patch.object(doctor.shutil, 'which', return_value=None):
            self.assertEqual(doctor.tool_probe('missing', [], 1)['status'], 'unavailable')

    def test_probe_banner_does_not_break_json(self):
        result = doctor.python_probe("print('banner')\ndata = {'value': 3}", 5)
        self.assertEqual(result, {'status': 'ok', 'value': 3})

    def test_failed_import_is_reported(self):
        result = doctor.dependency_probe('no_such_doctor_package', 'no_such_doctor_package', 5)
        self.assertEqual(result['status'], 'error')

    def test_import_version(self):
        result = doctor.dependency_probe('not_a_distribution', 'json', 5)
        self.assertTrue(result['imported'])
        self.assertIn('version', result)

    def test_invalid_probe_json(self):
        with patch.object(doctor, 'run_command', return_value={'status': 'ok', 'stdout': 'bad'}):
            self.assertEqual(doctor.python_probe('', 1)['status'], 'error')

    def test_cuda_unavailable_does_not_start_training(self):
        fake_torch = types.SimpleNamespace(__version__='test', version=types.SimpleNamespace(cuda=None),
                                          cuda=types.SimpleNamespace(is_available=lambda: False,
                                                                     device_count=lambda: 0))
        def execute_probe(body, timeout):
            namespace = {}
            with patch.dict('sys.modules', {'torch': fake_torch}):
                exec(body, namespace)
            return namespace['data']
        with patch.object(doctor, 'python_probe', side_effect=execute_probe):
            result = doctor.cuda_probe(3, smoke=True)
        self.assertEqual(result['status'], 'unavailable')
        self.assertIn('no CPU fallback', result['error'])

    def test_client_and_engine_are_independent_and_optional_work_skipped(self):
        def tool(name, args, timeout):
            return {'status': 'error' if args[0] == 'info' else 'ok'}
        with patch.object(doctor, 'DEPENDENCIES', {}), \
             patch.object(doctor, 'tool_probe', side_effect=tool) as tools, \
             patch.object(doctor.shutil, 'which', return_value='/example/tool'), \
             patch.object(doctor, 'cuda_probe', return_value={'status': 'ok', 'available': True}) as cuda:
            report = doctor.collect_report()
        self.assertEqual(report['tools']['docker']['status'], 'ok')
        self.assertIn('docker_engine', report['gaps'])
        self.assertEqual(report['gpu_smoke']['status'], 'not_requested')
        cuda.assert_called_once_with(20)
        self.assertFalse(any(call.args[0] == 'paraview' for call in tools.call_args_list))

    def test_strict_exit_and_json(self):
        for strict, expected in (([], 0), (['--strict'], 1)):
            output = io.StringIO()
            with patch.object(doctor, 'collect_report', return_value={'gaps': ['cuda']}), contextlib.redirect_stdout(output):
                self.assertEqual(doctor.main(strict), expected)
            self.assertEqual(json.loads(output.getvalue()), {'gaps': ['cuda']})

    def test_timeout_rejects_nonfinite_and_nonpositive(self):
        for value in ('nan', 'inf', '0', '-1'):
            with self.assertRaises(doctor.argparse.ArgumentTypeError):
                doctor.positive_timeout(value)


if __name__ == '__main__':
    unittest.main()

"""Result identity and compatibility; no experimental validation claim."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

from lpbf_simulation import run, validate
from lpbf_evidence import enforce_thermal_balances
from lpbf_core_contract import build_core_contract


class CoreContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.screen = run({'mode': 'screening'})
        cls.thermal = run(dict(mode='standard', backend='reference', power_W=40,
            mesh_um=40, trackLength_um=200, cooling_s=.0001, dwell_s=0))

    def test_new_results_bind_actual_model_and_material(self):
        self.assertIn('coreContract', self.thermal)
        c = self.thermal['coreContract']
        self.assertEqual(c['actualBackend'], 'numpy-reference')
        self.assertEqual(c['modelId'], 'stationary-enthalpy-conduction-v1')
        self.assertEqual(c['evidenceClass'], 'unvalidated-model')
        self.assertEqual(c['units']['beamDiameter'], '1/e2-intensity')
        self.assertTrue(c['resolvedPhysics']['latentHeat'])
        self.assertFalse(c['resolvedPhysics']['momentum'])
        self.assertRegex(c['materialSha256'], r'^[a-f0-9]{64}$')
        enforce_thermal_balances(self.thermal)
        # Recorded pre-change CPU profile, unchanged numerical acceptance.
        self.assertAlmostEqual(self.thermal['metrics']['peakTemperature_K'], 2119.81011401591, places=8)
        self.assertAlmostEqual(self.thermal['metrics']['volume_um3'], 192000, places=6)

    def test_layer_conforming_grid_has_separate_model_identity(self):
        settings, material = validate(dict(
            mode='standard', backend='reference', powderGridPolicy='layer-conforming'))
        contract = build_core_contract(settings, material, 'enthalpy-fv-6', 'standard')
        self.assertEqual(contract['modelId'], 'stationary-enthalpy-conduction-layer-conforming-v1')

    def test_result_boundary_detects_changed_inputs_and_properties(self):
        for kind in ('settings', 'material', 'solver'):
            with self.subTest(kind=kind):
                r = copy.deepcopy(self.thermal)
                if kind == 'settings': r['settings']['power_W'] += 1
                elif kind == 'material': r['material']['table'][0][2] += 1
                else: r['solver']['id'] = 'unknown-solver'
                with self.assertRaisesRegex(ValueError, 'core contract'):
                    enforce_thermal_balances(r)

    def test_material_revision_binding_detects_changed_snapshot(self):
        r = copy.deepcopy(self.thermal)
        r['material']['source'] += '; modified after resolution'
        with self.assertRaisesRegex(ValueError, 'material revision'):
            enforce_thermal_balances(r)

    def test_legacy_material_without_revision_binding_remains_supported(self):
        from lpbf_core_contract import build_core_contract
        r = copy.deepcopy(self.thermal)
        for key in ('materialId', 'provenanceClass', 'materialIdentitySchemaVersion',
                    'materialRevisionSha256'):
            r['material'].pop(key)
        r['coreContract'] = build_core_contract(r['settings'], r['material'],
                                                r['solver']['id'], r['effectiveMode'])
        enforce_thermal_balances(r)

    def test_present_invalid_contract_is_not_legacy(self):
        for contract in (None, {}, {'schemaVersion': True}, {'schemaVersion': 999}):
            with self.subTest(contract=contract):
                r = copy.deepcopy(self.screen)
                r['coreContract'] = contract
                with self.assertRaisesRegex(ValueError, 'core contract'):
                    enforce_thermal_balances(r)

    def test_contract_forgery_is_rejected(self):
        self.assertIn('coreContract', self.screen)
        patches = [('actualBackend', 'cuda:0'), ('evidenceClass', 'validated'),
                   ('schemaVersion', True), ('schemaVersion', 1.0), ('inputSha256', '0'*64)]
        for key, value in patches:
            r = copy.deepcopy(self.screen)
            r['coreContract'][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                enforce_thermal_balances(r)
        for key, name, value in [('units', 'temperature', 'degC'), ('resolvedPhysics', 'momentum', True)]:
            r = copy.deepcopy(self.screen)
            r['coreContract'][key][name] = value
            with self.assertRaises(ValueError): enforce_thermal_balances(r)

    def test_legacy_absence_is_preserved(self):
        r = copy.deepcopy(self.thermal)
        r.pop('coreContract', None)
        enforce_thermal_balances(r)
        self.assertNotIn('coreContract', r)

    def test_corrupt_saved_binding_is_failed_and_not_reused(self):
        from lpbf_worker import Queue
        with tempfile.TemporaryDirectory() as tmp:
            queue = Queue(tmp, start=False)
            job = queue.submit(self.thermal['settings'])
            r = copy.deepcopy(self.thermal)
            r['material']['table'][0][2] += 1
            (Path(tmp)/job['id']/'result.json').write_text(json.dumps(r))
            queue.update(job['id'], status='completed')
            restored = queue.get(job['id'])
            self.assertEqual(restored['status'], 'failed')
            self.assertIn('core contract', restored['error'])
            self.assertNotIn('result', restored)
            self.assertNotEqual(queue.submit(self.thermal['settings'])['id'], job['id'])

    def test_high_fidelity_fallback_is_analytical(self):
        r = run({'mode': 'high-fidelity', 'backend': 'openfoam-thermal'})
        self.assertIn('coreContract', r)
        self.assertEqual(r['coreContract']['actualBackend'], 'analytical')
        self.assertEqual(r['coreContract']['effectiveMode'], 'screening')
        self.assertFalse(r['coreContract']['resolvedPhysics']['latentHeat'])
        self.assertEqual(r['validationStatus'], 'unvalidated')

    def test_pure_backend_mapping_and_hash_order(self):
        from lpbf_core_contract import build_core_contract
        p, m = self.thermal['settings'], self.thermal['material']
        a = build_core_contract(p, m, 'enthalpy-fv-6', 'standard')
        b = build_core_contract(dict(reversed(list(p.items()))), dict(reversed(list(m.items()))), 'enthalpy-fv-6', 'standard')
        self.assertEqual(a, b)
        for solver, backend in [('enthalpy-fv-6', 'numpy-reference'),
                                ('metalliksaThermal-OpenFOAM14-6', 'openfoam-thermal')]:
            c = build_core_contract({**p, 'backend': 'auto'}, m, solver, 'standard')
            self.assertEqual(c['actualBackend'], backend)
        for solver, mode, requested in [('unknown', 'standard', 'auto'),
                ('enthalpy-fv-6', 'screening', 'auto'), ('rosenthal+goldak', 'standard', 'auto'),
                ('enthalpy-fv-6', 'standard', 'openfoam-thermal'),
                ('metalliksaThermal-OpenFOAM14-6', 'standard', 'reference')]:
            with self.subTest(solver=solver, mode=mode), self.assertRaises(ValueError):
                build_core_contract({**p, 'backend': requested}, m, solver, mode)


if __name__ == '__main__':
    unittest.main()

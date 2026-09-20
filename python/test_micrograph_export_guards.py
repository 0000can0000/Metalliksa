"""Availability regressions; no training, downloads or generated model artifacts."""
import builtins
import contextlib
import importlib.util
import io
from pathlib import Path
import runpy
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

import train_micrograph_segmentation as training

MODULE = Path(training.__file__)


class MicrographExportGuards(unittest.TestCase):
    def test_missing_optional_dependency_never_installs_at_import(self):
        original_import = builtins.__import__

        def without_smp(name, *args, **kwargs):
            if name == 'segmentation_models_pytorch':
                raise ImportError('controlled missing optional dependency')
            return original_import(name, *args, **kwargs)

        spec = importlib.util.spec_from_file_location('isolated_micrograph_training', MODULE)
        module = importlib.util.module_from_spec(spec)
        with patch('builtins.__import__', side_effect=without_smp), patch('os.system', side_effect=AssertionError('Import attempted a package installation')):
            spec.loader.exec_module(module)
        self.assertIsNone(module.smp)

    def test_nonpositive_epochs_rejected_before_model_or_data_work(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(training.smp, 'Unet', side_effect=AssertionError('Untrained model constructed')):
                for epochs in [0, -1]:
                    with self.subTest(epochs=epochs), self.assertRaisesRegex(ValueError, 'epochs'):
                        training.train_model(epochs=epochs, data_dir=directory, device='cpu')

    def test_unverified_model_cannot_be_exported_or_create_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'untrained.onnx'
            with self.assertRaisesRegex(RuntimeError, 'unavailable|trained|provenance'):
                training.export_to_onnx(object(), output_path=output)
            self.assertFalse(output.exists())

    def test_missing_data_pipeline_fails_before_model_download_or_construction(self):
        original_import = builtins.__import__

        def without_pipeline(name, *args, **kwargs):
            if name == 'lpbf_real_dataset_pipeline':
                raise ImportError('controlled missing data pipeline')
            return original_import(name, *args, **kwargs)

        with tempfile.TemporaryDirectory() as directory:
            with patch('builtins.__import__', side_effect=without_pipeline), patch.object(training.smp, 'Unet', side_effect=AssertionError('Model created before dataset availability check')):
                with self.assertRaisesRegex(RuntimeError, 'pipeline.*unavailable'):
                    training.train_model(epochs=1, data_dir=directory, device='cpu')

    def test_export_only_cli_fails_before_random_architecture_creation(self):
        error = io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(sys, 'argv', [str(MODULE), '--data-dir', directory, '--export-only']), patch.object(training.smp, 'Unet', side_effect=AssertionError('Random network constructed')), contextlib.redirect_stderr(error):
                with self.assertRaises(SystemExit) as stopped:
                    runpy.run_path(str(MODULE), run_name='__main__')
            self.assertEqual(stopped.exception.code, 2)
            self.assertRegex(error.getvalue(), 'unavailable|trained|provenance')

    def test_empty_data_splits_cannot_create_a_trained_checkpoint(self):
        class EmptyPipeline:
            def __init__(self, path): pass
            def scan_and_ingest_all(self): pass
            def split_and_save_manifest(self): pass
            def get_segmentation_dataloaders(self, batch_size): return [], [], []

        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(sys.modules, {'lpbf_real_dataset_pipeline': types.SimpleNamespace(RealDataIngestionPipeline=EmptyPipeline)}), patch.object(training.smp, 'Unet', side_effect=AssertionError('Model created with no training data')):
                with self.assertRaisesRegex(RuntimeError, 'Nonempty training and validation'):
                    training.train_model(epochs=1, data_dir=directory, device='cpu')

    def test_invalid_hyperparameters_rejected_before_initialization(self):
        for params in [{'batch_size': 0}, {'lr': float('nan')}, {'lr': -1}, {'epochs': True}]:
            with self.subTest(params=params), self.assertRaises(ValueError):
                training.train_model(**params)


if __name__ == '__main__':
    unittest.main()

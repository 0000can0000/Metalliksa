"""Verify local benchmark integrity and module eligibility without promoting raw data."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
from urllib.parse import urlsplit

HDF5_SIGNATURE = b'\x89HDF\r\n\x1a\n'


def local_file(root, relative):
    if not isinstance(relative, str) or '\\' in relative:
        raise ValueError('Use a repository-relative POSIX file path')
    parts = PurePosixPath(relative)
    if parts.is_absolute() or '..' in parts.parts or ':' in relative or not parts.parts:
        raise ValueError('Benchmark path must remain inside the dataset directory')
    root = Path(root).resolve()
    file = (root / relative).resolve()
    if not file.is_relative_to(root):
        raise ValueError('Benchmark path escapes dataset directory')
    return file


def sha256(file):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def verify(manifest, root):
    if manifest.get('schema_version') != 1:
        raise ValueError('Unsupported manifest schema')
    for key in ('dataset_id', 'version', 'material', 'process_scope', 'citation'):
        if not isinstance(manifest.get(key), str) or not manifest[key].strip():
            raise ValueError('Missing dataset metadata: ' + key)
    if manifest.get('split') not in ('unassigned', 'calibration', 'holdout', 'training'):
        raise ValueError('Explicit split assignment required')
    if manifest['material'] != 'IN718' or manifest['process_scope'] != 'bare-plate':
        raise ValueError('This adapter only supports IN718 bare-plate source archives')
    files = manifest.get('files')
    if not isinstance(files, list) or not files:
        raise ValueError('Nonempty file manifest required')
    seen, results = set(), []
    for item in files:
        relative = item['path']
        file = local_file(root, relative)
        normalized = str(file).casefold()
        if normalized in seen:
            raise ValueError('Duplicate benchmark file')
        seen.add(normalized)
        url = urlsplit(item['source_url'])
        if url.scheme != 'https' or url.hostname != 'data.nist.gov' or url.username or url.password or url.port not in (None, 443):
            raise ValueError('This NIST adapter requires an official HTTPS source URL')
        if not re.fullmatch('[0-9a-f]{64}', item.get('sha256', '')):
            raise ValueError('Invalid SHA-256')
        size = item.get('bytes')
        if type(size) is not int or size <= 0:
            raise ValueError('Positive byte count required')
        if item.get('kind') not in ('raw-thermography', 'scan-strategy', 'readme'):
            raise ValueError('Unsupported benchmark file kind')
        errors = []
        if not file.is_file():
            errors.append('missing file')
        else:
            if file.stat().st_size != size:
                errors.append('byte count mismatch')
            if sha256(file) != item['sha256']:
                errors.append('SHA-256 mismatch')
            if item['kind'] != 'readme':
                with file.open('rb') as stream:
                    if stream.read(8) != HDF5_SIGNATURE:
                        errors.append('HDF5 signature missing')
        results.append({'path': relative, 'kind': item['kind'], 'integrity': 'pass' if not errors else 'fail', 'errors': errors})
    intact = all(item['integrity'] == 'pass' for item in results)
    # Raw detector signal cannot become calibrated temperature through metadata flags.
    return {'schema_version': 1, 'dataset_id': manifest['dataset_id'], 'files': results,
            'integrity': 'pass' if intact else 'fail',
            'integrity_scope': 'Matches locally recorded bytes; not an independently supplied publisher checksum',
            'material': manifest['material'], 'process_scope': manifest['process_scope'],
            'split': manifest['split'], 'module_readiness': {
                'source_archive': {'ready': intact, 'reason': 'File identity checks only'},
                'thermal_validation': {'ready': False, 'reason': 'Raw detector signal requires camera calibration, timing, geometry and a reviewed temperature conversion'},
                'powder_bed_validation': {'ready': False, 'reason': 'Bare-plate data cannot establish powder-bed validation'},
                'ml_training': {'ready': False, 'reason': 'Requires reviewed features/targets and group-separated training/calibration/holdout records'}},
            'production_ready': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    args = parser.parse_args()
    try:
        report = verify(json.loads(args.manifest.read_text(encoding='utf-8')), args.manifest.parent)
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(json.dumps({'integrity': 'fail', 'error': str(error)}))
        return 2
    print(json.dumps(report, indent=2))
    return 0 if report['integrity'] == 'pass' else 1


if __name__ == '__main__':
    raise SystemExit(main())

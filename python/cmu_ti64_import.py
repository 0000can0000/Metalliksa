"""Offline CMU v1 measurement import; never assigns training or validation eligibility."""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path

DOI = '10.1184/R1/25696293.v1'
PUBLISHER_FILES = {
    'STMeasurements.csv': (45867030, 8002, '8117111633a6facf565ddc155da4e35e'),
    'MTMeasurements.csv': (45867027, 15548, 'de147a56b2fb8b60558218c41feff3d9'),
    'README.txt': (46532239, 6441, 'de1c685aef4f0919d32a5ffb83b2790d'),
}
COMMON = ['Slice', 'Orientation (degrees)', 'Velocity (mm/s)', 'Width (um)', 'Depth (um)', 'Cap (um)']
HEADERS = {'STMeasurements.csv': COMMON, 'MTMeasurements.csv': COMMON[:2] + ['Power (W)'] + COMMON[2:]}
EXPECTED_ROWS = {'STMeasurements.csv': 216, 'MTMeasurements.csv': 410}


def verified_payloads(root, manifest):
    if (not isinstance(manifest, dict) or type(manifest.get('schema_version')) is not int
            or manifest.get('schema_version') != 1 or manifest.get('doi') != DOI):
        raise ValueError('Expected CMU Ti-6Al-4V version 1 manifest')
    files = manifest.get('files')
    if not isinstance(files, list) or len(files) != 3:
        raise ValueError('Exactly three archived files are required')
    root = Path(root).resolve()
    payloads = {}
    for item in files:
        if not isinstance(item, dict) or item.get('name') not in PUBLISHER_FILES:
            raise ValueError('Unknown CMU source file')
        name = item['name']
        if name in payloads:
            raise ValueError('Duplicate CMU source file')
        file_id, size, publisher_md5 = PUBLISHER_FILES[name]
        expected_url = f'https://ndownloader.figshare.com/files/{file_id}'
        if (item.get('path') != f'raw/{name}' or item.get('source_url') != expected_url
                or item.get('publisher_md5') != publisher_md5 or type(item.get('bytes')) is not int
                or item.get('bytes') != size):
            raise ValueError('Source metadata differs from the pinned publisher record')
        file = (root / item['path']).resolve()
        if not file.is_relative_to(root):
            raise ValueError('Source file escapes archive')
        if file.stat().st_size != size:
            raise ValueError(f'Byte count mismatch: {name}')
        payload = file.read_bytes()
        if hashlib.md5(payload).hexdigest() != publisher_md5:
            raise ValueError(f'Publisher MD5 mismatch: {name}')
        if hashlib.sha256(payload).hexdigest() != item.get('sha256'):
            raise ValueError(f'Local SHA-256 mismatch: {name}')
        payloads[name] = payload
    return payloads


def parse_measurements(text, filename):
    """Strict table conversion, also usable with synthetic parser fixtures in tests."""
    if filename not in HEADERS or len(text) > 2_000_000:
        raise ValueError('Unsupported or oversized measurement table')
    reader = csv.reader(io.StringIO(text, newline=''), strict=True)
    if next(reader, None) != HEADERS[filename]:
        raise ValueError(f'Unexpected columns or units: {filename}')
    records = []
    for values in reader:
        line = reader.line_num
        if len(values) != len(HEADERS[filename]):
            raise ValueError(f'Invalid column count at {filename}:{line}')
        parsed, missing = {}, []
        for key, value in zip(HEADERS[filename], values):
            if not value.strip():
                raise ValueError(f'Blank value at {filename}:{line}; expected documented -1 sentinel')
            try:
                number = float(value)
            except ValueError as error:
                raise ValueError(f'Invalid number at {filename}:{line}: {key}') from error
            if not math.isfinite(number):
                raise ValueError(f'Nonfinite number at {filename}:{line}: {key}')
            if number == -1:
                parsed[key] = None
                missing.append(key)
                continue
            if key == 'Slice' and (number < 1 or not number.is_integer()):
                raise ValueError('Slice must be a positive integer or missing')
            if key == 'Orientation (degrees)' and not 0 <= number < 360:
                raise ValueError('Orientation must be in [0, 360) or missing')
            if key in ('Power (W)', 'Velocity (mm/s)', 'Width (um)', 'Depth (um)') and number <= 0:
                raise ValueError(f'{key} must be positive or missing')
            if key == 'Cap (um)' and number < 0:
                raise ValueError('Cap must be nonnegative or missing')
            parsed[key] = number
        power = parsed.get('Power (W)')
        if 'Power (W)' not in parsed:
            missing.append('Power (W): absent from source CSV')
        # Coarse condition grouping deliberately keeps orientations and slices together.
        # It is not evidence of independent builds or an approved holdout split.
        group = None if power is None or parsed['Velocity (mm/s)'] is None else f"P{power:g}-V{parsed['Velocity (mm/s)']:g}"
        records.append({
            'id': f'cmu-ti64-v1:{filename}:{line}', 'source': {'doi': DOI, 'file': filename, 'line': line},
            'material': 'Ti-6Al-4V', 'track_scope': 'single-track' if filename.startswith('ST') else 'multi-track',
            'machine': {'model': 'EOS M290', 'basis': 'dataset landing-page description', 'source_doi': DOI},
            'unresolved_conditions': ['beam profile/diameter', 'layer thickness', 'powder lot', 'thermal boundary conditions'],
            'evidence': 'source-reported measurement', 'split': 'unassigned',
            'slice': int(parsed['Slice']) if parsed['Slice'] is not None else None,
            'orientation_deg': parsed['Orientation (degrees)'], 'power_W': power,
            'velocity_mm_s': parsed['Velocity (mm/s)'],
            'width_um': parsed['Width (um)'], 'remelt_depth_um': parsed['Depth (um)'], 'cap_height_um': parsed['Cap (um)'],
            'missing_fields': missing, 'condition_group_candidate': group,
            'independent_build_id': None,
        })
    if not records:
        raise ValueError('Empty measurement table')
    return records


def import_archive(root):
    root = Path(root)
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8-sig'))
    payloads = verified_payloads(root, manifest)
    records, counts = [], {}
    for filename in HEADERS:
        rows = parse_measurements(payloads[filename].decode('utf-8-sig'), filename)
        if len(rows) != EXPECTED_ROWS[filename]:
            raise ValueError(f'Unexpected row count: {filename}')
        for row in rows:
            row['source']['sha256'] = hashlib.sha256(payloads[filename]).hexdigest()
        counts[filename] = len(rows)
        records.extend(rows)
    return {'schema_version': 1, 'doi': DOI, 'integrity': 'pass', 'license': 'CC BY 4.0',
            'attribution': 'Justin Miner and Sneha Prabha Narra (2024), Carnegie Mellon University',
            'counts': counts, 'records': records,
            'limitations': ['ST CSV lacks Power (W), contrary to README; power remains null.',
                            'ST measurements were not used in the associated manuscript.',
                            'Depth represents source-described remelt depth; do not silently add cap height.',
                            'Beam, layer, powder lot, thermal boundary and independent build IDs are unresolved.',
                            'Condition groups are candidates only; no independent holdout split is assigned.',
                            'MT powder-entrained geometry must not be silently substituted for single-track predictions.'],
            'eligibility': {'solver_comparison': False, 'ml_training': False, 'independent_validation': False}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--summary', action='store_true', help='Omit individual records from stdout')
    args = parser.parse_args()
    try:
        report = import_archive(args.archive)
        if args.summary:
            report.pop('records')
        print(json.dumps(report, indent=2, allow_nan=False))
    except (ValueError, TypeError, KeyError, OSError, csv.Error) as error:
        print(json.dumps({'integrity': 'fail', 'error': str(error)}))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

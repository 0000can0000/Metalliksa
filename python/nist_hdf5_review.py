"""Inspect source HDF5 metadata without reading signal arrays or evaluating models."""
import argparse
import json
import math
from pathlib import Path
import sys

from benchmark_manifest import local_file, verify


def inspect_hdf5(filename):
    # Optional review dependency; the application worker does not import this tool.
    import h5py
    import numpy as np

    rows, seen = [], set()
    attribute_count = 0

    def value(raw):
        if isinstance(raw, np.ndarray):
            if raw.size > 4096: raise ValueError('Oversized HDF5 attribute')
            return value(raw.tolist())
        if isinstance(raw, np.generic): return value(raw.item())
        if isinstance(raw, bytes): raw = raw.decode('utf-8', errors='strict')
        if isinstance(raw, str):
            if len(raw) > 8192: raise ValueError('Oversized HDF5 attribute text')
            return raw
        if isinstance(raw, list): return [value(item) for item in raw]
        if isinstance(raw, (bool, int)): return raw
        if isinstance(raw, float) and math.isfinite(raw): return raw
        raise ValueError('Expected finite, JSON-compatible HDF5 attribute')

    def visit(obj, depth=0):
        nonlocal attribute_count
        if len(rows) >= 2000 or depth > 16: raise ValueError('HDF5 metadata traversal limit exceeded')
        address = h5py.h5o.get_info(obj.id).addr
        if address in seen: raise ValueError('HDF5 cycle or hard-link alias is not supported')
        seen.add(address)
        attributes = {}
        for name in obj.attrs:
            attribute_count += 1
            if attribute_count > 10000: raise ValueError('HDF5 attribute count limit exceeded')
            attribute = obj.attrs.get_id(name)
            try:
                if math.prod(attribute.shape) > 4096: raise ValueError('Oversized HDF5 attribute')
            finally:
                attribute.close()
            attributes[name] = value(obj.attrs[name])
        row = {'path': obj.name, 'kind': 'dataset' if isinstance(obj, h5py.Dataset) else 'group', 'attributes': attributes}
        if isinstance(obj, h5py.Dataset):
            row.update(shape=list(obj.shape), dtype=str(obj.dtype), chunks=obj.chunks, compression=obj.compression)
        rows.append(row)
        if isinstance(obj, h5py.Group):
            for name in sorted(obj):
                if not isinstance(obj.get(name, getlink=True), h5py.HardLink):
                    raise ValueError('External and soft HDF5 links are not supported')
                visit(obj[name], depth + 1)

    with h5py.File(filename, 'r') as file:
        visit(file)
    return rows


def review(manifest_path):
    import h5py
    import numpy as np
    manifest_path = Path(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    root = manifest_path.parent
    integrity = verify(manifest, root)
    if integrity['integrity'] != 'pass': raise ValueError('Source archive integrity failed before inspection')
    files = [{'path': item['path'], 'sha256': item['sha256'], 'objects': inspect_hdf5(local_file(root, item['path']))}
             for item in manifest['files'] if item['kind'] != 'readme']
    if verify(manifest, root)['integrity'] != 'pass': raise ValueError('Source archive changed during inspection')
    return {'schema_version': 1, 'dataset_id': manifest['dataset_id'], 'source_version': manifest['version'],
            'scope': 'HDF5 attributes and dataset layout only; no dataset values read or calibration model evaluated',
            'evidence_status': 'unreviewed-source-archive', 'temperature_conversion': None,
            'runtime': {'python': sys.version.split()[0], 'h5py': h5py.__version__, 'numpy': np.__version__},
            'integrity': integrity, 'files': files}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--output', type=Path, help='Create a new metadata report; existing files are never overwritten')
    args = parser.parse_args()
    try:
        serialized = json.dumps(review(args.manifest), indent=2, allow_nan=False) + '\n'
        if args.output:
            with args.output.open('x', encoding='utf-8', newline='\n') as stream: stream.write(serialized)
        else: print(serialized, end='')
    except (ImportError, ValueError, KeyError, TypeError, OSError) as error:
        print(f'HDF5 source review unavailable: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

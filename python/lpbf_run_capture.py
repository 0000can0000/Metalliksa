"""Internal, read-only completed-job capture. No browser paths or new job queue.

The application owns the directory; hostile concurrent filesystem mutation is
outside this boundary. Import must recheck bytes after a dry run.
"""
import hashlib
import json
from pathlib import Path
import re
from lpbf_evidence import enforce_thermal_balances

MAX_JSON_BYTES = 16 * 1024 * 1024
EXCLUDED = {'result.json', 'result.tmp', 'progress.log'}
RUN_KINDS = {'build-screening', 'transient-thermal', 'legacy-unspecified'}


def _directory(folder):
    folder = Path(folder).absolute()
    for parent in [*reversed(folder.parents), folder]:
        if parent.is_symlink() or getattr(parent, 'is_junction', lambda: False)():
            raise ValueError('Capture directory must not contain links')
        if not parent.is_dir(): raise ValueError('Capture directory unavailable')
    return folder


def _path(name):
    if not isinstance(name, str) or len(name) > 512 or re.search(r'[\\:\x00-\x1f]', name):
        raise ValueError('Invalid capture artifact path')
    for part in name.split('/'):
        if (not part or part in ('.', '..') or part.endswith(('.', ' '))
                or re.match(r'^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)', part, re.I)):
            raise ValueError('Invalid capture artifact path')


def capture_run(folder, job_id):
    if not isinstance(job_id, str) or not re.fullmatch('[a-f0-9]{32}', job_id):
        raise ValueError('Invalid capture job id')
    folder = _directory(folder)
    result_path = folder/'result.json'
    if result_path.is_symlink() or not result_path.is_file() or result_path.stat().st_size > MAX_JSON_BYTES:
        raise ValueError('Invalid capture result file')
    result_json = result_path.read_bytes().decode('utf-8')
    result = json.loads(result_json)
    run_kind = result.get('runKind')
    if run_kind is not None and (not isinstance(run_kind, str) or run_kind not in RUN_KINDS):
        raise ValueError('Invalid captured run kind')
    settings = result.get('settings')
    if run_kind == 'build-screening' and (not isinstance(settings, dict)
            or settings.get('jobType') != 'build-job'):
        raise ValueError('Build screening classification requires captured build-job settings')
    if run_kind == 'transient-thermal' and (not isinstance(settings, dict)
            or settings.get('jobType') not in (None, 'transient-thermal')):
        raise ValueError('Transient thermal classification conflicts with captured settings')
    enforce_thermal_balances(result)
    refs = result.get('artifacts')
    if not isinstance(refs, list) or len(refs) > 10000:
        raise ValueError('Capture requires a bounded complete artifact manifest')
    expected, folded = set(), set()
    for ref in refs:
        if not isinstance(ref, dict) or set(ref) != {'path', 'size_bytes', 'sha256'}:
            raise ValueError('Invalid capture manifest entry')
        name = ref['path']; _path(name)
        size, sha = ref['size_bytes'], ref['sha256']
        if (name.lower() in folded or name in EXCLUDED or type(size) is not int
                or size < 0 or size > 2**53-1 or not isinstance(sha, str)
                or not re.fullmatch('[a-f0-9]{64}', sha)):
            raise ValueError('Invalid or duplicate capture artifact')
        expected.add(name); folded.add(name.lower())
    actual = set()
    for file in folder.rglob('*'):
        if file.is_symlink() or getattr(file, 'is_junction', lambda: False)():
            raise ValueError('Capture artifact must not be a link')
        if file.is_dir(): continue
        if not file.is_file(): raise ValueError('Capture requires regular files')
        name = file.relative_to(folder).as_posix()
        if name not in EXCLUDED: actual.add(name)
    if actual != expected: raise ValueError('Capture manifest does not cover all output files')
    for ref in refs:
        file = folder/ref['path']
        before = file.stat()
        digest = hashlib.sha256(); size = 0
        with file.open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024*1024), b''):
                digest.update(chunk); size += len(chunk)
        after = file.stat()
        if (size != ref['size_bytes'] or digest.hexdigest() != ref['sha256']
                or (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns)):
            raise ValueError('Capture artifact integrity failed')
    encoded = lambda value: json.dumps(value, sort_keys=True, separators=(',', ':'),
                                      ensure_ascii=True, allow_nan=False)
    # Reject nonfinite values even in fields outside the numerical evidence guard.
    encoded(result)
    if result_path.read_bytes().decode('utf-8') != result_json:
        raise ValueError('Capture result changed during verification')
    return dict(schemaVersion=1, jobId=job_id, resultJson=result_json,
                inputJson=encoded(result['settings']), materialJson=encoded(result['material']),
                contractStatus='core-v1-bound' if 'coreContract' in result else 'legacy-unbound',
                **({'runKind': run_kind} if run_kind is not None else {}))

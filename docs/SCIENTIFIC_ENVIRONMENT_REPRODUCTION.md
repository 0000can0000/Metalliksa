# Reproduce the Windows scientific and CUDA environment

`python/requirements-scientific-win-py312-cu128.lock` captures 94 distributions from the checked engineering workstation, excluding the pip bootstrap. It includes all dependencies declared in `python/requirements.txt`, CUDA PyTorch, and the installed mesh/VTK tools. It is a workstation snapshot, not a minimal deployment image.

Scope: Windows x64, CPython **3.12.10**, pip **25.0.1**, PyTorch **2.11.0+cu128**, CUDA runtime **12.8**, torchvision **0.26.0+cu128**, torchaudio **2.11.0+cu128**. The checked GPU is NVIDIA GeForce RTX 4060 Laptop with driver 610.88. The lock does not install or pin Windows, the NVIDIA driver, Python itself, Docker Desktop, WSL or standalone ParaView. Other platforms require their own verified artifacts.

## Download, then install offline

Run from the repository root with Python 3.12 available. Use a new destination; preserve any active environment.

```powershell
py -3.12 -m pip download --only-binary=:all: --require-hashes --dest .runtime/scientific-wheels -r python/requirements-scientific-win-py312-cu128.lock
if ($LASTEXITCODE -ne 0) { throw 'Scientific wheel download failed' }
if (Test-Path .runtime/scientific-win-py312-cu128) { throw 'Choose a new clean environment directory' }
py -3.12 -m venv .runtime/scientific-win-py312-cu128
if ($LASTEXITCODE -ne 0) { throw 'Environment creation failed' }
& .runtime/scientific-win-py312-cu128/Scripts/python.exe -m pip install --no-index --find-links .runtime/scientific-wheels --only-binary=:all: --require-hashes -r python/requirements-scientific-win-py312-cu128.lock
if ($LASTEXITCODE -ne 0) { throw 'Offline hashed installation failed' }
& .runtime/scientific-win-py312-cu128/Scripts/python.exe -m pip check
if ($LASTEXITCODE -ne 0) { throw 'Installed dependency conflict' }
```

The lock includes the official PyTorch CUDA index for download. All distributions are exact-pinned and hash-checked. `--no-index` disables indexes for the installation phase; retain the wheel directory if offline recovery is needed. The smaller [CPU LPBF environment](LPBF_CPU_REPRODUCTION.md) remains available for workloads that do not need this full stack.

## Verify execution

```powershell
$env:PYTHONDONTWRITEBYTECODE = '1'
& .runtime/scientific-win-py312-cu128/Scripts/python.exe -B python/check_requirement_ranges.py
if ($LASTEXITCODE -ne 0) { throw 'Repository requirement mismatch' }
& .runtime/scientific-win-py312-cu128/Scripts/python.exe -B python/environment_doctor.py --gpu-smoke --paraview-version --timeout 40
& .runtime/scientific-win-py312-cu128/Scripts/python.exe -B python/test_lpbf_engineering.py
& .runtime/scientific-win-py312-cu128/Scripts/python.exe -B python/test_cmu_ti64_import.py
```

`check_requirement_ranges.py` checks the root scientific requirements against installed distribution versions. It rejects unsupported pip directives, extras and direct URLs instead of ignoring them; it respects environment markers. Exit codes are 0 for satisfied applicable requirements, 1 for missing/incompatible distributions and 2 for invalid input. Run `python/test_requirement_ranges.py` for its six regression checks.

The doctor checks the selected Python and the current process PATH. Add the actual Docker and ParaView `bin` directories to that process's PATH when checking portable installations. `--strict` can enforce a nonzero exit for any reported gap. Keep real missing capabilities visible; imports do not validate a solver or a trained model.

Follow [clean application reproduction](APPLICATION_REPRODUCTION.md) to launch Node with `METALLIX_PYTHON` set to this environment's absolute executable. Verify the API reports the expected version and transport. The initial WSL worker still uses WSL Python; host CUDA availability does not qualify WSL dependencies.

## Maintenance

Regenerate from a reviewed complete environment, resolve all matching Windows wheels, capture each artifact SHA-256, and repeat offline installation into a new venv. A requirements resolution or `pip freeze` alone is insufficient evidence. Preserve lock changes, commands, actual results and remaining limitations in the operational log. Never infer physical-model accuracy from installation success.

## Observed clean run — 2026-09-15

The new `.runtime/scientific-win-py312-cu128` environment installed all 94 locked wheels with `--no-index --require-hashes`. An installed-metadata comparison matched all 94 versions exactly; pip bootstrap was 25.0.1 and `pip check` passed. This is a separate new environment, not the repaired installation-workspace venv.

From this exact new interpreter: all 18 declared dependencies imported, all 18 repository requirement ranges passed, and the environment doctor exited 0 under `--strict --gpu-smoke --paraview-version` with no gaps (Docker/ParaView directories added only to the test process PATH). CUDA performed three finite SGD steps with changed weights; losses were 4.215446, 4.025282 and 3.844670. Requirement-checker tests passed 6/6, doctor tests 10/10, CPU LPBF tests 25 passed / 1 explicit OpenFOAM skip in 16.700s, and CMU importer tests passed 8/8. The separate WSL run passed all 26 engineering tests, including OpenFOAM.

The previously clean-built Node snapshot `1fc10dd` was started with this new interpreter on unused ports 3016/5058. HTML and `/api/python/status` passed: Python 3.12.10, HTTP transport, 17 named imports, subsystem status unverified. The test process tree was stopped. The user's 3015 preview continues using the repaired installation-workspace GPU venv.

The [versioned evidence record](evidence/a02-environment-2026-09-15.json) records the lock hash, exact dependency versions, scope and limits. These checks complete the environment execution evidence; independent review and roadmap acceptance are recorded separately.

## Independent review and A02 acceptance

On 2026-09-15, the independent Codex `inventory_review` agent checked the exact sources and records, matched the lock SHA-256 and all 94 clean installed versions, and verified consistency of interpreter, import/range, CUDA, API and test evidence. It found no material acceptance gap and recommended A02 technical environment acceptance. The range checker also received independent source review. Graph access was unavailable; direct source/record inspection was used.

A02 is accepted within its explicit workstation/software scope. This is AI-assisted technical review, not human scientific approval, experimental validation or industrial qualification. Operating system/tool installers remain outside the Python package lock, and the stated workflow limits still apply.

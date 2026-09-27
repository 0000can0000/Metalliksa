# Metalliksa current status

**Snapshot: 27 September 2026**

## Product state

Metalliksa is a research engineering prototype focused on a traceable LPBF workflow. The engineering checkout is on `codex/lpbf-buildjob-material-identity`, 40 commits ahead of its remote branch at the last check, and contains local work that is not a `main` release.

The current objective is to preserve one material/process/run identity through CPU, PyTorch CUDA, and opt-in Warp execution and through the application evidence workflow. A solver result or passing software check alone does not establish experimental validation or production readiness.

## Evidence and open gates

- Selected same-input CPU/Torch and CPU/Warp numerical checks pass. A bounded native Warp queue run also passed ten stored comparisons and readback checks for its captured artifacts. It does not establish Warp support in the persistent application archive contract.
- A real browser GPU job failed the parity gate because CPU and GPU endpoint sampling differed. A roundoff-sized final-step difference added a GPU step; fix the shared endpoint rule without changing the frozen acceptance limits.
- A three-repeat alternating Torch/Warp pilot measured a case-specific median ratio of 1.294x. A separate CPU-source/CUDA-source Torch pilot measured 1.019x. The differences are small, single-session observations without device-kernel attribution; they do not justify a default change or a general speed claim.
- The frozen fine-grid/time convergence result remains inconclusive.
- IN718 measurement candidates have not passed source/input/observable matching and remain unvalidated. IN625 is admitted only for bounded screening; full-transient admission and experimental validation remain false.
- A bounded CPU browser archive/export/import/restore workflow passed for one short software acceptance case. General workflow acceptance and the persistent GPU run/archive/export/restore path remain open.
- No production-release, standards-compliance, or independent experimental-validation claim is established by these checks.

## Next work

Resolve the endpoint-sampling parity failure, preserve exact identity while integrating or withholding Warp from the persistent archive contract, and complete same-run API/browser checks. Keep convergence, IN718, and IN625 limits visible. Profile representative matched runs before making performance claims.

Use [ROADMAP.md](ROADMAP.md) for priorities, [docs/ACTIVE_WORK.md](docs/ACTIVE_WORK.md) for the current coordination checkpoint, and [docs/README.md](docs/README.md) for the document map. Dated measurements and command-level evidence belong in [PROOF.md](PROOF.md) and [sonkayıtlar/LOG.md](sonkayıtlar/LOG.md); this file is a short snapshot, not a second event log.

# Active LPBF work — 27 September 2026

This file is a short coordination checkpoint, not a chronological work log.
The detailed dated evidence stays in `../PROOF.md` and `../sonkayıtlar/LOG.md`.

## Scope

Complete the shared LPBF material/process identity and reproducible run path.
The current implementation package adds opt-in Warp v2 execution and binds
CPU/Torch/Warp runs to the same input, material, solver, and backend identity.
The integration path includes capture, archive, export, isolated restore, and
the browser workflow. Keep Torch v1 behavior unchanged. EIS/EDS and unrelated
modules are deferred.

## Current evidence

- Selected CPU/Torch and CPU/Warp same-input parity checks pass; see the dated
  `PROOF.md` entries for exact cases and limits.
- The current three-repeat pilot reports Warp/Torch median ratio 1.294x and
  Torch CPU/CUDA ratio 1.019x. No device-kernel timing is available. Do not
  change the default backend or claim a general speedup from this pilot.
- Fine scan-end CPU mesh/time checks are complete, but the frozen convergence
  result remains inconclusive.
- IN718 remains unvalidated. IN625 remains screening-only; neither gate is
  widened by numerical parity or archive integrity.
- Work is taking place in the shared local checkout on
  `codex/lpbf-buildjob-material-identity`. Its changes may not be merged to
  `main`; verify the live Git state before describing them as released.

## Ownership and next acceptance

- The implementation owner controls the Warp v2 worker, solver, and focused
  tests. Torch v1 stays unchanged.
- The integration owner controls the TypeScript/server/UI archive boundary,
  documentation, evidence review, and final acceptance. Independent reviewers
  remain read-only until explicitly assigned a path.
- First finish exact run identity and artifact binding; then verify API and
  browser export, reload, and isolated restore on the same saved run.
- Next profile representative matched backends and optimize only a measured
  bottleneck. Preserve the current convergence and experimental gates.
- Commit only after the package acceptance review and the user-requested
  shared-checkout workflow. This note does not authorize staging or pushing.

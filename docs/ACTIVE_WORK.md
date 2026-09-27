# Active LPBF coordination — 27 September 2026

This file coordinates parallel work; it is not a second status or evidence log. Use [STATUS.md](../STATUS.md) for current findings, [ROADMAP.md](../ROADMAP.md) for product priorities, and [PROOF.md](../PROOF.md) for dated evidence.

## Scope

Complete the shared LPBF material/process identity and reproducible run path across CPU, PyTorch CUDA, and opt-in Warp v2. Keep Torch v1 behavior stable. Defer EIS/EDS and unrelated modules while these acceptance gates remain open.

## Work ownership

- The implementation owner changes only the assigned solver, worker, integration, and focused test paths.
- The integration owner checks identity and artifacts across execution, persistent storage, API, export/import, and browser restore.
- Independent reviewers stay read-only unless assigned specific paths. Record accepted findings and their evidence in `PROOF.md`; keep this file limited to ownership and the next coordination steps.

## Next coordination steps

1. Resolve the GPU endpoint-sampling mismatch against the CPU reference without loosening frozen parity criteria.
2. Integrate Warp v2 into the persistent run/archive contract only if its solver and material identity remain exact; otherwise keep it diagnostic-only.
3. Verify export, reload, comparison, and isolated restore on the same saved run through the API and browser.
4. Revisit the frozen convergence assessment, performance profiling, and alloy/measurement gates only with their separate evidence requirements.

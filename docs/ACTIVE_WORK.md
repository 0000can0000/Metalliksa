# Active LPBF work — 27 September 2026

This is a short coordination snapshot. Dated measurements remain in `../PROOF.md` and `../sonkayıtlar/LOG.md`.

## Scope

Complete the shared LPBF material/process identity and a reproducible run path across CPU, PyTorch CUDA, and opt-in Warp v2. Preserve Torch v1 behavior. EIS/EDS and unrelated modules are deferred while the LPBF acceptance gates remain open.

## Current evidence

- Selected CPU/Torch and CPU/Warp same-input numerical checks pass. A bounded native Warp queue case passed its captured field comparisons and artifact readback; the public persistent archive contract remains Torch-bound.
- A real browser GPU job failed parity because the final accepted sampling differed from the CPU reference by a roundoff-sized endpoint step. Keep the frozen criteria and fix the endpoint rule before claiming parity for that path.
- The alternating three-repeat pilot measured Torch/Warp median ratio 1.294x. The separate Torch source integration pilot measured CPU/CUDA ratio 1.019x. No device-kernel profiler attribution is available; these are case-specific observations, not a default-backend or general speedup basis.
- Fine-grid/time convergence remains inconclusive. IN718 is unvalidated; IN625 remains screening-only.
- A bounded CPU browser archive/export/import/restore case passed. General GPU workflow acceptance remains open.
- The shared local checkout has unpublished work; its current status is not a `main` release.

## Next acceptance

1. Fix the GPU endpoint-sampling mismatch without changing frozen tolerances.
2. Bind Warp v2 state and artifacts to the persistent run identity, or retain diagnostic-only status until the archive contract passes.
3. Verify API and browser export, reload, comparison, and isolated restore on the same saved run.
4. Finish the frozen convergence assessment and profile representative matched backends before optimizing.
5. Keep alloy and independent-measurement gates separate from software/numerical checks.

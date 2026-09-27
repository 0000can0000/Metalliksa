# Metalliksa product roadmap

**Updated: 27 September 2026**

Metalliksa is a traceable research workstation for metal additive manufacturing. The product goal is to help a materials or process engineer inspect LPBF inputs, run bounded engineering analyses, compare results with evidence, and preserve enough provenance to reproduce the review.

The current priority is a dependable LPBF workflow with an explicit shared material/process identity and durable run evidence. New modules and advanced physics stay behind the same evidence gates; adding a solver alone does not move the product toward release readiness.

## Product position

- The application supports research and engineering screening. It does not issue production release, certified material allowables, or standards qualification.
- Numerical verification, calibrated simulation, and independent experimental validation are separate evidence states.
- CPU, PyTorch CUDA, and Warp CUDA results are comparable only when the physical inputs, material law, mesh, boundary conditions, time-step policy, and observation operator match.
- Recent parity and energy checks cover selected cases. The current GPU timing pilot is not sufficient to claim a general speedup or change the default backend.
- Fine-grid/time convergence remains inconclusive. The available IN718 comparison is unvalidated; IN625 remains screening-only until the required source properties and uncertainty are admitted.
- Some current engineering work is in a local shared checkout and may not yet be merged to `main`. Check the dated evidence and Git state before presenting implementation status as a released capability.

## Work priorities

| Priority | Workstream | Exit condition |
| --- | --- | --- |
| 1 | Run identity and evidence continuity | Inputs, material revision, solver/backend identity, source bytes, and result artifacts remain bound through run, archive, export, and restore. Interrupted or duplicate work is visible and is not silently rerun. |
| 2 | Complete user workflow | A user can select a bounded case, run it, inspect evidence and missing data, compare it, export it, restore it in isolation, and reopen it after reload. API and browser checks cover the same identity. |
| 3 | CPU/GPU numerical parity | CPU, PyTorch CUDA, and Warp CUDA pass predeclared same-input field, energy, accepted-step, and melt-geometry checks. Each engine's actual execution mode is recorded. |
| 4 | Measured performance | Representative workloads use predeclared alternating repeats; startup, queue, transfer, computation, and archive time are reported separately. Profiling identifies the limiting cost. A speedup is claimed only when it exceeds measurement variation and parity still passes. |
| 5 | Experimental and alloy admission | A reference matches the model's regime, geometry, scan history, observation definition, and uncertainty. New alloys enter only with source-backed required properties and declared applicability. Calibration data and independent holdout data remain separate. |
| 6 | Release readiness | Failure states, packaging, reproducibility, evidence, and independent review are complete for the specific intended use. Open scientific limits remain visible. |

## Current sequence

1. Finish identity-preserving CPU/Torch/Warp run capture and the archive export/restore path.
2. Complete API and real-browser checks for the same saved run; preserve unavailable evidence instead of substituting a proxy.
3. Close or explicitly retain the frozen mesh/time-convergence result. Do not loosen its acceptance limits after seeing the result.
4. Profile matched backends, then optimize only a measured bottleneck and rerun the same-input parity checks.
5. Reassess the IN718 and IN625 source gates. Keep both claims unvalidated or screening-only until their specific evidence requirements pass.

Detailed, dated observations belong in [PROOF.md](PROOF.md) and the [session log](sonkayıtlar/LOG.md). The current short status is in [STATUS.md](STATUS.md); active coordination is in [docs/ACTIVE_WORK.md](docs/ACTIVE_WORK.md). The old phase-based plan is retained only as history in [the archive](docs/archive/README.md).

## Deferred scope

Do not expand into unrelated EIS/EDS or add another physics workflow while the run, parity, convergence, and evidence gates above remain open. Candidate scientific questions are collected in the [research vision](docs/SCIENTIFIC_RESEARCH_VISION.md); they are not current product commitments.

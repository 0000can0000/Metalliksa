# Metalliksa product roadmap

**Updated: 27 September 2026**

Metalliksa is a traceable research workstation for metal additive manufacturing. It helps materials and process engineers review LPBF inputs and bounded analyses alongside material context and source-linked evidence.

The product goal is to make technical investigations easier to inspect and reproduce. Customer demand, measurable operational benefits, and willingness to pay remain hypotheses until validated with users and pilot data.

## Product position

- The application supports research and engineering screening. It does not issue production release decisions, certified material allowables, or standards qualification.
- Numerical verification, calibrated simulation, and independent experimental validation are separate evidence states.
- CPU, PyTorch CUDA, and Warp CUDA results are comparable only when inputs, material law, mesh, boundary conditions, time-step policy, and observation method match.
- Selected same-input CPU/Torch and CPU/Warp checks pass. A native Warp queue run also passed its bounded capture and artifact-integrity checks; this does not establish general product archive support.
- A real browser GPU run still failed its parity gate because the GPU endpoint sampling differed from the CPU reference. Keep the issue open until the same run passes without loosening the frozen criteria.
- The fine-grid/time convergence result remains inconclusive. Available IN718 measurement candidates are not admitted for experimental validation; IN625 remains screening-only.
- The local shared engineering checkout is ahead of its remote branch and is not a release. Confirm the live Git state before describing local work as available on `main`.

## Work priorities

| Priority | Workstream | Exit condition |
| --- | --- | --- |
| 1 | Same-run identity and evidence continuity | Inputs, material revision, solver/backend identity, source bytes, and result artifacts stay bound through execution, capture, archive, export, and restore. |
| 2 | Browser and API workflow | A user can run, inspect, archive, export, restore, reload, and compare the same saved case. Each path reports missing evidence and preserves failures. |
| 3 | CPU/GPU numerical parity | CPU, PyTorch CUDA, and Warp CUDA pass predeclared same-input field, energy, accepted-step, and melt-geometry criteria. The actual execution mode is recorded. |
| 4 | Convergence and performance evidence | Frozen mesh/time criteria are resolved without post-hoc threshold changes. Representative alternating timings and profiler attribution separate queue, transfer, compute, and archive costs. |
| 5 | Experimental and alloy admission | A reference matches regime, geometry, scan history, observation method, and uncertainty. New alloys enter broader models only with source-backed properties and declared applicability. |
| 6 | Intended-use readiness | Packaging, failure behavior, reproducibility, evidence, and independent review are complete for a defined use; remaining scientific limits stay visible. |

## Current sequence

1. Fix the GPU endpoint-sampling mismatch against the existing CPU reference rule; preserve the frozen parity limits.
2. Integrate Warp v2 identity and artifacts into the durable application archive path, or keep it explicitly diagnostic-only until that contract passes.
3. Complete same-run API/browser export, restore, reload, and comparison checks for CPU, Torch, and Warp paths.
4. Retain the inconclusive fine-grid/time result until its predeclared assessment is complete; profile matched backends before proposing performance changes.
5. Keep IN718 experimental comparison unvalidated and IN625 screening-only until their separate evidence gates pass.

Dated observations belong in [PROOF.md](PROOF.md) and the [session log](sonkayıtlar/LOG.md). The short current snapshot is [STATUS.md](STATUS.md); coordination details are in [docs/ACTIVE_WORK.md](docs/ACTIVE_WORK.md). Superseded plans and dated audits are indexed in [the archive](docs/archive/README.md).

## Deferred scope

Do not expand into unrelated EIS/EDS or add another physics workflow while the parity, archive, convergence, and evidence gates above remain open. Candidate scientific questions are collected in the [research vision](docs/SCIENTIFIC_RESEARCH_VISION.md); they are not current product commitments.

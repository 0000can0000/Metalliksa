# Digital Twin Phase 0 — current-code audit

Started 2026-09-21 at `fb1a614b8b9ce97b2cbe4d818ea622b63664d008`, branch `main`.
The application tree and index were initially clean. The parent repository already
contained changes, including STATUS.md and cache deletions; these are not ours.
Gemini ownership is unknown. See ACTIVE_WORK.md for this task's scope.

**Phase 0 is open. No later phase or experimental qualification is accepted.**
The user's subsequent instruction expands the audit to fabricated Python outputs.
Random sampling is evaluated by method/seed/convergence; it is not itself fabrication.

## Discovery and evidence boundary

Agent Memory targeted recall returned no records. Codebase Memory project
`C-Users-can02-Projects-metalliksaa-Metalliksa-1`, generation
`2026-09-18T15:50:24Z`, is stale for the inspected paths. Keyhole and the new
orchestrators are not tracked; worker/bridge/router metadata changed. Coverage
therefore triggered direct-source inspection. Graft workspace freshness also
reported drift; repository-local `graft map/ask/skeleton` supplied current paths.
No negative claim here relies on a top-N graph search. This is a bounded audit,
not a full scientific review of every model in the repository.

## Fresh baseline and regression checks

| Check | Actual result | Boundary |
| --- | --- | --- |
| `npm run build` | PASS, Vite 3640 modules, server bundle generated | Chunk-size warnings; does not type-check |
| `npm run lint` | FAIL, existing TypeScript errors in 15 component files | Includes Keyhole `NodeJS` type, Recharts record types, inconsistent alloy properties |
| `npm run test:unit` | FAIL, module-inventory coverage/runtime coverage assertions | First sandbox run was EPERM; rerun outside sandbox reached real assertions |
| scientific venv `pip check` + `python/check_requirement_ranges.py` | PASS; all 18 declared requirement ranges satisfied | Warp is not declared or in this environment |
| scientific venv `environment_doctor.py --gpu-smoke --timeout 30` | CUDA training smoke PASS, RTX 4060 Laptop, Torch 2.11.0+cu128 | Docker engine unavailable; ParaView/pvpython absent from PATH; report `.runtime/phase0-audit/doctor.json` |
| scientific venv `test_lpbf_build_job.py` | PASS fast mode | Slow UQ/NIST not run; optional Warp fallbacks printed |
| scientific venv Eagar–Tsai, Goldak/Fabbro, meltpool accuracy scripts | PASS | Existing fixture envelopes, not a newly frozen independent experiment protocol |
| scientific venv `test_phase26.py` | FAIL: no worker reply | Direct worker launch exposed missing `warp` during eager import |
| system Python direct small keyhole call | FAIL: WarpCodegenError mutating constant `bounces` | Warp 1.17.0, CUDA 12.9/driver 13.4; NumPy 2.5.3/SciPy 1.18.1 exceed repo bounds |
| CPU venv `test_lpbf_worker_optional.py` before/after fix | FAIL missing Warp → PASS | Real JSON-lines worker; absent Warp/Torch simulated, CPU estimator real |
| CPU venv `test_lpbf_engineering.py` after import isolation | 25 PASS, 1 OpenFOAM SKIP, 21.194 s | Conservation, manufactured solution, mesh, artifacts, cache, cancellation; host CPU only |

Exact local interpreters: `.runtime/lpbf-win-py312/Scripts/python.exe` (CPU),
`.runtime/scientific-win-py312-cu128/Scripts/python.exe` (scientific), and
`C:/Users/can02/AppData/Local/Programs/Python/Python312/python.exe` (system Warp).
`py -3` selects Python 3.14.5, whereas `python` selects 3.12.10. Package scripts
using `py -3` do not establish that the intended scientific environment is used.
No packages were installed or lock files changed by this audit.

## Findings and repairs

1. **CPU worker availability repaired.** Three eager imports (`lpbf_keyhole_raytracing`,
   `lpbf_modulus_fno`, `lpbf_transient_3d_gpu`) made optional GPU dependencies
   mandatory for every RPC and queued CPU subprocess. Import each only in its RPC
   branch. Missing-backend errors remain visible and later requests still work.
2. **Keyhole is unqualified and initially non-executable.** In addition to the Warp
   compile failure, inputs are unchecked/coerced, NumPy's global RNG is unseeded,
   grid spacing differs from advertised dx/dy, the reflection clamps backface dot
   products, and escaped versus bounce-limited power are combined. No sampling
   convergence or uncertainty report exists. The angular absorption rule is an
   empirical approximation, not a complex-index Fresnel solution. Gaussian cavity
   geometry is prescribed, not a thermally solved surface.
3. **Keyhole UI route is disconnected.** `KeyholeRaytracingLab.tsx` fetches
   `http://localhost:5000/rpc`; `routes/lpbfSimulation.ts` has no keyhole or
   transient-3d-gpu route. Worker supports those method strings over stdin.
   UI lacks visible failure/stale-response rejection and geometry disposal.
4. **There are distinct things named orchestrator.** `python/orchestrator.py` is
   a standalone demo: replaces input power with 250, sleeps, publishes 1500 as
   maximum temperature, no solver, no cancellation, uncaught task exceptions,
   no returned final state. `routes/orchestrator.ts` and `AIOrchestratorPanel.tsx`
   instead perform external AI dataset planning, not simulation. Sol/Astra are
   optional, but the UI marks every card Completed when any result exists. No
   end-to-end cancellation; local approval state is not an ingestion operation.
   `server/processOrchestrator.ts` supervises the actual Python IPC service.
5. **Existing queue should remain the owner.** UI engineering workspace →
   `/api/lpbf/jobs` → `server/lpbfWorkerBridge.ts` → `python/lpbf_worker.py` Queue →
   isolated `lpbf_simulation.run` subprocess. SQLite tracks terminal states;
   cancellation kills the child, startup marks interrupted jobs failed, integrity
   gates reject corrupt artifacts/results. Direct lab RPCs bypass this queue and
   block the input loop; their timeout is not cancellation.
6. **Fabricated output candidates confirmed in source.** FNO instantiates random
   untrained weights on each request, adds an artificial spatial temperature
   profile and invents cooling rates. Battery/corrosion ingestion fabricates
   missing measurement curves; uploaded-EIS analysis invents K–K residuals from
   frequency and reports PASSED. Micrograph `--export-only` exports an untrained
   network. These require removal or explicit unavailable behavior, not relabeling
   as experimental evidence. Legitimate equation-based simulation and test
   fixtures are distinct and must not be deleted merely for a keyword match.
7. **Material authority is duplicated.** Worker thermal-accumulation branch has
   four hardcoded presets and silently substitutes Ti64 for unknown materials;
   several direct lab branches have independent default constants. These need
   migration to the material authority with explicit missing-data rejection.

## Outstanding Phase 0 acceptance work

- Complete fresh visible-module route/data/test mapping and reconcile inventory.
- Run isolated live API and browser checks, including failures/stale inputs.
- Verify WSL outside the initial sandbox access denial; do not call it absent.
- Measure a small thermal run's wall time, peak memory and artifact volume.
- Check benchmark raw hashes and source/use conditions against manifests.
- Run isolated Node SQLite transaction/backup/restore spike and write ADR.
- Finish fabrication triage, keep unimplemented capabilities unavailable, and
  record any still-open scientific/model limitations individually.
- Write the first dependent implementation plan only after this baseline gate.

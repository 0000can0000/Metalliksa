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
| `npm run lint` | FAIL, existing TypeScript errors in multiple component files | Includes Keyhole `NodeJS` type, Recharts record types, inconsistent alloy properties |
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

## 2026-09-21 successor verification and repairs

These observations supersede the initial defects above only in the stated scope.
Phase 0 remains open. No experimental qualification or all-engine audit is claimed.

- Keyhole repaired in Python: bounded finite inputs before allocation, executable
  dynamic Warp counter, grid spacing and two-sided reflections, local PCG64 seed,
  separate absorbed/escaped/bounce-limited energy, sampling standard error and
  explicit empirical/prescribed-geometry limits. Six numerical/software tests pass
  on system Python 3.12/Warp 1.17 (CPU and CUDA); system NumPy/SciPy exceed the repo
  ranges, so this is not clean locked-environment reproduction.
- Same-origin keyhole Node route is now connected. `test_phase26.py` uses an
  isolated temporary job directory and cleans up a timed-out subprocess. Worker
  RPC PASS. HTTP regression PASS. The UI uses the shared LPBF power/diameter,
  invalidates results immediately, aborts HTTP and rejects stale replies, disposes
  mesh geometry, and exposes backend/seed/sampling/error/energy/model limits.
- Actual browser on isolated port 3188: 280 W, diameter 80 um, depth 120 um,
  absorption .35, 4096 rays, seed 0, CPU → 208.007 W absorbed, 71.990 W escaped,
  .003 W unresolved (rounded display), 74.29% absorption, .160 percentage-point
  sampling standard error. Changing rays to 1 immediately removed results, then
  showed `num_rays must be in [32, 100000]`; restoring 4096 recomputed the result.
  Tab advanced from Rays to Random seed; focus, controls, limits and 3D geometry
  were visually inspected. Initial browser timeouts resolved after page loading.
  HTTP abort is NOT worker computation cancellation; direct lab queue work remains.
- Live API exposed WSL-first selection ignoring explicit METALLIX_PYTHON for the
  LPBF worker. Added failing regression, then made the explicit executable take
  precedence. Without it WSL-first remains. Runtime/API tests: 16 PASS. Actual API
  with 1024 rays, seed 17, default model, CPU: 142.8692584000528 W absorbed,
  107.13074159994721 W escaped, zero unresolved/closure error.
- Curved geometry sensitivity: `python/benchmark_keyhole_convergence.py`, fixed
  200 um aperture, 250 W, radius 50 um, depth 120 um, absorption .35, 16384 rays,
  seed 17, CPU. Absorption at 32/64/128 nodes per axis: .71489646/.71137585/
  .70515435, standard errors .00080579/.00075287/.00076420. All energy closure
  errors zero. At 128 nodes, 4/8/16 bounces agree with zero unresolved power.
  Mesh differences do not decrease regularly: asymptotic convergence is NOT
  established. No tolerance was relaxed or experimental conclusion drawn.
- FNO now rejects inference until a trained validated checkpoint, provenance,
  normalization and applicability contract exist. Scientific venv rejection test
  PASS; retained network architecture is not a registered trained model.
- Standalone orchestrator runs the actual reference solver with unchanged inputs,
  balance checks, error propagation and cooperative progress cancellation. Battery,
  Tafel, EIS and OCP ingestion require observed aligned finite data. Tafel units are
  explicit and opposing branch regression intersection replaces invented icorr.
  Uploaded EIS uses actual Voigt residual screening, never a fabricated PASS.
  `test_no_fabricated_outputs.py`: 10 PASS on CPU venv, including valid battery,
  analytic Tafel, A/mA/uA/log(A) equivalence, invalid branches and in-flight cancel.
  Tests are analytic/software fixtures, not measured experimental validation.
- Tafel automatic branch selection and severity heuristics still need a scientific
  applicability review. EIS underlying clipped normal-equation fit remains screening.
  UI EISUploadInsightsStudio and PhysicalValidationStudio fabricated fallback paths
  and default compliance metrics are still OPEN, as is untrained micrograph export.
- Inventory now maps all 35 registered modules including environment groups;
  FNO is explicitly unavailable and transient GPU's missing HTTP route stays a gap.
  Targeted inventory tests 3 PASS. Initial full unit run: 109 PASS / 2 inventory
  FAIL; rerun after correction recorded below. Build PASS (24.36 s Vite), existing
  large chunk warnings. TypeScript lint still FAILS in preexisting components;
  no Keyhole diagnostics. Logs: `.runtime/phase0-audit/*-successor.txt`.
- Local Graft refreshed changed files. CBM remains generation 2026-09-18T15:50:24Z;
  targeted coverage was stale/untracked and direct sources superseded it. Parent
  STATUS.md is the active continuation point, updated at each meaningful checkpoint.

Final full unit rerun after inventory corrections: **111 PASS / 0 FAIL**, 2.564 s.
This does not clear the separate TypeScript lint or Phase 0 scientific gates.

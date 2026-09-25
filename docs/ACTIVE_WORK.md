# Current LPBF goal owner — 01a0cfbf-d2ad-7f70-b94f-b89183eb819c, 2026-09-25

## Continuation checkpoint — layer-aligned mesh-study repair (2026-09-25)

The failed UI study was the 28 µm middle level (the requested 20 µm mesh was
the base; 40 µm was the coarse level). Its z-cell centers were 14 and 42 µm.
The whole-cell active mask correctly excluded the 42 µm center, but that cell
spanned 28–56 µm and the physical 40 µm layer surface cut through it. The
cell-integrated source therefore omitted the 28–40 µm part of the Gaussian
source and captured 54.8506%. The 99% guard and source normalization remain
unchanged; no partial-cell thermal capacity or conduction was invented.

The built-in standard powder-layer mesh study now runs the CPU-reference model
with a layer-conforming grid and three distinct integer cells-per-layer levels.
For the reproduced IN718 vector these are 1/2/3 cells per layer and 40/20/13.333
µm. The original backend request and executed backend are recorded separately;
an automatic backend request is explicitly executed as the CPU reference for
this numerical study. The exact 30 W, 1200 mm/s, 80 µm study completed all three
levels; energy relative error was 3.04e-16. Width, depth and volume trends were
inconclusive, so this is not convergence acceptance or experimental validation.

The convergence panel now discloses the layer-aligned CPU-reference protocol,
requested versus executed backend, and cells-per-layer sequence. The API type
also preserves the execution-input hash. Python regressions and TypeScript
typecheck passed. The focused TSX test still cannot start because esbuild
returns `spawn EPERM`; no browser verification was done. P4 review confirms the
latest conforming study is not a substitute for the frozen P4 gate. Next:
investigate tied peak-time selection as a diagnostic-only sensitivity, then
freeze any new numerical protocol before running it. Keep the 80 W frozen P4
status failed and the 75 W contour study inconclusive. P5 source/operator and
IN625 full-transient data gates also remain open.

## 2026-09-25 continuation — NIST observation-count gate

The official NIST workbook and catalog define six cross-sections per process
condition: three tracks, each sampled at 4.9 and 6.0 mm from its start. The
comparator's previous synthetic positive fixture supplied one x=5 mm midpoint
section while declaring `observationCount=6`; that schema could emit numerical
residuals without matching the source sampling plan. The Python comparator now
always withholds residuals until a versioned six-section operator backed by
three separate simulated tracks is implemented. Reports expose the required
positions and track count. Targeted regression: all 6 tests pass. This does not
validate the engine or change the unavailable P5 result. Do not launch another
NIST solve until the observation contract, source profile, and 10 mm model
validity/cost gates are resolved.

## 2026-09-25 continuation — live run bundle round-trip

Verified the current localhost UI against its existing source/run archive. The
server-local export contains 3 runs, 132 run artifacts, and 3 source links;
the UI verified the manifest and restored an isolated copy with restore ID
`2e251b3d73a7470ead671287649ace35` from bundle
`be741eebfa12413a8fd78978ecefdfc3`. The live archive still displayed its
original 3 records. Selecting the archived IN718 run then produced `unavailable`
because its Table 4 source revision 1 did not match reviewed local revision 2;
the old run was not rebound. This proves the current software archive path, not
scientific validity or experimental agreement. Next prioritize the CPU/P4 gate
and the versioned three-track/two-section proxy-campaign contract; preserve the
source-profile and 10 mm validity/cost gates.

The UI also selected official NIST optical-workbook revision 1 and rechecked
its archived bytes: publisher XLSX (25,811 bytes, SHA-256
`2cfaac96aaca3dabb77b7029f842cdcc7e75c5a2cf3577d0734823246364a931`) and
publisher checksum sidecar (64 bytes, SHA-256
`770c0826e53e42c242110e69c032f2cbc74f6183048c43a530c5b62e746ae09b`) matched.
The archive-document SHA is `73293ca6c2a1929a2e244f806d6eb5900d4c739716f7f291e74c9bc12dc291b6`.
The same view still marks the optical operator unimplemented, so these exact
source bytes are provenance evidence only.

## Continuation checkpoint — P8 archive acceptance and physics continuation (2026-09-25)

The goal remains active. User explicitly authorizes scientific fixes or a Python
engine rebuild when evidence shows the current result is inadequate. Do not
weaken acceptance gates or describe numerical/device parity as experimental
validation.

P7: `docs/IN625_P7_PROPERTY_EVIDENCE_MATRIX_2026-09-25.md` now maps chemistry,
lot/state, evidence type, range, uncertainty, gate status and missing evidence
for each required IN625 property. IN625 remains thermal-screening-only;
`fullTransient` and `buildJob` remain closed. Sources for powder and substrate
are distinct benchmark scopes; no cross-lot property splicing is admitted.

Physics audit: Phase 21's `TransientEnthalpyFDMSolver` is deliberately a
stationary 2D screening model: `speed_m_s` is ignored, beam radius/absorptivity
are fixed, and the 2D source has no out-of-plane power normalization. The
worker still exposes the named RPC, but the service method has no indexed UI
caller. Preserve its screening label and do not present it as a scan-resolved
melt pool. A future traveling-source solver would need its own model contract,
power normalization, conservation checks and validation scope. P4 tied-peak
endpoint selection is a plausible discrete-observable sensitivity (439/300/25
equal endpoints by mesh), not a proven cause of the frozen failed result.
P5 stays unavailable because the current model lacks matching melt flow,
evaporation mass transfer and mass/latent-energy closure.

Mesh-study failure diagnosis: a fresh UI "Three meshes" attempt stopped when
the middle 28 µm level captured only 54.851% of the Gaussian source, below the
unchanged 99% minimum. The guard is functioning as intended; this does not
justify renormalizing a truncated source or relaxing the threshold. The study
runner previously let one invalid level discard the requested fine solve and
the other levels. It now records that level as unavailable, preserves the
requested result and any other completed levels, and marks all partial-study
convergence checks failed. No convergence claim is made from an incomplete
sequence. Commit `4684213` contains the Python handling, UI rendering and
regression coverage. Focused study regressions, 15 heat-source tests (one
OpenFOAM skip), and `npm run lint` passed. The focused TSX UI test could not
start (`spawn EPERM`). Broader Windows Python verification encountered 7
access-denied temp-directory errors (2 OpenFOAM checks skipped), so the full
package is not yet verified.

Engine choice: the standard 3D CPU transient in `python/lpbf_simulation.py`
already follows piecewise-linear moving scan segments with a cell-integrated
Gaussian source, two-node time quadrature, adaptive explicit stepping and a
global energy ledger on a fixed material grid. It is the better canonical
thermal reference; do not rebuild it before its resolution/validation gaps are
measured. The separate `TransientEnthalpyFDMSolver` remains stationary 2D
screening and must not be represented as scan-resolved. A proposed factor-two
source-power defect was disproved: each GL2 time node contributes 0.5P, and
both together integrate to P per step; the existing axial power regression
passed. Spatial source renormalization remains explicitly bounded by the 99%
capture guard and is not experimental validation.

P8: the current source built with `npm run build`; Vite reported a large
Three.js chunk warning. The freshly built server and Python worker started
locally and `/api/health` returned `status: ok`. A fresh UI pass computed the
bounded IN625 bare-plate screening job on CPU and CUDA with matching revision
and material snapshot identity. Peak temperature matched at 300.226 K, final
enthalpy differed by `2.22e-16 J`, and the temperature-field maximum absolute
difference was `1.14e-13 K`. This is same-input numerical/device parity, not
experimental validation. The IN625 run was archived with exact local-derived
source revision SHA-256
`be3286b30b3ec3a6970b577cd9050b19de716cbf8754c7ac2355cf20d5cea655`; its run
contract remains legacy/unbound. A fresh IN718 transient job was also archived;
its 40/20/60 µm melt geometry remains under-resolved and unvalidated. The
IN625-vs-IN718 NIST Table 4 comparison correctly returned unavailable due to
the unmatched material/process contract. UI keyboard selection of the archived
run passed (ArrowUp/ArrowDown changed and restored the selection). Server-local
bundle `5c86ac62fed64f9b93c9a53b8d6817a9` was created with 3 runs, 132 run
artifacts, and 3 source links; verification passed and isolated restore
`58d94b80d0904a53bb11f5bab73eac51` completed while the live archive remained
unchanged. This is software workflow/integrity evidence only.

The NIST local Table 4 transcription was refreshed from source version 1.0.0
(archived revision 1; 3,374 bytes; document SHA-256
`b312cc286ccf7cd41c2ff8bc2bea3c0cf183af432125f402dfbebdf71b235ee0`) to
catalog version 1.1.0 (archived revision 2; 4,321 bytes; SHA-256
`6c9d9f80f8c4eb2b7a6c18bbaab9ed7a993e43f155190dfff49808a4f854aaf0`). The
import verified bytes and added source-located heat-treatment context. Earlier
IN718 run `aad3bc4b6ceb4abbbc56942554f202cb` remains immutably linked to rev 1;
the comparator correctly rejected its outdated fixed artifact. NIST case 0
also differs from that run's process vector, and the strict model gate needs a
verified measured AMB2022-03 beam profile that the source hunt has not found.
No run was silently rebound; new source provenance alone does not qualify the
model.

Next: resolve why the coarse UI mesh represents too little source while keeping
the 99% guard fixed; rerun the three-level study and inspect its per-level
status. Then quantify mesh/time error for the existing moving-source solver,
continue P4 tied-peak diagnosis without changing its frozen protocol, increase
resolution where melt dimensions span only 1–2 cells, and locate the exact
measured AMB2022-03 beam-profile artifact before a source-matched comparison.
Retain P7 full-transient/build-job and P5 gates as closed until evidence passes
admission. Preserve user-owned changes and stage only owned files.

## Continuation checkpoint — layer-conforming P4 v2 result (2026-09-24)

The third, separately frozen one-layer 80 W IN718 companion used the opt-in
`layer-conforming` grid and its distinct model ID. Protocol/scenario were
committed before execution in `e439a56`; the scenario SHA-256 is
`80c3d4e1c58e28559914ff3a02fc6edc762b8ffe21336466f60b2826fe388ecc`. All six
CPU runs completed and passed the existing source guard and energy closure
(maximum relative error `1.286e-13`). Actual mesh spacing was 26.6667, 13.3333,
and 6.6667 µm (factor two); actual mean timestep levels were 99.982, 49.991,
and 24.996 ns (factor two). Mesh assessment is `inconclusive`: discrete
width/depth are identical on the finest pair and the three-level oracle
reports unresolved/identical discrete geometry. Timestep assessment is also
`inconclusive`: all levels report identical discrete width/depth. The report
is `docs/LPBF_P4_LAYER_CONFORMING_V2_80W_2026-09-24.json` (SHA-256
`873ea698d00d7deb5db06ad241028b42161ea24e9d6385d3f6953164e270c4ec`). It is
CPU numerical evidence only, not experimental validation, and does not change
the original frozen P4 or either prior companion outcome.

Next: preserve all three companion outcomes, then continue the remaining P0–P10
work. Investigate the discrete-melt geometry plateau as a model/observable
limitation without changing frozen acceptance or retuning this campaign. P5
remains unavailable; GPU qualification/performance and alloy admission remain
open. Do not claim scientific validation from energy closure or contour proxies.

## Continuation checkpoint — factor-two P4 companion (2026-09-24)

The second separately frozen layer-conforming campaign is committed as
`9594ea4` and its six-run report as `docs/LPBF_P4_LAYER_CONFORMING_FACTOR_TWO_80W_2026-09-24.json`
(SHA-256 `563a449fb3ad7069706941104efccb8a624089ab1fa1fcf35a59acd8e807097d`).
All runs completed with the unchanged 99% source-capture guard. Energy closure
passed (maximum relative error `1.281e-13`). Mesh trend failed: the first two
cell-extent W/D pairs are identical and the finest pair changes 33.33% in width
and 20.0% in depth. Timestep trend is inconclusive because all three accepted
time levels report identical cell-extent W/D. The frozen original P4 remains
`failed`; both companion reports remain distinct numerical outcomes. The safe
next P10 action is to determine whether a physically consistent cut-cell/source
fix can preserve the z=0 interface; do not shift the grid origin or weaken any
source/convergence criterion. Continue the other P0–P10 lanes independently.

## Continuation checkpoint — layer-conforming P4 v1 (2026-09-24)

The unsafe substrate-depth shift proposed during diagnosis was rejected: it
would move the z=0 material interface and misclassify whole cells. A separate
one-layer, layer-conforming companion protocol was frozen before running in
`067eea6` (`docs/LPBF_P4_LAYER_CONFORMING_PROTOCOL_2026-09-24.md` and its
scenario JSON). All six runs completed under the unchanged 99% source-capture
guard and 1% energy criterion. Energy closure passed (maximum relative error
`3.07e-14`), but v1 is `failed` for mesh convergence and `inconclusive` for
timestep convergence: the actual mesh ratios are 2 and 1.5, and actual mean-dt
ratios are not constant. The solver's existing trend oracle therefore returns
inconclusive; no acceptance criterion changed. Results are preserved in
`docs/LPBF_P4_LAYER_CONFORMING_80W_2026-09-24.json` (SHA-256
`2c74226dace13c93290e8086f3e1e57dc526f2967dcf4454f9416011c5598b51`). The
original frozen P4 remains `failed`. Next, if another companion is justified,
predeclare exact factor-two, surface-conforming actual meshes and timesteps;
do not reuse these v1 results to claim a pass.

## Continuation checkpoint — P4 forensic boundary + NIST beam correction (2026-09-24)

NIST's 2025 beam report includes a normalized measured signal-intensity
profile and central x/y sections in Fig. 7, plus measured caustic points and a
`Dg(z)` fit in Fig. 8; Fig. 5 is simulated. The public sources reviewed so far
do not expose the raw numeric 2D camera array or a scan-specific source-byte
binding. A digitized plot would be derived data with its own uncertainty, not
the original measured field. `Dg`/`D4σ` equality remains an explicit ideal-
Gaussian assumption. The active plan has been corrected; P5 remains
`unavailable`.

P4 remains frozen `failed`: width trend inconclusive, depth finest-pair change
17.1875%, timestep geometry inconclusive. Its report stores aggregate rows, not
the original runs' full thermal history or field series. A replay at diagnostic
commit `5dae4c9` matched all six stored input hashes and exactly reproduced
each row's actual spacing, steps, W/D, peak temperature and energy error. Its
`implementationHash` did not match, so this remains a matched-input forensic
diagnostic, not an exact-code replay. Equal-maximum endpoints ranged from 439
and 300 on the two coarser meshes to 25 on the fine mesh; this is a plausible
selection sensitivity, not a proven cause of non-monotonic depth. Details:
`docs/LPBF_P4_PEAK_DIAGNOSTIC_REPLAY_2026-09-24.md`. Separately, today's solver
rejects the 86.763%-capture coarse mesh under its newer 99% minimum; do not
weaken that guard or the P4 criteria. A Git-blob scan of 69 commits from the
P4 harness through the new capture gate found no matching original
`implementationHash`; the historical tree was likely dirty or outside the
recorded Git ancestry and cannot be recovered from the report hash alone. The
comparison confirms that the numerical operator files stayed unchanged from
the frozen-report commit to the diagnostic commit; only additive tie counters,
their serialization and one explanatory label differed. This supports using
the plateau counts as same-operator diagnostics, not as byte-identical
historical execution. The completed 75 W vectors are exhausted and cannot be
reused as prospective levels.

P8's strongest recorded live UI evidence is the IN625 flow in `PROOF.md` §
“Core physics + IN625 UI/archive integration”: source revision 2
preview/import/byte verification; explicit CPU/CUDA calculation and UI
comparison; exact-source run archive; bundle verification; and isolated restore
with the live archive unchanged. This supports software flow only. That run is
`legacy-unbound`, IN625 remains unvalidated screening, and NIST comparison is
unavailable. Older references below to the IN718 `e8e…` run and bundle are
historical, not the latest flow.

The broad P0–P10 goal stays active. Preserve user-owned `docs/README.md`,
`sonkayıtlar/LOG.md`, `docs/SCIENTIFIC_RESEARCH_VISION.md`, and
`.tmp-phase22-review-cache/`; stage only explicitly owned checkpoint files.

## Latest checkpoint — IN625 mushy-range CUDA witness (2026-09-24)

User explicitly widened this goal to include evidenced physics defects in the
core engines. The previously committed Phase 22 work metric-projects Marangoni
surface gradients and points recoil inward along the height-graph normal.
Follow-up: a second audit found that Marangoni shear used vertical
`dz` instead of the normal spacing `dz/sqrt(1+h_x²+h_y²)`; the code and
regression test are updated, and the full Phase 22 Python suite passed **29/29**
with CPU and actual RTX 4060 `cuda:0` test coverage. The alloy capability
matrix is recorded at
`docs/LPBF_ALLOY_CAPABILITY_MATRIX_2026-09-24.md`.

New P6 witness: `python/test_in625_bareplate_field.py` exercises the bounded
IN625 enthalpy solver from a synthetic 1500 K initial state through the mushy
interval at two resolutions. The 128- and 1,024-cell CPU/CUDA pairs match to
max 9.10e-13 K and 3.50e-10 J/kg; each energy residual is 5.33e-15 J. CUDA
times are 9.196 s and 23.254 s versus CPU 0.289 s and 1.316 s, with incremental
memory 24,576 and 176,128 B. This is model-law numerical evidence, not process
validation or a GPU speedup.

Focused evidence: Phase 22 Python 29/29 plus CPU/CUDA field/multistep/pressure
groups 5/5; IN625 binary/client tests 6/6; source/API groups 10/10 and 16/16;
run preview round-trip 2/2; TypeScript, lint, and diff checks passed. Live UI
used 1,152 cells × 11 steps on CPU and explicit RTX 4060 `cuda:0`: maximum
field difference 0 K, RMS 0 K, and zero scalar/energy-ledger differences.
IN625 remains unvalidated literature-model screening; its run has a legacy
unbound core contract, and no experimental comparison is admitted.

Next: use the completed P4/P5/P6/P7 audits to scope physics/data work; keep
frozen P4 `failed` and P5 `unavailable`. P6's two tests show the current
PyTorch CUDA path is slower at both tested sizes, so profile/refactor only if a
larger same-physics workload can justify it. Archive and evaluate the nearest
Hastelloy X sources before any runtime alloy admission. P6/P7 remain partial.
No goal-completion claim yet. The Marangoni package is committed as `fbe47df`.
Preserve user-owned `docs/README.md`,
`sonkayıtlar/LOG.md`, and `docs/SCIENTIFIC_RESEARCH_VISION.md` edits; do not
stage them.

## Acceptance audit results (2026-09-24)

- P4: frozen 80 W thresholds remain ≥3 levels per axis, ≤1% energy error,
  ≤5% finest-pair W and D change, and converging trend from actual spacings.
  The frozen report is `failed`; its 5 µm extension is not a replacement.
  The separate preregistered 75 W contour run is `inconclusive` (mesh depth and
  both time metrics). Do not start another P4 run until a new protocol is
  committed with distinct model/process scope and actual-resolution rules.
- P5: `enthalpy-fv-6` stopped at its fixed-material boiling limit after 133
  steps (0.1024% of Case 0); it lacks melt flow, evaporation mass transfer,
  free-surface topology and matching mass/latent-energy closure. Preserve
  `unavailable`; do not remove the guard or repeat the same case. A new model
  revision requires closed mass/energy/force checks and measured IN718/beam
  inputs before a separate 3×3 plus optical-operator campaign.
- P6: the new 1500 K synthetic IN625 witness now exercises the mushy enthalpy
  range with CPU/CUDA field, independent enthalpy and global energy parity.
  The tiny CUDA case is ~32× slower than CPU; scale/performance qualification
  remains open and this does not qualify the alloy source.
- P7: no alternate alloy source package currently clears the gate. Hastelloy X
  is the nearest research candidate: an LPBF paper provides as-deposited Cp /
  enthalpy and solid-state diffusivity data, but liquid conductivity in its
  released model is a 15× approximation, so it is not admitted. CoCrMo sources
  do not demonstrate a matched chemistry/state or complete phase-change set.
  Keep IN625 bounded screening only until matched, uncertainty-bounded inputs
  are archived.

Immediate next work: decide a separately bounded P4 numeric campaign only
after a new frozen protocol; for P5 define a physically closed free-surface
model before implementing it; for P6 test a larger same-physics IN625 case and
report crossover honestly; for P7 archive and evaluate the Hastelloy X source
curves before any runtime alloy admission.

## Latest P6/P7 integration checkpoint — 2026-09-24

Implemented a model-specific IN625 bare-substrate conduction field path with
matching NumPy and explicit CUDA evaluators. Root owns final integration and
proof. Scope is limited to the literature-model enthalpy interval, explicit
absorbed-W source, fixed supplier density assumption, and adiabatic domain;
powder-bed/full transient and experimental qualification remain unavailable.
The focused CUDA parity and energy results are in
`docs/IN625_BAREPLATE_GPU_SCREENING_2026-09-24.md`. The shared source-capture
threshold now lives in `lpbf_heat_source.py` and is imported by the existing
reference solver. No agent is currently writing. Next: inspect/commit the
isolated solver and run the aggregate project gates without staging user docs.

Latest active slice (2026-09-24): P1 now emits a composite build-job identity
over canonical alloy, model, solver revision, and property snapshot schema/
revision/content hash; the separate property-only hash remains stable in meaning.
The full identity participates in cache keys and successful TypeScript results
are rejected when identity fields are missing or inconsistent. An independent
IN625 enthalpy quadrature oracle passes, but the model remains unvalidated and
build-job/full-transient admission stays closed.

P10 found a high-confidence OpenFOAM closure defect: evaporation energy and
recoil/plume sources had no corresponding VOF/continuity mass transfer. The
generated multiphysics case and implicit C++ default now disable those sources;
the explicit recoil-formula fixture remains enabled and is labeled as formula-
only evidence. Diagnostics report absent mass-transfer closure. This does not
implement a fully coupled evaporating VOF model. Focused validation: build-job
identity script PASS, IN625/OpenFOAM gate 7/7, TypeScript session 12/12,
`npm run lint` PASS, Python syntax check PASS; OpenFOAM compile not run. A GPU
feasibility audit is active because P6/P7 now require a qualifying GPU thermal
path for at least one newly admitted alloy. P4/P5/P6 remain open.

Root owns report integration and the next GPU feasibility/integration gates;
preserve frozen acceptance criteria and current user edits in `docs/README.md`,
`sonkayıtlar/LOG.md`, and `docs/SCIENTIFIC_RESEARCH_VISION.md`.
P5 Case 0's 480 µm run stopped at the fixed-material boiling guard after 133
steps (0.1024% of scan). CPU enthalpy-FV lacks evaporation/free-surface/momentum;
Phase 22 height-graph terms are heuristic and OpenFOAM defaults are not IN718-
qualified. Do not remove the guard or rerun the same model. Require a new model
revision with manufactured mass/energy/force checks before a new 3×3 P5 protocol.

Root owns integration and `STATUS.md`/`PROOF.md` on
`codex/lpbf-buildjob-material-identity`; no push. The official NIST workbook
audit is `ef303e7`. Phase 21 stationary 2D screening physics repairs are
`69fae9a` and `bf34aef` (6 focused Python tests PASS); P10 was added to the
active plan in `04e0ea4`. Commit `13d1f05` fixes the OpenFOAM two-phase
thermal-advection flux: metal apparent heat capacity and gas heat capacity now
follow their own `alphaPhi` phase-volume fluxes instead of applying a
volume-weighted `cp` to mixture `rhoPhi`. The focused static-source/numerical
oracle passes 2 tests; it is not OpenFOAM runtime evidence. WSL
`E_ACCESSDENIED` prevented local solver compile/integration. Commits `e8f8313`
and `c902700` fix the build-job field-peak/cache identity and Phase 22 face
transport/projection contracts.
New P6 smoke artifact: `python/test_lpbf_phase22_multistep_cuda_parity.py` and
`docs/PHASE22_CPU_CUDA_MULTISTEP_SMOKE_2026-09-24.md`. The five-step production
`solve_toolpath` case passed on CPU and explicit RTX 4060 `cuda:0`; root rerun
passed 1/1 using a workspace-local Warp cache. It records converged pressure
projections and close scalar parity, but no full-field parity, energy closure,
performance, mesh/time convergence, or experiment qualification. Max absolute
post-projection divergence differs (0.078125 vs 0.15625 s^-1) and remains
reported. Warp's system PCH temp cleanup emitted WinError 5 after exit code 0.
The follow-on full-field diagnostic is in `python/test_lpbf_phase22_full_field_cuda_parity.py` and
`docs/PHASE22_FULL_FIELD_CPU_CUDA_PARITY_2026-09-24.md`: all final T/H/U/V/W/P/surface arrays
passed the frozen CPU/explicit-`cuda:0` tolerances for the same small case (3/3
focused PASS); opt-in output is capped at 100,000 cells and defaults remain
unchanged. No auditable energy ledger is exposed, so energy closure remains
unavailable and P6 remains partial.
The CUDA PCG also passed one independent manufactured-pressure oracle on a
9³ liquid grid (linear residual `7.4851e-4`, gauge-adjusted pressure error
`2.9145e-4`, independent operator residual `7.4854e-4`, each within `1e-3`);
see `docs/PHASE22_CUDA_PRESSURE_MANUFACTURED_2026-09-24.md`. This does not close
the energy-ledger requirement or validate surface-force laws.
The Phase 22 CPU Warp + peak consistency + material capability suite passes 19
tests; standalone build-job checks and TypeScript typecheck also pass. The
TypeScript session behavior runner passed 11 focused tests in the elevated
runner after the sandbox attempt failed with `spawn EPERM`. PyTorch CUDA is
available on this host, though the explicit Phase 22 Warp tests still ran on
CPU and do not establish CUDA execution for that solver. The pressure stencil
pairs
the face divergence, gradient, and Jacobi operator, but its fixed ten sweeps
do not meet the 1e-3 relative divergence target on smooth manufactured fields
(residual ratios 0.420619 at 9^3 and 0.793338 at 17^3); 300 sweeps still leave
0.0378842 at 17^3. The fixed Jacobi solve was replaced by matrix-free,
device-reduction preconditioned conjugate gradient on the unchanged face-based
operator. CPU Warp manufactured-field tests meet the 1e-3 measured linear and
post-projection divergence gates at 9^3 (15 iterations) and 17^3 (35
iterations), and exercise zero/nonzero Neumann compatibility, disconnected
components, exhaustion, and numerical failure. CUDA execution/performance for
Phase 22 remains unverified on this host.
Commit `11334ff` records this pressure-solver repair. Commit `96eeca2` fixes
integer array conduction silently truncating fractional face fluxes; its
focused suite passes 6 tests. CUDA pilot parity tests now pass for IN718 and
316L on `cuda:0`; 316L uses the existing `estimated-legacy` snapshot and this
is numerical parity only, not source-backed alloy qualification. IN625 still
lacks a complete source-backed transient property/optical/flow input set.
IN625 P7 remains partial: the 273.15–1623.15 K route is explicitly
unvalidated literature-model screening; source validity span and material /
process state are not established.
The NIST 2019 IN625 powder conductivity source is inverse-derived for powder
only (100–500 °C), has no matched AMB2018-02 lot, and cannot be routed into the
current no-powder-state GPU material path. NIST's AMB2018-02 plate certificate
is the next identity source to inspect; it does not itself provide property
curves. Do not elevate P7 without matched properties and validity/uncertainty.
CPU transient whole-cell surface geometry remains a documented cut-cell
limitation, not a repaired defect. The separate
preregistered 75 W 3+3 contour report is `4110e73`, SHA-256
`b9cff92e01378a58ac4ed17333c21ad591a956dfc6e32ddd2dda8a219026b866`.
All six solves completed with energy PASS, contour mesh width PASS, contour
mesh depth and both time metrics inconclusive; total 75 W contour/discrete
status is inconclusive. The frozen 80 W P4 result remains failed. P5 remains
unavailable. The preregistered peak-selection diagnostic repeat is complete in
`docs/LPBF_P4_PEAK_SELECTION_DIAGNOSTIC_75W_2026-09-24.json`, SHA-256
`bb7241cd328842517b8a0ad232c1cf160f0238ec459bbf66967ccc464b0ae4e`; it remains
inconclusive with unchanged criteria. Peak ties shrink from 416 endpoints at
20 µm to 11 at 10 µm and 1 at 5 µm; the 10 µm timestep refinement shifts the
selected endpoint by about 0.1 µs while W/D changes remain below 0.004% and
non-monotonic. Peak selection is a plausible contributor to mesh-depth
non-monotonicity, not a proven cause. The global cell-center contour remains a
numerical proxy without surface extrapolation or NIST section equivalence.
The versioned section operator is now committed as `7e5437e`; it emits separate
4.9/6.0 mm thermal-proxy records for one simulated line, with no extrapolation.
Next: measure corridor-width sensitivity, then plan an affordable independent
3+3 with three separately identified simulated/experimental lines. NIST's 2025
beam report provides a measured nominal 67 µm Gaussian `Dg` diameter with 5.2%
combined standard uncertainty and a plotted measured normalized profile with
central x/y sections (Fig. 7); Fig. 5 is simulated. The reviewed public sources
do not expose a raw numeric 2D irradiance array or scan-specific source-byte
binding. Keep P5 unavailable until measurement/proxy provenance, explicit
`Dg`/D4σ-to-model mapping and uncertainty, line identities, and the optical
section operator are present.
The original 3 mm track bound rejected the NIST 10 mm baseline; the square
domain estimates were 4.18M/32.32M/258.27M cells at 20/10/5 µm. The rectangular
corridor reduces this to 205,200/1,556,975/12,123,933 estimated cells, still
exceeding the 600,000-cell guard at 10/5 µm. No 10 mm solve ran. Preserve the
67 µm measured-diameter, ideal-Gaussian approximation as a separate exploratory
condition from the full-profile gate. Phase 22 recoil/interface kinematics are now coupled by
post-projection height-graph motion (`3ff4c9e`; Warp CPU 24/24), but CUDA
execution, interface breakup/reformation, and plume dynamics remain unverified
or out of scope. Preserve the P7 source-data gate.
Root alone changes checkpoint documents.

User widened the active goal to repair evidenced physics defects in the core
engines as well as the planned alloy/GPU/data work. Completed packages on this
continuation: `39a6f8f` fixes sloped-interface Marangoni temperature sampling;
`52b51cb` matches evaporative energy and height loss to the same interface
area; `ee730ec` rejects severe Gaussian source truncation in the CPU reference;
`46b9be6` applies the same capture gate to CPU and explicit CUDA pilot;
`9325765` separates optional claimed source-validity bounds from generated
material-table coverage. The enthalpy/phase audit found no evidenced defect.
Root owns integration and checkpoint docs; external user changes remain
unowned.

Latest bounded CPU benchmark: the 1 mm, 20 µm bare-plate corridor completed
4,267 steps across 25,200 cells in 24.47 s with relative energy error
`6.53e-14`. The full Phase 22 `solve_toolpath` path then ran a deterministic
one-step case on both CPU and actual RTX 4060 `cuda:0`; both pressure solves
converged in seven PCG iterations. Maximum-temperature difference was
0.000244 K and maximum-velocity difference was 1.69e-8 m/s, with identical melt
volume and keyhole depth. This verifies a tiny coupled-device smoke, not full
workload parity or performance. The 10 mm bare-plate CPU attempt stopped at the
documented boiling-validity boundary before completing a scan; see
`docs/p5_case0_10mm_480um_validity_stop.json`.

`corridor_sensitivity_feasibility` completed a preregistered three-width
feasibility audit (`a065b77`); all estimated CPU runs exceeded the reference
worker's 300 s timeout, so no solve was initially launched. Root then tried the
480 µm case directly on the local CPU reference solver. It stopped after 133
source-step evaluations at the documented boiling-validity boundary because
the fixed-material solver has no evaporation/free-surface model. See
`docs/p5_case0_10mm_480um_validity_stop.json`. No section or comparison result
was emitted. The ideal-Gaussian input and absent experimental line identities
still prevent P5 qualification.

A separate primary-source audit of IN625 is recorded in
`docs/IN625_P7_SOURCE_GATE_2026-09-24.md`. It found no matched full-range table
that can pass P7 without unsupported material-state transfer or extrapolation;
the current screening capability and full-transient/GPU gate are unchanged.

P4 frozen 80 W IN718 3-mesh/3-timestep report is
`docs/LPBF_CPU_CONVERGENCE_80W_2026-09-24.json`: all six completed, energy
PASS, mesh width inconclusive, mesh depth FAILED at 17.1875% finest-pair change,
timestep geometry inconclusive, overall `failed`. No experimental validation.
Roundoff-only width trend was repaired in `92a0e59`. P5 exact-source NIST Table 4
comparison is correctly `unavailable`, errors null, with seven genuine missing
conditions after the JSON-number fix `3f152d1`.
The surface-aligned 80 W 3+3 diagnostic still failed P4: W/D mesh
40/40 → 40/40 → 60/50 µm, finest width/depth changes 33.33%/20%, energy PASS,
time geometry inconclusive. Source capture exceeded 0.999999999.
An exploratory 5 µm, 588,544-cell solve (`2a5493a`) completed in 375 s: discrete W/D
60/55 µm, 10→5 µm depth change 9.09%, still over the frozen 5% limit.
Supplementary liquidus-contour W/D 20→10→5 µm is monotonic with 1.27%/3.70%
finest changes, but lacks a predeclared independent 3+3 gate; P4 stays failed.
The official NIST workbook/sidecar SHA is verified; all 42 BP1 source rows
reproduce the seven local Table 4 aggregate rows at 0.1 µm. The new workbook
source is a distinct dataset; the existing transcription and run link persist.

Earlier P8 browser flow: local Table 4 revision 1 imported/verified; IN718 30 W
powder-layer short pilot archived as run `e8e26ffea4784e6288f7ddab5839de01`;
bundle `46c140da2e984c0ba00468eec09bdaf6` exported/verified and restored as
isolated copy `1ac0729abd5a47928c80f2ed8bfe71ec`. The run is intentionally
not NIST condition-matched. Newer IN625 archive/bundle flow is recorded in
`PROOF.md` and summarized above. P9 checks: Python 91 PASS/3 Windows OpenFOAM skips;
Ubuntu/OpenFOAM engineering 29 PASS; latest TypeScript unit 232 PASS, lint and
build PASS; new Python source audit 3 PASS. Browser tab 2 and local dev server
session 29665 are live. Official workbook source preview/import/revision-1
verify passed in the browser. The separate continuous-geometry protocol and
independent process/time study are now reported at the top of this file; scope
a matched NIST optical operator for P5 only after its physical inputs are known.

External `docs/README.md`, `sonkayıtlar/LOG.md`, and
`docs/SCIENTIFIC_RESEARCH_VISION.md` remain unowned. Preserve them.

# Previous LPBF handoff — 2026-09-23

Latest 2026-09-23 handoff: root committed the explicit GPU queue pilot
(`98c33aa`) and NIST optical Table 4 local-transcription archive (`34bd387`).
`cpu_convergence` now owns only the separate GPU pilot client types, UI, and
focused tests; standard simulation parsing remains separate. `property_snapshot`
has completed the Python NIST comparison gate (`dffa0e5`) and now owns its
server run/source API service, route, and focused tests. `run_contract_ui` now
owns only new Python model-capability audit files and narrow matrix corrections.
Root owns integration,
`STATUS.md`, this file, and commits. All three agents share the checkout and must
preserve external changes. The optical source package is complete; its former
owner has handed off. P4 real 60 W IN718 [45,30,20] µm / [4e-7,2e-7,1e-7] s
pilot remains inconclusive: energy passes, coarse mesh has no melt, and time-axis
W/D is identical at the cell-level operator. No experimental-validation claim.

Latest ownership update: root integrated CPU convergence (`94ddf92`), IN625
bounded solid data (`76d5506`), NIST bare-plate UI gate (`246904c`) and Table 4
uncertainty (`3376300`), CUDA single-track pilot (`37a56cd`), exact-source run
service (`b3292ee`), build-job effective snapshot (`887e398`), and source
selection UI (`0daa456`). Root owns `STATUS.md`, this coordination file, the
execution plan and integration. Bundle API (`258032f`) and bare-plate CPU pilot
(`f4e5ba0`) are committed. `property_snapshot` now owns
`python/lpbf_material_registry.py`, `python/in625_thermal_material.py`,
`docs/LPBF_ALLOY_CAPABILITY_MATRIX_2026-09-23.md`, and a new focused Python
test for bounded IN625 thermal data. `cpu_convergence` owns
`python/lpbf_gpu_thermal.py`, `python/lpbf_simulation.py`,
`python/lpbf_worker.py`, optionally `server/lpbfWorkerBridge.ts` and
`routes/lpbfSimulation.ts`, and focused tests for a separate GPU queue pilot.
Bundle UI (`2c5b78f`) is committed. `run_contract_ui` now owns
`server/lpbfSourceCatalog.ts`, a new
`data/benchmark/nist-amb2022-03-optical/` transcription, and focused source
catalog tests; it may update `src/data/meltPoolLiteratureCases.ts` and its
focused test only to share the data source. Root stages/commits each package
only after handoff and verification.
External dirty documents remain unowned.

User authorized continuous LPBF core/database work including GPU thermal parity
and data-gated alloy expansion. Starting branch `codex/lpbf-buildjob-material-identity`
at `a35499d`. The existing changes in `docs/README.md`,
`sonkayıtlar/LOG.md`, and new `docs/SCIENTIFIC_RESEARCH_VISION.md` are external
and remain unowned. All agents preserve them and root alone stages/commits.

# Current owner — 01a0c399-42df-72b0-9872-1010354f2d9a, 2026-09-21

Continues LOCAL b8b1f7f after source01a0c383 stopped writing. Owns
server/lpbfRunBundle.ts, tests/lpbf-run-bundle.test.ts, its narrow plan and
checkpoint docs/parent STATUS.md. First acceptance: full immutable run + source
snapshot/bytes, exact historical links, exclusive destination, completion last,
isolated verified restore. Existing source-only bundle preserved. No agents,
live migration, push or installs. All eleven external dirty paths remain unowned.
Phase0 OPEN; continue API/UI and shared physics after this package.
Bundle complete d7dc7e4. Now also owns server/lpbfArchivePaths.ts,
server/lpbfRunArchiveService.ts, routes/lpbfRuns.ts, narrow bridge/worker/server
integration, focused API/path/capture tests and .gitignore. No external paths
adopted. API plan 2026-09-21-lpbf-run-api.md defines current acceptance.

# Previous owner — 01a0c36f-7006-7eb3-992d-73265a0a354d, 2026-09-21

Continues clean application HEAD2ce1abc in the same LOCAL checkout. Predecessor
stopped writes after dispatch. Owns bounded current LPBF engine/core evidence map,
representative melting CPU resource profile, shared-core contracts/implementation
subplan, and checkpoint documents/parent STATUS.md. Preserve model identities and
frozen numerical acceptance thresholds. Phase0 remains OPEN. No installation,
push, live migration or secondary-module work. Graph generation18Sep is stale;
task-directed coverage and direct source fallback are required.

Completed baseline/planning commit b9567c6. Now owns and completes
python/lpbf_core_contract.py, test_lpbf_core_contract.py, lpbf_simulation.py,
lpbf_evidence.py, src/services/lpbfSimulationService.ts and lpbf-contract.test.ts.
New results carry v1 input/material/model/backend identity; legacy absence remains
legacy. Python8PASS, current WSL core+engineering/source/peak/overlap54PASS no
skips, real result client parse and all64prechange artifact hashes identical.
Initial full167unitPASS. Subsequently OTHER writer changed
docs/SECONDARY_MODULE_BACKLOG.md, src/components/uqLabData.ts,
src/services/pythonComputationService.ts, src/utils/monteCarloEngine.ts.
These four paths are NOT ours; preserved/unstaged. Latest full suite147PASS/3FAIL:
uq-coupon-csv, uq-empirical, uq-presentation crash on the new UQ import-time throw.
Final lint/strict targeted TS/build PASS; focused parser6PASS. Do not describe
the shared tree as clean/full-green. No owned server/process remains.
Next bounded package: durable simulation-run records bound to exact source
revisions; inspect existing repository/worker snapshots and design its own plan.
Source stops writing after successor dispatch; successor claims its real task ID.

# Previous owner — 01a0c35a-2c97-7352-8d90-87ae9e0403b3, 2026-09-21

Packages complete:661153a source UI; b0bd0bd HDF5 metadata review. Fresh WSL
engineering26PASS including OpenFOAM; doctor records missing dependencies, no
Torch GPU proof. Newest audit/CURRENT CONTINUATION define remaining Phase0 scope.
Source stops writing after successor dispatch; successor claims its own real ID.

Continues clean 77fb27f in the same LOCAL checkout; predecessor stopped writes.
Owns source archive UI/service/tests, LpbfEngineeringWorkspace integration and
checkpoint documents. Acceptance: source conditions/unknowns, hash-bound preview
and import, revision-bound fresh integrity, visible failures, stale-response
protection and actual browser/keyboard checks. Preserve activeSpecimen inputs.
Phase0 OPEN; shared LPBF core/database remains the overall objective.
CBM generation18Sep stale/untracked in scope; exact source fallback used.
UI package661153a complete;166unit/lint/strictTS/build and actual browser checks
passed. Test server42236 stopped. Next owns python/nist_hdf5_review.py, its tests,
IN718 source-context metadata, catalog provenance guard and review/checkpoint docs.
System Python3.12.10 has h5py3.16.0/NumPy2.5.3; use only metadata inspection here,
not solver verification. No dependency installation needed. Raw Model string has
unbalanced parentheses; no inferred correction or temperature conversion allowed.

# Previous owner — 01a0c349-747d-7e52-bbf7-8e87df3211f7, 2026-09-21

Continues shared LOCAL checkout from clean cda8c12; source01a0c339 stopped writes.
Owns server/lpbfArtifactStore.ts, server/lpbfSourceImport.ts, related focused tests,
repository integration and checkpoint documents/parent STATUS.md. First acceptance:
streaming hash/size verification, contained regular files, exclusive immutable
publication, owned staging cleanup, all bytes verified before metadata publication,
and bytes+metadata backup/restore. Preserve unreviewed scientific evidence. Phase0
OPEN; no live migration or secondary modules. CBM18Sep lacks these files; direct
source fallback. Plan: artifact store → import → bundle → actual IN718 pilot.

Storage package complete:14 new regressions/full156unitPASS, strict TS PASS.
Actual IN718 three files550398609bytes imported/backed up/restored; portable report
`.runtime/lpbf-source-archive-portable-01a0c349/report.json`. SHA identity unchanged,
null measurement conversion preserved. Bundle snapshots no longer create WAL/SHM;
sidecar-bearing bundles rejected. Docs LPBF_SOURCE_ARCHIVE/PROOF record limits.
Next package: a bounded source archive API and UI integration, then HDF5 review and
shared-core gates. Source archive is not a complete simulation/experiment backup.
Storage commit ca3fb07 clean. API package owns server/lpbfSourceCatalog.ts,
server/lpbfSourceArchiveService.ts, routes/lpbfSources.ts, server.ts, .gitignore
and tests/lpbf-source-api.test.ts. Approved local catalog only; no client paths,
URLs or source metadata accepted. Preview binds document hash and expected revision;
import revalidates all bytes. Fresh integrity checks remain separate from science.
API package complete:5new tests/full161unitPASS, lint/strict API TS/build PASS.
Actual production server3195+IPC5195 smoke imported3IN718 files, verified current
bytes, retained null conversion and rejected stale revision409. Owned server40016
and descendants41112/30868/console hosts stopped; both ports have no listeners.
Evidence `.runtime/phase0-audit/source-api-smoke-01a0c349.json`. No UI changes yet.
Next owner should add source archive panel to LpbfEngineeringWorkspace comparison
stage with current-input-bound async state; do not turn raw signal into measurements.
Source01a0c349 stops writing after successor dispatch; no overlapping work assumed.

# Previous owner — 01a0c339-7e60-7573-b548-4fd5e6cbef44, 2026-09-21

Continuation started from clean application HEAD affdaec. Source01a0c326 stops
writing after dispatch. First package owns python/lpbf_worker.py,
python/test_lpbf_thermal_materials.py and checkpoint documents/parent STATUS.md.
Acceptance: thermal-accumulation uses four_alloy_materials, resolves aliases,
rejects unknown/missing identity instead of silently calculating Ti64, and keeps
the screening equations unchanged. Verify real JSON-lines worker requests and
CPU engineering/Phase17 tests. No secondary-module work, push or installation.
Graph generation18Sep is stale; exact source fallback applies. Phase0 OPEN.
Also owns the thermal service's required material type. Package verified:
RPC3, engineering25+1skip, Phase17 5, optional1, unit133 and lint PASS.
Next owns tests/lpbf-sqlite-compatibility.test.ts and SQLite ADR/provenance notes.
Material repair committed2a118ee. SQLite trial3 and full unit136PASS; source-context
metadata and low-power profile recorded. Also owns PROOF.md. Next scope is isolated
versioned metadata repository and its tests; no live legacy data migration yet.
Exact next paths: server/lpbfSourceRepository.ts, tests/lpbf-source-repository.test.ts.
Contract: immutable source archive metadata revisions, explicit unreviewed evidence,
bounded validated JSON, hash-checked reads, CAS conflicts, metadata-only backup.
Repository complete:6new tests/full142unit/targetedTS/strictmodulePASS. Real IN718
metadata-only pilot saved and restored under ignored .runtime. No live migration.
Next work is content-addressed artifact storage + dry-run import + full bundle.
On clean continuation dispatch, source01a0c339 stops writing; successor must claim
this same LOCAL checkout after reading STATUS/CURRENT CONTINUATION and Git.

# Latest architecture decision — shared LPBF core authorized

User explicitly reversed the earlier restriction: "Yok yok ortak çekirdek yapalım".
Build the shared LPBF core and database integration; defer secondary modules.
Final in-flight repair64e7cca (Python0159cdf), app tree clean. Existing model-specific
assumptions and validation evidence must remain explicit.

# Current owner — 01a0c326-5fad-7fb1-8c28-47770538592d, 2026-09-21

USER PRIORITY UPDATE: LPBF engines and database first. Secondary module work is
deferred in SECONDARY_MODULE_BACKLOG, no longer a phase gate. In-flight EIS repair
verified unit133/lint/build, Python4+12+10 and actual browser; recording final
checkpoint only. Next scope is LPBF tests, material authority and data persistence.

User explicitly authorized continuation and confirmed no other agent is editing
the three dirty EIS files; inherit their existing changes without reverting.
Source01a0c323 has stopped writing. Starting HEAD5c9e7cb. First package owns
python/cnls_fitting_solver.py, focused synthetic contract tests, then the
SyntheticNoiseStressStudio/cnlsOptimizer/syntheticEISNoiseGenerator consumers,
their types and regression/browser harnesses. Preserve observed external edits.
Acceptance: fit displayed points, no invented recovery/uncertainty/grades,
input-bound asynchronous work, meaningful unit/numerical/browser checks.
Phase0 OPEN. STATUS and handoff maintained by this owner.

# Historical owner retained — successor NOT created

Two create_thread calls were auto-review rejected. Original user messages were
retrieved before retry, but review still requires direct approval in this task.
Approval question pending; do not bypass/retry without it. Source01a0c15d retains
ownership. d4db76d code verified; clean app tree before docs-only checkpoint.
Phase0 remains OPEN; exact next work is CURRENT CONTINUATION. No running server.

# Successor dispatch checkpoint after d4db76d

Identity/fitted-topology package complete;126unit/lint/build/10browser hook checks
PASS, actual held-response paths verified. Servers37764,17228,25496 and verified
children stopped;3193/5193 no listeners. Source01a0c15d stops writing on fresh LOCAL
successor dispatch. Successor inherits after STATUS/CURRENT CONTINUATION/Git.
Next scope: explicit client-JS and SyntheticNoise contracts; inspected findings
recorded in handoff, not yet implemented. Phase0 OPEN. No push/install.

# Current owner — 01a0c15d, 2026-09-21

Inherited clean LOCAL main HEAD792e6b7; source01a0c148 stopped on dispatch.
Owns CNLSFittingStudio, EquivalentCircuitBuilder, PlotlyEISViewer, a focused
request lifecycle helper if needed, tests/contracts-browser.tsx and checkpoint
documents/parent STATUS. Acceptance: changed inputs/retries/unmount reject late
fit and DRT results; accepted fits do not silently rewrite newer inputs; Python
simulation never displays old points as current. Held real-response browser
regression plus lint/unit/build. No push/install/worktree or Gemini assignment.
Phase0 remains OPEN. Historical ownership below is superseded.

Package verified: unit126/lint/buildPASS,10 hook browser assertions, real held
fit/DRT/simulation regressions PASS. Additional owned paths pythonCnlsReport and
its test: fitted report topology corrected (R3→R2 red/green). Details in Phase0
audit. Next scope: explicit client-JS solver and SyntheticNoise consumers.

# Successor dispatch checkpoint

Code e1ab00f complete; browser serverPID17488 and descendants stopped;
3192/5192 have no listeners. Source01a0c148 stops writing upon fresh LOCAL
successor dispatch. Inherit after reading STATUS/CURRENT CONTINUATION and Git.
First scope: Studio/Builder/Plotly input identity and late responses. All other
open scopes/limits are in current handoff. Phase0 remains OPEN.

# CNLS package checkpoint — current owner01a0c148

Sign fix b5c83c3; result-contract package verified with Python12+10, unit125,
lint and buildPASS; browser actualAPI3192→IPC5192 passed local fit/error/partial
flows. Owned paths include CNLSFittingStudio, cnlsOptimizer, pythonCnlsReport,
eisData types, builder null rendering, focused tests and checkpoint documents.
Next immediate scope: late-input/report identity across Studio/Builder/Plotly;
explicit client-JS and SyntheticNoise stress wrappers still need audit. Then
synthetic EIS provenance and prior Phase0 gates. Phase0 OPEN. No push/install.

# Current owner — 2026-09-21

Continuation task 01a0c148-fa30-79c0-8e4f-94a5c74bb4d4 inherits the shared LOCAL
main checkout at clean HEAD4f76eca. Source01a0c133 stopped writing on dispatch.
Owns python/cnls_fitting_solver.py, new focused numerical tests, fitting report
contracts/consumers as inspected, and STATUS/PROOF/audit/handoff/this record.
First acceptance: analytic R and R-C recovery; truthful fixed/zero-iteration,
uncertainty and convergence reports. No phase acceptance, push, install or
Gemini scope assumed. Historical ownership below is superseded.
# Active Work

Checkpoint ad5adf5: current package complete (lint PASS, unit122, build PASS,
browser software checks). Final server PID31408 absent and3191/5191 have no
listeners. Fresh successor will inherit on dispatch; source01a0c133 will stop
writing then. First pending scope: Python CNLS numerical/short-input contracts,
shared fitting consumers and synthetic EIS provenance, after inspecting/claiming.
See CURRENT CONTINUATION; historical ownership below is superseded on transfer.

Continuation task 01a0c133-a81d-7f93-9174-d85ad5b1e979 owns the shared LOCAL
checkout from clean HEAD 6600806 on 2026-09-21; source 01a0c11f stopped writing.
Current package: the twelve component paths in lint-continuation-baseline.txt,
src/utils/materialDataPipeline.ts and focused regression/browser tests. Ownership
also includes this record, Phase0 audit, handoff and parent STATUS.md. No worktree,
push, package install or Gemini assignment. Acceptance: tsc passes through actual
contracts; candidate identity/properties survive transfer; missing precipitation
input cannot become a default prediction; EDS transfers chemistry only; browser
interaction, unit suite and build verified. Phase0 remains OPEN.

Browser exposed a real Python CNLS report mismatch (missing chiSquare crashes
the circuit builder). Same owner additionally claims src/utils/pythonCnlsReport.ts
and tests/python-cnls-report.test.ts. Normalize observed fields without success
defaults; do not infer convergence when Python omits its termination reason.


Continuation task 01a0c11f-9971-7130-b007-bfc77b3a474a takes ownership on
2026-09-21 from source 01a0c10a after verifying clean HEAD a1348ff and empty index.
Same LOCAL checkout; no worktree, push or Gemini assignment. Current package owns
the two EIS studios, shared latest-request hook/service and regression tests.
Acceptance: backend errors/missing reports remain unavailable, old responses and
cached results cannot masquerade as current input, and no compliance defaults.
Micrograph export remains the next claimed package. Phase 0 remains open.

EIS package complete: unit117/117, build PASS, live component/API browser checks
PASS (real results, controlled failures/partial/late responses, keyboard). General
lint remains FAIL, no changed-EIS diagnostics. See Phase0 audit for exact limits.
Next work: train_micrograph_segmentation.py import side effects and untrained
export guards; new Python regression tests belong to this same owner.

Micrograph export package complete: seven guard regressions PASS; existing
nonfabrication backend ten PASS. Training/export availability is explicit, no
artifact generated. Next planned scope is the existing TypeScript lint failures;
claim exact files after inspecting real type contracts. Test servers3190/5190 stopped.

Successor Codex task 01a0c10a-46a8-76f0-8ab9-a58e32966009 took ownership on
2026-09-21 after checking HEAD 95b6222, the empty index, and every inherited dirty
path against the handoff. Source task has stopped editing. Same checkout and
acceptance gates continue; no Gemini work assumed. Additional owned UI paths:
src/components/EISUploadInsightsStudio.tsx and PhysicalValidationStudio.tsx.
Acceptance: analysis failures clear results and expose errors; unavailable
consistency metrics never become fabricated pass/fail evidence.

Live API follow-up: Codex owns server/pythonRuntime.ts and
tests/python-runtime.test.ts. Explicit METALLIX_PYTHON must select that executable
for LPBF as well as other services; absent an override, preserve WSL-first behavior.

Verification record ownership includes PROOF.md and
python/benchmark_keyhole_convergence.py. This is prescribed-cavity numerical
evidence only; curved mesh asymptotic convergence remains unresolved.

Fresh-task handoff requested by the user: see DIGITAL_TWIN_HANDOFF_2026-09-21.md.
After successor dispatch the source task stops editing; successor Codex inherits
the scopes below after rechecking Git/ownership. Continue until acceptance gates
are satisfied; proactively checkpoint and transfer before context fills.

Coordination record; not an atomic lock or proof that another agent received a task.

| Agent | Task | Checkout | Owned paths | State / acceptance |
| --- | --- | --- | --- | --- |
| Codex | Digital Twin Phase 0 current-code audit | Metalliksa-1, main, baseline fb1a614 | docs/ACTIVE_WORK.md, docs/DIGITAL_TWIN_PHASE0_AUDIT_2026-09-21.md, audit regression tests; parent STATUS.md | In progress: fresh runtime/build/tests, keyhole energy/seed/input checks, orchestrator and UI/API/worker tracing; no phase gate accepted yet |
| Gemini | Not assigned here | Unknown | None recorded | User will assign scope; confirm paths before overlapping writes |

Codex additionally owns python/lpbf_worker.py and python/test_lpbf_worker_optional.py to isolate optional Warp/PyTorch imports from the CPU queue. Acceptance: real CPU capabilities and estimate requests work without optional backends; unsupported requests return an error without killing the worker; existing queue tests retain cancellation/restart/error behavior.

Next repair scope (same owner, 2026-09-21): python/lpbf_keyhole_raytracing.py, python/test_phase26.py and new keyhole regression tests; python/orchestrator.py, python/lpbf_modulus_fno.py, python/test_phase11.py, python/battery_corrosion_python_ingest.py, python/battery_corrosion_eis_solver.py, python/train_micrograph_segmentation.py and fabrication regression tests. No fabricated measurements, untrained inference or fixed thermal result may be published as a successful calculation. Missing implementations fail explicitly. Keyhole acceptance: valid bounded finite inputs, executable Warp kernel, reproducible local RNG, distinct absorbed/escaped/truncated energy and flat-surface analytic checks. No experimental validation claimed.

Integration scope also owned by Codex: routes/lpbfSimulation.ts, src/components/KeyholeRaytracingLab.tsx, docs/MODULE_EVIDENCE_INVENTORY.md, and tests for the new route. Acceptance: same-origin UI → Node → worker requests; visible backend failure; superseded results discarded; no implicit remote scene assets; current inventory includes all registry modules with honest evidence limits.

Codex maintains shared STATUS.md and serial Git index operations until an explicit handoff. Further product fixes will be claimed here after inspection and before editing. Gemini scope remains unknown; this record is not delivery confirmation. Recheck working tree and this record before each write/commit.

Checkpoint8157c18 complete. Source task01a0c10a stops writes when successor is
created. Next owner must read STATUS and the CURRENT CONTINUATION section of
DIGITAL_TWIN_HANDOFF_2026-09-21.md, verify Git, then continue the claimed open scopes.
No Gemini work assumed; no phase gate accepted. Temporary test servers are stopped.
# Current owner — 01a0c383-a755-7b53-84c6-3ec040b67aa0, 2026-09-21

Handoff checkpoint:5ee6fae run archive; adfdcca evidence repair. User explicitly
requested a fresh task now (context grew). Source stops all writes after LOCAL
successor dispatch; successor claims its real ID. Test3197 server and verified
descendants stopped. Next fullrun+source bundle/restore then bounded API/UI.
Remaining dirty files are external, preserved; user stopped that other task.

Run package committed5ee6fae. Next owns only LPBF experimental comparison:
python/lpbf_experimental_validation.py, python/test_phase10.py,
src/components/ExperimentalValidationLab.tsx, its focused presentation test and
checkpoint docs. Remove fabricated fixed simulation inputs and unconditional
validated/pass/high claims. Missing linked data remains unavailable; arithmetic
comparison must not imply independent experimental validation.

Continues LOCAL HEAD64bc5aa. Owns new lpbf run capture/repository/import modules,
their focused tests, narrow python/lpbf_worker.py integration and checkpoint docs.
Acceptance: immutable snapshots, Python-verified bindings, complete output manifest,
exact historical source revisions, byte checks before publication, isolated restore.
No live migration, second queue, installation, push or secondary module work.
Preserve external edits in SECONDARY_MODULE_BACKLOG, uqLabData,
pythonComputationService, monteCarloEngine, eisFileParser and tafelParser.
CBM generation2026-09-18 stale/untracked; direct source fallback for named paths.

## Newest core-physics slice — Phase 22 evaporation (2026-09-24)

Phase 22 now uses the same `T >= T_solidus` gate for liquid-surface
evaporation energy loss, free-surface mass recession, and energy-ledger
accounting. A regression first reproduced energy loss at 1850 K with fixed
surface height, then passed with zero below-solidus evaporation and preserved
the above-solidus mass/energy relation. Full
`test_lpbf_transient_3d_gpu.py`: **30/30 CPU Warp PASS**; no GPU execution was
run for this slice. Windows pytest-cache and Warp PCH-temp cleanup ACL warnings
occurred after passing kernel checks. Experimental/model qualification does
not change. Next physics review: bound the explicit momentum predictor's time
step by advection and viscosity stability as well as thermal diffusion.

## Latest numerical physics fix — explicit momentum time step (2026-09-24)

`solve_toolpath` now limits its nominal step by both thermal diffusion and the
combined explicit advection/viscosity rate, conservatively assuming the
existing 5 m/s per-component velocity clamp. The bound is
`dt * sum(5/h_a + 2*(mu/rho)/h_a^2) <= 0.5`. The synthetic low-alpha case
confirms the momentum limit controls, and exact-end-time scheduling remains
intact. The full Phase 22 Python suite passes **31/31 on CPU Warp**. This is
numerical stability coverage, not experimental validation. Next: continue the
separate alloy data gate and P4/P5 model/data blockers without changing their
recorded outcomes.

## Latest P7 source decision — Hastelloy X (2026-09-24)

The source review does not clear a complete melting-range data gate. Scheel
et al. gives useful as-deposited LPBF Cp/enthalpy coverage, but liquid
conductivity is a 15× model assumption, density is a fixed room-temperature
measurement, and uncertainty is incomplete. NASA AM context and NIMS
liquid-density evidence do not combine into a chemistry/state-matched property
revision. Keep P7 and runtime admission closed; a bounded pilot may be considered
only with measured properties separated from explicit assumptions. Detailed
source limits and citations: docs/HASTELLOY_X_P7_SOURCE_HUNT_2026-09-24.md.

P4 remains failed, P5 unavailable, and P6 partial. Continue physics closure and
same-physics GPU scale/crossover analysis; numerical parity alone is not
qualification.

## Latest core-physics closure — projected CFL and graph-floor stop (2026-09-24)

Phase 22 now checks the actual projected velocity field against the explicit
momentum/enthalpy transport bound before enthalpy or the energy ledger changes.
If the conservative 0.5 rate bound is exceeded, the solver fails closed with a
validity error. The same preflight stops if a molten surface with evaporation
would be clipped at the z=2*dz graph floor. Synthetic regressions cover both
conditions; the full Phase 22 suite passes 33/33 on CPU Warp. GPU execution was
not part of this test run; Windows Warp temp cleanup emitted an ACL warning
after passing tests.

NIMS experiment 264 remains a separate liquid-density source lead only:
public metadata exposes no chemistry ID, numerical values/uncertainty, or
specimen-specific surface-tension/viscosity fits. See
docs/HASTELLOY_X_P7_SOURCE_HUNT_2026-09-24.md. P4 failed, P5 unavailable, P6
partial, and P7 closed remain unchanged.

## IN625 repeated timing checkpoint — 2026-09-24

A post-change timing campaign used a warm-up and five alternating CPU/CUDA
repeats at each frozen mushy-range resolution. Median CUDA/CPU ratios were
24.6× slower at 128 cells and 14.1× slower at 1,024 cells; temperature-field
differences remained below 9.1e-13 K. The focused suite passed 12/12 after the
synchronization reduction. This direct solver timing excludes UI/API transport
and is not a paired before/after campaign, so it establishes neither speedup nor
crossover. Details: docs/IN625_CUDA_BENCHMARK_2026-09-24.md.

Next: keep this path as explicit numerical CPU/CUDA parity evidence and profile
larger same-physics workloads before attempting fused kernels. P6/P7 remain
partial; IN625 remains unvalidated.

## Larger same-domain IN625 timing screen — 2026-09-24

A 2,048-cell z-refined case preserved the 2×2×0.5 mm domain, 3.3 ms
duration, 30 W / 0.099 J source and 1500 K initial condition. Three
alternating warmed timings had CPU/CUDA medians 4.013/43.617 s, with CUDA
10.87× slower. Both outputs reached 1593.516258 K and 44 mushy cells; the
independent enthalpy and energy oracles passed, with max temperature/enthalpy
differences 9.10e-13 K / 4.66e-10 J/kg. This remains numerical screening, not
process validation or GPU crossover. See
docs/IN625_CUDA_BENCHMARK_2026-09-24.md.

Next: only pursue fused GPU work if a backend profile confirms launch or
arithmetic bottlenecks; keep P6/P7 partial.

## Latest Phase 22 surface/enthalpy consistency fix — 2026-09-24

The moving whole-cell surface graph could advance after the enthalpy update,
leaving newly exposed cells hot in the published final state. A reconciliation
kernel now resets those cells to ambient enthalpy/temperature and records the
change once in `surface_mask_reset_J`; reported liquid volume is masked by the
current surface graph. The integrated moving-surface regression confirms a
nonzero reset term and relative energy closure error `2.79e-4`. Full
`test_lpbf_transient_3d_gpu.py`: **34/34 PASS**, including execution on CPU Warp
and RTX 4060 `cuda:0`. This is software/numerical consistency evidence, not
experimental validation. The per-step kernel's performance cost is not yet
measured.

Next: continue the active P0–P10 LPBF goal. First resolve how to represent the
NIST P5 source's 800°C/2 h treatment in the existing immutable dataset,
manifest, API catalog, and archived revision chain; do not silently rewrite a
source-bound artifact. Preserve P4 failed, P5 unavailable, and P6/P7 partial.

## NIST AMB2022-03 metadata correction — 2026-09-24

The official methods description establishes that the AMB2022-03 bare plates
were vacuum residual-stress annealed at 800°C for 2 h before scanning (Section
2.1, PDF p. 2); Section 2.5 identifies BP1 as one of those bare plates. The
local aggregate values were unchanged. A new immutable transcription
`table4-aggregate-v2.json` / version 1.1.0 records that preparation, its source
location, and the superseded v1 artifact hash. The manifest, source catalog,
NIST comparison service, Python gate, and run client now bind the v2 SHA-256.
The frozen P5 v1 preregistration remains on its original path and hash.

Windows subprocess stdin is explicitly decoded as UTF-8 in the Python NIST
comparison entry point; default console encoding had corrupted the new degree
symbol and caused correct source bytes to fail both canonical-content and
metadata checks.

Verification: NIST source/run API/UI/literature tests **30/30 PASS**; Python
comparison plus official workbook aggregate tests **9/9 PASS**; TypeScript
`npm run lint` PASS. This corrects specimen metadata only. P5 remains unavailable
because the modeled slab/support/bottom thermal boundary, 5° incidence,
measured-profile byte binding, and section operator do not match the NIST
experiment.

Next: scope a source-matched 3.17 mm IN718 plate with full-contact SS304 backing
and bottom boundary, then close the 5° source geometry and profile evidence
before any new P5 run. Keep P4/P5/P6/P7 outcomes as recorded; do not relax source
capture, mesh, or acceptance thresholds.

## Phase 22 guard GPU follow-up — 2026-09-24

The lower graph-floor and projected-CFL regressions now cover CPU and explicit
cuda:0 when available. Focused execution passed 2 tests and 4 device subtests
on NVIDIA GeForce RTX 4060 Laptop GPU. This verifies the new guard kernels and
fail-closed path execute on CUDA; it does not qualify the process model.

## NIST P5 geometry feasibility audit — 2026-09-24

The current `stationary-enthalpy-conduction-v1` resolves one homogeneous material, with a minimum 300 µm IN718 substrate, an initial-temperature fixed bottom, and no SS304 layer/contact model. The NIST comparison cannot be made source-matched by merely increasing domain depth: that would extend IN718 rather than add the support stack. Any backing/contact treatment needs a separate opt-in solver/model identity so existing v1 runs and hashes remain valid.

The current source is a normal-incidence symmetric Gaussian. `scanAngle_deg=0` is the scan-path direction and does not encode incidence. NIST Table 1's optical/thermography setup is 5 ± 0.5°; the 8° condition belongs to separate dynamic-coupling measurements. The AMB2022-03 optical package reviewed for this audit exposes no measured irradiance-map artifact, so a measured-profile gate must remain closed until one is located and byte-bound.

Next: design the versioned source/geometry contract for an opt-in layered 3.17 mm IN718 plate plus full-contact SS304 backing, with explicit interface and bottom-boundary assumptions and incidence angle/azimuth. First validate the numerical implementation independently; retain P5 as unavailable until exact source evidence, section operator, convergence, and comparison checks all pass. Preserve v1 behavior and all P4/P5/P6/P7 outcomes.

## P5 public source boundaries — 2026-09-24

NIST identifies the AMB2022-03 coupon dimensions (25.4 × 25.4 × 3.17 mm), 800 °C / 2 h residual-stress anneal, full bottom contact to an SS304 baseplate clamped by two screws, center underside Type-K thermocouple, and backside rise below 0.1 °C after a single track. The reviewed public sources do not identify the SS304 baseplate thickness or outside dimensions, screw preload/coordinates, interface conductance, or a dimensioned holder drawing. The local 2716/2718 packages expose process/thermography or optical geometry artifacts but no holder thermal-stack data. These unknowns cannot be replaced by guessed thickness, ideal contact, or AMB2022-01 geometry.

The profile source hunt found no AMB2022-03 measured irradiance array/map in the official source packages or the NIST beam-metrology report. Reported beam diameter/caustic and a rotationally symmetric Gaussian description are not the measured spatial profile bytes required by the current evidence gate. A beam CSV from AMB2022-01 belongs to different apparatus/conditions and is not transferable.

Next: complete the v2 contract design with explicit known coupon/process facts, and treat SS304 thickness/contact conductance/boundary as provenance-bound unknowns or sensitivity-only parameters. Keep the measured-profile gate closed; no source-matched P5 result can be reported until both the missing hardware metadata and exact profile artifact are resolved. Do not weaken the existing acceptance gate.

## Layered plate v2 numerical pilot — 2026-09-24

Added an opt-in `layered-plate-enthalpy-v1` CPU reference path for one bare IN718 plate over a generic SS304 support. Plate/support thickness, area-specific interface resistance, support-bottom boundary, oblique assumed-Gaussian source geometry and source penetration are explicit inputs and are bound in `coreContract` schema v2. The finite-volume interface operator conserves face transfers; the support has a separately hashed, bounded generic literature snapshot. Existing v1 model identity remains unchanged.

Focused verification: layered plate + heat source + layered conduction **24 PASS / 1 platform skip**; two v2 core-contract tests **2/2 PASS**; Python compile, TypeScript typecheck and `git diff --check` PASS. The TypeScript runtime test is blocked by Windows Node/esbuild `spawn EPERM`. One broader saved-binding test is blocked by Windows SQLite temp-directory ACL errors. These are stated validation limits, not solver passes.

This path is an unvalidated sensitivity model, not a source-matched AMB2022-03 reproduction. Generic SS304 properties and assumed contact/bottom boundary values are not specimen measurements; no measured AMB2022-03 irradiance map was found. Keep NIST P5 unavailable. The layered-model package is committed as `9a95cce`. The independent IN625 CUDA inverse is committed as `0c15487`; it passed 13 focused field tests and three same-workload paired timing runs. Warp was faster in each, with identical peak/mushy-cell fields and negligible enthalpy difference. Raw times and the variability boundary are in `docs/IN625_CUDA_BENCHMARK_2026-09-24.md`. This is limited to the tested screening workload and does not validate the alloy or process. Next: close or explicitly retain the P7 material data gate, then verify the full select→compute→compare→export→restore workflow; P6 is still partial.

## Layered-plate v2 scaffold

A standalone `lpbf_ss304_support_material.py` now provides a hashed, generic AISI 304 literature-property snapshot and bounded Cp/k/density/enthalpy evaluator for sensitivity-model development. It is deliberately not runtime alloy admission and is not the specimen's exact support revision; temperature evaluation outside 273.15–1473.15 K fails closed. Focused tests pass 4/4. Next, integrate only through a separate opt-in layered solver identity and retain the NIST source-match gate as unavailable until backing thickness, contact/bottom boundary evidence and measured AMB2022-03 beam-profile bytes are available.
# 2026-09-25 — proxy campaign contract and physics-engine audit

Current package adds a standalone `lpbf_nist_proxy_campaign.py` v1 contract:
three unique computational runs × two 4.9/6.0 mm thermal-proxy sections,
source/run/input/material provenance, and hard rejection of optical/etched or
experimental-validation claims. It additionally fails closed on boolean
schema versions, malformed trusted source metadata, and unsafe absolute or
traversing artifact paths. A valid report says `proxy-screening-only`, with
`numericalConvergenceStatus=not-evaluated` and no comparison residuals.

Focused test: `python -m unittest test_lpbf_nist_proxy_campaign -v`, **12/12
PASS**; targeted diff check PASS. The contract is not yet integrated into the
archive/API and does not verify files, solve physics, implement the observation
operator, calculate residuals, or establish mesh/time convergence.

User explicitly authorizes scientifically justified repair or replacement of
poorly functioning physics engines, including Python implementations. Next:
trace current callers/identities and audit CPU `enthalpy-fv-6` and Phase 22 GPU
operators against independent conservation/manufactured-solution checks; make a
new solver revision only for a reproduced defect, preserve old model/hash
identity, then compare CPU/GPU on identical frozen inputs. Do not present
screening or numerical parity as experimental validation. P4/P5/P6/P7 gates
remain as recorded.

# 2026-09-25 — Phase 22 parity repair and transient verification gap

Both the Phase 22 full-field and multistep CUDA parity tests hardcoded five
steps, while the adaptive stability rule produces 19 for the frozen 6 µs case.
The stale assertions prevented parity checks from running. They now require
positive step count and equal CPU/CUDA count, then execute the existing fixed
field/pressure/surface tolerances.

Verification: six focused Phase 22 suites passed **42/42** on the NVIDIA RTX
4060, including manufactured thermal and pressure fields, energy closure, and
full-field thermal/hydrodynamic parity. Legacy Phase 21 focused tests passed
**6/6**. The larger CPU engineering/heat-source/core-contract command reached
62 tests but had **8 errors and 2 skips**; errors came from SQLite temp DB
creation/cleanup permission failures, so report it as incomplete.

Independent source review found no reproduced bug in production CPU
`enthalpy-fv-6` or the reviewed Phase 22 operators. This does not qualify their
screening/prototype assumptions or experimental validity. Known boundary: the
CPU temporal refinement study uses a test-local update loop rather than the
production transient stepping path. Next: create an independent manufactured
transient check that exercises production stepping, while preserving solver
identity for any correction and only opening a new model revision for a
reproduced physics defect. The current user authorizes scientifically justified
Python solver repair/replacement. P4/P5/P6/P7 gates remain unchanged.

## 2026-09-25 — production CPU final-step correction and convergence result

The production `transient()` loop accumulated enough floating-point time error
to add a tiny final step at 50/25 ns. A frozen 350 µs case produced 7,001 /
14,001 steps and minimum dt `5.18e-17` / `4.34e-19` s. The loop now snaps the
reported integration time to `end` inside a step-count-scaled ULP tolerance
capped at `1e-14` s. The integration increment, source, and energy accounting
are unchanged; the new regression fails before this fix and passes after it.

Post-fix actual CPU 3×3 run: standard IN718, 40 W, 200 µm track, 40 µm layer,
layer-conforming, meshes 40/20/10 µm; timestep caps 100/50/25 ns yielded actual
100/50/25 ns and 3,500/7,000/14,000 steps. Max energy residual `1.63e-13`.
Mesh gate **failed**: depths 40/20/30 µm; finest pair differs 33.3%. Time gate
**inconclusive**: width/depth are identical across time levels although peak T
changes 2795.36→2793.79→2793.74 K; that metric is outside the pre-frozen gate.
Focused production physics and convergence-contract tests **15/15 PASS**.

Next: retain P4 as failed/inconclusive; diagnose grid/thresholded-geometry
resolution and design any new observable/protocol before running it. This is
numerical screen evidence, not experimental validation. Preserve original P4
thresholds and continue the complete P0–P10 objective.

## 2026-09-25 — Production transient manufactured check and CUDA request guard

Added `python/test_lpbf_production_transient_manufactured.py`. Uniform and
nonuniform manufactured enthalpy ramps now run through the actual CPU
`transient()` loop while retaining production source-limiter retries and
capture checks. For the nonuniform solution, the passive conduction and
boundary-loss rate at every step matches a separately coded face-flux oracle;
three distinct timestep caps recover the analytic final peak and center. Both
cases close energy below `1e-10`. This closes the prior gap where temporal
refinement used a separate local update loop and now checks the production
spatial operator on a manufactured field. It remains numerical verification,
not experimental validation.

The CUDA thermal pilot now rejects `powderGridPolicy=layer-conforming` before
device discovery and mesh work. The pilot still implements the standard-grid
model identity, so accepting a layer-aligned request would have performed
expensive work under the wrong contract. Standard/reference acceptance remains
covered. No physical equations or legacy model identity changed.

Verification: `test_lpbf_gpu_thermal` plus the two manufactured transient tests
**9/9 PASS**, including frozen IN718 and estimated-legacy 316L CUDA parity on
RTX 4060. The manufactured + heat-source + convergence suites ran **27 tests:
26 PASS, 1 Linux-only OpenFOAM skip**. These checks do not establish
experimental validity or a GPU speedup.

Implementation commits: `e8fd1ca` and `7bacffa`.

Next: measure the scale/crossover of a parity-matched CUDA/Warp implementation
of the same `enthalpy-fv-6` physics before using it to attempt the preregistered
2.5 µm P4 refinement. Preserve P4 thresholds/outcomes; P6 remains partial and
IN625 full-transient admission remains closed.

## 2026-09-25 — P7 alternative-alloy source gate

A primary-source scan found no alternate LPBF alloy ready for full-transient
admission. The strongest data set is NIST SRM 1155a steel (Cr18-Ni12-Mo2; the
thermophysical papers identify it as 316/316L): its certificate is a dense
steel disk intended for chemical-analysis reference, while the papers provide
enthalpy/density/Cp and thermal conductivity over the melting range. Part of
conductivity is inferred from Wiedemann–Franz and
Smith–Palmer relations; the high-temperature solid Smith–Palmer coefficients
come from a composition-similar 316L, and the liquid relation is an explicit
Wiedemann–Franz assumption. It can support only a separately named dense-SRM
reference model, not LPBF powder/as-built admission. [NIST certificate](https://tsapps.nist.gov/srmext/certificates/1155a.pdf),
[Pichler et al. 2019](https://doi.org/10.1007/s10853-019-04261-6),
[Pichler et al. 2022](https://doi.org/10.1007/s10765-022-02991-5).

The screened AM-state alternatives do not cover melting: PBF Ti-6Al-4V
thermophysical data stop near 1000 °C, and the reviewed as-built SLM AlSi10Mg
data stop at 500 °C. [Ti-6Al-4V PBF study](https://doi.org/10.1016/j.addma.2022.103045),
[AlSi10Mg study](https://doi.org/10.1557/jmr.2018.405). Decision: keep the P7
LPBF alloy gate closed; do not relabel dense NIST steel properties as AM
properties. Existing estimated-legacy 316L and IN625 screening remain
separately classified.

## 2026-09-25 continuation — scientific Python authority and P6 source path

Can explicitly authorized scientifically justified repairs or a Python replacement for a core physics engine when its current results are inadequate. Preserve governing-equation provenance, model identity, frozen acceptance thresholds and evidence scope. Separate analytical/manufactured checks, CPU/GPU parity, performance measurements and experimental validation.

The opt-in CUDA implementation now evaluates the same two-node GL2 moving Gaussian cell integral and the existing 25 K source-step limiter used by the CPU reference for the bounded standard powder-layer single-track subset. Direct cell source/rate agreement is within `rtol=1e-10`; capture differs by at most `1e-12`, timestep by `1e-15`, and retry count is exact. The frozen full CPU/CUDA temperature-field parity passes without relaxing targets. Optimizing GL2 batching and joining capture/timestep readback reduced the CUDA-source median from 10.171 s to 9.062 s, but the synchronized alternating 934-step CPU-source median was 6.722 s: the CUDA source path remains about 35% slower. It stays opt-in; queued/default metadata still identifies CPU source integration and limiting. No speedup is claimed. Commit: `a3d8aaa`.

Focused verification on the current checkout: `python/test_lpbf_gpu_thermal.py` 9/9 passed on the RTX 4060; full `tsc --noEmit` and the owned-file `git diff --check` passed. The tied-peak diagnostic regression passed 2/2; no historical P4 result or frozen threshold changed. Earlier production transient manufactured-forcing and face-flux checks remain recorded above.

The NIST proxy-campaign persistence/API slice is committed as `d967f87`: three archived runs must bind the same exact source revision, physical input/material revision and core identity; the server derives the campaign from archive records. Client-supplied measurements/residual/validation claims are rejected. Bundle schema v2 retains v1 reading and checks run/source references. Runtime Node/tsx tests could not start in this Windows environment (`spawn EPERM`); do not call the campaign flow integrated until the UI slice and end-to-end checks are completed. A route allowlist regression was added but shares this runtime limitation. Do not present this six-section thermal-proxy screening record as an optical comparison or NIST validation.

Next: finish the campaign UI/client typing and panel wiring; rerun typecheck and focused tests where the environment permits. Then run an identical-workload P6 scale/crossover benchmark while preserving the strict parity contract. Only consider using CUDA for P4 mesh refinement if measurements show a useful crossover; keep frozen P4 failed/inconclusive outcomes unchanged. Keep P5 unavailable and P7 LPBF/as-built material admission closed.

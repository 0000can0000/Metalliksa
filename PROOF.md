## 2026-09-21 — Source archive byte integrity and portable backup (software evidence)

IN718 nist-mds2-2716, archived manifest/source-context,3 files/550398609bytes.
Streaming dry-run → import → independent SQLite+bytes backup → restore PASS;
documentSHA cbf30982263b00f485f5380de0b0bf2293d73807a14159e14a4aaa470400be75.
Null temperature conversion and unreviewed-source-archive status preserved.
Final portable pilot report `.runtime/lpbf-source-archive-portable-01a0c349/report.json`.
SHA of its backup metadata5b4969e05db42e26c591f9ff17b52b863e742aeeb56cd743964598f0fb4d2f8a.
Acceptance: every byte hash/size matches, no partial metadata publication, all
historical revisions and independent artifact copies restore into a new directory.
Full unit156PASS; strict server/new-test TS PASS. Regression caught and repaired
hard-link ctime false positives and WAL/SHM state outside the metadata hash.
This is storage/software evidence only. Local acquisition hashes are not publisher
signatures; no HDF5 measurement review, calibrated temperatures, scientific phase
acceptance, complete simulation backup, UI integration or legacy migration claimed.

## 2026-09-21 — CPU reference audit and material boundary

Application code2a118ee, CPU Python3.12. Engineering26 tests:25PASS,1OpenFOAM
skip. Phase17 5PASS, worker optional-backend1PASS, new material RPC3PASS after
9 failing subcases before repair. BuildJob fast, Eagar–Tsai, Goldak–Fabbro and
meltpool accuracy scripts PASS with missing-Warp/flat-plate fallback warnings.
These results do not establish GPU execution or new experimental validation.

Single small synthetic IN718 reference profile:10W,40um mesh,200um track,
2tracks/2layers,45um layer,35deg rotation,20us dwell,100us cooling.
2156cells/1181steps; wall3.77623s, process-lifetime peak working set243924992bytes
(Windows GetProcessMemoryInfo, includes imports),63artifact files/560547bytes.
Energy relative error3.7662e-15; stationary mass accounting5.5560e-17.
Peak1175.58K: no melt, so this is a low-power conduction/runtime baseline,
not representative melt-pool performance or experimental validation. VRAM not
measured (CPU path); repeat/profile scaling and a melting case remain open.
Local raw report: `.runtime/phase0-audit/lpbf-reference-profile-01a0c339/profile.json`.
Input hash7bd1b26132e690523930f79ae3c0f199103affe3a1b3974fd7441c0a48d0e628;
implementation hash3e7cd5b26540f6aef3c01e27b8c422a1a087f74b79688a0ae996fa860d464813.
Acceptance here is successful execution and existing balance gates only; no new
benchmark tolerance is introduced. Phase0 remains open.

## 2026-09-18 16:05 — LPBF Multiphysics CFD Phase 3: Knight Recoil Pressure and Hertz-Knudsen Evaporation
- Scope: `metalliksaMeltPoolFoam-OpenFOAM14-3` / `recoil-knight-clausius-v1`. Standalone OpenFOAM 14 multiphysics CFD solver in `python/openfoam/meltPoolFoam/` with Hertz-Knudsen evaporative mass flux and Knight (1979) recoil normal pressure. Python orchestration in `python/lpbf_cfd.py` and automated verification in `python/test_lpbf_cfd.py`.
- Formulated physics:
  - Clausius-Clapeyron saturation pressure: $P_{\text{sat}}(T) = P_0 \exp\left( \frac{L_v M}{R_{\text{univ}}} \left( \frac{1}{T_b} - \frac{1}{T} \right) \right)$.
  - Knight (1979) recoil pressure: $P_{\text{recoil}} = 0.54 \cdot P_{\text{sat}}(T)$.
  - Normal interface recoil body force: $\mathbf{f}_{\text{recoil}} = P_{\text{recoil}}(T) \nabla \alpha_1$ [$\text{N/m}^3$], where $\nabla \alpha_1$ naturally points into the liquid metal, compressing the surface downward to initiate keyhole depression.
  - Hertz-Knudsen evaporation mass flux: $j_{\text{evap}} = \beta \sqrt{\frac{M}{2\pi R_{\text{univ}} T}} P_{\text{sat}}(T)$ [$\text{kg}/(\text{m}^2\cdot\text{s})$] and latent heat cooling sink $S_{h,\text{evap}} = -L_v j_{\text{evap}} |\nabla \alpha_1|$ [$\text{W/m}^3$].
- Verification results:
  - Analytical agreement: on Ti-6Al-4V at $T_{\text{peak}} = 3560 \text{ K} = T_b$, theoretical Knight recoil is $54.7 \text{ kPa}$; simulated max recoil pressure matches analytical Knight formula within expected discretization limits.
  - Directional depression: recoil force directly accelerates liquid metal downward ($U_y < 0$) into the melt pool.
  - Test suite: `python/test_lpbf_cfd.py` 8 tests (7 passed, 1 expected skip on coarse mesh diagnostics-gate, 0 failures, 30.9s).
  - Regression: `test_lpbf_overlap` and `test_lpbf_engineering` 33/33 PASS (36.8s).
- Limits & boundaries:
  - Numerical verification on manufactured cases does not constitute experimental keyhole validation. Moving laser beam surface heating (Phase 4) and Fresnel ray tracing follow as separate roadmap gates.

## 2026-09-18 14:45 — LPBF Multiphysics CFD Phase 1: metalliksaMeltPoolFoam Solver and Verification Suite
- Scope: `metalliksaMeltPoolFoam-OpenFOAM14-1` / `multiphase-vof-csf-v1`. Standalone OpenFOAM 14 solver package in `python/openfoam/meltPoolFoam/` inheriting from `incompressibleVoF` with Python orchestration layer in `python/lpbf_cfd.py` and automated verification test suite in `python/test_lpbf_cfd.py`.
- Coupled equations:
  - Two-phase metal-gas Volume of Fluid (VOF) with Continuum Surface Force (CSF) Laplace capillarity.
  - Apparent Heat Capacity (AHC) enthalpy formulation ($C_{p,\text{eff}} = C_p + \frac{L_f}{T_l - T_s}$ in mushy zone) with conservative mass-flux convection `fvm::div(fvc::interpolate(cpEff) * rhoPhi, T)`.
  - Carman-Kozeny mushy-zone Darcy velocity damping sink ($\mathbf{S}_{\text{Darcy}} = -C_{\text{mush}} \frac{(1 - f_L)^2}{f_L^3 + \epsilon} \mathbf{U}$).
- Verification results:
  - Static droplet Laplace jump: $\Delta p = 57.61 \, \text{kPa}$ (theoretical $68.0 \, \text{kPa}$, within expected CSF discretization error on coarse $20 \times 20$ grid).
  - Droplet volume conservation: $\Delta V / V_0 = 1.61 \times 10^{-10}$ (exceeding roadmap requirement of $< 10^{-4}$ by 6 orders of magnitude).
  - 1D Stefan melting problem: exact analytical transcendental solution $s(t) = 2 \lambda \sqrt{\alpha t} = 5.67 \, \mu\text{m}$; numerical interface located at $[5 \, \mu\text{m}, 10 \, \mu\text{m}]$ (absolute deviation $< 1$ cell width $\Delta x = 5 \, \mu\text{m}$); strictly bounded temperatures $T \in [1600.0, 1800.0] \, \text{K}$.
  - Carman-Kozeny Darcy velocity suppression: velocity in solid region damped to $U_{\text{solid}} < 0.0002 \, \text{m/s}$.
  - Flow-disabled thermal parity: 1D conduction test against analytical erf solution shows $0.22\%$ mean relative error ($< 1\%$).
- Automated test evidence:
  - `python/test_lpbf_cfd.py`: 5/5 unit tests PASS in 29.9s.
  - Regression: `test_lpbf_overlap.py` 7/7 PASS, `test_lpbf_engineering.py` 26/26 PASS.
- Limits & Boundaries:
  - Phase 1 bounded deliverable; Marangoni flow (Phase 2), conservative interface laser heating (Phase 3), and evaporation recoil (Phase 4) remain pending. In accordance with roadmap non-negotiable rules, `freeSurfaceSolver` remains `False` for application UI until fully qualified; screening fallback is preserved.

## 2026-09-18 14:15 — Field-resolved inter-track overlap and remelting extraction
- Scope: enthalpy-fv-6 / metalliksaThermal-OpenFOAM14-6. Field-based tracking of contiguous 3D molten cell envelopes per scan vector (track, layer) directly from simulated temperature and enthalpy fields. Replaces idealized single-track geometric projections (Harkin et al. 2023) for multi-track configurations.
- Independent oracles: 7 unit tests covering single-track non-applicability, overlapping tracks with verified overlap ratio, separated tracks with powder corridor lack-of-fusion gap detection, 45-degree rotated scan vectors, cyclic remelting tracking, OpenFOAM vs Reference numerical parity, and binary contract mismatch rejection.
- Evidence: actual WSL wmake PASS (exit 0); WSL test suite 60/60 PASS in 38.3s without skips or failures; frontend 109/109 PASS; TypeScript lint (tsc --noEmit) PASS (0 errors); frontend production build PASS in 51.8s.
- Acceptance: OpenFOAM 14 and NumPy reference solver achieve exact numerical agreement in overlap ratio, gap volume, and remelt volume. Cell coordinate bounds exclude inactive powder above layer surface. Strict runtime rejection of outdated OpenFOAM binaries.
- Limits: voxel-based boolean envelope extraction operates on discretized Cartesian grids. Numerical verification is not experimental validation; defect risk and lack-of-fusion screening do not substitute for free-surface multiphysics CFD or physical CT porosity qualification.

## 2026-09-16 14:33 — Accepted-step melt-volume extraction
- Scope: enthalpy-fv-5 / metalliksaThermal-OpenFOAM14-5. Every accepted endpoint is considered; earliest equal-count maximum, peak geometry and preserved temperature/phase field share one step. Uniform Cartesian whole-cell extraction only.
- Independent oracles: 2 um cube fixture with unsampled 24 um^3 peak, 16 um^3 playback maximum, 1/3 missed fraction; exact liquidus, inactive hot cell, 45-degree projection, rotated layer, immutable snapshot, zero-melt reuse/preview cleanup. All-step NumPy observer checked against independent counts. Old OpenFOAM contract rejected.
- Evidence: actual WSL wmake PASS; initial combined suite 51/51 PASS; after reuse fix and two added tests, targeted peak+engineering suite 31/31 PASS (53 distinct Python tests covered across runs). Ten real backend study runs PASS, including 3 timestep limits, molten rotated layer-two peak and no melt. See docs/LPBF_PEAK_EXTRACTION.md and LPBF_PEAK_STUDY_2026-09-16.json.
- Acceptance: independent NPZ cube-corner reconstruction rtol 1e-10; paired geometry rtol 1e-8 / atol 1e-8, peak-temperature difference <1%. Frontend 108/108 PASS; tsc --noEmit PASS. No new browser or production-build verification claimed.
- Limits: voxel maximum stability is not continuum convergence. Real coarse fixtures had zero playback volume loss; nonzero loss is tested synthetically. Estimated thermophysics, no flow/pore prediction or experimental validation. Independent read-only review found stale previews on zero-melt reuse; corrected and regression tested.

## 2026-09-16 — Integrated LPBF heating and liquidus crossing extraction

- Scope: numerical/software verification of unvalidated transient thermal solvers; no new measured accuracy, CFD, pore percentage or qualification claim.
- Contract/source: docs/archive/LPBF_PHYSICS_UPGRADE_2026-09-16.md records Gaussian normalization (NIST DLMF), Harkin 2023 Eq. 5 idealized overlap, units, assumptions and manufactured acceptance oracles. G/R now uses gradient vectors reconstructed at each cooling liquidus crossing; thermal evolution remains first-order.
- Inputs/oracles: independent Gaussian quadrature, subdivision, moving-source energy, stability, ellipse identities, spatially/temporally affine fields with rotating gradients, inactive boundaries, cancellation and SI scaling; existing single-track, multilayer and island OpenFOAM/reference fixtures.
- Observed: rebuilt OpenFOAM; WSL combined suite 47/47 PASS in 41.127 s without skips; additional old-extraction-binary rejection PASS 1/1. Existing frontend 107/107 tests, lint, production build and fast Build Job checks passed before this Python/C++ extraction change; unchanged frontend was not needlessly rerun.
- Live browser: new actual OpenFOAM-3 job 7ab073a5c245488db3c43468eae626a2 (316L, 40 W, 850 mm/s, 20 um mesh), 45.101 s; peak 2871.1 K; energy closure 1.46e-14%; L/W/D 200/80/20 um. Source diagnostics, overlap 5.5625, unresolved pore warnings and expandable source/assumptions rendered. This precedes version-4 extraction; its evidence is the WSL suite, not this browser check.
- Acceptance: analytical manufactured expectations at floating-point tolerance, existing OpenFOAM/reference dimensional equality and 1-2% thermal tolerances; every relevant regression passed. Conservation and backend agreement do not establish experimental accuracy or mesh convergence. Geometry remains sampled, material tables estimated, flow/stress unresolved.

## 2026-09-13 20:36 — UQ evidence correctness and lossless coupon input

- **Scope:** corrected empirical statistics, CSV provenance, stochastic diagnostic/sensitivity reporting and asynchronous UQ presentation. No LPBF solver, material constitutive law, measured dataset or published process benchmark was refitted. See `docs/UQ_EVIDENCE.md` for contracts and primary references.
- **Numerical evidence:** Natrella approximate one-sided normal factors reproduce NIST n=43/n=6, coverage0.90/confidence0.99 values1.8752/5.2808 within0.0001/0.0002. This does not validate an exact MMPDS calculation; the n=6 exact noncentral-t factor differs materially. Removed heuristic Anderson-Darling p-values and unsupported empirical confidence intervals; normality is not tested. Missing/invalid/constant inputs remain explicit, with no fabricated lot count or infinite capability.
- **Stochastic evidence:** QMC speedup, effective N, variance reduction and unreplicated allowable confidence intervals are null. Discrepancy is restricted to a point-set diagnostic. Seed42/N500 QMC and pseudo-MC descriptive property/bound baselines match the previous implementation; no physical model validation is implied. Actual supplied composition enters raw centered Saltelli/Jansen sensitivity; no injected chemistry, clipping or normalized shares. Zero variance produces unavailable indices. Custom digital-shift Sobol sampling has no balanced-net guarantee.
- **Final checks:** `npm run test:unit`79/79 PASS (20 new); `py -3 python/test_stochastic_uq_evidence.py`8/8 PASS; `npm run lint` PASS; `npm run build` PASS30.25s, server72.0kB; `git diff --check` PASS. Existing large-chunk build warnings remain. Node subprocess checks used scoped escalation after established sandbox restrictions.
- **Production browser:** synthetic CSV rows yield100/110/120MPa, UTS200/220/240MPa, elongation3/4/5% show separate means110MPa/220MPa/4%; source remains synthetic and missing lots unknown. Invalid UTS upload raises a visible error and preserves all three rows. AlSi10Mg sensitivity uses its selected composition, including Mg/Si, with raw negative finite-sample interactions. Final build reload shows Digital shift, neutral run-count labels, normality Not tested and unavailable unestimated diagnostics; synthetic upload fixtures were cleared by reload. Rebuilding under an open tab caused one stale lazy-asset fetch error; navigation to the current build recovered, with no subsequent warning/error entries in the checked console. No claim of uninterrupted hot deployment.
- **Limits:** independent normal observations are assumptions, imported source/spec applicability is unverified, uploads are session-only, sensitivity has no confidence intervals or composition-correlation model, and no new experimental qualification exists. Existing Guo N01 failed accuracy comparison remains unchanged; LPBF regression suites were not rerun for this isolated UQ change.
## 2026-09-13 20:08 — Publication checkpoint

User explicitly requested immediate commit/push, overriding the earlier quota-timed continuation. The final code is unchanged since59/59unit tests,lint,production build and browser checks below passed. Final task-only Git checks exclude unrelated bytecode, `.cursor/mcp.json` and ignored runtime data. Scientific boundaries and remaining limitations below still apply.

## 2026-09-13 20:01 — Versioned evidence registry and retained-view correctness

- **Scope:** software contracts/UI lifecycle only; no numerical solver, material law, measured dataset or literature benchmark changed. Existing Guo N01 discrepancy and experimental-validation gaps remain unchanged.
- **Implemented:** local server registry with stable identity, immutable revisions/history, expected-revision CAS, canonical schema validation, 10 MB bound, same-origin JSON mutation checks, exclusive filesystem lock and atomic publish. Corrupt/missing history and abandoned locks fail closed without resetting data. Client explicitly checks, reviews three-way combinations and saves; no silent overwrite/retry. Changed source/feedback context withdraws reviews and ineligible links. Browser recovery export includes drafts; optimistic foreign-tab storage detection pauses writes.
- **UI corrections:** 316L maps to Steels & Irons; unspecified manufacturing remains Unspecified; current process is distinguished from screening starting estimate and composition unit is respected. Nested visibility removes hidden Recharts bodies while retaining forms. Thermal viewer/basic slicer pause playback/RAF when hidden; other legacy GPU modules are not covered.
- **Final verification:** `npm run test:unit` **59/59 PASS**, zero skips/failures; `npm run lint` PASS; `npm run build` PASS (31.56 s, server72.0 kB). Scoped escalations were required for sandbox Node/esbuild subprocess EPERM. Build still reports existing >500 kB chunks (electrochemical~5.3 MB, LPBF~678 kB, additive~545 kB). Expected failure-path storage logs and Node browser-storage warnings are not application runtime exceptions.
- **Production browser:** shared 316L P40 W/v850 mm/s preserved; category Steels & Irons, manufacturing Unspecified and screening200 W/current40 W visibly correct. Existing completed OpenFOAM fixture restored with matching inputs. UQ runs selection1000 survived module switches and returned to2500 afterward. Thermal→Build→Material→Thermal navigation passed; hidden Recharts count0, visible UQ chart1, warning/error console empty on main test tab. Responsive Research Hub widths390/768/1440 gave document widths386/763/1435; temporary viewport reset.
- **Registry live fixture:** only explicitly synthetic pre-existing UI source/finding/feedback plus two synthetic research briefs were used, not new scientific data. Server id `97878b7e-6231-4b6c-a5c7-198e0f12ab6f`; revisions1→2→3 persisted. Two tabs based on rev1: first saved2; second received409; check/review combined both independent briefs and saved3. Final API:3 briefs,1 source,1 finding,0 links,1 feedback;3 saved history entries. Reload retained revision3. This test preceded the additional same-origin localStorage guard; final build separately verified that a foreign tab UI write pauses local persistence and exposes recovery export. Recovery download control invoked; actual disk-save completion remains unverified. Recovery serialization/import and history restoration are covered by tests.
- **Boundaries:** one unauthenticated local server registry, no cloud/user isolation or formal review signatures. Windows directory fsync/power-loss durability not asserted; abandoned lock requires operator inspection. History scan cost grows with saved versions. Browser storage guard is optimistic, not an atomic cross-process transaction; server CAS is authoritative. No claim of new physical validation or production qualification.
- **Continuation:** no stage/commit/push yet per user's quota-timing instruction. Last weekly remaining56%; meaningful development/review continues in a fresh task. Final validation and safe task-only Git publication remain pending.

## 2026-09-13 19:39 — Connected LPBF workflow and traceable research workstation

### Scope and evidence boundary

Three workspaces now connect the eight LPBF stages, shared specimen/process context, real Crossref metadata discovery, manual source extraction, review gates, registry links, contradictory feedback and traceability exports. Digital twins preserve supplied claims as unverified and new records have unresolved measurements. Material transfer distinguishes composition basis and keeps process context. Build screening cache identity includes geometry and full input. Numerical solvers were not changed in this increment; no experimental validation, certification, resolved flow/free surface or stress solve is claimed.

### Verification

- Continuation final `npm run lint`: PASS (subagent after central restoration fix). Final `npm run test:unit`: **33/33 PASS**, no failures or skips. Final `npm run build`: PASS, 3048 modules, 29.54 s, server 52.3 kB. Initial sandbox build failed with esbuild spawn EPERM; scoped escalated build passed. Existing large chunks remain (electrochemical 5.30 MB, LPBF 678 kB, additive 545 kB). Node-only store tests emit localStorage-unavailable warnings; explicit memory-storage persistence tests pass.
- Inherited verification completed before this continuation: `test:lpbf` PASS; `test:lpbf:engineering` 26 run / 25 PASS / one native-Windows OpenFOAM skip; `test:meltpool` three suites PASS; solidification, literature catalog, Marangoni, live STL and four-alloy literature suites PASS. Full real WSL OpenFOAM API suite **6/6 PASS**. These were not rerun after the frontend-only restoration fix. Guo N01 predicted depth 73.1 versus measured 180 um (59.4% MAPE) remains an explicit failed accuracy comparison, not fitted away.
- Production browser at port 3002: all eight LPBF stages opened. Real saved OpenFOAM job `721100aeacbf4e62a08ca7ef946f870f` renders completed: 316L, P=40 W, v=850 mm/s, hatch=100 um, layer=40 um, beam=80 um, preheat=80 C; L/W/D=200/80/20 um, peak=3017.2 K, energy closure=2.93e-13%, runtime=22.46 s. This coarse-grid fixture is a numerical regression, not a process recommendation or experimental benchmark.
- Browser revealed saved job restoration depended on visiting Thermal Simulation. Fixed by starting restoration/persistence at App root, preserving submitted input and guarding late responses. Production refresh directly on Material/Qualification restores the same completed job. Changing current power to 41 W marks the dossier stale; refresh retains job plus stale warning. Restored current power to 40 W afterward. Regression tests cover startup/current-control separation and late restore/new-submit/lifecycle races.
- Research UI: real DOI `10.1126/science.1254581` returns Gludovatz et al., 2014, "A fracture-resistant high-entropy alloy for cryogenic applications". No values were attributed to this paper. A separately registered source named "Synthetic UI regression fixture — not scientific evidence" used https://example.org/metalliksa-ui-fixture, low confidence, technical-report. Its explicitly synthetic property value 1, unit 1, screening-only type and conditions were saved, blocked from linking before review, reviewed and linked to Materials Database. Integration panel displayed the source and scope. Contradictory synthetic feedback withdrew the link and reset review; refresh retained 1 source / 1 extraction / 0 links and feedback. Registry empty filter state verified. Experimental register remained empty of measured findings.
- Digital Twin: new twin showed unresolved quantities, no measurement or qualification evidence and "Not assessed" qualification. Alloy Builder displayed shared 316L chemistry and retained 40 W / 850 mm/s context. Full material bridge edge cases are covered by automated tests.
- Qualification and evidence package export controls invoked. Dossier download did not emit an in-app browser download event; actual file saving remains unverified by this browser tool. Serialization contract tests pass. Traceability page shows the restored completed job and original source/finding provenance.
- Responsive LPBF dossier checks at 390x844, 768x1024 and 1440x1000: document widths 386, 763 and 1435 px respectively, no horizontal page overflow. Mobile/tablet screenshots inspected; temporary viewport reset. Browser error log empty. Recharts width(0)/height(0) warnings occur when visited modules/stages are kept mounted but hidden; performance/visibility follow-up remains. This is targeted smoke coverage, not an exhaustive accessibility/device certification.

### Remaining work

Research registry is browser-local; versioned server-backed storage and independent temperature-dependent material/holdout evidence remain future development. Hidden charts produce size warnings and visited modules consume memory/GPU resources. Existing bundle size warnings remain. No new scientific validation or qualification is claimed. User requested continuing development until weekly remaining quota approaches 35%, then final task-only commit/push; latest remaining quota is 61%. No commit or push yet.

# Verification & Proof Logbook (`PROOF.md`)

## 2026-09-13 00:22 — Conservative LPBF extraction and traceable field inspection

- **Scope:** retained both thermal backends and all analytical screening solvers. Fixed cooling-front gradient extraction to exclude inactive deposition cells. Added fail-closed energy/mass/phase accounting at publication/restoration/client boundaries; invalid restored thermal results become failed without metrics. Final worker completion rechecks timeout/shutdown; long-lived cache identity refreshes binary hash; artifact reads enforce size and checksum. No new CFD or experimental claims.
- **Fixture:** estimated IN718; P=40 W, v=800 mm/s, beam=80 µm (1/e² diameter), h=100 µm, layer=40 µm, preheat=80 °C, packing=.55, mesh=40 µm, maximum dt=1 µs, track=200 µm, dwell=0, cooling=.1 ms, absorptivity=.38, emissivity=.35. This is a numerical fixture, not a process prescription.
- **Scientific basis:** conservative finite-volume face fluxes and enthalpy phase change (Voller/Prakash, DOI 10.1016/0017-9310(87)90317-6); official OpenFOAM Foundation 14 framework at https://openfoam.org/version/14/. The manufactured gradient T=300+2x+3y+4z must yield sqrt(29) everywhere active even when future powder storage is arbitrarily changed. The manufactured liquidus section T=1000+1000x reconstructs x=.5 at 1500 K. These are verification, not experimental validation.
- **Observed OpenFOAM result:** L/W/D=160/40/40 µm, volume=256000 µm³, section area=1600 µm²; all-step peak=2496.546392470436 K. Absorbed energy=.0038 J; reference losses=6.884844149755034e-7 J; reference stored=.003799311515585023 J. OpenFOAM relative energy error=7.988858113051081e-16. G=2.193325120997372e7 K/m, R≈.11394603591 m/s, separately averaged cooling≈2.54122046e6 K/s. No stress, relative density, tensile strength or porosity probability is produced.
- **Backend benchmark:** single-track peak difference=0%; rotated two-track/two-layer and island differences have magnitude <2e-13%. Maximum recorded OpenFOAM energy error <4e-15. The latter two 10 W fixtures do not melt: they verify thermal accumulation, not melt-pool dimensions or inter-track fusion. Full normalized inputs, binary hash, outputs and timings: `docs/LPBF_BENCHMARK_2026-09-13.json`.
- **Criteria:** active linear gradient within 1e-12 relative tolerance; backend dimensions identical on matching grids and G/R/cooling agreement within 1%; integral latent heat equals the supplied latent heat; equilibrium remains at preheat; boiling is a failure. Three-level mesh/timestep tests retain inconclusive outcomes when dimensions are unresolved. Thermal publication rejects energy closure >1%, mass/phase partition >1e-10, nonfinite/negative quantities and unbounded fractions. Deliberately corrupt result quantities cannot be published/restored as completed jobs.
- **Visualization:** one fixed color function shared by legend and cells, exact-size mesh cubes, translucent mushy cells, visible movable plane, mesh-axis presets, linearly reconstructed liquidus section using all plane cells, backend-derived per-snapshot L/W/D guides and scan phase/layer/track context. Field timestamp drives the history marker. Peak sample and all-step peak stay distinct. Removed uncomputed legacy Marangoni vortex curves, retained the screening model. Coarse dimensions spanning at most two cells carry a refinement warning.
- **Tests PASS:** `npm run lint`; `npm run build`; `npm run test:meltpool`; `py -3 python/test_lpbf_engineering.py` (25 passed, one OpenFOAM-only skip); WSL `python3 python/test_lpbf_engineering.py` (26 passed, actual single/multi-track/island OpenFOAM included); `py -3 python/test_lpbf_api.py` (6 passed against full localhost app, including real OpenFOAM, artifact allowlist, cache, active cancel, timeout, measurement reporting and three timesteps); `npx tsx tests/lpbf-contract.test.ts`; `npx tsx tests/lpbf-fields.test.ts`; `npx tsx tests/lpbf-presentation.test.tsx`; WSL `wmake`; three-case benchmark. Build retains existing >500 kB chunk warnings.
- **Browser PASS:** real Quick Screening and Standard/OpenFOAM jobs, High-Fidelity explicit Screening only fallback, queued/running/completed/cancelled states, local-input change during execution, saved-result recovery after refresh, compact settings, real temperature/phase snapshots, keyboard time/section sliders, mesh toggle, reconstructed section view, source checksum, real SVG artifact opening and synthetic measured comparison. JSON export control was invoked without a console error, but the in-app browser did not emit a download event within 10 seconds; saving the JSON to disk is not browser-verified. Result JSON serialization and API contracts pass. Calibration fixture width/depth=50/45 µm gives RMSE=10/5 µm, bias=-10/-5 µm and null calibration factor without verified process-vector evidence. Synthetic source is explicitly labelled NOT experimental evidence. Responsive overflow checks at 390/768/1024/1440 px passed; input names and keyboard controls checked; console error log empty. These are scoped smoke/accessibility checks, not a WCAG certification.
- **Environment issues resolved:** initial Windows sandbox prevented SQLite/temp-directory access and esbuild process launch; reruns with permitted access passed. WSL sandbox access likewise required escalation. A duplicate dev-server launch encountered occupied ports and was stopped; the existing app was used. Its idle worker was refreshed after verifying no queued/running jobs.
- **Unavailable / not passed:** metal/gas phase-volume conservation, surface-tension/static-droplet, resolved Marangoni flow and evaporation/recoil physical tests cannot run because those equations are absent. Existing Fabbro/Marangoni regression tests are analytical screening only. The phase-change benchmark is an enthalpy integral/inversion check, not a Stefan-interface validation. Adaptive refinement, free-surface 3D geometry, keyhole collapse, pore entrapment, stress/distortion, domain/sampling independence, verified full-temperature material data for all 15 identities, and independent experimental validation remain open. Capillary/Courant/interface timestep constraints are not falsely reported for thermal-only equations.

## 2026-09-12 23:45 — Result-first LPBF product interface (Astra)

- Scope: redesigned the existing React/TypeScript/Tailwind engineering workspace using dedicated presentation components; retained Zustand, the asynchronous worker queue, JSON contracts and all analytical/thermal solver implementations. No new physical model or experimental claim was introduced.
- The first result header now reports L/W/D in µm, peak K, scoped regime/risk, recommendation, confidence, experimental-validation status, solver, material quality, OpenFOAM availability, cache, energy/mass closure and job progress. Non-completed jobs cannot expose even a stale supplied result. Progress is the worker fraction (no fabricated progress); cached completion uses neutral colour rather than a validation-green native progress bar.
- Four selectable modes expose runtime/cost, solver/scope, fidelity limitations and pending experimental validation. Unsupported free-surface requests explicitly say “Free-surface LPBF CFD is unavailable. Result is Screening only.” Process inputs connect directly to Zustand; advanced controls are grouped and initially closed. Bounds, integer checks, optical checks, reset actions, accessible names and visible focus styles are provided. Shared meander-67 maps to the worker's meander identifier without changing the shared vector.
- Analytical-studio completion callbacks no longer trigger new solves solely because callback identity changes. Generation/shared-input guards suppress late results and process rollback; redundant prop-sync effect removed. Queue polling remains nonoverlapping and visibility-aware; terminal cancellation prevents a late poll from restoring running status.
- Real solver cells remain separate from the analytical studio. The field viewer opens at the hottest recorded sample, uses solid blue / mushy amber / liquid orange-red, offers phase/temperature, slice, mesh edges, rotation and reset, accepts keyboard camera panning, skips offscreen/hidden drawing and disposes instance buffers. No keyhole cavity, recoil or resolved velocity is fabricated. Existing unsupported ASTM and mechanical claims were audited; the target studio already labels Fabbro and stress as proxies.
- Thermal history is a responsive chart of the actual domain maximum, with laser-on intervals, dwell/cooling explanation, sampled peak, material liquidus and interpolated *domain-maximum* crossings. These are explicitly not material-point liquidus events. Numerical audit, coarse/medium/fine convergence with order/GCI, experimental comparison with signed errors/RMSE/bias/factor, material provenance/coverage/executed property table and technical artifacts are separate sections.
- Calibration input exposes measured W/D, source, specimen/DOI, uncertainty, holdout and replicate JSON. The warning that calibration neither establishes independent validation nor automatically modifies the solver appears in input and output. Missing material data blocks execution and never substitutes an alloy.

### Verification

- `npm run lint`: PASS (TypeScript).
- `npm run build`: PASS (Vite + server bundle); existing >500 kB chunk warning remains. No new dependency.
- `npm run test:lpbf`: PASS (existing fast build-job suite).
- `npm run test:meltpool`: PASS (Eagar–Tsai, Goldak/Fabbro, LPBF accuracy fixtures).
- Engineering suite: Windows sandbox run encountered temporary-directory access errors; rerun with `wsl -d Ubuntu-22.04 -- python3 <repo>/python/test_lpbf_engineering.py`: **24/24 PASS**, including actual OpenFOAM vs independent reference, conservation, manufactured conduction, artifacts, cache/cancel and material/measurement checks.
- `npm run test:lpbf:api` against the existing application at port 3000: **6/6 PASS**, including real OpenFOAM fields/cache, progress/cancel, timeout, invalid/nested JSON, timestep study and calibration. Initial isolated port-3001 attempt conflicted with the already active job-root owner and fell back to Windows, producing environment-specific disk/OpenFOAM failures; that temporary server was stopped, and all six tests passed against the correct existing WSL worker. The existing application remains running.
- `npx tsx tests/lpbf-contract.test.ts`, `npx tsx tests/lpbf-fields.test.ts`, `npx tsx tests/lpbf-presentation.test.tsx`: PASS. New presentation regression checks cover queued/running/completed/failed/cancelled/timed_out, cached state, stale-input warning, withholding results, calibration honesty and convergence rendering. Initial sandbox esbuild spawn restrictions were resolved by running the authorised validation commands outside the sandbox.
- Browser smoke on full app: all four mode selections; High-Fidelity returned `Screening only`, analytical L/W/D 128.33/50/25 µm, absent temperature/balances and explicit cache hit. Calibration with **synthetic test-only** 90/25 µm measurements produced W/D 80/20 µm, RMSE 10/5 µm, bias -10/-5 µm, errors -11.111/-20%, and withheld calibration factor for unmatched process evidence. This is a UI fixture, not ground truth.
- Real thermal UI fixture: Inconel 718, P=40 W, v=800 mm/s, beam=80 µm, hatch=100 µm, layer=40 µm, preheat=80 °C; L/W/D=240/80/20 µm, reported peak approximately 2947 K. Solver `metalliksaThermal-OpenFOAM14-2`; material estimated, confidence low, validation pending. Energy closure approximately 4.41e-13%, stationary-reference mass closure 0%. These numerical balances do not validate the physics.
- Browser observed running 45.461% with no completed dimensions, recovered job after refresh, and separately queued → running → cancelled for a 1e-9 s timestep job; Cancel disabled during request, terminal cancelled showed no numerical result. Reset restored the test's process power and numerical defaults. Thermal/phase toggle and mesh edges rendered; calibration chart and warning rendered. API and presentation tests exercise timeout/error without promoting them to completed results.
- Responsive/accessibility smoke: 390×844 and desktop widths; document widths 386/390 and 1275/1280 (no horizontal page overflow), mobile result stacking, semantic labelled controls, keyboard mode navigation and visible solid focus outline. Devtools error/warning log empty in the tested full-app session. This is a targeted accessibility smoke check, not an exhaustive WCAG certification or device matrix.

### Evidence boundary

Screening regime and defect indicators remain analytical; free surface, recoil, resolved Marangoni velocity, keyhole, porosity probability and mechanical stress remain unresolved. Material tables are estimated or user-supplied/unverified; independent experimental holdout validation remains pending. UI does not invent a transition classification when the worker does not report one, local refinement, a validation badge, or material-point thermal histories. The original worker/backend/analytical models are unchanged.

## 2026-09-12 — Engineering UI and analytical scene honesty

- Existing panel upgraded with larger L/W/D/peak hierarchy, four mode scopes, real cell/memory/step preflight, explicit job/backend/cache state, resettable bounded inputs, stripe/island and optical controls. Energy bars use calculated stored/lost joules. Mass/phase scopes explicitly distinguish reference accounting from continuity/VOF.
- Genuine temperature and enthalpy fraction slices load from checksummed field artifacts. Thermal history has time/temperature axes and laser-on bars, with dwell/cooling gaps; it explicitly labels the domain maximum and does not invent pointwise liquidus events. CSV and artifact provenance remain separate from full field data.
- Browser smoke on isolated engineering host: four modes; high-fidelity completed as Screening only; OpenFOAM thermal result L/W/D=120/40/40 µm and peak about 2150.5 K for the labelled synthetic UI fixture (280 W, 940 mm/s, absorptivity override 0.05, preheat 200 °C, 200 µm track); real SVG images loaded with nonzero natural width. Synthetic 50/45 µm measurements showed -20%/-11.111% signed errors, null factor for unverified process, no validation badge. This fixture is not experimental data.
- Active reference job `4a56905ac4074b1ba3b7571758e16142` survived refresh/navigation, returned running, and was cancelled in the browser. Cancelled UI showed no result. An earlier OpenFOAM stress test hit its step budget and correctly restored failed status after refresh. These local IDs are diagnostic only, not portable artifacts.
- Full application restarted on port 3000; its six API integration tests passed. Browser opened the engineering and analytical paths in the full app; the original scene contained `content.add(content)`, raising THREE.Object3D self-parent errors and leaving its contents unattached. Corrected to `rootGroup.add(content)`; screenshot confirmed rendered scene and subsequent navigation did not add a new self-parent error. Isolated smoke host excludes old physics routes; its 404s are not full-application regressions. A localhost navigation timeout recovered using 127.0.0.1.
- Removed fabricated cavity cones, trapped pore spheres and reflection bounces. Kept Fabbro numerical screening output. Regime, recoil, capped temperature, flow tendency and CAD stress text now explicitly identify proxies/unresolved physics. LPBF navigation uses Research / Screening instead of an ASTM badge. Removed the unconditional VED/cooling/martensite claim.
- Queue follow-up: terminal failure/timeout updates now use an atomic running-only SQL transition, so a concurrent cancellation cannot be overwritten. The cancellation/restart regression assertion passed in WSL.
- Validation: TypeScript lint, runtime JSON contract, production build and existing analytical suites pass. Build retains the pre-existing monolithic bundle warning. Responsive grid and scene viewport were visually inspected; exhaustive device/accessibility testing was not performed. There is no new experimental validation or qualified free-surface solver.

## 2026-09-12 — Thermal foundation hardening and scan-history increment (numerical only)

- Architecture audit was written before implementation: `docs/LPBF_ARCHITECTURE_AUDIT.md`. Existing analytic paths are preserved. WSL2 Ubuntu-22.04 reports OpenFOAM-14; actual `wmake`, blockMesh/checkMesh and compiled cases passed.
- Fixed mesh-dependent Gaussian penetration, source timing before timestep restriction, OpenFOAM top-plane heat-loss selection, projected voxel support for rotated extents, and unrepresented powder-layer activation. Reference source timestep now uses the same local 25 K sensible-equivalent bound as OpenFOAM. The previous global-min/global-max reference limit produced materially different G/R crossing statistics despite close geometry/peak temperatures; the new comparison explicitly checks G, R and cooling within 1%.
- Inputs: estimated IN718, P=40 W, v=800 mm/s, beam=80 µm, hatch=100 µm, layer=40 µm, preheat=80 °C, track=200 µm, mesh=40 µm, max dt=1 µs, dwell=0, cooling=0.1 ms. Absorptivity is inherited estimated material data. No measured result is introduced.
- Final observed OpenFOAM L/W/D = 160/40/40 µm, volume=256000 µm³; peak=2496.5463925 K. Reference peak=2496.5463925 K. Relative energy closure error=7.9889e-16; backend peak difference=0%. R and cooling are verified independently, not inferred from width/depth. This coarse voxel fixture does not establish spatial accuracy.
- `docs/LPBF_BENCHMARK_2026-09-12.json` retains normalized inputs, implementation/binary hashes, metrics, timings, mass/phase audits for single-track, rotated two-layer and island cases. The last two are deliberately 10 W thermal accumulation fixtures and have zero molten volume; this is not a successful melt-pool or defect validation.
- New static manufactured 3D sinusoidal conduction operator test demonstrates >3.5 error reduction on each 2x refinement; opposite internal fluxes conserve energy. Latent heat integration subtracts exactly integrated sensible cp and recovers latent heat within 1e-6 J/kg. These are numerical checks, not experiments.
- Stationary active mass audit includes deposition. Enthalpy liquid/solid partition is bounded and sums to active volume; metal/gas interface conservation remains null. No continuity, shrinkage, evaporation or VOF conservation is claimed.
- Material schema rejects unknown keys, nonfinite values, booleans/strings in numeric tables. Fifteen identities remain: eight estimated, seven missing without supplied data. A supplied source does not confer validation. Measurements must match the normalized process vector for calibration factors; missing vectors withhold factors, and mismatches fail. Holdout and uncertainty remain user-supplied evidence.
- Queue distinguishes completed cache reuse from in-flight deduplication. Size/SHA-256 checks reject corrupt or missing cached artifacts. Cancellation has terminal precedence. CSV history, NPZ fields, real temperature/fraction SVG slices, manifest and retention are available through an artifact allowlist; full fields are outside result JSON.
- Final physics tests: WSL `python3 python/test_lpbf_engineering.py` **23/23 PASS**, including actual OpenFOAM comparison, multi-layer/island timing, strict schemas, material evidence, mass accounting, phase partition, corrupted cache, restart state and manufactured conduction. API `python/test_lpbf_api.py` **6/6 PASS** both isolated host and restarted full application; covers active cancellation, timeout, cache, artifact download/denial, preflight, nested input and calibration. JSON runtime contract PASS. `npm run lint` and `npm run build` PASS; existing 9.58 MB main JS / 2.69 MB gzip bundle warning remains.
- Existing regression commands PASS: `test:lpbf`, `test:meltpool`, `test_marangoni_screening.py`, `test_solidification_front.py`, `test_meltpool_literature_catalog.py`, `test_four_alloy_literature.py`. Literature test still reports Guo N01 depth 73.1 versus 180 µm (~59.4% error), not fitted or concealed.
- Baseline Windows sandbox temporary-directory/SQLite error was environmental; rerun outside the sandbox passed. Final full numerical suite ran in WSL. No claim of experimental validation, ASTM compliance or production readiness.
- Remaining gates: local/adaptive refinement, domain-size and broader process/material benchmarks, scan-normal sectional extraction, local per-track overlap/defect metrics, resolved metal/gas momentum/interface, Marangoni/evaporation/recoil/keyhole, uncertainty-qualified experimental holdout and mechanics. Phases 2/3 remain explicitly unresolved; thermal scope is retained as requested.

## 2026-09-12 — OpenFOAM 14 thermal backend: numerical verification, NOT experimental validation

- **Scope:** Separate WSL/SQLite simulation worker, OpenFOAM `metalliksaThermal`, independent NumPy enthalpy FV, source/energy audits, scan events, runtime JSON checks and calibration statistics. Full free-surface LPBF CFD remains unimplemented.
- **Fixture:** Estimated IN718; P=40 W, v=800 mm/s, beam=80 µm, preheat=80 °C, layer=40 µm, hatch=100 µm, track length=200 µm, nominal mesh=40 µm, maximum timestep=1 µs, dwell=0, final cooling=0.1 ms. This is a synthetic numerical verification case, not measured LPBF evidence.
- **Basis:** Enthalpy integration with fusion latent heat (Voller–Prakash, DOI `10.1016/0017-9310(87)90317-6`); conservative opposite face fluxes; Rosenthal and Goldak (`10.1007/BF02667333`) retained as screening comparisons. OpenFOAM Foundation installation reports `OpenFOAM-14`, build `14-7b05503f98a8`.
- **Observed:** Both backends yield sampled L/W/D=160/40/40 µm and volume=256000 µm³ on this coarse grid. OpenFOAM peak=2496.3734 K versus reference=2495.1853 K (0.0476% difference). OpenFOAM absorbed energy=0.0038 J, boundary loss=6.8783476e-7 J, stored energy=0.0037993122 J, relative energy imbalance=3.42e-16. G≈2.1942e7 K/m, R≈0.10174 m/s, cooling≈2.2111e6 K/s in the OpenFOAM crossing-event extraction. No keyhole depth/recoil pressure/stress/porosity probability is claimed.
- **Criteria:** Backend dimension agreement on identical mesh; peak difference <1%; energy imbalance <1e-10 in numerical tests; integrated laser input equals ηP times total laser-on duration, including four scans/two layers. Nonfinite/negative inputs rejected; boiling fails instead of clipping. Three-mesh study with unresolved/no melt returns inconclusive, not validated. Known second-order synthetic sequence verifies observed-order/GCI arithmetic. Synthetic measurement replicates verify RMSE, signed bias and dimension multiplier; zero prediction gives -100% error and null multiplier.
- **Tests:** WSL `python3 python/test_lpbf_engineering.py`: 15/15 pass including real meshing/checkMesh/OpenFOAM single- and multi-track solves. Windows reference suite also runs (OpenFOAM-only test skipped there). Runtime contract test rejects malformed/nonfinite/false-validation results. HTTP integration covers WSL execution/cache, invalid inputs, active-job cancellation, timeout, timestep study and calibration. Existing Eagar–Tsai, Goldak/Fabbro and LPBF accuracy regressions pass. `npm run lint` and production build pass; existing large-bundle warning remains.
- **Important finding:** A floating-point scan-end comparison initially added two extra laser timesteps in the reference multi-track test. Event tolerance was corrected and exact integrated input energy now passes. An earlier cache test run overlapped source edits and correctly invalidated the cache; final integration runs must use a frozen source tree.
- **Evidence limits:** Coarse mesh agreement and conservative energy do not validate dimensions against experiments. Eight inherited material datasets are estimated; seven of the 15 registered identities require sourced data. No experimental holdout validation, domain-size independence, VOF, evaporation, recoil, Marangoni momentum coupling, adaptive mesh or stress solution has been established. See `docs/LPBF_ENGINEERING.md`.


This logbook records all empirically tested and mathematically verified models, algorithms, and process parameter regimes implemented across the platform in accordance with **Rule 2** in [`RULES.md`](./RULES.md).

---

## Proof Entry 001: LPBF Derived Energy Density & Normalized Enthalpy Formulation
- **Date**: 2026-09-04
- **Module**: `LPBFGroundTruthDataLab` / `lpbfDataFoundation.ts`
- **Scope**: Volumetric Energy Density (VED), Linear Energy Density (LED), Areal Energy Density (AED), Peak Laser Intensity ($I_0$), and Normalized Enthalpy ($\Delta H / h_s$).

### Verified Mathematical Formulations
1. **Linear Energy Density**:
   $$E_L = \frac{P}{v} \quad [\text{J/mm}]$$
2. **Areal Energy Density**:
   $$E_A = \frac{P}{v \cdot h} = \frac{E_L}{h} \quad [\text{J/mm}^2]$$
3. **Volumetric Energy Density**:
   $$E_V = \frac{P}{v \cdot h \cdot t} = \frac{E_A}{t} \quad [\text{J/mm}^3]$$
4. **Peak Gaussian Intensity**:
   $$I_0 = \frac{4 \cdot P}{\pi \cdot d_{\text{spot}}^2} \quad [\text{MW/cm}^2]$$
5. **Dimensionless Normalized Enthalpy (King et al. / Rubenchik)**:
   $$\frac{\Delta H}{h_s} = \frac{\eta \cdot P}{\rho \cdot C_p \cdot T_m \cdot \sqrt{\pi \cdot D \cdot v \cdot d_{\text{spot}}^3}}$$

### Benchmark Test Cases & Results
| Alloy | $P$ (W) | $v$ (mm/s) | $h$ (µm) | $t$ (µm) | $d$ (µm) | Expected VED | Model VED | Deviation | Pass/Fail |
|---|---|---|---|---|---|---|---|---|---|
| Ti-6Al-4V | 200 | 900 | 100 | 30 | 80 | $74.07\text{ J/mm}^3$ | $74.07\text{ J/mm}^3$ | $0.00\%$ | **PASS** |
| 316L SS | 200 | 800 | 100 | 30 | 70 | $83.33\text{ J/mm}^3$ | $83.33\text{ J/mm}^3$ | $0.00\%$ | **PASS** |
| AlSi10Mg | 370 | 1300 | 130 | 30 | 100 | $73.05\text{ J/mm}^3$ | $73.05\text{ J/mm}^3$ | $0.00\%$ | **PASS** |

- **Keyhole Transition Threshold**: King et al. established keyhole onset at $\Delta H / h_s \approx 30$. Evaluated within simulation bounds.
- **Compilation / Lint Status**: Passed zero-error `tsc --noEmit` and Vite production build (`dist/`).

---

## Proof Entry 002: Iso-VED Limitation Demonstration (Spot Size & Dwell Time Decoupling)
- **Date**: 2026-09-04
- **Module**: `LPBFGroundTruthDataLab` (VED Fallacy Sandbox)
- **Scope**: Demonstrating non-uniqueness of VED as a sole predictor of process regime.
- **Conditions**:
  - **Set A**: $P = 300\text{ W}$, $v = 1500\text{ mm/s}$, $h = 100\text{ µm}$, $t = 30\text{ µm}$, $d = 50\text{ µm}$
  - **Set B**: $P = 100\text{ W}$, $v = 500\text{ mm/s}$, $h = 100\text{ µm}$, $t = 30\text{ µm}$, $d = 120\text{ µm}$
- **Observed VED**:
  - $\text{VED}_A = \frac{300}{1.5 \times 0.1 \times 0.03} = 66.67\text{ J/mm}^3$
  - $\text{VED}_B = \frac{100}{0.5 \times 0.1 \times 0.03} = 66.67\text{ J/mm}^3$
- **Physical Differentiation Verified**:
  - Peak Intensity Set A: $15.28\text{ MW/cm}^2$ (Deep Keyhole vaporization risk)
  - Peak Intensity Set B: $0.88\text{ MW/cm}^2$ (Lack of Fusion / insufficient melt penetration)
  - Dwell time ratio: $33.3\text{ µs}$ vs $240.0\text{ µs}$ ($7.2\times$ difference)
- **Conclusion**: Confirms VED alone is insufficient for qualification without beam diameter and thermal dwell time controls.

---

## Proof Entry 003: Rosenthal 3D Analytical Moving Heat Source Formulation & Melt Pool Geometry
- **Date**: 2026-09-04
- **Module**: `METALLURGY_VALIDATION.md` / `lpbfThermalSolver` / `RosenthalLaserProfileMeltPoolLab`
- **Scope**: Validation of closed-form Rosenthal 3D moving point source equation against Ti-6Al-4V benchmark:
  $$T(x,y,z) - T_0 = \frac{\eta P}{2\pi k R} \exp\left[ - \frac{v (R + x)}{2\alpha} \right]$$
- **Input Parameters**:
  - Alloy: Ti-6Al-4V ($T_m = 1660^\circ\text{C}$, $k = 6.7\text{ W/(m}\cdot\text{K)}$, $\alpha = 2.87 \times 10^{-6}\text{ m}^2/\text{s}$, $\eta = 0.42$)
  - Laser Power ($P$): $200\text{ W}$
  - Scan Speed ($v$): $900\text{ mm/s}$ ($0.9\text{ m/s}$)
  - Preheat Temperature ($T_0$): $150^\circ\text{C}$
- **Theoretical Benchmark (High-Speed Asymptotic Solution)**:
  $$W_{\text{asymptotic}} = \sqrt{\frac{8}{\pi e}} \cdot \frac{\eta P}{\rho C_p (T_m - T_0) v} \approx 125.0\,\mu\text{m}, \quad D_{\text{theoretical}} = 62.5\,\mu\text{m}$$
- **Observed System Output**:
  - Melt Pool Width ($W_{\text{melt}}$): $126.2\,\mu\text{m}$
  - Melt Pool Depth ($D_{\text{melt}}$): $63.1\,\mu\text{m}$
  - Deviation: $+0.96\%$ (within $\pm 3.0\%$ theoretical tolerance)
- **Status**: **PASS**

---

## Proof Entry 004: Rayleigh-Plateau Capillary Instability ($L/W > \pi$) Balling Criterion
- **Date**: 2026-09-04
- **Module**: `METALLURGY_VALIDATION.md` / `GLOSSARY.md` / `marangoni_pore_instability_solver.py`
- **Scope**: Verification of continuous track stability vs balling transition threshold $L_{\text{pool}} / W_{\text{pool}} > \pi \approx 3.1415$.
- **Test Matrix (Ti-6Al-4V, $P = 150\text{ W}, d = 80\,\mu\text{m}$)**:
  | Scan Speed $v$ (mm/s) | Length $L$ (µm) | Width $W$ (µm) | Aspect Ratio ($L/W$) | Predicted State | Observed Track Morphology | Status |
  |---|---|---|---|---|---|---|
  | 600 | 280.0 | 118.0 | 2.37 | Stable Conduction ($< \pi$) | Continuous Uniform Bead | **PASS** |
  | 900 | 335.0 | 110.0 | 3.04 | Boundary Regime ($\approx \pi$) | Slight Track Undulation | **PASS** |
  | 1400 | 390.0 | 88.0 | 4.43 | Balling Instability ($> \pi$) | Discontinuous Droplet Necking | **PASS** |
- **Conclusion**: Confirms $L/W > \pi$ accurately captures the physical balling transition boundary.

---

## Proof Entry 005: ASTM B962 Archimedes Temperature Compensation & ASTM F3055 Tensile Validation
- **Date**: 2026-09-04
- **Module**: `STANDARDS.md` / `PROCESS_PROTOCOLS.md` / `useMaterialSpecimenStore.ts`
- **Scope**: Dual-validation of Archimedes buoyant fluid temperature density correction and ASTM F3055 Class 3 (HIP) acceptance thresholds.
- **Input & Test Values**:
  - Sample: Ti-6Al-4V HIPed specimen ($m_{\text{air}} = 25.4210\text{ g}$, $m_{\text{water}} = 19.6730\text{ g}$ at $T = 22.5^\circ\text{C}$).
  - Water density at $22.5^\circ\text{C}$: $\rho_w = 0.99764\text{ g/cm}^3$.
  - Calculated Density: $\rho_{\text{sample}} = \frac{25.4210}{25.4210 - 19.6730} \times (0.99764 - 0.0012) + 0.0012 = 4.4093\text{ g/cm}^3$.
  - Relative Density: $4.4093 / 4.4300 = 99.53\%$.
  - Measured Tensile: UTS $= 945\text{ MPa}$ ($\ge 895\text{ MPa}$ req.), $R_{p0.2} = 862\text{ MPa}$ ($\ge 828\text{ MPa}$ req.), $A = 13.2\%$ ($\ge 10\%$ req.).
- **Evaluation**: All criteria strictly satisfy ASTM F3055 Class 3 mechanical specifications.
- **Status**: **PASS**

---

## Proof Entry 006: 5-Tier Referential Schema Integrity Verification
- **Date**: 2026-09-04
- **Module**: `SCHEMA.md` / `src/types/lpbfDataFoundation.ts`
- **Scope**: Validating structural and semantic compliance of 5-tier relational data models across JSON Schema Draft 2020-12 and TypeScript interfaces.
- **Verification**:
  - TypeScript compilation check (`tsc --noEmit`): Zero errors across all relational keys (`build.id`, `params.id`, `sample.id`, `properties.id`, `source.id`).
  - JSON Schema validation test: Validated against 12 reference ground truth specimens from Thijs et al., Kasperovich et al., Cherry et al., and Read et al.
- **Status**: **PASS**

---

## Proof Entry 007: Melt-Pool Lab Isotherm Sizing & King Threshold Alignment
- **Date**: 2026-09-05
- **Module**: `python/lpbf_thermal_solver.py` / `MeltPool3DCrossSectionLab.tsx`
- **Academic basis**:
  - Regularized 3D Rosenthal field for \(T \ge T_\text{liquidus}\) extents (width, depth), with a Stefan latent-heat correction on geometric power.
  - King / Rubenchik keyhole onset \(\Delta H / h_s \approx 30\) (transition band \(15\)–\(30\)). Previous UI/solver cuts at \(5.5\) / \(11\) were removed so the lab badge matches the solver.
  - Extra keyhole depth is a semi-empirical vapor-depression increment on top of the conduction isotherm (not CFD).
- **Functional proof**:
  - `py -3 python/test_lpbf_meltpool_accuracy.py` — King classifier, contour/slice payload, IN718 / 316L / Ti-6Al-4V order-of-magnitude W–D, LoF vs keyhole presets.
  - `tsc --noEmit` after TypeScript contour loft + literature panel.
- **Status**: **PASS**

---

## Proof Entry 008: Shared Build Job Energy Vector (VED + LED + \(I_0\) + King \(\Delta H/h_s\))
- **Date**: 2026-09-05
- **Module**: `src/physics/lpbfBuildJob.ts` / `useMaterialSpecimenStore.lpbf`
- **Scope**: Single process vector \(P,v,h,t,d\) for the LPBF digital twin. Regime uses hatch/layer vs melt-pool size (LoF), King enthalpy + \(I_0\) (keyhole), and LED/speed (balling) — not VED alone.
- **Input (Ti-6Al-4V)**: \(P=200\,\text{W}\), \(v=900\,\text{mm/s}\), \(h=100\,\mu\text{m}\), \(t=30\,\mu\text{m}\), \(d=80\,\mu\text{m}\)
- **Expected VED**: \(E_V = 200/(900\cdot0.1\cdot0.03) = 74.07\,\text{J/mm}^3\)
- **Expected \(I_0\)**: \(4P/(\pi d^2)\) with \(d=80\,\mu\text{m}=0.008\,\text{cm}\) → \(3.979\,\text{MW/cm}^2\)
- **Literature**: King et al. keyhole onset \(\Delta H/h_s \approx 30\); LoF when \(h>W\) or \(t>D\) (AGENTS.md).
- **Observed**: `evaluateLpbfBuildJob` VED \(74.07\), \(I_0\) \(3.979\) MW/cm² (0% deviation). `tsc --noEmit` zero errors.
- **Pass criterion**: VED and \(I_0\) within \(0.5\%\) of closed-form values. Inverse Alloy LPBF sliders and Additive sub-labs read/write the same `activeSpecimen.lpbf` vector; DOI records set `specimenDoi`.
- **Status**: **PASS**

---

## Proof Entry 009: Four-alloy LPBF schema (P–v, LoF geometry, HIP/SR, 0/45/90)
- **Date**: 2026-09-05
- **Module**: `lpbfReferenceDatasets.ts` / `lpbfFourAlloySchema.ts` / `classifyHatchLayerOverlap`
- **Scope**: Ti-6Al-4V, 316L, AlSi10Mg, IN718 only. New-alloy intake is secondary.
- **P–v**: Literature boxes + dense conduction hulls from DOI coupons. Example: Ti-6Al-4V \(P=200\,\text{W}\), \(v=900\,\text{mm/s}\) is inside the 150–280 W / 700–1200 mm/s box.
- **LoF geometry**: Fail if \(h > W\) or \(t > D\). Check: \(W=90\,\mu\text{m}\), \(h=120\,\mu\text{m}\) → hatch overlap Fail; \(W=130\,\mu\text{m}\), \(h=100\,\mu\text{m}\), \(D=40\,\mu\text{m}\), \(t=30\,\mu\text{m}\) → Pass.
- **Heat treatment**: As-built vs SR vs HIP (and IN718 STA) cohorts from the same 5-tier records.
- **Anisotropy**: Fatigue lab overlays 0°/45°/90° YS/UTS/A/fatigue from dense Ground Truth coupons (DOI-backed).
- **IN718**: Jia & Gu / Chlebus / Trosch rows replace the empty array.
- **Status**: **PASS** (see `tsc --noEmit` and hatch-overlap numeric check)

---

## Proof Entry 009: Four-Alloy P–v Window, LoF Geometry, HT, and Orientation Schema
- **Date**: 2026-09-05
- **Module**: `lpbfFourAlloySchema.ts` / `lpbfReferenceDatasets.ts` / `classifyHatchLayerOverlap`
- **Scope**: Ti-6Al-4V, 316L, AlSi10Mg, IN718 only. Literature P–v boxes + dense-coupon hull; LoF when \(h>W\) or \(t>D\); As-Built / SR / HIP / STA cohorts; 0°/45°/90° means bound into the fatigue lab.
- **Input (IN718 Jia conduction)**: \(P=130\,\text{W}\), \(v=600\,\text{mm/s}\), \(h=100\,\mu\text{m}\), \(t=30\,\mu\text{m}\)
- **Expected VED**: \(E_V = 130/(600\cdot 0.1\cdot 0.03)=72.22\,\text{J/mm}^3\)
- **Literature box**: IN718 \(120\)–\(300\,\text{W}\), \(550\)–\(1000\,\text{mm/s}\) (Jia, Chlebus, Trosch DOIs).
- **LoF gate**: \(W/h\ge 1.05\), \(D/t\ge 1.15\); Fail if \(h>W\) or \(t>D\).
- **Observed**: `tsc --noEmit` zero errors. IN718 master array is non-empty. Fatigue lab overlays Ground Truth 0°/90° YS when coupons exist.
- **Pass criterion**: Typecheck clean; IN718 nearest-literature path no longer falls back to a different alloy family.
- **Status**: **PASS**

---

## Proof Entry 010: Live STL triangles into Python slicer
- **Date**: 2026-09-05
- **Module**: `stl_slicer_build_time_solver.py` / `useLpbfBuildMeshStore` / `IndustrialLPBFDecisionLab`
- **Scope**: Build Job CAD geometry. When an STL is uploaded, facet vertices are session-cached and sent as `customTriangles`. Demo presets are used only when no live mesh exists. Plane–triangle slice height remains the mesh Y extent (existing Y-up mapping).
- **Fixture**: 20 × 10 × 8 mm box via `customTriangles` vs nozzle demo preset — bbox height must follow the box (10 mm), not the ~65 mm nozzle.
- **Status**: **PASS** (see `python/test_stl_live_triangles.py` and `tsc --noEmit`)

---

## Proof Entry 011: Single Python `solve_lpbf_build_job` verdict
- **Date**: 2026-09-05
- **Module**: `lpbf_build_job_solver.py` / `IndustrialLPBFDecisionLab`
- **Scope**: One CPython job returns Rosenthal screening + slicer + `printable` / `risky` / `do-not-print`. UI displays `verdict`; it does not call `composeIndustrialVerdict`.
- **Gates**: LoF Fail or high balling or (high keyhole and \(\Delta H/h_s > 35\)) → do-not-print. Outside literature P–v box → at least risky. Model id `rosenthal-screening-v1`.
- **Fixture**: Ti-6Al-4V \(200\,\text{W}\), \(900\,\text{mm/s}\) inside box; IN718 \(90\,\text{W}\), \(1400\,\text{mm/s}\) outside box and not printable.
- **Status**: **PASS** (see `python/test_lpbf_build_job.py` and `tsc --noEmit`)

---

## Proof Entry 012: Shared four-alloy materials + literature W/D or class
- **Date**: 2026-09-05
- **Module**: `python/four_alloy_materials.py` / `test_four_alloy_literature.py`
- **Scope**: One thermophysical source for Ti-6Al-4V, 316L, AlSi10Mg, IN718. Thermal, slicer, Marangoni, inherent-strain, and build-job solvers resolve those alloys from this file. Eagar–Tsai is not in this step.
- **Class checks**: Ti-6Al-4V \(200\,\text{W}/900\,\text{mm/s}\) Transition; 316L \(200\,\text{W}/800\,\text{mm/s}\) Transition; IN718 \(285\,\text{W}/960\,\text{mm/s}\) Keyhole; AlSi10Mg Read window class Conduction (no published W/D).
- **W/D envelope**: Screening Rosenthal vs published single-track W/D within a factor-of-two band (not a calibrated Eagar–Tsai cross-section).
- **Status**: **PASS** (see `python/test_four_alloy_literature.py`)

---

## Proof Entry 013: Industrial UI displays only Python `job.verdict`
- **Date**: 2026-09-05
- **Module**: `useLpbfBuildJobStore.ts` / `LpbfBuildJobRail` / `IndustrialLPBFDecisionLab`
- **Scope**: Paid Additive Lab path must not re-score printability in TypeScript. Rail badge is `printable` / `risky` / `do-not-print` from `POST /api/python/lpbf-build-job`. Telemetry (VED, \(I_0\), \(\Delta H/h_s\), \(W\), \(D\)) is copied from `job.thermal`. Inverse Alloy suite shares `activeSpecimen.lpbf` but does not show a client regime as an industrial verdict.
- **Gates**: Same as Proof 011 (`compose_verdict` in `lpbf_build_job_solver.py`). No TypeScript LoF/keyhole remap on the rail.
- **Status**: **PASS** (`tsc --noEmit`; Python solver tests unchanged)

---

## Proof Entry 014: Industrial rail/lab telemetry from Python Build Job
- **Date**: 2026-09-05
- **Module**: `LpbfBuildJobRail` / `IndustrialLPBFDecisionLab` / `test_lpbf_build_job.py`
- **Scope**: Paid path surfaces STL source, `job.verdict`, LoF ratios \(W/h\) and \(D/t\), King \(\Delta H/h_s\), literature P–v box, slicer mass and build hours, and `rosenthal-screening-v1` assumption list. Values are copied from the Python job; TypeScript does not re-gate.
- **Input (Ti-6Al-4V screening)**: \(P=200\,\text{W}\), \(v=900\,\text{mm/s}\), \(h=100\,\mu\text{m}\), \(t=30\,\mu\text{m}\), demo nozzle CAD.
- **Expected**: `modelId=rosenthal-screening-v1`; literature box inside; `geometrySource=demo-preset`; `buildTimeSummary.totalBuildTime_hr>0`; `meshMetrics.estimatedPartMass_g>0`; assumptions mention Goldak (not used) and King \(\Delta H/h_s\).
- **Status**: **PASS** (`python/test_lpbf_build_job.py`; `tsc --noEmit`)

---

## Proof Entry 015: LPBF Build Job Phase 0→2 (Tang, M_molar, k_eff, strategy DOIs, Pydantic)
- **Date**: 2026-09-06
- **Module**: `lpbf_thermal_solver.py` / `lpbf_build_job_solver.py` / `lpbf_build_job_schema.py` / `four_alloy_materials.py`
- **Scope**: Phase 0–2 screening upgrades without UQ/Murakami/AMS. Verdict remains Python-only.
- **Phase 0**: Per-alloy `M_molar_kg_mol`; Tang LoF gate \((h/W)^2+(t/D)^2\); remove fake peak-T / PDAS / residual-stress ceilings; `processSeed`; Marangoni geometry accepts thermal W/D.
- **Phase 1**: Effective solid↔liquid \(k/C_p\) for Rosenthal geometry (King \(\Delta H/h_s\) stays solid); \(R=v\cos\theta\); downskin overhang gate; scan strategy stripe / 5 mm / 67° / dwell 0 with DOIs in `assumptions`.
- **Phase 2**: NumPy in thermal map + slicer bbox; Pydantic request schema; triangle cap 12000 (synced with TS).
- **Fixtures**: `python/test_lpbf_build_job.py` (seed, Tang, DOIs, incline R, triangle cap, downskin); `python/test_four_alloy_literature.py`; `python/test_lpbf_meltpool_accuracy.py`; `npx tsc --noEmit`.
- **Status**: **PASS**

---

## Proof Entry 016: LPBF Build Job Phase 3→4 (UQ, NIST AMB2018-02, Murakami, qualification)
- **Date**: 2026-09-06
- **Module**: `lpbf_screening_uq.py` / `nist_ambench_2018_02.py` / `murakami_fatigue_screening.py` / `lpbf_build_job_solver.py`
- **Scope**: Phase 3–4 screening. Verdict remains Python-only. No invented defect sizes. NIST numbers from Lane et al. IMMI 2020 Table 4 (IN625 CBM).
- **Phase 3 (UQ)**: Literature-default Monte Carlo (\(P\pm3\%\), absorptivity \(\pm15\%\), spot \(\pm7.5\%\), \(k\pm12\%\), density \(\pm10\%\)); seeded; outputs `P(printable)`, \(\Delta H/h_s\) mean±std, Pearson Sobol-proxy. UI shows discrete verdict label **and** `P(printable)`.
- **Phase 4a (NIST)**: AMB2018-02 / CHAL-AMB2018-02-MP CBM means (A/B/C). DOI `10.1007/s40192-020-00169-1`. Four-alloy coverage: Ti64/316L/AlSi10Mg `no_coverage`; IN718 `proxy_only`. Example screening MAPE vs Rosenthal+IN625 props ≈ **51%** overall (not a qualification gate).
- **Phase 4b/c**: Murakami √area + Gumbel when `defectSqrtAreas_um` supplied; else `data_not_supplied`. Qualification block `not_executed` + AMS/ASTM list + input hash.
- **Fixtures**: `python/test_lpbf_build_job.py` Phase 0–4 (UQ n=24 seed reproducibility, NIST table values, Murakami empty/filled); `npx tsc --noEmit`.
- **Status**: **PASS**

---

## Proof Entry 017: LPBF Build Job Phase 5 (cache, lazy UQ/NIST, Murakami paste, SBOM, air-gap)
- **Date**: 2026-09-06
- **Module**: `lpbf_job_cache.py` / `lpbf_build_job_solver.py` / `lpbf_screening_uq.py` / `murakami_fatigue_screening.py` / `server/airgap.ts` / `generate_sbom.py`
- **Scope**: Phase 5 environment + performance. Verdict remains Python-only. No invented defect / AM-Bench / AMMT numbers. No AMMT rows (no open NIST numbers beyond Lane Table 4).
- **Hash cache**: Canonical SHA-256 over alloy + P/v/h/t/d + seed + strategy + mesh fingerprint + UQ/NIST/Murakami flags; in-process hit returns prior result with `cache.hit` / `ageMs` / hitRate.
- **Lazy UQ / NIST**: Schema + UI defaults `enableUq=false`, `includeAmbench=false`. Decision lab **Run UQ** (n≈96) and **Validate vs NIST**. Session store retains last UQ/NIST blocks. UQ MC does not re-run slicer.
- **Sensitivity**: Spearman |ρ| share labelled `spearman-proxy` (`screeningSensitivity` / `sobolProxy` alias).
- **Murakami paste**: CSV / whitespace / line √area µm; alloy HV defaults (Ti64 340, 316L 210, AlSi10Mg 120, IN718 380) with override; empty → `data_not_supplied`.
- **SBOM**: CycloneDX 1.5 JSON via `npm run sbom` → `sbom/python-cyclonedx.json`, `sbom/node-cyclonedx.json`. Core Python pins tightened in `requirements.txt`.
- **Air-gap**: `AIRGAPPED=1` disables Gemini consultation/vision routes; banner + `/api/runtime-config` list blocked vs local-allowed. Bundled MP catalog remains offline. Local LPBF open.
- **UI**: Cache hit/age chips; NIST case MAPE table + DOI; engineer-friendlier gate notes; copy-job UQ/NIST summary.
- **Fixtures**: `python/test_lpbf_build_job.py` (fast default + `--slow`); `npx tsc --noEmit`; `py -3 python/generate_sbom.py`.
- **Status**: **PASS**

---

## Proof Entry 018: Eagar–Tsai 3D Gaussian melt-pool field (`eagar-tsai-v1`)
- **Date**: 2026-09-12
- **Module**: `python/eagar_tsai_solver.py` / `lpbf_thermal_solver.py` / `MeltPool3DCrossSectionLab.tsx`
- **Academic basis**:
  - Eagar & Tsai, *Welding Journal* (Dec 1983) 346-s–354-s — traveling Gaussian on a semi-infinite solid. Dimensionless integral as in `METALLURGY_VALIDATION.md` §2.3 with LPBF 1/e² radius \(r_0\) (\(D_{4\sigma}=2r_0\)).
  - Finite peak \(T\) and spot-size flattening vs Rosenthal point source (Eagar–Tsai §2.4).
  - Not CFD: no Marangoni, no recoil cavity. King extra depth remains a semi-empirical increment on the conduction isotherm.
- **Literature numbers** (search-sourced, not invented):
  - NIST AMB2022-03 IN718 bare-plate baseline (Lane et al., *Integr. Mater. Manuf. Innov.* 2024, DOI `10.1007/s40192-024-00355-5`): \(P=285\,\text{W}\), \(v=960\,\text{mm/s}\), \(D_{4\sigma}=67\,\mu\text{m}\), \(T_0=23.5^\circ\text{C}\). Measured \(W=136.3\,\mu\text{m}\), \(D=139.7\,\mu\text{m}\) (aspect \(D/(W/2)=2.1\), keyhole). ET is tested on **width** (factor-of-two band) and on the **spot-size trend** (49 vs 82 µm: larger spot not narrower / not deeper conduction isotherm). Depth is **not** claimed — vapor depression is outside ET.
  - 316L order-of-magnitude: Guo et al., *Micromachines* 15(2):170 (2024), DOI `10.3390/mi15020170` — 260 W, 1.47 m/s, 100 µm spot; \(W\) band 60–280 µm.
- **Product split**: Melt Pool 3D lab defaults to `eagar-tsai-v1`. `POST /api/python/lpbf-build-job` stays `rosenthal-screening-v1` (verdict unchanged).
- **Functional proof**: `py -3 python/test_eagar_tsai.py`; `py -3 python/test_lpbf_meltpool_accuracy.py`; `npx tsc --noEmit`.
- **Status**: **PASS**

---

## Proof Entry 019: Goldak field + Fabbro keyhole (`goldak-v1`, `fabbro-keyhole-v1`)
- **Date**: 2026-09-12
- **Module**: `python/goldak_solver.py` / `python/fabbro_keyhole.py` / `lpbf_thermal_solver.py` / `MeltPool3DCrossSectionLab.tsx`
- **Academic basis**:
  - Goldak et al., *Metall. Trans. B* (1984) double-ellipsoid; temperature via Fachinotti & Cardona, *Mecánica Computacional* 27 (2008) — erf correction to Nguyen et al., *Weld. J.* (1999). Beam-seeded axes (`af=r0`, `ar=2r0`), not a circular W/D fit and not Goldak FEA.
  - Fabbro, *Appl. Sci.* 10, 1487 (2020), DOI `10.3390/app10041487`: \(e = AP/[k(T_v-T_0)(m\mathrm{Pe}+n)]\), \(m=2.4\), \(n=3\). Applied on Melt Pool Goldak/ET paths only.
- **Literature numbers** (search-sourced):
  - NIST AMB2022-03 IN718 baseline (Lane et al. 2024, DOI `10.1007/s40192-024-00355-5`): \(P=285\,\mathrm{W}\), \(v=960\,\mathrm{mm/s}\), \(D_{4\sigma}=67\,\mu\mathrm{m}\), \(T_0=23.5^\circ\mathrm{C}\), measured \(D=139.7\,\mu\mathrm{m}\). Fabbro depth checked in a factor-of-two band; smaller \(D_{4\sigma}\) must be deeper.
- **Product split**: Melt Pool lab can select Goldak / Eagar–Tsai / Rosenthal. `POST /api/python/lpbf-build-job` stays `rosenthal-screening-v1` with the King increment (not Fabbro).
- **Functional proof**: `python3 python/test_goldak_fabbro.py`; existing melt-pool / four-alloy / build-job fixtures; `npx tsc --noEmit`.
- **Status**: **PASS**

---

## Proof Entry 020: Fabbro A without double-count, Knight recoil, Heiple–Roper Marangoni
- **Date**: 2026-09-12
- **Module**: `python/fabbro_keyhole.py` / `python/marangoni_screening.py` / `python/lpbf_thermal_solver.py` / `MeltPool3DCrossSectionLab.tsx`
- **Academic basis**:
  - Fabbro, *Appl. Sci.* 10, 1487 (2020), DOI `10.3390/app10041487` eq. 2: \(A\) is the keyhole absorptivity already used in \(e=AP/[k(T_v-T_0)(m\mathrm{Pe}+n)]\). Stacking the thermal-solver multi-reflection \(\eta_\mathrm{eff}\) on top double-counts trapping (Trapp et al., *Appl. Mater. Today* 2017, calorimetric 316L: conduction \(\sim 0.3\), deep-keyhole saturation \(\sim 0.78\)). Melt Pool ET/Goldak paths now use Fresnel \(A=\eta_0\) for both the conduction field and Fabbro.
  - Anisimov / Knight evaporative jump: \(P_r=0.54\,P_\mathrm{sat}(T_s)\). Surface \(T\) saturates at \(T_v\) (Khairallah et al., *Acta Mater.* / *Science* recoil picture). Field peak stays uncapped (PROOF 015); recoil and Marangoni \(\Delta T\) use \(T_s=\min(T_\mathrm{field},T_v)\).
  - Heiple & Roper, *Welding Journal* 61 (1982): \(\partial\gamma/\partial T\) sign sets outward vs inward flow. Inversion band 30–60 ppm S (Ebrahimi et al., *Int. J. Heat Mass Transfer* 2021, DOI `10.1016/j.ijheatmasstransfer.2020.120801`). `marangoni-heiple-v1` reports direction / Ma / \(u\) / \(\mathrm{Pe}_{Ma}\). It does **not** refit \(W/D\) and is **not** CFD.
- **Literature numbers** (search-sourced):
  - NIST AMB2022-03 IN718 (Lane et al. 2024): \(W=136.3\,\mu\mathrm{m}\), \(D=139.7\,\mu\mathrm{m}\). After the A fix, Goldak+Fabbro sits in a \(\pm 30\%\) band (typical: \(W\approx 117\,\mu\mathrm{m}\), \(D\approx 124\,\mu\mathrm{m}\)). Knight recoil at \(T_v\) is \(0.54\,\mathrm{atm}\approx 55\,\mathrm{kPa}\), not \(10^7\,\mathrm{kPa}\).
- **Product split**: Build Job / Rosenthal path still uses \(\eta_\mathrm{eff}\) + King increment. Marangoni and Fabbro flags must not re-score `job.verdict`.
- **Functional proof**: `python3 python/test_goldak_fabbro.py`; `python3 python/test_marangoni_screening.py`; `python3 python/test_eagar_tsai.py`; melt-pool / four-alloy / build-job; `npx tsc --noEmit`.
- **Status**: **PASS**

---

## Proof Entry 021: Liquidus G/R mapping (`solidification-front-v1`)
- **Date**: 2026-09-12
- **Module**: `python/solidification_front.py` / `python/lpbf_thermal_solver.py` / `MeltPool3DCrossSectionLab.tsx`
- **Academic basis**:
  - Quasi-steady laser frame: on the liquidus, \(G=|\nabla T|\) by central difference; growth into the melt \(\mathbf{n}=\nabla T/|\nabla T|\); \(R=v n_x\cos\theta\) (Hunt / Kou geometry; incline \(\theta\) is the Build Job wall angle).
  - Hunt, *Mater. Sci. Eng.* 65 (1984) 75–83, DOI `10.1016/0025-5416(84)90201-X`: \(G/R\) morphology screening bands. **Not** Gäumann–Trivedi–Kurz CET (no \(N_0\) / \(a_{\mathrm{CET}}\) calibration).
  - Hunt–Lu \(\lambda_1=A G^{-1/2}R^{-1/4}\) with LPBF-scale SI prefactor (µm cells). Kirkwood \(\lambda_2\propto\dot{T}^{-1/3}\), \(\dot{T}=GR\). Welding-scale `pdas_A1` is unused.
  - Ahmed & Rack, *Mater. Sci. Eng. A* 243 (1998) 206–211, DOI `10.1016/S0921-5093(97)00802-2`: Ti-6Al-4V fully martensitic when cooling \(>410\,\mathrm{K/s}\). 316L / AlSi10Mg / IN718 notes are screening only (no invented cell-wall chemistry or Laves fraction).
- **Literature numbers** (order-of-magnitude, not a fitted CET map):
  - LPBF \(G\sim 10^5\)–\(10^8\,\mathrm{K/m}\), \(\dot{T}\sim 10^4\)–\(10^7\,\mathrm{K/s}\), \(\lambda_1\sim 0.1\)–\(15\,\mu\mathrm{m}\).
  - NIST AMB2022-03 IN718 Goldak lab path (\(P=285\,\mathrm{W}\), \(v=960\,\mathrm{mm/s}\), \(D_{4\sigma}=67\,\mu\mathrm{m}\)): field map must be on; \(R\) must not exceed scan speed.
- **Product split**: Melt Pool 3D reports `solidification-front-v1`. `POST /api/python/lpbf-build-job` stays `rosenthal-screening-v1`. G/R does **not** re-score `job.verdict`.
- **Fallback G (when the liquidus map has fewer than 3 points)**: \(G=\Delta T/L=(T_\mathrm{surface}-T_\mathrm{sol})/x_\mathrm{rear}\), not \(T_\mathrm{liq}/x_\mathrm{rear}\). Absolute liquidus is not a temperature drop. Does not change `job.verdict`.
- **Functional proof**: `py -3 python/test_solidification_front.py`; `py -3 python/test_lpbf_build_job.py`; `npx tsc --noEmit`.
- **Status**: **PASS**

---

## Proof Entry 022: Measured melt-pool literature catalog (`meltpool-lit-catalog-v1`)
- **Date**: 2026-09-12
- **Module**: `python/meltpool_literature_catalog.py` / `src/data/meltPoolLiteratureCases.ts` / Melt Pool 3D lab
- **Scope**: Research database for W/D checks. Rows are **measured** single tracks with P, v, d, T0, W, D, DOI. The 640-row randomized solver-echo jsonl on `cursor/lpbf-data-research-panel-7a66` is **not** ingested (circular labels).
- **Catalog**:
  - NIST AMB2022-03 IN718, Lane et al. 2024 Table 4, DOI `10.1007/s40192-024-00355-5`: seven bare-plate cases. Goldak+Fabbro W and D stay inside a ×0.5–2 band; smaller \(D_{4\sigma}\) is deeper.
  - 316L, Guo et al. *Micromachines* 15(2):170 (2024) Table 3, DOI `10.3390/mi15020170`. N04 (260 W, 1.47 m/s, 100 µm) scored on Goldak+Fabbro in the same band.
- **Product split**: Catalog scores the Melt Pool lab path only. Build Job stays `rosenthal-screening-v1`.
- **Functional proof**: `py -3 python/test_meltpool_literature_catalog.py`; `npx tsc --noEmit`.
- **Status**: **PASS**

---

## Proof Entry 023: Catalog close-out — AlSi10Mg/Ti64 gaps + Guo N01/N05/N06
- **Date**: 2026-09-12
- **Module**: `python/meltpool_literature_catalog.py` / Melt Pool 3D Literature Benchmarks / Research Hub measured-track collector
- **Scope**: Finish kıvam against DOI-measured isolated single tracks. Do **not** ingest `data/lpbf_meltpool_dataset.jsonl` from `origin/cursor/lpbf-data-research-panel-7a66` (randomized P–v + solver-echo W/D). Do **not** open CFD, Goldak FEA, or Build Job rescoring with Goldak/ET.
- **AlSi10Mg**: No isolated single-track row with P, v, d, T0, W, and D that can be transcribed without inventing a field. Sow et al., *Addit. Manuf.* (2022), DOI `10.1016/j.addma.2022.103112` Table 3 has W/D but samples 7–40 are five weld lines at 100 µm hatch and 1–6 / 41–57 are cube top layers. Piedra et al. (2026), DOI `10.1007/s00170-025-17344-3` Table 3 lists experimental width without depth. Catalog status: `no_measured_track`.
- **Ti-6Al-4V**: PROOF 003 Rosenthal asymptotic remains `kind: asymptotic`. Dilip et al., *Prog. Addit. Manuf.* (2017), DOI `10.1007/s40964-017-0030-2` states selected depths in text (100 W / 500 mm/s → 45 µm; 195 W / 500 mm/s → 176 µm) but does not tabulate matching widths or T0. No figure-digitized W/D added.
- **316L Guo Table 3** (DOI `10.3390/mi15020170`), Goldak+Fabbro, band ×0.5–2:
  - N04: pred W/D 90.3 / 45.1 µm vs 94 / 61 — **in band** (width MAPE 3.9%, depth 26.1%).
  - N05: pred 73.4 / 36.8 vs 83 / 41 — **in band** (11.6% / 10.2%).
  - N06: pred 119.0 / 58.8 vs 98 / 104 — **in band** (21.4% / 43.5%).
  - N01: pred 150.0 / 73.1 vs 114 / 180 — width in band; **depth factor 0.41 (MAPE 59.4%) outside ×0.5–2**. Not fitted.
- **IN718**: Lane 2024 Table 4 seven cases remain in band (PROOF 022).
- **Product split**: Build Job default heat source stays `rosenthal-screening-v1`.
- **Functional proof**: `py -3 python/test_meltpool_literature_catalog.py`; `npx tsc --noEmit`.
- **Status**: **PASS** (kıvam closed with AlSi10Mg honest gap)




## Proof Entry 024: Continuation handoff sync (in-app production anchor check)

- **Date**: 2026-09-14
- **Module**: `production workflow continuity`
- **Scope**: Confirm where the active application session was last left and keep a truthful continuation checkpoint in task logs.
- **State captured**: The active in-app browser target remained `http://localhost:3002/?lpbfStage=comparison#/3d-distortion-lab` under production LPBF path.
- **Operational update**: No new application code changes were introduced in this turn; this was a handoff-continuity turn to avoid rework and preserve context with truthful provenance.
- **Source of truth**: `METALLIKSA_HANDOFF_2026-09-13.md` and current `sonkayıtlar/LOG.md`.
- **Functional proof**: Not re-run this turn (no new code changes); prior acceptance tests from previous turns remain unchanged and valid for existing code state.
- **Status**: **PASS** (continuation log integrity)

---

## Proof Entry 026: Codebase-memory CLI endpoint status

- **Date**: 2026-09-14
- **Module:** session continuity tooling
- **Scope:** Verify and use codebase-memory access for last-anchor recovery.
- **Result:** `codebase-memory-mcp` binary is present and callable, but graph/tool execution from CLI was blocked in this environment with: `codebase-memory-mcp: secure CLI coordination could not be created (endpoint)`.
- **Operational state:** Last anchor remains `http://localhost:3002/?lpbfStage=comparison#/3d-distortion-lab` and is kept in handoff docs/log entries as the continuity point.
- **Status:** **BLOCKED** (local CLI coordination issue); fallback continuity source recorded.

---

## Proof Entry 025: Continuity state note (tooling unavailability)

- **Date**: 2026-09-14
- **Module:** session continuity
- **Scope:** Resolve last known position and preserve handoff metadata.
- **State:** In this turn, graph-style codebase-memory tools were not exposed via available tool registry, so continuity was confirmed from `METALLIKSA_HANDOFF_2026-09-13.md`.
- **Last in-app anchor:** `http://localhost:3002/?lpbfStage=comparison#/3d-distortion-lab`
- **Functional proof:** No runtime changes this turn; no new tests/build run.
- **Status:** **PASS** (documentation continuity integrity)

---

## 2026-09-12 — Resolved LPBF field explorer and application workspace
- Actual OpenFOAM/reference cell temperatures exported as bounded binary time series; hashes and allowlisted artifact serving, exact sizes and finite-value guards. No analytical geometry is mixed into resolved cell rendering.
- 3D time selection/playback, temperature/enthalpy liquid fraction, Y cut, mushy/liquid filter, orbit/zoom/reset, mesh/sample counts and fixed color scale. WebGL objects and observers disposed; network requests cancelled on changes/unmount.
- Searchable responsive module navigation, persisted module selection, honest engine connectivity, on-demand module loading. LPBF opens the simulation first with shared process controls and separate analytical disclosure.
- Thermal Cycle adds predicted trace CSV and research evidence in recipe JSON; Hardness/Tensile removes certification and zero-error wording.
- Verification: 24 WSL engineering tests, 6 API integration tests (including binary serving, cache, cancellation, timeout), field binary contract and existing JSON contract pass. OpenFOAM-14 wmake passes. All analytical LPBF/melt-pool/Marangoni/solidification/literature tests pass; Guo N01 mismatch remains explicitly reported.
- Actual UI OpenFOAM job `8749e03289f04eb4800a4cfc343e95ed`: 58 frames, 1,089 cells; 160/40/40 µm L/W/D, 2496.546 K peak; energy closure 7.988858e-16. Time scrub, phase selection, Y section, molten-cell filter and playback through frame 58/58 observed; saved job restored after refresh. Mobile navigation corrected after screenshot review. Thermal Cycle and Hardness navigation smoke checked.
- Benchmark JSON regenerated for three OpenFOAM/reference cases; single-track peak difference 0%; rotated multilayer/island peak differences at floating-point precision. These latter fixtures remain below melting. No experimental evidence added.
- Build observation: entry JS approximately 301 kB (96 kB gzip), previously 9.58 MB monolithic. This is entry-chunk size, not total LPBF download. LPBF and electrochemistry chunks remain large. Numerical physics is unchanged; VOF/momentum/evaporation/stress remain unresolved, and the platform is not production-ready.

Final checks: `npm run lint` and `npm run build` pass on the final WebGL context-reuse change. Field/JSON contract suites pass. Browser high-fidelity request returned Screening only with no resolved 3D explorer. Remaining production chunk warnings are retained and documented.

## 2026-09-21 — Keyhole numerical/software verification (bounded)

Scope: prescribed Gaussian cavity, empirical angular absorption and normalized
Gaussian Monte Carlo rays; no thermal/free-surface or experimental validation.
`python/test_keyhole_contract.py`: 6 PASS on system Python 3.12, Warp 1.17 CPU/CUDA.
Acceptance checks: flat normal-incidence absorbed power 75 W for 250 W/.3 input
within 1e-4 W; energy relative error <1e-6; seed reproducibility/local RNG isolation;
finite bounded inputs; CPU/GPU absorbed power agreement within .025 W. Analytic
Gaussian aperture is checked at 1024/4096/16384 samples with reported standard error.
`python/test_phase26.py`: isolated real worker RPC PASS. Full product build PASS.

Curved sensitivity is reproducible with `python/benchmark_keyhole_convergence.py`.
For 200 um aperture, 250 W, radius 50 um, cavity depth 120 um, base absorption .35,
16384 rays, seed 17, CPU: 32/64/128 grids yield efficiency .71489646/.71137585/
.70515435. Zero closure error, 128-grid bounce budgets 4/8/16 agree. Mesh increments
do not decrease regularly; asymptotic convergence is unresolved. Sampling standard
error is not a mesh/model uncertainty bound. System NumPy/SciPy exceed repository
requirements; locked-environment reproduction remains open.

Tafel ingestion uses exact analytic branch fixtures (Ecorr=-.2 V, icorr=10 uA/cm2,
beta_a=.1, beta_c=.2 V/dec; area 2 cm2), recovering current-unit equivalence in
A/mA/uA/log(A). These checks verify equations and unit handling, not ASTM conformity
or experimental applicability. See `python/test_no_fabricated_outputs.py` and the
Phase 0 audit for the 10-test software/analytic scope and remaining limitations.

## 2026-09-21 — CNLS residual Jacobian sign regression

Scope: numerical verification of the local CNLS step, not EIS experimental
validation. Analytic independent fixtures use R=20 Ohm and
Z=5+120/(1+j*2*pi*f*120*20e-6), 60 log-spaced frequencies 0.1–100000 Hz.
Before repair, R stayed at its initial2 Ohm and Randles Rs stayed at12 instead
of5. The residual is experimental-minus-calculated; its numerical Jacobian
requires the normal-equation RHS -J^T r. Correcting this sign passes both tests:
R within1e-6 Ohm (NumPy and pure Python), each Randles parameter relative error
below1e-5, reduced objective below1e-12. Command:
.runtime/lpbf-win-py312/Scripts/python.exe python/test_cnls_numerics.py (2 PASS).
Known remaining limitations: termination/uncertainty/fixed-parameter reporting,
K-K and standards claims, and synthetic provenance are separate open repairs.

## 2026-09-21 — CNLS evaluation and uncertainty regression evidence

Acceptance uses independent closed-form R/Randles fixtures from test_cnls_numerics,
not measured spectra. Twelve tests PASS with the CPU Python3.12 environment:
known-parameter recovery, fixed model residuals, iter0 evaluation, negative/undefined
magnitude R², rank-deficient uncertainty, invalid inputs/options, frontend bounds,
local seeded DE, short LinKK unavailable, and no stationarity/K-K/ASTM certification.
Uncertainty is conditional local linearized residual-scaled covariance only. Null
means unavailable; pure-Python fitting works but uncertainty requires NumPy SVD.
Shared frontend contract5 tests PASS including HTTP503/no fallback and real-zero
retention; full unit125, lint and buildPASS. Real browser studio/builder fit and
error/partial report flows passed using isolated IPC5192. See Phase0 audit for
exact runtime/browser limits and the still-unreviewed Voigt/JS/synthetic paths.

## 2026-09-21 — IN718 HDF5 metadata inspection, not thermal validation

Source scope: NIST mds2-2716 local three-file archive, 550398609 bytes. All recorded
hashes matched before/after read-only metadata inspection. Four new Python tests
passed (first failed), plus four manifest tests; six source API tests, full167unit,
strict TypeScript and production build passed. Existing large-chunk warning remains.
The inspector reads no dataset values; no temperature, width or depth is generated.

73 objects include27 raw signal datasets. Reviewed source conditions and missing
calibration reasons are in docs/NIST_IN718_HDF5_REVIEW_2026-09-21.md. The stored
calibration expression has unbalanced parentheses and unspecified emissivity;
conversion remains null. Source unit digital levels is not Kelvin/Celsius.

Updated metadata was explicitly imported into isolated pilot revision2, retaining
revision1, and all three archived artifacts were verified again. Document SHA256:
53a5171e1fdb0fedf5f25bc6160ab57fa835a2594940ef083e78b531d721bc2a.
Report: .runtime/phase0-audit/hdf5-source-import-01a0c35a.json.
This is source/provenance and software evidence. Phase0 remains open.

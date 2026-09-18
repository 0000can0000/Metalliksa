# Agent Operational Guidelines & Architecture (`AGENTS.md`)

## 0. Repository navigation and token efficiency

- For structural code questions, use the local Graft graph in `graft/` first:
  `graft ask`, `graft callers`, `graft skeleton`, and `graft map`.
- Use `codebase-memory-mcp` for verified graph searches, call traces,
  architecture, and index-coverage checks when the question is broader than a
  single Graft card.
- Fall back to `rg` for literal strings, configuration, and non-code files.
- Do not read whole source files when a Graft card or targeted graph snippet
  answers the question; use the referenced file and line span only when the
  card is insufficient.

> **Note**: This file is automatically loaded into the agent system context. The rules below define validation gates; they do not imply that every existing model is experimentally validated. Current model maturity and evidence limits are maintained in [`docs/LPBF_ENGINEERING.md`](./docs/LPBF_ENGINEERING.md) and [`docs/RESEARCH_WORKSTATION.md`](./docs/RESEARCH_WORKSTATION.md).

---

## 1. Agent operating policy

Project-wide operational rules live in [`RULES.md`](./RULES.md). Follow that file for UI language, validation and proof records, session logging, final briefings, and meaningful-change commit/push cadence. Keep this file focused on technical architecture, domain constraints, and evidence-sensitive implementation guidance.

### Default orchestration policy

For any non-trivial change, use this tool order unless the task is clearly a
single-file, low-risk edit:

1. **Context and impact** — use Graft for fast local orientation, symbol lookup,
   callers, and blast-radius checks. Use `codebase-memory-mcp` for broader or
   evidence-sensitive architecture, call-trace, and index-coverage questions.
2. **Research lane** — for literature searches, evidence reviews, scientific
   claims, or current external facts, orchestrate `@Consensus` for targeted
   paper discovery/consensus signals and `@ARS-Codex` for structured academic
   research, source verification, synthesis, and integrity-aware handoffs. For
   OpenResearch/automated-ML experiment design, execution, or result analysis,
   include `@orx` as the experiment/compute lane; first load its live manual
   with `orx skill` and any relevant module before acting.
   Keep the two roles distinct: Consensus is a discovery/input source; ARS-
   Codex owns the research workflow and evidence-quality synthesis; orx manages
   OpenResearch experiment trees/runs and their results. Never treat their
   outputs as ground truth without source-level verification. Do not start
   managed compute or incur external cost without task-specific authorization.
   Run this lane before planning when research affects implementation decisions.
3. **Plan and delegation** — decompose the work into disjoint responsibilities
   before parallel execution. Do not let two lanes edit the same file.
4. **Parallel implementation** — use the global `codex-fleet` skill for
   independent lanes with isolated worktrees. Keep write scopes explicit.
5. **UI/UX lane** — whenever the change affects appearance, interaction,
   responsive behavior, accessibility, typography, charts, or motion, use the
   global `ui-ux-pro-max` skill.
6. **Verification and quality gate** — apply ECC-style capability and
   regression evals, deterministic tests, benchmark checks, and severity-ranked
   review before declaring the work complete.

The preferred flow is:

```text
Graft / codebase-memory-mcp → Consensus/ARS-Codex research (when needed)
→ orx experiments (when OpenResearch/ML runs are in scope)
→ plan → codex-fleet lanes → integration → tests/benchmarks
→ UI/accessibility review → ECC release gate
```

For simulation or scientific work, the physics contract and benchmark fixture
must be agreed before solver/UI implementation. For UI work, the
`ui-ux-pro-max` guidance supplements — and never overrides — the project's
scientific, accessibility, and source-of-truth constraints.

### Simulation parallel-lane template

For LPBF, thermal, melt-pool, distortion, or other simulation work, use these
disjoint lanes when the task is large enough to benefit from parallelism:

```text
Lane A — Physics/model contract       → python/ solver + schema + assumptions
Lane B — API/worker integration       → routes/ + server/ + service boundary
Lane C — UI/visualization              → src/components/ + src/store/
Lane D — Verification/benchmark       → tests/ + benchmark fixtures + docs/
```

Lane A runs first for new equations, parameters, units, or model ids. Lanes B,
C, and D may then run in parallel only within their declared write scopes.
Integration is followed by the full verification gate; no lane may silently
change a shared scientific contract owned by Lane A.

For independent work on another connected Codex host, use a separate worktree
or explicit handoff and keep the same scope rule. Cross-host execution is
allowed only when that host, project, branch/state, and permissions are
visible and verified; otherwise keep the work local and do not assume that a
second PC is available.

---

## 2. Metallurgical Domain Rules & Physics Engine

### Energy Density & Process Regime Constraints
- **Do Not Rely Exclusively on VED**:
  - Always couple Volumetric Energy Density ($E_V$) with Linear Energy Density ($E_L$), Peak Intensity ($I_0 = \frac{4P}{\pi d^2}$), and Normalized Enthalpy ($\Delta H / h_s$).
  - For laser powder bed fusion (LPBF), keyhole onset typically occurs when $I_0 > 1.0 - 1.5\text{ MW/cm}^2$ and $\Delta H / h_s > 30$.
  - Lack-of-fusion (LoF) occurs when hatch spacing $h >$ melt pool width $W$ or layer thickness $t >$ melt pool depth $D$.

### Traceability

Qualification records follow the five-tier `Build → ProcessParams → Sample → Properties → Source` contract defined in [`SCHEMA.md`](./SCHEMA.md). Evidence labels, standards references, and the distinction between measured, estimated, synthetic, screening, and unresolved data are mandatory; the schema is the source of field-level detail.

---

## 3. Code Standards & Architecture Guidelines
- **Framework**: React 18+ with TypeScript and Vite.
- **Styling**: Tailwind CSS utility classes exclusively. No external CSS files.
- **3D Visualization**: Three.js / Canvas with `ResizeObserver` container bounding, requestAnimationFrame cleanup, and WebGL memory disposal (`geometry.dispose()`, `material.dispose()`).
- **Icons**: Standard imports from `lucide-react`.
- **State Management**: Centralized reactive Zustand store (`useMaterialSpecimenStore.ts`) ensuring synchronized digital twin state between 3D simulations, slicer distortion models, and metallurgical databases.
- **LPBF Build Job**: `activeSpecimen.lpbf` holds the live process vector ($P, v, h, t, d$, preheat, scan strategy). Sub-labs and Inverse Alloy LPBF must read/write this vector; do not keep a second copy of machine parameters. Uploaded STL triangles live in session store `useLpbfBuildMeshStore` (not persisted). Industrial printability is `POST /api/python/lpbf-build-job` (`python/lpbf_build_job_solver.py`); rail and Decision lab share session store `useLpbfBuildJobStore` and display `job.verdict` only — they must not call `evaluateLpbfBuildJob`. The same Python payload also drives STL geometry source, \(W/h\), \(D/t\), \(\Delta H/h_s\), literature P–v box, part mass, and build time; model id is `rosenthal-screening-v1` with `job.assumptions` shown in the Decision lab. The Melt Pool 3D lab may request `heatSource=goldak` (`goldak-v1`) or `eagar-tsai` (`eagar-tsai-v1`); Fabbro keyhole depth (`fabbro-keyhole-v1`) rides those lab paths only, using Fresnel \(A\) (not stacked \(\eta_\mathrm{eff}\)). Heiple–Roper Marangoni (`marangoni-heiple-v1`) is screening — it does not refit \(W/D\). Solidification G/R (`solidification-front-v1`) maps Hunt-class $G$, $R$, $\dot{T}$ on the liquidus of whatever heat source the lab is running; Hunt $G/R$ bands and Hunt–Lu PDAS are screening — not Gäumann $N_0$ CET and not a W/D fit. Melt-pool W/D checks use `meltpool-lit-catalog-v1` (DOI-measured isolated tracks only). IN718 = Lane 2024 Table 4; 316L = Guo 2024 Table 3 (N01 depth is out of the ×0.5–2 Goldak+Fabbro band — reported, not fitted). AlSi10Mg is an honest `no measured track` gap. Ti-6Al-4V keeps PROOF 003 as `kind: asymptotic`. Solver-echo / randomized self-label sweeps (including the 640-row jsonl on `cursor/lpbf-data-research-panel-7a66`) are not ground truth. Those flags must not be used to re-score Build Job printability. Ti-6Al-4V, 316L, AlSi10Mg, and IN718 thermophysics, aliases, and literature P–v boxes live in `python/four_alloy_materials.py`; Python solvers look up that file instead of copying $k$, $\rho$, $C_p$.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->

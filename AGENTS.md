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

# Agent Operational Guidelines & Architecture (`AGENTS.md`)

> **Note**: This file is automatically loaded into the agent system context. Every protocol, formula, and instruction here has been validated both **academically** (against peer-reviewed metallurgy literature and thermodynamic principles) and **functionally** (against TypeScript type safety, zero build regressions, and test proofs).

---

## 1. Prime Directive & Linguistic Policy
1. **English-Only User Interface**:
   - Every user-facing UI label, button, header, unit indicator, tooltip, notification, and modal **MUST be rendered in English**.
   - No Turkish or multilingual strings shall be placed in JSX/TSX view components.
2. **Dual-Validation Rule**:
   - Never commit models or directives to this file or code without first passing:
     - **Academic Validation**: Grounded in peer-reviewed additive manufacturing / metallurgical literature (e.g., Rosenthal moving heat source, Eagar-Tsai 3D solution, normalized enthalpy, ASTM/ISO standard testing methods).
     - **Functional Validation**: Clean `tsc --noEmit` validation, `npm run build` production bundling, and entries logged in [`PROOF.md`](./PROOF.md).
3. **Session Self-Record (`sonkayıtlar`)**:
   - When the job **stops** — including unfinished, interrupted, blocked, or backgrounded work — the agent **must write a record** in [`sonkayıtlar/LOG.md`](./sonkayıtlar/LOG.md) (newest first). Do not wait for tests or a clean finish. See Rule 5 in [`RULES.md`](./RULES.md).
   - Use **Result** `PARTIAL` when the job was cut off. The log must exist even if the rest of the task never ran.
4. **End-of-Job User Briefing**:
   - The final message must state **what was done** and **where the user stands** (finished vs remaining, next step). See Rule 6 in [`RULES.md`](./RULES.md).
5. **Commit and Push to GitHub**:
   - After any completed change set, commit and push to `origin` on the current branch. See Rule 7 in [`RULES.md`](./RULES.md). Do not leave finished work uncommitted.

---

## 2. Metallurgical Domain Rules & Physics Engine

### Energy Density & Process Regime Constraints
- **Do Not Rely Exclusively on VED**:
  - Always couple Volumetric Energy Density ($E_V$) with Linear Energy Density ($E_L$), Peak Intensity ($I_0 = \frac{4P}{\pi d^2}$), and Normalized Enthalpy ($\Delta H / h_s$).
  - For laser powder bed fusion (LPBF), keyhole onset typically occurs when $I_0 > 1.0 - 1.5\text{ MW/cm}^2$ and $\Delta H / h_s > 30$.
  - Lack-of-fusion (LoF) occurs when hatch spacing $h >$ melt pool width $W$ or layer thickness $t >$ melt pool depth $D$.

### 5-Tier Traceability Architecture
- Every material specimen and process qualification record must maintain strict 5-tier referential integrity:
  1. `Build`: Machine model, powder lot, gas atomization (GA/PREP), particle size distribution ($D_{10}, D_{50}, D_{90}$), date.
  2. `ProcessParams`: Laser power $P$, scan speed $v$, hatch spacing $h$, layer thickness $t$, beam diameter $d$, scan strategy, preheat temperature.
  3. `Sample`: Specimen geometry, orientation ($0^\circ, 45^\circ, 90^\circ$), build plate coordinate $(x,y,z)$, heat treatment (As-Built, Stress Relieved, HIP).
  4. `Properties`: Relative density % (Archimedes ASTM B962 / CT), UTS (ASTM E8), Yield Strength ($R_{p0.2}$), Elongation at break %, Hardness (HV).
  5. `Source`: Peer-reviewed publication citation, journal, publication year, testing standards, and resolvable DOI.

---

## 3. Code Standards & Architecture Guidelines
- **Framework**: React 18+ with TypeScript and Vite.
- **Styling**: Tailwind CSS utility classes exclusively. No external CSS files.
- **3D Visualization**: Three.js / Canvas with `ResizeObserver` container bounding, requestAnimationFrame cleanup, and WebGL memory disposal (`geometry.dispose()`, `material.dispose()`).
- **Icons**: Standard imports from `lucide-react`.
- **State Management**: Centralized reactive Zustand store (`useMaterialSpecimenStore.ts`) ensuring synchronized digital twin state between 3D simulations, slicer distortion models, and metallurgical databases.
- **LPBF Build Job**: `activeSpecimen.lpbf` holds the live process vector ($P, v, h, t, d$, preheat, scan strategy). Sub-labs and Inverse Alloy LPBF must read/write this vector; do not keep a second copy of machine parameters. Uploaded STL triangles live in session store `useLpbfBuildMeshStore` (not persisted). Industrial printability is `POST /api/python/lpbf-build-job` (`python/lpbf_build_job_solver.py`); rail and Decision lab share session store `useLpbfBuildJobStore` and display `job.verdict` only — they must not call `evaluateLpbfBuildJob`. The same Python payload also drives STL geometry source, \(W/h\), \(D/t\), \(\Delta H/h_s\), literature P–v box, part mass, and build time; model id is `rosenthal-screening-v1` with `job.assumptions` shown in the Decision lab. The Melt Pool 3D lab may request `heatSource=goldak` (`goldak-v1`) or `eagar-tsai` (`eagar-tsai-v1`); Fabbro keyhole depth (`fabbro-keyhole-v1`) rides those lab paths only, using Fresnel \(A\) (not stacked \(\eta_\mathrm{eff}\)). Heiple–Roper Marangoni (`marangoni-heiple-v1`) is screening — it does not refit \(W/D\). Solidification G/R (`solidification-front-v1`) maps Hunt-class $G$, $R$, $\dot{T}$ on the liquidus of whatever heat source the lab is running; Hunt $G/R$ bands and Hunt–Lu PDAS are screening — not Gäumann $N_0$ CET and not a W/D fit. Those flags must not be used to re-score Build Job printability. Ti-6Al-4V, 316L, AlSi10Mg, and IN718 thermophysics, aliases, and literature P–v boxes live in `python/four_alloy_materials.py`; Python solvers look up that file instead of copying $k$, $\rho$, $C_p$.

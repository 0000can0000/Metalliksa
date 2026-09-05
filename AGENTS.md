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

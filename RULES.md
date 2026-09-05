# Project Rules & Governance (`RULES.md`)

This document defines the strict, binding operational and engineering rules for the **MetalliX / LPBF Simulation & Metallurgy Suite**. All developers, agents, and contributors must strictly adhere to these rules.

---

## 1. Rule 1: English-Only User Interface
- **All user-facing elements, UI strings, labels, tooltips, dialogs, buttons, notifications, chart axes, units, and documentation displayed in the application MUST be in English.**
- No Turkish or multilingual text shall be committed directly to UI components.
- Internal code comments and technical variable names must also use standard English terminology.

---

## 2. Rule 2: Mandatory Testing & `PROOF.md` Protocol
- Any calculation, model, algorithm, parameter modification, or protocol implemented in modules such as **LPBF & Material Roadmap / Process Protocols**, **Melt Pool Simulation**, or **Thermal-Distortion Solvers** must be rigorously tested before being marked complete.
- **Verification Trigger**: Once a feature, dataset, or mathematical model has been validated:
  - It must be recorded in [`PROOF.md`](./PROOF.md).
  - The entry must include:
    1. **Date & Scope of Test**
    2. **Input Parameters** (Alloy, Laser Power $P$, Scan Speed $v$, Hatch Spacing $h$, Layer Thickness $t$, Beam Spot $d$)
    3. **Theoretical / Published Literature Benchmark** (e.g., Rosenthal equation, King et al. keyhole threshold, peer-reviewed paper DOI)
    4. **Observed System Output** (Calculated VED, Melt pool depth/width, Relative density %, UTS)
    5. **Pass / Fail Criterion & Deviation Margin** (acceptable tolerance threshold)

---

## 3. Rule 3: Academic & Functional Dual-Validation for `AGENTS.md`
- Updates and additions to [`AGENTS.md`](./AGENTS.md) must fulfill **Dual-Validation**:
  1. **Academic Rigor**: Formulations must reflect peer-reviewed literature and standard metallurgical thermodynamics (e.g., Rosenthal moving point source, Eagar-Tsai Gaussian distribution, Marangoni convection, dimensionless normalized enthalpy $\Delta H / h_s$).
  2. **Functional Rigor**: Code must pass `lint_applet` (`tsc --noEmit`), `compile_applet` (`vite build`), and runtime integrity checks with zero runtime console exceptions.
- Only after both academic validity and functional execution are confirmed may persistent directives or state be committed to `AGENTS.md`.

---

## 4. Rule 4: Data Traceability & ASTM Compliance
- No mock or arbitrary synthetic data may be passed off as ground truth.
- Every experimental record in the LPBF database must maintain 5-tier traceability (`Build` $\rightarrow$ `ProcessParams` $\rightarrow$ `Sample` $\rightarrow$ `Properties` $\rightarrow$ `Source` with DOI).
- Standard testing protocols must explicitly reference applicable standards (ASTM F3055, ASTM B962, ASTM E8/E8M, ASTM E1245).

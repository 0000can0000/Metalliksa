# Project Rules & Governance (`RULES.md`)

This document defines the strict, binding operational and engineering rules for the **Metalliksa / LPBF Simulation & Metallurgy Suite**. All developers, agents, and contributors must strictly adhere to these rules.

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

---

## 5. Rule 5: Mandatory Session Record in `sonkayıtlar` (Even If Work Stops Mid-Job)
- **Trigger**: Write a `sonkayıtlar` entry whenever an agent job **stops**, not only when it finishes cleanly. This includes success, tests not run, **interrupted / backgrounded / user-stopped work**, blocked tools, auth failures, partial edits, and abandoned follow-ups.
- **Do not wait** for tests or a “complete” state. An incomplete job is still a job: log it immediately with **Result** `PARTIAL` (or `FAIL` if it broke).
- **Location**: All such records go in the [`sonkayıtlar/`](./sonkayıtlar/) directory. Newest entries are prepended to [`sonkayıtlar/LOG.md`](./sonkayıtlar/LOG.md).
- **Do not skip** this step for “small” fixes, rule/docs edits, UI work, or half-finished work. If tests were not applicable or never ran, state that explicitly and still write the record.
- Each entry must include:
  1. **Date and time** (ISO local: `YYYY-MM-DD HH:MM`)
  2. **Task summary** (what was requested / what was done)
  3. **Files touched** (paths)
  4. **Tests completed** (commands, browser checks, or “N/A — reason”)
  5. **Result** (`PASS` / `FAIL` / `PARTIAL`)
  6. **Agent self-id** (model name if known, otherwise `Cursor agent`)
  7. **Done** and **Where we left off** (what landed vs what was cut off — required when the job did not finish)
- Scientific model proofs remain in [`PROOF.md`](./PROOF.md) (Rule 2). `sonkayıtlar` is the operational work log for every agent job, complete or not.

---

## 6. Rule 6: End-of-Job User Briefing (What Was Done + Where You Stand)
- **Trigger**: The agent’s **final reply** after every job (complete, partial, or blocked) must tell the user, in the user’s language:
  1. **What was done** — concrete outcomes (files, features, tests), not a list of tool calls.
  2. **Where you stand** — what is finished, what is still open, and the natural next step (or “nothing left on this task”).
- Do not end with only “done” or a dump of diffs. Lead with the briefing, then optional extra detail.
- The same two points go into the `sonkayıtlar` entry as **Done** and **Where we left off**.

---

## 7. Rule 7: Commit and Push After Every Meaningful Completed Job
- **Trigger**: After an agent completes a meaningful, user-scoped change set — such as a feature, bug fix, documentation pass, or coherent group of related small edits — it **must** create one git commit and **push it to GitHub** (`origin`) on the current branch.
- **Batching**: Do not create a separate commit for every small intermediate edit. Combine related edits made during the same task into one reviewable change set. A standalone typo or trivial correction may be bundled with the next related task.
- Do not leave a completed meaningful change set as uncommitted local edits. Do not wait for a second user prompt to commit or push.
- **Scope**: Stage only files intentionally changed by the current task. Preserve and exclude unrelated user edits, generated artifacts, secrets, `.env` files, and bytecode.
- **Sequence**: (1) finish the meaningful change set and applicable tests, (2) write the `sonkayıtlar` entry (Rule 5), (3) inspect status and diff, (4) `git add` only the files for this task, (5) commit with a concise message that states **why**, (6) `git push` to the tracked remote branch (`git push -u origin HEAD` if upstream is missing).
- **Forbidden**: `git config` changes, `--no-verify`, force-push to `main`/`master`, interactive rebase, or committing credentials.
- If push fails (auth, network, no remote), report the error in the user briefing and in `sonkayıtlar`; the local commit must still exist.

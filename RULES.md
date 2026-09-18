# Project Rules & Governance (`RULES.md`)

This document defines the strict, binding operational and engineering rules for the **Metalliksa / LPBF Simulation & Metallurgy Suite**. All developers, agents, and contributors must strictly adhere to these rules.

---

## 1. Rule 1: English-Only User Interface
- All user-facing UI text and documentation displayed inside the application must be in English.
- Do not add Turkish or multilingual strings to JSX/TSX view components. Keep code comments and technical names in standard English.

---

## 2. Rule 2: Testing and Evidence
- Test every changed behavior at the narrowest relevant level before calling it complete.
- Do not call a result validated, measured, certified, or production-ready without matching evidence. Record validated model or dataset claims in [`PROOF.md`](./PROOF.md) with scope, inputs, benchmark/source, observed output, and acceptance criterion.

---

## 3. Rule 3: Persistent Guidance Changes
- Changes to [`AGENTS.md`](./AGENTS.md) must be evidence-backed and consistent with the implementation and applicable literature.
- Run the relevant type, build, runtime, or domain tests for the change; do not require unrelated full-suite checks for a documentation-only edit.

---

## 4. Rule 4: Data Traceability and Standards
- Never present mock, synthetic, estimated, or user-supplied data as measured ground truth.
- Qualification records must maintain `Build → ProcessParams → Sample → Properties → Source` traceability; field details live in [`SCHEMA.md`](./SCHEMA.md).
- Procedures must cite the applicable ASTM/ISO standard, and a citation alone must not be treated as validation.

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

## 7. Rule 7: Frequent Local Commits & Push on Verified Milestones
- **Frequent Local Commits ("Commit Early & Often")**: Commit frequently in the local git repository for every logical step, sub-feature, working refactor, or meaningful checkpoint. Do not hesitate to create local commits to preserve working states and maintain an inspectable, safe history.
- **Push Timing**: Push to GitHub (`origin`) on the tracked branch when a milestone, feature, bug fix, or user-scoped task is completed, verified, and in a working (non-broken) state.
- **Scope & Hygiene**: Stage only files intentionally changed by the current task. Never commit secrets, `.env` files, build artifacts, or unrelated user edits. Keep commit messages concise, stating what was changed and why.
- **Sequence**: (1) Make changes and create local commits as logical steps complete, (2) run applicable tests/checks, (3) log progress or completion in `sonkayıtlar` (Rule 5), (4) inspect `git status` / `git log`, (5) `git push` to remote once the milestone is verified and ready.
- **Forbidden**: `git config` changes, `--no-verify`, force-push to `main`/`master`, interactive rebase on pushed commits, or committing credentials.
- If push fails (auth, network, no upstream), report the issue in the user briefing; local commits must remain intact.

## 8. Rule 8: Mandatory Continuation Note in Every Task
- **Trigger**: Every agent job must create/update a Markdown handoff entry with a consistent structure in `sonkayıtlar/LOG.md` after work is done **or stopped**, including:
  - **Last completed action** (the exact last code/doc change or decision),
  - **Next action** (the immediately next concrete step, even if work is not finished),
  - **Result** (`PASS`, `PARTIAL`, `BLOCKED`, `FAIL`) and exact blocker/reason if not complete.
- This is required not only for code changes, but also for docs, protocol edits, and module-level planning.
- If the job changes multiple modules (for example LPBF + evidence + materials), the handoff note must still be a single entry that names what changed in each module and what remains.

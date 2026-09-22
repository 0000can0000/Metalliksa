# Metalliksa roadmap

> **Important Navigation Note:** 
> Metalliksa operates on two distinct, parallel roadmaps to separate physical simulation features from commercial and engineering readiness.
> 
> 1. **Physics & Features Roadmap (This Document):** Tracks the technical implementation of physical solvers, simulation models, and algorithms across 21 implementation milestones (Phases 1-21).
> 2. **Engineering & Pilot Roadmap (UI & Code):** Tracks strict software, quality, and pilot qualification gates (Tasks A01-H02 / Gates K0-K4) needed for industrial usage. This is managed in `src/data/engineeringRoadmap.ts` and visible in the application's Engineering Roadmap UI panel.
> 
> *A completed phase in this document is an algorithmic implementation milestone, not a claim of experimental qualification or production readiness (which belongs to the Engineering Roadmap).*

## Current position

- **Latest implementation milestone:** Phase 21 — transient enthalpy-method phase-change solver (FDM).
- **Active worktree:** Phase 22 GPU-accelerated 3D transient enthalpy work is present as uncommitted changes; it is intentionally not treated as a completed milestone here.
- **Application surface:** 30 registered workspaces; the current inventory marks them as Research or Preview, with no module labelled Production.
- **Evidence boundary:** the application is a traceable engineering research workstation. Solver outputs remain screening results unless the matching evidence is recorded in `PROOF.md`.
- **Historical plan:** the previous six-phase roadmap is preserved at [`docs/archive/ROADMAP_LEGACY_PHASES.md`](docs/archive/ROADMAP_LEGACY_PHASES.md).

## Implemented milestones

Phases 1–6 established the data, standards, thermal, optics, powder, and CFD foundations. Phases 7–11 added plume/shielding, solidification microstructure, thermomechanics, experimental traceability, and GPU/optimization workflows. Phases 12–16 added toolpath kinematics, fatigue/fracture screening, spatial defect twin, adaptive feed-forward mitigation, and multi-laser/plume coordination. Phases 17–21 added thermal accumulation, powder-bed compaction, optical tomography/NETD, support optimization, and transient latent-heat phase change.

Each milestone must remain backed by its focused tests and a dated entry in [`PROOF.md`](PROOF.md).

## Remaining product gaps

1. **End-to-end CAD/process contract:** preserve CAD geometry, powder state, machine profile, layer plan, and scan strategy as one versioned process vector.
2. **Baseline comparison:** establish a reproducible GO-MELT or equivalent baseline with declared inputs, mesh/time-step policy, error norms, and wall-clock measurements.
3. **Part-level validation:** separate calibration from holdout validation using measured melt pools and XCT/Archimedes evidence.
4. **Physics maturity:** keep the current analytical and screening models distinct from a fully coupled free-surface, evaporation, recoil, Marangoni, and stress solver.
5. **Production readiness:** move modules from Research/Preview only after runtime, evidence, packaging, and failure-state gates are satisfied.

## Working order

The next implementation decision should target one of the five gaps above. Do not add another physics phase until the selected gap has a clear input contract, acceptance test, evidence boundary, and user-facing workflow.

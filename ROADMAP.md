# Metalliksa roadmap

> **Important Navigation Note:** 
> Metalliksa operates on two distinct, parallel roadmaps to separate physical simulation features from commercial and engineering readiness.
> 
> 1. **Physics & Features Roadmap (This Document):** Tracks the technical implementation of physical solvers, simulation models, and algorithms across implementation milestones.
> 2. **Engineering & Pilot Roadmap (UI & Code):** Tracks strict software, quality, and pilot qualification gates (Tasks A01-H02 / Gates K0-K4) needed for industrial usage. This is managed in `src/data/engineeringRoadmap.ts` and visible in the application's Engineering Roadmap UI panel.
> 
> *A completed milestone in this document records an algorithmic implementation; it does not claim experimental qualification or production readiness (which belongs to the Engineering Roadmap).*

## Current position

- **Latest completed implementation:** Transient enthalpy-method phase-change solver (FDM).
- **Active worktree:** GPU-accelerated 3D transient enthalpy work is present as uncommitted changes; it is not recorded as complete here.
- **Application surface:** 30 registered workspaces; the current inventory marks them as Research or Preview, with no module labelled Production.
- **Evidence boundary:** the application is a traceable engineering research workstation. Solver outputs remain screening results unless the matching evidence is recorded in `PROOF.md`.
- **Historical plan:** the legacy roadmap is preserved at [`docs/archive/ROADMAP_LEGACY_PHASES.md`](docs/archive/ROADMAP_LEGACY_PHASES.md).

## Implemented milestones

Early milestones established the data, standards, thermal, optics, powder, and CFD foundations. Later work added plume/shielding, solidification microstructure, thermomechanics, experimental traceability, GPU/optimization, toolpath kinematics, fatigue/fracture screening, spatial defect mapping, adaptive feed-forward mitigation, multi-laser/plume coordination, thermal accumulation, powder-bed compaction, optical tomography/NETD, support optimization, and transient latent-heat phase change.

Each milestone must remain backed by its focused tests and a dated entry in [`PROOF.md`](PROOF.md).

## Remaining product gaps

1. **End-to-end CAD/process contract:** preserve CAD geometry, powder state, machine profile, layer plan, and scan strategy as one versioned process vector.
2. **Baseline comparison:** establish a reproducible GO-MELT or equivalent baseline with declared inputs, mesh/time-step policy, error norms, and wall-clock measurements.
3. **Part-level validation:** separate calibration from holdout validation using measured melt pools and XCT/Archimedes evidence.
4. **Physics maturity:** keep the current analytical and screening models distinct from a fully coupled free-surface, evaporation, recoil, Marangoni, and stress solver.
5. **Production readiness:** move modules from Research/Preview only after runtime, evidence, packaging, and failure-state gates are satisfied.

## Working order

The next implementation decision should target one of the five gaps above. Do not add another physics phase until the selected gap has a clear input contract, acceptance test, evidence boundary, and user-facing workflow.

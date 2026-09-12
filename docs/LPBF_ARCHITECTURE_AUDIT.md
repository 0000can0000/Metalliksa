# LPBF architecture audit — 2026-09-12

## Baseline before implementation

The working tree was clean except for the unrelated, untracked `.cursor/mcp.json`, which must not be committed. The existing analytical Rosenthal, Goldak, Eagar–Tsai, Fabbro and Marangoni paths stay available.

The engineering panel already connects HTTP → JSON-lines bridge → WSL Python → SQLite queue → isolated process. There are two independently implemented explicit enthalpy finite-volume kernels: NumPy Cartesian arrays and OpenFOAM 14 mesh face exchange. Neither solves continuity, momentum, gas, VOF, evaporation, recoil or stress. Registering a free-surface solver without its verification suite would misrepresent capability.

Ubuntu-22.04 / WSL2 and `foamVersion = OpenFOAM-14` were verified. Sandbox WSL access required elevated execution. Baseline TypeScript lint and analytical melt-pool tests passed. Baseline engineering tests: 13 passed, one OpenFOAM skip on Windows, one temporary-directory/SQLite permission failure in the Windows sandbox; repeat on WSL and outside that sandbox before attributing it to the queue.

## Findings

- Source penetration depends on mesh size, confounding mesh sensitivity with a changed physical source. Source position is evaluated before the final source-driven timestep restriction.
- Thermal kernels conserve fixed reference mass; density(T) is diagnostic, not a continuity solution. No active deposition mass audit or interface audit exists.
- Top-surface detection in the OpenFOAM kernel can select more than one layer of cells when the physical surface does not coincide with a mesh face.
- Aggregate dimensions cannot establish local fusion across tracks. Scan-normal voxel support is underestimated for rotated scans. Cross-section is a YZ grid section.
- Calibration accepts width/depth/source but has no enforceable same-process check, uncertainty or holdout metadata.
- Full fields are stored outside JSON, but artifact manifest, size/checksum and retention declaration are absent.
- Refresh loses the current job. Polling loses cache-hit state. Completed result integrity is not checked before reuse. Cancellation can race timeout/shutdown terminal states.
- The engineering panel labels screening correctly; adjacent CAD stress labels and the ground-truth panel's unconditional cooling-rate/martensite statement overstate model scope and need qualification. Numerical convergence is not experimental validation.

## Implementable phases and gates

1. Strengthen the existing thermal foundation: mesh-independent source depth, source integration timing, strict schema/evidence checks, active mass bookkeeping, field artifacts and independent backend comparisons. Gate: numerical tests, actual wmake/case, contract and browser smoke.
2. Keep free-surface capability explicitly unresolved. A future metal/gas solver must pass bounded interface advection, static droplet pressure, spurious-current and phase-volume tests before registration. No invented interface results.
3. Keep flow, evaporation, recoil and keyhole metrics null. Future momentum coupling requires Marangoni cavity and evaporation mass/energy tests before exposing any flow vectors or cavities.
4. Strengthen thermal process history and event traceability, preserving deposition and dwell timing. Local track defects must remain unresolved where only aggregate extents exist.
5. Improve the existing panel, not add decorative dashboards: engineering summary, auditable balances, persistent jobs, explicit mode scope, resource estimates, evidence and artifacts. Gate: lint/build, API, browser states.

Each completed change set records proof and operational status, then commits only task files. Final delivery explicitly distinguishes delivered thermal capability from unresolved research phases.

Scientific basis: [OpenFOAM Foundation 14](https://openfoam.org/version/14/), [NIST model uncertainty](https://www.nist.gov/publications/identifying-uncertainty-laser-powder-bed-fusion-models), and the enthalpy references already recorded in LPBF_ENGINEERING.md. No new experimental measurements are introduced.

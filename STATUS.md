# Metalliksa current status

**Snapshot: 27 September 2026**

## Product state

Metalliksa is a research engineering workstation. LPBF is the current core product focus; the application also contains specialist materials and characterization workspaces at different maturity levels. Research or preview availability is not production qualification.

The active engineering objective is to complete the shared LPBF material/process identity and a reproducible run-evidence path, then verify the same workflow across CPU, PyTorch CUDA, and Warp CUDA. Work in the shared local checkout may not yet be merged to `main`; this snapshot is not a release statement.

## Evidence and open gates

- Selected same-input CPU/Torch and CPU/Warp parity checks pass. They establish only the cases and metrics recorded in [PROOF.md](PROOF.md).
- The current three-repeat GPU pilot reports a Warp/Torch median ratio of 1.294x and a Torch CPU/CUDA ratio of 1.019x. Device-kernel timing is not available; the evidence does not justify a default-backend change or a general speedup claim.
- The frozen fine-grid/time convergence result remains inconclusive. Its acceptance limits are unchanged.
- The IN718 comparison remains unvalidated. IN625 remains screening-only because source-backed properties, uncertainty, and model applicability are incomplete.
- Run capture and archive workflows have bounded passing checks, but the full identity-preserving API and browser export/restore path still has open integration and acceptance work.
- No production-release, standards-compliance, or independent experimental-validation claim is established by these checks.

## Next work

Complete the Warp v2 run-identity and archive integration without changing the established Torch v1 contract. Then check same-run API/browser export and isolated restore, retain the open convergence and experiment gates, and profile matched backends before proposing performance changes.

Use [ROADMAP.md](ROADMAP.md) for priorities, [docs/ACTIVE_WORK.md](docs/ACTIVE_WORK.md) for current coordination, and [the documentation map](docs/README.md) for canonical and historical records. Dated measurements and command-level evidence belong in [PROOF.md](PROOF.md) and [sonkayıtlar/LOG.md](sonkayıtlar/LOG.md); this file is a short snapshot, not a second event log.

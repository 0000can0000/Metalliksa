# Metalliksa documentation map

Use this page to find the maintained product documents. ROADMAP.md is the
single product direction; STATUS.md is the short current snapshot; dated
proofs and logs preserve evidence and history. The generated graft/ tree is
not user-facing documentation.

## Product and venture

- [Project README](../README.md) — setup, principal checks, and entry points.
- [Product overview](PRODUCT_OVERVIEW.md) — goal, intended users, current value,
  maturity, and evidence boundaries.
- [Product roadmap](../ROADMAP.md) — current priorities and exit conditions.
- [HANGAR BİGG application draft](HANGAR_BIGG_BASVURU_TASLAGI.md) — internal
  venture draft; market and customer claims remain hypotheses until validated.
- [Research workstation](RESEARCH_WORKSTATION.md) — workspaces, shared state,
  research registry, and evidence behavior.
- [LPBF engineering](LPBF_ENGINEERING.md) — current model, execution modes,
  verification, and scientific limits.
- [Scientific research vision](SCIENTIFIC_RESEARCH_VISION.md) — candidate
  questions, not committed product scope.

## Engineering contracts

- [Shared LPBF core contract](LPBF_SHARED_CORE_CONTRACT.md) — material,
  process, solver, backend, and result identity rules.
- [LPBF run archive](LPBF_RUN_ARCHIVE.md) — immutable run capture and recovery.
- [LPBF source archive](LPBF_SOURCE_ARCHIVE.md) — reviewed source bytes and
  provenance.
- [SQLite decision record](ADR_LPBF_SQLITE_2026-09-21.md) — metadata storage
  choice and trade-offs.
- [Peak extraction contract](LPBF_PEAK_EXTRACTION.md) — accepted-step melt
  maximum semantics.
- [Integration constraints](LPBF_INTEGRATION_CONSTRAINTS.md) — boundaries for
  changes crossing UI, API, worker, and solver.
- [Uncertainty evidence](UQ_EVIDENCE.md) — what current uncertainty screens do
  and do not establish.

## Reproduction and evidence

- [Clean application reproduction](APPLICATION_REPRODUCTION.md) — locked Node
  install, application checks, and interpreter selection.
- [CPU LPBF reproduction](LPBF_CPU_REPRODUCTION.md) — bounded CPU dependencies
  and regression commands.
- [Scientific/CUDA environment reproduction](SCIENTIFIC_ENVIRONMENT_REPRODUCTION.md) —
  hash-locked workstation environment and its verified scope.
- [Proof log](../PROOF.md) — dated, bounded software and numerical evidence;
  not a release certificate.
- [Session log](../sonkayıtlar/LOG.md) — operational changes, newest first.
- [Current status](../STATUS.md) and [active work](ACTIVE_WORK.md) — short
  status and current coordination.

## Governance

- [Agent instructions](../AGENTS.md) and [project rules](../RULES.md) —
  collaboration and validation rules.
- [Data schema](../SCHEMA.md) — persistence and qualification contracts.
- [Standards handbook](../STANDARDS.md) — reference and applicability limits.
- [Process protocols](../PROCESS_PROTOCOLS.md) — operational procedures.
- [Glossary](../GLOSSARY.md) — shared terminology.
- [Knowledge base](../KNOWLEDGE.md) — domain concepts and reference equations.

## Historical records

- [Archived records](archive/) — superseded plans, dated audits, and
  environment/module snapshots. Use these for provenance, not current status.

### Maintenance

Keep one canonical document for each current topic. Move dated audits and
superseded plans to the archive; remove implementation checklists when their
decisions and results are already represented in PROOF.md and Git history.
Never edit historical proof or operational log entries to make current status
look cleaner.

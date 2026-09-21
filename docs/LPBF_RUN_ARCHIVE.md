# LPBF immutable run archive

First implementation is an internal capture/import boundary, not an HTTP or UI
feature and not a replacement job queue. Existing Queue owns execution. Its
`capture` RPC accepts only a completed job ID; Python rechecks the result's
core contract and thermal evidence, then every file in the complete output
manifest. Nested OpenFOAM files, peak-field.npz and empty files are supported;
public artifact download remains narrowly allowlisted.

Capture preserves exact result JSON bytes, Python compact sorted input/material
JSON and explicit `core-v1-bound` or `legacy-unbound` status. Node hashes those
exact Python strings and compares the parsed snapshots to the result. It never
assumes JSON.stringify preserves Python float spelling. These are consistency
checks, not signatures. Old records receive no invented identity or runtime.
New worker execution records executable, Python, platform and NumPy versions in
provenance; requested backend and executed model/backend remain separate.
Existing implementationHash is retained verbatim and still includes input and
material; it is not described as a source-only hash.

`LpbfRunRepository` stores immutable run IDs (the original worker job ID),
detached snapshots and exact `{datasetId, revision, documentSha256}` links.
`save` is a metadata-only boundary. `dryRunRunImport` verifies the source revision,
full local manifest, result file and every output byte without publishing.
`importRun` repeats those checks, copies through LpbfArtifactStore, verifies all
stored bytes and publishes metadata last. Existing IDs conflict rather than
overwrite. Failed imports may leave reusable, unreferenced verified objects.
Historical source revisions remain valid after the source's current revision
advances. Source science remains `unreviewed-source-archive`; source references
alone do not claim that source payloads were verified or copied into this store.

Roots are trusted server-only configuration. No HTTP filesystem path is accepted.
Directories are application-owned; hostile concurrent filesystem writers are
outside this portable filesystem isolation boundary. No automatic deletion or
live migration. Metadata backup opens in a new directory, with SQLite DELETE
journal mode, and explicitly excludes artifact bytes and source repositories.
Full run+source bundle, restore API and history UI are the next persistence gates.

## Verification, 2026-09-21

- Python capture5 and core identity8 passed; capture includes a real Queue
  subprocess, rejection of incomplete jobs, full nested/empty manifest and drift.
- Node run7 + artifact6 + source import4 + source bundle4 =21 passed after the
  result-file drift fix. Earlier combined run/source/contract suite27 passed
  before that additional regression. Strict targeted TypeScript passed.
- Real40W reference worker capture:66files/322352bytes, model backend
  numpy-reference, Python3.12.10/NumPy2.2.6. Immutable import and independent
  metadata restore preserved the document hash; peak2119.810114K, W/D40/40um.
  Report `.runtime/phase0-audit/capture-pilot-01a0c383/report.json`.
- No numerical equations changed; no convergence or experimental qualification
  is claimed. Phase0 remains OPEN. External edits are preserved, not included.
- Current lint/build passed (30.46s; existing large chunk warning). Full unit
 151PASS/4FAIL: eis-unavailable and three UQ modules fail in external changes.

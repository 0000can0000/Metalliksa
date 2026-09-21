# LPBF source archive storage

The server storage modules preserve source metadata and original files separately.
They do not yet replace the live application store or include simulation runs.

- `LpbfArtifactStore`: streams files through SHA256/size verification using a 1 MiB
  buffer. Objects live at `objects/<first-two-hash-characters>/<sha256>`. Private
  staging copies are flushed before exclusive hard-link publication. Input files
  are copied, never hard-linked. Existing objects are verified, never replaced.
- `dryRunSourceImport`: validates a detached metadata document and every local
  file without creating revisions or objects. Paths cannot traverse parents,
  junctions/symlinks, Windows devices, or alternate data streams.
- `importSource`: runs that validation again, stores every file, rechecks stored
  objects, then publishes an expected-revision-guarded SQLite revision. A failed
  late operation may leave verified unreferenced objects, never a partial revision.
- `backupSourceBundle`: captures SQLite first, copies all objects referenced by
  every historical revision, then writes the completion manifest. Backup SQLite
  uses DELETE journal mode, independent of WAL/SHM. Only new destinations work.
- `verifySourceBundle` and `restoreSourceBundle`: reject malformed, incomplete,
  corrupt, or sidecar-dependent bundles; restore validates before creating a new
  destination and rechecks copied bytes. Failed destinations are preserved for
  inspection, never recursively removed. Read-only inspection does not initialize
  a database or create artifact directories.

Bundle layout: `metadata.sqlite`, `artifacts/objects/...`, `bundle.json`.
The manifest hashes metadata; metadata hashes every artifact. This is accidental
corruption detection, not publisher authentication or a signature. Application
ownership/permissions must exclude hostile concurrent filesystem writers; portable
Node path checks do not provide an OS-level sandbox against that adversary.
Application immutability means the API never overwrites objects; external file
edits remain possible and are detected by verification. No automatic garbage
collection or legacy migration is implemented.

Metadata reads retain `artifactIntegrity: not-verified`. Successful import reports
`verified-at-import` separately, and dry-run reports `verified-at-dry-run`; neither
is a permanent guarantee about future bytes. Scientific evidence always remains
`unreviewed-source-archive`. Source terms, null units, missing reasons and process
scope survive the round trip unchanged.

## Verified local pilot, 2026-09-21

Node24.20.0; `nist-mds2-2716` IN718 archive: three files,550398609 bytes.
Dry-run, import, independent backup, verification and restore PASS. Portable pilot:
`.runtime/lpbf-source-archive-portable-01a0c349/report.json`; reproducible local driver:
`.runtime/lpbf-source-archive-pilot-01a0c349.ts` (pass a new destination as argv2).
Document SHA256 `cbf30982263b00f485f5380de0b0bf2293d73807a14159e14a4aaa470400be75`.
Final backup contains no SQLite sidecars. Full unit156PASS; strict server/new-test
TypeScript PASS. Regressions cover corruption, concurrent duplicate publication,
multi-chunk binary copy, junction escapes, import failure, immutable history,
independent restore, existing-destination refusal and SQLite sidecars.

Raw camera signal remains uncalibrated; HDF5 attributes/measurement review is open.
No thermal/powder-bed validation or phase acceptance follows from this pilot.

# LPBF metadata storage — SQLite driver decision

Status: accepted for the local implementation; migration is not enabled.
Evidence date: 2026-09-21. Application baseline: 2a118ee.

Use Node's built-in `node:sqlite`, with `DatabaseSync` for short metadata
transactions and `backup` for snapshots. The tested runtime is Node v24.20.0 on
Windows. No package installation or lockfile change was needed. CI/deployment
must run the compatibility test on the exact selected Node runtime; this record
does not establish support for older Node versions. Upstream API status varies
by release, so do not infer v24 support from the current v26 documentation.

The Node service owns application metadata writes. Python's existing queue.sqlite
remains an execution queue; solvers do not write into the application database.
Use foreign keys, STRICT tables, WAL, synchronous FULL, bounded busy timeout and
explicit BEGIN IMMEDIATE / COMMIT / ROLLBACK. Keep filesystem hashing and solver
execution outside transactions. Synchronous metadata calls must remain bounded;
move larger work to a worker thread if measured latency requires it.

Use immutable source/dataset/material revisions and optimistic revision checks.
A stale expected revision is a conflict, never an overwrite. Missing values carry
an explicit reason; SQL checks must guard IS NOT NULL because a NULL-valued CHECK
expression does not reject a row. Neither a valid schema nor a hash promotes
unreviewed source material to experimental validation.

The trial `tests/lpbf-sqlite-compatibility.test.ts` uses only temporary synthetic
databases. All3 tests passed with these observed contracts:

- A failed foreign-key insert rolls back the preceding source insert.
- A stale compare-and-swap writes zero rows; null and zero remain distinct.
- A concurrent connection sees committed rows and cannot write while another
  connection owns a write transaction; writing succeeds after commit.
- Online backup captures committed WAL data. A separately opened read-only
  backup passes integrity_check/foreign_key_check, retains revision1 and zero,
  while the live database subsequently advances to revision2.

First trial exposed the NULL-check issue; the explicit guard fixed it. This is
driver/schema compatibility evidence, not a production persistence acceptance.
Power loss, disk-full injection, corrupt backup, hostile input, large metadata,
schema upgrade rollback and application migration remain to be tested.

Backups must target a newly reserved directory/file, never overwrite a user file.
The production backup will include a database snapshot and immutable artifact
manifest; verify artifact hashes and open the restored database before switching
the active path. Do not copy a live SQLite main file alone. Preserve the original
storage and legacy registry during dry-run imports and recovery.

Next implementation: versioned schema and repository → content-addressed artifact
store → dry-run legacy import → backup/restore bundle → API integration. Existing
research registry identity/history/conflict semantics must survive migration;
this ADR does not replace or migrate that registry.

Primary references: [Node SQLite API](https://nodejs.org/api/sqlite.html),
[SQLite transactions](https://sqlite.org/lang_transaction.html),
[online backup API](https://sqlite.org/backup.html). Runtime experiments above are
the direct evidence for the locally selected Node version.

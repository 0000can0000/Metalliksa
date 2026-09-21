/** Phase 0 driver experiment. Synthetic records; never touches application data. */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { test, type TestContext } from 'node:test';

function openDatabase(filename: string) {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=50;');
  return db;
}

function fixture(t: TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), 'metalliksa-sqlite-trial-'));
  const filename = path.join(directory, 'metadata.sqlite');
  const db = openDatabase(filename);
  const connections = [db];
  t.after(() => {
    for (const connection of connections.reverse()) connection.close();
    rmSync(directory, { recursive: true, force: true });
  });
  db.exec(`
    CREATE TABLE sources(id TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision > 0),
      citation TEXT NOT NULL) STRICT;
    CREATE TABLE observations(id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id),
      value_si REAL, missing_reason TEXT,
      CHECK ((value_si IS NULL AND missing_reason IS NOT NULL AND length(trim(missing_reason)) > 0) OR
             (value_si IS NOT NULL AND missing_reason IS NULL))) STRICT;
  `);
  return { directory, filename, db, connections };
}

test('SQLite trial: failed linked write rolls back and revision CAS rejects a stale writer', t => {
  const { db } = fixture(t);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO sources VALUES (?, ?, ?)').run('source', 1, 'Synthetic trial');
    db.prepare('INSERT INTO observations VALUES (?, ?, ?, ?)').run('bad', 'missing-source', 1, null);
    assert.fail('Foreign key violation was accepted');
  } catch (error) {
    db.exec('ROLLBACK');
    assert.match(String(error), /FOREIGN KEY/);
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM sources').get()!.n, 0);
  db.prepare('INSERT INTO sources VALUES (?, ?, ?)').run('source', 1, 'Synthetic trial');
  const update = db.prepare('UPDATE sources SET revision=revision+1 WHERE id=? AND revision=?');
  assert.equal(update.run('source', 1).changes, 1);
  assert.equal(update.run('source', 1).changes, 0);
  db.prepare('INSERT INTO observations VALUES (?, ?, ?, ?)').run('unknown', 'source', null, 'Not measured');
  assert.equal(db.prepare('SELECT value_si FROM observations').get()!.value_si, null);
  assert.throws(() => db.prepare('INSERT INTO observations VALUES (?, ?, ?, ?)').run('invalid', 'source', null, null), /CHECK/);
});

test('SQLite trial: a second connection cannot write through an active transaction', t => {
  const { db, filename, connections } = fixture(t);
  const other = openDatabase(filename);
  connections.push(other);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO sources VALUES (?, ?, ?)').run('first', 1, 'Synthetic trial');
    assert.equal(other.prepare('SELECT count(*) AS n FROM sources').get()!.n, 0);
    assert.throws(() => other.prepare('INSERT INTO sources VALUES (?, ?, ?)').run('second', 1, 'Synthetic trial'), /locked/);
  } finally { db.exec('COMMIT'); }
  assert.equal(other.prepare('SELECT count(*) AS n FROM sources').get()!.n, 1);
  other.prepare('INSERT INTO sources VALUES (?, ?, ?)').run('second', 1, 'Synthetic trial');
});

test('SQLite trial: online backup restores committed WAL state and excludes later writes', async t => {
  const { db, directory, connections } = fixture(t);
  db.prepare('INSERT INTO sources VALUES (?, ?, ?)').run('source', 1, 'Synthetic trial');
  db.prepare('INSERT INTO observations VALUES (?, ?, ?, ?)').run('zero', 'source', 0, null);
  const filename = path.join(directory, 'backup.sqlite');
  await backup(db, filename);
  db.prepare('UPDATE sources SET revision=2 WHERE id=?').run('source');
  const restored = new DatabaseSync(filename, { readOnly: true });
  connections.push(restored);
  assert.equal(restored.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(restored.prepare('SELECT revision FROM sources').get()!.revision, 1);
  assert.equal(restored.prepare('SELECT value_si FROM observations').get()!.value_si, 0);
  assert.equal(db.prepare('SELECT revision FROM sources').get()!.revision, 2);
});

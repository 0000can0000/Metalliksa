import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { LpbfSourceRepository, type LpbfSourceDocument } from '../server/lpbfSourceRepository';
import { LpbfArtifactStore } from '../server/lpbfArtifactStore';
import { importSource } from '../server/lpbfSourceImport';
import { backupSourceBundle, restoreSourceBundle, verifySourceBundle } from '../server/lpbfSourceBundle';

async function fixture(t: TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), 'lpbf-bundle-'));
  const source = path.join(directory, 'input'); mkdirSync(source); writeFileSync(path.join(source, 'file'), 'abc');
  const repository = new LpbfSourceRepository(path.join(directory, 'live.sqlite'));
  const store = new LpbfArtifactStore(path.join(directory, 'objects'));
  const document: LpbfSourceDocument = { schemaVersion: 1, datasetId: 'synthetic', materialId: 'in718', processScope: 'bare-plate',
    source: { url: 'https://example.org/data', citation: 'Synthetic', version: '1', terms: 'Test', termsMissingReason: null },
    artifacts: [{ relativePath: 'file', byteSize: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', sourceUrl: 'https://example.org/data' }],
    sourceContext: { conversion: null } };
  t.after(() => { repository.close(); rmSync(directory, { recursive: true, force: true }); });
  await importSource(repository, store, document, source, 0);
  document.source.version = '2'; await importSource(repository, store, document, source, 1);
  return { directory, repository, store, document };
}

test('bundle restores all immutable revisions and independent bytes into a new directory', async t => {
  const f = await fixture(t);
  const bundle = path.join(f.directory, 'backup');
  const result = await backupSourceBundle(f.repository, f.store, bundle);
  assert.equal(result.artifactCount, 1);
  assert.equal(result.revisionCount, 2);
  const live = await f.store.verify(f.document.artifacts[0]); writeFileSync(live.path, 'bad');
  const restored = path.join(f.directory, 'restored');
  await restoreSourceBundle(bundle, restored);
  const repository = new LpbfSourceRepository(path.join(restored, 'metadata.sqlite'), { readOnly: true });
  try {
    assert.deepEqual(repository.history('synthetic').map(item => item.revision), [1, 2]);
    assert.equal(repository.revision('synthetic', 1)!.document.source.version, '1');
    assert.equal(repository.current('synthetic')!.document.sourceContext!.conversion, null);
  } finally { repository.close(); }
  const bytes = await new LpbfArtifactStore(path.join(restored, 'artifacts')).verify(f.document.artifacts[0]);
  assert.equal(readFileSync(bytes.path, 'utf8'), 'abc');
  await assert.rejects(restoreSourceBundle(bundle, restored), /exist/i);
});

test('missing or corrupt bundle bytes prevent restore before destination is created', async t => {
  const f = await fixture(t);
  const bundle = path.join(f.directory, 'backup'); await backupSourceBundle(f.repository, f.store, bundle);
  const object = await new LpbfArtifactStore(path.join(bundle, 'artifacts')).verify(f.document.artifacts[0]);
  writeFileSync(object.path, 'bad');
  const destination = path.join(f.directory, 'restored');
  await assert.rejects(restoreSourceBundle(bundle, destination), /integrity/i);
  assert.equal(existsSync(destination), false);
});

test('metadata corruption and incomplete backup cannot be opened as a valid bundle', async t => {
  const f = await fixture(t);
  const bundle = path.join(f.directory, 'backup'); await backupSourceBundle(f.repository, f.store, bundle);
  writeFileSync(path.join(bundle, 'metadata.sqlite'), 'broken');
  await assert.rejects(verifySourceBundle(bundle), /integrity/i);
  const object = await f.store.verify(f.document.artifacts[0]); writeFileSync(object.path, 'bad');
  const failed = path.join(f.directory, 'failed');
  await assert.rejects(backupSourceBundle(f.repository, f.store, failed), /integrity/i);
  assert.equal(existsSync(path.join(failed, 'bundle.json')), false);
  await assert.rejects(verifySourceBundle(failed));
});

test('a bundle cannot acquire unchecksummed SQLite sidecar state', async t => {
  const f = await fixture(t);
  const bundle = path.join(f.directory, 'backup'); await backupSourceBundle(f.repository, f.store, bundle);
  assert.equal(existsSync(path.join(bundle, 'metadata.sqlite-wal')), false);
  assert.equal(existsSync(path.join(bundle, 'metadata.sqlite-shm')), false);
  writeFileSync(path.join(bundle, 'metadata.sqlite-wal'), 'unchecksummed state');
  await assert.rejects(verifySourceBundle(bundle), /sidecar/i);
});

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { LpbfSourceRepository, type LpbfSourceDocument } from '../server/lpbfSourceRepository';
import { LpbfArtifactStore } from '../server/lpbfArtifactStore';
import { dryRunSourceImport, importSource } from '../server/lpbfSourceImport';

function fixture(t: TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), 'lpbf-import-'));
  const input = path.join(directory, 'input'); mkdirSync(input);
  writeFileSync(path.join(input, 'one'), 'abc'); writeFileSync(path.join(input, 'two'), 'abc');
  const repository = new LpbfSourceRepository(path.join(directory, 'metadata.sqlite'));
  const artifacts = new LpbfArtifactStore(path.join(directory, 'artifacts'));
  t.after(() => { repository.close(); rmSync(directory, { recursive: true, force: true }); });
  const document: LpbfSourceDocument = {
    schemaVersion: 1, datasetId: 'test-archive', materialId: 'in718', processScope: 'bare-plate',
    source: { url: 'https://example.org/data', citation: 'Synthetic test', version: '1', terms: null, termsMissingReason: 'Unknown' },
    artifacts: ['one', 'two'].map(relativePath => ({ relativePath, byteSize: 3,
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', sourceUrl: 'https://example.org/data' })),
    sourceContext: { temperature_conversion: null, thermal_validation_ready: false },
  };
  return { directory, input, repository, artifacts, document };
}

test('dry run validates all bytes without publishing metadata or objects', async t => {
  const f = fixture(t);
  const result = await dryRunSourceImport(f.document, f.input);
  assert.equal(result.artifactCount, 2);
  assert.equal(result.byteSize, 6);
  assert.equal(result.evidenceStatus, 'unreviewed-source-archive');
  assert.equal(f.repository.current(f.document.datasetId), null);
  assert.deepEqual(readdirSync(path.join(f.artifacts.root, 'objects')), []);
});

test('a corrupt last input prevents metadata publication and a prior dry run is not trusted', async t => {
  const f = fixture(t);
  await dryRunSourceImport(f.document, f.input);
  writeFileSync(path.join(f.input, 'two'), 'bad');
  await assert.rejects(importSource(f.repository, f.artifacts, f.document, f.input, 0), /integrity/i);
  assert.equal(f.repository.current(f.document.datasetId), null);
  assert.deepEqual(readdirSync(path.join(f.artifacts.root, 'objects')), []);
});

test('successful import retains nulls and source evidence while checking stored bytes', async t => {
  const f = fixture(t);
  const result = await importSource(f.repository, f.artifacts, f.document, f.input, 0);
  assert.equal(result.revision.revision, 1);
  assert.equal(result.artifactIntegrity, 'verified-at-import');
  assert.equal(result.revision.evidenceStatus, 'unreviewed-source-archive');
  assert.equal(result.revision.artifactIntegrity, 'not-verified'); // metadata alone never claims current byte integrity
  assert.equal(result.revision.document.sourceContext!.temperature_conversion, null);
  for (const ref of f.document.artifacts) await f.artifacts.verify(ref);
  await assert.rejects(importSource(f.repository, f.artifacts, f.document, f.input, 0), /conflict/i);
  assert.equal(f.repository.history(f.document.datasetId).length, 1);
});

test('invalid metadata is rejected before any file is stored', async t => {
  const f = fixture(t);
  await assert.rejects(importSource(f.repository, f.artifacts, { ...f.document, materialId: 'unknown' }, f.input, 0));
  assert.deepEqual(readdirSync(path.join(f.artifacts.root, 'objects')), []);
  assert.equal(f.repository.current(f.document.datasetId), null);
});

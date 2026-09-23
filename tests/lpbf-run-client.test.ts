import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRun, importRun, listRuns, previewRun } from '../src/services/lpbfRunArchiveClient';

const jobId = 'a'.repeat(32);
const hash = 'b'.repeat(64);
const capture = { schemaVersion: 1, jobId,
  resultJson: JSON.stringify({ settings: { power: 200 }, material: { id: 'in718' }, artifacts: [] }),
  inputJson: JSON.stringify({ power: 200 }), materialJson: JSON.stringify({ id: 'in718' }),
  contractStatus: 'legacy-unbound' } as const;
const document = { schemaVersion: 1, runId: jobId, capture, sources: [] } as const;
const source = { datasetId: 'source-1', revision: 1, documentSha256: 'c'.repeat(64) };
const boundDocument = { ...document, sources: [source] };
const record = { document, documentSha256: hash, createdAt: '2026-09-23T00:00:00Z',
  evidenceStatus: 'unvalidated-model', sourceBindingStatus: 'legacy-unlinked' } as const;
const signal = new AbortController().signal;

function respond(t: any, body: unknown) {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body)));
}

test('run endpoints accept the server capture identity and unvalidated model status', async t => {
  respond(t, record);
  assert.deepEqual(await getRun(jobId, signal), record);
});

test('run client rejects stale document identity', async t => {
  respond(t, { ...record, document: { ...document, capture: { ...capture, jobId: 'c'.repeat(32) } } });
  await assert.rejects(getRun(jobId, signal), /invalid/i);
});

test('run client rejects a claimed validation status', async t => {
  respond(t, { ...record, evidenceStatus: 'experimentally-validated' });
  await assert.rejects(getRun(jobId, signal), /invalid/i);
});

test('run client rejects a source binding status inconsistent with its document', async t => {
  respond(t, { ...record, sourceBindingStatus: 'exact-revision-bound' });
  await assert.rejects(getRun(jobId, signal), /invalid/i);
});

test('run list accepts current server rows', async t => {
  respond(t, [{ runId: jobId, createdAt: record.createdAt, evidenceStatus: record.evidenceStatus,
    sourceBindingStatus: record.sourceBindingStatus }]);
  assert.equal((await listRuns(signal))[0].runId, jobId);
});

test('run list requires the server evidence status', async t => {
  respond(t, [{ runId: jobId, createdAt: record.createdAt, evidenceStatus: 'unreviewed-run-archive',
    sourceBindingStatus: record.sourceBindingStatus }]);
  await assert.rejects(listRuns(signal), /invalid/i);
});

test('run list requires a recognized source binding status', async t => {
  respond(t, [{ runId: jobId, createdAt: record.createdAt, evidenceStatus: record.evidenceStatus,
    sourceBindingStatus: 'unspecified' }]);
  await assert.rejects(listRuns(signal), /invalid/i);
});

test('preview and import match the requested job and archive contract', async t => {
  respond(t, { document: boundDocument, artifactCount: 0, byteSize: 0, artifactIntegrity: 'verified-at-dry-run',
    sourceBindingStatus: 'exact-revision-bound',
    quota: { totalArchiveSizeBytes: 0, maxArchiveSizeBytes: 100, approachingLimit: false } });
  assert.equal((await previewRun(jobId, [source], signal)).sourceBindingStatus, 'exact-revision-bound');
  t.mock.restoreAll();
  respond(t, { ...record, document: boundDocument, sourceBindingStatus: 'exact-revision-bound' });
  assert.equal((await importRun(jobId, [source], signal)).document.capture.jobId, jobId);
});

test('import cannot report success for a different job', async t => {
  respond(t, { ...record, document: { ...document, runId: 'c'.repeat(32), capture: { ...capture, jobId: 'c'.repeat(32) } } });
  await assert.rejects(importRun(jobId, [], signal), /invalid/i);
});

test('preview rejects a response bound to another source revision', async t => {
  respond(t, { document: boundDocument, artifactCount: 0, byteSize: 0,
    artifactIntegrity: 'verified-at-dry-run', sourceBindingStatus: 'exact-revision-bound',
    quota: { totalArchiveSizeBytes: 0, maxArchiveSizeBytes: 100, approachingLimit: false } });
  await assert.rejects(previewRun(jobId, [{ ...source, revision: 2 }], signal), /invalid/i);
});

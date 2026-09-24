import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { createLpbfRunsRouter } from '../routes/lpbfRuns';
import { LpbfArtifactStore } from '../server/lpbfArtifactStore';
import { LpbfRunArchiveService } from '../server/lpbfRunArchiveService';
import { LpbfRunRepository } from '../server/lpbfRunRepository';
import { LpbfSourceRepository } from '../server/lpbfSourceRepository';
import { lpbfWorker } from '../server/lpbfWorkerBridge';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const jobId = 'a'.repeat(32);

test('run HTTP archive resolves exact source and preserves analytical screening classification', async t => {
  const root = mkdtempSync(path.join(tmpdir(), 'lpbf-run-api-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, 'sources'), runRoot = path.join(root, 'runs');
  mkdirSync(sourceRoot);
  const sourceRepo = new LpbfSourceRepository(path.join(sourceRoot, 'metadata.sqlite'));
  const raw = path.join(root, 'raw'); mkdirSync(raw); writeFileSync(path.join(raw, 'raw.bin'), 'raw');
  const artifact = { relativePath: 'raw.bin', sha256: sha('raw'), byteSize: 3, sourceUrl: 'https://example.org/raw' };
  const source = { schemaVersion: 1, datasetId: 'synthetic', materialId: 'in718', processScope: 'unknown',
    source: { url: 'https://example.org/source', citation: 'Synthetic test only', version: '1', terms: null, termsMissingReason: 'Unknown' },
    artifacts: [artifact], sourceContext: null };
  const sourceStore = new LpbfArtifactStore(path.join(sourceRoot, 'artifacts'));
  await sourceStore.putFile(raw, 'raw.bin', artifact);
  const revision1 = sourceRepo.save(source, 0);
  source.source.version = '2'; sourceRepo.save(source, 1);
  sourceRepo.close();

  const job = path.join(root, 'job'); mkdirSync(job);
  writeFileSync(path.join(job, 'field.bin'), 'abc');
  const result = { schemaVersion: 1, runKind: 'analytical-screening', requestedMode: 'screening', effectiveMode: 'screening',
    fallbackReason: null, validationStatus: 'unvalidated', productionReady: false, confidence: 'low',
    settings: { backend: 'auto', mode: 'screening', power_W: 0 }, resolvedPhysics: { transient: false },
    solver: { id: 'synthetic-contract-test', version: '1' },
    material: { name: 'Synthetic', quality: 'synthetic', source: 'Unit test only' },
    label: 'Screening', regime: 'test', mainRisk: 'test', recommendation: 'test', riskScope: 'test',
    metrics: { width_um: 0, depth_um: 0, length_um: 0 }, assumptions: ['Synthetic only'],
    analyticalComparison: { goldak: { width_um: 0, depth_um: 0, length_um: 0 } },
    provenance: { executionRuntime: null },
    artifacts: [{ path: 'field.bin', size_bytes: 3, sha256: sha('abc') }] };
  const capture = { schemaVersion: 1, jobId, resultJson: JSON.stringify(result),
    inputJson: JSON.stringify(result.settings), materialJson: JSON.stringify(result.material),
    contractStatus: 'legacy-unbound', runKind: 'analytical-screening' as const };
  writeFileSync(path.join(job, 'result.json'), capture.resultJson);
  let captured = 0;
  t.mock.method(lpbfWorker, 'captureForArchive', async () => { captured++; return { capture, root: job }; });

  const service = new LpbfRunArchiveService(runRoot, sourceRoot);
  const app = express(); app.use(createLpbfRunsRouter(service));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const endpoint = `http://127.0.0.1:${address.port}/api/lpbf/runs`;
  async function post(action: string, sources: unknown) {
    const response = await fetch(`${endpoint}/${action}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId, sources }) });
    return { status: response.status, body: await response.json() };
  }

  const empty = await post('preview', []);
  assert.equal(empty.status, 400); assert.match(empty.body.error, /source revision/i);
  assert.equal(captured, 0, 'bad selections fail before worker capture');
  const missing = await post('preview', [{ datasetId: 'synthetic', revision: 3 }]);
  assert.equal(missing.status, 404);
  const changed = await post('preview', [{ datasetId: 'synthetic', revision: 1, documentSha256: sha('stale') }]);
  assert.equal(changed.status, 409);
  const selected = [{ datasetId: 'synthetic', revision: 1, documentSha256: revision1.documentSha256 }];
  const preview = await post('preview', selected);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.document.capture.runKind, 'analytical-screening');
  assert.deepEqual(preview.body.document.sources, selected);
  assert.equal(preview.body.sourceBindingStatus, 'exact-revision-bound');
  const imported = await post('import', [{ datasetId: 'synthetic', revision: 1 }]);
  assert.equal(imported.status, 200);
  assert.equal(imported.body.runKind, 'analytical-screening');
  assert.deepEqual(imported.body.document.sources, selected);
  assert.equal(imported.body.sourceBindingStatus, 'exact-revision-bound');
  const record = await (await fetch(`${endpoint}/${jobId}`)).json();
  assert.equal(record.sourceBindingStatus, 'exact-revision-bound');
  assert.equal(record.evidenceStatus, 'unvalidated-model');
  const listed = await (await fetch(endpoint)).json();
  assert.equal(listed[0].sourceBindingStatus, 'exact-revision-bound');
  assert.equal(listed[0].runKind, 'analytical-screening');
  assert.equal((await (await fetch(`${endpoint}/${jobId}`)).json()).runKind, 'analytical-screening');

  const legacyId = 'b'.repeat(32);
  const legacyRepo = new LpbfRunRepository(path.join(runRoot, 'runs.sqlite'));
  try { legacyRepo.save({ schemaVersion: 1, runId: legacyId,
    capture: { ...capture, jobId: legacyId }, sources: [] }); }
  finally { legacyRepo.close(); }
  const legacy = await (await fetch(`${endpoint}/${legacyId}`)).json();
  assert.equal(legacy.sourceBindingStatus, 'legacy-unlinked');
  assert.equal(legacy.evidenceStatus, 'unvalidated-model');

  writeFileSync((await sourceStore.verify(artifact)).path, 'bad');
  const invalidBytes = await post('preview', selected);
  assert.equal(invalidBytes.status, 409); assert.match(invalidBytes.body.error, /artifact bytes/i);
});

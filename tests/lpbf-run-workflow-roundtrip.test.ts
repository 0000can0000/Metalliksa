import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import { createLpbfRunsRouter } from '../routes/lpbfRuns';
import { LpbfArtifactStore } from '../server/lpbfArtifactStore';
import { LpbfNistComparisonService } from '../server/lpbfNistComparisonService';
import { LpbfRunArchiveService } from '../server/lpbfRunArchiveService';
import { LpbfRunBundleService } from '../server/lpbfRunBundleService';
import { LpbfRunRepository } from '../server/lpbfRunRepository';
import { LpbfSourceArchiveService } from '../server/lpbfSourceArchiveService';
import { LpbfSourceRepository } from '../server/lpbfSourceRepository';
import { nistOpticalTable4CatalogEntry } from '../server/lpbfSourceCatalog';
import { lpbfWorker } from '../server/lpbfWorkerBridge';

const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

async function jsonRequest(base: string, suffix: string, method: 'GET' | 'POST' = 'GET', body?: unknown) {
  const response = await fetch(`${base}${suffix}`, {
    method,
    ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) } : {}),
  });
  const text = await response.text();
  let payload: any;
  try { payload = JSON.parse(text); }
  catch { throw new Error(`${method} ${suffix} returned non-JSON HTTP ${response.status}: ${text.slice(0, 160)}`); }
  return { status: response.status, payload };
}

test('LPBF source select, CPU compute, unvalidated compare, export and restore preserve identities and bytes', async t => {
  const root = mkdtempSync(path.join(process.cwd(), '.tmp-lpbf-workflow-roundtrip-'));
  const prior = {
    jobRoot: process.env.METALLIKSA_JOB_ROOT,
  };
  const sourceRoot = path.join(root, 'sources');
  const runRoot = path.join(root, 'runs');
  const bundleRoot = path.join(root, 'bundles');
  let server: Server | undefined;
  process.env.METALLIKSA_JOB_ROOT = path.join(root, 'jobs');
  t.after(async () => {
    const workerProcess = (lpbfWorker as unknown as { process?: NodeJS.EventEmitter & { kill(): boolean } }).process;
    const workerExit = workerProcess ? once(workerProcess, 'exit') : undefined;
    lpbfWorker.close();
    if (workerExit) await Promise.race([workerExit, new Promise(resolve => setTimeout(resolve, 3000))]);
    if (prior.jobRoot === undefined) delete process.env.METALLIKSA_JOB_ROOT;
    else process.env.METALLIKSA_JOB_ROOT = prior.jobRoot;
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const opticalSource = nistOpticalTable4CatalogEntry();
  const sources = new LpbfSourceArchiveService(sourceRoot, [opticalSource]);
  const selectedDataset = sources.catalog().sources.find(item => item.datasetId === opticalSource.datasetId);
  assert.ok(selectedDataset, 'the NIST optical source is selectable from the local catalog');
  const sourcePreview = await sources.preview(selectedDataset.datasetId);
  assert.equal(sourcePreview.artifactIntegrity, 'verified-at-dry-run');
  const importedSource = await sources.import(selectedDataset.datasetId,
    sourcePreview.expectedRevision, sourcePreview.documentSha256);
  const sourceLink = { datasetId: selectedDataset.datasetId,
    revision: importedSource.revision.revision, documentSha256: importedSource.revision.documentSha256 };
  assert.equal(sourceLink.revision, 1);

  const runs = new LpbfRunArchiveService(runRoot, sourceRoot);
  const bundles = new LpbfRunBundleService(runRoot, sourceRoot, bundleRoot);
  const comparison = new LpbfNistComparisonService(runRoot, sourceRoot);
  const app = express();
  app.use(createLpbfRunsRouter(runs, bundles, comparison));
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/lpbf/runs`;

  // This is a fresh, deterministic-size CPU transient solve. Its settings are a
  // numerical screening case and intentionally do not reproduce NIST Table 4.
  const submission = await lpbfWorker.request('submit', {
    mode: 'standard', backend: 'reference', material: 'Inconel 718', power_W: 40,
    mesh_um: 40, trackLength_um: 200, cooling_s: 0.0001, dwell_s: 0,
  }) as { id: string };
  assert.match(submission.id, /^[a-f0-9]{32}$/);
  let job: any;
  const deadline = Date.now() + 90_000;
  do {
    job = await lpbfWorker.request('get', submission.id);
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') break;
    await new Promise(resolve => setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  assert.equal(job.status, 'completed', job.error ?? `CPU thermal job remained ${job.status}`);
  assert.equal(job.result.runKind, 'transient-thermal');
  assert.equal(job.result.validationStatus, 'unvalidated');
  assert.equal(job.result.productionReady, false);
  assert.ok(job.result.thermalHistory?.length > 0, 'the CPU solver produced a thermal history');

  const selection = [{ ...sourceLink }];
  const previewResponse = await jsonRequest(base, '/preview', 'POST', { jobId: submission.id, sources: selection });
  assert.equal(previewResponse.status, 200, JSON.stringify(previewResponse.payload));
  assert.equal(previewResponse.payload.sourceBindingStatus, 'exact-revision-bound');
  assert.equal(previewResponse.payload.document.capture.contractStatus, 'core-v1-bound');
  assert.deepEqual(previewResponse.payload.document.sources, selection);
  const importResponse = await jsonRequest(base, '/import', 'POST', { jobId: submission.id, sources: selection });
  assert.equal(importResponse.status, 200, JSON.stringify(importResponse.payload));
  assert.deepEqual(importResponse.payload.document, previewResponse.payload.document);
  assert.match(importResponse.payload.documentSha256, /^[a-f0-9]{64}$/);

  const runId = importResponse.payload.document.runId as string;
  const selectedRun = await jsonRequest(base, `/${runId}`);
  assert.equal(selectedRun.status, 200);
  assert.equal(selectedRun.payload.sourceBindingStatus, 'exact-revision-bound');
  assert.equal(selectedRun.payload.evidenceStatus, 'unvalidated-model');
  assert.equal(selectedRun.payload.runKind, 'transient-thermal');

  const compared = await jsonRequest(base, `/${runId}/nist-comparison`, 'POST', { caseNumber: '0' });
  assert.equal(compared.status, 200, JSON.stringify(compared.payload));
  assert.equal(compared.payload.status, 'unavailable', 'the optical operator/process match is not implemented');
  assert.equal(compared.payload.validationStatus, 'unvalidated');
  assert.equal(compared.payload.errors, null);
  assert.ok(compared.payload.reasons.length > 0);

  const exported = await jsonRequest(base, '/bundles/export', 'POST');
  assert.equal(exported.status, 200, JSON.stringify(exported.payload));
  const bundleId = exported.payload.bundleId as string;
  assert.equal(exported.payload.manifest.runCount, 1);
  assert.equal(exported.payload.manifest.sourceLinkCount, 1);
  assert.equal((await jsonRequest(base, `/bundles/${bundleId}/verify`, 'POST')).payload.verified, true);
  const restored = await jsonRequest(base, `/bundles/${bundleId}/restore`, 'POST');
  assert.equal(restored.status, 200, JSON.stringify(restored.payload));
  assert.equal(restored.payload.verified, true);

  const restoredRoot = path.join(bundleRoot, 'restores', restored.payload.restoreId);
  const restoredRuns = new LpbfRunRepository(path.join(restoredRoot, 'runs.sqlite'), { readOnly: true });
  const restoredSources = new LpbfSourceRepository(path.join(restoredRoot, 'sources/metadata.sqlite'), { readOnly: true });
  try {
    const record = restoredRuns.get(runId);
    assert.ok(record);
    assert.equal(record.documentSha256, importResponse.payload.documentSha256);
    assert.deepEqual(record.document.sources, selection);
    const restoredSource = restoredSources.revision(sourceLink.datasetId, sourceLink.revision);
    assert.ok(restoredSource);
    assert.equal(restoredSource.documentSha256, sourceLink.documentSha256);
  } finally { restoredRuns.close(); restoredSources.close(); }

  const runArtifactRefs = JSON.parse(importResponse.payload.document.capture.resultJson).artifacts;
  const restoredRunStore = new LpbfArtifactStore(path.join(restoredRoot, 'artifacts'), { readOnly: true });
  for (const ref of runArtifactRefs) {
    const bytes = readFileSync((await restoredRunStore.verify({ sha256: ref.sha256, byteSize: ref.size_bytes })).path);
    assert.equal(sha256(bytes), ref.sha256);
    assert.equal(bytes.byteLength, ref.size_bytes);
  }
  const restoredSourceStore = new LpbfArtifactStore(path.join(restoredRoot, 'sources/artifacts'), { readOnly: true });
  const sourceArtifact = sourcePreview.document.artifacts[0];
  const sourceBytes = readFileSync((await restoredSourceStore.verify(sourceArtifact)).path);
  assert.equal(sha256(sourceBytes), sourceArtifact.sha256);
  assert.equal(sourceBytes.byteLength, sourceArtifact.byteSize);
});

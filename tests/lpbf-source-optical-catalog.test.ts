import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { createLpbfSourcesRouter } from '../routes/lpbfSources';
import { LpbfSourceArchiveService } from '../server/lpbfSourceArchiveService';
import { nistIn718CatalogEntry, nistOpticalTable4CatalogEntry, nistOpticalOfficialWorkbookCatalogEntry } from '../server/lpbfSourceCatalog';

const sourceRoot = path.resolve('data/benchmark/nist-amb2022-03-optical');
const datasetId = 'nist-amb2022-03-optical-table4-local-v1';
const artifact = 'table4-aggregate-v1.json';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

test('optical Table 4 catalog identifies local transcription, six-measurement SD and exact artifact bytes', () => {
  const manifest = JSON.parse(readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));
  const bytes = readFileSync(path.join(sourceRoot, artifact));
  assert.equal(manifest.files[0].bytes, bytes.length);
  assert.equal(manifest.files[0].sha256, sha(bytes));
  const data = JSON.parse(bytes.toString('utf8'));
  assert.equal(data.kind, 'local-transcription-of-published-aggregate-measurements');
  assert.equal(data.measurement.countPerCondition, 6);
  assert.deepEqual(data.cases.map((row: any) => [row.caseNumber, row.depthMean_um, row.depthStdDev_um,
    row.widthMean_um, row.widthStdDev_um]), [
    ['0', 139.7, 1.9, 136.3, 2.9], ['1.1', 227.2, 3.2, 106.2, 3.6],
    ['1.2', 102.4, 1.1, 141.7, 1.8], ['2.1', 109.7, 1.7, 112.9, 1.7],
    ['2.2', 176.5, 2.6, 156.1, 4.9], ['3.1', 166.1, 2.0, 134.3, 2.5],
    ['3.2', 116.9, 1.2, 129.4, 1.6],
  ]);
  const document = nistOpticalTable4CatalogEntry(sourceRoot).loadDocument() as any;
  assert.equal(document.datasetId, datasetId);
  assert.equal(document.source.terms, null);
  assert.match(document.source.termsMissingReason, /not established/i);
  assert.equal(document.sourceContext.transcription.publisher_raw_data, false);
  assert.equal(document.sourceContext.experiment.process_scope, 'bare-plate');
  assert.equal(document.sourceContext.experiment.scan_direction, '+X');
  assert.equal(document.sourceContext.experiment.track_length_mm, 10);
  assert.equal(document.sourceContext.measurement.beam_diameter_definition, 'D4sigma');
  assert.equal(document.artifacts[0].sha256, sha(bytes));
  assert.ok(new LpbfSourceArchiveService().catalog().sources.some(item => item.datasetId === datasetId));
  assert.equal(nistIn718CatalogEntry().datasetId, 'nist-mds2-2716');
});

test('optical catalog refuses changed transcription bytes or an unpinned manifest', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'lpbf-optical-catalog-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  copyFileSync(path.join(sourceRoot, 'manifest.json'), path.join(directory, 'manifest.json'));
  copyFileSync(path.join(sourceRoot, artifact), path.join(directory, artifact));
  const entry = nistOpticalTable4CatalogEntry(directory);
  assert.doesNotThrow(() => entry.loadDocument());
  writeFileSync(path.join(directory, artifact), readFileSync(path.join(directory, artifact), 'utf8').replace('139.7', '139.8'));
  assert.throws(() => entry.loadDocument(), /hash mismatch/i);
  copyFileSync(path.join(sourceRoot, artifact), path.join(directory, artifact));
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  manifest.artifact_kind = 'publisher-raw-data';
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => entry.loadDocument(), /manifest identity mismatch/i);
  manifest.artifact_kind = 'local-transcription-of-published-aggregate-measurements';
  manifest.files[0].sha256 = 'f'.repeat(64);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => entry.loadDocument(), /manifest identity mismatch/i);
});

test('optical Table 4 source previews and imports as a versioned unreviewed revision over HTTP', async t => {
  const storage = mkdtempSync(path.join(tmpdir(), 'lpbf-optical-store-'));
  t.after(() => rmSync(storage, { recursive: true, force: true }));
  const service = new LpbfSourceArchiveService(storage, [nistOpticalTable4CatalogEntry(sourceRoot)]);
  const app = express(); app.use(createLpbfSourcesRouter(service));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/lpbf/sources`;
  const post = (suffix: string, body = {}) => fetch(`${base}/${datasetId}/${suffix}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const catalog = await (await fetch(base)).json();
  assert.deepEqual(catalog.sources.map((entry: any) => entry.datasetId), [datasetId]);
  const previewResponse = await post('preview');
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.equal(preview.expectedRevision, 0);
  assert.equal(preview.artifactCount, 1);
  assert.equal(preview.byteSize, readFileSync(path.join(sourceRoot, artifact)).length);
  assert.equal(preview.document.sourceContext.transcription.publisher_raw_data, false);
  assert.equal(preview.evidenceStatus, 'unreviewed-source-archive');
  const importedResponse = await post('import', { expectedRevision: 0, documentSha256: preview.documentSha256 });
  assert.equal(importedResponse.status, 200);
  const imported = await importedResponse.json();
  assert.equal(imported.revision.revision, 1);
  assert.equal(imported.revision.document.artifacts[0].sha256, preview.document.artifacts[0].sha256);
  assert.equal((await post('import', { expectedRevision: 0, documentSha256: preview.documentSha256 })).status, 409);
  const verified = await (await post('verify')).json();
  assert.equal(verified.revision, 1);
  assert.equal(verified.artifactIntegrity, 'verified-now');
});

test('official optical workbook is a distinct publisher source with pinned workbook and checksum bytes', () => {
  const root = path.join(sourceRoot, 'official');
  const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const document = nistOpticalOfficialWorkbookCatalogEntry(root).loadDocument() as any;
  assert.equal(document.datasetId, 'nist-amb2022-03-optical-xlsx-official-v1');
  assert.equal(document.sourceContext.publisher_artifact_kind, 'publisher-optical-cross-section-measurements');
  assert.deepEqual(document.sourceContext.experiment.section_positions_mm, [4.9, 6]);
  assert.equal(document.artifacts.length, 2);
  for (const file of manifest.files) {
    const bytes = readFileSync(path.join(root, file.path));
    assert.equal(file.bytes, bytes.length);
    assert.equal(file.sha256, sha(bytes));
  }
  assert.equal(readFileSync(path.join(root, manifest.files[1].path), 'utf8'), manifest.files[0].sha256);
  assert.equal(nistOpticalTable4CatalogEntry().datasetId, datasetId);
  assert.ok(new LpbfSourceArchiveService().catalog().sources.some(item => item.datasetId === document.datasetId));
});

test('official optical workbook rejects changed publisher bytes and manifest identity', t => {
  const root = path.join(sourceRoot, 'official');
  const directory = mkdtempSync(path.join(tmpdir(), 'lpbf-optical-official-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const files = ['manifest.json', 'AMB2022-718-SH1-MeltPool_Cross-Section_Measurement_Results.xlsx',
    'AMB2022-718-SH1-MeltPool_Cross-Section_Measurement_Results.xlsx.sha256'];
  for (const file of files) copyFileSync(path.join(root, file), path.join(directory, file));
  const entry = nistOpticalOfficialWorkbookCatalogEntry(directory);
  assert.doesNotThrow(() => entry.loadDocument());
  writeFileSync(path.join(directory, files[1]), Buffer.concat([readFileSync(path.join(directory, files[1])), Buffer.from('x')]));
  assert.throws(() => entry.loadDocument(), /size mismatch/i);
  copyFileSync(path.join(root, files[1]), path.join(directory, files[1]));
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  manifest.files[0].sha256 = 'f'.repeat(64);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => entry.loadDocument(), /manifest identity mismatch/i);
});

test('official workbook independently previews, imports and verifies over HTTP', async t => {
  const storage = mkdtempSync(path.join(tmpdir(), 'lpbf-optical-official-store-'));
  t.after(() => rmSync(storage, { recursive: true, force: true }));
  const officialId = 'nist-amb2022-03-optical-xlsx-official-v1';
  const service = new LpbfSourceArchiveService(storage, [
    nistOpticalTable4CatalogEntry(sourceRoot), nistOpticalOfficialWorkbookCatalogEntry(path.join(sourceRoot, 'official')),
  ]);
  const app = express(); app.use(createLpbfSourcesRouter(service));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/lpbf/sources`;
  const post = (id: string, suffix: string, body = {}) => fetch(`${base}/${id}/${suffix}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const before = await (await fetch(`${base}/${datasetId}`)).json();
  const response = await post(officialId, 'preview');
  assert.equal(response.status, 200);
  const preview = await response.json();
  assert.equal(preview.artifactCount, 2);
  assert.equal(preview.byteSize, 25875);
  assert.equal(preview.expectedRevision, 0);
  const imported = await (await post(officialId, 'import',
    { expectedRevision: 0, documentSha256: preview.documentSha256 })).json();
  assert.equal(imported.revision.revision, 1);
  assert.equal(imported.revision.document.datasetId, officialId);
  const verified = await (await post(officialId, 'verify')).json();
  assert.equal(verified.artifactIntegrity, 'verified-now');
  assert.equal(verified.datasetId, officialId);
  assert.deepEqual(await (await fetch(`${base}/${datasetId}`)).json(), before);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceAction, type SourcePreview, type LpbfSourceRevision } from '../src/services/lpbfSourceService';

const id = 'nist-mds2-2716';
const hash = 'a'.repeat(64);
const document = { schemaVersion: 1, datasetId: id, materialId: 'in718', processScope: 'bare-plate',
  source: { url: 'https://example.org/source', citation: 'Test fixture', version: '1', terms: null, termsMissingReason: 'Unknown' },
  artifacts: [{ relativePath: 'signal.bin', sha256: hash, byteSize: 12, sourceUrl: 'https://example.org/signal' }],
  sourceContext: { measurement: { temperature_conversion: null } } } as const;
const revision: LpbfSourceRevision = { revision: 2, createdAt: '2026-09-21T00:00:00Z',
  document: { ...document, artifacts: [...document.artifacts] }, documentSha256: hash,
  evidenceStatus: 'unreviewed-source-archive', artifactIntegrity: 'not-verified' };
const preview: SourcePreview = { document: revision.document, documentSha256: hash, expectedRevision: 1,
  artifactCount: 1, byteSize: 12, evidenceStatus: 'unreviewed-source-archive', artifactIntegrity: 'verified-at-dry-run' };

function responses(t: any, values: Array<{ body: unknown; status?: number }>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const next = values.shift();
    assert.ok(next, 'Unexpected request');
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  });
  return calls;
}
test('import sends only preview identity and preserves unknown measurement values', async t => {
  const calls = responses(t, [{ body: { revision, artifactCount: 1, byteSize: 12, artifactIntegrity: 'verified-at-import' } },
    { body: { current: revision } }]);
  const result = await sourceAction(id, 'import', new AbortController().signal, preview);
  assert.equal(result.imported, true);
  assert.deepEqual(JSON.parse(calls[0].init!.body as string), { expectedRevision: 1, documentSha256: hash });
  assert.equal(result.current?.document.sourceContext?.measurement && (result.current.document.sourceContext.measurement as any).temperature_conversion, null);
  assert.equal(result.current?.artifactIntegrity, 'not-verified');
  assert.equal(result.current?.evidenceStatus, 'unreviewed-source-archive');
});
test('fresh verification is rejected when current revision changes before refresh', async t => {
  responses(t, [{ body: { datasetId: id, revision: 1, documentSha256: hash, verifiedAt: '2026-09-21T01:00:00Z',
    artifactIntegrity: 'verified-now', evidenceStatus: 'unreviewed-source-archive' } }, { body: { current: revision } }]);
  await assert.rejects(sourceAction(id, 'verify', new AbortController().signal), /changed/i);
});
test('preview is invalidated by concurrent metadata revision', async t => {
  responses(t, [{ body: preview }, { body: { current: revision } }]);
  await assert.rejects(sourceAction(id, 'preview', new AbortController().signal), /changed/i);
});
test('IN625 screening source preview is accepted without upgrading its evidence status', async t => {
  const in625Id = 'in625-bareplate-screening-local-v1';
  const in625Document = { ...document, datasetId: in625Id, materialId: 'in625',
    sourceContext: { evidence_status: 'unreviewed-source-archive', density_assumption: { lot_matched: false } } } as const;
  const in625Preview: SourcePreview = { document: in625Document, documentSha256: hash, expectedRevision: 0,
    artifactCount: 1, byteSize: 12, evidenceStatus: 'unreviewed-source-archive', artifactIntegrity: 'verified-at-dry-run' };
  responses(t, [{ body: in625Preview }, { body: { current: null } }]);
  const result = await sourceAction(in625Id, 'preview', new AbortController().signal);
  assert.equal(result.preview?.document.materialId, 'in625');
  assert.equal(result.preview?.evidenceStatus, 'unreviewed-source-archive');
  assert.equal(result.preview?.document.sourceContext?.evidence_status, 'unreviewed-source-archive');
});
test('HTTP failure exposes actionable status and never returns cached success', async t => {
  responses(t, [{ body: { error: 'Source or stored revision changed.' }, status: 409 }]);
  await assert.rejects(sourceAction(id, 'import', new AbortController().signal, preview), /409.*[Pp]review/);
});
test('wrong dataset and invalid integrity claims cannot become success', async t => {
  responses(t, [{ body: { current: { ...revision, document: { ...revision.document, datasetId: 'other' } } } }]);
  await assert.rejects(sourceAction(id, 'current', new AbortController().signal), /invalid|identity/i);
});

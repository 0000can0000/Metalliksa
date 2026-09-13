import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createResearchRegistrySync } from '../src/services/researchRegistrySync';
import { useResearchStore } from '../src/store/useResearchStore';
import { parseResearchSnapshot, researchSnapshotKey } from '../src/utils/researchRegistry';
import { emptyResearchSnapshot, parseRegistryEnvelope, planRegistryMerge, resolveRegistryMerge, type RegistryEnvelope } from '../src/utils/researchSync';
import type { ResearchBrief, ResearchSnapshot } from '../src/types/research';

// Synthetic transport/record fixtures only; no experimental or scientific claims.
const timestamp = '2026-09-13T00:00:00Z';
const brief = (id: string, question = `Synthetic UI fixture ${id}`): ResearchBrief => ({ id, question, alloy: 'Fixture', process: 'Fixture', method: 'Fixture', dataType: 'Fixture', createdAt: timestamp });
const snapshot = (...briefs: ResearchBrief[]): ResearchSnapshot => ({ ...emptyResearchSnapshot(), briefs });
const envelope = (revision: number, data = emptyResearchSnapshot()): RegistryEnvelope => ({ registryId: 'registry-fixture', revision, savedAt: revision ? timestamp : null, snapshot: structuredClone(data) });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const state = () => useResearchStore.getState();
const setBrowser = (data: ResearchSnapshot) => useResearchStore.setState(structuredClone(data));
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
beforeEach(() => useResearchStore.setState({ ...emptyResearchSnapshot(), activeBriefId: '', activeSourceId: '', activeTab: 'brief', drafts: {}, storageError: '', serverBase: null }));

test('check, save and fresh controller restore the persisted server baseline', async () => {
  let remote = envelope(0);
  const methods: string[] = [];
  const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async (_url, init) => {
    methods.push(init?.method ?? 'GET');
    if (init?.method === 'PUT') {
      const body = JSON.parse(init.body as string);
      assert.equal(body.registryId, remote.registryId);
      assert.equal(body.expectedRevision, remote.revision);
      remote = envelope(remote.revision + 1, body.snapshot);
    }
    return response(remote);
  } });
  await sync.check();
  assert.equal(sync.status.getState().phase, 'ready');
  assert.deepEqual(state().serverBase, { registryId: remote.registryId, revision: 0 });
  setBrowser(snapshot(brief('browser')));
  await sync.save();
  assert.equal(state().serverBase?.revision, 1);
  assert.equal(researchSnapshotKey(state().exportSnapshot()), researchSnapshotKey(remote.snapshot));
  assert.match(sync.status.getState().message, /Browser and server records match/);
  await sync.save();
  assert.deepEqual(methods, ['GET', 'PUT'], 'An unchanged snapshot must not create another revision');
  const restored = createResearchRegistrySync({ timeoutMs: 1000, fetch: async () => response(remote) });
  await restored.check();
  assert.equal(restored.status.getState().phase, 'ready');
  assert.equal(state().serverBase?.revision, 1);
});

test('save acknowledges exactly the submitted snapshot and preserves browser edits made in flight', async () => {
  const acknowledgment = deferred<Response>();
  let submitted: ResearchSnapshot | undefined;
  const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async (_url, init) => {
    if (init?.method === 'PUT') { submitted = JSON.parse(init.body as string).snapshot; return acknowledgment.promise; }
    return response(envelope(0));
  } });
  await sync.check();
  setBrowser(snapshot(brief('local', 'Submitted fixture')));
  const saving = sync.save();
  assert.equal(sync.status.getState().phase, 'saving');
  setBrowser(snapshot(brief('local', 'Edited while saving')));
  acknowledgment.resolve(response(envelope(1, submitted)));
  await saving;
  assert.equal(state().briefs[0].question, 'Edited while saving');
  assert.equal(sync.status.getState().remote?.snapshot.briefs[0].question, 'Submitted fixture');
  assert.equal(state().serverBase?.revision, 1);
  assert.match(sync.status.getState().message, /New browser edits remain unsaved/);
});

test('stale server 409 preserves browser records and blocks another save until a check', async () => {
  let puts = 0;
  const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async (_url, init) => {
    if (init?.method === 'PUT') { puts++; return response({ error: 'Conflict' }, 409); }
    return response(envelope(0));
  } });
  await sync.check();
  setBrowser(snapshot(brief('local')));
  const before = researchSnapshotKey(state().exportSnapshot());
  await sync.save(); await sync.save();
  assert.equal(sync.status.getState().phase, 'conflict');
  assert.match(sync.status.getState().message, /server revision changed/);
  assert.equal(puts, 1);
  assert.equal(researchSnapshotKey(state().exportSnapshot()), before);
  assert.equal(state().serverBase?.revision, 0);
});

test('timeout after server commit recovers a lost acknowledgment by checking without duplicate write', async () => {
  let remote = envelope(0), puts = 0;
  const sync = createResearchRegistrySync({ timeoutMs: 10, fetch: async (_url, init) => {
    if (init?.method !== 'PUT') return response(remote);
    puts++;
    remote = envelope(1, JSON.parse(init.body as string).snapshot);
    return new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('Synthetic lost acknowledgment')), { once: true }));
  } });
  await sync.check();
  setBrowser(snapshot(brief('local')));
  await sync.save();
  assert.equal(sync.status.getState().phase, 'conflict');
  assert.match(sync.status.getState().message, /timed out.*save may already have completed/);
  assert.equal(state().serverBase?.revision, 0);
  await sync.check(); await sync.save();
  assert.equal(sync.status.getState().phase, 'ready');
  assert.equal(state().serverBase?.revision, 1);
  assert.equal(puts, 1);
});

test('three-way reconciliation uses historical baseline and combines disjoint edits only after apply', async () => {
  const base = snapshot(brief('a'), brief('b'));
  const browser = snapshot(brief('a', 'Browser edit'), brief('b'));
  const server = snapshot(brief('a'), brief('b', 'Server edit'));
  setBrowser(browser);
  state().acknowledgeServer({ registryId: 'registry-fixture', revision: 1 });
  const calls: string[] = [];
  const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async url => {
    calls.push(String(url));
    return response(String(url).endsWith('/revisions/1') ? envelope(1, base) : envelope(2, server));
  } });
  await sync.check();
  assert.equal(sync.status.getState().phase, 'review');
  assert.equal(sync.status.getState().plan?.conflicts.length, 0);
  assert.equal(researchSnapshotKey(state().exportSnapshot()), researchSnapshotKey(browser));
  assert.deepEqual(calls, ['/api/research/registry', '/api/research/registry/revisions/1']);
  sync.apply({});
  assert.deepEqual(state().briefs.map(item => item.question), ['Browser edit', 'Server edit']);
  assert.equal(state().serverBase?.revision, 2);
  assert.equal(sync.status.getState().phase, 'ready');
});

test('conflicting record versions stay available and browser remains unchanged until every choice is explicit', async () => {
  const browser = snapshot(brief('same', 'Browser version'));
  const server = snapshot(brief('same', 'Server version'));
  setBrowser(browser);
  const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async () => response(envelope(1, server)) });
  await sync.check();
  const plan = sync.status.getState().plan!;
  assert.equal(plan.conflicts.length, 1);
  assert.equal((plan.conflicts[0].browser as ResearchBrief).question, 'Browser version');
  assert.equal((plan.conflicts[0].server as ResearchBrief).question, 'Server version');
  sync.apply({});
  assert.match(sync.status.getState().message, /Choose a version for every conflicting record/);
  assert.equal(state().briefs[0].question, 'Browser version');
  sync.apply({ 'briefs:same': 'server' });
  assert.equal(state().briefs[0].question, 'Server version');
  assert.equal(sync.status.getState().phase, 'ready');
  const secondPlan = planRegistryMerge(emptyResearchSnapshot(), browser, server, researchSnapshotKey(browser));
  assert.equal(resolveRegistryMerge(secondPlan, { 'briefs:same': 'browser' }, browser, server).snapshot.briefs[0].question, 'Browser version');
});

test('apply refuses to overwrite local edits made after a merge plan was reviewed', async () => {
  setBrowser(snapshot(brief('local')));
  const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async () => response(envelope(1, snapshot(brief('remote')))) });
  await sync.check();
  setBrowser(snapshot(brief('local', 'New local edit')));
  sync.apply({});
  assert.equal(state().briefs.length, 1);
  assert.equal(state().briefs[0].question, 'New local edit');
  assert.equal(state().serverBase, null);
  assert.equal(sync.status.getState().phase, 'review');
  assert.match(sync.status.getState().message, /Browser records changed during review/);
});

function evidenceFixture(): ResearchSnapshot {
  return parseResearchSnapshot({
    ...snapshot(brief('brief')),
    sources: [{ id: 'source', briefId: 'brief', title: 'Synthetic test only', authors: 'Fixture', doi: '', url: 'https://example.org/synthetic-fixture', sourceType: 'technical-report', confidence: 'low', notes: 'No scientific evidence', createdAt: timestamp }],
    findings: [{ id: 'finding', briefId: 'brief', sourceId: 'source', materialId: 'fixture', materialName: 'Synthetic fixture', property: 'Synthetic check', value: 1, unit: '1', uncertaintyDescription: 'Synthetic only', conditions: { composition: 'Fixture', process: 'Fixture', machine: 'Fixture', processParameters: 'Fixture', powderCondition: 'Fixture', heatTreatment: 'Fixture', measurementMethod: 'Fixture' }, locator: 'Synthetic fixture', evidenceType: 'screening-only', confidence: 'low', limitations: 'No scientific interpretation', validationReference: '', targetModule: 'materials-db', reviewStatus: 'draft', reviewNote: '', conflictsWith: [], createdAt: timestamp }],
  });
}

test('combining a source correction with a review of the old source withdraws review and integration', () => {
  const base = evidenceFixture(), browser = structuredClone(base), server = structuredClone(base);
  browser.sources[0].notes = 'Corrected source context in browser';
  Object.assign(server.findings[0], { reviewStatus: 'reviewed', reviewNote: 'Synthetic review of the original source only', reviewedAt: timestamp });
  server.integrations.push({ id: 'link', findingId: 'finding', materialId: 'fixture', targetModule: 'materials-db', status: 'linked', createdAt: timestamp });
  parseResearchSnapshot(server);
  const beforeBrowser = researchSnapshotKey(browser), beforeServer = researchSnapshotKey(server);
  const plan = planRegistryMerge(base, browser, server, beforeBrowser);
  assert.equal(plan.conflicts.length, 0);
  const result = resolveRegistryMerge(plan, {}, browser, server);
  assert.equal(result.withdrawn, 1);
  assert.equal(result.snapshot.findings[0].reviewStatus, 'draft');
  assert.equal(result.snapshot.findings[0].reviewedAt, undefined);
  assert.equal(result.snapshot.findings[0].reviewNote, '');
  assert.equal(result.snapshot.integrations.length, 0);
  assert.equal(result.snapshot.sources[0].notes, browser.sources[0].notes);
  assert.equal(researchSnapshotKey(browser), beforeBrowser);
  assert.equal(researchSnapshotKey(server), beforeServer);
});

test('malformed server envelopes and mismatched history preserve browser records and baseline', async () => {
  const invalid = [null, { ...envelope(0), revision: -1 }, { ...envelope(1), savedAt: null }, { ...envelope(0), snapshot: { ...emptyResearchSnapshot(), schemaVersion: 99 } }];
  for (const data of invalid) {
    assert.throws(() => parseRegistryEnvelope(data));
    setBrowser(snapshot(brief('local')));
    const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async () => response(data) });
    await sync.check();
    assert.equal(sync.status.getState().phase, 'error');
    assert.equal(state().briefs[0].id, 'local');
    assert.equal(state().serverBase, null);
  }
  state().acknowledgeServer({ registryId: 'registry-fixture', revision: 1 });
  const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async url => response(String(url).includes('/revisions/') ? { ...envelope(1), registryId: 'different-registry' } : envelope(2, snapshot(brief('remote')))) });
  await sync.check();
  assert.equal(sync.status.getState().phase, 'error');
  assert.match(sync.status.getState().message, /history identity changed/);
  assert.equal(state().briefs[0].id, 'local');
  assert.equal(state().serverBase?.revision, 1);
});

test('canonical key ordering allows identical imports and avoids false merge conflicts', () => {
  const original = evidenceFixture();
  setBrowser(original);
  const reorder = (value: unknown): unknown => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)])) : value;
  const reordered = reorder(original) as ResearchSnapshot;
  assert.equal(researchSnapshotKey(original), researchSnapshotKey(reordered));
  assert.deepEqual(state().importSnapshot(reordered).errors, []);
  const plan = planRegistryMerge(emptyResearchSnapshot(), original, reordered, researchSnapshotKey(original));
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.snapshot.findings.length, 1);
});

test('incorrect save acknowledgments never advance baseline or replace local records', async () => {
  for (const acknowledgment of [envelope(2, snapshot(brief('local'))), { ...envelope(1, snapshot(brief('local'))), registryId: 'different-registry' }, envelope(1, snapshot(brief('unexpected')))]) {
    useResearchStore.setState({ ...emptyResearchSnapshot(), serverBase: null });
    const sync = createResearchRegistrySync({ timeoutMs: 1000, fetch: async (_url, init) => response(init?.method === 'PUT' ? acknowledgment : envelope(0)) });
    await sync.check();
    setBrowser(snapshot(brief('local')));
    await sync.save();
    assert.equal(sync.status.getState().phase, 'conflict');
    assert.match(sync.status.getState().message, /Unexpected save acknowledgment/);
    assert.equal(state().serverBase?.revision, 0);
    assert.equal(sync.status.getState().remote?.revision, 0);
    assert.equal(state().briefs[0].id, 'local');
  }
});

test('a contradiction merged from another revision withdraws a review that never considered it', () => {
  const base = evidenceFixture(), browser = structuredClone(base), server = structuredClone(base);
  Object.assign(browser.findings[0], { reviewStatus: 'reviewed', reviewNote: 'Synthetic review before contradictory fixture feedback', reviewedAt: timestamp });
  browser.integrations.push({ id: 'link', findingId: 'finding', materialId: 'fixture', targetModule: 'materials-db', status: 'linked', createdAt: timestamp });
  server.feedback.push({ id: 'contradiction', findingId: 'finding', outcome: 'contradicts', note: 'Synthetic contradiction', experimentOrJobReference: 'Synthetic fixture only', createdAt: timestamp });
  const plan = planRegistryMerge(base, browser, server, researchSnapshotKey(browser));
  assert.equal(plan.conflicts.length, 0);
  const result = resolveRegistryMerge(plan, {}, browser, server);
  assert.equal(result.withdrawn, 1);
  assert.equal(result.snapshot.findings[0].reviewStatus, 'draft');
  assert.equal(result.snapshot.integrations.length, 0);
  assert.equal(result.snapshot.feedback[0].id, 'contradiction');
  assert.equal(browser.findings[0].reviewStatus, 'reviewed', 'Planning must preserve both original inputs');
});

test('delete-versus-edit is an explicit conflict and either choice preserves its intended meaning', () => {
  const base = snapshot(brief('same')), browser = emptyResearchSnapshot(), server = snapshot(brief('same', 'Server revision'));
  const plan = planRegistryMerge(base, browser, server, researchSnapshotKey(browser));
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0].browser, undefined);
  assert.equal(resolveRegistryMerge(plan, { 'briefs:same': 'browser' }, browser, server).snapshot.briefs.length, 0);
  assert.equal(resolveRegistryMerge(plan, { 'briefs:same': 'server' }, browser, server).snapshot.briefs[0].question, 'Server revision');
});

test('a server link cannot survive when a browser extraction revision is merged as draft', () => {
  const base = evidenceFixture();
  Object.assign(base.findings[0], { reviewStatus: 'reviewed', reviewNote: 'Synthetic review', reviewedAt: timestamp });
  const browser = structuredClone(base), server = structuredClone(base);
  Object.assign(browser.findings[0], { value: 2, reviewStatus: 'draft', reviewNote: '' });
  delete browser.findings[0].reviewedAt;
  server.integrations.push({ id: 'link', findingId: 'finding', materialId: 'fixture', targetModule: 'materials-db', status: 'linked', createdAt: timestamp });
  parseResearchSnapshot(browser); parseResearchSnapshot(server);
  const plan = planRegistryMerge(base, browser, server, researchSnapshotKey(browser));
  assert.equal(plan.conflicts.length, 0);
  const result = resolveRegistryMerge(plan, {}, browser, server);
  assert.equal(result.snapshot.findings[0].value, 2);
  assert.equal(result.snapshot.findings[0].reviewStatus, 'draft');
  assert.equal(result.snapshot.integrations.length, 0);
  assert.equal(result.withdrawnLinks, 1);
});

test('one trusted review must cover the entire merged contradiction set', () => {
  const base = evidenceFixture(), browser = structuredClone(base), server = structuredClone(base);
  for (const [input, id] of [[browser, 'browser-contradiction'], [server, 'server-contradiction']] as const) {
    Object.assign(input.findings[0], { reviewStatus: 'reviewed', reviewNote: 'Synthetic review of branch-specific evidence', reviewedAt: timestamp });
    input.feedback.push({ id, findingId: 'finding', outcome: 'contradicts', note: `Synthetic ${id}`, experimentOrJobReference: 'Synthetic test only', createdAt: timestamp });
    input.integrations.push({ id: 'link', findingId: 'finding', materialId: 'fixture', targetModule: 'materials-db', status: 'linked', createdAt: timestamp });
    parseResearchSnapshot(input);
  }
  const plan = planRegistryMerge(base, browser, server, researchSnapshotKey(browser));
  assert.equal(plan.conflicts.length, 0);
  const result = resolveRegistryMerge(plan, {}, browser, server);
  assert.equal(result.withdrawn, 1);
  assert.equal(result.snapshot.findings[0].reviewStatus, 'draft');
  assert.equal(result.snapshot.integrations.length, 0);
  assert.equal(result.snapshot.feedback.length, 2);
  // A later review that already considered both contradictions remains usable.
  const rereviewed = structuredClone(browser);
  rereviewed.feedback.push(structuredClone(server.feedback[0]));
  rereviewed.findings[0].reviewNote = 'Synthetic rereview covering both contradictory fixtures';
  const safePlan = planRegistryMerge(browser, rereviewed, browser, researchSnapshotKey(rereviewed));
  const retained = resolveRegistryMerge(safePlan, {}, rereviewed, browser);
  assert.equal(retained.withdrawn, 0);
  assert.equal(retained.withdrawnLinks, 0);
  assert.equal(retained.snapshot.findings[0].reviewStatus, 'reviewed');
  assert.equal(retained.snapshot.integrations.length, 1);
});

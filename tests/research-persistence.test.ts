import assert from 'node:assert/strict';

// An isolated browser-storage substitute. No application/user local storage is accessed.
const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
} });
const { useResearchStore } = await import('../src/store/useResearchStore');
const state = () => useResearchStore.getState();
const key = 'metalliksa-research-registry-v1';
assert.equal(state().storageError, '', 'An empty first launch must not be treated as corruption');
const brief = state().addBrief({ question: 'Persistence fixture only', alloy: '', process: '', method: '', dataType: '' });
assert.deepEqual(brief.errors, []);
assert.ok(memory.has(key), 'Clean first launch must allow persistence');
const source = state().addSource({ briefId: brief.id!, title: 'Source fixture only', authors: '', doi: '10.1234/persistence-fixture', url: '', sourceType: 'primary-paper', confidence: 'unresolved', notes: '' });
const secondSource = state().addSource({ briefId: brief.id!, title: 'Second source fixture only', authors: '', doi: '10.1234/persistence-fixture-2', url: '', sourceType: 'primary-paper', confidence: 'unresolved', notes: '' });
const draftA = `extraction:${brief.id}:${source.id}`, draftB = `extraction:${brief.id}:${secondSource.id}`;
state().setDraft(draftA, { sourceId: source.id!, value: '12.5', locator: 'Table fixture A' });
state().setDraft(draftB, { sourceId: secondSource.id!, value: '44', locator: 'Figure fixture B' });
state().setActiveSource(source.id!); state().setActiveTab('extract');
const saved = memory.get(key)!;
useResearchStore.setState({ briefs: [], sources: [], activeBriefId: '', activeSourceId: '', activeTab: 'brief', drafts: {} });
memory.set(key, saved);
await useResearchStore.persist.rehydrate();
assert.equal(state().briefs[0].id, brief.id);
assert.equal(state().activeSourceId, source.id);
assert.equal(state().activeTab, 'extract');
assert.equal(state().drafts[draftA].value, '12.5');
assert.equal(state().drafts[draftB].value, '44');
state().setActiveSource(secondSource.id!);
assert.equal(state().drafts[draftA].locator, 'Table fixture A', 'Changing source must preserve the previous source draft');
const corrupt = JSON.stringify({ state: { schemaVersion: 999 }, version: 1 });
memory.set(key, corrupt);
await useResearchStore.persist.rehydrate();
assert.match(state().storageError, /preserved/);
state().setDraft('new-session-draft', { value: 'New work must remain exportable' });
assert.equal(memory.get(key), corrupt, 'Corrupt original storage must not be silently overwritten');
assert.equal(state().drafts['new-session-draft'].value, 'New work must remain exportable');
console.log('Research persistence: clean first launch, reload, per-source draft isolation and corrupt-storage preservation passed.');

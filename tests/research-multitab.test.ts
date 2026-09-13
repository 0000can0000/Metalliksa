import assert from 'node:assert/strict';
import { parseResearchSnapshot } from '../src/utils/researchRegistry';

// Isolated browser substitute. Never touches a real user's browser registry.
const memory = new Map<string, string>();
let writes = 0;
let quotaFailure = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { writes++; if (quotaFailure) throw new Error('Synthetic quota failure'); memory.set(key, value); },
  removeItem: (key: string) => memory.delete(key),
} });
const { useResearchStore } = await import('../src/store/useResearchStore');
const state = () => useResearchStore.getState();
const key = 'metalliksa-research-registry-v1';
const brief = state().addBrief({ question: 'Synthetic multi-tab storage test', alloy: '', process: '', method: '', dataType: '' });
assert.deepEqual(brief.errors, []);
state().setDraft('source-draft', { title: 'Unsaved source fixture', notes: 'Synthetic draft' });
const recovery = JSON.parse(JSON.stringify({ ...state().exportSnapshot(), browserDrafts: state().drafts }));
assert.equal(Object.hasOwn(parseResearchSnapshot(recovery), 'browserDrafts'), false, 'Drafts must never enter shared scientific records');
useResearchStore.setState({ briefs: [], drafts: {}, activeBriefId: '' });
assert.deepEqual(state().importSnapshot(recovery).errors, []);
assert.equal(state().briefs[0].id, brief.id);
assert.deepEqual(state().drafts, recovery.browserDrafts, 'Recovery copy restores drafts and records');
const reordered = { ...recovery, browserDrafts: { 'source-draft': { notes: 'Synthetic draft', title: 'Unsaved source fixture' } } };
assert.deepEqual(state().importSnapshot(reordered).errors, [], 'Identical drafts with reordered fields are safe');
const extraBrief = { ...recovery.briefs[0], id: 'new-imported-brief' };
const conflict = { ...recovery, briefs: [...recovery.briefs, extraBrief], browserDrafts: { 'source-draft': { title: 'Conflicting other version' } } };
const beforeImport = JSON.stringify({ snapshot: state().exportSnapshot(), drafts: state().drafts });
assert.match(state().importSnapshot(conflict).errors.join(' '), /conflicting browser draft: source-draft/);
assert.equal(JSON.stringify({ snapshot: state().exportSnapshot(), drafts: state().drafts }), beforeImport, 'Conflicting draft aborts the records and drafts import atomically');
for (const browserDrafts of [null, [], { fixture: [] }, { fixture: { value: 12 } }, { fixture: { value: 'x'.repeat(100001) } }, { ['x'.repeat(1001)]: {} }]) {
  assert.ok(state().importSnapshot({ ...recovery, browserDrafts }).errors.length, 'Malformed/oversized drafts are refused');
  assert.equal(JSON.stringify({ snapshot: state().exportSnapshot(), drafts: state().drafts }), beforeImport);
}
// The status update itself invokes persistence; it must not schedule an infinite error loop.
quotaFailure = true;
state().setDraft('quota-draft', { value: 'Keep this in memory' });
await Promise.resolve();
assert.match(state().storageError, /unavailable or full/);
const failedWrites = writes;
await Promise.resolve();
assert.equal(writes, failedWrites);
assert.equal(state().drafts['quota-draft'].value, 'Keep this in memory');
quotaFailure = false;
state().setActiveTab('sources');
assert.equal(JSON.parse(memory.get(key)!).state.drafts['quota-draft'].value, 'Keep this in memory');

// Another tab changes only UI drafts and server-base metadata, leaving the scientific snapshot identical.
const foreign = JSON.parse(memory.get(key)!);
foreign.state.drafts['source-draft'].title = 'Other tab unsaved work';
foreign.state.serverBase = { registryId: 'other-registry', revision: 8 };
const foreignRaw = JSON.stringify(foreign);
memory.set(key, foreignRaw);
const writesBeforeConflict = writes;
state().setActiveTab('registry');
await Promise.resolve();
assert.equal(memory.get(key), foreignRaw, 'Even an unrelated UI action must not overwrite foreign drafts');
assert.equal(state().drafts['source-draft'].title, 'Unsaved source fixture', 'Foreign data must not silently replace this tab');
assert.match(state().storageError, /Another tab changed/);
assert.match(state().storageError, /Export browser recovery copy before reloading/);
state().setDraft('local-after-conflict', { value: 'Still exportable' });
state().acknowledgeServer({ registryId: 'local-registry', revision: 9 });
useResearchStore.persist.clearStorage();
await Promise.resolve();
assert.equal(memory.get(key), foreignRaw, 'Server-base metadata, local edits and clearStorage remain guarded');
assert.equal(writes, writesBeforeConflict, 'Conflict status cannot recurse or write storage');
assert.equal(state().drafts['local-after-conflict'].value, 'Still exportable');
assert.equal(state().serverBase?.revision, 9);
console.log('Research multi-tab persistence: recovery drafts, atomic conflict refusal, quota guard, foreign raw preservation and server-base write guard passed.');

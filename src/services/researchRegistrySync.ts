import { create } from 'zustand';
import { useResearchStore } from '../store/useResearchStore';
import { researchSnapshotKey } from '../utils/researchRegistry';
import { emptyResearchSnapshot, parseRegistryEnvelope, planRegistryMerge, resolveRegistryMerge, type RegistryEnvelope, type RegistryMerge } from '../utils/researchSync';

type Phase = 'unchecked' | 'checking' | 'ready' | 'review' | 'saving' | 'conflict' | 'error';
interface SyncState {
  phase: Phase;
  message: string;
  remote: RegistryEnvelope | null;
  plan: RegistryMerge | null;
}
type Dependencies = { fetch: typeof fetch; timeoutMs: number };

export function createResearchRegistrySync(dependencies: Dependencies = { fetch: (input, init) => fetch(input, init), timeoutMs: 12000 }) {
  const status = create<SyncState>(() => ({ phase: 'unchecked', message: 'Browser records are saved locally. Check this server to connect its revision history.', remote: null, plan: null }));
  let busy = false;
  const request = async (path = '', init?: RequestInit): Promise<RegistryEnvelope> => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), dependencies.timeoutMs);
    try {
      const response = await dependencies.fetch(`/api/research/registry${path}`, { ...init, signal: controller.signal, headers: { Accept: 'application/json', ...init?.headers }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) throw new Error('The server revision changed. Check the server and review changes before saving again.');
        throw new Error(typeof data?.error === 'string' ? data.error : `Registry request failed (${response.status}).`);
      }
      return parseRegistryEnvelope(data);
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Server registry request timed out. Check the server before retrying; a save may already have completed.');
      throw error;
    } finally { clearTimeout(timer); }
  };
  const check = async () => {
    if (busy) return;
    busy = true; status.setState({ phase: 'checking', message: 'Checking server revisions…', plan: null });
    try {
      const remote = await request(), state = useResearchStore.getState(), browser = state.exportSnapshot();
      const localKey = researchSnapshotKey(browser), base = state.serverBase;
      if (researchSnapshotKey(remote.snapshot) === localKey || (base?.registryId === remote.registryId && base.revision === remote.revision)) {
        state.acknowledgeServer({ registryId: remote.registryId, revision: remote.revision });
        status.setState({ remote, phase: 'ready', message: `Server revision ${remote.revision} checked. Browser edits can be saved as a new revision.` });
      } else {
        let ancestor = emptyResearchSnapshot();
        if (base?.registryId === remote.registryId) {
          const historical = await request(`/revisions/${base.revision}`);
          if (historical.registryId !== remote.registryId || historical.revision !== base.revision) throw new Error('Server history identity changed. Browser records were preserved.');
          ancestor = historical.snapshot;
        }
        const current = useResearchStore.getState().exportSnapshot();
        const plan = planRegistryMerge(ancestor, current, remote.snapshot, researchSnapshotKey(current));
        status.setState({ remote, plan, phase: 'review', message: `Review server revision ${remote.revision} before combining records. No records have changed.` });
      }
    } catch (error) { status.setState({ phase: 'error', message: error instanceof Error ? error.message : 'Server unavailable. Browser records were preserved.' }); }
    finally { busy = false; }
  };
  const apply = (choices: Record<string, 'browser' | 'server'>) => {
    const { plan, remote } = status.getState(); if (!plan || !remote || busy) return;
    try {
      const result = resolveRegistryMerge(plan, choices, useResearchStore.getState().exportSnapshot(), remote.snapshot);
      const accepted = useResearchStore.getState().acceptServerSnapshot(result.snapshot, plan.localKey, { registryId: remote.registryId, revision: remote.revision });
      if (accepted.errors.length) throw new Error(accepted.errors.join(' '));
      status.setState({ phase: 'ready', plan: null, message: `Combined records in this browser. ${result.withdrawn} review(s) and ${result.withdrawnLinks} module link(s) withdrawn because their evidence context changed. Save to create a server revision.` });
    } catch (error) { status.setState({ message: (error as Error).message }); }
  };
  const save = async () => {
    const { remote, phase } = status.getState(); if (busy || phase !== 'ready' || !remote) return;
    const state = useResearchStore.getState();
    if (state.storageError) { status.setState({ message: 'Browser persistence needs attention. Export local records before connecting server revisions.' }); return; }
    const snapshot = structuredClone(state.exportSnapshot());
    if (researchSnapshotKey(snapshot) === researchSnapshotKey(remote.snapshot)) { status.setState({ message: `Already matches server revision ${remote.revision}.` }); return; }
    busy = true; status.setState({ phase: 'saving', message: 'Saving a new server revision…' });
    try {
      const saved = await request('', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registryId: remote.registryId, expectedRevision: remote.revision, snapshot }) });
      if (saved.registryId !== remote.registryId || saved.revision !== remote.revision + 1 || researchSnapshotKey(saved.snapshot) !== researchSnapshotKey(snapshot)) throw new Error('Unexpected save acknowledgment. Check the server before retrying.');
      useResearchStore.getState().acknowledgeServer({ registryId: saved.registryId, revision: saved.revision });
      status.setState({ remote: saved, phase: 'ready', message: `Saved server revision ${saved.revision}. ${researchSnapshotKey(useResearchStore.getState().exportSnapshot()) === researchSnapshotKey(saved.snapshot) ? 'Browser and server records match.' : 'New browser edits remain unsaved.'}` });
    } catch (error) { status.setState({ phase: 'conflict', message: error instanceof Error ? error.message : 'Save failed. Check server state before retrying.' }); }
    finally { busy = false; }
  };
  return { status, check, apply, save, readRevision: (revision: number) => request(`/revisions/${revision}`) };
}

export const researchRegistrySync = createResearchRegistrySync();

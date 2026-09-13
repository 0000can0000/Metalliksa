import React, { useState } from 'react';
import { CloudUpload, RefreshCw, Download } from 'lucide-react';
import { researchRegistrySync } from '../../services/researchRegistrySync';
import { useResearchStore } from '../../store/useResearchStore';
import { researchSnapshotKey } from '../../utils/researchRegistry';
import { researchCollections } from '../../utils/researchSync';
import { buttonClass, primaryClass, panelClass } from './ResearchControls';

function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ResearchSyncPanel() {
  const sync = researchRegistrySync.status(), local = useResearchStore();
  const [choices, setChoices] = useState<Record<string, 'browser' | 'server'>>({});
  const [revision, setRevision] = useState(''), [downloadError, setDownloadError] = useState(''), [downloading, setDownloading] = useState(false);
  const busy = sync.phase === 'checking' || sync.phase === 'saving';
  const matches = sync.remote && researchSnapshotKey(local.exportSnapshot()) === researchSnapshotKey(sync.remote.snapshot);
  const pending = sync.plan;
  const inspect = () => { setChoices({}); void researchRegistrySync.check(); };
  return <section className={panelClass} aria-label="Server evidence registry">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-100">Server evidence registry</h2><p className="mt-1 text-xs text-slate-400">Save reviewed work and drafts as versioned records on this server. Form drafts remain in this browser.</p></div><span className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300">{sync.phase === 'ready' ? matches ? 'Records match' : 'Browser changes pending' : sync.phase === 'review' ? 'Review required' : sync.phase === 'conflict' ? 'Check required' : sync.phase}</span></div>
    <p role="status" className="my-3 text-sm text-slate-300">{sync.message}</p>
    {sync.remote && <p className="mb-3 break-all text-xs text-slate-500">Registry {sync.remote.registryId} · Last checked revision {sync.remote.revision}{sync.remote.savedAt ? ` · ${new Date(sync.remote.savedAt).toLocaleString()}` : ' · No server saves yet'}</p>}
    <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={inspect}><RefreshCw size={14} /> Check server</button><button className={primaryClass} disabled={sync.phase !== 'ready' || !!matches || !!local.storageError} onClick={() => void researchRegistrySync.save()}><CloudUpload size={14} /> Save new server revision</button>{sync.remote && <button className={buttonClass} onClick={() => downloadJson(sync.remote!.snapshot, `research-server-revision-${sync.remote!.revision}.json`)}><Download size={14} /> Export checked server revision</button>}</div>
    {pending && <div className="mt-4 space-y-3 border-t border-slate-700 pt-4">
      <h3 className="text-sm font-semibold text-slate-200">Review combined records</h3><p className="text-xs text-slate-400">{researchCollections.map(key => `${key}: browser ${local[key].length} / server ${sync.remote!.snapshot[key].length}`).join(' · ')}</p>
      <p className="text-xs text-slate-400">Independent edits are combined after you apply this review. Conflicting records need a choice. Changed evidence context may withdraw reviews and module links; invalid references block the entire update. Server history retains earlier saved versions.</p>
      {pending.conflicts.map(conflict => <fieldset key={conflict.key} className="min-w-0 rounded-lg border border-amber-800 p-3"><legend className="max-w-full break-all px-1 text-xs text-amber-200">{conflict.collection} · {conflict.id}</legend><div className="grid gap-3 md:grid-cols-2">{(['browser', 'server'] as const).map(side => <label key={side} className="min-w-0 text-xs text-slate-300"><span className="flex items-center gap-2"><input type="radio" name={conflict.key} checked={choices[conflict.key] === side} onChange={() => setChoices(current => ({ ...current, [conflict.key]: side }))} /> Keep {side} version</span><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-950 p-2 text-[11px]">{conflict[side] ? JSON.stringify(conflict[side], null, 2) : 'Record removed in this version'}</pre></label>)}</div></fieldset>)}
      {!pending.conflicts.length && <p className="text-xs text-emerald-300">No conflicting records.</p>}
      <button className={primaryClass} disabled={busy || !!local.storageError || pending.conflicts.some(item => !choices[item.key])} onClick={() => researchRegistrySync.apply(choices)}>Apply reviewed combination to browser</button>
    </div>}
    {sync.remote && sync.remote.revision > 0 && <details className="mt-4 border-t border-slate-800 pt-3"><summary className="cursor-pointer text-xs text-slate-400">Export an earlier server revision</summary><div className="mt-3 flex flex-wrap items-center gap-2"><label className="text-xs text-slate-400">Revision <input className="ml-2 w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100" type="number" min="0" max={sync.remote.revision} step="1" value={revision} onChange={event => setRevision(event.target.value)} /></label><button className={buttonClass} disabled={downloading || revision === '' || !Number.isSafeInteger(Number(revision)) || Number(revision) < 0 || Number(revision) > sync.remote.revision} onClick={async () => { setDownloadError(''); setDownloading(true); try { const old = await researchRegistrySync.readRevision(Number(revision)); if (old.registryId !== sync.remote!.registryId || old.revision !== Number(revision)) throw new Error('Server revision identity changed. Check the server again.'); downloadJson(old.snapshot, `research-server-revision-${old.revision}.json`); } catch (error) { setDownloadError((error as Error).message); } finally { setDownloading(false); } }}><Download size={14} /> Export revision</button></div>{downloadError && <p role="alert" className="mt-2 text-xs text-amber-300">{downloadError}</p>}</details>}
    <p className="mt-3 text-xs text-slate-500">This server has one shared registry without user accounts or access control. Changes are saved only when requested. Stored revisions document records and user reviews; they do not establish experimental validation or certification.</p>
  </section>;
}

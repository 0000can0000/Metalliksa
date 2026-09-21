import React, { useEffect, useState } from 'react';
import { useInputBoundTask } from '../hooks/useInputBoundTask';
import { listRuns, getRun, previewRun, importRun, type RunPreview, type RunArchiveList } from '../services/lpbfRunArchiveClient';
import type { RunRecord, RunSourceLink } from '../types/lpbfRun';

const button = 'rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-300 disabled:opacity-40';

export function LpbfRunArchivePanel() {
  const [runs, setRuns] = useState<RunArchiveList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null); setRuns(null); setSelected('');
    listRuns(controller.signal).then(items => {
      if (!controller.signal.aborted) { setRuns(items); setSelected(items[0]?.runId ?? ''); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Run archive unavailable.'); });
    return () => controller.abort();
  }, [attempt]);

  return <section aria-label="LPBF run archive" className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5 space-y-4">
    <div><h3 className="text-lg font-medium">Simulation Run Archive</h3><p className="mt-1 text-sm text-sky-200">Immutable execution history</p></div>
    <p className="text-sm text-slate-400">Inspect archived simulation runs and import current simulation jobs into the permanent archive.</p>
    {error ? <div><p role="alert" className="text-rose-300">{error}</p><button className={`${button} mt-3`} onClick={() => setAttempt(value => value + 1)}>Retry run archive</button></div>
      : runs === null ? <p role="status">Loading run archive…</p>
      : runs.length === 0 ? <p>No simulation runs archived yet.</p>
      : <><label className="block text-sm">Archived run<select aria-label="Archived run" className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 focus-visible:outline-2 focus-visible:outline-sky-300" value={selected} onChange={event => setSelected(event.target.value)}>{runs.map(item => <option key={item.runId} value={item.runId}>{item.runId.slice(0,8)}... · {item.createdAt}</option>)}</select></label>
        {selected && <ArchivedRunRecord key={selected} runId={selected}/>}</>}
  </section>;
}

function ArchivedRunRecord({ runId }: { runId: string }) {
  const task = useInputBoundTask<RunRecord>(runId);
  
  const run = async (action: 'current') => {
    const request = task.begin(action);
    try {
      request.publish(await getRun(runId, request.signal));
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };
  useEffect(() => { void run('current'); }, [runId]);
  
  const record = task.data;
  return <div className="space-y-4" aria-busy={!!task.pending}>
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={!!task.pending} onClick={() => void run('current')}>Reload run</button>
    </div>
    {task.error && <p role="alert" className="text-rose-300">{task.error}</p>}
    {task.pending && <p role="status" className="text-sm text-slate-300">Loading run record...</p>}
    {record && <div className="text-sm space-y-1">
      <p>Created at {record.createdAt}</p>
      <p>Status: {record.evidenceStatus}</p>
      <p>Job ID: {record.document.jobId}</p>
      <details><summary className="cursor-pointer font-medium mt-3">Document Payload</summary>
      <pre className="text-xs bg-slate-950 p-3 overflow-auto mt-2 text-slate-300">{JSON.stringify(record.document, null, 2)}</pre>
      </details>
    </div>}
  </div>;
}

export function LpbfJobArchiver({ jobId, sources }: { jobId: string, sources: RunSourceLink[] }) {
  const [preview, setPreview] = useState<RunPreview | null>(null);
  const [imported, setImported] = useState<RunRecord | null>(null);
  const task = useInputBoundTask<RunPreview | RunRecord>(jobId);

  const runPreview = async () => {
    const request = task.begin('preview');
    try {
      const result = await previewRun(jobId, sources, request.signal);
      setPreview(result);
      request.publish(result);
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const runImport = async () => {
    const request = task.begin('import');
    try {
      const result = await importRun(jobId, sources, request.signal);
      setImported(result);
      request.publish(result);
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  if (imported) {
    return <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
      <p>Job archived successfully (Run ID: {imported.document.runId.slice(0,8)}...)</p>
    </div>;
  }

  return <div className="space-y-3 rounded-xl border border-slate-700 p-4">
    <h4 className="font-medium text-sm">Save to Archive</h4>
    <div className="flex gap-2">
      <button className={button} disabled={!!task.pending} onClick={runPreview}>Preview Archive</button>
      <button className={button} disabled={!!task.pending || !preview} onClick={runImport}>Archive Job</button>
    </div>
    {task.pending && <p className="text-xs text-slate-400">Processing...</p>}
    {task.error && <p className="text-xs text-rose-300">{task.error}</p>}
    {preview && <div className="text-xs text-slate-300 space-y-1">
      <p>Preview ready: {preview.artifactCount} artifacts, {(preview.byteSize / 1024 / 1024).toFixed(2)} MB.</p>
      {preview.quota.approachingLimit && <p className="text-amber-300">Warning: Archive is approaching its capacity limit.</p>}
      <p className="text-slate-500">Archive size: {(preview.quota.totalArchiveSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB / 15 GB</p>
    </div>}
  </div>;
}

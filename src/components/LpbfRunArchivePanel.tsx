import React, { useEffect, useState } from 'react';
import { useInputBoundTask } from '../hooks/useInputBoundTask';
import { listRuns, getRun, previewRun, importRun, type RunPreview, type RunArchiveList } from '../services/lpbfRunArchiveClient';
import { sourceAction, sourceCatalog } from '../services/lpbfSourceService';
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
      <p>Model status: Unvalidated model</p>
      <p>Contract: {record.document.capture.contractStatus === 'legacy-unbound' ? 'Legacy run · core contract unbound' : 'Core v1 bound'}</p>
      <p>Source binding: {record.sourceBindingStatus === 'exact-revision-bound' ? 'Exact archived source revision' : 'Legacy run · no archived source revision'}</p>
      <p>Job ID: {record.document.capture.jobId}</p>
      <details><summary className="cursor-pointer font-medium mt-3">Document Payload</summary>
      <pre className="text-xs bg-slate-950 p-3 overflow-auto mt-2 text-slate-300">{JSON.stringify(record.document, null, 2)}</pre>
      </details>
    </div>}
  </div>;
}

interface ArchivedSourceOption { key: string; label: string; link: RunSourceLink }

export function LpbfJobArchiver({ jobId }: { jobId: string }) {
  const [sourceState, setSources] = useState<{ jobId: string; options: ArchivedSourceOption[] } | null>(null);
  const [sourceError, setSourceError] = useState<{ jobId: string; message: string } | null>(null);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [selection, setSelection] = useState<{ jobId: string; key: string } | null>(null);
  const [previewState, setPreview] = useState<{ key: string; value: RunPreview } | null>(null);
  const [importedState, setImported] = useState<{ key: string; value: RunRecord } | null>(null);
  const options = sourceState?.jobId === jobId ? sourceState.options : null;
  const selected = options?.find(item => item.key === (selection?.jobId === jobId ? selection.key : '')) ?? null;
  const requestKey = `${jobId}:${selected?.key ?? ''}`;
  const task = useInputBoundTask<RunPreview | RunRecord>(requestKey);
  const preview = previewState?.key === requestKey && selected ? previewState.value : null;
  const imported = importedState?.key === requestKey && selected ? importedState.value : null;

  useEffect(() => {
    const controller = new AbortController();
    setSources(null); setSourceError(null); setSelection(null); setPreview(null); setImported(null);
    sourceCatalog(controller.signal).then(async catalog => {
      const current = await Promise.all(catalog.map(async item => ({ item,
        revision: (await sourceAction(item.datasetId, 'current', controller.signal)).current })));
      if (controller.signal.aborted) return;
      const options: ArchivedSourceOption[] = current.flatMap(({ item, revision }) => {
        if (!revision) return [];
        const link = { datasetId: item.datasetId, revision: revision.revision,
          documentSha256: revision.documentSha256 };
        return [{ key: `${link.datasetId}:${link.revision}:${link.documentSha256}`,
          label: `${item.title} · revision ${link.revision} · SHA-256 ${link.documentSha256.slice(0, 12)}…`, link }];
      });
      setSources({ jobId, options });
    }).catch(error => {
      if (!controller.signal.aborted) setSourceError({ jobId,
        message: error instanceof Error ? error.message : 'Source revisions unavailable.' });
    });
    return () => controller.abort();
  }, [jobId, sourceAttempt]);

  const runPreview = async () => {
    if (!selected) return;
    const request = task.begin('preview');
    try {
      const result = await previewRun(jobId, [selected.link], request.signal);
      if (request.isCurrent()) setPreview({ key: requestKey, value: result });
      request.publish(result);
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const runImport = async () => {
    if (!selected || !preview) return;
    const request = task.begin('import');
    try {
      const result = await importRun(jobId, [selected.link], request.signal);
      if (request.isCurrent()) setImported({ key: requestKey, value: result });
      request.publish(result);
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  if (imported) {
    return <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
      <p>Job archived successfully (Run ID: {imported.document.runId.slice(0,8)}...). Model remains unvalidated.</p>
    </div>;
  }

  return <div className="space-y-3 rounded-xl border border-slate-700 p-4">
    <h4 className="font-medium text-sm">Save to Archive</h4>
    <p className="text-xs text-slate-400">Choose an imported source revision for this run. Source archives are unreviewed; linking one does not validate the model.</p>
    {sourceError?.jobId === jobId ? <p role="alert" className="text-xs text-rose-300">{sourceError.message}</p>
      : options === null ? <p role="status" className="text-xs text-slate-400">Loading imported source revisions…</p>
      : options.length === 0 ? <p className="text-xs text-amber-200">No imported source revisions are available. Import a source in the Source archive first.</p>
      : <label className="block text-sm">Imported source revision<select aria-label="Imported source revision"
        className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 focus-visible:outline-2 focus-visible:outline-sky-300"
        value={selected?.key ?? ''} onChange={event => {
          setSelection(event.target.value ? { jobId, key: event.target.value } : null);
          setPreview(null); setImported(null);
        }}><option value="">Select a source revision</option>{options.map(item =>
          <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
    <button className={button} onClick={() => {
      setSources(null); setSelection(null); setPreview(null); setImported(null);
      setSourceAttempt(value => value + 1);
    }}>Refresh source revisions</button>
    <div className="flex gap-2">
      <button className={button} disabled={!!task.pending || !selected} onClick={runPreview}>Preview Archive</button>
      <button className={button} disabled={!!task.pending || !preview} onClick={runImport}>Archive Job</button>
    </div>
    {task.pending && <p className="text-xs text-slate-400">Processing...</p>}
    {task.error && <p className="text-xs text-rose-300">{task.error}</p>}
    {preview && <div className="text-xs text-slate-300 space-y-1">
      <p>Preview ready: {preview.artifactCount} artifacts, {(preview.byteSize / 1024 / 1024).toFixed(2)} MB.</p>
      <p>{preview.document.capture.contractStatus === 'legacy-unbound' ? 'Legacy run: core contract unbound.' : 'Core v1 contract bound.'} Model remains unvalidated.</p>
      {preview.quota.approachingLimit && <p className="text-amber-300">Warning: Archive is approaching its capacity limit.</p>}
      <p className="text-slate-500">Archive size: {(preview.quota.totalArchiveSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB / 15 GB</p>
    </div>}
  </div>;
}

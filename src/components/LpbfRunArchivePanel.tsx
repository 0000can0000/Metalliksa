import React, { useEffect, useState } from 'react';
import { useInputBoundTask } from '../hooks/useInputBoundTask';
import { listRuns, getRun, getRestoredRun, listRestoredRuns, previewRun, importRun, exportRunBundle, downloadRunBundle,
  importRunBundle, restoreImportedRunBundle, verifyRunBundle, restoreRunBundle,
  compareNistOpticalRun, listNistProxyCampaigns, previewNistProxyCampaign, createNistProxyCampaign,
  type RunPreview, type RunArchiveList, type ExportedRunBundle, type VerifiedRunBundle,
  type RestoredRunBundle, type ImportedRunBundle, type NistProxyCampaignPreview, type NistProxyCampaignRecord } from '../services/lpbfRunArchiveClient';
import { sourceAction, sourceCatalog } from '../services/lpbfSourceService';
import type { RunRecord, RunSourceLink, NistOpticalCaseNumber, NistOpticalReport } from '../types/lpbfRun';

const button = 'rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-300 disabled:opacity-40';
const RESTORE_ID_STORAGE_KEY = 'metalliksa.lpbf.lastRestoreId.v1';

function savedRestoreId(): string {
  try {
    const value = window.localStorage.getItem(RESTORE_ID_STORAGE_KEY) ?? '';
    return /^[a-f0-9]{32}$/.test(value) ? value : '';
  } catch { return ''; }
}

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
      : <><label className="block text-sm">Archived run<select aria-label="Archived run" className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 focus-visible:outline-2 focus-visible:outline-sky-300" value={selected} onChange={event => setSelected(event.target.value)}>{runs.map(item => <option key={item.runId} value={item.runId}>{item.runId.slice(0,8)}... · {item.runKind} · {item.createdAt}</option>)}</select></label>
        {selected && <ArchivedRunRecord key={selected} runId={selected}/>}</>}
    {runs && <NistProxyCampaign runs={runs} />}
    <RunBundleControls />
  </section>;
}

function RunBundleControls() {
  const [bundleId, setBundleId] = useState('');
  const [portableFile, setPortableFile] = useState<File | null>(null);
  const [restored, setRestored] = useState<RestoredRunBundle | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [restoreSelection, setRestoreSelection] = useState(() => {
    const restoreId = typeof window === 'undefined' ? '' : savedRestoreId();
    return { input: restoreId, active: restoreId };
  });
  const exportTask = useInputBoundTask<ExportedRunBundle>('run-bundle-export');
  const verifyTask = useInputBoundTask<VerifiedRunBundle>(bundleId);
  const restoreTask = useInputBoundTask<RestoredRunBundle>(bundleId);
  const importTask = useInputBoundTask<ImportedRunBundle>(portableFile ? `${portableFile.name}:${portableFile.size}:${portableFile.lastModified}` : 'no-file');
  const importedRestoreTask = useInputBoundTask<RestoredRunBundle>(importTask.data?.importId ?? 'no-import');
  const busy = !!(exportTask.pending || verifyTask.pending || restoreTask.pending || importTask.pending || importedRestoreTask.pending);
  const verified = verifyTask.data?.bundleId === bundleId;
  const downloadableBundleId = verified ? bundleId : exportTask.data?.bundleId;

  const rememberRestore = (restoreId: string) => {
    setRestoreSelection({ input: restoreId, active: restoreId });
    try { window.localStorage.setItem(RESTORE_ID_STORAGE_KEY, restoreId); } catch { /* Session state still keeps the restore accessible. */ }
  };

  const runExport = async () => {
    const request = exportTask.begin('export');
    try {
      const result = await exportRunBundle(request.signal);
      if (request.isCurrent()) setBundleId(result.bundleId);
      request.publish(result);
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const runVerify = async () => {
    const request = verifyTask.begin('verify');
    try { request.publish(await verifyRunBundle(bundleId, request.signal)); }
    catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const runRestore = async () => {
    if (!verified) return;
    const request = restoreTask.begin('restore');
    try {
      const result = await restoreRunBundle(bundleId, request.signal);
      if (request.isCurrent()) rememberRestore(result.restoreId);
      request.publish(result);
    }
    catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const runImport = async () => {
    if (!portableFile) return;
    const request = importTask.begin('verify-import');
    try { request.publish(await importRunBundle(portableFile, request.signal)); }
    catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const runImportedRestore = async () => {
    const imported = importTask.data;
    if (!imported) return;
    const request = importedRestoreTask.begin('restore-import');
    try {
      const result = await restoreImportedRunBundle(imported.importId, request.signal);
      if (request.isCurrent()) { setRestored(result); rememberRestore(result.restoreId); }
      request.publish(result);
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const download = () => {
    if (!downloadableBundleId) return;
    try { downloadRunBundle(downloadableBundleId); setDownloadError(null); }
    catch (error) { setDownloadError(error instanceof Error ? error.message : 'Bundle download failed.'); }
  };

  return <div className="space-y-3 border-t border-slate-700 pt-4" aria-label="Run bundle controls">
    <h4 className="font-medium">Portable run evidence bundle</h4>
    <p className="text-sm text-slate-400">Create and download a portable copy, then upload it on another installation to verify and restore it into an isolated archive. The live run archive remains unchanged.</p>
    <p className="text-xs text-amber-200">Bundle integrity does not validate the model. Runs without archived source links remain legacy-unlinked.</p>
    <button type="button" className={button} disabled={busy} onClick={() => void runExport()}>Create bundle on this installation</button>
    {exportTask.pending && <p role="status">Creating bundle on server…</p>}
    {exportTask.error && <p role="alert" className="text-rose-300">{exportTask.error}</p>}
    {exportTask.data && <p role="status" className="text-emerald-200">Bundle created: {exportTask.data.bundleId}. {exportTask.data.manifest.runCount} runs, {exportTask.data.manifest.artifactCount} run artifacts, {exportTask.data.manifest.sourceLinkCount} source links.</p>}
    {downloadableBundleId && <button type="button" className={button} disabled={busy} onClick={download}>Download portable .tar bundle</button>}
    {downloadError && <p role="alert" className="text-rose-300">{downloadError}</p>}
    <label className="block text-sm">Server-local bundle ID
      <input type="text" aria-label="Server-local bundle ID" spellCheck={false} autoComplete="off" maxLength={32}
        className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm focus-visible:outline-2 focus-visible:outline-sky-300"
        value={bundleId} onChange={event => setBundleId(event.target.value.trim())} placeholder="32-character bundle ID" />
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={busy || !/^[a-f0-9]{32}$/.test(bundleId)} onClick={() => void runVerify()}>Verify bundle</button>
      <button type="button" className={button} disabled={busy || !verified} onClick={() => void runRestore()}>Restore verified copy</button>
    </div>
    {verifyTask.pending && <p role="status">Verifying bundle bytes and references…</p>}
    {verifyTask.error && <p role="alert" className="text-rose-300">{verifyTask.error}</p>}
    {verified && <p role="status" className="text-emerald-200">Bundle verified: {verifyTask.data!.manifest.runCount} runs and {verifyTask.data!.manifest.sourceLinkCount} source links.</p>}
    {restoreTask.pending && <p role="status">Restoring to an isolated server directory…</p>}
    {restoreTask.error && <p role="alert" className="text-rose-300">{restoreTask.error}</p>}
    {restoreTask.data && <p role="status" className="text-emerald-200">Verified copy restored on this server (restore ID: {restoreTask.data.restoreId}). The live archive is unchanged.</p>}
    <div className="space-y-2 border-t border-slate-700 pt-3">
      <h5 className="font-medium">Open an isolated restored archive</h5>
      <label className="block text-sm">Restore ID
        <input type="text" aria-label="Restore ID" spellCheck={false} autoComplete="off" maxLength={32}
          className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm focus-visible:outline-2 focus-visible:outline-sky-300"
          value={restoreSelection.input} onChange={event => setRestoreSelection(current => ({ ...current, input: event.target.value.trim() }))}
          placeholder="32-character restore ID" />
      </label>
      <button type="button" className={button} disabled={busy || !/^[a-f0-9]{32}$/.test(restoreSelection.input)}
        onClick={() => {
          const restoreId = restoreSelection.input;
          setRestoreSelection(current => ({ ...current, active: restoreId }));
          try { window.localStorage.setItem(RESTORE_ID_STORAGE_KEY, restoreId); } catch { /* Session state still keeps the restore accessible. */ }
        }}>Open restored archive</button>
    </div>
    {restoreSelection.active && <RestoredBundleRuns key={restoreSelection.active} restoreId={restoreSelection.active} />}
    <div className="space-y-2 border-t border-slate-700 pt-3">
      <h5 className="font-medium">Restore a portable bundle</h5>
      <label className="block text-sm">Run bundle file
        <input type="file" aria-label="Run bundle file" accept=".tar,application/x-tar" className="mt-2 block w-full text-sm"
          onChange={event => { setPortableFile(event.currentTarget.files?.[0] ?? null); setRestored(null); }} />
      </label>
      <button type="button" className={button} disabled={busy || !portableFile} onClick={() => void runImport()}>Upload and verify bundle</button>
      {importTask.pending && <p role="status">Uploading bundle and checking file hashes, run identities, and source revisions…</p>}
      {importTask.error && <p role="alert" className="text-rose-300">{importTask.error}</p>}
      {importTask.data && <p role="status" className="text-emerald-200">Portable bundle verified: {importTask.data.manifest.runCount} runs, {importTask.data.manifest.artifactCount} run artifacts, {importTask.data.manifest.sourceLinkCount} source links.</p>}
      <button type="button" className={button} disabled={busy || !importTask.data} onClick={() => void runImportedRestore()}>Restore verified bundle into isolated archive</button>
      {importedRestoreTask.pending && <p role="status">Restoring a separate, verified copy…</p>}
      {importedRestoreTask.error && <p role="alert" className="text-rose-300">{importedRestoreTask.error}</p>}
      {restored && <p role="status" className="text-emerald-200">Restored copy is ready to open above (restore ID: {restored.restoreId}).</p>}
    </div>
  </div>;
}

function RestoredBundleRuns({ restoreId }: { restoreId: string }) {
  const [runs, setRuns] = useState<RunArchiveList | null>(null);
  const [runId, setRunId] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    listRestoredRuns(restoreId, controller.signal).then(items => {
      if (!controller.signal.aborted) { setRuns(items); setRunId(items[0]?.runId ?? ''); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Restored records unavailable.'); });
    return () => controller.abort();
  }, [restoreId]);
  return <div className="space-y-2 rounded-lg border border-emerald-500/30 p-3">
    <h5 className="font-medium text-emerald-200">Restored bundle · {restoreId}</h5>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {runs === null && !error ? <p role="status">Loading restored run records…</p>
      : runs?.length === 0 ? <p>No run records are present in this bundle.</p>
      : runs && <>
        <label className="block text-sm">Open a restored run<select aria-label="Open a restored run" className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
          value={runId} onChange={event => setRunId(event.target.value)}>{runs.map(item => <option key={item.runId} value={item.runId}>{item.runId.slice(0, 8)}… · {item.runKind} · {item.createdAt}</option>)}</select></label>
        {runId && <ArchivedRunRecord key={runId} restoreId={restoreId} runId={runId} />}
      </>}
  </div>;
}

function ArchivedRunRecord({ runId, restoreId }: { runId: string; restoreId?: string }) {
  const task = useInputBoundTask<RunRecord>(runId);
  
  const run = async (action: 'current') => {
    const request = task.begin(action);
    try {
      request.publish(restoreId ? await getRestoredRun(restoreId, runId, request.signal) : await getRun(runId, request.signal));
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
      <p>Run kind: {record.runKind}</p>
      <p>Contract: {record.document.capture.contractStatus === 'legacy-unbound' ? 'Legacy run · core contract unbound' : 'Core v1 bound'}</p>
      <p>Source binding: {record.sourceBindingStatus === 'exact-revision-bound' ? 'Exact archived source revision' : 'Legacy run · no archived source revision'}</p>
      <p>Job ID: {record.document.capture.jobId}</p>
      <details><summary className="cursor-pointer font-medium mt-3">Document Payload</summary>
      <pre className="text-xs bg-slate-950 p-3 overflow-auto mt-2 text-slate-300">{JSON.stringify(record.document, null, 2)}</pre>
      </details>
    </div>}
    {record && !restoreId && <NistOpticalComparison record={record} />}
  </div>;
}

const opticalCases: { id: NistOpticalCaseNumber; label: string }[] = [
  { id: '0', label: 'Case 0 · 285 W · 960 mm/s · 67 µm' },
  { id: '1.1', label: 'Case 1.1 · 285 W · 960 mm/s · 49 µm' },
  { id: '1.2', label: 'Case 1.2 · 285 W · 960 mm/s · 82 µm' },
  { id: '2.1', label: 'Case 2.1 · 285 W · 1200 mm/s · 67 µm' },
  { id: '2.2', label: 'Case 2.2 · 285 W · 800 mm/s · 67 µm' },
  { id: '3.1', label: 'Case 3.1 · 325 W · 960 mm/s · 67 µm' },
  { id: '3.2', label: 'Case 3.2 · 245 W · 960 mm/s · 67 µm' },
];

export function NistOpticalComparison({ record }: { record: RunRecord }) {
  const [caseNumber, setCaseNumber] = useState<NistOpticalCaseNumber>('0');
  const requestKey = `${record.document.runId}:${record.documentSha256}:${caseNumber}`;
  const task = useInputBoundTask<NistOpticalReport>(requestKey);
  const link = record.document.sources.find(source => source.datasetId === 'nist-amb2022-03-optical-table4-local-v1');

  const compare = async () => {
    const request = task.begin('compare');
    try { request.publish(await compareNistOpticalRun(record, caseNumber, request.signal)); }
    catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const report = task.data;
  return <section aria-label="NIST optical Table 4 comparison" className="space-y-3 rounded-xl border border-slate-700 p-4 text-sm">
    <div><h4 className="font-medium">NIST AMB2022-03 · optical Table 4</h4>
      <p className="text-xs text-amber-200">Literature-model screening · unvalidated. Table 4 is a local transcription of published aggregate measurements.</p></div>
    <p>Run: <span className="font-mono">{record.document.runId}</span></p>
    <p>Run kind: {record.runKind}</p>
    <p>Core contract: {record.document.capture.contractStatus === 'core-v1-bound' ? 'Bound' : 'Legacy unbound'}</p>
    <p>Archived Table 4 link: {link ? <>revision {link.revision} · document SHA-256 <span className="font-mono break-all">{link.documentSha256}</span></>
      : 'Unavailable · this run has no Table 4 source revision link'}</p>
    <label className="block">Published process case
      <select aria-label="NIST Table 4 case" value={caseNumber}
        className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 focus-visible:outline-2 focus-visible:outline-sky-300"
        onChange={event => setCaseNumber(event.target.value as NistOpticalCaseNumber)}>
        {opticalCases.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <button type="button" className={button} disabled={!!task.pending} onClick={() => void compare()}>Compare archived run</button>
    {task.pending && <p role="status">Checking archived run and Table 4 bytes…</p>}
    {task.error && <p role="alert" className="text-rose-300">{task.error}</p>}
    {report && <NistOpticalResult report={report} />}
  </section>;
}

export function NistOpticalResult({ report }: { report: NistOpticalReport }) {
  return <div aria-live="polite" className="space-y-2">
      <p className="font-medium">{report.status === 'unavailable' ? 'Comparison unavailable' : 'Comparable screening result'} · unvalidated</p>
      <p>Verified Table 4 binding: {report.sourceBinding
        ? <>revision {report.sourceBinding.revision} · document SHA-256 <span className="font-mono break-all">{report.sourceBinding.documentSha256}</span></>
        : 'Unavailable'}</p>
      {report.status === 'unavailable' ? <ul className="list-disc space-y-1 pl-5 text-amber-200">
        {report.reasons.map((reason, index) => <li key={`${index}:${reason}`}>{reason}</li>)}
      </ul> : report.errors && <div className="space-y-1 text-slate-200">
        {(['width', 'depth'] as const).map(quantity => <p key={quantity}>
          {quantity === 'width' ? 'Width' : 'Depth'}: signed error {report.errors![quantity].signed_um.toFixed(2)} µm;
          absolute error {report.errors![quantity].absolute_um.toFixed(2)} µm;
          measured mean {report.errors![quantity].measuredMean_um.toFixed(2)} µm;
          published SD {report.errors![quantity].publishedStdDev_um.toFixed(2)} µm.
        </p>)}
      </div>}
    </div>;
}

const proxyCampaignCases: { id: NistOpticalCaseNumber; label: string }[] = [
  { id: '0', label: 'Case 0 · 285 W · 960 mm/s · 67 µm' },
  { id: '1.1', label: 'Case 1.1 · 285 W · 960 mm/s · 49 µm' },
  { id: '1.2', label: 'Case 1.2 · 285 W · 960 mm/s · 82 µm' },
  { id: '2.1', label: 'Case 2.1 · 285 W · 1200 mm/s · 67 µm' },
  { id: '2.2', label: 'Case 2.2 · 285 W · 800 mm/s · 67 µm' },
  { id: '3.1', label: 'Case 3.1 · 325 W · 960 mm/s · 67 µm' },
  { id: '3.2', label: 'Case 3.2 · 245 W · 960 mm/s · 67 µm' },
];

export function NistProxyCampaign({ runs }: { runs: RunArchiveList }) {
  const candidates = runs.filter(run => run.runKind === 'transient-thermal');
  const [savedCampaigns, setSavedCampaigns] = useState<NistProxyCampaignRecord[]>([]);
  const [savedCampaignError, setSavedCampaignError] = useState<string | null>(null);
  const candidateKey = candidates.map(run => run.runId).join(':');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>(() => candidates.slice(0, 3).map(run => run.runId));
  const [caseNumber, setCaseNumber] = useState<NistOpticalCaseNumber>('0');
  const [selectionKey, setSelectionKey] = useState(candidateKey);
  const currentRunIds = selectionKey === candidateKey ? selectedRunIds : candidates.slice(0, 3).map(run => run.runId);
  useEffect(() => {
    if (selectionKey !== candidateKey) {
      setSelectedRunIds(candidates.slice(0, 3).map(run => run.runId));
      setSelectionKey(candidateKey);
    }
  }, [candidateKey, selectionKey]);
  const inputKey = `${currentRunIds.join(':')}:${caseNumber}`;
  const previewTask = useInputBoundTask<NistProxyCampaignPreview>(inputKey);
  const createTask = useInputBoundTask<{ preview: NistProxyCampaignPreview; record: NistProxyCampaignRecord | null }>(inputKey);
  const canPreview = currentRunIds.length === 3 && currentRunIds.every(Boolean)
    && new Set(currentRunIds).size === 3 && candidates.length >= 3;
  const preview = previewTask.data;
  const saved = createTask.data?.record ?? null;

  useEffect(() => {
    const controller = new AbortController();
    listNistProxyCampaigns(controller.signal).then(items => {
      if (!controller.signal.aborted) setSavedCampaigns(items);
    }).catch(error => {
      if (!controller.signal.aborted) setSavedCampaignError(error instanceof Error ? error.message : 'Saved proxy campaigns unavailable.');
    });
    return () => controller.abort();
  }, []);

  const runPreview = async () => {
    if (!canPreview) return;
    const request = previewTask.begin('preview');
    try { request.publish(await previewNistProxyCampaign(currentRunIds, caseNumber, request.signal)); }
    catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  const saveCampaign = async () => {
    if (!preview?.campaign || !preview.previewSha256) return;
    const request = createTask.begin('save');
    try {
      const result = await createNistProxyCampaign(currentRunIds, caseNumber, preview.previewSha256, request.signal);
      request.publish({ preview: result, record: result.record ?? null });
      if (result.record) setSavedCampaigns(current => [result.record!, ...current.filter(item => item.campaignId !== result.record!.campaignId)]);
    } catch (error) { request.fail(error); }
    finally { request.finish(); }
  };

  return <section aria-label="NIST proxy campaign" className="space-y-3 rounded-xl border border-slate-700 p-4 text-sm">
    <div><h4 className="font-medium">NIST AMB2022-03 · six-section thermal proxy campaign</h4>
      <p className="mt-1 text-xs text-amber-200">Proxy screening only · unvalidated. This flow records six simulated section observations from three archived runs. It does not calculate optical residuals or claim experimental validation.</p></div>
    {candidates.length < 3 ? <p className="text-slate-300">Three archived transient-thermal runs are required. Available: {candidates.length}.</p>
      : <>
        {currentRunIds.map((runId, index) => <label key={index} className="block">Archived thermal run {index + 1}
          <select aria-label={`Archived thermal run ${index + 1}`} value={runId}
            className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 focus-visible:outline-2 focus-visible:outline-sky-300"
            onChange={event => setSelectedRunIds(current => current.map((value, row) => row === index ? event.target.value : value))}>
            <option value="">Select an archived run</option>{candidates.map(item => <option key={item.runId} value={item.runId}
              disabled={currentRunIds.some((chosen, row) => row !== index && chosen === item.runId)}>{item.runId.slice(0, 8)}… · {item.createdAt}</option>)}
          </select>
        </label>)}
        <label className="block">Published process case
          <select aria-label="NIST proxy campaign case" value={caseNumber}
            className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 focus-visible:outline-2 focus-visible:outline-sky-300"
            onChange={event => setCaseNumber(event.target.value as NistOpticalCaseNumber)}>
            {proxyCampaignCases.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={!canPreview || !!previewTask.pending || !!createTask.pending}
            onClick={() => void runPreview()}>Preview proxy campaign</button>
          <button type="button" className={button} disabled={!preview?.campaign || !preview.previewSha256 || !!previewTask.pending || !!createTask.pending}
            onClick={() => void saveCampaign()}>Archive proxy campaign</button>
        </div>
        {previewTask.pending && <p role="status">Checking the three archived runs and exact Table 4 source revision…</p>}
        {previewTask.error && <p role="alert" className="text-rose-300">{previewTask.error}</p>}
        {preview && <ProxyCampaignSummary result={preview} />}
        {createTask.pending && <p role="status">Saving the immutable proxy campaign record…</p>}
        {createTask.error && <p role="alert" className="text-rose-300">{createTask.error}</p>}
        {saved && <p role="status" className="text-emerald-200">Proxy campaign archived: {saved.campaignId} · SHA-256 {saved.documentSha256}. Status remains unvalidated.</p>}
      </>}
    {savedCampaignError && <p role="alert" className="text-rose-300">Saved proxy campaign archive unavailable: {savedCampaignError}</p>}
    {savedCampaigns.length > 0 && <div aria-label="Saved NIST proxy campaigns" className="space-y-2 border-t border-slate-700 pt-3">
      <h5 className="font-medium">Saved proxy campaigns · unvalidated</h5>
      {savedCampaigns.map(record => <details key={record.campaignId} className="rounded-lg border border-slate-700 p-3">
        <summary className="cursor-pointer">Case {record.document.caseNumber} · {record.createdAt} · {record.campaignId.slice(0, 8)}…</summary>
        <p className="mt-2 text-xs text-slate-300">Thermal proxy screening only · no experimental validation · no optical residuals · SHA-256 {record.documentSha256}</p>
        <ul className="mt-2 space-y-1">{record.document.tracks.flatMap(track => track.observations.map(observation =>
          <li key={`${track.simulatedTrackId}:${observation.sectionId}`}>{track.runIdentity.runId.slice(0, 8)}… · {observation.distanceFromScanStart_mm} mm · simulated width {observation.geometry.width_um.toFixed(2)} µm · depth {observation.geometry.depth_um.toFixed(2)} µm</li>))}</ul>
      </details>)}
    </div>}
  </section>;
}

function ProxyCampaignSummary({ result }: { result: NistProxyCampaignPreview }) {
  if (!result.campaign) return <div className="space-y-2" role="status">
    <p className="font-medium text-amber-200">Proxy campaign unavailable · unvalidated</p>
    <ul className="list-disc space-y-1 pl-5 text-amber-200">{result.validation.reasons.map((reason, index) => <li key={`${index}:${reason}`}>{reason}</li>)}</ul>
  </div>;
  return <div className="space-y-2" aria-live="polite">
    <p className="font-medium">Six thermal-proxy observations · proxy screening only · unvalidated</p>
    <p>Case {result.campaign.caseNumber}; exact archived Table 4 revision {result.campaign.sourceBinding.revision}.</p>
    <p className="text-xs text-slate-300">Experimental validation: no · numerical convergence: not evaluated · comparison residuals: not calculated.</p>
    <ul className="space-y-1 text-slate-200">{result.campaign.tracks.flatMap(track => track.observations.map(observation =>
      <li key={`${track.simulatedTrackId}:${observation.sectionId}`}>
        {track.runIdentity.runId.slice(0, 8)}… · {observation.sectionId === 'x-4p9mm' ? '4.9' : '6.0'} mm · simulated width {observation.geometry.width_um.toFixed(2)} µm · depth {observation.geometry.depth_um.toFixed(2)} µm
      </li>))}</ul>
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
      <p>Run kind: {preview.document.capture.runKind ?? 'legacy-unspecified'}.</p>
      <p>{preview.document.capture.contractStatus === 'legacy-unbound' ? 'Legacy run: core contract unbound.' : 'Core v1 contract bound.'} Model remains unvalidated.</p>
      {preview.quota.approachingLimit && <p className="text-amber-300">Warning: Archive is approaching its capacity limit.</p>}
      <p className="text-slate-500">Archive size: {(preview.quota.totalArchiveSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB / 15 GB</p>
    </div>}
  </div>;
}

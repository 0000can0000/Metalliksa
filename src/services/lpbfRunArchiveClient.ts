import type { RunRecord, RunSourceLink, RunDocument, RunSourceBindingStatus, RunKind,
  NistOpticalCaseNumber, NistOpticalReport } from '../types/lpbfRun';

export interface RunPreview {
  document: RunDocument;
  artifactCount: number;
  byteSize: number;
  artifactIntegrity: 'verified-at-dry-run';
  sourceBindingStatus: 'exact-revision-bound';
  quota: {
    totalArchiveSizeBytes: number;
    maxArchiveSizeBytes: number;
    approachingLimit: boolean;
  };
}

export type RunArchiveList = { runId: string; createdAt: string; evidenceStatus: 'unvalidated-model'; sourceBindingStatus: RunSourceBindingStatus; runKind: RunKind }[];

export interface RunBundleManifest {
  schemaVersion: 1;
  kind: 'metalliksa-lpbf-run-bundle';
  metadata: { sha256: string; byteSize: number };
  sourceBundle: { sha256: string; byteSize: number };
  runCount: number;
  artifactCount: number;
  sourceLinkCount: number;
}

export interface ExportedRunBundle {
  bundleId: string;
  storage: 'server-local-directory';
  manifest: RunBundleManifest;
  verified?: true;
  restoreId?: string;
}

export interface VerifiedRunBundle extends ExportedRunBundle { verified: true }
export interface RestoredRunBundle extends VerifiedRunBundle { restoreId: string }

const invalid = () => new Error('Invalid run archive response. Reload before retrying.');
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const jobId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const sha = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const bundleId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const bindingStatus = (value: unknown): value is RunSourceBindingStatus =>
  value === 'exact-revision-bound' || value === 'legacy-unlinked';
const runKind = (value: unknown): value is RunKind =>
  value === 'analytical-screening' || value === 'build-screening'
  || value === 'transient-thermal' || value === 'bounded-material-screening' || value === 'legacy-unspecified';
const opticalCases = new Set<string>(['0', '1.1', '1.2', '2.1', '2.2', '3.1', '3.2']);
const opticalDatasetId = 'nist-amb2022-03-optical-table4-local-v1';
const opticalArtifactSha = 'd1b36dfa2e01a3537093c481e249ce52df6b8879c1c67480ddb9aa10799133da';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const sameSources = (actual: RunSourceLink[], expected: RunSourceLink[]) =>
  actual.length === expected.length && actual.every((source, index) =>
    source.datasetId === expected[index].datasetId
    && source.revision === expected[index].revision
    && source.documentSha256 === expected[index].documentSha256);

function documentIdentity(value: unknown, expectedJobId?: string): asserts value is RunDocument {
  if (!object(value) || value.schemaVersion !== 1 || !jobId(value.runId)
    || !object(value.capture) || value.capture.schemaVersion !== 1
    || !jobId(value.capture.jobId) || value.runId !== value.capture.jobId
    || (expectedJobId !== undefined && value.runId !== expectedJobId)
    || !['core-v1-bound', 'legacy-unbound'].includes(value.capture.contractStatus as string)
    || (value.capture.runKind !== undefined && !runKind(value.capture.runKind))
    || !['resultJson', 'inputJson', 'materialJson'].every(field => typeof value.capture[field] === 'string')
    || !Array.isArray(value.sources) || value.sources.some(source => !object(source)
      || typeof source.datasetId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(source.datasetId)
      || !Number.isSafeInteger(source.revision) || (source.revision as number) < 1 || !sha(source.documentSha256))) throw invalid();
  try {
    const result: unknown = JSON.parse(value.capture.resultJson as string);
    JSON.parse(value.capture.inputJson as string); JSON.parse(value.capture.materialJson as string);
    const capturedKind = object(result) && result.runKind === undefined ? 'legacy-unspecified'
      : object(result) ? result.runKind : undefined;
    if (!runKind(capturedKind) || (value.capture.runKind !== undefined && value.capture.runKind !== capturedKind)
      || (value.capture.runKind === undefined) !== (capturedKind === 'legacy-unspecified' && object(result) && result.runKind === undefined)) throw invalid();
  } catch { throw invalid(); }
}

function recordIdentity(value: unknown, expectedJobId: string): asserts value is RunRecord {
  if (!object(value)) throw invalid();
  documentIdentity(value.document, expectedJobId);
  if (!sha(value.documentSha256) || !date(value.createdAt) || value.evidenceStatus !== 'unvalidated-model'
    || !runKind(value.runKind)
    || value.runKind !== (value.document.capture.runKind ?? 'legacy-unspecified')
    || !bindingStatus(value.sourceBindingStatus)
    || value.sourceBindingStatus !== (value.document.sources.length ? 'exact-revision-bound' : 'legacy-unlinked')) throw invalid();
}

async function request(path: string, signal: AbortSignal, body?: object) {
  const response = await fetch(`/api/lpbf/runs${path}`, { signal, cache: 'no-store',
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  if (!response.ok) {
    throw new Error(`Run archive request failed (${response.status}).`);
  }
  return response.json();
}

function bundleManifest(value: unknown): asserts value is RunBundleManifest {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'metalliksa-lpbf-run-bundle'
    || !object(value.metadata) || !sha(value.metadata.sha256) || !count(value.metadata.byteSize)
    || !object(value.sourceBundle) || !sha(value.sourceBundle.sha256) || !count(value.sourceBundle.byteSize)
    || !count(value.runCount) || !count(value.artifactCount) || !count(value.sourceLinkCount)) throw invalid();
}

async function bundleRequest(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/lpbf/runs/bundles${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    signal, cache: 'no-store',
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = object(body) && typeof body.error === 'string' ? ` ${body.error}` : '';
    throw new Error(`Run bundle request failed (${response.status}).${detail}`);
  }
  return response.json();
}

function exportedBundle(value: unknown, expectedId?: string): asserts value is ExportedRunBundle {
  if (!object(value) || !bundleId(value.bundleId) || value.storage !== 'server-local-directory'
    || (expectedId !== undefined && value.bundleId !== expectedId)) throw invalid();
  bundleManifest(value.manifest);
}

export async function exportRunBundle(signal: AbortSignal): Promise<ExportedRunBundle> {
  const result: unknown = await bundleRequest('/export', signal);
  exportedBundle(result);
  return result;
}

export async function verifyRunBundle(id: string, signal: AbortSignal): Promise<VerifiedRunBundle> {
  if (!bundleId(id)) throw new Error('Enter a valid 32-character bundle ID.');
  const result: unknown = await bundleRequest(`/${id}/verify`, signal);
  exportedBundle(result, id);
  if (result.verified !== true) throw invalid();
  return result as VerifiedRunBundle;
}

export async function restoreRunBundle(id: string, signal: AbortSignal): Promise<RestoredRunBundle> {
  if (!bundleId(id)) throw new Error('Enter a valid 32-character bundle ID.');
  const result: unknown = await bundleRequest(`/${id}/restore`, signal);
  exportedBundle(result, id);
  if (result.verified !== true || !bundleId(result.restoreId)) throw invalid();
  return result as RestoredRunBundle;
}

export async function listRuns(signal: AbortSignal): Promise<RunArchiveList> {
  const result: unknown = await request('', signal);
  if (!Array.isArray(result) || result.some(item => !object(item) || !jobId(item.runId)
    || !date(item.createdAt) || item.evidenceStatus !== 'unvalidated-model'
    || !runKind(item.runKind)
    || !bindingStatus(item.sourceBindingStatus))) throw invalid();
  return result;
}

export async function getRun(runId: string, signal: AbortSignal): Promise<RunRecord> {
  const result: unknown = await request(`/${encodeURIComponent(runId)}`, signal);
  recordIdentity(result, runId);
  return result;
}

function opticalError(value: unknown): boolean {
  if (!object(value) || !finite(value.signed_um) || !finite(value.absolute_um)
    || !finite(value.measuredMean_um) || !finite(value.publishedStdDev_um) || !finite(value.model_um)
    || value.absolute_um < 0 || value.measuredMean_um <= 0 || value.publishedStdDev_um <= 0
    || value.model_um <= 0) return false;
  return Math.abs(value.absolute_um - Math.abs(value.signed_um)) < 1e-6
    && Math.abs(value.model_um - value.measuredMean_um - value.signed_um) < 1e-6;
}

function opticalReport(value: unknown, run: RunRecord, caseNumber: NistOpticalCaseNumber): asserts value is NistOpticalReport {
  if (!object(value) || value.schemaVersion !== 1 || value.benchmark !== 'AMB2022-03-TMPG'
    || value.caseNumber !== caseNumber || value.validationStatus !== 'unvalidated'
    || !['unavailable', 'comparable-screening'].includes(value.status as string)
    || !object(value.reference) || value.reference.doi !== '10.18434/mds2-2718'
    || typeof value.reference.results !== 'string' || typeof value.reference.methods !== 'string'
    || !Array.isArray(value.reasons) || value.reasons.some(reason => typeof reason !== 'string' || !reason.trim())) throw invalid();
  if (value.sourceBinding !== null) {
    const source = value.sourceBinding;
    if (!object(source) || source.datasetId !== opticalDatasetId || source.sourceDatasetId !== 'nist-mds2-2718'
      || source.artifactSha256 !== opticalArtifactSha || !Number.isSafeInteger(source.revision)
      || !sha(source.documentSha256)
      || !run.document.sources.some(link => link.datasetId === source.datasetId
        && link.revision === source.revision && link.documentSha256 === source.documentSha256)) throw invalid();
  }
  if (value.status === 'unavailable') {
    if (value.errors !== null || value.reasons.length === 0) throw invalid();
  } else if (value.reasons.length !== 0 || value.sourceBinding === null || !object(value.errors)
    || !opticalError(value.errors.width) || !opticalError(value.errors.depth)) throw invalid();
}

export async function compareNistOpticalRun(run: RunRecord, caseNumber: NistOpticalCaseNumber,
  signal: AbortSignal): Promise<NistOpticalReport> {
  if (!jobId(run.document.runId) || !opticalCases.has(caseNumber)) throw new Error('Select a valid archived run and Table 4 case.');
  const result: unknown = await request(`/${run.document.runId}/nist-comparison`, signal, { caseNumber });
  opticalReport(result, run, caseNumber);
  return result;
}

export async function previewRun(jobId: string, sources: RunSourceLink[], signal: AbortSignal): Promise<RunPreview> {
  const result: unknown = await request('/preview', signal, { jobId, sources });
  if (!object(result)) throw invalid();
  documentIdentity(result.document, jobId);
  if (result.sourceBindingStatus !== 'exact-revision-bound' || result.document.sources.length === 0
    || !sameSources(result.document.sources, sources)
    || result.artifactIntegrity !== 'verified-at-dry-run' || !count(result.artifactCount)
    || !count(result.byteSize) || !object(result.quota)
    || !count(result.quota.totalArchiveSizeBytes) || !count(result.quota.maxArchiveSizeBytes)
    || result.quota.maxArchiveSizeBytes < result.quota.totalArchiveSizeBytes
    || typeof result.quota.approachingLimit !== 'boolean') throw invalid();
  return result as unknown as RunPreview;
}

export async function importRun(jobId: string, sources: RunSourceLink[], signal: AbortSignal): Promise<RunRecord> {
  const result: unknown = await request('/import', signal, { jobId, sources });
  recordIdentity(result, jobId);
  if (!sameSources(result.document.sources, sources)) throw invalid();
  return result;
}

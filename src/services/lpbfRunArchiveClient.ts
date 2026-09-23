import type { RunRecord, RunSourceLink, RunDocument, RunSourceBindingStatus } from '../types/lpbfRun';

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

export type RunArchiveList = { runId: string; createdAt: string; evidenceStatus: 'unvalidated-model'; sourceBindingStatus: RunSourceBindingStatus }[];

const invalid = () => new Error('Invalid run archive response. Reload before retrying.');
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const jobId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const sha = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const bindingStatus = (value: unknown): value is RunSourceBindingStatus =>
  value === 'exact-revision-bound' || value === 'legacy-unlinked';
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
    || !['resultJson', 'inputJson', 'materialJson'].every(field => typeof value.capture[field] === 'string')
    || !Array.isArray(value.sources) || value.sources.some(source => !object(source)
      || typeof source.datasetId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(source.datasetId)
      || !Number.isSafeInteger(source.revision) || (source.revision as number) < 1 || !sha(source.documentSha256))) throw invalid();
  try {
    for (const field of ['resultJson', 'inputJson', 'materialJson']) JSON.parse(value.capture[field] as string);
  } catch { throw invalid(); }
}

function recordIdentity(value: unknown, expectedJobId: string): asserts value is RunRecord {
  if (!object(value)) throw invalid();
  documentIdentity(value.document, expectedJobId);
  if (!sha(value.documentSha256) || !date(value.createdAt) || value.evidenceStatus !== 'unvalidated-model'
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

export async function listRuns(signal: AbortSignal): Promise<RunArchiveList> {
  const result: unknown = await request('', signal);
  if (!Array.isArray(result) || result.some(item => !object(item) || !jobId(item.runId)
    || !date(item.createdAt) || item.evidenceStatus !== 'unvalidated-model'
    || !bindingStatus(item.sourceBindingStatus))) throw invalid();
  return result;
}

export async function getRun(runId: string, signal: AbortSignal): Promise<RunRecord> {
  const result: unknown = await request(`/${encodeURIComponent(runId)}`, signal);
  recordIdentity(result, runId);
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

import type { RunRecord, RunSourceLink, RunDocument } from '../types/lpbfRun';

export interface RunPreview {
  document: RunDocument;
  artifactCount: number;
  byteSize: number;
  artifactIntegrity: 'verified-at-dry-run';
  quota: {
    totalArchiveSizeBytes: number;
    maxArchiveSizeBytes: number;
    approachingLimit: boolean;
  };
}

export type RunArchiveList = { runId: string; createdAt: string; evidenceStatus: string }[];

async function request(path: string, signal: AbortSignal, body?: object) {
  const response = await fetch(`/api/lpbf/runs${path}`, { signal, cache: 'no-store',
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  if (!response.ok) {
    throw new Error(`Run archive request failed (${response.status}).`);
  }
  return response.json();
}

export async function listRuns(signal: AbortSignal): Promise<RunArchiveList> {
  const result = await request('', signal);
  if (!Array.isArray(result)) throw new Error('Invalid run archive list response');
  return result;
}

export async function getRun(runId: string, signal: AbortSignal): Promise<RunRecord> {
  const result = await request(`/${encodeURIComponent(runId)}`, signal);
  if (!result || result.document?.runId !== runId) throw new Error('Invalid run record response');
  return result;
}

export async function previewRun(jobId: string, sources: RunSourceLink[], signal: AbortSignal): Promise<RunPreview> {
  const result = await request('/preview', signal, { jobId, sources });
  if (!result || result.artifactIntegrity !== 'verified-at-dry-run') throw new Error('Invalid preview response');
  return result;
}

export async function importRun(jobId: string, sources: RunSourceLink[], signal: AbortSignal): Promise<RunRecord> {
  const result = await request('/import', signal, { jobId, sources });
  if (!result || !result.document) throw new Error('Invalid import response');
  return result;
}

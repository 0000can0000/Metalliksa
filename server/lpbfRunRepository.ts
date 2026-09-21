/** Immutable run snapshots. Integrity checks are not scientific validation. */
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { DatabaseSync, backup } from 'node:sqlite';
import { parseSimulationJob } from '../src/services/lpbfSimulationService';
import { artifactRelativePath } from './lpbfArtifactStore';

export interface RunCapture {
  schemaVersion: 1; jobId: string; resultJson: string; inputJson: string; materialJson: string;
  contractStatus: 'core-v1-bound' | 'legacy-unbound';
}
export interface RunSourceLink { datasetId: string; revision: number; documentSha256: string }
export interface RunDocument { schemaVersion: 1; runId: string; capture: RunCapture; sources: RunSourceLink[] }
export interface RunRecord { document: RunDocument; documentSha256: string; createdAt: string; evidenceStatus: 'unvalidated-model' }
const MAX_BYTES = 32 * 1024 * 1024;
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function keys(value: any, fields: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== fields.length || fields.some(key => !Object.hasOwn(value, key))) throw new Error('Invalid run fields');
}
function finite(value: unknown, depth = 0): void {
  if (depth > 48) throw new Error('Run JSON too deeply nested');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach(v => finite(v, depth + 1)); return; }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    Object.values(value).forEach(v => finite(v, depth + 1)); return;
  }
  throw new Error('Run requires finite JSON values');
}
function snapshot(value: unknown): any {
  if (typeof value !== 'string' || Buffer.byteLength(value) > MAX_BYTES / 2) throw new Error('Invalid run snapshot size');
  const parsed = JSON.parse(value); finite(parsed); return parsed;
}

export function validateRunDocument(raw: unknown): RunDocument {
  finite(raw);
  const json = JSON.stringify(raw);
  if (Buffer.byteLength(json) > MAX_BYTES) throw new Error('Run document too large');
  const d = JSON.parse(json);
  keys(d, ['schemaVersion', 'runId', 'capture', 'sources']);
  keys(d.capture, ['schemaVersion', 'jobId', 'resultJson', 'inputJson', 'materialJson', 'contractStatus']);
  const c = d.capture;
  if (d.schemaVersion !== 1 || c.schemaVersion !== 1 || typeof d.runId !== 'string'
    || !/^[a-f0-9]{32}$/.test(d.runId) || d.runId !== c.jobId) throw new Error('Invalid run identity');
  const result = snapshot(c.resultJson);
  if (!result.verdict) { // Not a build-job
    parseSimulationJob({ id: c.jobId, status: 'completed', progress: 1, log: '', error: null, result });
  }
  if (!isDeepStrictEqual(snapshot(c.inputJson), result.settings)
    || !isDeepStrictEqual(snapshot(c.materialJson), result.material)) throw new Error('Run snapshot identity mismatch');
  const bound = Object.hasOwn(result, 'coreContract');
  if (c.contractStatus !== (bound ? 'core-v1-bound' : 'legacy-unbound')) throw new Error('Invalid run contract status');
  // Hash Python's exact serialized bytes, not a JavaScript serialization of its numbers.
  if (bound && (digest(c.inputJson) !== result.coreContract.inputSha256
    || digest(c.materialJson) !== result.coreContract.materialSha256)) throw new Error('Run core hash binding mismatch');
  if (!Array.isArray(result.artifacts) || result.artifacts.length > 10000) throw new Error('Missing full run artifact manifest');
  const names = new Set<string>();
  for (const ref of result.artifacts) {
    keys(ref, ['path', 'size_bytes', 'sha256']); artifactRelativePath(ref.path);
    if (names.has(ref.path.toLowerCase()) || ['result.json', 'result.tmp', 'progress.log'].includes(ref.path)
      || !hash(ref.sha256) || !Number.isSafeInteger(ref.size_bytes) || ref.size_bytes < 0) throw new Error('Invalid run artifact manifest');
    names.add(ref.path.toLowerCase());
  }
  if (!Array.isArray(d.sources) || d.sources.length > 100) throw new Error('Invalid run source links');
  const links = new Set<string>();
  for (const link of d.sources) {
    keys(link, ['datasetId', 'revision', 'documentSha256']);
    if (typeof link.datasetId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(link.datasetId)
      || !Number.isSafeInteger(link.revision) || link.revision < 1 || !hash(link.documentSha256)
      || links.has(`${link.datasetId}:${link.revision}`)) throw new Error('Invalid or duplicate source link');
    links.add(`${link.datasetId}:${link.revision}`);
  }
  return d;
}

function decode(row: any): RunRecord {
  try {
    if (typeof row.document_json !== 'string' || Buffer.byteLength(row.document_json) > MAX_BYTES
      || digest(row.document_json) !== row.document_sha256 || typeof row.created_at !== 'string'
      || !Number.isFinite(Date.parse(row.created_at))) throw new Error('Invalid row');
    const document = validateRunDocument(JSON.parse(row.document_json));
    if (document.runId !== row.run_id) throw new Error('Identity mismatch');
    return { document, documentSha256: row.document_sha256, createdAt: row.created_at, evidenceStatus: 'unvalidated-model' };
  } catch { throw new Error('Run metadata integrity failed; existing records preserved'); }
}

export class LpbfRunRepository {
  private readonly db: DatabaseSync;
  private closed = false;
  private backingUp = false;
  constructor(readonly filename: string, options: { readOnly?: boolean } = {}) {
    this.db = new DatabaseSync(filename, { readOnly: options.readOnly ?? false });
    try {
      const version = this.db.prepare('PRAGMA user_version').get()!.user_version;
      if (version === 0) {
        if (options.readOnly || this.db.prepare("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").get()) throw new Error('Unrecognized run database');
        this.db.exec(`BEGIN IMMEDIATE;
          CREATE TABLE lpbf_runs (run_id TEXT PRIMARY KEY, document_json TEXT NOT NULL,
            document_sha256 TEXT NOT NULL, created_at TEXT NOT NULL) STRICT;
          CREATE TABLE lpbf_metadata (kind TEXT PRIMARY KEY) STRICT;
          INSERT INTO lpbf_metadata VALUES ('metalliksa-lpbf-runs-v1');
          PRAGMA user_version=1; COMMIT;`);
      } else if (version !== 1) throw new Error('Unsupported run database version');
      if (this.db.prepare('SELECT kind FROM lpbf_metadata').get()?.kind !== 'metalliksa-lpbf-runs-v1') throw new Error('Invalid run database identity');
      if (options.readOnly) {
        if (this.db.prepare('PRAGMA integrity_check').get()!.integrity_check !== 'ok') throw new Error('Run database integrity failed');
      } else this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=250; PRAGMA max_page_count=262144;');
    } catch (error) { this.db.close(); throw error; }
  }
  close() {
    if (this.backingUp) throw new Error('Run backup in progress');
    if (!this.closed) { this.db.close(); this.closed = true; }
  }
  get(runId: string): RunRecord | null {
    if (!/^[a-f0-9]{32}$/.test(runId)) throw new Error('Invalid run id');
    const row = this.db.prepare('SELECT * FROM lpbf_runs WHERE run_id=?').get(runId);
    return row ? decode(row) : null;
  }
  *allRuns(): Generator<RunRecord> {
    for (const row of this.db.prepare('SELECT * FROM lpbf_runs ORDER BY run_id').iterate()) yield decode(row);
  }
  /** Metadata-only boundary; importRun performs source and byte checks first. */
  save(raw: unknown): RunRecord {
    if (this.backingUp) throw new Error('Run backup in progress');
    const document = validateRunDocument(raw), json = JSON.stringify(document);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.get(document.runId)) throw new Error('Run identity conflict; immutable record already exists');
      const createdAt = new Date().toISOString(), documentSha256 = digest(json);
      this.db.prepare('INSERT INTO lpbf_runs VALUES (?, ?, ?, ?)').run(document.runId, json, documentSha256, createdAt);
      this.db.exec('COMMIT'); return { document, documentSha256, createdAt, evidenceStatus: 'unvalidated-model' };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async backupMetadata(directory: string): Promise<{ path: string; artifactPayloadsIncluded: false }> {
    if (this.closed || this.backingUp) throw new Error('Run repository closed or backing up');
    mkdirSync(directory); this.backingUp = true;
    const filename = path.join(directory, 'runs.sqlite');
    try {
      await backup(this.db, filename);
      const copied = new DatabaseSync(filename);
      try { copied.exec('PRAGMA journal_mode=DELETE'); } finally { copied.close(); }
      const check = new LpbfRunRepository(filename, { readOnly: true });
      try { for (const record of check.allRuns()) void record; } finally { check.close(); }
      return { path: filename, artifactPayloadsIncluded: false };
    } finally { this.backingUp = false; }
  }
}

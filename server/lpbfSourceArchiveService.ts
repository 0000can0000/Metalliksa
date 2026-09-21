import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { artifactDirectory, LpbfArtifactStore } from './lpbfArtifactStore';
import { LpbfSourceRepository, validateSourceDocument } from './lpbfSourceRepository';
import { dryRunSourceImport, importSource } from './lpbfSourceImport';
import { nistIn718CatalogEntry, type LpbfSourceCatalogEntry } from './lpbfSourceCatalog';

export class LpbfSourceArchiveError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const digest = (document: unknown) => createHash('sha256').update(JSON.stringify(document)).digest('hex');

export class LpbfSourceArchiveService {
  private busy = false;
  constructor(private readonly storageRoot = path.resolve(process.env.METALLIKSA_LPBF_SOURCE_ROOT || '.lpbf-sources'),
    private readonly entries: LpbfSourceCatalogEntry[] = [nistIn718CatalogEntry()]) {}

  catalog() { return { sources: this.entries.map(({ datasetId, title }) => ({ datasetId, title })) }; }

  private entry(datasetId: string) {
    const entry = this.entries.find(item => item.datasetId === datasetId);
    if (!entry) throw new LpbfSourceArchiveError(404, 'Source dataset is not in the local catalog.');
    return entry;
  }

  private document(datasetId: string) {
    const entry = this.entry(datasetId);
    const document = validateSourceDocument(entry.loadDocument());
    if (document.datasetId !== datasetId) throw new Error('Catalog dataset identity mismatch');
    return { entry, document };
  }

  private repository(readOnly: boolean) {
    const filename = path.join(this.storageRoot, 'metadata.sqlite');
    if (readOnly) {
      try { lstatSync(this.storageRoot); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
      artifactDirectory(this.storageRoot);
      try { lstatSync(filename); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    } else artifactDirectory(this.storageRoot, true);
    try {
      const stat = lstatSync(filename);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Invalid source database file');
    } catch (error) { if (readOnly || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    return new LpbfSourceRepository(filename, { readOnly });
  }

  current(datasetId: string) {
    this.entry(datasetId);
    const repository = this.repository(true);
    try { return { current: repository?.current(datasetId) ?? null }; }
    finally { repository?.close(); }
  }

  private async exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (this.busy) throw new LpbfSourceArchiveError(409, 'A source archive operation is already running.');
    this.busy = true;
    try { return await action(); } finally { this.busy = false; }
  }

  preview(datasetId: string) {
    return this.exclusive(async () => {
      const { entry, document } = this.document(datasetId);
      const expectedRevision = this.current(datasetId).current?.revision ?? 0;
      const result = await dryRunSourceImport(document, entry.sourceRoot);
      return { ...result, documentSha256: digest(document), expectedRevision };
    });
  }

  import(datasetId: string, expectedRevision: number, documentSha256: string) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER
      || typeof documentSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(documentSha256)) {
      throw new LpbfSourceArchiveError(400, 'A valid preview hash and expected revision are required.');
    }
    return this.exclusive(async () => {
      const { entry, document } = this.document(datasetId);
      if (digest(document) !== documentSha256 || (this.current(datasetId).current?.revision ?? 0) !== expectedRevision) {
        throw new LpbfSourceArchiveError(409, 'Source or stored revision changed. Preview again before importing.');
      }
      // Do not even initialize storage until all inputs pass the fresh byte check.
      await dryRunSourceImport(document, entry.sourceRoot);
      const repository = this.repository(false)!;
      try {
        return await importSource(repository, new LpbfArtifactStore(path.join(this.storageRoot, 'artifacts')), document, entry.sourceRoot, expectedRevision);
      } catch (error) {
        if (error instanceof Error && /revision conflict/i.test(error.message)) throw new LpbfSourceArchiveError(409, 'Source revision conflict. Preview again.');
        throw error;
      } finally { repository.close(); }
    });
  }

  verify(datasetId: string) {
    return this.exclusive(async () => {
      const current = this.current(datasetId).current;
      if (!current) throw new LpbfSourceArchiveError(404, 'Source dataset has not been imported.');
      const store = new LpbfArtifactStore(path.join(this.storageRoot, 'artifacts'), { readOnly: true });
      for (const ref of current.document.artifacts) await store.verify(ref);
      return { datasetId, revision: current.revision, documentSha256: current.documentSha256,
        artifactIntegrity: 'verified-now' as const, verifiedAt: new Date().toISOString(), evidenceStatus: current.evidenceStatus };
    });
  }
}

import path from 'node:path';
import { lstatSync } from 'node:fs';
import { artifactDirectory, LpbfArtifactStore } from './lpbfArtifactStore';
import { LpbfRunRepository, type RunRecord, type RunSourceLink } from './lpbfRunRepository';
import { LpbfSourceRepository } from './lpbfSourceRepository';
import { dryRunRunImport, importRun } from './lpbfRunImport';
import { lpbfWorker } from './lpbfWorkerBridge';

export class LpbfRunArchiveError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export class LpbfRunArchiveService {
  private busy = false;
  constructor(
    private readonly runRoot = path.resolve(process.env.METALLIKSA_LPBF_RUN_ROOT || '.lpbf-runs'),
    private readonly sourceRoot = path.resolve(process.env.METALLIKSA_LPBF_SOURCE_ROOT || '.lpbf-sources')
  ) {}

  private runRepository(readOnly: boolean) {
    const filename = path.join(this.runRoot, 'runs.sqlite');
    if (readOnly) {
      try { lstatSync(this.runRoot); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
      artifactDirectory(this.runRoot);
      try { lstatSync(filename); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    } else artifactDirectory(this.runRoot, true);
    return new LpbfRunRepository(filename, { readOnly });
  }

  private sourceRepository() {
    const filename = path.join(this.sourceRoot, 'metadata.sqlite');
    try { lstatSync(filename); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    return new LpbfSourceRepository(filename, { readOnly: true });
  }

  list(): { runId: string; createdAt: string; evidenceStatus: string }[] {
    const repository = this.runRepository(true);
    if (!repository) return [];
    try {
      const runs = [];
      for (const record of repository.allRuns()) {
        runs.push({ runId: record.document.runId, createdAt: record.createdAt, evidenceStatus: record.evidenceStatus });
      }
      return runs;
    } finally { repository.close(); }
  }

  get(runId: string): RunRecord {
    const repository = this.runRepository(true);
    if (!repository) throw new LpbfRunArchiveError(404, 'Run repository not found.');
    try {
      const record = repository.get(runId);
      if (!record) throw new LpbfRunArchiveError(404, 'Run not found.');
      return record;
    } finally { repository.close(); }
  }

  private async exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (this.busy) throw new LpbfRunArchiveError(409, 'A run archive operation is already running.');
    this.busy = true;
    try { return await action(); } finally { this.busy = false; }
  }

  preview(jobId: string, sources: RunSourceLink[]) {
    return this.exclusive(async () => {
      const sourceRepo = this.sourceRepository();
      if (!sourceRepo) throw new LpbfRunArchiveError(400, 'Source repository not initialized.');
      try {
        const { capture, root } = await lpbfWorker.captureForArchive(jobId);
        return await dryRunRunImport(capture, sources, sourceRepo, root);
      } finally { sourceRepo.close(); }
    });
  }

  import(jobId: string, sources: RunSourceLink[]) {
    return this.exclusive(async () => {
      const sourceRepo = this.sourceRepository();
      if (!sourceRepo) throw new LpbfRunArchiveError(400, 'Source repository not initialized.');
      try {
        const { capture, root } = await lpbfWorker.captureForArchive(jobId);
        const repository = this.runRepository(false)!;
        try {
          return await importRun(repository, new LpbfArtifactStore(path.join(this.runRoot, 'artifacts')), capture, sources, sourceRepo, root);
        } catch (error) {
          if (error instanceof Error && /conflict/i.test(error.message)) throw new LpbfRunArchiveError(409, 'Run identity conflict.');
          throw error;
        } finally { repository.close(); }
      } finally { sourceRepo.close(); }
    });
  }
}

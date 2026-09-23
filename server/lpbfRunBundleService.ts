import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { artifactDirectory, LpbfArtifactStore } from './lpbfArtifactStore';
import { LpbfRunArchiveError } from './lpbfRunArchiveService';
import { backupRunBundle, restoreRunBundle, verifyRunBundle } from './lpbfRunBundle';
import { LpbfRunRepository } from './lpbfRunRepository';
import { LpbfSourceRepository } from './lpbfSourceRepository';

const ID = /^[0-9a-f]{32}$/;

function overlaps(a: string, b: string): boolean {
  const relative = path.relative(a, b);
  return !relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

/** Bundles and restored copies remain server-local and separate from live stores. */
export class LpbfRunBundleService {
  private readonly runRoot: string;
  private readonly sourceRoot: string;
  private readonly bundleRoot: string;

  constructor(
    runRoot = process.env.METALLIKSA_LPBF_RUN_ROOT || '.lpbf-runs',
    sourceRoot = process.env.METALLIKSA_LPBF_SOURCE_ROOT || '.lpbf-sources',
    bundleRoot = process.env.METALLIKSA_LPBF_BUNDLE_ROOT || '.lpbf-run-bundles',
    private readonly newId: () => string = () => randomUUID().replaceAll('-', ''),
  ) {
    this.runRoot = path.resolve(runRoot);
    this.sourceRoot = path.resolve(sourceRoot);
    this.bundleRoot = path.resolve(bundleRoot);
    if ([this.runRoot, this.sourceRoot].some(root => overlaps(root, this.bundleRoot) || overlaps(this.bundleRoot, root))) {
      throw new Error('Bundle root must be separate from live LPBF stores');
    }
  }

  private id(value: string): string {
    if (!ID.test(value)) throw new LpbfRunArchiveError(400, 'Invalid bundle ID.');
    return value;
  }

  private directory(kind: 'exports' | 'restores', create: boolean): string {
    return artifactDirectory(path.join(this.bundleRoot, kind), create);
  }

  private exported(bundleId: string): string {
    const id = this.id(bundleId);
    if (!existsSync(path.join(this.bundleRoot, 'exports'))) throw new LpbfRunArchiveError(404, 'Run bundle not found.');
    const target = path.join(this.directory('exports', false), id);
    if (!existsSync(target)) throw new LpbfRunArchiveError(404, 'Run bundle not found.');
    return target;
  }

  async export() {
    const bundleId = this.id(this.newId());
    const target = path.join(this.directory('exports', true), bundleId);
    if (existsSync(target)) throw new LpbfRunArchiveError(409, 'Run bundle ID already exists.');
    const runRoot = artifactDirectory(this.runRoot);
    const sourceRoot = artifactDirectory(this.sourceRoot);
    const runs = new LpbfRunRepository(path.join(runRoot, 'runs.sqlite'), { readOnly: true });
    try {
      const sources = new LpbfSourceRepository(path.join(sourceRoot, 'metadata.sqlite'), { readOnly: true });
      try {
        await backupRunBundle(runs, new LpbfArtifactStore(path.join(runRoot, 'artifacts'), { readOnly: true }),
          sources, new LpbfArtifactStore(path.join(sourceRoot, 'artifacts'), { readOnly: true }), target);
      } finally { sources.close(); }
    } finally { runs.close(); }
    const manifest = await verifyRunBundle(target);
    return { bundleId, storage: 'server-local-directory' as const, manifest };
  }

  async verify(bundleId: string) {
    const target = this.exported(bundleId);
    try {
      const manifest = await verifyRunBundle(target);
      return { bundleId, storage: 'server-local-directory' as const, verified: true, manifest };
    } catch {
      throw new LpbfRunArchiveError(409, 'Run bundle integrity verification failed.');
    }
  }

  async restore(bundleId: string) {
    const source = this.exported(bundleId);
    try { await verifyRunBundle(source); }
    catch { throw new LpbfRunArchiveError(409, 'Run bundle restore or integrity verification failed.'); }
    const restoreId = this.id(this.newId());
    const destination = path.join(this.directory('restores', true), restoreId);
    if (existsSync(destination)) throw new LpbfRunArchiveError(409, 'Restore ID already exists.');
    try {
      await restoreRunBundle(source, destination);
      const manifest = await verifyRunBundle(destination);
      return { bundleId, restoreId, storage: 'server-local-directory' as const, verified: true, manifest };
    } catch {
      throw new LpbfRunArchiveError(409, 'Run bundle restore or integrity verification failed.');
    }
  }
}

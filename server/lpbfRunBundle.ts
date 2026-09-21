/** Full immutable run/source archive. Integrity is not scientific validation.
 * All paths are trusted server configuration; no live restore or HTTP paths.
 */
import { createHash } from 'node:crypto';
import { createReadStream, lstatSync, readFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { artifactDirectory, LpbfArtifactStore, verifyLocalArtifact, type ArtifactIdentity } from './lpbfArtifactStore';
import { LpbfRunRepository } from './lpbfRunRepository';
import { runArtifacts } from './lpbfRunImport';
import { LpbfSourceRepository } from './lpbfSourceRepository';
import { backupSourceBundle, verifySourceBundle } from './lpbfSourceBundle';

export interface RunBundleManifest {
  schemaVersion: 1;
  kind: 'metalliksa-lpbf-run-bundle';
  metadata: ArtifactIdentity;
  sourceBundle: ArtifactIdentity;
  runCount: number;
  artifactCount: number;
  sourceLinkCount: number;
}

async function fileIdentity(root: string, relative: string): Promise<ArtifactIdentity> {
  artifactDirectory(path.dirname(path.join(root, relative)));
  const filename = path.join(root, relative), stat = lstatSync(filename);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Bundle file must not be a link');
  const hash = createHash('sha256'); let byteSize = 0;
  for await (const bytes of createReadStream(filename)) { hash.update(bytes); byteSize += bytes.length; }
  const ref = { sha256: hash.digest('hex'), byteSize };
  await verifyLocalArtifact(root, relative, ref);
  return ref;
}

function noSidecars(root: string) {
  for (const suffix of ['-wal', '-shm', '-journal']) {
    try { lstatSync(path.join(root, `runs.sqlite${suffix}`)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    throw new Error('Bundle SQLite sidecar state is not permitted');
  }
}

function readManifest(root: string): RunBundleManifest {
  const file = path.join(root, 'bundle.json'), stat = lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 16384) throw new Error('Invalid run bundle manifest file');
  const m = JSON.parse(readFileSync(file, 'utf8'));
  if (!m || m.schemaVersion !== 1 || m.kind !== 'metalliksa-lpbf-run-bundle'
    || Object.keys(m).sort().join() !== 'artifactCount,kind,metadata,runCount,schemaVersion,sourceBundle,sourceLinkCount'
    || [m.runCount, m.artifactCount, m.sourceLinkCount].some(n => !Number.isSafeInteger(n) || n < 0)) {
    throw new Error('Invalid run bundle manifest');
  }
  return m as RunBundleManifest;
}

/** Read ONLY frozen databases. A newer current revision never substitutes for a link. */
function references(root: string) {
  const runs = new LpbfRunRepository(path.join(root, 'runs.sqlite'), { readOnly: true });
  try {
    const sources = new LpbfSourceRepository(path.join(root, 'sources/metadata.sqlite'), { readOnly: true });
    try {
      const artifacts = new Map<string, ArtifactIdentity>();
      let runCount = 0, sourceLinkCount = 0;
      for (const record of runs.allRuns()) {
        runCount++;
        for (const link of record.document.sources) {
          const revision = sources.revision(link.datasetId, link.revision);
          if (!revision || revision.documentSha256 !== link.documentSha256) throw new Error('Run source revision identity mismatch');
          sourceLinkCount++;
        }
        for (const ref of runArtifacts(record.document)) {
          const prior = artifacts.get(ref.sha256);
          if (prior && prior.byteSize !== ref.byteSize) throw new Error('Conflicting run artifact sizes');
          artifacts.set(ref.sha256, { sha256: ref.sha256, byteSize: ref.byteSize });
        }
      }
      return { artifacts, runCount, sourceLinkCount };
    } finally { sources.close(); }
  } finally { runs.close(); }
}

async function verifyContents(root: string, manifest: RunBundleManifest) {
  noSidecars(root);
  await verifyLocalArtifact(root, 'runs.sqlite', manifest.metadata);
  await verifyLocalArtifact(root, 'sources/bundle.json', manifest.sourceBundle);
  await verifySourceBundle(path.join(root, 'sources'));
  const refs = references(root);
  if (refs.runCount !== manifest.runCount || refs.sourceLinkCount !== manifest.sourceLinkCount
    || refs.artifacts.size !== manifest.artifactCount) throw new Error('Run bundle metadata counts mismatch');
  const store = new LpbfArtifactStore(path.join(root, 'artifacts'), { readOnly: true });
  for (const ref of refs.artifacts.values()) await store.verify(ref);
}

/** Snapshot runs first, then sources. Includes the full source snapshot as a superset
 * of exact referenced revisions. Failure leaves no top-level completion manifest.
 */
export async function backupRunBundle(runs: LpbfRunRepository, runStore: LpbfArtifactStore,
  sources: LpbfSourceRepository, sourceStore: LpbfArtifactStore, destination: string): Promise<RunBundleManifest> {
  const absolute = path.resolve(destination);
  const parent = artifactDirectory(path.dirname(absolute));
  const target = path.join(parent, path.basename(absolute));
  await runs.backupMetadata(target); // exclusive mkdir; preserves original row bytes/timestamps
  await backupSourceBundle(sources, sourceStore, path.join(target, 'sources'));
  const refs = references(target);
  const output = new LpbfArtifactStore(path.join(target, 'artifacts'));
  for (const ref of refs.artifacts.values()) {
    const input = await runStore.verify(ref);
    await output.putFile(runStore.root, path.relative(runStore.root, input.path).split(path.sep).join('/'), ref);
  }
  const manifest: RunBundleManifest = { schemaVersion: 1, kind: 'metalliksa-lpbf-run-bundle',
    metadata: await fileIdentity(target, 'runs.sqlite'), sourceBundle: await fileIdentity(target, 'sources/bundle.json'),
    runCount: refs.runCount, artifactCount: refs.artifacts.size, sourceLinkCount: refs.sourceLinkCount };
  await verifyContents(target, manifest);
  const completion = await open(path.join(target, 'bundle.json'), 'wx', 0o600);
  try { await completion.writeFile(JSON.stringify(manifest, null, 2)); await completion.sync(); }
  finally { await completion.close(); }
  return manifest;
}

export async function verifyRunBundle(directory: string): Promise<RunBundleManifest> {
  const root = artifactDirectory(directory), manifest = readManifest(root);
  await verifyContents(root, manifest);
  return manifest;
}

/** Validate before creating the exclusive target. All copied bytes rechecked before
 * its completion; no restoration over a live store, no delete or metadata upgrade.
 */
export async function restoreRunBundle(directory: string, destination: string): Promise<RunBundleManifest> {
  await verifyRunBundle(directory);
  const root = artifactDirectory(directory);
  const runs = new LpbfRunRepository(path.join(root, 'runs.sqlite'), { readOnly: true });
  try {
    const sources = new LpbfSourceRepository(path.join(root, 'sources/metadata.sqlite'), { readOnly: true });
    try {
      return await backupRunBundle(runs, new LpbfArtifactStore(path.join(root, 'artifacts'), { readOnly: true }),
        sources, new LpbfArtifactStore(path.join(root, 'sources/artifacts'), { readOnly: true }), destination);
    } finally { sources.close(); }
  } finally { runs.close(); }
}

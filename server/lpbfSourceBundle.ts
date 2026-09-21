/** Source-archive backup only: does not yet include simulation runs or a full experiment. */
import { createHash } from 'node:crypto';
import { createReadStream, lstatSync, readFileSync } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { artifactDirectory, LpbfArtifactStore, verifyLocalArtifact, type ArtifactIdentity } from './lpbfArtifactStore';
import { LpbfSourceRepository } from './lpbfSourceRepository';

interface BundleManifest {
  schemaVersion: 1;
  kind: 'metalliksa-lpbf-source-bundle';
  metadata: ArtifactIdentity;
  revisionCount: number;
  artifactCount: number;
}

function references(repository: LpbfSourceRepository) {
  const artifacts = new Map<string, ArtifactIdentity>();
  let revisionCount = 0;
  for (const revision of repository.allRevisions()) {
    revisionCount++;
    for (const ref of revision.document.artifacts) {
      const prior = artifacts.get(ref.sha256);
      if (prior && prior.byteSize !== ref.byteSize) throw new Error('Conflicting artifact sizes in metadata');
      artifacts.set(ref.sha256, { sha256: ref.sha256, byteSize: ref.byteSize });
    }
  }
  return { artifacts, revisionCount };
}

async function metadataIdentity(filename: string): Promise<ArtifactIdentity> {
  const hash = createHash('sha256');
  let byteSize = 0;
  for await (const chunk of createReadStream(filename)) { hash.update(chunk); byteSize += chunk.length; }
  return { sha256: hash.digest('hex'), byteSize };
}

function readManifest(directory: string): BundleManifest {
  const filename = path.join(directory, 'bundle.json');
  const stat = lstatSync(filename);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 16384) throw new Error('Invalid bundle manifest file');
  const value = JSON.parse(readFileSync(filename, 'utf8'));
  if (!value || value.schemaVersion !== 1 || value.kind !== 'metalliksa-lpbf-source-bundle'
    || Object.keys(value).sort().join() !== 'artifactCount,kind,metadata,revisionCount,schemaVersion'
    || !Number.isSafeInteger(value.revisionCount) || value.revisionCount < 0
    || !Number.isSafeInteger(value.artifactCount) || value.artifactCount < 0) throw new Error('Invalid source bundle manifest');
  return value as BundleManifest;
}

/** Creates a NEW destination. Failure leaves an incomplete directory without the
 * completion manifest. No existing directory is overwritten or recursively deleted.
 * SQLite snapshot first: later live revisions cannot enter this bundle.
 */
export async function backupSourceBundle(repository: LpbfSourceRepository, store: LpbfArtifactStore, destination: string): Promise<BundleManifest> {
  const parent = artifactDirectory(path.dirname(path.resolve(destination)));
  const target = path.join(parent, path.basename(destination));
  const snapshot = await repository.backupMetadata(target);
  const metadata = new LpbfSourceRepository(snapshot.path, { readOnly: true });
  let refs: ReturnType<typeof references>;
  try { refs = references(metadata); } finally { metadata.close(); }
  const output = new LpbfArtifactStore(path.join(target, 'artifacts'));
  for (const ref of refs.artifacts.values()) {
    const source = await store.verify(ref);
    await output.putFile(store.root, path.relative(store.root, source.path).split(path.sep).join('/'), ref);
  }
  const manifest: BundleManifest = { schemaVersion: 1, kind: 'metalliksa-lpbf-source-bundle',
    metadata: await metadataIdentity(snapshot.path), revisionCount: refs.revisionCount, artifactCount: refs.artifacts.size };
  const file = await open(path.join(target, 'bundle.json'), 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(manifest, null, 2)); await file.sync(); } finally { await file.close(); }
  return manifest;
}

export async function verifySourceBundle(directory: string): Promise<BundleManifest> {
  const root = artifactDirectory(directory);
  for (const suffix of ['-wal', '-shm', '-journal']) {
    try { lstatSync(path.join(root, `metadata.sqlite${suffix}`)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    throw new Error('Bundle SQLite sidecar state is not permitted');
  }
  const manifest = readManifest(root);
  await verifyLocalArtifact(root, 'metadata.sqlite', manifest.metadata);
  const repository = new LpbfSourceRepository(path.join(root, 'metadata.sqlite'), { readOnly: true });
  try {
    const refs = references(repository);
    if (refs.revisionCount !== manifest.revisionCount || refs.artifacts.size !== manifest.artifactCount) throw new Error('Bundle metadata counts mismatch');
    const store = new LpbfArtifactStore(path.join(root, 'artifacts'), { readOnly: true });
    for (const ref of refs.artifacts.values()) await store.verify(ref);
  } finally { repository.close(); }
  return manifest;
}

/** Validate before creating destination, then copy and revalidate every byte.
 * Never restores over live application data. Bundle hashes are integrity checks,
 * not publisher signatures or proof of provenance authenticity.
 */
export async function restoreSourceBundle(directory: string, destination: string): Promise<BundleManifest> {
  await verifySourceBundle(directory);
  const root = artifactDirectory(directory);
  const repository = new LpbfSourceRepository(path.join(root, 'metadata.sqlite'), { readOnly: true });
  try {
    const result = await backupSourceBundle(repository, new LpbfArtifactStore(path.join(root, 'artifacts'), { readOnly: true }), destination);
    await verifySourceBundle(destination);
    return result;
  } finally { repository.close(); }
}

import { LpbfArtifactStore, verifyLocalArtifact } from './lpbfArtifactStore';
import { LpbfSourceRepository, validateSourceDocument } from './lpbfSourceRepository';

export async function dryRunSourceImport(raw: unknown, sourceRoot: string) {
  const document = validateSourceDocument(raw);
  let byteSize = 0;
  for (const artifact of document.artifacts) {
    await verifyLocalArtifact(sourceRoot, artifact.relativePath, artifact);
    byteSize += artifact.byteSize;
    if (!Number.isSafeInteger(byteSize)) throw new Error('Total artifact size exceeds safe integer range');
  }
  return { document, artifactCount: document.artifacts.length, byteSize,
    evidenceStatus: 'unreviewed-source-archive' as const, artifactIntegrity: 'verified-at-dry-run' as const };
}

/** Revalidates input every time. Verified unreferenced objects may remain after a
 * late error/CAS conflict; they are safe to reuse and are never garbage-collected here.
 */
export async function importSource(repository: LpbfSourceRepository, store: LpbfArtifactStore,
  raw: unknown, sourceRoot: string, expectedRevision: number) {
  const preview = await dryRunSourceImport(raw, sourceRoot);
  for (const artifact of preview.document.artifacts) {
    await store.putFile(sourceRoot, artifact.relativePath, artifact);
  }
  for (const artifact of preview.document.artifacts) await store.verify(artifact);
  const revision = repository.save(preview.document, expectedRevision);
  return { revision, artifactCount: preview.artifactCount, byteSize: preview.byteSize,
    artifactIntegrity: 'verified-at-import' as const };
}

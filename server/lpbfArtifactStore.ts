/** Local content-addressed bytes. Hash integrity does not establish scientific validity.
 * The store must be owned by the application: hostile concurrent filesystem writers
 * are outside this portable Node API's isolation boundary. No hard links to input files.
 */
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmdirSync, unlinkSync } from 'node:fs';
import { link, open } from 'node:fs/promises';
import path from 'node:path';

export interface ArtifactIdentity { sha256: string; byteSize: number }
export interface VerifiedArtifact extends ArtifactIdentity { path: string }

function identity(ref: ArtifactIdentity) {
  if (!ref || typeof ref.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(ref.sha256) || !Number.isSafeInteger(ref.byteSize) || ref.byteSize < 0) {
    throw new Error('Invalid artifact hash or size');
  }
}

export function artifactRelativePath(value: string): string {
  if (typeof value !== 'string' || value.length > 512 || /[\\:\x00-\x1f]/.test(value)
    || value.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)
      || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part))) throw new Error('Invalid artifact path');
  return value;
}

/** Check each existing ancestor, including the root, before traversing it. */
export function artifactDirectory(directory: string, create = false): string {
  const absolute = path.resolve(directory);
  const root = path.parse(absolute).root;
  let current = root;
  for (const segment of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (create) {
      try { mkdirSync(current); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    }
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Artifact directory must not contain a link');
  }
  return realpathSync(absolute);
}

function containedFile(root: string, relativePath: string): string {
  artifactRelativePath(relativePath);
  const base = artifactDirectory(root);
  const filename = path.resolve(base, ...relativePath.split('/'));
  const relative = path.relative(base, filename);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Artifact path escapes root');
  artifactDirectory(path.dirname(filename));
  const stat = lstatSync(filename);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Artifact path must be a regular file, not a link');
  return filename;
}

async function transfer(root: string, relativePath: string, ref: ArtifactIdentity, output?: string): Promise<VerifiedArtifact> {
  identity(ref);
  const filename = containedFile(root, relativePath);
  const before = lstatSync(filename);
  const input = await open(filename, 'r');
  try {
    const opened = await input.stat();
    if (!opened.isFile() || before.dev !== opened.dev || before.ino !== opened.ino || opened.size !== ref.byteSize) {
      throw new Error('Artifact integrity size or file identity mismatch');
    }
    const destination = output ? await open(output, 'wx', 0o600) : null;
    try {
      const hash = createHash('sha256');
      const buffer = Buffer.allocUnsafe(1024 * 1024);
      let byteSize = 0;
      for (;;) {
        const { bytesRead } = await input.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        byteSize += bytesRead;
        if (byteSize > ref.byteSize) throw new Error('Artifact integrity size exceeded');
        const chunk = buffer.subarray(0, bytesRead);
        hash.update(chunk);
        if (destination) await destination.writeFile(chunk);
      }
      const after = await input.stat();
      if (byteSize !== ref.byteSize || hash.digest('hex') !== ref.sha256
        // ctime also changes on hard-link removal by another successful publisher.
        || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs) {
        throw new Error('Artifact integrity check failed');
      }
      if (destination) await destination.sync();
      return { path: filename, sha256: ref.sha256, byteSize };
    } finally { await destination?.close(); }
  } finally { await input.close(); }
}

export function verifyLocalArtifact(root: string, relativePath: string, ref: ArtifactIdentity): Promise<VerifiedArtifact> {
  return transfer(root, relativePath, ref);
}

export class LpbfArtifactStore {
  readonly root: string;
  constructor(root: string, private readonly options: { readOnly?: boolean } = {}) {
    this.root = artifactDirectory(root, !options.readOnly);
    artifactDirectory(path.join(this.root, 'objects'), !options.readOnly);
    if (!options.readOnly) artifactDirectory(path.join(this.root, '.staging'), true);
  }

  private objectPath(ref: ArtifactIdentity) {
    identity(ref);
    return `objects/${ref.sha256.slice(0, 2)}/${ref.sha256}`;
  }

  verify(ref: ArtifactIdentity): Promise<VerifiedArtifact> {
    return verifyLocalArtifact(this.root, this.objectPath(ref), ref);
  }

  async putFile(sourceRoot: string, relativePath: string, ref: ArtifactIdentity): Promise<VerifiedArtifact> {
    if (this.options.readOnly) throw new Error('Artifact store is read-only');
    const object = this.objectPath(ref);
    const stagingRoot = artifactDirectory(path.join(this.root, '.staging'));
    const staging = mkdtempSync(path.join(stagingRoot, 'ingest-'));
    const payload = path.join(staging, 'payload');
    try {
      await transfer(sourceRoot, relativePath, ref, payload);
      artifactDirectory(path.join(this.root, 'objects', ref.sha256.slice(0, 2)), true);
      const destination = path.join(this.root, ...object.split('/'));
      // link() is exclusive, unlike rename() which can overwrite an existing object.
      try { await link(payload, destination); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      return await this.verify(ref);
    } finally {
      // Never recursively remove staging: only this operation's file and empty directory.
      artifactDirectory(staging);
      try { unlinkSync(payload); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      rmdirSync(staging);
    }
  }
}

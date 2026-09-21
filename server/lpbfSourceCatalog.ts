import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { artifactDirectory } from './lpbfArtifactStore';
import { validateSourceDocument } from './lpbfSourceRepository';

/** Trusted server configuration, never supplied by an HTTP request. */
export interface LpbfSourceCatalogEntry {
  datasetId: string;
  title: string;
  sourceRoot: string;
  loadDocument: () => unknown;
}

function readJson(root: string, name: string) {
  const filename = path.join(artifactDirectory(root), name);
  const stat = lstatSync(filename);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 1024 * 1024) throw new Error('Invalid source metadata file');
  return JSON.parse(readFileSync(filename, 'utf8'));
}

/** Adapter for this specific reviewed README/manifest layout, not a generic
 * measurement importer. Unknown units and unreviewed HDF5 claims stay unchanged.
 */
export function nistIn718CatalogEntry(root = path.resolve('data/benchmark/nist-amb2022-03')): LpbfSourceCatalogEntry {
  return { datasetId: 'nist-mds2-2716', title: 'NIST AM Bench 2022 · IN718 bare plate', sourceRoot: root,
    loadDocument() {
      const manifest = readJson(root, 'manifest.json');
      const context = readJson(root, 'source-context.json');
      if (manifest.schema_version !== 1 || context.schema_version !== 1 || manifest.dataset_id !== 'nist-mds2-2716'
        || context.dataset_id !== manifest.dataset_id || context.source_version !== manifest.version
        || manifest.material !== 'IN718' || context.experiment?.material !== 'IN718'
        || manifest.process_scope !== 'bare-plate' || context.experiment?.process_scope !== 'bare-plate'
        || !Array.isArray(manifest.files)) throw new Error('Source manifest/context identity mismatch');
      const readme = manifest.files.find((item: any) => item.path === context.readme?.path);
      if (!readme || readme.sha256 !== context.readme.sha256 || readme.source_url !== context.readme.source_url) throw new Error('README context fingerprint mismatch');
      if (context.hdf5_review !== undefined) {
        const sources = manifest.files.filter((file: any) => file.kind !== 'readme');
        const reviewed = context.hdf5_review?.artifacts;
        if (!Array.isArray(reviewed) || reviewed.length !== sources.length || sources.some((file: any) =>
          reviewed.filter((ref: any) => ref?.path === file.path && ref.sha256 === file.sha256 && ref.source_url === file.source_url).length !== 1)) {
          throw new Error('HDF5 review fingerprint mismatch');
        }
      }
      return validateSourceDocument({ schemaVersion: 1, datasetId: manifest.dataset_id, materialId: 'in718', processScope: 'bare-plate',
        source: { url: 'https://doi.org/10.18434/mds2-2716', citation: manifest.citation, version: manifest.version,
          terms: context.source_terms?.summary, termsMissingReason: null },
        artifacts: manifest.files.map((file: any) => ({ relativePath: file.path, sha256: file.sha256, byteSize: file.bytes, sourceUrl: file.source_url })),
        sourceContext: context });
    } };
}

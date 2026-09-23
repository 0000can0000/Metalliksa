import { createHash } from 'node:crypto';
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

export function cmuTi64CatalogEntry(root = path.resolve('data/benchmark/cmu-ti64-meltpool-v1')): LpbfSourceCatalogEntry {
  return { datasetId: 'cmu-ti64-meltpool-v1', title: 'CMU Single/Multi-track Meltpool Dimensions', sourceRoot: root,
    loadDocument() {
      const manifest = readJson(root, 'manifest.json');
      if (manifest.schema_version !== 1 || manifest.dataset_id !== 'cmu-ti64-meltpool-v1' || manifest.material !== 'Ti-6Al-4V' || !Array.isArray(manifest.files)) {
        throw new Error('Source manifest identity mismatch');
      }
      return validateSourceDocument({ schemaVersion: 1, datasetId: manifest.dataset_id, materialId: 'ti6al4v', processScope: 'bare-plate',
        source: { url: manifest.doi ? `https://doi.org/${manifest.doi}` : '', citation: manifest.attribution, version: '1',
          terms: null, termsMissingReason: 'Public benchmark' },
        artifacts: manifest.files.map((file: any) => ({ relativePath: file.path, sha256: file.sha256, byteSize: file.bytes, sourceUrl: file.source_url })),
        sourceContext: { schema_version: 1, dataset_id: manifest.dataset_id, source_version: '1' } });
    } };
}

/** A locally transcribed Table 4 aggregate, kept separate from NIST's raw HDF5 catalog. */
export function nistOpticalTable4CatalogEntry(root = path.resolve('data/benchmark/nist-amb2022-03-optical')): LpbfSourceCatalogEntry {
  const datasetId = 'nist-amb2022-03-optical-table4-local-v1';
  const artifactSha256 = 'dcefd9c8c998e516eb81769cbe7b13014dfcb1c38e69c838a62475e79beac518';
  const artifactBytes = 3374;
  const resultsUrl = 'https://www.nist.gov/document/am-bench-amb2022-03-measurement-and-result-descriptions-v10';
  const methodsUrl = 'https://www.nist.gov/document/amb2022-03-measurement-and-challenge-descriptions-version-101';
  return { datasetId, title: 'NIST AMB2022-03 Table 4 · local aggregate transcription', sourceRoot: root,
    loadDocument() {
      const manifest = readJson(root, 'manifest.json');
      const file = manifest.files?.[0];
      if (manifest.schema_version !== 1 || manifest.dataset_id !== datasetId || manifest.version !== '1.0.0'
        || manifest.material !== 'IN718' || manifest.process_scope !== 'bare-plate'
        || manifest.artifact_kind !== 'local-transcription-of-published-aggregate-measurements'
        || !Array.isArray(manifest.files) || manifest.files.length !== 1
        || file?.path !== 'table4-aggregate-v1.json' || file.source_url !== resultsUrl
        || file.bytes !== artifactBytes || file.sha256 !== artifactSha256) {
        throw new Error('Optical transcription manifest identity mismatch');
      }
      const filename = path.join(artifactDirectory(root), file.path);
      const stat = lstatSync(filename);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.size !== file.bytes || stat.size > 1024 * 1024) {
        throw new Error('Optical transcription artifact size mismatch');
      }
      const bytes = readFileSync(filename);
      if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
        throw new Error('Optical transcription artifact hash mismatch');
      }
      const data = JSON.parse(bytes.toString('utf8'));
      const experiment = data.experiment;
      if (data.schemaVersion !== 1 || data.kind !== manifest.artifact_kind
        || data.transcriptionVersion !== manifest.version || data.material !== 'IN718'
        || data.benchmark !== 'AMB2022-03' || data.doi !== '10.18434/mds2-2718'
        || data.publishedResults !== resultsUrl || data.publishedMethods !== methodsUrl
        || data.measurement?.countPerCondition !== 6 || data.measurement?.unit !== 'um'
        || experiment?.processScope !== 'bare-plate' || experiment?.sample !== 'AMB2022-718-SH1-BP1'
        || experiment?.beamDiameterDefinition !== 'D4sigma' || experiment?.scanDirection !== '+X'
        || experiment?.trackLength_mm !== 10 || experiment?.powderLayerThickness_um !== null
        || experiment?.hatchSpacing_um !== null || !Array.isArray(data.cases) || data.cases.length !== 7
        || new Set(data.cases.map((item: any) => item.caseNumber)).size !== 7
        || data.cases.some((item: any) => typeof item.caseNumber !== 'string'
          || item.sampleId !== `AMB2022-718-SH1-BP1-L${item.caseNumber}`
          || ['laserPower_W', 'scanSpeed_mm_s', 'beamDiameterD4sigma_um', 'depthMean_um',
            'depthStdDev_um', 'widthMean_um', 'widthStdDev_um'].some(key =>
            typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] <= 0))) {
        throw new Error('Optical transcription content identity mismatch');
      }
      return validateSourceDocument({ schemaVersion: 1, datasetId, materialId: 'in718', processScope: 'bare-plate',
        source: { url: 'https://doi.org/10.18434/mds2-2718', citation: manifest.citation,
          version: manifest.version, terms: null,
          termsMissingReason: 'Reuse terms for this local transcription were not established from the cited NIST result and method PDFs.' },
        artifacts: [{ relativePath: file.path, sha256: file.sha256, byteSize: file.bytes, sourceUrl: resultsUrl }],
        sourceContext: { schema_version: 1, dataset_id: datasetId, source_version: manifest.version,
          transcription: { kind: data.kind, publisher_raw_data: false, publisher_pdf: false,
            note: data.transcriptionNote, published_results_location: data.publishedResultsLocation,
            checksum_authority: manifest.checksum_authority, results_url: resultsUrl, methods_url: methodsUrl },
          experiment: { machine: experiment.machine, process_scope: experiment.processScope,
            sample: experiment.sample, scan_direction: experiment.scanDirection,
            track_length_mm: experiment.trackLength_mm, substrate_and_chamber_temperature_C: experiment.substrateAndChamberTemperature_C,
            substrate_and_chamber_temperature_uncertainty_C: experiment.substrateAndChamberTemperatureUncertainty_C,
            powder_layer_thickness_um: null, hatch_spacing_um: null,
            heat_treatment: experiment.heatTreatment,
            heat_treatment_missing_reason: experiment.heatTreatmentMissingReason },
          measurement: { quantity: data.measurement.quantity, method: data.measurement.method,
            unit_source: data.measurement.unit, temperature_conversion: null,
            temperature_conversion_missing_reason: 'Not applicable to optical cross-section geometry.',
            beam_diameter_definition: experiment.beamDiameterDefinition,
            repeat_group_rule: 'Six cross-sections per condition; only Table 4 aggregate means and standard deviations are archived.',
            uncertainty: data.measurement.uncertainty },
          split: 'unassigned', unresolved: ['Individual cross-section measurements and source images are not in this local transcription.',
            'Published standard deviation is not an experimental validation claim for this model.'] } });
    } };
}

/** NIST publisher workbook is a separate source from the local Table 4 transcription. */
export function nistOpticalOfficialWorkbookCatalogEntry(root = path.resolve('data/benchmark/nist-amb2022-03-optical/official')): LpbfSourceCatalogEntry {
  const datasetId = 'nist-amb2022-03-optical-xlsx-official-v1';
  const name = 'AMB2022-718-SH1-MeltPool_Cross-Section_Measurement_Results.xlsx';
  const sourceUrl = `https://data.nist.gov/od/ds/ark:/88434/mds2-2718/${name}`;
  const workbookSha = '2cfaac96aaca3dabb77b7029f842cdcc7e75c5a2cf3577d0734823246364a931';
  const sidecarSha = '770c0826e53e42c242110e69c032f2cbc74f6183048c43a530c5b62e746ae09b';
  return { datasetId, title: 'NIST AMB2022-03 optical sections · official workbook', sourceRoot: root,
    loadDocument() {
      const manifest = readJson(root, 'manifest.json');
      const files = manifest.files;
      if (manifest.schema_version !== 1 || manifest.dataset_id !== datasetId || manifest.version !== '1.0.0'
        || manifest.material !== 'IN718' || manifest.process_scope !== 'bare-plate'
        || manifest.artifact_kind !== 'publisher-optical-cross-section-measurements'
        || manifest.checksum_authority !== 'NIST-published SHA-256 sidecar for the publisher XLSX'
        || !Array.isArray(files) || files.length !== 2
        || files[0]?.path !== name || files[0]?.source_url !== sourceUrl
        || files[0]?.bytes !== 25811 || files[0]?.sha256 !== workbookSha
        || files[1]?.path !== `${name}.sha256` || files[1]?.source_url !== `${sourceUrl}.sha256`
        || files[1]?.bytes !== 64 || files[1]?.sha256 !== sidecarSha) {
        throw new Error('Official optical workbook manifest identity mismatch');
      }
      for (const file of files) {
        const filename = path.join(artifactDirectory(root), file.path);
        const stat = lstatSync(filename);
        if (stat.isSymbolicLink() || !stat.isFile() || stat.size !== file.bytes) {
          throw new Error('Official optical workbook artifact size mismatch');
        }
        if (createHash('sha256').update(readFileSync(filename)).digest('hex') !== file.sha256) {
          throw new Error('Official optical workbook artifact hash mismatch');
        }
      }
      if (readFileSync(path.join(root, `${name}.sha256`), 'utf8').trim() !== workbookSha) {
        throw new Error('Official optical workbook publisher checksum mismatch');
      }
      return validateSourceDocument({ schemaVersion: 1, datasetId, materialId: 'in718', processScope: 'bare-plate',
        source: { url: 'https://doi.org/10.18434/mds2-2718', citation: manifest.citation,
          version: manifest.version, terms: null,
          termsMissingReason: 'Reuse terms for this workbook were not established from the cited NIST data page.' },
        artifacts: files.map((file: any) => ({ relativePath: file.path, sha256: file.sha256,
          byteSize: file.bytes, sourceUrl: file.source_url })),
        sourceContext: { schema_version: 1, dataset_id: datasetId, source_version: manifest.version,
          publisher_artifact_kind: manifest.artifact_kind, checksum_authority: manifest.checksum_authority,
          experiment: { process_scope: 'bare-plate', sample: 'AMB2022-718-SH1-BP1',
            track_length_mm: 10, section_positions_mm: [4.9, 6.0],
            heat_treatment_missing_reason: 'Not established in this workbook.' },
          measurement: { quantity: 'optical cross-section melt-pool width and depth', unit_source: 'um',
            beam_diameter_definition: 'D4sigma', repeat_group_rule: 'Three tracks × two sections at 4.9 and 6.0 mm per case; six measurements.',
            temperature_conversion: null,
            temperature_conversion_missing_reason: 'Not applicable to optical cross-section geometry.' },
          split: 'unassigned', unresolved: ['Optical section operator is not implemented by the model.',
            'Publisher workbook measurements do not establish model validation.'] } });
    } };
}

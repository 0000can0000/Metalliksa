export interface RunSourceLink {
  datasetId: string;
  revision: number;
  documentSha256: string;
}

export interface RunCapture {
  schemaVersion: 1;
  jobId: string;
  resultJson: string;
  inputJson: string;
  materialJson: string;
  contractStatus: 'core-v1-bound' | 'legacy-unbound';
}

export interface RunDocument {
  schemaVersion: 1;
  runId: string;
  capture: RunCapture;
  sources: RunSourceLink[];
}

export type RunSourceBindingStatus = 'exact-revision-bound' | 'legacy-unlinked';

export interface RunRecord {
  document: RunDocument;
  documentSha256: string;
  createdAt: string;
  evidenceStatus: 'unvalidated-model';
  sourceBindingStatus: RunSourceBindingStatus;
}

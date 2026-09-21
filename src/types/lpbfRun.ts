export interface RunSourceLink {
  datasetId: string;
  revision: number;
  documentSha256: string;
}

export interface RunCapture {
  version: 1;
  id: string; // Worker job id
  inputHash: string;
  implementationHash: string;
  solverBinaryHash: string | null;
  platform: string;
  artifacts: {
    relativePath: string;
    sha256: string;
    byteSize: number;
  }[];
}

export interface RunDocument {
  schemaVersion: 1;
  runId: string;
  jobId: string;
  capture: RunCapture;
  sources: RunSourceLink[];
}

export interface RunRecord {
  document: RunDocument;
  documentSha256: string;
  createdAt: string;
  evidenceStatus: 'unreviewed-run-archive';
  artifactIntegrity: 'verified-at-import';
}

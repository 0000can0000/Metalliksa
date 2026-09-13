export const SOURCE_TYPES = ['primary-paper', 'review', 'standard', 'technical-report'] as const;
export const EVIDENCE_TYPES = ['measured', 'validated-simulation', 'calibrated-simulation', 'literature-estimate', 'screening-only', 'unresolved'] as const;
export const TARGET_MODULES = ['materials-db', 'lpbf-solver', 'validation-dataset'] as const;
export type ResearchSourceType = typeof SOURCE_TYPES[number];
export type ResearchEvidenceType = typeof EVIDENCE_TYPES[number];
export type ResearchTargetModule = typeof TARGET_MODULES[number];
export type ResearchConfidence = 'low' | 'medium' | 'high' | 'unresolved';

export interface ResearchBrief {
  id: string;
  question: string;
  alloy: string;
  process: string;
  method: string;
  dataType: string;
  createdAt: string;
}

export interface ResearchSource {
  id: string;
  briefId: string;
  title: string;
  authors: string;
  year?: number;
  doi: string;
  url: string;
  sourceType: ResearchSourceType;
  confidence: ResearchConfidence;
  notes: string;
  createdAt: string;
}

export interface ResearchConditions {
  composition: string;
  process: string;
  machine: string;
  processParameters: string;
  powderCondition: string;
  heatTreatment: string;
  measurementMethod: string;
}

export interface ResearchFinding {
  id: string;
  briefId: string;
  sourceId: string;
  materialId: string;
  materialName: string;
  property: string;
  value: number;
  unit: string;
  rangeLow?: number;
  rangeHigh?: number;
  uncertainty?: number;
  uncertaintyDescription: string;
  conditions: ResearchConditions;
  locator: string;
  evidenceType: ResearchEvidenceType;
  confidence: ResearchConfidence;
  limitations: string;
  /** External experimental validation/calibration reference, not a convergence check. */
  validationReference: string;
  targetModule: ResearchTargetModule;
  reviewStatus: 'draft' | 'reviewed';
  reviewNote: string;
  reviewedAt?: string;
  conflictsWith: string[];
  createdAt: string;
}

export interface ResearchIntegration {
  id: string;
  findingId: string;
  materialId: string;
  targetModule: ResearchTargetModule;
  /** Linked evidence is available to the module; it never replaces solver inputs. */
  status: 'linked';
  createdAt: string;
}

export interface ResearchFeedback {
  id: string;
  findingId: string;
  outcome: 'supports' | 'contradicts' | 'inconclusive';
  note: string;
  experimentOrJobReference: string;
  createdAt: string;
}

export interface ResearchSnapshot {
  schemaVersion: 1;
  briefs: ResearchBrief[];
  sources: ResearchSource[];
  findings: ResearchFinding[];
  integrations: ResearchIntegration[];
  feedback: ResearchFeedback[];
}

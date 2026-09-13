import type { ResearchSnapshot } from '../types/research';
import { parseResearchSnapshot, researchIntegrationIssues, researchRecordKey } from './researchRegistry';

export interface RegistryEnvelope { registryId: string; revision: number; savedAt: string | null; snapshot: ResearchSnapshot }
export const researchCollections = ['briefs', 'sources', 'findings', 'integrations', 'feedback'] as const;
type Collection = typeof researchCollections[number];
type RecordValue = ResearchSnapshot[Collection][number];
export interface RegistryConflict { key: string; collection: Collection; id: string; browser?: RecordValue; server?: RecordValue }
export interface RegistryMerge { snapshot: ResearchSnapshot; conflicts: RegistryConflict[]; localKey: string }
export const emptyResearchSnapshot = (): ResearchSnapshot => ({ schemaVersion: 1, briefs: [], sources: [], findings: [], integrations: [], feedback: [] });

export function parseRegistryEnvelope(value: unknown): RegistryEnvelope {
  if (!value || typeof value !== 'object') throw new Error('Invalid server registry response.');
  const item = value as RegistryEnvelope;
  if (typeof item.registryId !== 'string' || !item.registryId || !Number.isSafeInteger(item.revision) || item.revision < 0 || (item.revision === 0 ? item.savedAt !== null : typeof item.savedAt !== 'string' || !Number.isFinite(Date.parse(item.savedAt)))) throw new Error('Invalid server revision metadata.');
  return { registryId: item.registryId, revision: item.revision, savedAt: item.savedAt, snapshot: parseResearchSnapshot(item.snapshot) };
}

/** Record-level three-way merge. Conflicts need an explicit user selection. */
export function planRegistryMerge(base: ResearchSnapshot, browser: ResearchSnapshot, server: ResearchSnapshot, localKey: string): RegistryMerge {
  const snapshot = emptyResearchSnapshot(), conflicts: RegistryConflict[] = [];
  for (const collection of researchCollections) {
    const original = new Map<string, RecordValue>(base[collection].map(item => [item.id, item] as const));
    const local = new Map<string, RecordValue>(browser[collection].map(item => [item.id, item] as const));
    const remote = new Map<string, RecordValue>(server[collection].map(item => [item.id, item] as const));
    for (const id of new Set([...original.keys(), ...local.keys(), ...remote.keys()])) {
      const a = original.get(id), b = local.get(id), c = remote.get(id);
      let selected: RecordValue | undefined;
      if (researchRecordKey(b) === researchRecordKey(c)) selected = b;
      else if (researchRecordKey(a) === researchRecordKey(b)) selected = c;
      else if (researchRecordKey(a) === researchRecordKey(c)) selected = b;
      else { conflicts.push({ key: `${collection}:${id}`, collection, id, browser: b, server: c }); continue; }
      if (selected) (snapshot[collection] as RecordValue[]).push(selected);
    }
  }
  return { snapshot, conflicts, localKey };
}

export function resolveRegistryMerge(plan: RegistryMerge, choices: Record<string, 'browser' | 'server'>, browser: ResearchSnapshot, server: ResearchSnapshot): { snapshot: ResearchSnapshot; withdrawn: number; withdrawnLinks: number } {
  const snapshot = structuredClone(plan.snapshot);
  for (const conflict of plan.conflicts) {
    const choice = choices[conflict.key];
    if (!choice) throw new Error('Choose a version for every conflicting record.');
    const selected = conflict[choice];
    if (selected) (snapshot[conflict.collection] as RecordValue[]).push(structuredClone(selected));
  }
  // Combining records from different revisions cannot carry forward a review
  // unless one input contains the exact finding AND its exact source.
  const trusted = (finding: ResearchSnapshot['findings'][number], input: ResearchSnapshot) => {
    const old = input.findings.find(item => item.id === finding.id);
    const source = snapshot.sources.find(item => item.id === finding.sourceId);
    return old && researchRecordKey(old) === researchRecordKey(finding) && researchRecordKey(source) === researchRecordKey(input.sources.find(item => item.id === finding.sourceId));
  };
  const invalidated = new Set<string>();
  for (const finding of snapshot.findings) {
    const contradictions = snapshot.feedback.filter(item => item.findingId === finding.id && item.outcome === 'contradicts');
    const addedContradiction = ![browser, server].some(input => trusted(finding, input) && contradictions.every(item => input.feedback.some(old => researchRecordKey(old) === researchRecordKey(item))));
    if (finding.reviewStatus === 'reviewed' && ((!trusted(finding, browser) && !trusted(finding, server)) || addedContradiction)) {
      finding.reviewStatus = 'draft'; finding.reviewNote = ''; delete finding.reviewedAt; invalidated.add(finding.id);
    }
  }
  const linkCount = snapshot.integrations.length;
  snapshot.integrations = snapshot.integrations.filter(item => {
    const finding = snapshot.findings.find(record => record.id === item.findingId);
    return finding && finding.materialId === item.materialId && !researchIntegrationIssues(finding, snapshot.sources.find(source => source.id === finding.sourceId), item.targetModule).length;
  });
  return { snapshot: parseResearchSnapshot(snapshot), withdrawn: invalidated.size, withdrawnLinks: linkCount - snapshot.integrations.length };
}

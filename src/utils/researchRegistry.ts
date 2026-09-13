import { EVIDENCE_TYPES, SOURCE_TYPES, TARGET_MODULES, type ResearchFinding, type ResearchSnapshot, type ResearchSource, type ResearchTargetModule } from '../types/research';

export const researchLabel = (value: string) => value.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
export function researchEvidenceLabel(finding: ResearchFinding): string {
  if (['validated-simulation', 'calibrated-simulation'].includes(finding.evidenceType)) {
    return finding.reviewStatus === 'reviewed' && finding.validationReference.trim()
      ? `Source-reported ${researchLabel(finding.evidenceType).toLowerCase()}`
      : 'Unresolved simulation claim · review required';
  }
  return researchLabel(finding.evidenceType);
}
export function normalizeDoi(value: string): string {
  return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase();
}
export function safeResearchUrl(value: string): string {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function sourceLink(source: ResearchSource): string {
  return source.doi ? `https://doi.org/${normalizeDoi(source.doi)}` : safeResearchUrl(source.url);
}
export function validateResearchSource(source: ResearchSource): string[] {
  const errors: string[] = [];
  if (!source.title.trim()) errors.push('Source title is required.');
  if (!SOURCE_TYPES.includes(source.sourceType)) errors.push('Select a supported source type.');
  if (!['low', 'medium', 'high', 'unresolved'].includes(source.confidence)) errors.push('Select a source confidence level.');
  if (source.doi && !/^10\.\d{4,9}\/\S+$/i.test(normalizeDoi(source.doi))) errors.push('Enter a valid DOI identifier.');
  if (source.url && !safeResearchUrl(source.url)) errors.push('Source link must use HTTP or HTTPS.');
  if (!source.doi && !source.url) errors.push('A DOI or direct source link is required.');
  if (source.year !== undefined && (!Number.isInteger(source.year) || source.year < 1600 || source.year > new Date().getFullYear() + 1)) errors.push('Publication year is outside the supported range.');
  return errors;
}

export function validateResearchFinding(finding: ResearchFinding, source?: ResearchSource): string[] {
  const errors: string[] = [];
  if (!source || finding.sourceId !== source.id) errors.push('Select a saved source.');
  if (!finding.materialId.trim() || !finding.materialName.trim()) errors.push('Material association is required.');
  if (!finding.property.trim()) errors.push('Property is required.');
  if (!Number.isFinite(finding.value)) errors.push('Value must be a finite number.');
  if (!finding.unit.trim()) errors.push('Unit is required; use 1 for dimensionless values.');
  if (!EVIDENCE_TYPES.includes(finding.evidenceType)) errors.push('Select an evidence type.');
  if (!['low', 'medium', 'high', 'unresolved'].includes(finding.confidence)) errors.push('Select a finding confidence level.');
  if (!TARGET_MODULES.includes(finding.targetModule)) errors.push('Select a target module.');
  for (const key of ['rangeLow', 'rangeHigh', 'uncertainty'] as const) {
    if (finding[key] !== undefined && !Number.isFinite(finding[key])) errors.push(`${key} must be finite.`);
  }
  if ((finding.rangeLow === undefined) !== (finding.rangeHigh === undefined)) errors.push('Provide both range bounds.');
  if (finding.rangeLow !== undefined && finding.rangeHigh !== undefined && (finding.rangeLow > finding.rangeHigh || finding.value < finding.rangeLow || finding.value > finding.rangeHigh)) errors.push('Range must contain the value, with lower bound no greater than upper bound.');
  if (finding.uncertainty !== undefined && finding.uncertainty < 0) errors.push('Uncertainty cannot be negative.');
  return errors;
}

export function researchReviewIssues(finding: ResearchFinding, source?: ResearchSource): string[] {
  const issues = validateResearchFinding(finding, source);
  if (!finding.locator.trim()) issues.push('Record a page, table, figure, or section locator.');
  if (!finding.conditions.measurementMethod.trim()) issues.push('Record the measurement or simulation method.');
  if (!finding.conditions.process.trim()) issues.push('Record the process or explicitly state not reported / not applicable.');
  if (!finding.limitations.trim()) issues.push('Record limitations and missing conditions.');
  if (!finding.uncertaintyDescription.trim()) issues.push('Describe uncertainty, including when it was not reported.');
  if (!finding.reviewNote.trim()) issues.push('A review rationale is required.');
  if (finding.confidence === 'unresolved' || source?.confidence === 'unresolved') issues.push('Resolve source and finding confidence before review.');
  if (finding.evidenceType === 'unresolved') issues.push('Resolve the evidence type before review.');
  if (['validated-simulation', 'calibrated-simulation'].includes(finding.evidenceType) && !finding.validationReference.trim()) issues.push('An experimental validation or calibration reference is required; convergence and conservation alone do not qualify.');
  if (finding.evidenceType === 'measured' && source?.sourceType === 'review') issues.push('Measured data require the original primary source; classify secondary extraction as a literature estimate.');
  return issues;
}

export function researchIntegrationIssues(finding: ResearchFinding, source: ResearchSource | undefined, target: ResearchTargetModule): string[] {
  const issues = researchReviewIssues(finding, source);
  if (finding.reviewStatus !== 'reviewed') issues.push('Review the extraction before linking it to a module.');
  if (finding.conflictsWith.length) issues.push('Resolve the flagged source conflict before integration.');
  if (!TARGET_MODULES.includes(target)) issues.push('Unknown target module.');
  if (target === 'validation-dataset' && finding.evidenceType !== 'measured') issues.push('Validation datasets accept measured evidence only.');
  return issues;
}

export function getResearchIntegrationRecords(state: ResearchSnapshot, targetModule?: ResearchTargetModule, materialId?: string) {
  return state.integrations.filter(record => (!targetModule || record.targetModule === targetModule) && (!materialId || record.materialId === materialId)).flatMap(record => {
    const finding = state.findings.find(item => item.id === record.findingId);
    const source = state.sources.find(item => item.id === finding?.sourceId);
    return finding && source && !researchIntegrationIssues(finding, source, record.targetModule).length ? [{ record, finding, source }] : [];
  });
}

/** Same-property comparisons are informational: units and conditions are never silently converted. */
export function compareResearchFindings(a: ResearchFinding, b: ResearchFinding): string {
  if (a.materialId !== b.materialId || a.property.trim().toLowerCase() !== b.property.trim().toLowerCase()) return 'Different material or property; direct comparison unavailable.';
  if (a.unit.trim() !== b.unit.trim()) return 'Different units; conversion and review required.';
  if (Object.keys(a.conditions).some(key => a.conditions[key as keyof typeof a.conditions] !== b.conditions[key as keyof typeof b.conditions])) return 'Conditions differ; values are not directly comparable.';
  const aLow = a.rangeLow ?? a.value - (a.uncertainty ?? 0), aHigh = a.rangeHigh ?? a.value + (a.uncertainty ?? 0);
  const bLow = b.rangeLow ?? b.value - (b.uncertainty ?? 0), bHigh = b.rangeHigh ?? b.value + (b.uncertainty ?? 0);
  if ((a.uncertainty === undefined && a.rangeLow === undefined) || (b.uncertainty === undefined && b.rangeLow === undefined)) return 'Uncertainty or interval missing; compatibility is unresolved.';
  return aHigh < bLow || bHigh < aLow ? 'Reported intervals do not overlap; inspect a possible conflict.' : 'Reported intervals overlap; this does not establish validation.';
}

export function parseResearchSnapshot(value: unknown): ResearchSnapshot {
  const require = (ok: unknown, message: string) => { if (!ok) throw new Error(`Invalid research registry: ${message}`); };
  require(value && typeof value === 'object' && !Array.isArray(value), 'expected an object');
  const data = value as ResearchSnapshot;
  require(data.schemaVersion === 1, 'unsupported schema version');
  for (const key of ['briefs', 'sources', 'findings', 'integrations', 'feedback'] as const) require(Array.isArray(data[key]) && data[key].length <= 10000, `invalid ${key} collection`);
  const ids = new Set<string>();
  const strings = (item: unknown, keys: string[]) => { require(item && typeof item === 'object' && !Array.isArray(item), 'invalid record'); for (const key of keys) require(typeof (item as Record<string, unknown>)[key] === 'string' && ((item as Record<string, string>)[key]).length <= 100000, `missing or oversized ${key}`); };
  for (const item of [...data.briefs, ...data.sources, ...data.findings, ...data.integrations, ...data.feedback]) {
    strings(item, ['id', 'createdAt']); require(item.id && !ids.has(item.id), 'duplicate or empty id'); ids.add(item.id); require(Number.isFinite(Date.parse(item.createdAt)), 'invalid timestamp');
  }
  const confidence = (v: string) => ['low', 'medium', 'high', 'unresolved'].includes(v);
  for (const brief of data.briefs) { strings(brief, ['question', 'alloy', 'process', 'method', 'dataType']); require(brief.question.trim(), 'empty research question'); }
  for (const source of data.sources) {
    strings(source, ['briefId', 'title', 'authors', 'doi', 'url', 'notes']); require(data.briefs.some(b => b.id === source.briefId), 'orphan source'); require(confidence(source.confidence), 'invalid confidence'); require(!validateResearchSource(source).length, 'invalid source');
  }
  for (const finding of data.findings) {
    strings(finding, ['briefId', 'sourceId', 'materialId', 'materialName', 'property', 'unit', 'uncertaintyDescription', 'locator', 'limitations', 'validationReference', 'reviewNote']);
    strings(finding.conditions, ['composition', 'process', 'machine', 'processParameters', 'powderCondition', 'heatTreatment', 'measurementMethod']);
    require(confidence(finding.confidence), 'invalid finding confidence'); require(['draft', 'reviewed'].includes(finding.reviewStatus), 'invalid review status');
    require(Array.isArray(finding.conflictsWith) && finding.conflictsWith.every(id => id !== finding.id && data.findings.some(f => f.id === id)), 'invalid conflict references');
    const source = data.sources.find(s => s.id === finding.sourceId); require(source?.briefId === finding.briefId, 'finding brief does not match source');
    require(!validateResearchFinding(finding, source).length, 'invalid finding');
    if (finding.reviewedAt !== undefined) require(typeof finding.reviewedAt === 'string' && Number.isFinite(Date.parse(finding.reviewedAt)), 'invalid review timestamp');
    if (finding.reviewStatus === 'reviewed') require(!!finding.reviewedAt && !researchReviewIssues(finding, source).length, 'unsupported review claim');
  }
  for (const finding of data.findings) {
    require(finding.conflictsWith.every(id => data.findings.find(other => other.id === id)!.conflictsWith.includes(finding.id)), 'conflict references must be reciprocal');
  }
  for (const integration of data.integrations) {
    strings(integration, ['findingId', 'materialId', 'targetModule']); const finding = data.findings.find(f => f.id === integration.findingId);
    require(finding && finding.materialId === integration.materialId && integration.status === 'linked', 'invalid integration reference');
    require(!researchIntegrationIssues(finding!, data.sources.find(s => s.id === finding!.sourceId), integration.targetModule).length, 'ineligible integration');
  }
  for (const feedback of data.feedback) { strings(feedback, ['findingId', 'note', 'experimentOrJobReference']); require(data.findings.some(f => f.id === feedback.findingId) && ['supports', 'contradicts', 'inconclusive'].includes(feedback.outcome) && feedback.note.trim() && feedback.experimentOrJobReference.trim(), 'invalid feedback'); }
  // Only schema fields cross persistence/API boundaries. UI drafts and unknown
  // payload properties must never become shared scientific records.
  const pick = <T,>(item: T, keys: string[]): T => Object.fromEntries(keys.filter(key => (item as Record<string, unknown>)[key] !== undefined).map(key => [key, (item as Record<string, unknown>)[key]])) as T;
  const common = ['id', 'createdAt'];
  return {
    schemaVersion: 1,
    briefs: data.briefs.map(item => pick(item, [...common, 'question', 'alloy', 'process', 'method', 'dataType'])),
    sources: data.sources.map(item => pick(item, [...common, 'briefId', 'title', 'authors', 'year', 'doi', 'url', 'sourceType', 'confidence', 'notes'])),
    findings: data.findings.map(item => ({ ...pick(item, [...common, 'briefId', 'sourceId', 'materialId', 'materialName', 'property', 'value', 'unit', 'rangeLow', 'rangeHigh', 'uncertainty', 'uncertaintyDescription', 'locator', 'evidenceType', 'confidence', 'limitations', 'validationReference', 'targetModule', 'reviewStatus', 'reviewNote', 'reviewedAt']), conflictsWith: [...item.conflictsWith], conditions: pick(item.conditions, ['composition', 'process', 'machine', 'processParameters', 'powderCondition', 'heatTreatment', 'measurementMethod']) })),
    integrations: data.integrations.map(item => pick(item, [...common, 'findingId', 'materialId', 'targetModule', 'status'])),
    feedback: data.feedback.map(item => pick(item, [...common, 'findingId', 'outcome', 'note', 'experimentOrJobReference'])),
  };
}

/** Stable equality for JSON records, independent of object key insertion order. */
export function researchRecordKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(researchRecordKey).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${researchRecordKey(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}

export function researchSnapshotKey(snapshot: ResearchSnapshot): string {
  return researchRecordKey({ ...snapshot, ...Object.fromEntries((['briefs', 'sources', 'findings', 'integrations', 'feedback'] as const).map(key => [key, [...snapshot[key]].sort((a, b) => a.id.localeCompare(b.id))])) });
}

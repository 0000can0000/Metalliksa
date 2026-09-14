# src/utils/researchRegistry.ts

- researchLabel · function · L3-L3 — researchLabel = (value: string)
- researchEvidenceLabel · function · L4-L11 — function researchEvidenceLabel(finding: ResearchFinding): string
- normalizeDoi · function · L12-L14 — function normalizeDoi(value: string): string
- safeResearchUrl · function · L15-L17 — function safeResearchUrl(value: string): string
- sourceLink · function · L18-L20 — function sourceLink(source: ResearchSource): string
- validateResearchSource · function · L21-L31 — function validateResearchSource(source: ResearchSource): string[]
- validateResearchFinding · function · L33-L50 — function validateResearchFinding(finding: ResearchFinding, source?: ResearchSource): string[]
- researchReviewIssues · function · L52-L65 — function researchReviewIssues(finding: ResearchFinding, source?: ResearchSource): string[]
- researchIntegrationIssues · function · L67-L74 — function researchIntegrationIssues(finding: ResearchFinding, source: ResearchSource | undefined, target: ResearchTargetModule): string[]
- getResearchIntegrationRecords · function · L76-L82 — function getResearchIntegrationRecords(state: ResearchSnapshot, targetModule?: ResearchTargetModule, materialId?: string)
- compareResearchFindings · function · L85-L93 — function compareResearchFindings(a: ResearchFinding, b: ResearchFinding): string
- parseResearchSnapshot · function · L95-L142 — function parseResearchSnapshot(value: unknown): ResearchSnapshot
- require · function · L96-L96 — require = (ok: unknown, message: string)
- strings · function · L102-L102 — strings = (item: unknown, keys: string[])
- confidence · function · L106-L106 — confidence = (v: string)
- pick · function · L132-L132 — pick = <T,>(item: T, keys: string[]): T
- researchRecordKey · function · L145-L149 — function researchRecordKey(value: unknown): string
- researchSnapshotKey · function · L151-L153 — function researchSnapshotKey(snapshot: ResearchSnapshot): string

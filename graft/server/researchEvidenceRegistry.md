# server/researchEvidenceRegistry.ts

- ResearchRegistryEnvelope · interface · L8-L13 — interface ResearchRegistryEnvelope
- ResearchRegistryError · class · L15-L17 — class ResearchRegistryError extends Error
- constructor · method · L16-L16 — constructor(public status: number, message: string, public current?: ResearchRegistryEnvelope)
- emptySnapshot · function · L19-L19 — emptySnapshot = (): ResearchSnapshot
- revisionName · function · L21-L21 — revisionName = (revision: number)
- isCode · function · L22-L22 — isCode = (error: unknown, code: string)
- ResearchEvidenceRegistry · class · L28-L148 — class ResearchEvidenceRegistry
- constructor · method · L29-L29 — constructor(readonly directory = process.env.RESEARCH_REGISTRY_DIR || path.join(process.cwd(), '.research-registry'), private readonly lockTimeoutMs = 2000)
- locked · method · L31-L52 — private async locked<T>(operation: () => Promise<T>): Promise<T>
- publish · method · L54-L72 — private async publish(envelope: ResearchRegistryEnvelope): Promise<void>
- scan · method · L74-L110 — private async scan(requestedRevision?: number): Promise<{ current: ResearchRegistryEnvelope; selected?: ResearchRegistryEnvelope; revisions: { revision: number; savedAt: string }[] }>
- current · method · L112-L112 — current(): Promise<ResearchRegistryEnvelope>
- history · method · L114-L119 — history(): Promise<{ registryId: string; revisions: { revision: number; savedAt: string }[] }>
- revision · method · L121-L127 — revision(revision: number): Promise<ResearchRegistryEnvelope>
- save · method · L129-L147 — save(registryId: unknown, expectedRevision: unknown, value: unknown): Promise<ResearchRegistryEnvelope>

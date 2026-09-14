# src/utils/researchSync.ts

- RegistryEnvelope · interface · L4-L4 — interface RegistryEnvelope
- Collection · type · L6-L6 — type Collection = typeof researchCollections[number];
- RecordValue · type · L7-L7 — type RecordValue = ResearchSnapshot[Collection][number];
- RegistryConflict · interface · L8-L8 — interface RegistryConflict
- RegistryMerge · interface · L9-L9 — interface RegistryMerge
- emptyResearchSnapshot · function · L10-L10 — emptyResearchSnapshot = (): ResearchSnapshot
- parseRegistryEnvelope · function · L12-L17 — function parseRegistryEnvelope(value: unknown): RegistryEnvelope
- planRegistryMerge · function · L20-L37 — function planRegistryMerge(base: ResearchSnapshot, browser: ResearchSnapshot, server: ResearchSnapshot, localKey: string): RegistryMerge
- resolveRegistryMerge · function · L39-L68 — function resolveRegistryMerge(plan: RegistryMerge, choices: Record<string, 'browser' | 'server'>, browser: ResearchSnapshot, server: ResearchSnapshot): { snapshot: ResearchSnapshot; withdrawn: number; withdrawnLinks: number }
- trusted · function · L49-L53 — trusted = (finding: ResearchSnapshot['findings'][number], input: ResearchSnapshot)

# src/services/researchRegistrySync.ts

- Phase · type · L6-L6 — type Phase = 'unchecked' | 'checking' | 'ready' | 'review' | 'saving' | 'conflict' | 'error';
- SyncState · interface · L7-L12 — interface SyncState
- Dependencies · type · L13-L13 — type Dependencies = { fetch: typeof fetch; timeoutMs: number };
- createResearchRegistrySync · function · L15-L81 — function createResearchRegistrySync(dependencies: Dependencies = { fetch: (input, init) => fetch(input, init), timeoutMs: 12000 })
- request · function · L18-L32 — request = async (path = '', init?: RequestInit): Promise<RegistryEnvelope>
- check · function · L33-L55 — check = async ()
- apply · function · L56-L64 — apply = (choices: Record<string, 'browser' | 'server'>)
- save · function · L65-L79 — save = async ()

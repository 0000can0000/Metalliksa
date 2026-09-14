# src/store/useResearchStore.ts

- ActionResult · type · L6-L6 — type ActionResult = { id?: string; errors: string[] };
- ResearchTab · type · L7-L7 — type ResearchTab = 'brief' | 'sources' | 'extract' | 'registry' | 'catalog';
- ResearchState · interface · L8-L33 — interface ResearchState extends ResearchSnapshot
- newId · function · L35-L35 — newId = (prefix: string)
- now · function · L36-L36 — now = ()
- reportStorageError · function · L41-L50 — function reportStorageError(message: string)
- canWriteStorage · function · L51-L59 — function canWriteStorage(name: string)
- parseBrowserDrafts · function · L85-L95 — function parseBrowserDrafts(value: unknown): ResearchState['drafts']

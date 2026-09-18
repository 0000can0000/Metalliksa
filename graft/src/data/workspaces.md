# src/data/workspaces.ts

- ModuleScope · type · L2-L2 — type ModuleScope = 'Production' | 'Research' | 'Preview' | 'Unresolved';
- WorkspaceId · type · L3-L3 — type WorkspaceId = 'lpbf' | 'materials' | 'evidence';
- ModuleId · type · L40-L40 — type ModuleId = typeof MODULES[number]['id'];
- isModuleId · function · L41-L43 — function isModuleId(value: unknown): value is ModuleId
- moduleFromHash · function · L44-L47 — function moduleFromHash(hash: string): ModuleId | null
- moduleHash · function · L48-L48 — function moduleHash(id: ModuleId): string

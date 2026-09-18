# src/data/workspaces.ts

- ModuleScope · type · L2-L2 — type ModuleScope = 'Production' | 'Research' | 'Preview' | 'Unresolved';
- WorkspaceId · type · L3-L3 — type WorkspaceId = 'lpbf' | 'materials' | 'evidence';
- ModuleId · type · L39-L39 — type ModuleId = typeof MODULES[number]['id'];
- isModuleId · function · L40-L42 — function isModuleId(value: unknown): value is ModuleId
- moduleFromHash · function · L43-L46 — function moduleFromHash(hash: string): ModuleId | null
- moduleHash · function · L47-L47 — function moduleHash(id: ModuleId): string

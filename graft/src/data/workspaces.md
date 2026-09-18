# src/data/workspaces.ts

- ModuleScope · type · L2-L2 — type ModuleScope = 'Production' | 'Research' | 'Preview' | 'Unresolved';
- WorkspaceId · type · L3-L3 — type WorkspaceId = 'lpbf' | 'materials' | 'evidence';
- ModuleId · type · L42-L42 — type ModuleId = typeof MODULES[number]['id'];
- isModuleId · function · L43-L45 — function isModuleId(value: unknown): value is ModuleId
- moduleFromHash · function · L46-L49 — function moduleFromHash(hash: string): ModuleId | null
- moduleHash · function · L50-L50 — function moduleHash(id: ModuleId): string

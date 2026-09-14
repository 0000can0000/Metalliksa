# src/data/workspaces.ts

- ModuleScope · type · L2-L2 — type ModuleScope = 'Production' | 'Research' | 'Preview' | 'Unresolved';
- WorkspaceId · type · L3-L3 — type WorkspaceId = 'lpbf' | 'materials' | 'evidence';
- ModuleId · type · L38-L38 — type ModuleId = typeof MODULES[number]['id'];
- isModuleId · function · L39-L41 — function isModuleId(value: unknown): value is ModuleId
- moduleFromHash · function · L42-L45 — function moduleFromHash(hash: string): ModuleId | null
- moduleHash · function · L46-L46 — function moduleHash(id: ModuleId): string

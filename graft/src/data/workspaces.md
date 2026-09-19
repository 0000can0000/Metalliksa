# src/data/workspaces.ts

- ModuleScope · type · L2-L2 — type ModuleScope = 'Production' | 'Research' | 'Preview' | 'Unresolved';
- WorkspaceId · type · L3-L3 — type WorkspaceId = 'lpbf' | 'materials' | 'evidence';
- ModuleId · type · L45-L45 — type ModuleId = typeof MODULES[number]['id'];
- isModuleId · function · L46-L48 — function isModuleId(value: unknown): value is ModuleId
- moduleFromHash · function · L49-L52 — function moduleFromHash(hash: string): ModuleId | null
- moduleHash · function · L53-L53 — function moduleHash(id: ModuleId): string

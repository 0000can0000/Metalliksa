# src/App.tsx

- NavSubTab · type · L39-L39 — type NavSubTab = ModuleId;
- DisciplineHubId · type · L40-L40 — type DisciplineHubId = typeof WORKSPACES[number]['id'];
- initialTab · function · L42-L51 — function initialTab(): ModuleId
- App · function · L53-L190 — function App()
- activate · function · L68-L72 — function activate(id: ModuleId)
- navigate · function · L73-L77 — function navigate(id: string)
- refreshStatus · function · L78-L83 — async function refreshStatus(force = true)
- onHash · function · L86-L86 — onHash = ()
- onNavigate · function · L87-L90 — onNavigate = (event: Event)
- close · function · L102-L102 — close = (event: KeyboardEvent)
- renderModule · function · L107-L136 — function renderModule(id: ModuleId)

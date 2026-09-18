# src/App.tsx

- NavSubTab · type · L43-L43 — type NavSubTab = ModuleId;
- DisciplineHubId · type · L44-L44 — type DisciplineHubId = typeof WORKSPACES[number]['id'];
- initialTab · function · L46-L55 — function initialTab(): ModuleId
- App · function · L57-L200 — function App()
- activate · function · L72-L76 — function activate(id: ModuleId)
- navigate · function · L77-L81 — function navigate(id: string)
- refreshStatus · function · L82-L87 — async function refreshStatus(force = true)
- onHash · function · L90-L90 — onHash = ()
- onNavigate · function · L91-L94 — onNavigate = (event: Event)
- close · function · L106-L106 — close = (event: KeyboardEvent)
- renderModule · function · L111-L144 — function renderModule(id: ModuleId)

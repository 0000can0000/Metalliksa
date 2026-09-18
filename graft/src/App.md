# src/App.tsx

- NavSubTab · type · L40-L40 — type NavSubTab = ModuleId;
- DisciplineHubId · type · L41-L41 — type DisciplineHubId = typeof WORKSPACES[number]['id'];
- initialTab · function · L43-L52 — function initialTab(): ModuleId
- App · function · L54-L194 — function App()
- activate · function · L69-L73 — function activate(id: ModuleId)
- navigate · function · L74-L78 — function navigate(id: string)
- refreshStatus · function · L79-L84 — async function refreshStatus(force = true)
- onHash · function · L87-L87 — onHash = ()
- onNavigate · function · L88-L91 — onNavigate = (event: Event)
- close · function · L103-L103 — close = (event: KeyboardEvent)
- renderModule · function · L108-L138 — function renderModule(id: ModuleId)

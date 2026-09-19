# src/App.tsx

- NavSubTab · type · L46-L46 — type NavSubTab = ModuleId;
- DisciplineHubId · type · L47-L47 — type DisciplineHubId = typeof WORKSPACES[number]['id'];
- initialTab · function · L49-L58 — function initialTab(): ModuleId
- App · function · L60-L206 — function App()
- activate · function · L75-L79 — function activate(id: ModuleId)
- navigate · function · L80-L84 — function navigate(id: string)
- refreshStatus · function · L85-L90 — async function refreshStatus(force = true)
- onHash · function · L93-L93 — onHash = ()
- onNavigate · function · L94-L97 — onNavigate = (event: Event)
- close · function · L109-L109 — close = (event: KeyboardEvent)
- renderModule · function · L114-L150 — function renderModule(id: ModuleId)

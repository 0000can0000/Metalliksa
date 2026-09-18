# src/App.tsx

- NavSubTab · type · L41-L41 — type NavSubTab = ModuleId;
- DisciplineHubId · type · L42-L42 — type DisciplineHubId = typeof WORKSPACES[number]['id'];
- initialTab · function · L44-L53 — function initialTab(): ModuleId
- App · function · L55-L196 — function App()
- activate · function · L70-L74 — function activate(id: ModuleId)
- navigate · function · L75-L79 — function navigate(id: string)
- refreshStatus · function · L80-L85 — async function refreshStatus(force = true)
- onHash · function · L88-L88 — onHash = ()
- onNavigate · function · L89-L92 — onNavigate = (event: Event)
- close · function · L104-L104 — close = (event: KeyboardEvent)
- renderModule · function · L109-L140 — function renderModule(id: ModuleId)

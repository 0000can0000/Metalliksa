# src/App.tsx

- NavSubTab · type · L38-L38 — type NavSubTab = ModuleId;
- DisciplineHubId · type · L39-L39 — type DisciplineHubId = typeof WORKSPACES[number]['id'];
- initialTab · function · L41-L50 — function initialTab(): ModuleId
- App · function · L52-L188 — function App()
- activate · function · L67-L71 — function activate(id: ModuleId)
- navigate · function · L72-L76 — function navigate(id: string)
- refreshStatus · function · L77-L82 — async function refreshStatus(force = true)
- onHash · function · L85-L85 — onHash = ()
- onNavigate · function · L86-L89 — onNavigate = (event: Event)
- close · function · L101-L101 — close = (event: KeyboardEvent)
- renderModule · function · L106-L135 — function renderModule(id: ModuleId)

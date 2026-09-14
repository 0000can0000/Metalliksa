# src/components/MicrostructureSimulator.tsx

- MicrostructureSimulationMode · type · L22-L27 — type MicrostructureSimulationMode = | "voronoi_grains" // Grain growth & recrystallization (ASTM E112) | "pearlite_lamellae" // Eutectoid lamellar colony decomposition | "dendrite_solidification" // Solidification dendrites & segregation | "martensite_laths" // Acicular needle/lath transformation | "precipitate_coarsening";
- GrainSeed · interface · L29-L37 — interface GrainSeed
- MicrostructureSimulator · function · L39-L579 — MicrostructureSimulator: React.FC = ()
- initSeeds · function · L67-L86 — initSeeds = ()
- render · function · L104-L316 — render = ()
- handleCaptureSnapshot · function · L337-L345 — handleCaptureSnapshot = ()

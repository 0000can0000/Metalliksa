# src/types/pourbaix.ts

- StabilityCategory · type · L3-L8 — type StabilityCategory = | "Immunity" | "Active Corrosion" | "Passive Oxide / Hydroxide" | "Transpassive / Oxyanion" | "Chloro-Complex Dissolution";
- ReferenceElectrode · type · L10-L10 — type ReferenceElectrode = "SHE" | "SCE" | "Ag/AgCl (3M KCl)" | "Ag/AgCl (Sat KCl)" | "CSE" | "MMS";
- ThermodynamicSpecies · interface · L12-L28 — interface ThermodynamicSpecies
- PourbaixReaction · interface · L30-L42 — interface PourbaixReaction
- ElementThermodynamicSystem · interface · L44-L53 — interface ElementThermodynamicSystem
- AlloyPreset · interface · L55-L64 — interface AlloyPreset
- GridPointThermodynamicState · interface · L66-L76 — interface GridPointThermodynamicState
- WaterStabilityLines · interface · L78-L83 — interface WaterStabilityLines
- AnalyticalBoundaryLine · interface · L85-L93 — interface AnalyticalBoundaryLine
- ExperimentalEpHEntry · interface · L95-L120 — interface ExperimentalEpHEntry
- ExperimentalEpHTrajectoryPreset · interface · L122-L129 — interface ExperimentalEpHTrajectoryPreset
- PythonPourbaixResult · interface · L131-L189 — interface PythonPourbaixResult

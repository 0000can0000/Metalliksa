// Dynamic Pourbaix (E-pH-T-Salinity) Thermodynamic Types & Data Structures

export type StabilityCategory = 
  | "Immunity"
  | "Active Corrosion"
  | "Passive Oxide / Hydroxide"
  | "Transpassive / Oxyanion"
  | "Chloro-Complex Dissolution";

export type ReferenceElectrode = "SHE" | "SCE" | "Ag/AgCl (3M KCl)" | "Ag/AgCl (Sat KCl)" | "CSE" | "MMS";

export interface ThermodynamicSpecies {
  id: string;
  name: string;
  formula: string;
  element: string;
  phase: "solid" | "aqueous" | "complex" | "gas";
  valence: number;
  deltaG0_298_kJ_mol: number; // Standard Gibbs Free Energy of Formation at 298.15 K
  deltaH0_298_kJ_mol: number; // Standard Enthalpy of Formation
  s0_298_J_mol_K: number;     // Standard Entropy
  cp_a?: number;              // Maier-Kelley / Criss-Cobble heat capacity parameters
  cp_b?: number;
  cp_c?: number;
  color: string;
  isPassiveFilm?: boolean;
  chlorideLigands?: number;   // e.g. FeCl+, CuCl2-, AlCl4-
}

export interface PourbaixReaction {
  id: string;
  element: string;
  reactants: { speciesId: string; coeff: number }[];
  products: { speciesId: string; coeff: number }[];
  nElectrons: number; // e- transferred
  mProtons: number;   // H+ involved
  wWater: number;     // H2O involved
  chlorideCoeff?: number; // Cl- involved
  description: string;
  calcE0_298_V: number;
  slope_dE_dpH_298: number;
}

export interface ElementThermodynamicSystem {
  element: string;
  name: string;
  atomicMass: number;
  standardPotential_V: number;
  species: ThermodynamicSpecies[];
  reactions: PourbaixReaction[];
  prenContribution?: number; // PREN = %Cr + 3.3%Mo + 16%N
  pittingSensitivity_k: number; // d(Epit)/d(log[Cl-])
}

export interface AlloyPreset {
  id: string;
  name: string;
  category: "Nickel Superalloy" | "Titanium Alloy" | "High-Entropy Alloy (HEA)" | "Stainless Steel" | "Aluminum Alloy" | "Copper Alloy" | "Pure Metal";
  description: string;
  composition: { [element: string]: number }; // wt%
  dominantPassiveOxides: string[];
  pittingResistanceIndex?: number;
  recommendedApplication: string;
}

export interface GridPointThermodynamicState {
  ph: number;
  potential_V: number;
  dominantSpeciesId: string;
  dominantSpeciesFormula: string;
  category: StabilityCategory;
  color: string;
  deltaG_reaction_kJ?: number;
  isInsideWaterStability: boolean;
  elementStates?: { [element: string]: { species: string; category: StabilityCategory; color: string } };
}

export interface WaterStabilityLines {
  herLine: { e_at_ph0: number; slope: number }; // Line a: 2H+ + 2e- <=> H2(g)
  oerLine: { e_at_ph0: number; slope: number }; // Line b: O2(g) + 4H+ + 4e- <=> 2H2O
  kw: number;
  vaporPressure_bar: number;
}

export interface AnalyticalBoundaryLine {
  id: string;
  name: string;
  equation: string;
  boundaryType: string;
  speciesA: string;
  speciesB: string;
  points: { pH: number; E_V_SHE: number }[];
}

export interface ExperimentalEpHEntry {
  id: string;
  name: string;
  pH: number;
  potential_V: number; // Input potential in refElectrode scale
  refElectrode: ReferenceElectrode;
  potential_V_SHE?: number; // Standardized potential vs SHE
  currentDensity_uA_cm2?: number;
  timeHours?: number;
  stageName?: string;
  notes?: string;

  // Diagnostics returned from Python equilibrium solver
  regime?: string;
  dominantSpecies?: string;
  mechanismId?: string;
  mechanismTitle?: string;
  mechanismDetails?: string;
  riskLevel?: "Immune" | "Stable Passivity" | "Caution" | "Pitting Hazard" | "Severe Corrosion" | "High Risk";
  color?: string;
  depolarizer?: string;
  deltaE_Immunity_V?: number;
  deltaE_Pitting_V?: number | null;
  isInsideWaterStability?: boolean;
  engineeringMitigations?: string[];
}

export interface ExperimentalEpHTrajectoryPreset {
  id: string;
  name: string;
  element: string;
  description: string;
  environmentSummary: string;
  points: ExperimentalEpHEntry[];
}

export interface PythonPourbaixResult {
  success: boolean;
  engine: string;
  computeTimeMs: number;
  element: string;
  systemName: string;
  parameters: {
    temperature_C: number;
    nernstSlope_V_pH: number;
    ionActivity_log10: number;
    chlorideConcentration_ppm: number;
    chloride_Molar: number;
    pittingPotential_V_SHE: number | null;
    pittingRisk: string;
  };
  waterStabilityLines: {
    nernstSlope: number;
    e0_OER: number;
    line_a_hydrogen_HER: { pH: number; E_V_SHE: number }[];
    line_b_oxygen_OER: { pH: number; E_V_SHE: number }[];
    equation_HER: string;
    equation_OER: string;
  };
  chloridePittingBoundary: {
    pittingActive: boolean;
    chloride_ppm?: number;
    chloride_Molar?: number;
    nominal_Epit_V_SHE?: number | null;
    pittingThresholdLine?: { pH: number; E_V_SHE: number }[];
  };
  analyticalBoundaries: AnalyticalBoundaryLine[];
  speciesInventory: {
    immunity: string[];
    corrosion_acid: string[];
    passivation: string[];
    corrosion_alkaline: string[];
  };
  stabilityFieldGrid: {
    pH: number;
    E_V_SHE: number;
    regime: string;
    dominantSpecies: string;
    mechanismTitle: string;
    color: string;
  }[];
  experimentalOverlay?: {
    totalPointsCount: number;
    riskBreakdown: {
      Immune: number;
      "Stable Passivity": number;
      Caution: number;
      "Pitting Hazard": number;
      "Severe Corrosion": number;
      "High Risk": number;
    };
    overallTrajectoryDiagnosis: string;
    points: ExperimentalEpHEntry[];
  };
}

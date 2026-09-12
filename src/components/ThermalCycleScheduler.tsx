import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Flame,
  Clock,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  Layers,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronRight,
  Eye,
  Settings2,
  FileSpreadsheet,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
  Cpu,
  BarChart3,
  Bookmark,
} from "lucide-react";

import { GrainEvolutionD3Chart } from "./GrainEvolutionD3Chart";
import { GrainGrowthKineticsPanel } from "./GrainGrowthKineticsPanel";
import {
  PipelineMaterialPayload,
  getActivePipelineMaterial,
  subscribeToPipelineMaterial,
  clearActivePipelineMaterial,
} from "../utils/materialDataPipeline";

export type StageType = "ramp" | "soak" | "quench";

export interface ThermalStage {
  id: string;
  name: string;
  type: StageType;
  startTemp_C: number;
  targetTemp_C: number;
  rate_C_per_min?: number; // For ramp/quench
  duration_min: number;
  atmosphere: "Vacuum" | "Argon" | "Nitrogen" | "Air" | "Hydrogen";
  purpose: string;
}

export interface MaterialThermalProfile {
  id: string;
  name: string;
  baseMetal: "Ni" | "Fe" | "Ti" | "Al" | "Cu";
  standardRef: string;
  initialGrainSize_um: number;
  grainGrowthExponent_n: number;
  activationEnergy_kJ_mol: number;
  preExponential_k0: number; // um^n / s
  solvusTemp_C: number;
  criticalTemp_Ac3_C: number;
  solidusTemp_C: number;
  precipitateType: string;
  initialPrecipVolFrac: number; // %
  precipMeanRadius_nm: number;
  hallPetch_ky_MPa_um05: number;
  baseFrictionStress_MPa: number;
}

export const MATERIAL_THERMAL_PROFILES: MaterialThermalProfile[] = [
  {
    id: "inconel718",
    name: "Inconel 718 (AMS 5662 / Ni-Superalloy)",
    baseMetal: "Ni",
    standardRef: "AMS 5662 / AMS 5664 / ASTM B637",
    initialGrainSize_um: 18.0,
    grainGrowthExponent_n: 2.8,
    activationEnergy_kJ_mol: 285,
    preExponential_k0: 8.5e10,
    solvusTemp_C: 1010, // delta / gamma'' solvus
    criticalTemp_Ac3_C: 1010,
    solidusTemp_C: 1260,
    precipitateType: "δ-Ni3Nb / γ''-Ni3(Nb,Ti,Al) / MC Carbides",
    initialPrecipVolFrac: 4.2,
    precipMeanRadius_nm: 35,
    hallPetch_ky_MPa_um05: 750,
    baseFrictionStress_MPa: 450,
  },
  {
    id: "inconel625",
    name: "Inconel 625 (AMS 5599 / Solid Solution Superalloy)",
    baseMetal: "Ni",
    standardRef: "AMS 5599 / ASTM B443 / UNS N06625",
    initialGrainSize_um: 25.0,
    grainGrowthExponent_n: 2.9,
    activationEnergy_kJ_mol: 295,
    preExponential_k0: 1.1e11,
    solvusTemp_C: 1050,
    criticalTemp_Ac3_C: 1050,
    solidusTemp_C: 1290,
    precipitateType: "M6C / MC Primary Carbides & Laves phase",
    initialPrecipVolFrac: 1.8,
    precipMeanRadius_nm: 60,
    hallPetch_ky_MPa_um05: 680,
    baseFrictionStress_MPa: 340,
  },
  {
    id: "ti64",
    name: "Ti-6Al-4V Grade 5 (AMS 4928 / Alpha-Beta Titanium)",
    baseMetal: "Ti",
    standardRef: "AMS 4928 / ASTM B348 / ASTM F1472",
    initialGrainSize_um: 12.0,
    grainGrowthExponent_n: 2.5,
    activationEnergy_kJ_mol: 250,
    preExponential_k0: 4.2e9,
    solvusTemp_C: 995, // Beta transus
    criticalTemp_Ac3_C: 995,
    solidusTemp_C: 1604,
    precipitateType: "Primary α / Intergranular β / Ti3Al",
    initialPrecipVolFrac: 15.0,
    precipMeanRadius_nm: 120,
    hallPetch_ky_MPa_um05: 820,
    baseFrictionStress_MPa: 380,
  },
  {
    id: "ti6242",
    name: "Ti-6Al-2Sn-4Zr-2Mo (AMS 4919 / Near-Alpha Titanium)",
    baseMetal: "Ti",
    standardRef: "AMS 4919 / UNS R54620 / ASTM B348",
    initialGrainSize_um: 14.0,
    grainGrowthExponent_n: 2.6,
    activationEnergy_kJ_mol: 265,
    preExponential_k0: 6.8e9,
    solvusTemp_C: 1015, // Beta transus
    criticalTemp_Ac3_C: 1015,
    solidusTemp_C: 1650,
    precipitateType: "Silicides (Ti,Zr)5Si3 & Primary α Laths",
    initialPrecipVolFrac: 12.0,
    precipMeanRadius_nm: 90,
    hallPetch_ky_MPa_um05: 840,
    baseFrictionStress_MPa: 410,
  },
  {
    id: "aisi4340",
    name: "AISI 4340 Ni-Cr-Mo High-Strength Steel",
    baseMetal: "Fe",
    standardRef: "AMS 6414 / ASTM A322 / MIL-S-5000",
    initialGrainSize_um: 22.0,
    grainGrowthExponent_n: 2.2,
    activationEnergy_kJ_mol: 235,
    preExponential_k0: 1.8e11,
    solvusTemp_C: 780, // Ac3
    criticalTemp_Ac3_C: 780,
    solidusTemp_C: 1425,
    precipitateType: "M3C / M23C6 Carbides & Prior Austenite Boundaries",
    initialPrecipVolFrac: 2.5,
    precipMeanRadius_nm: 45,
    hallPetch_ky_MPa_um05: 550,
    baseFrictionStress_MPa: 320,
  },
  {
    id: "aisi1045",
    name: "AISI 1045 Medium Carbon Structural Steel",
    baseMetal: "Fe",
    standardRef: "ASTM A29 / DIN 1.1191 / C45E",
    initialGrainSize_um: 28.0,
    grainGrowthExponent_n: 2.1,
    activationEnergy_kJ_mol: 220,
    preExponential_k0: 3.5e11,
    solvusTemp_C: 760, // Ac3
    criticalTemp_Ac3_C: 760,
    solidusTemp_C: 1450,
    precipitateType: "Interlamellar Cementite Fe3C / Ferrite",
    initialPrecipVolFrac: 3.8,
    precipMeanRadius_nm: 80,
    hallPetch_ky_MPa_um05: 520,
    baseFrictionStress_MPa: 210,
  },
  {
    id: "ss316l",
    name: "AISI 316L Austenitic Stainless Steel",
    baseMetal: "Fe",
    standardRef: "ASTM A240 / EN 1.4404 / UNS S31603",
    initialGrainSize_um: 30.0,
    grainGrowthExponent_n: 2.4,
    activationEnergy_kJ_mol: 270,
    preExponential_k0: 7.2e10,
    solvusTemp_C: 1050,
    criticalTemp_Ac3_C: 1050,
    solidusTemp_C: 1375,
    precipitateType: "Cr23C6 Carbides (Pre-solutionized)",
    initialPrecipVolFrac: 0.8,
    precipMeanRadius_nm: 50,
    hallPetch_ky_MPa_um05: 490,
    baseFrictionStress_MPa: 180,
  },
  {
    id: "ss174ph",
    name: "17-4 PH Precipitation Hardening Stainless Steel",
    baseMetal: "Fe",
    standardRef: "ASTM A564 / AMS 5643 / UNS S17400",
    initialGrainSize_um: 16.0,
    grainGrowthExponent_n: 2.3,
    activationEnergy_kJ_mol: 245,
    preExponential_k0: 2.2e11,
    solvusTemp_C: 860,
    criticalTemp_Ac3_C: 860,
    solidusTemp_C: 1404,
    precipitateType: "Coherent ε-Cu Nanoclusters & NbC",
    initialPrecipVolFrac: 5.0,
    precipMeanRadius_nm: 12,
    hallPetch_ky_MPa_um05: 610,
    baseFrictionStress_MPa: 420,
  },
  {
    id: "alsi10mg",
    name: "AlSi10Mg Additive Aluminum Alloy",
    baseMetal: "Al",
    standardRef: "AMS 4288 / ASTM F3318 / EN 1706",
    initialGrainSize_um: 8.5,
    grainGrowthExponent_n: 2.0,
    activationEnergy_kJ_mol: 135,
    preExponential_k0: 3.5e7,
    solvusTemp_C: 520, // Si / Mg2Si solvus
    criticalTemp_Ac3_C: 520,
    solidusTemp_C: 570,
    precipitateType: "β''-Mg2Si / Eutectic Si Cellular Dispersoids",
    initialPrecipVolFrac: 8.5,
    precipMeanRadius_nm: 15,
    hallPetch_ky_MPa_um05: 220,
    baseFrictionStress_MPa: 110,
  },
  {
    id: "al7075",
    name: "AA 7075 Ultra-High Strength Aluminum (Al-Zn-Mg-Cu)",
    baseMetal: "Al",
    standardRef: "ASTM B209 / AMS 4045 / UNS A97075",
    initialGrainSize_um: 14.0,
    grainGrowthExponent_n: 2.1,
    activationEnergy_kJ_mol: 142,
    preExponential_k0: 8.4e8,
    solvusTemp_C: 480, // η-MgZn2 solvus
    criticalTemp_Ac3_C: 480,
    solidusTemp_C: 477,
    precipitateType: "η'-MgZn2 & GP Zones",
    initialPrecipVolFrac: 6.5,
    precipMeanRadius_nm: 8,
    hallPetch_ky_MPa_um05: 240,
    baseFrictionStress_MPa: 160,
  },
  {
    id: "cu_c11000",
    name: "C11000 Electrolytic Tough Pitch (ETP) Pure Copper",
    baseMetal: "Cu",
    standardRef: "ASTM B152 / UNS C11000 / CW004A",
    initialGrainSize_um: 24.0,
    grainGrowthExponent_n: 2.0,
    activationEnergy_kJ_mol: 110,
    preExponential_k0: 9.5e7,
    solvusTemp_C: 450,
    criticalTemp_Ac3_C: 450,
    solidusTemp_C: 1065,
    precipitateType: "Cu2O Oxide Inclusions",
    initialPrecipVolFrac: 0.2,
    precipMeanRadius_nm: 150,
    hallPetch_ky_MPa_um05: 180,
    baseFrictionStress_MPa: 45,
  },
  {
    id: "cmsx4",
    name: "CMSX-4 Single-Crystal / SX Superalloy",
    baseMetal: "Ni",
    standardRef: "Aerospace Turbine Airfoil Specification",
    initialGrainSize_um: 35.0,
    grainGrowthExponent_n: 3.0,
    activationEnergy_kJ_mol: 310,
    preExponential_k0: 2.5e11,
    solvusTemp_C: 1280, // γ' Solvus
    criticalTemp_Ac3_C: 1280,
    solidusTemp_C: 1335,
    precipitateType: "γ'-Ni3(Al,Ta,Ti) Cuboidal Superlattice (70% vol)",
    initialPrecipVolFrac: 68.0,
    precipMeanRadius_nm: 250,
    hallPetch_ky_MPa_um05: 680,
    baseFrictionStress_MPa: 620,
  },
];

export interface HeatTreatmentPreset {
  id: string;
  name: string;
  materialId: string;
  description: string;
  stages: ThermalStage[];
}

export const HEAT_TREATMENT_PRESETS: HeatTreatmentPreset[] = [
  {
    id: "inconel718_standard_age",
    name: "AMS 5662 Solutionize & 2-Stage Aging (Inconel 718)",
    materialId: "inconel718",
    description: "Standard aerospace specification for high tensile yield & stress rupture life.",
    stages: [
      {
        id: "s1",
        name: "Furnace Ramp to Solvus",
        type: "ramp",
        startTemp_C: 25,
        targetTemp_C: 980,
        rate_C_per_min: 15,
        duration_min: 64,
        atmosphere: "Vacuum",
        purpose: "Preheat & thermal homogenization",
      },
      {
        id: "s2",
        name: "Solution Annealing Soak",
        type: "soak",
        startTemp_C: 980,
        targetTemp_C: 980,
        duration_min: 60,
        atmosphere: "Vacuum",
        purpose: "Dissolve δ-phase & recrystallize grain structure",
      },
      {
        id: "s3",
        name: "Rapid Gas Quench",
        type: "quench",
        startTemp_C: 980,
        targetTemp_C: 720,
        rate_C_per_min: 60,
        duration_min: 4.3,
        atmosphere: "Argon",
        purpose: "Supersaturate matrix without premature γ'' coarsening",
      },
      {
        id: "s4",
        name: "Primary Aging Soak (γ'' Nucleation)",
        type: "soak",
        startTemp_C: 720,
        targetTemp_C: 720,
        duration_min: 480, // 8 hours
        atmosphere: "Vacuum",
        purpose: "Dense coherent γ'' Ni3Nb disk nucleation",
      },
      {
        id: "s5",
        name: "Controlled Furnace Cool (55°C/h)",
        type: "ramp",
        startTemp_C: 720,
        targetTemp_C: 620,
        rate_C_per_min: 0.92,
        duration_min: 108,
        atmosphere: "Vacuum",
        purpose: "Continuous precipitation coarsening step",
      },
      {
        id: "s6",
        name: "Secondary Aging Soak (γ' Stabilization)",
        type: "soak",
        startTemp_C: 620,
        targetTemp_C: 620,
        duration_min: 480, // 8 hours
        atmosphere: "Vacuum",
        purpose: "Stabilize precipitate morphology against high-T creep",
      },
      {
        id: "s7",
        name: "Final Air Cool",
        type: "quench",
        startTemp_C: 620,
        targetTemp_C: 25,
        rate_C_per_min: 25,
        duration_min: 23.8,
        atmosphere: "Air",
        purpose: "Ambient discharge to QA inspection",
      },
    ],
  },
  {
    id: "ti64_duplex_anneal",
    name: "AMS 4928 Sub-Transus Duplex Anneal (Ti-6Al-4V)",
    materialId: "ti64",
    description: "Produces equiaxed α grains in transformed β matrix with high fracture toughness.",
    stages: [
      {
        id: "s1",
        name: "Ramp to Sub-Transus",
        type: "ramp",
        startTemp_C: 25,
        targetTemp_C: 955,
        rate_C_per_min: 12,
        duration_min: 77.5,
        atmosphere: "Vacuum",
        purpose: "Controlled preheat below β-transus (995°C)",
      },
      {
        id: "s2",
        name: "Sub-Transus Solution Hold",
        type: "soak",
        startTemp_C: 955,
        targetTemp_C: 955,
        duration_min: 90,
        atmosphere: "Vacuum",
        purpose: "Partition α/β volume fractions and globularize alpha",
      },
      {
        id: "s3",
        name: "Forced Gas / Water Spray Quench",
        type: "quench",
        startTemp_C: 955,
        targetTemp_C: 540,
        rate_C_per_min: 120,
        duration_min: 3.5,
        atmosphere: "Argon",
        purpose: "Transform retained β to acicular martensitic α'",
      },
      {
        id: "s4",
        name: "Stabilization / Aging Hold",
        type: "soak",
        startTemp_C: 540,
        targetTemp_C: 540,
        duration_min: 240, // 4 hours
        atmosphere: "Vacuum",
        purpose: "Decompose martensite into fine α+β plates & relieve stress",
      },
      {
        id: "s5",
        name: "Final Air Cool",
        type: "quench",
        startTemp_C: 540,
        targetTemp_C: 25,
        rate_C_per_min: 20,
        duration_min: 25.8,
        atmosphere: "Air",
        purpose: "Cool to room temperature",
      },
    ],
  },
  {
    id: "aisi4340_quench_temper",
    name: "AMS 6414 Austenitize & Temper (AISI 4340 High-Strength)",
    materialId: "aisi4340",
    description: "Full hardening for 1800-2000 MPa tensile airframe structural forgings.",
    stages: [
      {
        id: "s1",
        name: "Preheat & Austenitizing Ramp",
        type: "ramp",
        startTemp_C: 25,
        targetTemp_C: 845,
        rate_C_per_min: 10,
        duration_min: 82,
        atmosphere: "Nitrogen",
        purpose: "Uniform austenitization above Ac3 (780°C)",
      },
      {
        id: "s2",
        name: "Austenitizing Soak",
        type: "soak",
        startTemp_C: 845,
        targetTemp_C: 845,
        duration_min: 60,
        atmosphere: "Nitrogen",
        purpose: "Complete carbon dissolution and uniform γ grain size",
      },
      {
        id: "s3",
        name: "Agitated Oil Quench",
        type: "quench",
        startTemp_C: 845,
        targetTemp_C: 60,
        rate_C_per_min: 300,
        duration_min: 2.6,
        atmosphere: "Air",
        purpose: "100% Lath Martensite transformation",
      },
      {
        id: "s4",
        name: "Primary Tempering Hold",
        type: "soak",
        startTemp_C: 480,
        targetTemp_C: 480,
        duration_min: 120,
        atmosphere: "Air",
        purpose: "Carbide precipitation and recovery of toughness",
      },
      {
        id: "s5",
        name: "Air Cool to Room Temp",
        type: "quench",
        startTemp_C: 480,
        targetTemp_C: 25,
        rate_C_per_min: 15,
        duration_min: 30.3,
        atmosphere: "Air",
        purpose: "Final stress equalization",
      },
    ],
  },
  {
    id: "alsi10mg_t6_cycle",
    name: "AMS 4288 Additive T6 Heat Treatment (AlSi10Mg LPBF)",
    materialId: "alsi10mg",
    description: "Dissolves eutectic cellular silicon network into high-ductility precipitation state.",
    stages: [
      {
        id: "s1",
        name: "Stress Relief Ramp",
        type: "ramp",
        startTemp_C: 25,
        targetTemp_C: 300,
        rate_C_per_min: 10,
        duration_min: 27.5,
        atmosphere: "Air",
        purpose: "Relieve LPBF residual thermal stresses",
      },
      {
        id: "s2",
        name: "Stress Relief Soak",
        type: "soak",
        startTemp_C: 300,
        targetTemp_C: 300,
        duration_min: 120,
        atmosphere: "Air",
        purpose: "Dimensional stabilization",
      },
      {
        id: "s3",
        name: "Ramp to Solution Temperature",
        type: "ramp",
        startTemp_C: 300,
        targetTemp_C: 535,
        rate_C_per_min: 8,
        duration_min: 29.4,
        atmosphere: "Air",
        purpose: "Approach Si/Mg solidus safely",
      },
      {
        id: "s4",
        name: "Solution Heat Treatment Soak",
        type: "soak",
        startTemp_C: 535,
        targetTemp_C: 535,
        duration_min: 60,
        atmosphere: "Air",
        purpose: "Spheroidize cellular Si & supersaturate α-Al matrix",
      },
      {
        id: "s5",
        name: "Warm Water Quench (60°C)",
        type: "quench",
        startTemp_C: 535,
        targetTemp_C: 60,
        rate_C_per_min: 400,
        duration_min: 1.2,
        atmosphere: "Air",
        purpose: "Suppress equilibrium β-Mg2Si precipitation",
      },
      {
        id: "s6",
        name: "Artificial Aging Hold",
        type: "soak",
        startTemp_C: 160,
        targetTemp_C: 160,
        duration_min: 720, // 12 hours
        atmosphere: "Air",
        purpose: "Precipitate dense GP-zones and β'' needle hardening",
      },
      {
        id: "s7",
        name: "Final Air Cool",
        type: "quench",
        startTemp_C: 160,
        targetTemp_C: 25,
        rate_C_per_min: 10,
        duration_min: 13.5,
        atmosphere: "Air",
        purpose: "Ambient discharge",
      },
    ],
  },
];

export interface SimulationTimePoint {
  time_min: number;
  temperature_C: number;
  grainSize_um: number;
  astmGrainSizeNumber_G: number;
  zenerLimit_um: number;
  precipFraction_pct: number;
  yieldStrength_MPa: number;
  hardness_HV: number;
  stageIndex: number;
  stageName: string;
}

interface ThermalCycleSchedulerProps {
  onNavigate?: (tabId: string) => void;
}

export const ThermalCycleScheduler: React.FC<ThermalCycleSchedulerProps> = ({ onNavigate }) => {
  // Ingested Data Pipeline State
  const [injectedPayload, setInjectedPayload] = useState<PipelineMaterialPayload | null>(() =>
    getActivePipelineMaterial()
  );

  // Subscribe to pipeline updates
  useEffect(() => {
    const unsub = subscribeToPipelineMaterial((payload) => {
      setInjectedPayload(payload);
      if (payload) {
        // Auto select injected material
        setSelectedMaterialId(`injected-${payload.id}`);
      }
    });
    return unsub;
  }, []);

  // Dynamically synthesized MaterialThermalProfile from pipeline
  const injectedProfile: MaterialThermalProfile | null = useMemo(() => {
    if (!injectedPayload) return null;
    const kp = injectedPayload.kineticProfile;
    return {
      id: `injected-${injectedPayload.id}`,
      name: `⚡ ${injectedPayload.name} (Pipeline Ingested)`,
      baseMetal: kp.baseMetal,
      standardRef: injectedPayload.standard || "Custom ICME Synthesis",
      initialGrainSize_um: kp.initialGrainSize_um,
      grainGrowthExponent_n: kp.grainGrowthExponent_n,
      activationEnergy_kJ_mol: kp.activationEnergy_kJ_mol,
      preExponential_k0: kp.preExponential_k0,
      solvusTemp_C: kp.solvusTemp_C,
      criticalTemp_Ac3_C: kp.criticalTemp_Ac3_C,
      solidusTemp_C: kp.solidusTemp_C,
      precipitateType: kp.precipitateType,
      initialPrecipVolFrac: kp.initialPrecipVolFrac,
      precipMeanRadius_nm: kp.precipMeanRadius_nm,
      hallPetch_ky_MPa_um05: kp.hallPetch_ky_MPa_um05,
      baseFrictionStress_MPa: kp.baseFrictionStress_MPa,
    };
  }, [injectedPayload]);

  const allAvailableProfiles = useMemo(() => {
    if (injectedProfile) {
      return [injectedProfile, ...MATERIAL_THERMAL_PROFILES];
    }
    return MATERIAL_THERMAL_PROFILES;
  }, [injectedProfile]);

  // Active material selection
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(() => {
    const active = getActivePipelineMaterial();
    if (active) return `injected-${active.id}`;
    return "inconel718";
  });

  const material = useMemo(() => {
    return (
      allAvailableProfiles.find((m) => m.id === selectedMaterialId) ||
      allAvailableProfiles[0]
    );
  }, [selectedMaterialId, allAvailableProfiles]);

  // Active stages
  const [stages, setStages] = useState<ThermalStage[]>(
    HEAT_TREATMENT_PRESETS[0].stages
  );

  // Initial grain size tweak
  const [customInitialGrainSize, setCustomInitialGrainSize] = useState<number>(
    material.initialGrainSize_um
  );

  // When material changes, update default initial grain size
  useEffect(() => {
    setCustomInitialGrainSize(material.initialGrainSize_um);
  }, [material]);

  // Selected stage for editing
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || "s1");

  // Simulation playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime_min, setPlaybackTime_min] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(10); // multiplier

  // Copied recipe status
  const [copied, setCopied] = useState<boolean>(false);

  // Active view switcher: Full Integrated Studio vs Dedicated Grain Growth Kinetics Panel
  const [schedulerViewMode, setSchedulerViewMode] = useState<"studio" | "kinetics-panel">("studio");

  // Canvas for Microstructure Grain Evolution
  const grainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- 1. FULL MULTI-STAGE THERMAL CYCLE KINETICS SOLVER ---
  const simulationResults = useMemo(() => {
    const timePoints: SimulationTimePoint[] = [];
    const R_GAS = 8.314; // J / (mol K)
    const n_exp = material.grainGrowthExponent_n;
    const Q_J = material.activationEnergy_kJ_mol * 1000;
    const k0 = material.preExponential_k0;

    let currentD = customInitialGrainSize;
    let accumulatedTime_min = 0;

    // Helper: calculate Zener pinning limit at temperature T
    const getZenerAndPrecip = (T_C: number) => {
      const T_solvus = material.solvusTemp_C;
      const initialFv = material.initialPrecipVolFrac; // e.g. 4.2%
      let f_v_pct = initialFv;
      const r_p_nm = material.precipMeanRadius_nm;

      // Thermodynamic dissolution behavior across solvus:
      if (T_C >= T_solvus) {
        // Above solvus, secondary phases rapidly dissolve into solid solution
        const excess = T_C - T_solvus;
        const dissolveFrac = Math.min(1.0, excess / 35); // fully dissolved 35°C above solvus
        // Retain only insoluble background dispersoids (e.g. primary MC carbides / oxides)
        f_v_pct = initialFv * 0.05 * (1 - dissolveFrac) + 0.02;
      } else {
        // Below solvus: as temperature increases towards solvus, solubility increases (partial dissolution)
        const undercool = T_solvus - T_C;
        if (undercool < 150) {
          // Near-solvus dissolution zone (e.g. 860°C - 1010°C for Inconel 718)
          const nearSolvusRatio = undercool / 150;
          f_v_pct = initialFv * (0.25 + 0.75 * nearSolvusRatio);
        } else {
          // Low temperature / aging zone: full precipitation with minor ripening
          f_v_pct = initialFv * Math.min(1.2, 1.0 + Math.sin((undercool / 350) * Math.PI) * 0.15);
        }
      }

      // Physical Zener Pinning Formulation (Gladman / Zener / Hillert):
      // Grain-boundary pinning particles have effective radius r_pin (0.15 - 0.5 um)
      // and boundary pinning fraction f_pin = max(0.0002, (f_v_pct / 100) * 0.04)
      const r_pin_um = Math.max(0.15, (r_p_nm / 1000) * 5.0);
      const f_pin = Math.max(0.0002, (f_v_pct / 100) * 0.04);
      const D_zener_calc = (4 * r_pin_um) / (3 * f_pin);

      // Zener limit is an upper growth ceiling, always strictly >= baseline starting grain size D0 * 1.15
      const D_zener = Math.min(500, Math.max(customInitialGrainSize * 1.15, D_zener_calc));

      return {
        zenerLimit_um: parseFloat(D_zener.toFixed(1)),
        precipFraction_pct: parseFloat(Math.max(0.01, f_v_pct).toFixed(2)),
      };
    };

    // Helper: calculate ASTM E112 G from diameter in um
    const getASTM_G = (D_um: number) => {
      // ASTM E112 G ~ 10.0 - 6.64 * log10(D_um / 15.9)
      const G = 10.0 - 6.643856 * Math.log10(Math.max(1.0, D_um) / 15.9);
      return parseFloat(G.toFixed(1));
    };

    // Helper: calculate yield strength via Hall-Petch + precipitate hardening
    const getYieldAndHardness = (D_um: number, precipPct: number, T_C: number) => {
      const sigma_0 = material.baseFrictionStress_MPa;
      const k_hp = material.hallPetch_ky_MPa_um05;
      const delta_hp = k_hp / Math.sqrt(Math.max(0.5, D_um));
      const delta_precip = precipPct * 22.0; // Orowan / shear strengthening approx
      const yieldMPa = Math.round(sigma_0 + delta_hp + delta_precip);
      const hardnessHV = Math.round(yieldMPa / 3.1 + 45);
      return { yieldMPa, hardnessHV };
    };

    // Process each stage with fine numerical discretization
    stages.forEach((stage, sIdx) => {
      const duration_min = Math.max(0.1, stage.duration_min);
      const stepsCount = Math.max(15, Math.min(200, Math.round(duration_min * 2)));
      const dt_min = duration_min / stepsCount;
      const dt_sec = dt_min * 60;

      for (let step = 0; step <= stepsCount; step++) {
        // Skip duplicate boundary points between stages
        if (step === 0 && timePoints.length > 0) continue;

        const fraction = step / stepsCount;
        let currentT_C = stage.startTemp_C;

        if (stage.type === "ramp" || stage.type === "quench") {
          currentT_C = stage.startTemp_C + (stage.targetTemp_C - stage.startTemp_C) * fraction;
        } else {
          currentT_C = stage.startTemp_C; // soak is isothermal
        }

        const T_K = currentT_C + 273.15;
        const { zenerLimit_um, precipFraction_pct } = getZenerAndPrecip(currentT_C);

        // Burke-Turnbull / Hillert grain growth with Zener drag:
        // d(D^n) / dt = k0 * exp(-Q/RT) * max(0, 1 - (D / D_Z))
        // Only if temperature is high enough for diffusion (> 0.40 * T_solidus)
        const homologousT = T_K / (material.solidusTemp_C + 273.15);
        if (homologousT > 0.40 && currentD < zenerLimit_um) {
          const rateConstant = k0 * Math.exp(-Q_J / (R_GAS * T_K)); // um^n / s
          const zenerRetardation = Math.max(0, 1.0 - Math.pow(currentD / zenerLimit_um, 1.2));
          const dDn = rateConstant * zenerRetardation * dt_sec;
          const nextDn = Math.pow(currentD, n_exp) + dDn;
          const potentialD = Math.pow(nextDn, 1 / n_exp);

          // Restrict by Zener Pinning limit and ensure monotonically non-decreasing
          currentD = Math.max(customInitialGrainSize, Math.min(zenerLimit_um, potentialD));
        }

        const astmG = getASTM_G(currentD);
        const { yieldMPa, hardnessHV } = getYieldAndHardness(
          currentD,
          precipFraction_pct,
          currentT_C
        );

        timePoints.push({
          time_min: parseFloat((accumulatedTime_min + step * dt_min).toFixed(2)),
          temperature_C: parseFloat(currentT_C.toFixed(1)),
          grainSize_um: parseFloat(currentD.toFixed(2)),
          astmGrainSizeNumber_G: astmG,
          zenerLimit_um: parseFloat(zenerLimit_um.toFixed(1)),
          precipFraction_pct,
          yieldStrength_MPa: yieldMPa,
          hardness_HV: hardnessHV,
          stageIndex: sIdx,
          stageName: stage.name,
        });
      }

      accumulatedTime_min += duration_min;
    });

    const totalTime_min = accumulatedTime_min;
    const finalPoint = timePoints[timePoints.length - 1] || {
      time_min: 0,
      temperature_C: 25,
      grainSize_um: customInitialGrainSize,
      astmGrainSizeNumber_G: getASTM_G(customInitialGrainSize),
      zenerLimit_um: 100,
      precipFraction_pct: 0,
      yieldStrength_MPa: 500,
      hardness_HV: 200,
      stageIndex: 0,
      stageName: "",
    };

    const maxTemp = Math.max(...timePoints.map((p) => p.temperature_C), 100);
    const minTemp = Math.min(...timePoints.map((p) => p.temperature_C), 20);
    const maxGrain = Math.max(...timePoints.map((p) => p.grainSize_um), 10);
    const coarseningFactor = parseFloat(
      (finalPoint.grainSize_um / Math.max(0.1, customInitialGrainSize)).toFixed(2)
    );

    return {
      timePoints,
      totalTime_min,
      finalPoint,
      maxTemp,
      minTemp,
      maxGrain,
      coarseningFactor,
    };
  }, [stages, material, customInitialGrainSize]);

  // Current interpolated state at playback time
  const currentSimState = useMemo(() => {
    const pts = simulationResults.timePoints;
    if (!pts || pts.length === 0) return null;
    const clampedTime = Math.max(0, Math.min(playbackTime_min, simulationResults.totalTime_min));

    // Find bounding points
    let idx = pts.findIndex((p) => p.time_min >= clampedTime);
    if (idx === -1) idx = pts.length - 1;
    if (idx === 0) return pts[0];

    const p0 = pts[idx - 1];
    const p1 = pts[idx];
    const dt = Math.max(0.001, p1.time_min - p0.time_min);
    const frac = (clampedTime - p0.time_min) / dt;

    return {
      time_min: clampedTime,
      temperature_C: Math.round(p0.temperature_C + (p1.temperature_C - p0.temperature_C) * frac),
      grainSize_um: parseFloat((p0.grainSize_um + (p1.grainSize_um - p0.grainSize_um) * frac).toFixed(2)),
      astmGrainSizeNumber_G: parseFloat(
        (p0.astmGrainSizeNumber_G + (p1.astmGrainSizeNumber_G - p0.astmGrainSizeNumber_G) * frac).toFixed(1)
      ),
      zenerLimit_um: Math.round(p0.zenerLimit_um + (p1.zenerLimit_um - p0.zenerLimit_um) * frac),
      precipFraction_pct: parseFloat(
        (p0.precipFraction_pct + (p1.precipFraction_pct - p0.precipFraction_pct) * frac).toFixed(2)
      ),
      yieldStrength_MPa: Math.round(
        p0.yieldStrength_MPa + (p1.yieldStrength_MPa - p0.yieldStrength_MPa) * frac
      ),
      hardness_HV: Math.round(p0.hardness_HV + (p1.hardness_HV - p0.hardness_HV) * frac),
      stageIndex: p1.stageIndex,
      stageName: p1.stageName,
    };
  }, [simulationResults, playbackTime_min]);

  // Simulation Playback Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPlaybackTime_min((prev) => {
        const next = prev + 0.5 * (playbackSpeed / 5);
        if (next >= simulationResults.totalTime_min) {
          setIsPlaying(false);
          return simulationResults.totalTime_min;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, simulationResults.totalTime_min]);

  // --- 2. 2D GRAIN STRUCTURE CANVAs RENDERING ---
  useEffect(() => {
    const canvas = grainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const currentD = currentSimState ? currentSimState.grainSize_um : customInitialGrainSize;
    const currentT = currentSimState ? currentSimState.temperature_C : 25;
    const precipPct = currentSimState ? currentSimState.precipFraction_pct : material.initialPrecipVolFrac;

    // Clear canvas
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, W, H);

    // Number of grains on canvas inversely proportional to D^2
    // Base scale: at D = 10 um, ~120 grains; at D = 50 um, ~15 grains
    const scaleFactor = Math.max(6, Math.min(90, (currentD / 12) * 24));
    const cols = Math.max(3, Math.ceil(W / scaleFactor));
    const rows = Math.max(3, Math.ceil(H / scaleFactor));

    // Draw Voronoi-like polycrystal lattice
    const cellW = W / cols;
    const cellH = H / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Seed center with slight jitter based on coordinate hash
        const seedX = c * cellW + cellW * 0.5 + Math.sin(r * 3.7 + c * 1.9) * (cellW * 0.25);
        const seedY = r * cellH + cellH * 0.5 + Math.cos(r * 2.1 + c * 4.3) * (cellH * 0.25);

        // IPF-Z Color orientation (crystallographic Euler pseudo-color)
        const hue = Math.abs(Math.sin(r * 7.1 + c * 5.3) * 360);
        const sat = 55 + Math.sin(r * 2.3) * 20;
        const lum = 25 + Math.cos(c * 3.1) * 15;

        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`;
        ctx.strokeStyle = currentT > 850 ? "#f97316" : "#1e293b";
        ctx.lineWidth = currentT > 850 ? 1.5 : 1.0;

        ctx.beginPath();
        ctx.rect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
        ctx.fill();
        ctx.stroke();

        // Draw subgrain / dislocation cell textures if warm
        if (currentT > 400 && currentT < 1000) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(c * cellW + 4, r * cellH + 4);
          ctx.lineTo(c * cellW + cellW - 4, r * cellH + cellH - 4);
          ctx.stroke();
        }
      }
    }

    // Render Pinning Precipitates / Dispersoids (tiny bright dots)
    const numPrecipDots = Math.floor(precipPct * 8);
    ctx.fillStyle = currentT > material.solvusTemp_C ? "rgba(239, 68, 68, 0.7)" : "rgba(56, 189, 248, 0.8)";
    for (let p = 0; p < numPrecipDots; p++) {
      const px = (Math.sin(p * 12.3) * 0.5 + 0.5) * W;
      const py = (Math.cos(p * 18.7) * 0.5 + 0.5) * H;
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Overlay scale bar on canvas
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(W - 85, H - 28, 80, 24);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - 80, H - 12);
    ctx.lineTo(W - 20, H - 12);
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "9px monospace";
    ctx.fillText(`${(scaleFactor * 0.8).toFixed(0)} µm`, W - 65, H - 16);
  }, [currentSimState, customInitialGrainSize, material]);

  // --- 3. STAGE MANAGEMENT HANDLERS ---
  const handleApplyPreset = (presetId: string) => {
    const p = HEAT_TREATMENT_PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    setSelectedMaterialId(p.materialId);
    setStages(JSON.parse(JSON.stringify(p.stages)));
    setSelectedStageId(p.stages[0]?.id || "s1");
    setPlaybackTime_min(0);
    setIsPlaying(false);
  };

  const handleAddStage = (type: StageType) => {
    const lastStage = stages[stages.length - 1];
    const prevTemp = lastStage ? lastStage.targetTemp_C : 25;
    const newId = `s_${Date.now().toString().slice(-4)}`;

    let newStage: ThermalStage;
    if (type === "ramp") {
      newStage = {
        id: newId,
        name: `Ramp to ${prevTemp + 150}°C`,
        type: "ramp",
        startTemp_C: prevTemp,
        targetTemp_C: Math.min(1350, prevTemp + 150),
        rate_C_per_min: 10,
        duration_min: 15,
        atmosphere: "Vacuum",
        purpose: "Controlled heating step",
      };
    } else if (type === "soak") {
      newStage = {
        id: newId,
        name: `Isothermal Hold (${prevTemp}°C)`,
        type: "soak",
        startTemp_C: prevTemp,
        targetTemp_C: prevTemp,
        duration_min: 60,
        atmosphere: "Vacuum",
        purpose: "Isothermal homogenization / aging soak",
      };
    } else {
      newStage = {
        id: newId,
        name: `Quench / Cool to 25°C`,
        type: "quench",
        startTemp_C: prevTemp,
        targetTemp_C: 25,
        rate_C_per_min: 50,
        duration_min: (prevTemp - 25) / 50,
        atmosphere: "Argon",
        purpose: "Controlled cooling discharge",
      };
    }

    setStages([...stages, newStage]);
    setSelectedStageId(newId);
  };

  const handleUpdateStage = (updated: Partial<ThermalStage>) => {
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === selectedStageId) {
          const merged = { ...s, ...updated };
          // If duration updated or rate updated, recompute
          if (updated.rate_C_per_min && merged.type !== "soak") {
            const dT = Math.abs(merged.targetTemp_C - merged.startTemp_C);
            merged.duration_min = parseFloat((dT / Math.max(0.1, updated.rate_C_per_min)).toFixed(1));
          } else if (updated.duration_min && merged.type !== "soak") {
            const dT = Math.abs(merged.targetTemp_C - merged.startTemp_C);
            merged.rate_C_per_min = parseFloat((dT / Math.max(0.1, updated.duration_min)).toFixed(2));
          }
          return merged;
        }
        return s;
      })
    );
  };

  const handleDeleteStage = (idToDelete: string) => {
    if (stages.length <= 1) return;
    const next = stages.filter((s) => s.id !== idToDelete);
    setStages(next);
    setSelectedStageId(next[0]?.id || "");
  };

  const handleCopyRecipeTable = () => {
    let text = `THERMAL CYCLE SCHEDULE & FURNACE RECIPE
Material: ${material.name} (${material.standardRef})
Initial Grain Size: ${customInitialGrainSize} µm | Final Grain Size: ${simulationResults.finalPoint.grainSize_um} µm (ASTM G = ${simulationResults.finalPoint.astmGrainSizeNumber_G})
Total Process Cycle Duration: ${(simulationResults.totalTime_min / 60).toFixed(2)} hours (${simulationResults.totalTime_min.toFixed(0)} min)

STAGE BREAKDOWN:
`;
    stages.forEach((st, idx) => {
      text += `Stage ${idx + 1}: ${st.name} [${st.type.toUpperCase()}]
  - Start: ${st.startTemp_C}°C ➔ Target: ${st.targetTemp_C}°C
  - Duration: ${st.duration_min} min ${st.rate_C_per_min ? `(Rate: ${st.rate_C_per_min} °C/min)` : ""}
  - Atmosphere: ${st.atmosphere}
  - Purpose: ${st.purpose}
`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportThermalTrace = () => {
    const columns = ["time_min", "temperature_C", "grainSize_um", "yieldStrength_MPa", "hardness_HV"] as const;
    const rows = simulationResults.timePoints.map(point => columns.map(key => point[key]).join(","));
    const url = URL.createObjectURL(new Blob([columns.join(",")+"\n"+rows.join("\n")], {type:"text/csv"}));
    const link=document.createElement("a");link.href=url;link.download=`ThermalCycle_${material.id}_predicted_trace.csv`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  const handleExportRecipeJSON = () => {
    const payload = {
      title: `Furnace_Cycle_${material.id}_${Date.now()}`,
      material: material.name,
      standardSpecification: material.standardRef,
      evidence: { status: "Unvalidated model prediction", scope: "Prescribed furnace schedule; empirical grain growth and strength estimates", experimentalValidation: "pending", furnaceControllerApproval: false },
      kinetics: {
        initialGrainSize_um: customInitialGrainSize,
        finalGrainSize_um: simulationResults.finalPoint.grainSize_um,
        astmGrainSizeNumber_G: simulationResults.finalPoint.astmGrainSizeNumber_G,
        coarseningRatio: simulationResults.coarseningFactor,
        finalYieldStrength_MPa: simulationResults.finalPoint.yieldStrength_MPa,
        finalHardness_HV: simulationResults.finalPoint.hardness_HV,
      },
      schedule: stages,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ThermalCycle_${material.id}_Recipe.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handler to load ingested material stages
  const handleLoadIngestedCycle = () => {
    if (!injectedPayload) return;
    setSelectedMaterialId(`injected-${injectedPayload.id}`);
    if (injectedPayload.suggestedThermalCycle && injectedPayload.suggestedThermalCycle.stages.length > 0) {
      setStages(JSON.parse(JSON.stringify(injectedPayload.suggestedThermalCycle.stages)));
      setSelectedStageId(injectedPayload.suggestedThermalCycle.stages[0]?.id || "s1");
    } else {
      const solvus = injectedPayload.kineticProfile.solvusTemp_C;
      const solHold = Math.round(solvus + 25);
      const ageHold = Math.round(solvus * 0.68);
      const newStages: ThermalStage[] = [
        {
          id: "s1_ramp_sol",
          name: `Ramp to Solvus (${solHold}°C)`,
          type: "ramp",
          startTemp_C: 25,
          targetTemp_C: solHold,
          rate_C_per_min: 12,
          duration_min: Math.max(15, Math.round((solHold - 25) / 12)),
          atmosphere: "Vacuum",
          purpose: "Approach homogenization solvus without thermal shock",
        },
        {
          id: "s2_soak_sol",
          name: `Solutionizing Soak (${solHold}°C)`,
          type: "soak",
          startTemp_C: solHold,
          targetTemp_C: solHold,
          duration_min: 90,
          atmosphere: "Vacuum",
          purpose: "Dissolve secondary phases & supersaturate matrix",
        },
        {
          id: "s3_quench",
          name: "Gas Fan Quench",
          type: "quench",
          startTemp_C: solHold,
          targetTemp_C: 60,
          rate_C_per_min: 150,
          duration_min: Math.max(2, Math.round((solHold - 60) / 150)),
          atmosphere: "Argon",
          purpose: "Freeze supersaturated solid solution",
        },
        {
          id: "s4_age",
          name: `Precipitation Age (${ageHold}°C)`,
          type: "soak",
          startTemp_C: ageHold,
          targetTemp_C: ageHold,
          duration_min: 360,
          atmosphere: "Argon",
          purpose: "Grow coherent nano-precipitates for peak Hall-Petch strength",
        },
      ];
      setStages(newStages);
      setSelectedStageId(newStages[0].id);
    }
    setPlaybackTime_min(0);
    setIsPlaying(false);
  };

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  return (
    <div id="thermal-cycle-scheduler-root" className="space-y-6 animate-fadeIn">
      {/* Active Pipeline Ingested Banner */}
      {injectedPayload && (
        <div className="bg-gradient-to-r from-amber-950/40 via-[#0d1527] to-[#090e18] p-4 rounded-2xl border border-amber-500/50 shadow-[0_0_24px_rgba(245,158,11,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-500/30">
                  Data Pipeline Ingestion Active
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Transferred from: <strong className="text-white">{injectedPayload.sourceModule}</strong>
                </span>
              </div>
              <h3 className="text-sm font-bold text-white font-mono mt-0.5">
                {injectedPayload.name} ({injectedPayload.standard || "Custom Alloy"})
              </h3>
              <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                Loaded Kinetics: Solvus = <strong className="text-rose-400">{injectedPayload.kineticProfile.solvusTemp_C}°C</strong> | Activation Q = <strong className="text-amber-400">{injectedPayload.kineticProfile.activationEnergy_kJ_mol} kJ/mol</strong> | Exponent n = <strong className="text-cyan-400">{injectedPayload.kineticProfile.grainGrowthExponent_n}</strong> | D₀ = <strong className="text-emerald-400">{injectedPayload.kineticProfile.initialGrainSize_um} µm</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLoadIngestedCycle}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-2 shadow-[0_0_16px_rgba(245,158,11,0.35)] transition"
            >
              <Flame className="w-4 h-4" />
              <span>Apply Tailored Thermal Recipe ⚡</span>
            </button>
            <button
              onClick={() => {
                clearActivePipelineMaterial();
                setInjectedPayload(null);
                setSelectedMaterialId("inconel718");
              }}
              className="p-2 rounded-xl bg-[#090e18] hover:bg-white/5 border border-[#162032] text-slate-400 hover:text-white transition"
              title="Clear injected alloy"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner & Preset Selector */}
      <div className="bg-[#090e18] p-5 rounded-2xl border border-[#162032] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-[10px] font-semibold uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>ICME Thermal Cycle Scheduler & Grain Growth Kinetics</span>
          </div>
          <h2 className="text-lg font-extrabold text-white tracking-tight mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Multi-Stage Furnace Thermal Cycle Simulator</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40 font-bold">
              Burke-Turnbull: Dⁿ - D₀ⁿ = k(T)·t
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-3xl">
            Program ramp heating, isothermal soaking & controlled quench rates. Simulates grain boundary migration, Zener precipitate pinning, ASTM E112 G number, and Hall-Petch strength evolution.
          </p>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 mt-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setSchedulerViewMode("studio");
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                schedulerViewMode === "studio"
                  ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
                  : "bg-[#050810] text-slate-400 hover:text-white border border-[#162032]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Full Studio Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSchedulerViewMode("kinetics-panel");
                const el = document.getElementById("grain-growth-kinetics-section");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                schedulerViewMode === "kinetics-panel"
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                  : "bg-[#050810] text-emerald-400 hover:text-emerald-300 border border-emerald-500/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grain Growth Kinetics Panel</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                Dⁿ - D₀ⁿ = k·t
              </span>
            </button>
          </div>
        </div>

        {/* Quick Aerospace & Industrial Presets */}
        <div className="flex items-center gap-2 overflow-x-auto p-1 bg-[#050810] rounded-xl border border-[#162032] self-start lg:self-auto">
          <span className="text-[10px] font-mono text-slate-500 uppercase px-2 whitespace-nowrap">
            Recipes:
          </span>
          {HEAT_TREATMENT_PRESETS.map((pr) => (
            <button
              key={pr.id}
              onClick={() => handleApplyPreset(pr.id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-[#1e2d46]"
              title={pr.description}
            >
              {pr.name.split(" ")[0]} {pr.name.split(" ")[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alloy Selection & Multi-Stage Furnace Scheduler */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Alloy Substrate & Base Thermal Properties */}
          <div className="bg-[#090e18] p-5 rounded-2xl border border-[#162032] space-y-4">
            <div className="flex items-center justify-between border-b border-[#162032] pb-3">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Substrate Matrix & Initial State</span>
              </h3>
              <span className="text-xs font-mono text-amber-300 font-bold">
                {material.baseMetal}-Base
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-400">
                    Selected Alloy System:
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <span>✓</span> Auto-Populating Kinetic Constants
                  </span>
                </div>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050810] border border-[#162032] text-amber-300 font-mono text-xs rounded-xl focus:outline-none focus:border-amber-400"
                >
                  {allAvailableProfiles.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.standardRef}
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Grain Size D0 */}
              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">Initial Grain Diameter (D₀):</span>
                  <span className="text-amber-400 font-extrabold text-sm">{customInitialGrainSize} µm</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="60"
                  step="0.5"
                  value={customInitialGrainSize}
                  onChange={(e) => setCustomInitialGrainSize(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#162032] rounded-lg"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Fine Additive (2 µm)</span>
                  <span>Forged (18 µm)</span>
                  <span>Coarse Ingot (60 µm)</span>
                </div>
              </div>

              {/* Alloy Critical Solvus & Activation Energy Badges */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Auto-Populated Kinetic Model Parameters</span>
                  <span className="text-amber-400/80 font-mono">Burke-Turnbull/Zener</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
                    <span className="text-slate-500 block text-[9px]">Solvus / Critical Temp (Ac3):</span>
                    <span className="text-rose-400 font-bold">{material.solvusTemp_C}°C</span>
                  </div>
                  <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
                    <span className="text-slate-500 block text-[9px]">Growth Exponent n:</span>
                    <span className="text-cyan-400 font-bold">n = {material.grainGrowthExponent_n}</span>
                  </div>
                  <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
                    <span className="text-slate-500 block text-[9px]">Activation Energy (Q):</span>
                    <span className="text-amber-400 font-bold">{material.activationEnergy_kJ_mol} kJ/mol</span>
                  </div>
                  <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
                    <span className="text-slate-500 block text-[9px]">Pre-Exponential (k₀):</span>
                    <span className="text-emerald-400 font-bold">{material.preExponential_k0.toExponential(1)} µmⁿ/min</span>
                  </div>
                  <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
                    <span className="text-slate-500 block text-[9px]">Hall-Petch ky:</span>
                    <span className="text-purple-400 font-bold">{material.hallPetch_ky_MPa_um05} MPa·µm½</span>
                  </div>
                  <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
                    <span className="text-slate-500 block text-[9px]">Friction Stress (σ₀):</span>
                    <span className="text-sky-400 font-bold">{material.baseFrictionStress_MPa} MPa</span>
                  </div>
                </div>
                <div className="p-2 bg-[#050810] rounded-lg border border-[#162032] text-[10px] font-mono text-slate-400">
                  <span className="text-slate-500 block">Precipitate Pinning Phase:</span>
                  <span className="text-slate-200">{material.precipitateType} ({material.initialPrecipVolFrac}% vol, r={material.precipMeanRadius_nm} nm)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Multi-Stage Furnace Scheduler & Stage Editor */}
          <div className="bg-[#090e18] p-5 rounded-2xl border border-[#162032] space-y-4">
            <div className="flex items-center justify-between border-b border-[#162032] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Furnace Stages ({stages.length})
                </h3>
              </div>

              {/* Add Stage Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddStage("ramp")}
                  className="px-2 py-1 bg-[#050810] hover:bg-white/10 border border-[#162032] text-[10px] font-mono text-amber-300 rounded-lg transition flex items-center gap-1"
                  title="Add Heating / Ramp Stage"
                >
                  <Plus className="w-3 h-3" /> Ramp
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStage("soak")}
                  className="px-2 py-1 bg-[#050810] hover:bg-white/10 border border-[#162032] text-[10px] font-mono text-amber-300 rounded-lg transition flex items-center gap-1"
                  title="Add Isothermal Soak Stage"
                >
                  <Plus className="w-3 h-3" /> Soak
                </button>
                <button
                  type="button"
                  onClick={() => handleAddStage("quench")}
                  className="px-2 py-1 bg-[#050810] hover:bg-white/10 border border-[#162032] text-[10px] font-mono text-amber-300 rounded-lg transition flex items-center gap-1"
                  title="Add Quench / Cool Stage"
                >
                  <Plus className="w-3 h-3" /> Quench
                </button>
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {stages.map((st, idx) => {
                const isSel = st.id === selectedStageId;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStageId(st.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSel
                        ? "bg-amber-500/10 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : "bg-[#050810] border-[#162032] hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          st.type === "ramp"
                            ? "bg-amber-500/20 text-amber-300"
                            : st.type === "soak"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{st.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 uppercase">
                            {st.type}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {st.startTemp_C}°C ➔ {st.targetTemp_C}°C • {st.duration_min} min • {st.atmosphere}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStage(st.id);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete this stage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Stage Editor Form */}
            {selectedStage && (
              <div className="p-3.5 bg-[#050810] rounded-xl border border-amber-900/40 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#162032] pb-2 text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Settings2 className="w-3.5 h-3.5" />
                    Edit Stage: {selectedStage.name}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{selectedStage.type}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Stage Name:</label>
                    <input
                      type="text"
                      value={selectedStage.name}
                      onChange={(e) => handleUpdateStage({ name: e.target.value })}
                      className="w-full px-2 py-1 bg-[#0c1322] border border-[#1e2d46] rounded text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Atmosphere:</label>
                    <select
                      value={selectedStage.atmosphere}
                      onChange={(e) => handleUpdateStage({ atmosphere: e.target.value as any })}
                      className="w-full px-2 py-1 bg-[#0c1322] border border-[#1e2d46] text-amber-300 rounded text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="Vacuum">Vacuum (10⁻⁴ mbar)</option>
                      <option value="Argon">Argon (99.999% Inert)</option>
                      <option value="Nitrogen">Nitrogen Protective</option>
                      <option value="Air">Air Atmosphere</option>
                      <option value="Hydrogen">Hydrogen Reducing</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Start Temp (°C):</label>
                    <input
                      type="number"
                      value={selectedStage.startTemp_C}
                      onChange={(e) => handleUpdateStage({ startTemp_C: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-[#0c1322] border border-[#1e2d46] rounded text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Target Temp (°C):</label>
                    <input
                      type="number"
                      value={selectedStage.targetTemp_C}
                      onChange={(e) => handleUpdateStage({ targetTemp_C: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-[#0c1322] border border-[#1e2d46] rounded text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Duration (minutes):</label>
                    <input
                      type="number"
                      step={1}
                      min={0.1}
                      value={selectedStage.duration_min}
                      onChange={(e) => handleUpdateStage({ duration_min: parseFloat(e.target.value) || 1 })}
                      className="w-full px-2 py-1 bg-[#0c1322] border border-[#1e2d46] rounded text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      {selectedStage.type === "soak" ? "Soak Hours:" : "Rate (°C/min):"}
                    </label>
                    {selectedStage.type === "soak" ? (
                      <div className="px-2 py-1 bg-[#0c1322] border border-[#1e2d46] rounded text-amber-300 text-xs">
                        {(selectedStage.duration_min / 60).toFixed(2)} hrs
                      </div>
                    ) : (
                      <input
                        type="number"
                        step={0.5}
                        value={
                          selectedStage.rate_C_per_min ||
                          parseFloat(
                            (
                              Math.abs(selectedStage.targetTemp_C - selectedStage.startTemp_C) /
                              Math.max(0.1, selectedStage.duration_min)
                            ).toFixed(1)
                          )
                        }
                        onChange={(e) =>
                          handleUpdateStage({ rate_C_per_min: parseFloat(e.target.value) || 1 })
                        }
                        className="w-full px-2 py-1 bg-[#0c1322] border border-[#1e2d46] rounded text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Charts, Live Simulation & Grain Evolution Canvas */}
        <div className="lg:col-span-7 space-y-6">
          {/* SIMULATION CONTROLS & LIVE METRICS BAR */}
          <div className="bg-[#090e18] p-5 rounded-2xl border border-[#162032] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Thermal Simulation Playhead
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-mono hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] transition"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? "Pause" : "Simulate Cycle"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaybackTime_min(0);
                    setIsPlaying(false);
                  }}
                  className="p-1.5 rounded-lg bg-[#0c1322] border border-[#1e2d46] text-slate-400 hover:text-white transition"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Speed Multiplier */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                  className="px-2 py-1 bg-[#0c1322] border border-[#1e2d46] text-amber-300 rounded-lg text-xs font-mono focus:outline-none"
                >
                  <option value="5">1x Speed</option>
                  <option value="15">5x Speed</option>
                  <option value="30">10x Speed</option>
                  <option value="60">25x Speed</option>
                </select>
              </div>
            </div>

            {/* Time Scrubber Slider */}
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">
                  Process Time:{" "}
                  <strong className="text-amber-400">
                    {(playbackTime_min / 60).toFixed(2)} h ({playbackTime_min.toFixed(0)} min)
                  </strong>{" "}
                  / {(simulationResults.totalTime_min / 60).toFixed(2)} h
                </span>
                <span className="text-slate-300">
                  Active Stage: <strong className="text-white">{currentSimState?.stageName || "Idle"}</strong>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={simulationResults.totalTime_min}
                step="0.5"
                value={playbackTime_min}
                onChange={(e) => {
                  setPlaybackTime_min(parseFloat(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-[#162032] rounded-lg"
              />
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center text-xs">
              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-slate-400 block font-semibold">Furnace Temperature</span>
                <span className="text-amber-400 font-extrabold text-lg mt-0.5 block">
                  {currentSimState?.temperature_C || 25}°C
                </span>
                <span className="text-[9px] text-slate-500">
                  Solvus: {material.solvusTemp_C}°C
                </span>
              </div>

              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-slate-400 block font-semibold">Mean Grain Size (D)</span>
                <span className="text-emerald-400 font-extrabold text-lg mt-0.5 block">
                  {currentSimState?.grainSize_um || customInitialGrainSize} µm
                </span>
                <span className="text-[9px] text-slate-500">
                  Zener Lim: {currentSimState?.zenerLimit_um || 100} µm
                </span>
              </div>

              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-slate-400 block font-semibold">ASTM E112 Number (G)</span>
                <span className="text-purple-400 font-extrabold text-lg mt-0.5 block">
                  G = {currentSimState?.astmGrainSizeNumber_G || 8.5}
                </span>
                <span className="text-[9px] text-slate-500">
                  {currentSimState && currentSimState.astmGrainSizeNumber_G > 8 ? "Fine Grain" : "Coarse Grain"}
                </span>
              </div>

              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-slate-400 block font-semibold">Yield Strength (σ_y)</span>
                <span className="text-cyan-400 font-extrabold text-lg mt-0.5 block">
                  {currentSimState?.yieldStrength_MPa || 900} MPa
                </span>
                <span className="text-[9px] text-slate-500">
                  Hardness: {currentSimState?.hardness_HV || 320} HV
                </span>
              </div>
            </div>
          </div>

          {/* D3.JS INTERACTIVE GRAIN EVOLUTION LINE CHART */}
          <GrainEvolutionD3Chart
            timePoints={simulationResults.timePoints}
            stages={stages}
            material={material}
            totalTime_min={simulationResults.totalTime_min}
            playbackTime_min={playbackTime_min}
            initialGrainSize_um={customInitialGrainSize}
            onSeekTime={(newTime) => {
              setPlaybackTime_min(newTime);
              setIsPlaying(false);
            }}
          />

          {/* 2D VORONOI GRAIN STRUCTURE VISUALIZER & EXPORT BAR */}
          <div className="bg-[#090e18] p-5 rounded-2xl border border-[#162032] space-y-4">
            <div className="flex items-center justify-between border-b border-[#162032] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Polycrystalline Grain Coarsening & Pinning Canvas
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Live 2D Euler Orientation Field
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* The Live 2D Polycrystal Canvas */}
              <div className="sm:col-span-5 flex flex-col items-center">
                <div className="relative p-1 bg-[#050810] rounded-xl border border-amber-900/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <canvas
                    ref={grainCanvasRef}
                    width={180}
                    height={180}
                    className="w-[180px] h-[180px] rounded-lg select-none"
                  />
                  <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/85 text-emerald-400 font-mono text-[9px] border border-emerald-500/30">
                    D = {currentSimState?.grainSize_um || customInitialGrainSize} µm
                  </span>
                </div>
              </div>

              {/* Kinetic Summary & Grain Growth Verification */}
              <div className="sm:col-span-7 space-y-2.5 font-mono text-xs">
                <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block font-bold">Grain Coarsening Factor:</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-amber-300 font-extrabold text-xl">
                      {simulationResults.coarseningFactor}x Growth
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {customInitialGrainSize} µm ➔ {simulationResults.finalPoint.grainSize_um} µm
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Final ASTM E112 Number: <strong>G = {simulationResults.finalPoint.astmGrainSizeNumber_G}</strong>
                  </span>
                </div>

                <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block font-bold">Second-Phase Pinning State:</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-cyan-300 font-extrabold text-sm">
                      {material.precipitateType.split("/")[0]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      f_v: {currentSimState?.precipFraction_pct || material.initialPrecipVolFrac}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {currentSimState && currentSimState.temperature_C > material.solvusTemp_C
                      ? "⚠️ Solvus exceeded: second-phase pinning lost (rapid coarsening)."
                      : "✓ Zener drag active: grain growth retarding boundaries."}
                  </span>
                </div>
              </div>
            </div>

            {/* Export & Copy Schedule Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#162032]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyRecipeTable}
                  className="px-3 py-1.5 rounded-lg bg-[#050810] hover:bg-white/10 border border-[#1e2d46] text-xs font-mono text-slate-300 hover:text-white transition flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Schedule Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Schedule</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportRecipeJSON}
                className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs font-mono hover:bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export research schedule JSON</span>
              </button>
              <button onClick={handleExportThermalTrace} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">Export predicted thermal trace CSV</button>
              <p className="text-xs text-amber-200/80">Research prediction only. The prescribed furnace schedule and estimated properties require experimental verification before process qualification.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. INTERACTIVE GRAIN GROWTH KINETICS PANEL (Burke-Turnbull Model: D^n - D_0^n = k*t) */}
      <div id="grain-growth-kinetics-section" className="mt-6">
        <GrainGrowthKineticsPanel
          stages={stages}
          material={material}
          initialGrainSize_um={customInitialGrainSize}
          onInitialGrainSizeChange={(newD0) => setCustomInitialGrainSize(newD0)}
          onSeekTime={(newTime) => {
            setPlaybackTime_min(newTime);
            setIsPlaying(false);
          }}
          activePlaybackTime_min={playbackTime_min}
        />
      </div>
    </div>
  );
};

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  Layers,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Zap,
  Activity,
  Droplets,
  RefreshCw,
  Sparkles,
  Info,
  Timer,
  ChevronRight,
  TrendingDown,
  Scale,
  SunMedium,
  Thermometer,
  FileCheck,
  Compass,
} from "lucide-react";

// ==========================================
// 1. DATA STRUCTURES & REFERENCE DATABASES
// ==========================================

export interface MaterialInterfaceProfile {
  id: string;
  name: string;
  category: "Titanium" | "Aluminum" | "Composite (CFRP)" | "Nickel Superalloy" | "High-Strength Steel" | "Stainless Steel" | "Coating/Barrier";
  standardPotentialV: number; // vs SHE (Standard Hydrogen Electrode)
  corrosionCurrentDensity_uAcm2: number; // typical passive current density in 3.5% NaCl
  pittingThresholdPotential_V: number; // E_pit vs SHE
  sccThresholdKIscc_MpaM: number; // MPa*sqrt(m) under marine chloride
  maxOperatingTempC: number;
  activationEnergyOxidation_kJmol: number; // Q for Wagner oxidation
  parabolicOxidationRateConst_kp0: number; // mg^2 / (cm^4 * s)
  densityGcm3: number;
  atomicMassGmol: number;
  valency: number;
  isInsulatorOrComposite?: boolean;
  notes: string;
}

export const INTERFACE_MATERIALS: MaterialInterfaceProfile[] = [
  {
    id: "cfrp-t800",
    name: "Carbon Fiber Reinforced Polymer (CFRP T800)",
    category: "Composite (CFRP)",
    standardPotentialV: +1.15,
    corrosionCurrentDensity_uAcm2: 0.01,
    pittingThresholdPotential_V: 1.5,
    sccThresholdKIscc_MpaM: 999, // Immune to metal SCC
    maxOperatingTempC: 180,
    activationEnergyOxidation_kJmol: 140,
    parabolicOxidationRateConst_kp0: 1.2e-4,
    densityGcm3: 1.60,
    atomicMassGmol: 12.01,
    valency: 2,
    isInsulatorOrComposite: true,
    notes: "Conductive graphite fibers act as an aggressive high-potential cathode causing intense galvanic attack on neighboring metals.",
  },
  {
    id: "ti-6al-4v",
    name: "Titanium Grade 5 (Ti-6Al-4V)",
    category: "Titanium",
    standardPotentialV: +0.22,
    corrosionCurrentDensity_uAcm2: 0.15,
    pittingThresholdPotential_V: 1.80,
    sccThresholdKIscc_MpaM: 45,
    maxOperatingTempC: 450,
    activationEnergyOxidation_kJmol: 230,
    parabolicOxidationRateConst_kp0: 3.5e-3,
    densityGcm3: 4.43,
    atomicMassGmol: 47.87,
    valency: 4,
    notes: "Dense protective TiO2 film. Chemically compatible with CFRP; noble cathode when coupled to aluminum alloys.",
  },
  {
    id: "ti-10-2-3",
    name: "Near-Beta Titanium (Ti-10V-2Fe-3Al)",
    category: "Titanium",
    standardPotentialV: +0.18,
    corrosionCurrentDensity_uAcm2: 0.20,
    pittingThresholdPotential_V: 1.70,
    sccThresholdKIscc_MpaM: 38,
    maxOperatingTempC: 350,
    activationEnergyOxidation_kJmol: 220,
    parabolicOxidationRateConst_kp0: 4.1e-3,
    densityGcm3: 4.65,
    atomicMassGmol: 48.2,
    valency: 4,
    notes: "High strength landing gear titanium; excellent marine passivation but noble cathode vs aluminum.",
  },
  {
    id: "al-7075-t6",
    name: "Al 7075-T651 (Al-Zn-Mg-Cu)",
    category: "Aluminum",
    standardPotentialV: -1.66,
    corrosionCurrentDensity_uAcm2: 8.5,
    pittingThresholdPotential_V: -0.72,
    sccThresholdKIscc_MpaM: 8.5, // High SCC susceptibility in ST direction
    maxOperatingTempC: 130,
    activationEnergyOxidation_kJmol: 110,
    parabolicOxidationRateConst_kp0: 8.5e-2,
    densityGcm3: 2.81,
    atomicMassGmol: 26.98,
    valency: 3,
    notes: "High strength primary airframe alloy. Extremely active anode against Ti and CFRP; susceptible to intergranular SCC in marine spray.",
  },
  {
    id: "al-7050-t7451",
    name: "Al 7050-T7451 Overaged (Al-Zn-Mg-Cu)",
    category: "Aluminum",
    standardPotentialV: -1.58,
    corrosionCurrentDensity_uAcm2: 4.2,
    pittingThresholdPotential_V: -0.68,
    sccThresholdKIscc_MpaM: 28.0, // High SCC threshold due to T74 overaging
    maxOperatingTempC: 135,
    activationEnergyOxidation_kJmol: 115,
    parabolicOxidationRateConst_kp0: 7.2e-2,
    densityGcm3: 2.83,
    atomicMassGmol: 26.98,
    valency: 3,
    notes: "Thick section fuselage bulkheads; overaging reduces SCC sensitivity while retaining high galvanic driving voltage.",
  },
  {
    id: "al-2024-t3",
    name: "Al 2024-T351 (Al-Cu-Mg)",
    category: "Aluminum",
    standardPotentialV: -1.48,
    corrosionCurrentDensity_uAcm2: 6.8,
    pittingThresholdPotential_V: -0.65,
    sccThresholdKIscc_MpaM: 14.0,
    maxOperatingTempC: 120,
    activationEnergyOxidation_kJmol: 120,
    parabolicOxidationRateConst_kp0: 6.8e-2,
    densityGcm3: 2.78,
    atomicMassGmol: 26.98,
    valency: 3,
    notes: "Damage tolerant wing lower skins. Cu-depleted grain boundaries prone to localized pitting and galvanic cell generation.",
  },
  {
    id: "inconel-718",
    name: "Inconel 718 (Ni-Cr-Fe-Nb)",
    category: "Nickel Superalloy",
    standardPotentialV: +0.18,
    corrosionCurrentDensity_uAcm2: 0.08,
    pittingThresholdPotential_V: 1.10,
    sccThresholdKIscc_MpaM: 65.0,
    maxOperatingTempC: 650,
    activationEnergyOxidation_kJmol: 285,
    parabolicOxidationRateConst_kp0: 1.1e-4,
    densityGcm3: 8.19,
    atomicMassGmol: 58.0,
    valency: 3,
    notes: "High temperature superalloy forming adherent Cr2O3/NiO oxide barrier. Highly noble in marine electrolytes.",
  },
  {
    id: "inconel-625",
    name: "Inconel 625 (Ni-Cr-Mo-Nb)",
    category: "Nickel Superalloy",
    standardPotentialV: +0.24,
    corrosionCurrentDensity_uAcm2: 0.05,
    pittingThresholdPotential_V: 1.25,
    sccThresholdKIscc_MpaM: 75.0,
    maxOperatingTempC: 980,
    activationEnergyOxidation_kJmol: 295,
    parabolicOxidationRateConst_kp0: 9.0e-5,
    densityGcm3: 8.44,
    atomicMassGmol: 58.7,
    valency: 3,
    notes: "Mo-rich matrix yielding PREN 51. Immune to chloride pitting and SCC in submerged marine submarine service.",
  },
  {
    id: "steel-300m",
    name: "300M Ultra-High Strength Steel (Fe-Si-Ni-Cr-Mo)",
    category: "High-Strength Steel",
    standardPotentialV: -0.42,
    corrosionCurrentDensity_uAcm2: 12.0,
    pittingThresholdPotential_V: -0.30,
    sccThresholdKIscc_MpaM: 14.5, // Vulnerable to hydrogen embrittlement & SCC
    maxOperatingTempC: 300,
    activationEnergyOxidation_kJmol: 165,
    parabolicOxidationRateConst_kp0: 4.8e-2,
    densityGcm3: 7.85,
    atomicMassGmol: 55.85,
    valency: 2,
    notes: "54 HRC landing gear steel. Susceptible to stress corrosion cracking under static tensile preload in salt fog.",
  },
  {
    id: "stainless-17-4ph",
    name: "17-4PH H900 (AISI 630)",
    category: "Stainless Steel",
    standardPotentialV: +0.05,
    corrosionCurrentDensity_uAcm2: 0.45,
    pittingThresholdPotential_V: 0.35,
    sccThresholdKIscc_MpaM: 32.0,
    maxOperatingTempC: 370,
    activationEnergyOxidation_kJmol: 210,
    parabolicOxidationRateConst_kp0: 2.2e-3,
    densityGcm3: 7.75,
    atomicMassGmol: 55.0,
    valency: 2.5,
    notes: "Martensitic precipitation hardening stainless steel. Moderate SCC and pitting resistance.",
  },
];

export interface CoatingSystem {
  id: string;
  name: string;
  type: "Anodizing" | "Passivation" | "Electroplate" | "Thermal Barrier / Ceramic" | "Dielectric Sealant / Primer";
  nominalThicknessUm: number;
  dielectricResistanceOhmCm2: number; // Isolation resistance
  maxTempC: number;
  standardSpec: string;
  marineLifeMultiplier: number;
  sccShieldingFactor: number; // 0 (none) to 1.0 (complete seal)
  oxidationBarrierFactor: number;
  description: string;
}

export const COATING_SYSTEMS: CoatingSystem[] = [
  {
    id: "none",
    name: "Bare Unprotected Metal / Direct Contact",
    type: "Passivation",
    nominalThicknessUm: 0,
    dielectricResistanceOhmCm2: 1,
    maxTempC: 1200,
    standardSpec: "N/A - Direct Contact",
    marineLifeMultiplier: 1.0,
    sccShieldingFactor: 0.0,
    oxidationBarrierFactor: 1.0,
    description: "No galvanic or environmental isolation. Metal directly contacts adjacent substrate.",
  },
  {
    id: "tsa-anodize",
    name: "Tartaric-Sulfuric Acid Anodizing (TSA) + Epoxy Primer",
    type: "Anodizing",
    nominalThicknessUm: 5,
    dielectricResistanceOhmCm2: 1.5e5,
    maxTempC: 130,
    standardSpec: "MIL-A-8625 / ISO 8078 / REACH Compliant",
    marineLifeMultiplier: 6.5,
    sccShieldingFactor: 0.85,
    oxidationBarrierFactor: 1.8,
    description: "Chromate-free eco-friendly anodize layer providing high dielectric barrier and paint adhesion for aluminum.",
  },
  {
    id: "hard-anodize-type-iii",
    name: "Hardcoat Anodize Type III (MIL-A-8625 Class 1)",
    type: "Anodizing",
    nominalThicknessUm: 50,
    dielectricResistanceOhmCm2: 8.0e6,
    maxTempC: 160,
    standardSpec: "MIL-A-8625 Type III Class 1 (Deionized Water Seal)",
    marineLifeMultiplier: 12.0,
    sccShieldingFactor: 0.92,
    oxidationBarrierFactor: 2.5,
    description: "Dense 50µm Al2O3 ceramic layer providing high wear and extreme galvanic isolation in naval environments.",
  },
  {
    id: "ti-anodize-ams2488",
    name: "Titanium Alkaline Anodize (AMS 2488 Type II)",
    type: "Anodizing",
    nominalThicknessUm: 3,
    dielectricResistanceOhmCm2: 3.5e5,
    maxTempC: 400,
    standardSpec: "AMS 2488 Type II / BAC 5863",
    marineLifeMultiplier: 5.0,
    sccShieldingFactor: 0.75,
    oxidationBarrierFactor: 2.0,
    description: "High lubricity and galvanic barrier preventing galling with aerospace titanium fasteners.",
  },
  {
    id: "nitric-passivation",
    name: "Nitric / Citric Acid Passivation (AMS 2700)",
    type: "Passivation",
    nominalThicknessUm: 0.05,
    dielectricResistanceOhmCm2: 5.0e3,
    maxTempC: 450,
    standardSpec: "AMS 2700 Method 1 / ASTM A967",
    marineLifeMultiplier: 2.8,
    sccShieldingFactor: 0.40,
    oxidationBarrierFactor: 1.2,
    description: "Depletes free surface iron and enriches Cr2O3 nanofilm on stainless steels to retard pitting.",
  },
  {
    id: "zinc-nickel-ams2417",
    name: "LHE Zinc-Nickel Plating + Cr3+ Passivation",
    type: "Electroplate",
    nominalThicknessUm: 15,
    dielectricResistanceOhmCm2: 2.0e4,
    maxTempC: 220,
    standardSpec: "AMS 2417 / ASTM B841 (Cadmium Replacement)",
    marineLifeMultiplier: 8.0,
    sccShieldingFactor: 0.88,
    oxidationBarrierFactor: 1.5,
    description: "Sacrificial galvanic barrier (12-16% Ni) preventing hydrogen embrittlement and galvanic lock on high-strength steels.",
  },
  {
    id: "dielectric-fiberglass-ply",
    name: "Dielectric Glass Ply (E-Glass/Epoxy) + Polysulfide Sealant",
    type: "Dielectric Sealant / Primer",
    nominalThicknessUm: 200,
    dielectricResistanceOhmCm2: 1.0e9,
    maxTempC: 150,
    standardSpec: "BMS 5-95 / MIL-PRF-81733 / Boeing BAC 5000",
    marineLifeMultiplier: 25.0,
    sccShieldingFactor: 0.99,
    oxidationBarrierFactor: 1.0,
    description: "Mandatory isolating interleaf between CFRP skins and Al/Ti ribs completely breaking electrical conductivity.",
  },
  {
    id: "tbc-7ysz-ebpvd",
    name: "Thermal Barrier Coating: 7-8 wt% YSZ + MCrAlY Bond Coat",
    type: "Thermal Barrier / Ceramic",
    nominalThicknessUm: 250,
    dielectricResistanceOhmCm2: 5.0e8,
    maxTempC: 1250,
    standardSpec: "AMS 2444 / GE C50TF10 / PWA 266",
    marineLifeMultiplier: 15.0,
    sccShieldingFactor: 0.90,
    oxidationBarrierFactor: 18.0,
    description: "EB-PVD columnar 7YSZ zirconia with thermally grown Al2O3 scale (TGO) for turbine blade oxidation mitigation.",
  },
];

export interface EnvironmentalCondition {
  id: string;
  name: string;
  milStandard: string;
  chloridePpm: number;
  relativeHumidityPct: number;
  tempC: number;
  electrolyteConductivity_mScm: number;
  description: string;
}

export const MIL_ENVIRONMENTS: EnvironmentalCondition[] = [
  {
    id: "mil-810-salt-fog",
    name: "MIL-STD-810H Method 509.7 (5% NaCl Salt Fog Spray)",
    milStandard: "MIL-STD-810H Method 509.7",
    chloridePpm: 30000,
    relativeHumidityPct: 98,
    tempC: 35,
    electrolyteConductivity_mScm: 55.0,
    description: "Continuous 5% sodium chloride salt spray; extreme maritime/naval flight deck and coastal aerospace corrosion environment.",
  },
  {
    id: "mil-810-marine-humid",
    name: "MIL-STD-810H Method 507.6 (Tropical High Humidity & Salt)",
    milStandard: "MIL-STD-810H Method 507.6",
    chloridePpm: 3500,
    relativeHumidityPct: 95,
    tempC: 45,
    electrolyteConductivity_mScm: 12.0,
    description: "Hot, humid coastal environment with high condensation film and active galvanic coupling.",
  },
  {
    id: "mil-810-high-temp-engine",
    name: "Turbine & Exhaust High-Temp Gas Atmosphere (600°C - 1100°C)",
    milStandard: "MIL-STD-810H / Gas Turbine Spec",
    chloridePpm: 150,
    relativeHumidityPct: 10,
    tempC: 850,
    electrolyteConductivity_mScm: 0.1,
    description: "Hot corrosion (Type I / Type II) and high-temperature parabolic Wagner oxidation regimes.",
  },
  {
    id: "nato-stanag-temperate",
    name: "STANAG 4370 AECTP-300 (Temperate Military Airspace)",
    milStandard: "NATO STANAG 4370 / AECTP-300",
    chloridePpm: 250,
    relativeHumidityPct: 65,
    tempC: 22,
    electrolyteConductivity_mScm: 1.5,
    description: "Hangar storage or standard dry atmospheric flight baseline conditions.",
  },
];

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

export function MultiMaterialInterfaceLab() {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<"galvanic-interface" | "scc-kinetics" | "oxidation-tgo" | "coating-life">("galvanic-interface");

  // Material Pair Selection
  const [substrateAId, setSubstrateAId] = useState<string>("al-7075-t6"); // Anode / Substrate
  const [substrateBId, setSubstrateBId] = useState<string>("ti-6al-4v"); // Cathode / Fastener / Skin
  const [coatingId, setCoatingId] = useState<string>("tsa-anodize");
  const [envId, setEnvId] = useState<string>("mil-810-salt-fog");

  // Dimensional & Mechanical Joint Parameters
  const [anodeAreaCm2, setAnodeAreaCm2] = useState<number>(15);
  const [cathodeAreaCm2, setCathodeAreaCm2] = useState<number>(150);
  const [electrolyteFilmThicknessMm, setElectrolyteFilmThicknessMm] = useState<number>(0.25); // Electrolyte meniscus
  const [jointStressMpa, setJointStressMpa] = useState<number>(280); // Applied tensile preload / flight stress
  const [initialFlawSizeMm, setInitialFlawSizeMm] = useState<number>(0.35); // Initial NDT detectable crack depth (a0)
  const [operatingTempC, setOperatingTempC] = useState<number>(35); // Operating temperature
  const [exposureHours, setExposureHours] = useState<number>(2000); // Target flight/service hours

  // AI Diagnostic Loading
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Selected Objects
  const matA = INTERFACE_MATERIALS.find((m) => m.id === substrateAId) || INTERFACE_MATERIALS[3];
  const matB = INTERFACE_MATERIALS.find((m) => m.id === substrateBId) || INTERFACE_MATERIALS[1];
  const coating = COATING_SYSTEMS.find((c) => c.id === coatingId) || COATING_SYSTEMS[1];
  const env = MIL_ENVIRONMENTS.find((e) => e.id === envId) || MIL_ENVIRONMENTS[0];

  // Effective Anode / Cathode Assignment
  const isAAnode = matA.standardPotentialV <= matB.standardPotentialV;
  const anodeMat = isAAnode ? matA : matB;
  const cathodeMat = isAAnode ? matB : matA;
  const effAnodeArea = isAAnode ? anodeAreaCm2 : cathodeAreaCm2;
  const effCathodeArea = isAAnode ? cathodeAreaCm2 : anodeAreaCm2;

  // Potential difference (Galvanic Driving Voltage)
  const deltaE = Math.abs(cathodeMat.standardPotentialV - anodeMat.standardPotentialV);
  const areaRatio = effCathodeArea / Math.max(0.01, effAnodeArea);

  // ==========================================
  // 3. ELECTROCHEMICAL & KINETIC CALCULATIONS
  // ==========================================

  // (A) Galvanic Current & Corrosion Penetration Rate
  const galvanicResults = useMemo(() => {
    // Ohm's law & mixed potential theory in thin film electrolyte:
    // R_electrolyte = d / (kappa * A_interface)
    const kappa = env.electrolyteConductivity_mScm * 1e-3; // S/cm
    const electrolyteResistance = (electrolyteFilmThicknessMm * 0.1) / (Math.max(1e-5, kappa) * Math.min(effAnodeArea, effCathodeArea));
    const isolationResistance = coating.dielectricResistanceOhmCm2 / Math.max(0.1, effAnodeArea);
    const totalInterfaceResistance = electrolyteResistance + isolationResistance;

    // Mixed polarization Tafel slopes beta_a ~ 0.12 V/dec, beta_c ~ 0.10 V/dec
    // Galvanic current (Faraday): I_galv = (Delta_E) / (R_total + polarization terms)
    const effectiveDeltaE = Math.max(0.001, deltaE);
    const rawIgalv_A = effectiveDeltaE / Math.max(0.5, totalInterfaceResistance);
    
    // Convert to galvanic current density on anode (uA/cm2)
    const iGalv_uAcm2 = (rawIgalv_A / Math.max(0.1, effAnodeArea)) * 1e6;
    
    // Total corrosion current = self-corrosion + galvanic component (attenuated by coating)
    const effectiveIcorr_uAcm2 = (anodeMat.corrosionCurrentDensity_uAcm2 + iGalv_uAcm2) / Math.max(1.0, coating.marineLifeMultiplier);

    // Faraday's Law for Corrosion Penetration Rate (CPR):
    // CPR (mm/year) = (0.00327 * i_corr * M) / (n * rho)
    // where i_corr is in uA/cm2, M in g/mol, rho in g/cm3, n is valency
    const cprMmYear = (0.00327 * effectiveIcorr_uAcm2 * anodeMat.atomicMassGmol) / (anodeMat.valency * anodeMat.densityGcm3);
    const cprMpy = cprMmYear * 39.37; // mils per year

    // Interface Mass Loss per year (grams)
    const massLossGramsYear = (effectiveIcorr_uAcm2 * 1e-6 * effAnodeArea * 365.25 * 24 * 3600 * anodeMat.atomicMassGmol) / (anodeMat.valency * 96485);

    // Risk Classification
    let riskLevel: "NEGLIGIBLE" | "MODERATE" | "HIGH" | "CRITICAL SEVERE" = "NEGLIGIBLE";
    let riskColor = "text-emerald-400";
    let riskBg = "bg-emerald-500/10 border-emerald-500/30";

    if (deltaE > 0.60 && areaRatio > 2.0 && coating.id === "none") {
      riskLevel = "CRITICAL SEVERE";
      riskColor = "text-red-400";
      riskBg = "bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.25)]";
    } else if (deltaE > 0.35 || cprMmYear > 0.20) {
      riskLevel = "HIGH";
      riskColor = "text-amber-400";
      riskBg = "bg-amber-500/20 border-amber-500/40";
    } else if (deltaE > 0.15 || cprMmYear > 0.05) {
      riskLevel = "MODERATE";
      riskColor = "text-sky-400";
      riskBg = "bg-sky-500/10 border-sky-500/30";
    }

    return {
      deltaE,
      areaRatio,
      effectiveIcorr_uAcm2,
      cprMmYear,
      cprMpy,
      massLossGramsYear,
      totalInterfaceResistance,
      riskLevel,
      riskColor,
      riskBg,
    };
  }, [anodeMat, cathodeMat, effAnodeArea, effCathodeArea, deltaE, areaRatio, env, coating, electrolyteFilmThicknessMm]);

  // (B) Stress Corrosion Cracking (SCC - ASTM G47 / Fracture Mechanics)
  const sccResults = useMemo(() => {
    // Linear Elastic Fracture Mechanics: K_I = Y * sigma * sqrt(pi * a)
    // Geometry factor Y ~ 1.12 for edge flaw
    const aMeters = (initialFlawSizeMm * 1e-3);
    const stressPa = jointStressMpa * 1e6;
    const stressIntensityKI = (1.12 * jointStressMpa * Math.sqrt(Math.PI * aMeters)); // MPa*sqrt(m)

    // Threshold K_Iscc under given environment
    // Environmental degradation knockdown
    const envKnockdown = env.chloridePpm > 10000 ? 0.75 : env.chloridePpm > 1000 ? 0.88 : 1.0;
    const effectiveKIscc = anodeMat.sccThresholdKIscc_MpaM * envKnockdown;

    // SCC Crack Growth Velocity (da/dt in Stage II Plateau):
    // da/dt = v0 * exp( (K_I - K_Iscc) / beta )
    const isSccActive = stressIntensityKI >= effectiveKIscc && anodeMat.category !== "Composite (CFRP)";
    const sccSafetyMargin = effectiveKIscc / Math.max(0.1, stressIntensityKI);

    // Crack velocity in mm/hour (empirically calibrated ~ 1e-4 to 1e-1 mm/hr when active)
    let crackVelocityMmHr = 0;
    if (isSccActive) {
      const overstress = (stressIntensityKI - effectiveKIscc);
      crackVelocityMmHr = (1.2e-4 * Math.exp(Math.min(10, overstress * 0.25))) * (1 - coating.sccShieldingFactor);
    }

    const estimatedHoursToThroughCrack = isSccActive && crackVelocityMmHr > 0 
      ? Math.max(1, (5.0 - initialFlawSizeMm) / crackVelocityMmHr) 
      : 999999;

    return {
      stressIntensityKI,
      effectiveKIscc,
      isSccActive,
      sccSafetyMargin,
      crackVelocityMmHr,
      estimatedHoursToThroughCrack,
    };
  }, [jointStressMpa, initialFlawSizeMm, anodeMat, env, coating]);

  // (C) Wagner High-Temperature Parabolic Oxidation (TGO Growth)
  const oxidationResults = useMemo(() => {
    const tempKelvin = operatingTempC + 273.15;
    const R = 8.314; // J/(mol*K)
    
    // Parabolic rate constant kp(T) = kp0 * exp(-Q / (R * T)) in mg^2 / (cm^4 * s)
    const Q_Jmol = anodeMat.activationEnergyOxidation_kJmol * 1e3;
    const kp_T = anodeMat.parabolicOxidationRateConst_kp0 * Math.exp(-Q_Jmol / (R * tempKelvin));
    
    // Oxide scale thickness x(t) = sqrt( 2 * kp * t ) / rho_oxide / coatingFactor
    const timeSeconds = exposureHours * 3600;
    const weightGainMgCm2 = Math.sqrt(2 * Math.max(1e-18, kp_T) * timeSeconds) / coating.oxidationBarrierFactor;
    
    // Approximate oxide thickness (assuming Al2O3 / Cr2O3 / TiO2 rho ~ 4.5 g/cm3)
    const oxideThicknessUm = (weightGainMgCm2 * 10 / 4.5); // mg/cm2 to um

    // Critical spallation thickness (typically ~ 5 to 10 um for TGO)
    const spallationLimitUm = 8.0;
    const oxidationLifeHours = (Math.pow(spallationLimitUm * 4.5 / 10 * coating.oxidationBarrierFactor, 2) / (2 * Math.max(1e-20, kp_T))) / 3600;

    return {
      tempKelvin,
      kp_T,
      weightGainMgCm2,
      oxideThicknessUm,
      spallationLimitUm,
      oxidationLifeHours: Math.min(100000, Math.max(10, oxidationLifeHours)),
    };
  }, [anodeMat, operatingTempC, exposureHours, coating]);

  // (D) Coating Degradation & Life Prediction
  const coatingLifeResults = useMemo(() => {
    // Baseline coating life in Salt Fog (MIL-STD-810H)
    const baseLifeHours = coating.nominalThicknessUm * 80 * coating.marineLifeMultiplier;
    
    // Environmental acceleration factors (Arrhenius + Humidity + Chloride)
    const tempFactor = Math.exp((operatingTempC - 25) / 35);
    const rhFactor = Math.pow(env.relativeHumidityPct / 50, 1.5);
    const clFactor = Math.log10(Math.max(10, env.chloridePpm)) / 2.0;
    
    const accelerationFactor = Math.max(0.2, tempFactor * rhFactor * clFactor);
    const predictedLifeHours = Math.round(baseLifeHours / accelerationFactor);
    
    const consumedPctAtExposure = Math.min(100, Math.round((exposureHours / Math.max(1, predictedLifeHours)) * 100));

    return {
      baseLifeHours,
      accelerationFactor,
      predictedLifeHours,
      consumedPctAtExposure,
    };
  }, [coating, env, operatingTempC, exposureHours]);

  // AI Diagnostic Generator
  const runAiDegradationAudit = () => {
    setAiAnalyzing(true);
    setTimeout(() => {
      const summary = `### 🛡️ MIL-STD-810H & AS9100 Multi-Material Interface Audit Report
**Date & Protocol:** ${new Date().toLocaleDateString("en-US")} | STANAG 4370 AECTP / ASTM G82

**1. Interface Galvanic Couple Assessment:**
- **Anode:** ${anodeMat.name} (${anodeMat.standardPotentialV > 0 ? `+${anodeMat.standardPotentialV}` : anodeMat.standardPotentialV} V vs SHE)
- **Cathode:** ${cathodeMat.name} (${cathodeMat.standardPotentialV > 0 ? `+${cathodeMat.standardPotentialV}` : cathodeMat.standardPotentialV} V vs SHE)
- **Galvanic Driving Potential:** $\\Delta E = ${deltaE.toFixed(2)}\\text{ V}$ | **Cathode/Anode Area Ratio:** $A_c/A_a = ${areaRatio.toFixed(2)}$
- **Conclusion:** ${deltaE > 0.5 && areaRatio > 2 ? "⚠️ CRITICAL ACTIVE GALVANIC CELL FORMATION! Titanium/CFRP cathodic area causes rapid thickness loss and severe localized pitting in aluminum anode." : "✅ Galvanic couple potential is within safe controllable engineering limits."}

**2. Stress Corrosion Cracking (SCC - ASTM G47) Evaluation:**
- Applied Tensile Pre-stress: $K_I = ${sccResults.stressIntensityKI.toFixed(2)}\\text{ MPa}\\sqrt{\\text{m}}$ | Threshold: $K_{Iscc} = ${sccResults.effectiveKIscc.toFixed(2)}\\text{ MPa}\\sqrt{\\text{m}}$
- **Status:** ${sccResults.isSccActive ? `🚨 CRACKING RISK ACTIVE! $K_I > K_{Iscc}$ exceeded. Crack velocity under chloride penetration: ${sccResults.crackVelocityMmHr.toExponential(2)} mm/hr. Estimated time to critical depth: ${sccResults.estimatedHoursToThroughCrack.toFixed(0)} hours.` : "🛡️ Operating below threshold stress intensity ($K_{Iscc}$); no catastrophic brittle SCC fracture expected."}

**3. Coating & Dielectric Isolation Performance:**
- Selected Barrier: **${coating.name}** (${coating.standardSpec})
- Estimated Barrier Life: **${coatingLifeResults.predictedLifeHours.toLocaleString()} hours** (${exposureHours}h mission consumption: ${coatingLifeResults.consumedPctAtExposure}%)
- **Recommendation:** ${coating.id === "none" && deltaE > 0.4 ? "Mandatory requirement to apply BMS 5-95 compliant dielectric glass interleaf (E-Glass) and polysulfide edge sealant (MIL-PRF-81733)." : "Current surface protection protocol satisfies MIL-STD-810H salt fog requirements."}`;
      
      setAiReport(summary);
      setAiAnalyzing(false);
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#090e18] p-5 sm:p-6 rounded-2xl border border-[#162032] shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
                Multi-Material Interface & Degradation Predictor
              </h2>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                MIL-STD-810H / ASTM G82 / Wagner Kinetics
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Simulates galvanic corrosion, stress corrosion cracking (K_ISCC), and Wagner high-temperature oxidation at titanium-aluminum, composite-metal (CFRP/Al) hybrid joint interfaces.
            </p>
          </div>

          <button
            type="button"
            onClick={runAiDegradationAudit}
            disabled={aiAnalyzing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {aiAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Interface Degradation Audit</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#162032] overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("galvanic-interface")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === "galvanic-interface"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>1. Hybrid Interface Galvanic Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("scc-kinetics")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === "scc-kinetics"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Stress Corrosion Cracking (SCC / K_ISCC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("oxidation-tgo")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === "oxidation-tgo"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>3. High-Temp Wagner Oxidation & TGO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("coating-life")}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === "coating-life"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>4. Coating & Dielectric Barrier Life</span>
          </button>
        </div>
      </div>

      {/* Global Interface Configuration Card */}
      <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-4">
        <div className="flex items-center justify-between border-b border-[#162032] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Interface Material Couple & Environmental Setup
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Anode: <strong className="text-red-400">{anodeMat.name}</strong> | Cathode: <strong className="text-sky-400">{cathodeMat.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* Substrate A */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[#050810] border border-[#1e2d46]">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Substrate A (Base / Anode):</span>
              <span className="text-amber-400 font-bold">{matA.standardPotentialV > 0 ? `+${matA.standardPotentialV}` : matA.standardPotentialV} V</span>
            </label>
            <select
              value={substrateAId}
              onChange={(e) => setSubstrateAId(e.target.value)}
              className="w-full bg-[#0c1322] border border-[#1e2d46] rounded p-2 text-white font-mono focus:outline-none focus:border-amber-400"
            >
              {INTERFACE_MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.standardPotentialV > 0 ? `+${m.standardPotentialV}` : m.standardPotentialV}V]
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 block line-clamp-1">{matA.category}</span>
          </div>

          {/* Substrate B */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[#050810] border border-[#1e2d46]">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Substrate B (Fastener / Skin / Cathode):</span>
              <span className="text-sky-400 font-bold">{matB.standardPotentialV > 0 ? `+${matB.standardPotentialV}` : matB.standardPotentialV} V</span>
            </label>
            <select
              value={substrateBId}
              onChange={(e) => setSubstrateBId(e.target.value)}
              className="w-full bg-[#0c1322] border border-[#1e2d46] rounded p-2 text-white font-mono focus:outline-none focus:border-sky-400"
            >
              {INTERFACE_MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.standardPotentialV > 0 ? `+${m.standardPotentialV}` : m.standardPotentialV}V]
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 block line-clamp-1">{matB.category}</span>
          </div>

          {/* Coating / Interleaf */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[#050810] border border-[#1e2d46]">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Interface Coating / Dielectric Barrier:</span>
            </label>
            <select
              value={coatingId}
              onChange={(e) => setCoatingId(e.target.value)}
              className="w-full bg-[#0c1322] border border-[#1e2d46] rounded p-2 text-white font-mono focus:outline-none focus:border-emerald-400"
            >
              {COATING_SYSTEMS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.nominalThicknessUm} µm)
                </option>
              ))}
            </select>
            <span className="text-[10px] text-emerald-400 block line-clamp-1">{coating.standardSpec}</span>
          </div>

          {/* Environmental Profile */}
          <div className="space-y-1.5 p-3 rounded-lg bg-[#050810] border border-[#1e2d46]">
            <label className="text-slate-300 font-semibold flex items-center justify-between">
              <span>Environmental Condition (MIL-STD):</span>
            </label>
            <select
              value={envId}
              onChange={(e) => setEnvId(e.target.value)}
              className="w-full bg-[#0c1322] border border-[#1e2d46] rounded p-2 text-white font-mono focus:outline-none focus:border-purple-400"
            >
              {MIL_ENVIRONMENTS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-purple-400 block line-clamp-1">{env.milStandard}</span>
          </div>
        </div>
      </div>

      {/* AI Report Card if generated */}
      {aiReport && (
        <div className="bg-[#090e18] p-5 sm:p-6 rounded-2xl border border-amber-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#162032] pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
              <Sparkles className="w-5 h-5" />
              <span>AI Interface Corrosion & SCC Audit Report</span>
            </div>
            <button
              type="button"
              onClick={() => setAiReport(null)}
              className="text-xs text-slate-400 hover:text-white font-mono px-2 py-1 bg-[#162032] rounded"
            >
              Close
            </button>
          </div>
          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 space-y-3 font-mono leading-relaxed whitespace-pre-line">
            {aiReport}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: GALVANIC INTERFACE SIMULATOR                      */}
      {/* ======================================================== */}
      {activeSubTab === "galvanic-interface" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-amber-400" />
                  <span>Interface Geometry & Electrolyte Meniscus</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">ASTM G102 / Mixed Potential</span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                {/* Anode Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-red-400 font-bold">Anode Area (A_a): {anodeMat.name}</span>
                    <span className="text-white font-bold">{anodeAreaCm2} cm²</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={anodeAreaCm2}
                    onChange={(e) => setAnodeAreaCm2(parseFloat(e.target.value))}
                    className="w-full accent-red-400 cursor-pointer"
                  />
                </div>

                {/* Cathode Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-sky-400 font-bold">Cathode Area (A_c): {cathodeMat.name}</span>
                    <span className="text-white font-bold">{cathodeAreaCm2} cm²</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    step="5"
                    value={cathodeAreaCm2}
                    onChange={(e) => setCathodeAreaCm2(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Cathode / Anode Ratio (A_c / A_a):</span>
                    <span className={`font-bold ${areaRatio > 5 ? "text-red-400" : "text-amber-400"}`}>
                      {areaRatio.toFixed(2)} : 1
                    </span>
                  </div>
                </div>

                {/* Electrolyte Film Thickness */}
                <div className="space-y-1.5 pt-2 border-t border-[#162032]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Condensed Saltwater Film Thickness (Meniscus):</span>
                    <span className="text-amber-400 font-bold">{electrolyteFilmThicknessMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="2.0"
                    step="0.05"
                    value={electrolyteFilmThicknessMm}
                    onChange={(e) => setElectrolyteFilmThicknessMm(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">
                    In ultra-thin electrolyte films, high ionic resistance (R_electrolyte) confines localized galvanic attack to the joint perimeter.
                  </span>
                </div>
              </div>
            </div>

            {/* Potential Diagram Card */}
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-3 font-mono text-xs">
              <h4 className="text-slate-300 font-bold flex items-center gap-2">
                <Scale className="w-4 h-4 text-sky-400" />
                <span>Electrochemical Potential Difference (Galvanic Couple)</span>
              </h4>

              <div className="relative pt-6 pb-2">
                {/* Visual Scale bar from -2.0V to +1.5V */}
                <div className="h-3 bg-gradient-to-r from-red-600 via-amber-500 to-sky-500 rounded-full relative">
                  {/* Anode pointer */}
                  <div
                    className="absolute -top-5 transform -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${((anodeMat.standardPotentialV + 2.0) / 3.5) * 100}%` }}
                  >
                    <span className="text-[10px] text-red-400 font-bold whitespace-nowrap">ANODE ({anodeMat.standardPotentialV}V)</span>
                    <div className="w-2 h-2 bg-red-400 rotate-45"></div>
                  </div>

                  {/* Cathode pointer */}
                  <div
                    className="absolute -top-5 transform -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${((cathodeMat.standardPotentialV + 2.0) / 3.5) * 100}%` }}
                  >
                    <span className="text-[10px] text-sky-400 font-bold whitespace-nowrap">CATHODE ({cathodeMat.standardPotentialV}V)</span>
                    <div className="w-2 h-2 bg-sky-400 rotate-45"></div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                  <span>-2.0 V (Active Anodic)</span>
                  <span>0.0 V (SHE)</span>
                  <span>+1.5 V (Noble Cathodic / CFRP)</span>
                </div>
              </div>

              <div className="p-3 bg-[#050810] rounded-lg border border-[#162032] space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Galvanic Driving Potential (ΔE):</span>
                  <span className="text-amber-400 font-bold">{deltaE.toFixed(2)} Volts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Interface Isolation Resistance:</span>
                  <span className="text-emerald-400 font-bold">{galvanicResults.totalInterfaceResistance.toLocaleString("en-US", { maximumFractionDigits: 0 })} Ω</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results & Kinetics */}
          <div className="lg:col-span-6 space-y-6">
            <div className={`p-5 rounded-xl border ${galvanicResults.riskBg} space-y-4`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${galvanicResults.riskColor}`} />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Galvanic Risk Assessment: {galvanicResults.riskLevel}
                  </h3>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 ${galvanicResults.riskColor}`}>
                  ΔE = {deltaE.toFixed(2)} V
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#050810]/80 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Corrosion Penetration Rate:</span>
                  <span className="text-lg font-bold text-white block">
                    {galvanicResults.cprMmYear.toFixed(3)} <span className="text-xs text-amber-400">mm/year</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{galvanicResults.cprMpy.toFixed(2)} mpy (mils/yr)</span>
                </div>

                <div className="p-3 rounded-lg bg-[#050810]/80 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Annual Anode Mass Loss:</span>
                  <span className="text-lg font-bold text-white block">
                    {galvanicResults.massLossGramsYear.toFixed(2)} <span className="text-xs text-red-400">g/year</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Faraday Law (M · I / n · F)</span>
                </div>
              </div>

              {/* Physical Hybrid Joint Visualizer */}
              <div className="p-4 rounded-xl bg-[#050810] border border-[#162032] space-y-3 font-mono text-xs">
                <h4 className="text-slate-300 font-bold text-xs uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Physical Hybrid Joint Cross-Section Schematic</span>
                </h4>

                <div className="border border-[#1e2d46] rounded-lg p-3 bg-[#0c1322] space-y-2">
                  {/* Top Layer: Cathode */}
                  <div className="p-2.5 rounded bg-sky-950/60 border border-sky-500/40 text-sky-200 flex items-center justify-between text-xs">
                    <span>CATHODE: {cathodeMat.name} ({cathodeMat.category})</span>
                    <span className="text-[10px] bg-sky-900/80 px-2 py-0.5 rounded font-bold">A_c = {effCathodeArea} cm²</span>
                  </div>

                  {/* Middle Layer: Coating / Sealant */}
                  <div className={`p-2 rounded border text-[11px] flex items-center justify-between ${
                    coating.id === "none" 
                      ? "bg-red-950/40 border-red-500/50 text-red-300" 
                      : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  }`}>
                    <span>Barrier: {coating.name} ({coating.nominalThicknessUm} µm)</span>
                    <span className="text-[10px] font-bold">{coating.dielectricResistanceOhmCm2.toExponential(1)} Ω·cm²</span>
                  </div>

                  {/* Bottom Layer: Anode */}
                  <div className="p-2.5 rounded bg-red-950/60 border border-red-500/40 text-red-200 flex items-center justify-between text-xs">
                    <span>ANODE: {anodeMat.name} ({anodeMat.category})</span>
                    <span className="text-[10px] bg-red-900/80 px-2 py-0.5 rounded font-bold">A_a = {effAnodeArea} cm²</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {coating.id === "none" ? (
                    <span className="text-red-400">
                      ⚠️ Direct metal-to-metal contact present! Severe galvanic short circuit will trigger accelerated dissolution and thickness loss in the anode.
                    </span>
                  ) : (
                    <span className="text-emerald-400">
                      ✅ {coating.name} dielectric isolation barrier interrupts ionic current, suppressing corrosion rate by {(100 - (100 / coating.marineLifeMultiplier)).toFixed(0)}%.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: STRESS CORROSION CRACKING (SCC & K_ISCC)          */}
      {/* ======================================================== */}
      {activeSubTab === "scc-kinetics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Static Tensile Stress & Flaw Parameters</span>
                </h3>
                <span className="text-[11px] text-slate-400">ASTM G47 / LEFM</span>
              </div>

              {/* Stress Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Applied Static Tensile Stress (σ_joint):</span>
                  <span className="text-amber-400 font-bold text-sm">{jointStressMpa} MPa</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1200"
                  step="10"
                  value={jointStressMpa}
                  onChange={(e) => setJointStressMpa(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Initial Flaw Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Initial Surface Flaw / Notch Depth (a₀):</span>
                  <span className="text-sky-400 font-bold text-sm">{initialFlawSizeMm.toFixed(2)} mm</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="2.0"
                  step="0.05"
                  value={initialFlawSizeMm}
                  onChange={(e) => setInitialFlawSizeMm(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Aerospace NDT Class AAA inspection threshold is standardly ~0.25 - 0.50 mm.
                </span>
              </div>

              {/* Target Service Hours */}
              <div className="space-y-1.5 pt-2 border-t border-[#162032]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Target Mission / Service Life:</span>
                  <span className="text-emerald-400 font-bold text-sm">{exposureHours} hours</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={exposureHours}
                  onChange={(e) => setExposureHours(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* SCC Fracture Results */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-sky-400" />
                  <span>Fracture Mechanics & SCC Crack Growth Analysis</span>
                </h3>
              </div>

              {/* Comparison Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Applied Stress Intensity (K_I):</span>
                  <span className="text-lg font-bold text-white block">
                    {sccResults.stressIntensityKI.toFixed(2)} <span className="text-xs text-amber-400">MPa√m</span>
                  </span>
                  <span className="text-[10px] text-slate-500">K_I = 1.12 · σ · √(π · a)</span>
                </div>

                <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">SCC Threshold Toughness (K_ISCC):</span>
                  <span className="text-lg font-bold text-white block">
                    {sccResults.effectiveKIscc.toFixed(2)} <span className="text-xs text-sky-400">MPa√m</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{env.name}</span>
                </div>
              </div>

              {/* Status Alert */}
              <div className={`p-4 rounded-xl border ${
                sccResults.isSccActive 
                  ? "bg-red-500/20 border-red-500/50 text-red-200" 
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              } space-y-2`}>
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{sccResults.isSccActive ? "🚨 STRESS CORROSION CRACKING ACTIVE (K_I >= K_ISCC)" : "✅ SCC SAFE REGIME (K_I < K_ISCC)"}</span>
                  <span>Safety Margin: {sccResults.sccSafetyMargin.toFixed(2)}x</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {sccResults.isSccActive ? (
                    <>
                      Under applied tensile stress of {jointStressMpa} MPa in chloride environment, crack growth velocity is estimated at{" "}
                      <strong>{sccResults.crackVelocityMmHr.toExponential(2)} mm/hr</strong>. Critical penetration through 5 mm thickness is reached in approximately{" "}
                      <strong>{sccResults.estimatedHoursToThroughCrack.toFixed(0)} hours</strong>.
                    </>
                  ) : (
                    <>
                      Applied stress intensity (K_I = {sccResults.stressIntensityKI.toFixed(2)} MPa√m) remains safely below the alloy SCC threshold (K_ISCC = {sccResults.effectiveKIscc.toFixed(2)} MPa√m).
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WAGNER HIGH-TEMP OXIDATION & TGO                  */}
      {/* ======================================================== */}
      {activeSubTab === "oxidation-tgo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>High-Temperature Wagner Kinetics</span>
                </h3>
                <span className="text-[11px] text-slate-400">Parabolic Law: x² = 2·k_p·t</span>
              </div>

              {/* Operating Temperature */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Operating / Gas Temperature:</span>
                  <span className="text-amber-400 font-bold text-sm">{operatingTempC} °C ({oxidationResults.tempKelvin.toFixed(0)} K)</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1150"
                  step="25"
                  value={operatingTempC}
                  onChange={(e) => setOperatingTempC(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Exposure Time */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>High-Temperature Exposure Time:</span>
                  <span className="text-sky-400 font-bold text-sm">{exposureHours} hours</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={exposureHours}
                  onChange={(e) => setExposureHours(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#050810] rounded-lg border border-[#162032] space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Oxidation Activation Energy (Q):</span>
                  <span className="text-white font-bold">{anodeMat.activationEnergyOxidation_kJmol} kJ/mol</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calculated k_p(T):</span>
                  <span className="text-amber-400 font-bold">{oxidationResults.kp_T.toExponential(3)} mg²/cm⁴·s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Oxide Layer Results */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Oxide Scale (TGO) Thickness & Spallation Limit</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Grown Oxide Thickness (x_tgo):</span>
                  <span className="text-lg font-bold text-white block">
                    {oxidationResults.oxideThicknessUm.toFixed(2)} <span className="text-xs text-amber-400">µm</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Weight Gain: {oxidationResults.weightGainMgCm2.toFixed(3)} mg/cm²</span>
                </div>

                <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Spallation Life:</span>
                  <span className="text-lg font-bold text-white block">
                    {oxidationResults.oxidationLifeHours.toLocaleString("en-US", { maximumFractionDigits: 0 })} <span className="text-xs text-emerald-400">hours</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Critical TGO Limit: {oxidationResults.spallationLimitUm} µm</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${
                oxidationResults.oxideThicknessUm > oxidationResults.spallationLimitUm
                  ? "bg-red-500/20 border-red-500/50 text-red-200"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              } space-y-1.5`}>
                <span className="font-bold text-xs block">
                  {oxidationResults.oxideThicknessUm > oxidationResults.spallationLimitUm
                    ? "⚠️ CRITICAL OXIDE SPALLATION RISK"
                    : "🛡️ STABLE PASSIVE OXIDE FILM REGIME"}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {anodeMat.name} exhibits parabolic oxidation growth at {operatingTempC}°C.{" "}
                  {coating.oxidationBarrierFactor > 1.5 && `Applied ${coating.name} thermal barrier slows oxygen diffusion by ${coating.oxidationBarrierFactor}x.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: COATING & DIELECTRIC LIFE PREDICTOR               */}
      {/* ======================================================== */}
      {activeSubTab === "coating-life" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>Coating & Surface Barrier Parameters</span>
                </h3>
                <span className="text-[11px] text-emerald-400">{coating.standardSpec}</span>
              </div>

              <div className="p-4 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-3">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Coating Type:</span>
                  <span className="text-white font-bold">{coating.type}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Nominal Thickness:</span>
                  <span className="text-amber-400 font-bold">{coating.nominalThicknessUm} µm</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Dielectric Insulation Resistance (R_dielectric):</span>
                  <span className="text-sky-400 font-bold">{coating.dielectricResistanceOhmCm2.toExponential(2)} Ω·cm²</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Max Service Temperature:</span>
                  <span className="text-emerald-400 font-bold">{coating.maxTempC} °C</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {coating.description}
              </p>
            </div>
          </div>

          {/* Life Degradation Progress */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Timer className="w-4 h-4 text-sky-400" />
                  <span>Service Life & Consumption ({env.milStandard})</span>
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Barrier Consumption at {exposureHours}h Mission:</span>
                  <span className="text-amber-400 font-bold text-base">{coatingLifeResults.consumedPctAtExposure}%</span>
                </div>

                <div className="w-full bg-[#050810] h-4 rounded-full overflow-hidden border border-[#1e2d46]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      coatingLifeResults.consumedPctAtExposure > 85
                        ? "bg-red-500"
                        : coatingLifeResults.consumedPctAtExposure > 50
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${coatingLifeResults.consumedPctAtExposure}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0 Hours</span>
                  <span>Predicted Barrier Life: {coatingLifeResults.predictedLifeHours.toLocaleString()} Hours</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Salt Fog / Humidity Acceleration Factor:</span>
                  <span className="text-amber-400 font-bold">{coatingLifeResults.accelerationFactor.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining Safe Flight Hours:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.max(0, coatingLifeResults.predictedLifeHours - exposureHours).toLocaleString()} Hours
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

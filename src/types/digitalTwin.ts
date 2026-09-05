/**
 * SAMPLE DIGITAL TWIN DATA SCHEMA & STORE
 * 
 * Centralized, multi-scale, physical-to-digital twin schema that connects and feeds all MetalliX modules:
 * 1. Chemistry & Raw Alloy Data (AlloyBuilder, PocketCalculators, Schaeffler, CE)
 * 2. Thermodynamics & Phase Constitution (CALPHAD Gibbs Solver, Fe-C, SGTE)
 * 3. Manufacturing & Thermal History (ThermalCycleScheduler, Additive3DDistortion, Heat Treatment)
 * 4. Microstructure & Characterization (MicrographLab, XRD, EBSD, EDS)
 * 5. Mechanical & Performance Properties (HardnessToTensile, MMPDS, Tensile/Yield/Toughness)
 * 6. Electrochemical, Battery & Corrosion (EIS, Tafel, Pitting, OCV)
 * 7. Environmental, Extreme Service & Hypersonic (Ablation, High-T Oxidation)
 * 8. Standards, Aerospace Certification & Audit (AerospaceAudit, MIL-STD/AMS/AS9100)
 */

export interface DigitalTwinChemistry {
  baseElement: string;
  nominalComposition: Record<string, number>; // e.g. { Fe: 68.5, Cr: 18.0, Ni: 10.0, Mo: 2.5, C: 0.03 }
  measuredComposition?: Record<string, number>; // EDS / OES verified
  carbonEquivalent?: {
    ceIIW?: number;
    pcm?: number;
    cen?: number;
  };
  schaefflerCoordinates?: {
    crEq: number;
    niEq: number;
    estimatedFerriteNumber: number;
    matrixPrediction: string;
  };
}

export interface DigitalTwinThermodynamics {
  calphadSystemId: string; // e.g. "fe-c", "ni-al", "ti-al", "cu-ni"
  liquidusTemperatureC: number;
  solidusTemperatureC: number;
  freezingRangeC: number;
  stablePhasesAtRoomTemp: {
    phaseId: string;
    phaseName: string;
    fractionPct: number;
    crystalStructure: string;
  }[];
  scheilSolidification: {
    eutecticFractionPct: number;
    hotTearingIndexKou: number;
    microsegregationSeverity: "Low" | "Moderate" | "High" | "Critical";
  };
  transformationTemps?: {
    ac1?: number;
    ac3?: number;
    ms?: number;
    mf?: number;
    bs?: number;
  };
}

export interface DigitalTwinProcessHistory {
  manufacturingRoute: "LPBF (Laser Powder Bed)" | "Forged & Rolled" | "Investment Cast" | "DED (Direct Energy)" | "Extruded" | "HIP (Hot Isostatic Pressed)";
  currentCondition: "As-Built / As-Cast" | "Solution Treated" | "Peak Aged (T6)" | "Stress Relieved" | "Annealed" | "Quenched & Tempered";
  thermalCycles: {
    stageName: string;
    targetTempC: number;
    holdTimeMinutes: number;
    coolingMethod: "Furnace Cool" | "Air Cool" | "Oil Quench" | "Water Quench" | "Gas Fan";
    notes?: string;
  }[];
  additiveParameters?: {
    laserPowerW: number;
    scanSpeedMmS: number;
    hatchDistanceUm: number;
    layerThicknessUm: number;
    volumetricEnergyDensityJ_mm3: number;
    predictedResidualStressMpa: number;
    maxDeflectionMm: number;
  };
}

export interface DigitalTwinMicrostructure {
  primaryCrystalStructure: "FCC" | "BCC" | "HCP" | "BCT" | "L12" | "B2" | "Amorphous";
  astmGrainSizeNumber: number; // e.g. 8.5
  meanGrainDiameterUm: number; // e.g. 18.5 um
  porosityPct: number; // e.g. 0.08%
  phasesDetected: {
    name: string;
    fractionPct: number;
    morphology: string; // e.g. "Cellular Dendritic", "Equiaxed", "Acicular Martensite", "Lamellar Pearlite"
  }[];
  ebsdTexture: {
    preferredOrientation: string; // e.g. "<001> Build Direction Fiber"
    misorientationAngleMeanDeg: number;
    lowAngleBoundaryPct: number;
    highAngleBoundaryPct: number;
    kosselSchmidFactorMean: number;
  };
  xrdVerification: {
    primaryPeaks: { hkl: string; twoTheta: number; intensityPct: number }[];
    residualStressSin2PsiMpa: number; // e.g. +145 MPa (tensile)
    crystalliteSizeNm: number;
  };
  edsPurityPurityPct: number;
}

export interface DigitalTwinMechanicalProperties {
  yieldStrengthMpa: number;
  ultimateTensileStrengthMpa: number;
  elongationPct: number;
  reductionOfAreaPct: number;
  hardness: {
    value: number;
    scale: "HV" | "HRC" | "HRB" | "HBW";
    convertedHRC?: number;
    convertedHV?: number;
  };
  fractureToughnessK1cMpaSqrtM?: number;
  fatigueLimitMpa?: number; // 10^7 cycles
  mmpdsStatisticalBasis: {
    basisLevel: "A-Basis Qualified" | "B-Basis Qualified" | "S-Basis Provisional" | "Tentative R&D";
    sampleCountN: number;
    cpkReliability: number;
  };
}

export interface DigitalTwinElectrochemistry {
  corrosionRateMpy: number; // Mils per year
  openCircuitPotentialEcorrV: number; // V vs SCE
  pittingPotentialEpitV?: number;
  polarizationResistanceRpOhmCm2: number;
  eisImpedanceModuleOhm: number;
  passivationQuality: "Immune" | "Passive Stable" | "Susceptible to Pitting" | "Active Dissolution";
  batteryCompatibility?: {
    lithiumIntercalationVoltageV: number;
    capacityMah_g: number;
    cycleRetentionPct1000: number;
  };
}

export interface DigitalTwinExtremeService {
  operatingMaxTempC: number;
  hypersonicAblationRecessionRateMm_s?: number;
  thermalConductivityW_mK: number;
  thermalDiffusivityMm2_s: number;
  oxidationResistanceCategory: "Excellent (Protective Cr2O3/Al2O3)" | "Moderate" | "Severe Scaling";
  creepRuptureLifeHours?: {
    temperatureC: number;
    stressMpa: number;
    hoursToRupture: number;
  };
}

export interface DigitalTwinQualityAndCert {
  applicableStandards: string[]; // e.g. ["AMS 5662", "ASTM B348", "MIL-STD-810H", "AS9100D"]
  aerospaceFlightReadinessScorePct: number; // 0 - 100
  qualificationAuditStatus: "Fully Certified (Flight-Grade)" | "Conditional Pass (Requires HIP)" | "Non-Conformance Flagged";
  complianceRiskLevel: "Negligible" | "Low" | "Moderate" | "High";
  nonDestructiveTestResults: {
    ultrasonicInspection: "Accept (Level A)" | "Reject" | "Pending";
    xrayRadiography: "ASTM E1742 Class I" | "Class II" | "Flaw Detected";
    surfaceDyePenetrant: "No Indications" | "Micro-cracks present";
  };
  blockchainHashCertificate?: string;
}

export interface DigitalTwinAttachment {
  id: string;
  name: string;
  type: "stl_geometry" | "ebsd_map" | "raw_eis" | "xrd_profile" | "sem_micrograph" | "custom_binary";
  sizeBytes: number;
  data?: string | ArrayBuffer;
  metadata?: Record<string, any>;
  uploadedAt: string;
}

export interface SampleDigitalTwin {
  id: string; // Unique Twin UUID / Serial
  serialNumber: string; // e.g. "TWIN-IN718-LPBF-2026-088"
  sampleName: string; // e.g. "Inconel 718 LPBF High-Pressure Turbine Blade"
  materialCategory: "Nickel Superalloy" | "Titanium Alloy" | "Stainless Steel" | "Alloy Steel" | "Aluminum Aerospace" | "Refractory / CMC";
  standardDesignation: string; // e.g. "UNS N07718 / AMS 5662"
  creationDate: string;
  lastUpdated: string;
  leadMetallurgist: string;
  organization: string;
  currentStatus: "Production Ready" | "Under Test / In-Flight Testing" | "R&D Prototype" | "Quarantine / Review";
  
  // Optional large binary attachments (e.g. 50k+ facet binary STL, 1M point EBSD Euler angle maps)
  // Persisted seamlessly in IndexedDB without 5 MB localStorage ceiling
  attachments?: DigitalTwinAttachment[];

  // 8 Integrated Sub-Domains
  chemistry: DigitalTwinChemistry;
  thermodynamics: DigitalTwinThermodynamics;
  processHistory: DigitalTwinProcessHistory;
  microstructure: DigitalTwinMicrostructure;
  mechanical: DigitalTwinMechanicalProperties;
  electrochemistry: DigitalTwinElectrochemistry;
  extremeService: DigitalTwinExtremeService;
  certification: DigitalTwinQualityAndCert;
}

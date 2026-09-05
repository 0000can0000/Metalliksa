export interface TafelRawPoint {
  index: number;
  potential: number; // V vs Reference electrode
  potentialSHE?: number; // V vs Standard Hydrogen Electrode
  currentRaw: number; // Raw current from instrument (A, mA, uA)
  currentUnit: "A" | "mA" | "uA" | "nA";
  currentDensity_uA_cm2: number; // Absolute current density in uA/cm2
  logCurrentDensity: number; // log10(abs(currentDensity_uA_cm2))
  signedCurrentDensity_uA_cm2: number; // signed (+ for anodic, - for cathodic)
  isCathodic?: boolean; // E < Ecorr
  isAnodic?: boolean; // E > Ecorr
}

export type ReferenceElectrodeType =
  | "SHE" // Standard Hydrogen Electrode (0.000 V)
  | "SCE" // Saturated Calomel Electrode (+0.241 V vs SHE)
  | "Ag/AgCl" // Saturated KCl (+0.197 V vs SHE)
  | "MSE" // Mercury-Mercurous Sulfate (+0.640 V vs SHE)
  | "Custom";

export interface TafelDataset {
  id: string;
  name: string;
  sourceFilename: string;
  sourceInstrument: "biologic" | "gamry" | "autolab" | "par" | "csv" | "benchmark";
  points: TafelRawPoint[];
  metadata: {
    electrodeAreaCm2: number;
    referenceElectrode: ReferenceElectrodeType;
    refOffsetVsSHE: number; // e.g. 0.241 for SCE
    alloyName: string;
    density_g_cm3: number;
    equivalentWeight: number; // g / eq
    electrolyte: string;
    temperatureC: number;
    scanRateMv_s?: number;
    notes?: string;
  };
}

export interface TafelFitResult {
  // Primary Extrapolated Coordinates
  eCorr: number; // Extrapolated Corrosion Potential (V vs Ref)
  eCorrSHE: number; // Corrosion Potential vs SHE (V)
  iCorr_uA_cm2: number; // Extrapolated Corrosion Current Density (uA/cm2)
  logIcorr: number; // log10(iCorr_uA_cm2)
  totalCurrentIcorr_uA: number; // iCorr * Area (uA)

  // Slopes and Coefficients
  betaA_V_dec: number; // Anodic Tafel slope (V/decade)
  betaA_mV_dec: number; // Anodic Tafel slope (mV/decade)
  betaC_V_dec: number; // Cathodic Tafel slope (V/decade)
  betaC_mV_dec: number; // Cathodic Tafel slope (mV/decade)
  sternGearyB_V: number; // B constant (V)
  rp_ohm_cm2: number; // Polarization resistance Rp (Ohm * cm2)

  // Faraday Corrosion Rates (ASTM G102)
  corrosionRateMmYr: number; // Penetration rate (mm/year)
  corrosionRateMpy: number; // Mils per year (mpy)
  massLoss_g_m2_day: number; // g / (m2 * day)

  // Fit Quality and Ranges
  cathodicRange: [number, number]; // [E_min, E_max] in V
  anodicRange: [number, number]; // [E_min, E_max] in V
  cathodicR2: number; // R-squared of cathodic Tafel fit
  anodicR2: number; // R-squared of anodic Tafel fit
  cathodicSlope_m: number; // d(log i) / dE (1 / V)
  cathodicIntercept_b: number; // Intercept
  anodicSlope_m: number; // d(log i) / dE (1 / V)
  anodicIntercept_b: number; // Intercept

  // Raw Valley Benchmark
  rawEcorrValley: number; // Potential of minimum measured current (V)
  rawIcorrValley: number; // Minimum measured current density (uA/cm2)

  // Tangents & Butler-Volmer Model Data for Charting
  tangentLines: {
    potential: number;
    logI_anodic?: number | null;
    logI_cathodic?: number | null;
  }[];
  syntheticButlerVolmer: {
    potential: number;
    logI_model: number;
  }[];

  // Passivity & Pitting if Detected
  pittingPotentialEpit_V?: number | null;
  passivationCurrentIpass_uA?: number | null;

  // Severity and Assessment
  severity: "Immune / Highly Resistant" | "Passivated / Good" | "Moderate (Caution)" | "Severe Rapid Corrosion";
  astmClassification: string;

  // Python Engine Provenance
  isPythonEngine?: boolean;
  pythonVersion?: string;
  durationMs?: number;
}

export interface TafelPythonCorrosionRateInput {
  iCorr_uA_cm2: number;
  eCorr_V: number;
  betaA: number;
  betaC: number;
  alloyId?: string;
  alloyName?: string;
  density_g_cm3?: number;
  equivalentWeight?: number;
  specimenAreaCm2?: number;
  initialThicknessMm?: number;
  allowableLossMm?: number;
  temperatureC?: number;
  activationEnergyJ_mol?: number;
  customComposition?: Record<string, number>;
  customValencies?: Record<string, number>;
  customAtomicWeights?: Record<string, number>;
}

export interface TafelYearlyProjection {
  year: number;
  lossUniformMm: number;
  lossPittingMm: number;
  remainingWallMm: number;
  remainingPittingMm: number;
  wallLossPct: number;
  exceedsAllowance: boolean;
}

export interface TafelTemperatureSensitivity {
  tempC: number;
  tempK: number;
  arrheniusFactor: number;
  iCorr_uA_cm2: number;
  corrosionRateMmYr: number;
  corrosionRateMpy: number;
}

export interface TafelPythonCorrosionRateResult {
  success: boolean;
  isPythonEngine: boolean;
  pythonVersion?: string;
  standards?: string[];
  durationMs?: number;
  timestamp?: string;

  // Primary Rates
  corrosionRateMmYr: number; // Primary annual rate in mm/year
  corrosionRateMpy: number; // mils per year
  corrosionRateUmYr: number; // um/year
  corrosionRateNmHr: number; // nm/hour
  massLoss_g_m2_day: number; // g / (m^2 * day)
  massLoss_mdd: number; // mg / (dm^2 * day)
  massLoss_kg_m2_yr: number; // kg / (m^2 * year)

  // Stern-Geary Metrics
  sternGearyB_V: number;
  rp_ohm_cm2: number;
  rp_apparent_ohm: number;

  // Substrate Metadata
  alloyId: string;
  alloyName: string;
  density_g_cm3: number;
  equivalentWeight: number;
  iCorr_uA_cm2: number;
  eCorr_V: number;
  betaA: number;
  betaC: number;
  specimenAreaCm2: number;
  temperatureC: number;
  initialThicknessMm: number;
  allowableLossMm: number;

  // Remaining Useful Life (RUL)
  rulUniformYears: number;
  rulPittingYears: number;

  // Severity Classification
  severity: {
    level: string;
    code: string;
    color: "emerald" | "sky" | "amber" | "orange" | "rose";
    description: string;
    recommendation: string;
  };

  // Timeline Projections & Temperature Variations
  timelineProjections: TafelYearlyProjection[];
  temperatureSensitivity: TafelTemperatureSensitivity[];

  // Reproducible Python Snippet
  pythonCode: string;
  error?: string;
}

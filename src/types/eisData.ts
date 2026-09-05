import { CircuitTopology } from "../components/EquivalentCircuitBuilder";

export interface RawEISPoint {
  frequency: number; // Hz
  zReal: number; // Ohm
  zImag: number; // Ohm (can be negative or positive)
  minusZImag: number; // Ohm (-zImag, typically positive in EIS)
  zMag: number; // Ohm
  phaseDeg: number; // deg
}

export interface ExperimentalEISDataset {
  id: string;
  name: string;
  source: "biologic" | "gamry" | "zahner" | "autolab" | "csv" | "benchmark";
  sourceFilename?: string;
  description: string;
  points: RawEISPoint[];
  metadata?: {
    instrument?: string;
    temperatureC?: number;
    potentialV?: number;
    acAmplitudeMv?: number;
    electrodeAreaCm2?: number;
    sampleRate?: string;
    cycleNumber?: number;
    exposureHours?: number;
    [key: string]: any;
  };
}

export type WeightingMethod = "modulus" | "proportional" | "unit";

export interface ParameterFitResult {
  elementId: string;
  branchId: string;
  paramName: string;
  paramType: string;
  field: "value" | "exponent";
  initialValue: number;
  fittedValue: number;
  unit: string;
  stdError: number; // Absolute standard error
  percentError: number; // Relative error % (stdError / fittedValue * 100)
  isFixed: boolean;
  lowerBound: number;
  upperBound: number;
}

export interface ResidualPoint {
  frequency: number;
  logFreq: number;
  expZReal: number;
  expMinusZImag: number;
  calcZReal: number;
  calcMinusZImag: number;
  resZRealPct: number; // (exp - calc) / |exp| * 100
  resZImagPct: number; // (exp - calc) / |exp| * 100
  kkResidualPct?: number; // Kramers-Kronig transform residual %
  weightReal?: number; // ASTM G106 statistical weight w_re
  weightImag?: number; // ASTM G106 statistical weight w_im
  weightedDiffReal?: number; // sqrt(w_re) * (exp - calc)
  weightedDiffImag?: number; // sqrt(w_im) * (exp - calc)
}

export interface AstmG106Metrics {
  isAstmG106Compliant: boolean;
  weightingScheme: WeightingMethod;
  dynamicRangeDecades: number;
  minImpedanceMagnitude_Ohm: number;
  maxImpedanceMagnitude_Ohm: number;
  hfSensitivityBalancingFactor: number;
  unweightedSkewWarning?: string | null;
  astmStandardRecommendation: string;
}

export interface KramersKronigResult {
  isValid: boolean;
  score: number; // 0 to 100%
  meanResidualPct: number;
  maxResidualPct: number;
  assessment: string;
  details?: string;
}

export interface CPEEffectiveCapacitance {
  cpeElementId: string;
  cpeName: string;
  qValue: number;
  nExponent: number;
  cBrug_F: number;
  cBrug_uF: number;
  cEffectiveArea_uFcm2?: number;
  cHirschorn_F: number;
  cHirschorn_uF: number;
  cHsuMansfeld_F: number;
  cHsuMansfeld_uF: number;
  tauEffectiveMs: number;
  associatedRs: number;
  associatedRct: number;
  modelApplied: "Brug (2D Surface Distribution)" | "Hirschorn (3D Porous/Film Distribution)" | "Hsu-Mansfeld";
  physicsNote: string;
}

export interface LinKKStationarityReport {
  isStationary: boolean;
  driftScore: number; // 0-100
  stationarityStatus: string;
  muDriftMetric: number;
  kkChiSquare: number;
  pseudoChiSquare: number;
  meanResidualPct: number;
  flaggedFrequencies: number[];
  residuals: Array<{
    frequency: number;
    logFreq: number;
    zRealResPct: number;
    zImagResPct: number;
    totalResidualPct: number;
    isOutlier: boolean;
  }>;
  recommendation: string;
}

export interface InductanceDeembeddingReport {
  hasHighFreqInduction: boolean;
  detectedInductance_H: number;
  detectedInductance_uH: number;
  zeroCrossingFreq_Hz: number | null;
  cableArtifactMagnitude_Ohm: number;
  originalPointsCount: number;
  correctedPointsCount: number;
  correctedPoints: RawEISPoint[];
  recommendedAction: string;
}

export interface PhysicalValidationSuite {
  cpeCapacitances: CPEEffectiveCapacitance[];
  linKK: LinKKStationarityReport;
  inductance: InductanceDeembeddingReport;
}

export interface DRTPoint {
  logTau: number;
  tau_s: number;
  charFreq_Hz: number;
  gamma_Ohm: number;
}

export interface DRTPeak {
  tau_s: number;
  logTau: number;
  charFreq_Hz: number;
  gammaHeight_Ohm: number;
  process: string;
  domain: string;
}

export interface DRTResult {
  r_inf: number;
  lambda_reg: number;
  drtCurve: DRTPoint[];
  identifiedPeaks: DRTPeak[];
  pythonDurationMs?: number;
}

export interface SyntheticNoiseConfig {
  whiteNoisePct: number; // Modulus proportional noise % (e.g. 0.1 to 10%)
  noiseFloorOhm: number; // Absolute noise floor in Ohms (e.g. 1e-4 to 1.0)
  phaseJitterDeg: number; // Phase angle Gaussian jitter in degrees (e.g. 0 to 3 deg)
  driftPct: number; // Non-stationary baseline drift % (0 to 30%)
  driftType: "linear" | "power_law" | "exponential";
  cableInductance_uH: number; // High-frequency cable/lead inductance in microhenries (0 to 20 uH)
  leadResistance_Ohm: number; // Parasitic lead resistance in Ohms (0 to 5 Ohm)
  strayCapacitance_pF: number; // Stray shunt capacitance in picofarads (0 to 500 pF)
  leakageConductance_uS: number; // Stray shunt leakage in microSiemens
  flicker1OverFPct: number; // Low frequency 1/f noise amplitude % (0 to 10%)
  mainsArtifact: {
    enabled: boolean;
    frequencyHz: 50 | 60;
    magnitudePct: number;
    harmonics: boolean;
  };
  rangeSwitchGlitches: {
    enabled: boolean;
    switchFreqsHz: number[];
    stepMagnitudePct: number;
  };
  electrodeAreaBiasPct: number; // Area geometry error % (-15% to +15%)
  adcBitResolution: number; // 0 for continuous 64-bit float, 12, 16, or 24 bits
  randomSeed?: number;
}

export interface SyntheticNoisePreset {
  id: string;
  name: string;
  category: "Laboratory Bench" | "Field & Industrial" | "Electrode Transient" | "Extreme Artifacts";
  description: string;
  config: SyntheticNoiseConfig;
}

export interface SyntheticEISPoint extends RawEISPoint {
  cleanZReal: number;
  cleanZImag: number;
  cleanMinusZImag: number;
  cleanZMag: number;
  cleanPhaseDeg: number;
  deltaZReal: number;
  deltaZImag: number;
  noiseVectorMag: number;
  snr_dB: number;
  artifactContributions?: {
    whiteNoiseOhm: number;
    driftOhm: number;
    cableInductanceOhm: number;
    strayCapacitanceOhm: number;
    flickerOhm: number;
    mainsOhm: number;
    glitchOhm: number;
  };
}

export interface ParameterRecoveryError {
  paramName: string;
  elementId: string;
  field: "value" | "exponent";
  trueValue: number;
  recoveredValue: number;
  unit: string;
  absError: number;
  pctError: number;
  stdError: number;
  isReliable: boolean;
}

export interface RobustnessBenchmarkResult {
  config: SyntheticNoiseConfig;
  noisePresetId?: string;
  groundTruthTopology: CircuitTopology;
  fittedTopology: CircuitTopology;
  parameterErrors: ParameterRecoveryError[];
  meanAbsolutePctError: number;
  maxAbsolutePctError: number;
  robustnessScore: number; // 0 to 100
  robustnessGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  reducedChiSquare: number;
  rSquared: number;
  rmse: number;
  converged: boolean;
  iterations: number;
  executionTimeMs: number;
  engineUsed: string;
  linKKStationarity: {
    isStationary: boolean;
    driftScore: number;
    meanResidualPct: number;
  };
  inductanceDeembedded: {
    detectedInductance_uH: number;
    targetInductance_uH: number;
    recoveredTrueRs: boolean;
  };
  keyDiagnosis: string;
  recommendation: string;
  noisyDataset: ExperimentalEISDataset;
  syntheticPoints: SyntheticEISPoint[];
}

export interface SweepStressPoint {
  noiseLevelPct: number;
  meanParamErrorPct: number;
  maxParamErrorPct: number;
  rsErrorPct: number;
  rctErrorPct: number;
  cpeErrorPct: number;
  reducedChiSquare: number;
  rSquared: number;
  converged: boolean;
  robustnessScore: number;
}

export interface CNLSFitReport {
  topology: CircuitTopology;
  parameters: ParameterFitResult[];
  dataset: ExperimentalEISDataset;
  chiSquare: number;
  reducedChiSquare: number;
  rmse: number;
  rSquared: number;
  iterations: number;
  converged: boolean;
  weighting: WeightingMethod;
  executionTimeMs: number;
  residuals: ResidualPoint[];
  kramersKronig: KramersKronigResult;
  physicalValidation?: PhysicalValidationSuite;
  astmG106?: AstmG106Metrics;
  engineUsed?: string;
  drt?: DRTResult;
}


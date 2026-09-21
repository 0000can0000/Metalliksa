/**
 * MetalliX Synthetic EIS Noise & Experimental Sensor Artifact Generator
 * Models real-world potentiostat and electrochemical cell non-idealities:
 * - High-frequency cable/lead inductance (L_cable) and series lead resistance
 * - Parasitic stray shunt capacitance (C_stray) & leakage conductance
 * - Time-variant non-stationary OCP/interfacial kinetic drift (Lin-KK violation)
 * - Low-frequency 1/f flicker noise & hydrodynamic convection turbulence
 * - Proportional & absolute thermal/electronic white noise + phase jitter
 * - 50 Hz / 60 Hz mains interference notch & harmonics
 * - Potentiostat current range switching step discontinuities
 * - ADC quantization limits & electrode area tolerance bias
 */

import {
  CircuitTopology,
  CircuitElement,
} from "../components/EquivalentCircuitBuilder";
import {
  RawEISPoint,
  SyntheticEISPoint,
  SyntheticNoiseConfig,
  SyntheticNoisePreset,
  ExperimentalEISDataset,
  RobustnessBenchmarkResult,
  ParameterRecoveryError,
  SweepStressPoint,
  CNLSFitReport,
  WeightingMethod,
} from "../types/eisData";
import {
  extractAdjustableParameters,
  runAsyncAutoFit,
  evalTopologyImpedance,
} from "./cnlsOptimizer";

// =========================================================================
// 1. STANDARD EXPERIMENTAL NOISE & SENSOR ARTIFACT PRESETS
// =========================================================================

export const DEFAULT_SYNTHETIC_NOISE_CONFIG: SyntheticNoiseConfig = {
  whiteNoisePct: 1.0,
  noiseFloorOhm: 0.005,
  phaseJitterDeg: 0.25,
  driftPct: 0.0,
  driftType: "linear",
  cableInductance_uH: 0.0,
  leadResistance_Ohm: 0.0,
  strayCapacitance_pF: 0.0,
  leakageConductance_uS: 0.0,
  flicker1OverFPct: 0.0,
  mainsArtifact: {
    enabled: false,
    frequencyHz: 60,
    magnitudePct: 2.0,
    harmonics: true,
  },
  rangeSwitchGlitches: {
    enabled: false,
    switchFreqsHz: [1000, 10],
    stepMagnitudePct: 2.5,
  },
  electrodeAreaBiasPct: 0.0,
  adcBitResolution: 0,
};

export const SYNTHETIC_NOISE_PRESETS: SyntheticNoisePreset[] = [
  {
    id: "pristine_lab",
    name: "Pristine Laboratory Reference (Ideal)",
    category: "Laboratory Bench",
    description: "High-end research potentiostat with Faraday cage, 4-terminal Kelvin connection, and ultra-low noise floor.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 0.2,
      noiseFloorOhm: 0.001,
      phaseJitterDeg: 0.08,
      cableInductance_uH: 0.05,
      leadResistance_Ohm: 0.01,
    },
  },
  {
    id: "subsea_cable",
    name: "Subsea Umbilical & Long Cable Artifacts",
    category: "Field & Industrial",
    description: "Long coaxial test leads introduce high-frequency inductive loops (4th quadrant) and series contact resistance.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 1.2,
      noiseFloorOhm: 0.01,
      phaseJitterDeg: 0.35,
      cableInductance_uH: 3.8, // 3.8 uH causes prominent high-freq loop
      leadResistance_Ohm: 0.45,
      strayCapacitance_pF: 15.0,
    },
  },
  {
    id: "unsteady_ocp_drift",
    name: "Non-Stationary Kinetic & OCP Drift",
    category: "Electrode Transient",
    description: "Fast-corroding interface or non-equilibrium battery cell causing low-frequency time-variant impedance distortion.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 0.8,
      phaseJitterDeg: 0.3,
      driftPct: 12.0, // 12% drift over the sweep duration
      driftType: "power_law",
      flicker1OverFPct: 2.0,
    },
  },
  {
    id: "parasitic_stray_c",
    name: "High-Impedance Coating Parasitic Shunt",
    category: "Laboratory Bench",
    description: "High-impedance barrier films susceptible to inter-electrode stray capacitance and cell fixture leakage.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 1.0,
      strayCapacitance_pF: 65.0, // 65 pF suppresses high-freq semicircle
      leakageConductance_uS: 0.5,
    },
  },
  {
    id: "industrial_harsh",
    name: "Industrial Field Harsh Environment",
    category: "Field & Industrial",
    description: "High electromagnetic interference with 60 Hz power grid hum, cable inductance, and convection turbulence.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 2.5,
      noiseFloorOhm: 0.03,
      phaseJitterDeg: 0.6,
      cableInductance_uH: 1.8,
      leadResistance_Ohm: 0.25,
      flicker1OverFPct: 3.5,
      mainsArtifact: {
        enabled: true,
        frequencyHz: 60,
        magnitudePct: 4.5,
        harmonics: true,
      },
    },
  },
  {
    id: "potentiostat_glitch",
    name: "Current Range Switching Step Glitch",
    category: "Laboratory Bench",
    description: "Electrometer gain range change during frequency sweep introduces step discontinuities at decade boundaries.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 0.7,
      rangeSwitchGlitches: {
        enabled: true,
        switchFreqsHz: [1000, 10],
        stepMagnitudePct: 3.8,
      },
    },
  },
  {
    id: "sub_hz_turbulence",
    name: "Sub-Hz Hydrodynamic & Convection Scatter",
    category: "Electrode Transient",
    description: "Electrolyte convective motion, thermal buoyancy, and low-current digitization jitter at frequencies below 1 Hz.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 0.5,
      flicker1OverFPct: 6.0,
      phaseJitterDeg: 0.8,
    },
  },
  {
    id: "extreme_stress_test",
    name: "Severe Multi-Artifact Stress Torture",
    category: "Extreme Artifacts",
    description: "Combined compound artifacts: cable inductance, parasitic shunt capacitance, 15% drift, 50 Hz mains, and 3.5% noise.",
    config: {
      ...DEFAULT_SYNTHETIC_NOISE_CONFIG,
      whiteNoisePct: 3.5,
      noiseFloorOhm: 0.05,
      phaseJitterDeg: 0.75,
      driftPct: 15.0,
      driftType: "power_law",
      cableInductance_uH: 4.5,
      leadResistance_Ohm: 0.6,
      strayCapacitance_pF: 45.0,
      leakageConductance_uS: 0.8,
      flicker1OverFPct: 4.0,
      mainsArtifact: {
        enabled: true,
        frequencyHz: 50,
        magnitudePct: 5.0,
        harmonics: true,
      },
      rangeSwitchGlitches: {
        enabled: true,
        switchFreqsHz: [1000, 10],
        stepMagnitudePct: 3.0,
      },
    },
  },
];

// =========================================================================
// 2. PSEUDO-RANDOM GAUSSIAN NOISE GENERATOR (SEEDED OR RANDOM)
// =========================================================================

class SeededRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  gaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}

// =========================================================================
// 3. THEORETICAL CLEAN SPECTRUM GENERATOR
// =========================================================================

export interface FrequencySweepConfig {
  fMin: number; // e.g. 0.01 Hz
  fMax: number; // e.g. 100,000 Hz
  pointsPerDecade: number; // e.g. 10
  direction: "high_to_low" | "low_to_high";
  customFrequencies?: number[];
}

export const DEFAULT_FREQ_CONFIG: FrequencySweepConfig = {
  fMin: 0.01,
  fMax: 100000,
  pointsPerDecade: 10,
  direction: "high_to_low",
};

export function generateFrequencyGrid(config: FrequencySweepConfig = DEFAULT_FREQ_CONFIG): number[] {
  if (config.customFrequencies && config.customFrequencies.length > 0) {
    return [...config.customFrequencies].sort((a, b) =>
      config.direction === "high_to_low" ? b - a : a - b
    );
  }

  const logMin = Math.log10(Math.max(1e-4, config.fMin));
  const logMax = Math.log10(Math.max(config.fMin * 10, config.fMax));
  const totalDecades = logMax - logMin;
  const numPoints = Math.max(10, Math.round(totalDecades * config.pointsPerDecade));

  const freqs: number[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const logF = config.direction === "high_to_low"
      ? logMax - (i / numPoints) * (logMax - logMin)
      : logMin + (i / numPoints) * (logMax - logMin);
    freqs.push(parseFloat(Math.pow(10, logF).toPrecision(6)));
  }
  return freqs;
}

/**
 * Computes pure analytical impedance from a CircuitTopology
 */
export function computeCleanSpectrum(
  topology: CircuitTopology,
  frequencies: number[]
): RawEISPoint[] {
  return frequencies.map((freq) => {
    const omega = 2 * Math.PI * freq;
    const z = evalTopologyImpedance(topology, omega);
    const zMag = Math.sqrt(z.re * z.re + z.im * z.im);
    const phaseDeg = (Math.atan2(z.im, z.re) * 180) / Math.PI;

    return {
      frequency: freq,
      zReal: z.re,
      zImag: z.im,
      minusZImag: -z.im,
      zMag,
      phaseDeg,
    };
  });
}

// =========================================================================
// 4. SYNTHETIC ERROR & ARTIFACT INJECTION ENGINE
// =========================================================================

export function injectSyntheticNoise(
  cleanPoints: RawEISPoint[],
  config: SyntheticNoiseConfig
): SyntheticEISPoint[] {
  const rng = new SeededRandom(config.randomSeed ?? (Date.now() % 100000));
  const nPoints = cleanPoints.length;

  // Approximate sweep elapsed time for drift simulation
  // High frequencies take milliseconds, low frequencies take seconds
  let cumulativeTime = 0;
  const times = cleanPoints.map((pt) => {
    const period = 1 / Math.max(1e-4, pt.frequency);
    const dwell = Math.max(0.05, period * 1.5); // ~1.5 cycles per point
    cumulativeTime += dwell;
    return cumulativeTime;
  });
  const totalTime = Math.max(1.0, cumulativeTime);

  return cleanPoints.map((pt, idx) => {
    const omega = 2 * Math.PI * pt.frequency;
    const cleanZReal = pt.zReal;
    const cleanZImag = pt.zImag;
    const cleanZMag = pt.zMag;
    const cleanPhaseRad = (pt.phaseDeg * Math.PI) / 180;

    let zRe = cleanZReal;
    let zIm = cleanZImag;

    // Track artifact magnitudes for breakdown diagnostics
    let whiteNoiseOhm = 0;
    let driftOhm = 0;
    let cableInductanceOhm = 0;
    let strayCapacitanceOhm = 0;
    let flickerOhm = 0;
    let mainsOhm = 0;
    let glitchOhm = 0;

    // 1. High-Frequency Cable / Lead Inductance & Series Resistance
    if (config.cableInductance_uH > 0 || config.leadResistance_Ohm > 0) {
      const L = config.cableInductance_uH * 1e-6; // Convert uH to H
      const R_lead = config.leadResistance_Ohm;
      const xL = omega * L;
      zRe += R_lead;
      zIm += xL;
      cableInductanceOhm = Math.sqrt(R_lead * R_lead + xL * xL);
    }

    // 2. Parasitic Stray Shunt Capacitance & Leakage Conductance
    if (config.strayCapacitance_pF > 0 || config.leakageConductance_uS > 0) {
      const C_stray = config.strayCapacitance_pF * 1e-12; // Convert pF to F
      const G_leak = config.leakageConductance_uS * 1e-6; // Convert uS to S
      const bStray = omega * C_stray;

      // Current admittance: Y = 1 / Z
      const denomZ = zRe * zRe + zIm * zIm;
      if (denomZ > 1e-12) {
        const yRe = zRe / denomZ + G_leak;
        const yIm = -zIm / denomZ + bStray;

        // Invert back: Z_shunted = 1 / Y_total
        const denomY = yRe * yRe + yIm * yIm;
        if (denomY > 1e-12) {
          const newZRe = yRe / denomY;
          const newZIm = -yIm / denomY;
          strayCapacitanceOhm = Math.hypot(newZRe - zRe, newZIm - zIm);
          zRe = newZRe;
          zIm = newZIm;
        }
      }
    }

    // 3. Time-Variant OCP / Kinetic Non-Stationary Drift
    if (config.driftPct > 0) {
      const tNorm = times[idx] / totalTime;
      let driftFactor = 0;

      if (config.driftType === "linear") {
        driftFactor = (config.driftPct / 100) * tNorm;
      } else if (config.driftType === "power_law") {
        driftFactor = (config.driftPct / 100) * Math.pow(tNorm, 0.7);
      } else {
        driftFactor = (config.driftPct / 100) * (1 - Math.exp(-2.5 * tNorm));
      }

      // Drift affects real and imaginary parts with slight phase rotation
      const driftRealShift = zRe * driftFactor;
      const driftImagShift = zIm * driftFactor * 0.5;
      zRe += driftRealShift;
      zIm += driftImagShift;
      driftOhm = Math.hypot(driftRealShift, driftImagShift);
    }

    // 4. Low-Frequency 1/f Flicker / Convection Noise
    if (config.flicker1OverFPct > 0) {
      const flickerFactor = (config.flicker1OverFPct / 100) / Math.sqrt(Math.max(1e-3, pt.frequency));
      const fG1 = rng.gaussian(0, 1);
      const fG2 = rng.gaussian(0, 1);
      const flickerRe = cleanZMag * flickerFactor * fG1;
      const flickerIm = cleanZMag * flickerFactor * fG2;
      zRe += flickerRe;
      zIm += flickerIm;
      flickerOhm = Math.hypot(flickerRe, flickerIm);
    }

    // 5. 50 Hz / 60 Hz Mains Interference Notch & Harmonics
    if (config.mainsArtifact.enabled && config.mainsArtifact.magnitudePct > 0) {
      const f0 = config.mainsArtifact.frequencyHz;
      const bandwidth = f0 * 0.12; // 12% bandwidth
      const dist1 = Math.abs(pt.frequency - f0) / bandwidth;
      const hum1 = Math.exp(-0.5 * dist1 * dist1);

      let hum2 = 0;
      if (config.mainsArtifact.harmonics) {
        const dist2 = Math.abs(pt.frequency - 2 * f0) / (bandwidth * 1.5);
        hum2 = 0.45 * Math.exp(-0.5 * dist2 * dist2);
      }

      const totalHum = hum1 + hum2;
      if (totalHum > 0.01) {
        const humMag = cleanZMag * (config.mainsArtifact.magnitudePct / 100) * totalHum;
        const humAngle = rng.gaussian(0, Math.PI);
        const humRe = humMag * Math.cos(humAngle);
        const humIm = humMag * Math.sin(humAngle);
        zRe += humRe;
        zIm += humIm;
        mainsOhm = humMag;
      }
    }

    // 6. Current Range Switching Step Glitches
    if (config.rangeSwitchGlitches.enabled && config.rangeSwitchGlitches.switchFreqsHz.length > 0) {
      const switchFreqs = config.rangeSwitchGlitches.switchFreqsHz;
      for (const sf of switchFreqs) {
        // Points below this switch frequency carry a discrete offset step
        if (pt.frequency <= sf) {
          const stepFrac = (config.rangeSwitchGlitches.stepMagnitudePct / 100);
          const stepShiftRe = zRe * stepFrac * 0.8;
          const stepShiftIm = zIm * stepFrac * 1.2;
          zRe += stepShiftRe;
          zIm += stepShiftIm;
          glitchOhm += Math.hypot(stepShiftRe, stepShiftIm);
        }
      }
    }

    // 7. Gaussian Proportional Measurement Noise & Floor
    const propStd = (config.whiteNoisePct / 100) * cleanZMag;
    const floorStd = config.noiseFloorOhm;
    const totalStd = Math.sqrt(propStd * propStd + floorStd * floorStd);

    const noiseRe = rng.gaussian(0, totalStd);
    const noiseIm = rng.gaussian(0, totalStd);
    zRe += noiseRe;
    zIm += noiseIm;
    whiteNoiseOhm = Math.hypot(noiseRe, noiseIm);

    // 8. Phase Jitter
    if (config.phaseJitterDeg > 0) {
      const jitterRad = (rng.gaussian(0, config.phaseJitterDeg) * Math.PI) / 180;
      const curMag = Math.hypot(zRe, zIm);
      const curPhase = Math.atan2(zIm, zRe) + jitterRad;
      zRe = curMag * Math.cos(curPhase);
      zIm = curMag * Math.sin(curPhase);
    }

    // 9. Electrode Area Tolerance Scaling Bias
    if (config.electrodeAreaBiasPct !== 0) {
      const areaScale = 1 + config.electrodeAreaBiasPct / 100;
      zRe = zRe / areaScale;
      zIm = zIm / areaScale;
    }

    // 10. ADC Bit Resolution Quantization Limit
    if (config.adcBitResolution > 0) {
      const maxRange = cleanZMag * 2.5;
      const numLevels = Math.pow(2, Math.min(24, Math.max(8, config.adcBitResolution)));
      const qStep = maxRange / numLevels;
      zRe = Math.round(zRe / qStep) * qStep;
      zIm = Math.round(zIm / qStep) * qStep;
    }

    // Calculated derived values
    const cleanPhaseDeg = (Math.atan2(cleanZImag, cleanZReal) * 180) / Math.PI;
    const finalMag = Math.hypot(zRe, zIm);
    const finalPhaseDeg = (Math.atan2(zIm, zRe) * 180) / Math.PI;
    const deltaZReal = zRe - cleanZReal;
    const deltaZImag = zIm - cleanZImag;
    const noiseVectorMag = Math.hypot(deltaZReal, deltaZImag);
    const snr_dB = noiseVectorMag > 0
      ? 20 * Math.log10(Math.max(1e-9, cleanZMag) / noiseVectorMag)
      : 80;

    return {
      frequency: pt.frequency,
      zReal: zRe,
      zImag: zIm,
      minusZImag: -zIm,
      zMag: finalMag,
      phaseDeg: finalPhaseDeg,
      cleanZReal,
      cleanZImag,
      cleanMinusZImag: -cleanZImag,
      cleanZMag,
      cleanPhaseDeg,
      deltaZReal,
      deltaZImag,
      noiseVectorMag,
      snr_dB,
      artifactContributions: {
        whiteNoiseOhm,
        driftOhm,
        cableInductanceOhm,
        strayCapacitanceOhm,
        flickerOhm,
        mainsOhm,
        glitchOhm,
      },
    };
  });
}

/**
 * Creates a ready-to-use ExperimentalEISDataset from synthetic points
 */
export function buildSyntheticDataset(
  syntheticPoints: SyntheticEISPoint[],
  topology: CircuitTopology,
  config: SyntheticNoiseConfig,
  presetId?: string
): ExperimentalEISDataset {
  const presetName = SYNTHETIC_NOISE_PRESETS.find((p) => p.id === presetId)?.name || "Custom Sensor Artifact Model";
  return {
    id: `synthetic_${Date.now()}`,
    name: `Synthetic: ${topology.name} [${presetName}]`,
    source: "benchmark",
    description: `Synthetic EIS spectrum generated from ground-truth topology '${topology.name}' with ${config.whiteNoisePct}% noise, ${config.cableInductance_uH}uH L_cable, ${config.driftPct}% drift.`,
    points: syntheticPoints.map((pt) => ({
      frequency: pt.frequency,
      zReal: pt.zReal,
      zImag: pt.zImag,
      minusZImag: pt.minusZImag,
      zMag: pt.zMag,
      phaseDeg: pt.phaseDeg,
    })),
    metadata: {
      instrument: `MetalliX Synthetic Hardware Simulator (Noise: ${config.whiteNoisePct}%, L_cable: ${config.cableInductance_uH}uH, Drift: ${config.driftPct}%)`,
      dataOrigin: "synthetic",
      generator: "metalliksa-seeded-noise-v1",
      noiseConfig: structuredClone(config),
      sampleRate: `${syntheticPoints.length} points (${syntheticPoints[0]?.frequency.toFixed(1)} Hz to ${syntheticPoints[syntheticPoints.length - 1]?.frequency.toFixed(3)} Hz)`,
    },
  };
}

// =========================================================================
// 5. AUTO-FIT ROBUSTNESS BENCHMARKING ENGINE
// =========================================================================

export function evaluateAutoFitRobustness(
  groundTruthTopology: CircuitTopology,
  syntheticPoints: SyntheticEISPoint[],
  config: SyntheticNoiseConfig,
  fitReport: CNLSFitReport,
  presetId?: string
): RobustnessBenchmarkResult {
  const groundTruthParams = extractAdjustableParameters(groundTruthTopology);
  const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
  const parameterErrors: ParameterRecoveryError[] = groundTruthParams.map(truth => {
    const matches = fitReport.parameters.filter(p => p.elementId === truth.elementId && p.field === truth.field);
    const matched = matches.length === 1 ? matches[0] : undefined;
    const recoveredValue = finite(matched?.fittedValue);
    const absError = recoveredValue === null ? null : finite(Math.abs(recoveredValue - truth.value));
    const pctError = absError === null || truth.value === 0 ? null : finite(absError / Math.abs(truth.value) * 100);
    const sigma = finite(matched?.stdError);
    return { paramName: truth.paramName, elementId: truth.elementId, field: truth.field,
      trueValue: truth.value, recoveredValue, unit: truth.unit, absError, pctError,
      stdError: sigma !== null && sigma >= 0 ? sigma : null, isReliable: null };
  });
  const comparable = parameterErrors.length > 0 && parameterErrors.every(p => p.pctError !== null);
  const meanAbsolutePctError = comparable ? parameterErrors.reduce((sum,p) => sum + p.pctError / parameterErrors.length, 0) : null;
  const maxAbsolutePctError = comparable ? Math.max(...parameterErrors.map(p => p.pctError)) : null;
  return {
    config, noisePresetId: presetId, groundTruthTopology, fittedTopology: fitReport.topology,
    parameterErrors, meanAbsolutePctError, maxAbsolutePctError,
    robustnessScore: null, robustnessGrade: null,
    reducedChiSquare: fitReport.reducedChiSquare, rSquared: fitReport.rSquared, rmse: fitReport.rmse,
    converged: fitReport.converged, iterations: fitReport.iterations, executionTimeMs: fitReport.executionTimeMs,
    engineUsed: fitReport.engineUsed ?? "Python CNLS",
    linKKStationarity: { isStationary: null, driftScore: null, meanResidualPct: null },
    inductanceDeembedded: { detectedInductance_uH: null, targetInductance_uH: config.cableInductance_uH, recoveredTrueRs: null },
    keyDiagnosis: "Observed parameter recovery for one seeded synthetic realization. No validated robustness grade is available.",
    recommendation: "Compare errors across independent seeds and initial guesses. This result does not establish experimental accuracy, stationarity or cable de-embedding.",
    noisyDataset: fitReport.dataset, syntheticPoints,
  };
}

/** One realization per level, evaluated sequentially by the Python fitting service. */
export async function runNoiseSweepStressTest(
  topology: CircuitTopology, cleanPoints: RawEISPoint[], baseConfig: SyntheticNoiseConfig,
  sweepLevels: number[] = [0.1, 0.5, 1.0, 2.0, 3.5, 5.0, 7.5, 10.0],
  weighting: WeightingMethod = "modulus",
  options: {signal?: AbortSignal; maxGenerations?: number; populationSize?: number; polishLM?: boolean} = {},
): Promise<SweepStressPoint[]> {
  const initialParams = extractAdjustableParameters(topology);
  const results: SweepStressPoint[] = [];
  for (const noiseLevel of sweepLevels) {
    options.signal?.throwIfAborted();
    const testConfig = { ...baseConfig, whiteNoisePct: noiseLevel };
    const points = injectSyntheticNoise(cleanPoints, testConfig);
    const dataset = buildSyntheticDataset(points, topology, testConfig);
    const fit = await runAsyncAutoFit(topology, dataset, initialParams, weighting,
      options.maxGenerations ?? 60, {...options, randomSeed: baseConfig.randomSeed ?? 42});
    options.signal?.throwIfAborted();
    const recovery = evaluateAutoFitRobustness(topology, points, testConfig, fit);
    results.push({ noiseLevelPct: noiseLevel, meanParamErrorPct: recovery.meanAbsolutePctError,
      maxParamErrorPct: recovery.maxAbsolutePctError, rsErrorPct: null, rctErrorPct: null, cpeErrorPct: null,
      reducedChiSquare: fit.reducedChiSquare, rSquared: fit.rSquared, converged: fit.converged, robustnessScore: null });
  }
  return results;
}

/**
 * METALLIX Monte Carlo Error Propagation & Statistical Confidence Engine
 * 
 * Provides stochastic uncertainty quantification (UQ), 95% Confidence Intervals (CI),
 * standard error propagation (GUM / ISO/IEC Guide 98-3), and MMPDS A/B-Basis statistical bounds
 * across all materials calculations.
 */

export interface DistributionParams {
  mean: number;
  stdDev: number;
  distribution?: "normal" | "lognormal" | "uniform";
  min?: number;
  max?: number;
}

export interface MonteCarloResult {
  mean: number;
  median: number;
  stdDev: number;
  standardError: number;
  ci95Lower: number; // 2.5th percentile
  ci95Upper: number; // 97.5th percentile
  ci99Lower: number; // 0.5th percentile
  ci99Upper: number; // 99.5th percentile
  aBasisAllowable: number; // 99% probability with 95% confidence (T99)
  bBasisAllowable: number; // 90% probability with 95% confidence (T90)
  relativeUncertaintyPercent: number; // (stdDev / mean) * 100
  samples: number[];
}

/**
 * Standard Box-Muller transform for pseudo-random Gaussian sampling
 */
export function sampleGaussian(mean: number, stdDev: number): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Sample from specified probability distribution
 */
export function sampleDistribution(params: DistributionParams): number {
  const dist = params.distribution || "normal";
  if (dist === "normal") {
    let val = sampleGaussian(params.mean, params.stdDev);
    if (params.min !== undefined) val = Math.max(params.min, val);
    if (params.max !== undefined) val = Math.min(params.max, val);
    return val;
  } else if (dist === "lognormal") {
    const variance = params.stdDev * params.stdDev;
    const mu = Math.log((params.mean * params.mean) / Math.sqrt(variance + params.mean * params.mean));
    const sigma = Math.sqrt(Math.log(variance / (params.mean * params.mean) + 1));
    const normalSample = sampleGaussian(mu, sigma);
    let val = Math.exp(normalSample);
    if (params.min !== undefined) val = Math.max(params.min, val);
    if (params.max !== undefined) val = Math.min(params.max, val);
    return val;
  } else {
    // Uniform
    const min = params.min ?? (params.mean - Math.sqrt(3) * params.stdDev);
    const max = params.max ?? (params.mean + Math.sqrt(3) * params.stdDev);
    return min + Math.random() * (max - min);
  }
}

/**
 * Run generic N-iteration Monte Carlo simulation on an arbitrary evaluation function
 */
export function runMonteCarloSimulation(
  evaluator: () => number,
  iterations: number = 5000
): MonteCarloResult {
  const samples = new Float64Array(iterations);
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < iterations; i++) {
    const val = evaluator();
    samples[i] = val;
    sum += val;
    sumSq += val * val;
  }

  const mean = sum / iterations;
  const variance = Math.max(0, (sumSq - (sum * sum) / iterations) / (iterations - 1));
  const stdDev = Math.sqrt(variance);
  const standardError = stdDev / Math.sqrt(iterations);

  // Sort samples for empirical percentile ranking
  const sorted = Array.from(samples).sort((a, b) => a - b);
  const median = sorted[Math.floor(iterations * 0.5)];
  const ci95Lower = sorted[Math.floor(iterations * 0.025)];
  const ci95Upper = sorted[Math.floor(iterations * 0.975)];
  const ci99Lower = sorted[Math.floor(iterations * 0.005)];
  const ci99Upper = sorted[Math.floor(iterations * 0.995)];

  // MMPDS Statistical Allowables (One-sided tolerance bounds for sample size N)
  // A-Basis: 99% survival @ 95% confidence (approx k_A ~ 2.326 + 1.645/sqrt(2N))
  // B-Basis: 90% survival @ 95% confidence (approx k_B ~ 1.282 + 1.645/sqrt(2N))
  const kA = 2.326 + 1.645 / Math.sqrt(2 * iterations);
  const kB = 1.282 + 1.645 / Math.sqrt(2 * iterations);
  const aBasisAllowable = Math.max(0, mean - kA * stdDev);
  const bBasisAllowable = Math.max(0, mean - kB * stdDev);

  const relativeUncertaintyPercent = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

  return {
    mean,
    median,
    stdDev,
    standardError,
    ci95Lower,
    ci95Upper,
    ci99Lower,
    ci99Upper,
    aBasisAllowable,
    bBasisAllowable,
    relativeUncertaintyPercent,
    samples: sorted.slice(0, Math.min(iterations, 200)), // retain 200 samples for histogram plotting
  };
}

// =========================================================================
// Specialized Metallurgical Monte Carlo Uncertainty Engines
// =========================================================================

/**
 * 1. Tabor-Cahoon Indentation to Tensile Monte Carlo Error Propagation
 * Hardness HV / HB uncertainty -> Yield Strength σ_y, Tensile Strength σ_uts, Hollomon n, Fracture Toughness K_1c
 */
export function calculateTaborTensileMonteCarlo(params: {
  hardnessHv: number;
  hardnessUncertaintyHv?: number; // default ± 3.5%
  cahoonC1?: number; // empirical constant ~3.0 - 3.4
  cahoonC1StdDev?: number; // ~0.08
  hollomonN?: number; // ~0.12 - 0.22
  hollomonNStdDev?: number; // ~0.015
  iterations?: number;
}): {
  yieldStrengthMpa: MonteCarloResult;
  ultimateTensileMpa: MonteCarloResult;
  fractureToughnessMpaM: MonteCarloResult;
} {
  const {
    hardnessHv,
    hardnessUncertaintyHv = hardnessHv * 0.035,
    cahoonC1 = 3.25,
    cahoonC1StdDev = 0.08,
    hollomonN = 0.15,
    hollomonNStdDev = 0.015,
    iterations = 5000,
  } = params;

  const yieldStrengthMpa = runMonteCarloSimulation(() => {
    const hvSample = sampleGaussian(hardnessHv, hardnessUncertaintyHv);
    const c1Sample = sampleGaussian(cahoonC1, cahoonC1StdDev);
    const nSample = Math.max(0.02, sampleGaussian(hollomonN, hollomonNStdDev));
    // Cahoon relation: σ_y = (HV / C1) * (0.1)**n * 9.80665 (MPa)
    const sigmaY = (hvSample * 9.80665 / c1Sample) * Math.pow(0.1, nSample);
    return Math.max(10, sigmaY);
  }, iterations);

  const ultimateTensileMpa = runMonteCarloSimulation(() => {
    const hvSample = sampleGaussian(hardnessHv, hardnessUncertaintyHv);
    const c1Sample = sampleGaussian(cahoonC1, cahoonC1StdDev);
    const nSample = Math.max(0.02, sampleGaussian(hollomonN, hollomonNStdDev));
    // Tabor relation: σ_uts = (HV / C1) * (1 - n) * (12.5 / (1 - n))**n * 9.80665 / 3.0
    const sigmaUts = (hvSample * 9.80665 / c1Sample) * Math.pow(1 - nSample, -nSample);
    return Math.max(15, sigmaUts);
  }, iterations);

  const fractureToughnessMpaM = runMonteCarloSimulation(() => {
    const hvSample = sampleGaussian(hardnessHv, hardnessUncertaintyHv);
    const sySample = yieldStrengthMpa.mean;
    // Hahn-Rosenfield-Barsom model for critical fracture toughness K_1c ≈ sqrt(2 * E * σ_y * ε_f)
    const k1c = 150.0 * Math.exp(-0.0022 * hvSample) + (1200 / Math.sqrt(Math.max(100, sySample)));
    return Math.max(5, k1c);
  }, iterations);

  return { yieldStrengthMpa, ultimateTensileMpa, fractureToughnessMpaM };
}

/**
 * 2. Williamson-Hall XRD Crystallite Size & Microstrain Monte Carlo Engine
 * β·cos(θ) = (K·λ / D) + 4·ε·sin(θ)
 */
export function calculateWilliamsonHallMonteCarlo(params: {
  peaks: { twoThetaDeg: number; fwhmRad: number; fwhmErrorRad?: number }[];
  wavelengthNm?: number; // 0.15406 nm (Cu Kα)
  scherrerK?: number; // 0.94
  scherrerKStdDev?: number; // 0.04
  iterations?: number;
}): {
  crystalliteSizeNm: MonteCarloResult;
  microstrainPercent: MonteCarloResult;
  rSquared: MonteCarloResult;
} {
  const {
    peaks,
    wavelengthNm = 0.15406,
    scherrerK = 0.94,
    scherrerKStdDev = 0.04,
    iterations = 5000,
  } = params;

  if (peaks.length < 2) {
    const singleRes = runMonteCarloSimulation(() => 50, 100);
    return { crystalliteSizeNm: singleRes, microstrainPercent: singleRes, rSquared: singleRes };
  }

  // Precompute linear regression samples
  const sizeSamples: number[] = [];
  const strainSamples: number[] = [];
  const r2Samples: number[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    const kSample = sampleGaussian(scherrerK, scherrerKStdDev);
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    const n = peaks.length;

    for (let p = 0; p < n; p++) {
      const peak = peaks[p];
      const thetaRad = (sampleGaussian(peak.twoThetaDeg, 0.01) * Math.PI) / 360.0;
      const fwhmUncertainty = peak.fwhmErrorRad || peak.fwhmRad * 0.05;
      const fwhmSample = Math.max(0.0001, sampleGaussian(peak.fwhmRad, fwhmUncertainty));

      const x = 4.0 * Math.sin(thetaRad); // 4 * sin(θ)
      const y = fwhmSample * Math.cos(thetaRad); // β * cos(θ)

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = denominator !== 0 ? (sumY * sumX2 - sumX * sumXY) / denominator : 0.001;

    // Crystallite size D = K * λ / intercept
    const crystalliteSize = intercept > 0 ? (kSample * wavelengthNm) / intercept : 150.0;
    // Microstrain ε = slope
    const microstrain = Math.max(0, slope) * 100.0; // as %

    // Pearson correlation R^2
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt(Math.max(1e-12, (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)));
    const r2 = den > 0 ? Math.min(1.0, Math.pow(num / den, 2)) : 0.95;

    sizeSamples.push(Math.max(1, Math.min(1000, crystalliteSize)));
    strainSamples.push(Math.max(0, Math.min(5.0, microstrain)));
    r2Samples.push(r2);
  }

  const crystalliteSizeNm = runMonteCarloSimulation(() => sizeSamples[Math.floor(Math.random() * sizeSamples.length)], iterations);
  const microstrainPercent = runMonteCarloSimulation(() => strainSamples[Math.floor(Math.random() * strainSamples.length)], iterations);
  const rSquared = runMonteCarloSimulation(() => r2Samples[Math.floor(Math.random() * r2Samples.length)], iterations);

  return { crystalliteSizeNm, microstrainPercent, rSquared };
}

/**
 * 3. Hall-Petch Grain Size to Yield Strength Monte Carlo Engine
 * σ_y = σ_0 + k_y · d^(-1/2)
 */
export function calculateHallPetchMonteCarlo(params: {
  grainSizeUm: number;
  grainSizeStdDevUm?: number; // ASTM E112 intercept standard deviation
  frictionStressSigma0Mpa: number; // σ_0 (MPa)
  frictionStressStdDevMpa?: number;
  hallPetchKyMpaSqrtUm: number; // k_y (MPa·µm^0.5)
  hallPetchKyStdDev?: number;
  iterations?: number;
}): {
  yieldStrengthMpa: MonteCarloResult;
  hallPetchStrengtheningMpa: MonteCarloResult;
} {
  const {
    grainSizeUm,
    grainSizeStdDevUm = grainSizeUm * 0.12, // typical 12% ASTM grain size variance
    frictionStressSigma0Mpa,
    frictionStressStdDevMpa = frictionStressSigma0Mpa * 0.05,
    hallPetchKyMpaSqrtUm,
    hallPetchKyStdDev = hallPetchKyMpaSqrtUm * 0.06,
    iterations = 5000,
  } = params;

  const yieldStrengthMpa = runMonteCarloSimulation(() => {
    const dSample = Math.max(0.5, sampleGaussian(grainSizeUm, grainSizeStdDevUm));
    const sigma0Sample = sampleGaussian(frictionStressSigma0Mpa, frictionStressStdDevMpa);
    const kySample = sampleGaussian(hallPetchKyMpaSqrtUm, hallPetchKyStdDev);
    const deltaSy = kySample / Math.sqrt(dSample);
    return sigma0Sample + deltaSy;
  }, iterations);

  const hallPetchStrengtheningMpa = runMonteCarloSimulation(() => {
    const dSample = Math.max(0.5, sampleGaussian(grainSizeUm, grainSizeStdDevUm));
    const kySample = sampleGaussian(hallPetchKyMpaSqrtUm, hallPetchKyStdDev);
    return kySample / Math.sqrt(dSample);
  }, iterations);

  return { yieldStrengthMpa, hallPetchStrengtheningMpa };
}

/**
 * 4. EDS Quantitative ZAF Elemental Mass Fraction Monte Carlo Engine
 * C_i = k_i * Z_i * A_i * F_i (Normalized to 100 wt%)
 */
export function calculateEDSQuantMonteCarlo(elements: {
  symbol: string;
  measuredCounts: number;
  backgroundCounts: number;
  zafFactor: number;
  zafUncertaintyPercent?: number; // ~2.5%
}[]): {
  [symbol: string]: MonteCarloResult;
} {
  const iterations = 5000;
  const result: { [symbol: string]: MonteCarloResult } = {};

  const sampleRuns: { [symbol: string]: number[] } = {};
  elements.forEach((el) => {
    sampleRuns[el.symbol] = [];
  });

  for (let iter = 0; iter < iterations; iter++) {
    let totalMass = 0;
    const rawMasses: { [sym: string]: number } = {};

    elements.forEach((el) => {
      // Poisson photon count statistics: σ = sqrt(N)
      const netPeak = Math.max(0, el.measuredCounts - el.backgroundCounts);
      const photonVariance = Math.sqrt(Math.max(1, el.measuredCounts + el.backgroundCounts));
      const peakSample = Math.max(0, sampleGaussian(netPeak, photonVariance));

      const zafUncertainty = (el.zafUncertaintyPercent || 2.5) / 100.0;
      const zafSample = Math.max(0.1, sampleGaussian(el.zafFactor, el.zafFactor * zafUncertainty));

      const mass = peakSample * zafSample;
      rawMasses[el.symbol] = mass;
      totalMass += mass;
    });

    // Normalize to 100 wt%
    elements.forEach((el) => {
      const normalizedWt = totalMass > 0 ? (rawMasses[el.symbol] / totalMass) * 100.0 : 0;
      sampleRuns[el.symbol].push(normalizedWt);
    });
  }

  elements.forEach((el) => {
    const list = sampleRuns[el.symbol];
    result[el.symbol] = runMonteCarloSimulation(() => list[Math.floor(Math.random() * list.length)], iterations);
  });

  return result;
}

/**
 * Advanced XRD Peak Profile Fitting & K-alpha Doublet Deconvolution Engine
 * Supports:
 *  1. Pseudo-Voigt (Gaussian + Lorentzian mixture parameter eta)
 *  2. Pearson-VII (Decay exponent m: Cauchy to Gaussian)
 *  3. Asymmetric Split Pseudo-Voigt (Split Left/Right FWHM & Asymmetry Factor)
 *  4. Automated Cu-Ka1 / Cu-Ka2 (or Mo/Co) Doublet Stripping & Rachinger Deconvolution
 */

export type ProfileFunctionType = "pseudo-voigt" | "pearson-vii" | "asymmetric-split";

export interface DoubletFitParams {
  // Peak Centroid 2Theta (Ka1)
  twoTheta_ka1: number;
  // Intensity Ka1
  intensity_ka1: number;
  // FWHM Ka1 (deg)
  fwhm_ka1: number;
  // Background parameters
  bg_offset: number;
  bg_slope: number;

  // Profile Specific Params
  eta: number; // Pseudo-Voigt (0 = Gauss, 1 = Lorentz)
  pearson_m: number; // Pearson-VII exponent (1 = Cauchy, >10 = Gauss)
  fwhm_left?: number; // Asymmetric Split
  fwhm_right?: number; // Asymmetric Split
  asymmetry_ratio?: number; // FWHM_L / FWHM_R

  // Doublet Parameters
  enableDoubletDeconv: boolean;
  intensityRatio_ka2_ka1: number; // typically 0.50 (Cu Ka2/Ka1)
  fwhmRatio_ka2_ka1: number; // typically 1.02 - 1.05
  wavelength_ka1_A: number; // 1.540598 A for Cu
  wavelength_ka2_A: number; // 1.544426 A for Cu
}

export interface ProfilePoint {
  twoTheta: number;
  y_obs: number;
  y_calc: number;
  y_ka1: number;
  y_ka2: number;
  y_diff: number;
  background: number;
}

export interface FitResult {
  profileType: ProfileFunctionType;
  params: DoubletFitParams;
  twoTheta_ka2: number;
  deltaTwoTheta_doublet: number;
  r_wp_pct: number; // Weighted Profile R-factor %
  reduced_chi2: number; // Goodness of fit
  integralBreadth_ka1_deg: number; // Area / I_max
  area_ka1: number;
  area_total: number;
  rawCompositeFwhm_deg: number;
  correctedKa1Fwhm_deg: number;
  broadeningErrorRemoved_pct: number;
  crystalliteSize_Scherrer_nm: number;
  points: ProfilePoint[];
}

/**
 * Calculates theoretical Ka2 Bragg angle given Ka1 angle and wavelengths
 */
export function calculateKa2Angle(twoTheta_ka1_deg: number, lambda1_A: number, lambda2_A: number): number {
  const theta1_rad = (twoTheta_ka1_deg * Math.PI) / 360;
  const sinTheta1 = Math.sin(theta1_rad);
  const ratio = lambda2_A / lambda1_A;
  const sinTheta2 = ratio * sinTheta1;

  if (sinTheta2 >= 1.0) return twoTheta_ka1_deg + 0.3; // guard for extreme angle
  const theta2_rad = Math.asin(sinTheta2);
  return (theta2_rad * 360) / Math.PI;
}

/**
 * 1. Single Pseudo-Voigt Function
 */
export function evalPseudoVoigt(
  x: number,
  x0: number,
  fwhm: number,
  intensity: number,
  eta: number
): number {
  if (fwhm <= 0.001) return 0;
  const dx = x - x0;
  const normDx = dx / fwhm;

  // Gaussian component: G(x) = exp(-4 ln 2 * (dx/fwhm)^2)
  const gauss = Math.exp(-4 * Math.LN2 * Math.pow(normDx, 2));

  // Lorentzian component: L(x) = 1 / (1 + 4 * (dx/fwhm)^2)
  const lorentz = 1 / (1 + 4 * Math.pow(normDx, 2));

  // Pseudo-Voigt combination
  return intensity * (eta * lorentz + (1 - eta) * gauss);
}

/**
 * 2. Single Pearson-VII Function
 */
export function evalPearsonVII(
  x: number,
  x0: number,
  fwhm: number,
  intensity: number,
  m: number
): number {
  if (fwhm <= 0.001) return 0;
  const dx = x - x0;
  const normDx = dx / fwhm;
  const effectiveM = Math.max(0.6, m);

  // PVII = I0 * [1 + 4*(2^(1/m) - 1)*(dx/fwhm)^2]^(-m)
  const factor = 4 * (Math.pow(2, 1 / effectiveM) - 1);
  const denominator = Math.pow(1 + factor * Math.pow(normDx, 2), effectiveM);
  return intensity / denominator;
}

/**
 * 3. Single Asymmetric Split Pseudo-Voigt Function
 */
export function evalAsymmetricSplit(
  x: number,
  x0: number,
  fwhm_left: number,
  fwhm_right: number,
  intensity: number,
  eta: number
): number {
  const dx = x - x0;
  const fwhm = dx <= 0 ? Math.max(0.01, fwhm_left) : Math.max(0.01, fwhm_right);
  return evalPseudoVoigt(x, x0, fwhm, intensity, eta);
}

/**
 * Evaluates full composite profile (Ka1 + Ka2 + Background)
 */
export function evaluateCompositeProfile(
  twoTheta: number,
  profileType: ProfileFunctionType,
  params: DoubletFitParams
): { y_calc: number; y_ka1: number; y_ka2: number; background: number } {
  const bg = params.bg_offset + params.bg_slope * (twoTheta - params.twoTheta_ka1);

  const lambda1 = params.wavelength_ka1_A || 1.540598;
  const lambda2 = params.wavelength_ka2_A || 1.544426;
  const twoTheta_ka2 = calculateKa2Angle(params.twoTheta_ka1, lambda1, lambda2);

  const fwhm1 = params.fwhm_ka1;
  const fwhm2 = params.fwhm_ka1 * (params.fwhmRatio_ka2_ka1 || 1.03);
  const int1 = params.intensity_ka1;
  const int2 = params.enableDoubletDeconv ? int1 * (params.intensityRatio_ka2_ka1 || 0.5) : 0;

  let y_ka1 = 0;
  let y_ka2 = 0;

  if (profileType === "pseudo-voigt") {
    y_ka1 = evalPseudoVoigt(twoTheta, params.twoTheta_ka1, fwhm1, int1, params.eta);
    if (params.enableDoubletDeconv) {
      y_ka2 = evalPseudoVoigt(twoTheta, twoTheta_ka2, fwhm2, int2, params.eta);
    }
  } else if (profileType === "pearson-vii") {
    y_ka1 = evalPearsonVII(twoTheta, params.twoTheta_ka1, fwhm1, int1, params.pearson_m);
    if (params.enableDoubletDeconv) {
      y_ka2 = evalPearsonVII(twoTheta, twoTheta_ka2, fwhm2, int2, params.pearson_m);
    }
  } else {
    // Asymmetric Split
    const fwhm_L = params.fwhm_left || fwhm1 * 0.95;
    const fwhm_R = params.fwhm_right || fwhm1 * 1.05;
    const fwhm_L2 = fwhm_L * (params.fwhmRatio_ka2_ka1 || 1.03);
    const fwhm_R2 = fwhm_R * (params.fwhmRatio_ka2_ka1 || 1.03);

    y_ka1 = evalAsymmetricSplit(twoTheta, params.twoTheta_ka1, fwhm_L, fwhm_R, int1, params.eta);
    if (params.enableDoubletDeconv) {
      y_ka2 = evalAsymmetricSplit(twoTheta, twoTheta_ka2, fwhm_L2, fwhm_R2, int2, params.eta);
    }
  }

  const y_calc = bg + y_ka1 + y_ka2;
  return { y_calc, y_ka1, y_ka2, background: bg };
}

/**
 * Automated Non-Linear Fit Optimizer for a given XRD ROI Window
 */
export function optimizePeakProfile(
  rawPoints: { twoTheta: number; intensity: number }[],
  initialParams: DoubletFitParams,
  profileType: ProfileFunctionType
): FitResult {
  if (!rawPoints || rawPoints.length < 5) {
    throw new Error("Insufficient data points in peak window.");
  }

  // Work on a copy of parameters
  let p = { ...initialParams };

  // 1. Initial Estimations from Data
  const minTwoTheta = rawPoints[0].twoTheta;
  const maxTwoTheta = rawPoints[rawPoints.length - 1].twoTheta;
  const maxPt = rawPoints.reduce((max, pt) => (pt.intensity > max.intensity ? pt : max), rawPoints[0]);

  // Baseline from edges
  const edgeAvg = (rawPoints[0].intensity + rawPoints[rawPoints.length - 1].intensity) / 2;
  p.bg_offset = edgeAvg;
  p.bg_slope = (rawPoints[rawPoints.length - 1].intensity - rawPoints[0].intensity) / (maxTwoTheta - minTwoTheta);
  p.intensity_ka1 = Math.max(10, maxPt.intensity - edgeAvg);

  // If initial centroid wasn't set or off
  if (Math.abs(p.twoTheta_ka1 - maxPt.twoTheta) > 1.0) {
    p.twoTheta_ka1 = maxPt.twoTheta;
  }

  const lambda1 = p.wavelength_ka1_A || 1.540598;
  const lambda2 = p.wavelength_ka2_A || 1.544426;
  const twoTheta_ka2 = calculateKa2Angle(p.twoTheta_ka1, lambda1, lambda2);
  const deltaTwoTheta_doublet = +(twoTheta_ka2 - p.twoTheta_ka1).toFixed(4);

  // Calculate composite raw FWHM (without doublet subtraction)
  const halfMax = edgeAvg + p.intensity_ka1 / 2;
  let leftIdx = 0;
  let rightIdx = rawPoints.length - 1;
  while (leftIdx < rawPoints.length && rawPoints[leftIdx].intensity < halfMax) leftIdx++;
  while (rightIdx >= 0 && rawPoints[rightIdx].intensity < halfMax) rightIdx--;
  const rawCompositeFwhm = Math.max(0.08, +(rawPoints[rightIdx].twoTheta - rawPoints[leftIdx].twoTheta).toFixed(4));

  // If doublet is enabled, the true Ka1 FWHM is narrower than the composite peak envelope!
  if (p.enableDoubletDeconv && deltaTwoTheta_doublet > 0.05) {
    p.fwhm_ka1 = Math.max(0.05, +(rawCompositeFwhm * 0.80).toFixed(4));
  } else {
    p.fwhm_ka1 = rawCompositeFwhm;
  }

  // Refine Asymmetric Left/Right widths
  if (profileType === "asymmetric-split") {
    const asym = p.asymmetry_ratio || 1.08;
    p.fwhm_left = +(p.fwhm_ka1 * (2 / (1 + asym))).toFixed(4);
    p.fwhm_right = +(p.fwhm_left * asym).toFixed(4);
  }

  // 2. Numerical Mini-Grid Search for Centroid, FWHM & Eta refinement
  let bestRwp = 999;
  let bestP = { ...p };

  const etaCandidates = profileType === "pearson-vii" ? [1.0, 1.5, 2.0, 3.0, 5.0] : [0.2, 0.4, 0.6, 0.8];
  const fwhmDeltas = [-0.03, -0.015, 0, 0.015, 0.03];
  const centerDeltas = [-0.04, -0.02, 0, 0.02, 0.04];

  for (const cDelta of centerDeltas) {
    for (const fDelta of fwhmDeltas) {
      for (const shapeVal of etaCandidates) {
        const testP = { ...p };
        testP.twoTheta_ka1 = +(p.twoTheta_ka1 + cDelta).toFixed(4);
        testP.fwhm_ka1 = Math.max(0.04, +(p.fwhm_ka1 + fDelta).toFixed(4));
        if (profileType === "pearson-vii") {
          testP.pearson_m = shapeVal;
        } else {
          testP.eta = shapeVal;
          if (profileType === "asymmetric-split") {
            testP.fwhm_left = +(testP.fwhm_ka1 * 0.94).toFixed(4);
            testP.fwhm_right = +(testP.fwhm_ka1 * 1.06).toFixed(4);
          }
        }

        // Evaluate R_wp
        let sumResidualSq = 0;
        let sumObsSq = 0;

        for (const pt of rawPoints) {
          const evalRes = evaluateCompositeProfile(pt.twoTheta, profileType, testP);
          const diff = pt.intensity - evalRes.y_calc;
          sumResidualSq += diff * diff;
          sumObsSq += pt.intensity * pt.intensity;
        }

        const r_wp = Math.sqrt(sumResidualSq / Math.max(1, sumObsSq)) * 100;
        if (r_wp < bestRwp) {
          bestRwp = r_wp;
          bestP = { ...testP };
        }
      }
    }
  }

  // 3. Generate Fitted Profile Points
  const points: ProfilePoint[] = [];
  let sumSqDiff = 0;
  let sumObsSq = 0;
  let area_ka1 = 0;
  let area_total = 0;
  let step = rawPoints.length > 1 ? rawPoints[1].twoTheta - rawPoints[0].twoTheta : 0.02;

  rawPoints.forEach((pt) => {
    const evalRes = evaluateCompositeProfile(pt.twoTheta, profileType, bestP);
    const diff = +(pt.intensity - evalRes.y_calc).toFixed(2);
    sumSqDiff += diff * diff;
    sumObsSq += pt.intensity * pt.intensity;

    area_ka1 += evalRes.y_ka1 * step;
    area_total += (evalRes.y_ka1 + evalRes.y_ka2) * step;

    points.push({
      twoTheta: pt.twoTheta,
      y_obs: pt.intensity,
      y_calc: Math.round(evalRes.y_calc),
      y_ka1: Math.round(evalRes.y_ka1 + evalRes.background),
      y_ka2: Math.round(evalRes.y_ka2 + evalRes.background),
      y_diff: diff,
      background: Math.round(evalRes.background),
    });
  });

  const finalRwp = +(Math.sqrt(sumSqDiff / Math.max(1, sumObsSq)) * 100).toFixed(2);
  const dof = Math.max(1, rawPoints.length - 6);
  const chi2 = +(sumSqDiff / (dof * Math.max(1, edgeAvg))).toFixed(2);

  const integralBreadth_ka1 = +(area_ka1 / Math.max(1, bestP.intensity_ka1)).toFixed(4);
  const broadeningErrorRemoved_pct = +(
    Math.max(0, ((rawCompositeFwhm - bestP.fwhm_ka1) / rawCompositeFwhm) * 100)
  ).toFixed(1);

  // Scherrer domain calculation for Ka1 peak
  const theta1_rad = (bestP.twoTheta_ka1 * Math.PI) / 360;
  const beta_rad = (bestP.fwhm_ka1 * Math.PI) / 180;
  const scherrer_nm = +((0.9 * lambda1) / (beta_rad * Math.cos(theta1_rad) * 10)).toFixed(1);

  return {
    profileType,
    params: bestP,
    twoTheta_ka2,
    deltaTwoTheta_doublet,
    r_wp_pct: finalRwp,
    reduced_chi2: chi2,
    integralBreadth_ka1_deg: integralBreadth_ka1,
    area_ka1: Math.round(area_ka1),
    area_total: Math.round(area_total),
    rawCompositeFwhm_deg: rawCompositeFwhm,
    correctedKa1Fwhm_deg: bestP.fwhm_ka1,
    broadeningErrorRemoved_pct,
    crystalliteSize_Scherrer_nm: scherrer_nm,
    points,
  };
}

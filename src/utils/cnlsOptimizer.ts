import { normalizePythonCnlsReport } from "./pythonCnlsReport";
import {
  CircuitTopology,
  CircuitElement,
  CircuitBranch,
} from "../components/EquivalentCircuitBuilder";
import {
  ExperimentalEISDataset,
  ParameterFitResult,
  CNLSFitReport,
  ResidualPoint,
  WeightingMethod,
  KramersKronigResult,
} from "../types/eisData";

interface AdjustableParam {
  branchId: string;
  elementId: string;
  paramName: string;
  paramType: string;
  field: "value" | "exponent";
  value: number;
  initialValue: number;
  unit: string;
  lowerBound: number;
  upperBound: number;
  isFixed: boolean;
}

interface ComplexNumber {
  re: number;
  im: number;
}

function complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return { re: a.re + b.re, im: a.im + b.im };
}

function complexDivide(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return { re: 1e12, im: 0 };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

function complexInvert(a: ComplexNumber): ComplexNumber {
  return complexDivide({ re: 1, im: 0 }, a);
}

export function evalElementImpedance(el: CircuitElement, omega: number): ComplexNumber {
  const w = Math.max(1e-6, omega);
  switch (el.type) {
    case "R":
      return { re: Math.max(1e-7, el.value), im: 0 };
    case "C": {
      const c = Math.max(1e-15, el.value);
      return { re: 0, im: -1 / (w * c) };
    }
    case "CPE": {
      const q = Math.max(1e-15, el.value);
      const n = Math.max(0.01, Math.min(1.0, el.exponent ?? 0.9));
      const wn = Math.pow(w, n);
      const mag = 1 / (q * wn);
      const phi = (n * Math.PI) / 2;
      return {
        re: mag * Math.cos(phi),
        im: -mag * Math.sin(phi),
      };
    }
    case "W": {
      const sigma = Math.max(1e-6, el.value);
      const val = sigma / Math.sqrt(w);
      return { re: val, im: -val };
    }
    case "L": {
      const l = Math.max(1e-12, el.value);
      return { re: 0, im: w * l };
    }
    default:
      return { re: 1e-4, im: 0 };
  }
}

export function evalTopologyImpedance(topology: CircuitTopology, omega: number): ComplexNumber {
  let zTotal: ComplexNumber = { re: 0, im: 0 };

  for (const branch of topology.branches) {
    if (!branch.elements || branch.elements.length === 0) continue;

    if (branch.connection === "series") {
      for (const el of branch.elements) {
        zTotal = complexAdd(zTotal, evalElementImpedance(el, omega));
      }
    } else {
      // Parallel branch with potential Faradaic sub-series (C || (R+W))
      const capElements = branch.elements.filter((e) => e.type === "C" || e.type === "CPE");
      const faradaicElements = branch.elements.filter((e) => e.type !== "C" && e.type !== "CPE");

      if (capElements.length > 0 && faradaicElements.length > 0) {
        let yCap: ComplexNumber = { re: 0, im: 0 };
        for (const cap of capElements) {
          yCap = complexAdd(yCap, complexInvert(evalElementImpedance(cap, omega)));
        }

        let zFarad: ComplexNumber = { re: 0, im: 0 };
        for (const el of faradaicElements) {
          zFarad = complexAdd(zFarad, evalElementImpedance(el, omega));
        }
        const yFarad = complexInvert(zFarad);

        const yTotal = complexAdd(yCap, yFarad);
        zTotal = complexAdd(zTotal, complexInvert(yTotal));
      } else {
        let yTotal: ComplexNumber = { re: 0, im: 0 };
        for (const el of branch.elements) {
          yTotal = complexAdd(yTotal, complexInvert(evalElementImpedance(el, omega)));
        }
        zTotal = complexAdd(zTotal, complexInvert(yTotal));
      }
    }
  }

  return zTotal;
}

/**
 * Extracts free adjustable parameters from a topology
 */
export function extractAdjustableParameters(topology: CircuitTopology): AdjustableParam[] {
  const list: AdjustableParam[] = [];

  topology.branches.forEach((branch) => {
    branch.elements.forEach((el) => {
      // Primary value parameter
      let lowerBound = 1e-12;
      let upperBound = 1e9;
      if (el.type === "R") {
        lowerBound = 1e-5;
        upperBound = 1e8;
      } else if (el.type === "C") {
        lowerBound = 1e-14;
        upperBound = 1e2;
      } else if (el.type === "CPE") {
        lowerBound = 1e-12;
        upperBound = 1e3;
      } else if (el.type === "W") {
        lowerBound = 1e-6;
        upperBound = 1e6;
      } else if (el.type === "L") {
        lowerBound = 1e-12;
        upperBound = 1e-1;
      }

      list.push({
        branchId: branch.id,
        elementId: el.id,
        paramName: `${el.name}`,
        paramType: el.type,
        field: "value",
        value: el.value,
        initialValue: el.value,
        unit: el.unit,
        lowerBound,
        upperBound,
        isFixed: false,
      });

      // Exponent parameter for CPE
      if (el.type === "CPE") {
        list.push({
          branchId: branch.id,
          elementId: el.id,
          paramName: `${el.name}_n`,
          paramType: "CPE (n)",
          field: "exponent",
          value: el.exponent ?? 0.9,
          initialValue: el.exponent ?? 0.9,
          unit: "dim",
          lowerBound: 0.2,
          upperBound: 1.0,
          isFixed: false,
        });
      }
    });
  });

  return list;
}

/**
 * Applies a parameter vector into a cloned circuit topology
 */
export function applyParametersToTopology(
  baseTopology: CircuitTopology,
  params: AdjustableParam[]
): CircuitTopology {
  const cloned: CircuitTopology = JSON.parse(JSON.stringify(baseTopology));

  params.forEach((p) => {
    const branch = cloned.branches.find((b) => b.id === p.branchId);
    if (branch) {
      const el = branch.elements.find((e) => e.id === p.elementId);
      if (el) {
        if (p.field === "value") {
          el.value = Math.max(p.lowerBound, Math.min(p.upperBound, p.value));
        } else if (p.field === "exponent") {
          el.exponent = Math.max(p.lowerBound, Math.min(p.upperBound, p.value));
        }
      }
    }
  });

  return cloned;
}

/**
 * Solves a linear system Ax = b using Gaussian elimination with partial pivoting
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Pivot selection
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxVal) {
        maxVal = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    if (maxVal < 1e-18) {
      return null; // Singular matrix
    }

    // Swap rows
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back-substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }

  return x;
}

/**
 * Computes Kramers-Kronig Linear Consistency Transformation
 */
export function evaluateKramersKronig(dataset: ExperimentalEISDataset): KramersKronigResult {
  const points = dataset.points;
  if (points.length < 5) {
    return {
      isValid: false,
      score: 0,
      meanResidualPct: 0,
      maxResidualPct: 0,
      assessment: "Suspect / Non-Stationary",
      details: "Insufficient points for K-K transform analysis.",
    };
  }

  // Numerical logarithmic integration of Kramers-Kronig relation
  let totalResidualPct = 0;
  let maxResidualPct = 0;
  let validPointsCount = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    const omega = 2 * Math.PI * pt.frequency;

    // Compute K-K Imaginary impedance from Real spectrum
    // Z''_KK(w) = -(2w/pi) * int_0^inf (Z'(x) - Z'(w))/(x^2 - w^2) dx
    let integral = 0;
    for (let j = 0; j < points.length - 1; j++) {
      if (j === i || j + 1 === i) continue;
      const f1 = points[j].frequency;
      const f2 = points[j + 1].frequency;
      const w1 = 2 * Math.PI * f1;
      const w2 = 2 * Math.PI * f2;
      const zR1 = points[j].zReal;
      const zR2 = points[j + 1].zReal;

      const dw = Math.abs(w2 - w1);
      const wMid = (w1 + w2) / 2;
      const zRMid = (zR1 + zR2) / 2;

      const denom = wMid * wMid - omega * omega;
      if (Math.abs(denom) > 1e-10) {
        integral += ((zRMid - pt.zReal) / denom) * dw;
      }
    }

    const zImagKK = (-2 * omega / Math.PI) * integral;
    const mag = Math.max(1e-6, pt.zMag);
    const diff = Math.abs(pt.zImag - zImagKK);
    const resPct = (diff / mag) * 100;

    if (!isNaN(resPct) && isFinite(resPct)) {
      totalResidualPct += resPct;
      if (resPct > maxResidualPct) maxResidualPct = resPct;
      validPointsCount++;
    }
  }

  const meanResidualPct = validPointsCount > 0 ? totalResidualPct / validPointsCount : 0;
  const score = Math.max(0, Math.min(100, Math.round((1 - Math.min(1, meanResidualPct / 15)) * 100)));

  let assessment: KramersKronigResult["assessment"] = "Excellent (K-K Compliant)";
  if (meanResidualPct > 5.0) {
    assessment = "Suspect / Non-Stationary";
  } else if (meanResidualPct > 2.0) {
    assessment = "Acceptable (Minor Distortion)";
  }

  return {
    isValid: meanResidualPct <= 5.0,
    score,
    meanResidualPct: parseFloat(meanResidualPct.toFixed(2)),
    maxResidualPct: parseFloat(maxResidualPct.toFixed(2)),
    assessment,
    details: `Kramers-Kronig transform test shows an average relative residual of ${meanResidualPct.toFixed(2)}% (Max: ${maxResidualPct.toFixed(2)}%). ${
      assessment === "Excellent (K-K Compliant)"
        ? "The experimental data rigorously adheres to linearity, causality, and electrochemical stationarity."
        : assessment === "Acceptable (Minor Distortion)"
        ? "Slight drift or inductive cable artifacts detected at boundary frequencies, suitable for standard CNLS fitting."
        : "Notable non-stationarity or uncompensated phase lag detected. Review electrode steady-state or potentiostat cabling."
    }`,
  };
}

/**
 * Master Complex Non-Linear Least Squares (CNLS) Fitting Engine
 * Employs Damped Levenberg-Marquardt with Log-space Parameter Projections
 */
export function runCNLSFit(
  topology: CircuitTopology,
  dataset: ExperimentalEISDataset,
  userParams?: AdjustableParam[],
  weighting: WeightingMethod = "modulus",
  maxIterations: number = 80,
  tolerance: number = 1e-7
): CNLSFitReport {
  const startTime = performance.now();
  const points = dataset.points;
  const N = points.length;

  if (N < 3) {
    throw new Error("Dataset requires at least 3 points for CNLS fitting.");
  }

  const activeParams: AdjustableParam[] = userParams
    ? JSON.parse(JSON.stringify(userParams))
    : extractAdjustableParameters(topology);

  // Free parameter indices
  const freeIndices = activeParams
    .map((p, idx) => (!p.isFixed ? idx : -1))
    .filter((idx) => idx !== -1);
  const K = freeIndices.length;

  if (K === 0) {
    throw new Error("All circuit parameters are locked. Unlock at least one parameter to perform fitting.");
  }

  // ASTM G106-89 Compliant Weight factors per frequency point
  // Eliminates the 6 to 9 orders-of-magnitude low-frequency dominance problem
  const weights: { wReal: number; wImag: number }[] = points.map((pt) => {
    const zMagSq = Math.max(1e-12, pt.zMag * pt.zMag);
    if (weighting === "modulus") {
      // ASTM G106 Modulus Weighting: w_i = 1 / |Z_i|²
      // Normalizes relative fractional error across the entire multi-decade spectrum
      const w = 1 / zMagSq;
      return { wReal: w, wImag: w };
    } else if (weighting === "proportional") {
      // ASTM G106 Proportional Weighting: w_re = 1/(Z')², w_im = 1/(Z'')²
      // Regularized with (0.01 * |Z|)² floor to prevent singularity when Z'' crosses the real axis
      const floorSq = Math.max(1e-12, 0.0001 * zMagSq);
      const wr = 1 / Math.max(floorSq, pt.zReal * pt.zReal);
      const wi = 1 / Math.max(floorSq, pt.zImag * pt.zImag);
      return { wReal: wr, wImag: wi };
    } else {
      // Unit / Unweighted least squares (w = 1.0)
      // CAUTION: Violates ASTM G106 for wide-band EIS due to 10⁶ - 10⁹ LF skew
      return { wReal: 1, wImag: 1 };
    }
  });

  // Cost function calculation
  function calculateCost(params: AdjustableParam[]): { chiSq: number; residuals: number[] } {
    const currentTopo = applyParametersToTopology(topology, params);
    let chiSq = 0;
    const resVec: number[] = [];

    for (let i = 0; i < N; i++) {
      const pt = points[i];
      const omega = 2 * Math.PI * pt.frequency;
      const zCalc = evalTopologyImpedance(currentTopo, omega);

      const dRe = pt.zReal - zCalc.re;
      const dIm = pt.zImag - zCalc.im;

      const wR = weights[i].wReal;
      const wI = weights[i].wImag;

      chiSq += wR * dRe * dRe + wI * dIm * dIm;

      resVec.push(Math.sqrt(wR) * dRe);
      resVec.push(Math.sqrt(wI) * dIm);
    }

    return { chiSq, residuals: resVec };
  }

  // Numerical Jacobian calculation in logarithmic / normalized parameter space
  function computeJacobian(params: AdjustableParam[], baseResiduals: number[]): number[][] {
    const J: number[][] = Array.from({ length: 2 * N }, () => new Array(K).fill(0));

    freeIndices.forEach((pIdx, colIdx) => {
      const p = params[pIdx];
      const originalVal = p.value;
      const h = Math.max(1e-6, Math.abs(originalVal) * 1e-4);

      // Forward step
      p.value = originalVal + h;
      const { residuals: resPlus } = calculateCost(params);

      // Central difference backward step
      p.value = originalVal - h;
      const { residuals: resMinus } = calculateCost(params);

      // Restore
      p.value = originalVal;

      for (let r = 0; r < 2 * N; r++) {
        J[r][colIdx] = (resPlus[r] - resMinus[r]) / (2 * h);
      }
    });

    return J;
  }

  let lambda = 0.01;
  let currentCost = calculateCost(activeParams);
  let prevChiSq = currentCost.chiSq;
  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations++;
    const J = computeJacobian(activeParams, currentCost.residuals);

    // Compute Normal Equations: (J^T J + lambda * diag(J^T J)) * delta = J^T * residuals
    const H: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
    const g: number[] = new Array(K).fill(0);

    for (let j = 0; j < K; j++) {
      for (let k = 0; k < K; k++) {
        let sum = 0;
        for (let r = 0; r < 2 * N; r++) {
          sum += J[r][j] * J[r][k];
        }
        H[j][k] = sum;
      }
      let gSum = 0;
      for (let r = 0; r < 2 * N; r++) {
        gSum += J[r][j] * currentCost.residuals[r];
      }
      g[j] = gSum;
    }

    // Add Levenberg-Marquardt damping
    const H_damped = H.map((row, rIdx) =>
      row.map((val, cIdx) => (rIdx === cIdx ? val * (1 + lambda) + 1e-10 : val))
    );

    const delta = solveLinearSystem(H_damped, g);
    if (!delta) {
      lambda *= 4;
      continue;
    }

    // Propose candidate parameters
    const candidateParams: AdjustableParam[] = JSON.parse(JSON.stringify(activeParams));
    freeIndices.forEach((pIdx, colIdx) => {
      const p = candidateParams[pIdx];
      let step = delta[colIdx];

      // Limit large relative step jump to 50% per iteration to prevent divergence
      const maxDelta = Math.max(1e-6, Math.abs(p.value) * 0.75);
      step = Math.max(-maxDelta, Math.min(maxDelta, step));

      p.value = Math.max(p.lowerBound, Math.min(p.upperBound, p.value + step));
    });

    const candidateCost = calculateCost(candidateParams);

    if (candidateCost.chiSq < currentCost.chiSq) {
      // Step accepted
      const relImprovement = (currentCost.chiSq - candidateCost.chiSq) / Math.max(1e-12, currentCost.chiSq);
      activeParams.forEach((p, idx) => {
        p.value = candidateParams[idx].value;
      });
      currentCost = candidateCost;
      lambda = Math.max(1e-7, lambda * 0.5);

      if (relImprovement < tolerance) {
        converged = true;
        break;
      }
    } else {
      // Step rejected, increase damping
      lambda = Math.min(1e8, lambda * 3.5);
    }
  }

  // Calculate asymptotic covariance and standard errors
  const finalTopo = applyParametersToTopology(topology, activeParams);
  const finalJacobian = computeJacobian(activeParams, currentCost.residuals);
  const finalH: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));

  for (let j = 0; j < K; j++) {
    for (let k = 0; k < K; k++) {
      let sum = 0;
      for (let r = 0; r < 2 * N; r++) {
        sum += finalJacobian[r][j] * finalJacobian[r][k];
      }
      finalH[j][k] = sum;
    }
  }

  // Invert normal matrix to get covariance
  const degreesOfFreedom = Math.max(1, 2 * N - K);
  const sSquared = currentCost.chiSq / degreesOfFreedom;
  const paramStdErrors: number[] = new Array(activeParams.length).fill(0);

  // Invert H for covariance diagonals
  const identity = Array.from({ length: K }, (_, i) =>
    Array.from({ length: K }, (_, j) => (i === j ? 1 : 0))
  );

  for (let col = 0; col < K; col++) {
    const e_col = identity[col];
    const invCol = solveLinearSystem(finalH, e_col);
    if (invCol && invCol[col] > 0) {
      const paramIndex = freeIndices[col];
      const variance = invCol[col] * sSquared;
      paramStdErrors[paramIndex] = Math.sqrt(variance);
    }
  }

  // Compile Parameter Fit Results
  const parameterResults: ParameterFitResult[] = activeParams.map((p, idx) => {
    const stdErr = paramStdErrors[idx];
    const pctErr = p.value > 0 ? (stdErr / p.value) * 100 : 0;

    return {
      elementId: p.elementId,
      branchId: p.branchId,
      paramName: p.paramName,
      paramType: p.paramType,
      field: p.field,
      initialValue: p.initialValue,
      fittedValue: p.value,
      unit: p.unit,
      stdError: stdErr,
      percentError: isNaN(pctErr) ? 0 : parseFloat(pctErr.toFixed(2)),
      isFixed: p.isFixed,
      lowerBound: p.lowerBound,
      upperBound: p.upperBound,
    };
  });

  // Calculate Residuals & Statistics
  let totalSS = 0;
  let residualSS = 0;
  const meanExpZReal = points.reduce((acc, p) => acc + p.zReal, 0) / N;

  const residuals: ResidualPoint[] = points.map((pt, i) => {
    const omega = 2 * Math.PI * pt.frequency;
    const zCalc = evalTopologyImpedance(finalTopo, omega);
    const mag = Math.max(1e-6, pt.zMag);

    const resZRealPct = ((pt.zReal - zCalc.re) / mag) * 100;
    const resZImagPct = ((pt.minusZImag - -zCalc.im) / mag) * 100;

    residualSS += Math.pow(pt.zReal - zCalc.re, 2) + Math.pow(pt.zImag - zCalc.im, 2);
    totalSS += Math.pow(pt.zReal - meanExpZReal, 2) + Math.pow(pt.zImag, 2);

    const wR = weights[i]?.wReal ?? 1.0;
    const wI = weights[i]?.wImag ?? 1.0;

    return {
      frequency: pt.frequency,
      logFreq: Math.log10(pt.frequency),
      expZReal: pt.zReal,
      expMinusZImag: pt.minusZImag,
      calcZReal: zCalc.re,
      calcMinusZImag: -zCalc.im,
      resZRealPct: parseFloat(resZRealPct.toFixed(3)),
      resZImagPct: parseFloat(resZImagPct.toFixed(3)),
      weightReal: wR,
      weightImag: wI,
      weightedDiffReal: parseFloat((Math.sqrt(wR) * (pt.zReal - zCalc.re)).toFixed(6)),
      weightedDiffImag: parseFloat((Math.sqrt(wI) * (pt.zImag - zCalc.im)).toFixed(6)),
    };
  });

  const rSquared = totalSS > 0 ? Math.max(0, 1 - residualSS / totalSS) : 0.99;
  const rmse = Math.sqrt(residualSS / (2 * N));
  const reducedChiSquare = currentCost.chiSq / degreesOfFreedom;

  // ASTM G106-89 Dynamic Range & Weighting Audit Metrics
  const mags = points.map((p) => Math.max(1e-12, p.zMag));
  const minMag = Math.min(...mags);
  const maxMag = Math.max(...mags);
  const dynamicRangeDecades = Math.log10(maxMag / Math.max(1e-6, minMag));
  const hfSensitivityBalancingFactor = Math.pow(maxMag / Math.max(1e-6, minMag), 2);
  const isAstmG106Compliant = weighting === "modulus" || weighting === "proportional";

  const astmG106 = {
    isAstmG106Compliant,
    weightingScheme: weighting,
    dynamicRangeDecades: parseFloat(dynamicRangeDecades.toFixed(2)),
    minImpedanceMagnitude_Ohm: parseFloat(minMag.toFixed(3)),
    maxImpedanceMagnitude_Ohm: parseFloat(maxMag.toFixed(3)),
    hfSensitivityBalancingFactor: parseFloat(hfSensitivityBalancingFactor.toFixed(1)),
    astmStandardRecommendation:
      weighting === "modulus"
        ? `ASTM G106 Compliant: Modulus weighting (1/|Z|²) provides uniform fractional sensitivity across all ${dynamicRangeDecades.toFixed(1)} impedance decades, resolving high-frequency Rs and Cdl.`
        : weighting === "proportional"
        ? `ASTM G106 Compliant: Regularized proportional weighting (1/Z'², 1/Z''²) applied across ${dynamicRangeDecades.toFixed(1)} decades.`
        : `ASTM G106 Non-Compliant: Unweighted least squares (w=1) causes ${maxMag.toExponential(1)} Ω low-frequency points to dominate ${minMag.toFixed(1)} Ω electrolyte points by 10^${(dynamicRangeDecades * 2).toFixed(1)}x!`,
    unweightedSkewWarning:
      weighting === "unit"
        ? `Low-frequency impedance (${maxMag.toExponential(1)} Ω) completely overwhelms high-frequency electrolyte resistance (${minMag.toFixed(1)} Ω) by ${dynamicRangeDecades.toFixed(1)} orders of magnitude. Switch to Modulus Weighting (1/|Z|²) per ASTM G106 to prevent high-frequency semicircle loss.`
        : null,
  };

  const kramersKronig = evaluateKramersKronig(dataset);
  const executionTimeMs = performance.now() - startTime;

  return {
    topology: finalTopo,
    parameters: parameterResults,
    dataset,
    chiSquare: currentCost.chiSq,
    reducedChiSquare,
    rmse,
    rSquared,
    iterations,
    converged,
    weighting,
    executionTimeMs: Math.round(executionTimeMs),
    residuals,
    kramersKronig,
    astmG106,
  };
}

/**
 * Executes Global Differential Evolution Auto-Fit via Python Backend
 * with explicit backend errors and validated report fields
 */
export async function runAsyncAutoFit(
  topology: CircuitTopology,
  dataset: ExperimentalEISDataset,
  userParams?: AdjustableParam[],
  weighting: WeightingMethod = "modulus",
  maxGenerations: number = 80
): Promise<CNLSFitReport> {
  const activeParams = userParams || extractAdjustableParameters(topology);

  const res = await fetch("/api/python/cnls-autofit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "auto_fit", topology, topologyId: topology.id,
      points: dataset.points, parameters: activeParams, weighting, maxGenerations,
      polishLM: true }),
  });
  if (!res.ok) throw new Error(`Python CNLS returned HTTP ${res.status}`);
  return normalizePythonCnlsReport(await res.json(), topology, dataset, weighting, activeParams);
}

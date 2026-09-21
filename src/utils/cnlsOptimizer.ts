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
 * Explicit unavailable result for the retired client-side K-K heuristic.
 */
export function evaluateKramersKronig(dataset: ExperimentalEISDataset): KramersKronigResult {
  return {
    isValid: null,
    score: null,
    meanResidualPct: null,
    maxResidualPct: null,
    assessment: "Unavailable",
    details: "Client-side Kramers-Kronig transform is unsupported. No independent K-K validation has been performed.",
  };
}

/** @deprecated Scientific fitting is provided by the Python API only. */
export function runCNLSFit(
  topology: CircuitTopology, dataset: ExperimentalEISDataset,
  userParams?: AdjustableParam[], weighting: WeightingMethod = "modulus", maxIterations = 80,
): CNLSFitReport {
  throw new Error("Client CNLS is unavailable. Use the Python fitting service.");
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
  maxGenerations: number = 80,
  options: {signal?: AbortSignal; populationSize?: number; polishLM?: boolean; randomSeed?: number} = {}
): Promise<CNLSFitReport> {
  const activeParams = userParams || extractAdjustableParameters(topology);

  options.signal?.throwIfAborted();
  const res = await fetch("/api/python/cnls-autofit", {
    signal: options.signal,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "auto_fit", topology, topologyId: topology.id,
      points: dataset.points, parameters: activeParams, weighting, maxGenerations,
      populationSize: options.populationSize ?? 40, polishLM: options.polishLM ?? true,
      randomSeed: options.randomSeed ?? 42 }),
  });
  options.signal?.throwIfAborted();
  if (!res.ok) throw new Error(`Python CNLS returned HTTP ${res.status}`);
  return normalizePythonCnlsReport(await res.json(), topology, dataset, weighting, activeParams);
}

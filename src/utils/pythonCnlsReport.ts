import type { CircuitTopology } from '../components/EquivalentCircuitBuilder';
import type { CNLSFitReport, ExperimentalEISDataset, WeightingMethod } from '../types/eisData';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid CNLS report object');
  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Missing or nonfinite CNLS metric');
  return value;
}
function nullableNumber(value: unknown): number | null {
  return value === null ? null : number(value);
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Missing CNLS text field');
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Missing CNLS boolean field');
  return value;
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Missing CNLS result rows');
  return value.map(object);
}

export function normalizePythonCnlsReport(
  value: unknown, topology: CircuitTopology, dataset: ExperimentalEISDataset, weighting: WeightingMethod,
  initialParams: Array<{ elementId: string; branchId: string; field: 'value' | 'exponent'; lowerBound: number; upperBound: number; value?: number; isFixed?: boolean }>,
): CNLSFitReport {
  const report = object(value);
  if (report.success !== true || report.error) throw new Error(typeof report.error === 'string' ? report.error : 'CNLS calculation failed');
  const parameterRows = rows(report.parameters);
  if (parameterRows.length !== initialParams.length) throw new Error('CNLS parameter count mismatch');
  const seen = new Set<string>();
  const parameters = parameterRows.map(p => {
    const input = initialParams.find(i => i.elementId === p.elementId && i.field === p.field);
    if (!input) throw new Error('CNLS parameter does not match the requested circuit');
    const key = `${input.elementId}:${input.field}`;
    if (seen.has(key)) throw new Error('Duplicate CNLS parameter');
    seen.add(key);
    const fitted = number(p.fittedValue);
    if (fitted < input.lowerBound || fitted > input.upperBound) throw new Error('CNLS fit violates parameter bounds');
    if (input.isFixed !== undefined && input.isFixed !== p.isFixed) throw new Error('CNLS fixed flag mismatch');
    if (input.isFixed && input.value !== fitted) throw new Error('CNLS changed a fixed parameter');
    return {
      ...input, paramName: text(p.paramName), paramType: text(p.paramType), unit: text(p.unit),
      initialValue: number(p.initialValue), fittedValue: number(p.fittedValue),
      stdError: nullableNumber(p.stdError), percentError: nullableNumber(p.percentError), isFixed: boolean(p.isFixed),
    };
  });
  const residuals = rows(report.residuals).map(p => ({
    frequency: number(p.frequency), logFreq: number(p.logFreq),
    expZReal: number(p.expZReal), expMinusZImag: number(p.expMinusZImag),
    calcZReal: number(p.calcZReal), calcMinusZImag: number(p.calcMinusZImag),
    resZRealPct: number(p.resZRealPct), resZImagPct: number(p.resZImagPct),
  }));
  if (residuals.length !== dataset.points.length || residuals.some((p, i) => {
    const input = dataset.points[i];
    return p.frequency !== input.frequency || p.expZReal !== input.zReal || p.expMinusZImag !== input.minusZImag;
  })) throw new Error('CNLS residuals do not match requested observations');
  const kk = object(report.kramersKronig);
  const reducedChiSquare = number(report.reducedChiSquare);
  const dof = Math.max(1, 2 * residuals.length - parameters.filter(p => !p.isFixed).length);
  const residualSS = residuals.reduce((sum, p) => sum + (p.calcZReal - p.expZReal) ** 2 + (p.calcMinusZImag - p.expMinusZImag) ** 2, 0);
  return {
    topology, dataset, weighting, parameters, residuals,
    chiSquare: reducedChiSquare * dof, reducedChiSquare,
    rmse: Math.sqrt(residualSS / (2 * residuals.length)),
    rSquared: nullableNumber(report.rSquared), iterations: number(report.iterations),
    executionTimeMs: number(report.computeTimeMs),
    // The legacy Python solver omits a termination reason: absence is not convergence.
    converged: report.converged === true,
    engineUsed: typeof report.engine === 'string' ? report.engine : 'Python CNLS',
    kramersKronig: {
      isValid: kk.isValid === null ? null : boolean(kk.isValid), score: nullableNumber(kk.score), meanResidualPct: number(kk.meanResidualPct),
      maxResidualPct: number(kk.maxResidualPct), assessment: text(kk.assessment),
    },
  };
}

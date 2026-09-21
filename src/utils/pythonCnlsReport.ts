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
  initialParams: Array<{ elementId: string; branchId: string; field: 'value' | 'exponent'; lowerBound: number; upperBound: number }>,
): CNLSFitReport {
  const report = object(value);
  if (report.success !== true || report.error) throw new Error(typeof report.error === 'string' ? report.error : 'CNLS calculation failed');
  const parameters = rows(report.parameters).map(p => {
    const input = initialParams.find(i => i.elementId === p.elementId && i.field === p.field);
    if (!input) throw new Error('CNLS parameter does not match the requested circuit');
    return {
      ...input, paramName: text(p.paramName), paramType: text(p.paramType), unit: text(p.unit),
      initialValue: number(p.initialValue), fittedValue: number(p.fittedValue),
      stdError: number(p.stdError), percentError: number(p.percentError), isFixed: boolean(p.isFixed),
    };
  });
  const residuals = rows(report.residuals).map(p => ({
    frequency: number(p.frequency), logFreq: number(p.logFreq),
    expZReal: number(p.expZReal), expMinusZImag: number(p.expMinusZImag),
    calcZReal: number(p.calcZReal), calcMinusZImag: number(p.calcMinusZImag),
    resZRealPct: number(p.resZRealPct), resZImagPct: number(p.resZImagPct),
  }));
  const kk = object(report.kramersKronig);
  const reducedChiSquare = number(report.reducedChiSquare);
  const dof = Math.max(1, 2 * residuals.length - parameters.filter(p => !p.isFixed).length);
  const residualSS = residuals.reduce((sum, p) => sum + (p.calcZReal - p.expZReal) ** 2 + (p.calcMinusZImag - p.expMinusZImag) ** 2, 0);
  return {
    topology, dataset, weighting, parameters, residuals,
    chiSquare: reducedChiSquare * dof, reducedChiSquare,
    rmse: Math.sqrt(residualSS / (2 * residuals.length)),
    rSquared: number(report.rSquared), iterations: number(report.iterations),
    executionTimeMs: number(report.computeTimeMs),
    // The legacy Python solver omits a termination reason: absence is not convergence.
    converged: report.converged === true,
    engineUsed: typeof report.engine === 'string' ? report.engine : 'Python CNLS',
    kramersKronig: {
      isValid: boolean(kk.isValid), score: number(kk.score), meanResidualPct: number(kk.meanResidualPct),
      maxResidualPct: number(kk.maxResidualPct), assessment: text(kk.assessment),
    },
  };
}

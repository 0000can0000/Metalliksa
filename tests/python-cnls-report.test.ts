import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePythonCnlsReport } from '../src/utils/pythonCnlsReport';
import type { CircuitTopology } from '../src/components/EquivalentCircuitBuilder';
import type { ExperimentalEISDataset } from '../src/types/eisData';

const topology: CircuitTopology = { id: 'fixture', name: 'Synthetic resistor', description: '', category: 'custom', cdcNotation: 'R', branches: [] };
const dataset: ExperimentalEISDataset = { id: 'fixture', name: 'Synthetic', source: 'csv', description: '', points: [] };
const response = {
  success: true, reducedChiSquare: 0, rSquared: 0, iterations: 0, computeTimeMs: 0,
  parameters: [{ elementId: 'r1', field: 'value', paramName: 'R1', paramType: 'R', unit: 'Ω', initialValue: 3, fittedValue: 2, stdError: 0, percentError: 0, isFixed: false }],
  residuals: [{ frequency: 10, logFreq: 1, expZReal: 2, expMinusZImag: 0, calcZReal: 2, calcMinusZImag: 0, resZRealPct: 0, resZImagPct: 0 }],
  kramersKronig: { isValid: false, score: 0, meanResidualPct: 0, maxResidualPct: 0, assessment: 'Synthetic fixture' },
};
const inputParams = [{ branchId: 'b1', elementId: 'r1', field: 'value' as const, lowerBound: 0, upperBound: 10 }];

test('Python CNLS normalization preserves zero metrics, calculates RMSE and does not invent convergence', () => {
  const report = normalizePythonCnlsReport(response, topology, dataset, 'modulus', inputParams);
  assert.equal(report.reducedChiSquare, 0);
  assert.equal(report.rSquared, 0);
  assert.equal(report.executionTimeMs, 0);
  assert.equal(report.iterations, 0);
  assert.equal(report.rmse, 0);
  assert.equal(report.converged, false);
  assert.equal(report.parameters[0].branchId, 'b1');
  assert.equal(report.parameters[0].fittedValue, 2);
});

test('incomplete Python CNLS response is rejected, not repaired with plausible metrics', () => {
  for (const field of ['reducedChiSquare', 'rSquared', 'computeTimeMs', 'parameters', 'residuals']) {
    assert.throws(() => normalizePythonCnlsReport({ ...response, [field]: undefined }, topology, dataset, 'modulus', inputParams), /CNLS/);
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPipelinePayloadFromCandidate } from '../src/utils/materialDataPipeline';

// Deliberately distinct supplied screening properties, not experimental evidence.
const candidate = {
  name: 'Synthetic transfer fixture', compositionWt: { Al: 90, Si: 10 },
  yieldStrength_25C_MPa: 321, uts_25C_MPa: 456, density_gcm3: 2.71,
  youngsModulus_GPa: 73, elongation_pct: 0,
};

test('candidate transfer preserves supplied identity, chemistry and properties, including zero', () => {
  const result = createPipelinePayloadFromCandidate(candidate, 'Synthetic test');
  assert.equal(result.name, 'Synthetic transfer fixture');
  assert.deepEqual(result.composition, { Al: 90, Si: 10 });
  assert.equal(result.baseMetal, 'Al');
  assert.equal(result.yieldStrength, 321);
  assert.equal(result.tensileStrength, 456);
  assert.equal(result.density, 2.71);
  assert.equal(result.youngsModulus, 73);
  assert.equal(result.elongation, 0);
});

test('candidate transfer rejects absent or nonfinite properties instead of inventing defaults', () => {
  for (const value of [undefined, NaN, Infinity]) {
    assert.throws(() => createPipelinePayloadFromCandidate({ ...candidate, yieldStrength_25C_MPa: value! }), /yieldStrength/);
  }
  assert.throws(() => createPipelinePayloadFromCandidate({ ...candidate, compositionWt: {} }), /composition/i);
});

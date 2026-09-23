import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LpbfEngineeringSimulation } from '../src/components/3d-distortion-lab/LpbfEngineeringSimulation';

test('engineering screen keeps the CUDA pilot visibly separate from standard CPU results', () => {
  const html = renderToStaticMarkup(<LpbfEngineeringSimulation input={{
    material: 'Inconel 718', power_W: 60, speed_mm_s: 1200,
    beamDiameter_um: 80, preheat_C: 25, layer_um: 80, hatch_um: 100,
  }}/>);
  for (const text of ['CUDA thermal parity pilot', 'Run CUDA parity pilot',
    'Explicit CUDA device', 'Numerical CPU/GPU parity only',
    'Experimental validation and qualification are unavailable',
    'GPU pilot archiving is unavailable', 'Run simulation']) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /aria-label="CUDA device"/);
  assert.ok(html.includes('pattern="cuda:[0-9]+"'));
  assert.match(html, /type="submit"/);
});

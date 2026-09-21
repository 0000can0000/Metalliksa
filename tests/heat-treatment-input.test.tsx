import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeatTreatmentAgingSimulator } from '../src/components/HeatTreatmentAgingSimulator';
import { solveInverseAlloyCandidates, type InverseDesignTargets } from '../src/utils/inverseAlloyOptimizer';

const targets: InverseDesignTargets = {
  applicationName: 'Synthetic UI fixture', baseMatrix: 'Nickel',
  targetYieldStrength_25C: 900, targetYieldStrength_Elevated: 700, serviceTemperature_C: 600,
  minElongation_pct: 10, minFractureToughness_K1c: 50, minPREN: 20,
  maxDensity_gcm3: 9, maxCostUSD_kg: 100, manufacturingRoute: 'LPBF 3D Printing',
  elementExclusions: { noCobalt: false, noRhenium: true, noTantalum: true, lowCarbon: true },
};

test('heat treatment cannot publish strength and porosity predictions before the missing precipitate input is supplied', () => {
  const candidate = solveInverseAlloyCandidates(targets)[0];
  const html = renderToStaticMarkup(<HeatTreatmentAgingSimulator candidate={candidate} targets={targets} />);
  assert.match(html, /Precipitate volume fraction/);
  assert.match(html, /unavailable/i);
  assert.doesNotMatch(html, /Post-HIP Relative Density:/);
  assert.doesNotMatch(html, /NaN/);
});

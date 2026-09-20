import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhysicalValidationStudio } from '../src/components/PhysicalValidationStudio';
import { EISUploadInsightsStudio } from '../src/components/EISUploadInsightsStudio';

test('physical validation has no score or capacitance before a backend result', () => {
  const html = renderToStaticMarkup(<PhysicalValidationStudio />);
  assert.doesNotMatch(html, />95<!-- -->%|>95%/);
  assert.doesNotMatch(html, /Normal electrochemical response/);
  assert.match(html, /Unavailable/);
});

test('generated example spectra are identified as synthetic in both studios', () => {
  for (const studio of [<PhysicalValidationStudio />, <EISUploadInsightsStudio />]) {
    const html = renderToStaticMarkup(studio);
    assert.match(html, /[Ss]ynthetic/);
    assert.doesNotMatch(html, /Real Spectra|calibrated real-world laboratory datasets/);
  }
});

test('upload report export is disabled before a computed result', () => {
  const html = renderToStaticMarkup(<EISUploadInsightsStudio />);
  assert.match(html, /<button[^>]*disabled=""[^>]*title="Download JSON Report"/);
  assert.doesNotMatch(html, /92\.4%|PASSED \(Linear\)/);
});

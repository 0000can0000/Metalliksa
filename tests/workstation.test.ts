import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MODULES, WORKSPACES, isModuleId, moduleFromHash, moduleHash } from '../src/data/workspaces';
import { normalizeCrossrefResponse, researchSearchUrl } from '../server/researchSearch';
import { materialProfileIdentity } from '../src/utils/materialProfileIdentity';

test('reselecting a material retains identity while chemistry changes invalidate it', () => {
  const original = materialProfileIdentity('Alloy', 'Fe', { Fe: 90, Ni: 10 });
  assert.equal(materialProfileIdentity('Alloy', 'Fe', { Ni: 10, Fe: 90 }), original);
  assert.notEqual(materialProfileIdentity('Alloy', 'Fe', { Fe: 89, Ni: 11 }), original);
  assert.notEqual(materialProfileIdentity('Other alloy', 'Fe', { Fe: 90, Ni: 10 }), original);
});

test('every module has one workspace, a valid next action and a round-trip route', () => {
  assert.equal(WORKSPACES[0].id, 'lpbf');
  assert.equal(new Set(MODULES.map(m => m.id)).size, MODULES.length);
  for (const module of MODULES) {
    assert.ok(WORKSPACES.some(w => w.id === module.workspace));
    assert.ok(isModuleId(module.next));
    assert.equal(moduleFromHash(moduleHash(module.id)), module.id);
  }
  for (const workspace of WORKSPACES) assert.ok(MODULES.some(m => m.id === workspace.defaultModule && m.workspace === workspace.id));
  assert.equal(moduleFromHash('#/missing'), null);
  assert.equal(isModuleId('__proto__'), false);
});

test('literature query is bounded and cannot select an arbitrary upstream host', () => {
  for (const bad of ['', 'a', null, ['query'], 'a'.repeat(501)]) assert.throws(() => researchSearchUrl(bad));
  assert.equal(researchSearchUrl('https://evil.example/?x=1').origin, 'https://api.crossref.org');
  assert.ok(researchSearchUrl('doi: 10.1000/fixture').pathname.includes('10.1000%2Ffixture'));
  assert.equal(researchSearchUrl('LPBF 316L measured width').searchParams.get('rows'), '12');
});

test('metadata normalization keeps unknowns unknown and does not create findings', () => {
  const items = normalizeCrossrefResponse({ message: { items: [{ DOI: '10.1000/fixture', title: ['<i>Fixture</i>'], author: [{ family: 'Test' }], type: 'journal-article' }] } });
  assert.equal(items[0].title, 'Fixture');
  assert.equal(items[0].year, null);
  assert.equal(items[0].publicationType, 'journal-article');
  assert.equal('value' in items[0], false);
  assert.deepEqual(normalizeCrossrefResponse({ message: { items: [] } }), []);
  assert.throws(() => normalizeCrossrefResponse({ message: 'bad' }));
  assert.deepEqual(normalizeCrossrefResponse({ message: { items: [{ DOI: 'javascript:alert(1)', title: ['bad'] }] } }), []);
});

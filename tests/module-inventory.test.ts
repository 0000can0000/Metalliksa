import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MODULES } from '../src/data/workspaces';

const root = fileURLToPath(new URL('..', import.meta.url));
const inventory = readFileSync(path.join(root, 'docs/MODULE_EVIDENCE_INVENTORY.md'), 'utf8');

test('evidence inventory covers each registered module exactly once with all contract columns', () => {
  const rows = inventory.split(/\r?\n/).filter(line => /^\| `[^`]+` \/ /.test(line));
  const ids = rows.map(line => /^\| `([^`]+)`/.exec(line)![1]);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate inventory row');
  assert.deepEqual([...ids].sort(), MODULES.map(module => module.id).sort());
  for (const row of rows) {
    const columns = row.split('|').slice(1, -1).map(value => value.trim());
    assert.equal(columns.length, 5, 'Inventory must preserve its five evidence columns');
    assert.ok(columns.every(Boolean), 'Missing module mapping, evidence or next gap');
    assert.match(columns[1], /`src\/[^`]+\.tsx`/, 'Missing principal view component');
    assert.match(columns[3], /\b[SLG]:\*\*/, 'Missing evidence tier');
  }
});

test('cited repository files exist so source moves cannot silently invalidate the inventory', () => {
  const paths = [...new Set([...inventory.matchAll(/`((?:src|server|routes|python|tests|docs)\/[^`]+\.(?:ts|tsx|py|md))`/g)].map(match => match[1]))];
  assert.ok(paths.length > 100, 'Expected substantive source and evidence mapping');
  for (const relative of paths) {
    const resolved = path.resolve(root, relative);
    assert.ok(resolved.startsWith(root), `Escaping inventory reference: ${relative}`);
    assert.ok(statSync(resolved).isFile(), `Missing inventory reference: ${relative}`);
  }
});

test('runtime requirements explicitly cover all modules without claiming universal availability', () => {
  const environmentIds = inventory.split(/\r?\n/).filter(line => line.startsWith('Modules: '))
    .flatMap(line => [...line.matchAll(/`([^`]+)`/g)].map(match => match[1]));
  assert.deepEqual(environmentIds.sort(), MODULES.map(module => module.id).sort());
  assert.ok(inventory.includes('must not be used as installation proof'));
});

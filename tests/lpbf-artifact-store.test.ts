import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { LpbfArtifactStore } from '../server/lpbfArtifactStore';

const abc = { sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', byteSize: 3 };
function fixture(t: TestContext) {
  const directory = mkdtempSync(path.join(tmpdir(), 'lpbf-artifacts-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = path.join(directory, 'input'); mkdirSync(input);
  writeFileSync(path.join(input, 'source'), 'abc');
  const store = new LpbfArtifactStore(path.join(directory, 'store'));
  return { directory, input, store };
}

test('concurrent duplicate ingestion publishes one verified immutable object', async t => {
  const { store, input } = fixture(t);
  const results = await Promise.all([store.putFile(input, 'source', abc), store.putFile(input, 'source', abc)]);
  assert.equal(results[0].path, results[1].path);
  assert.equal(readFileSync(results[0].path, 'utf8'), 'abc');
  assert.equal((await store.verify(abc)).byteSize, 3);
  assert.deepEqual(readdirSync(path.join(store.root, '.staging')), []);
});

test('hash and size mismatch never publish and cleanup preserves other staging files', async t => {
  const { store, input } = fixture(t);
  const sentinel = path.join(store.root, '.staging', 'keep'); writeFileSync(sentinel, 'other operation');
  for (const ref of [{ ...abc, sha256: 'f'.repeat(64) }, { ...abc, byteSize: 2 }, { ...abc, byteSize: 4 }]) {
    await assert.rejects(store.putFile(input, 'source', ref), /integrity|size|hash/i);
    await assert.rejects(store.verify(ref));
  }
  assert.equal(readFileSync(sentinel, 'utf8'), 'other operation');
  assert.deepEqual(readdirSync(path.join(store.root, '.staging')), ['keep']);
});

test('corrupted existing object is rejected without overwriting its bytes', async t => {
  const { store, input } = fixture(t);
  const result = await store.putFile(input, 'source', abc);
  writeFileSync(result.path, 'bad');
  await assert.rejects(store.verify(abc), /integrity/i);
  await assert.rejects(store.putFile(input, 'source', abc), /integrity/i);
  assert.equal(readFileSync(result.path, 'utf8'), 'bad');
});

test('traversal, device names, alternate streams and directory junctions are rejected', async t => {
  const { store, input, directory } = fixture(t);
  for (const name of ['../input/source', '/source', 'C:/source', 'source:stream', 'CON', 'sub/../source', 'source.', 'source ']) {
    await assert.rejects(store.putFile(input, name, abc), /path/i);
  }
  symlinkSync(input, path.join(directory, 'linked'), 'junction');
  await assert.rejects(store.putFile(path.join(directory, 'linked'), 'source', abc), /link|directory/i);
  symlinkSync(input, path.join(input, 'linked'), 'junction');
  await assert.rejects(store.putFile(input, 'linked/source', abc), /link|directory/i);
  assert.throws(() => new LpbfArtifactStore(path.join(directory, 'linked', 'store')), /link|directory/i);
});

test('multi-chunk binary input is copied independently without truncation', async t => {
  const { store, input } = fixture(t);
  const bytes = Buffer.alloc(3 * 1024 * 1024 + 17);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
  const ref = { sha256: createHash('sha256').update(bytes).digest('hex'), byteSize: bytes.length };
  writeFileSync(path.join(input, 'source'), bytes);
  const result = await store.putFile(input, 'source', ref);
  writeFileSync(path.join(input, 'source'), 'changed');
  assert.deepEqual(readFileSync(result.path), bytes);
  await store.verify(ref);
});

test('an object directory junction cannot redirect publication outside the store', async t => {
  const { directory, store, input } = fixture(t);
  const outside = path.join(directory, 'outside'); mkdirSync(outside);
  symlinkSync(outside, path.join(store.root, 'objects', 'ba'), 'junction');
  await assert.rejects(store.putFile(input, 'source', abc), /link|directory/i);
  assert.deepEqual(readdirSync(outside), []);
  assert.deepEqual(readdirSync(path.join(store.root, '.staging')), []);
});

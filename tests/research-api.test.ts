import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { researchRouter } from '../routes/research';

test('literature API handles metadata, validation, provider errors and offline policy', async () => {
  const app = express(); app.use(researchRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const local = `http://127.0.0.1:${address.port}/api/research/search`;
  const originalFetch = globalThis.fetch;
  const originalAirgap = process.env.AIRGAPPED;
  let upstreamCalls = 0;
  const fixture = { message: { items: [{ DOI: '10.1000/test', title: ['Synthetic API fixture; not research data'], type: 'journal-article' }] } };
  try {
    process.env.AIRGAPPED = '0';
    globalThis.fetch = async () => { upstreamCalls++; return new Response(JSON.stringify(fixture)); };
    let response = await originalFetch(`${local}?q=a`);
    assert.equal(response.status, 400); assert.equal(upstreamCalls, 0);
    response = await originalFetch(`${local}?q=LPBF+fixture`);
    assert.equal(response.status, 200);
    const body = await response.json(); assert.equal(body.provider, 'Crossref'); assert.equal(body.items[0].year, null);
    assert.equal('confidence' in body.items[0], false);
    process.env.AIRGAPPED = '1';
    response = await originalFetch(`${local}?q=LPBF+fixture`);
    assert.equal(response.status, 403); assert.equal(upstreamCalls, 1);
    process.env.AIRGAPPED = '0';
    for (const [upstreamStatus, expected] of [[404, 404], [429, 429], [500, 502]]) {
      globalThis.fetch = async () => new Response('', { status: upstreamStatus });
      response = await originalFetch(`${local}?q=LPBF+fixture`); assert.equal(response.status, expected);
      assert.equal(typeof (await response.json()).error, 'string');
    }
    globalThis.fetch = async () => new Response('{broken');
    response = await originalFetch(`${local}?q=LPBF+fixture`); assert.equal(response.status, 502);
    globalThis.fetch = async () => { throw new Error('Offline test fixture'); };
    response = await originalFetch(`${local}?q=LPBF+fixture`); assert.equal(response.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalAirgap === undefined) delete process.env.AIRGAPPED; else process.env.AIRGAPPED = originalAirgap;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

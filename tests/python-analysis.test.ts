import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPythonAnalysis } from '../src/services/pythonAnalysis';

test('analysis rejects HTTP and solver errors without fabricating results', async (t) => {
  for (const [status, body] of [[503, { error: 'Solver offline' }], [200, { error: 'Invalid spectrum' }], [200, {}], [200, { success: false }]] as const) {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status }));
    await assert.rejects(requestPythonAnalysis('/api/test', '{}', new AbortController().signal));
    t.mock.restoreAll();
  }
});

test('cancelled old reply is rejected even if transport ignores abort', async (t) => {
  let reply!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(resolve => { reply = resolve; }));
  const controller = new AbortController();
  const pending = requestPythonAnalysis('/api/test', '{}', controller.signal);
  controller.abort();
  reply(new Response(JSON.stringify({ metric: 12 })));
  await assert.rejects(pending, { name: 'AbortError' });
});

test('actual zero metrics are preserved', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ metric: 0 })));
  assert.deepEqual(await requestPythonAnalysis('/api/test', '{}', new AbortController().signal), { metric: 0 });
});

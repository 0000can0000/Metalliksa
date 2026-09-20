import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { lpbfSimulationRouter } from '../routes/lpbfSimulation';
import { lpbfWorker } from '../server/lpbfWorkerBridge';

test('keyhole API forwards bounded solver inputs and preserves backend failure', async () => {
  const app = express(); app.use(express.json()); app.use(lpbfSimulationRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const original = lpbfWorker.request;
  const payload = { power_W: 250, seed: 17, num_rays: 1024, device: 'cpu' };
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/api/python/lpbf-keyhole-raytracing`;
  try {
    // Only replace the subprocess boundary; real HTTP parsing/routing is exercised.
    lpbfWorker.request = async (method, input) => {
      assert.equal(method, 'keyhole-raytracing'); assert.deepEqual(input, payload);
      throw new Error('Warp backend unavailable');
    };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Warp backend unavailable' });
  } finally {
    lpbfWorker.request = original;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

// Manual browser regression harness. Faults are test-only; normal mode uses the real Python API.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PhysicalValidationStudio } from '../src/components/PhysicalValidationStudio';
import { EISUploadInsightsStudio } from '../src/components/EISUploadInsightsStudio';
import '../src/index.css';

const realFetch = window.fetch.bind(window);
let mode = 'real';
let release: (() => void) | undefined;
window.fetch = async (input, init) => {
  if (!String(input).startsWith('/api/python/')) return realFetch(input, init);
  if (mode === 'failure') return new Response(JSON.stringify({ error: 'Controlled test: Python unavailable' }), { status: 503 });
  if (mode === 'partial') return new Response(JSON.stringify({ success: true, cpeCapacitances: [] }));
  if (mode === 'delay') {
    mode = 'real';
    // Deliberately ignore abort to prove that late transport replies cannot replace current state.
    const result = await realFetch(input, { ...init, signal: undefined });
    await new Promise<void>(resolve => { release = resolve; });
    return result;
  }
  return realFetch(input, init);
};
function Harness() {
  const [studio, setStudio] = useState('physical');
  return <main className="bg-slate-950 text-white p-5">
    <h1>EIS regression harness — test controls, not experimental evidence</h1>
    <nav className="flex gap-3 my-4">
      <button onClick={() => setStudio('physical')}>Physical studio</button>
      <button onClick={() => setStudio('upload')}>Upload studio</button>
      <label>Transport <select aria-label="Test transport" defaultValue="real" onChange={event => { mode = event.target.value; }} className="bg-slate-800">
        <option value="real">Real Python</option><option value="failure">HTTP failure</option>
        <option value="partial">Partial response</option><option value="delay">Delay next reply</option>
      </select></label>
      <button onClick={() => { release?.(); release = undefined; }}>Release delayed reply</button>
    </nav>
    {studio === 'physical' ? <PhysicalValidationStudio /> : <EISUploadInsightsStudio />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);

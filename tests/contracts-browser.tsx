// Manual test harness: real components with explicit synthetic candidate inputs.
import React, { lazy, Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HeatTreatmentAgingSimulator } from '../src/components/HeatTreatmentAgingSimulator';
import { solveInverseAlloyCandidates, type InverseDesignTargets } from '../src/utils/inverseAlloyOptimizer';
import '../src/index.css';
const EDS = lazy(() => import('../src/components/EDSSpectrumLab').then(m => ({ default: m.EDSSpectrumLab })));
const GroundTruth = lazy(() => import('../src/components/3d-distortion-lab/LPBFGroundTruthDataLab').then(m => ({ default: m.LPBFGroundTruthDataLab })));
const Circuit = lazy(() => import('../src/components/EquivalentCircuitBuilder').then(m => ({ default: m.EquivalentCircuitBuilder })));
const Fitting = lazy(async () => {
  const [{ CNLSFittingStudio }, { STANDARD_CIRCUIT_PRESETS }] = await Promise.all([
    import('../src/components/CNLSFittingStudio'), import('../src/components/EquivalentCircuitBuilder')]);
  return { default: () => <CNLSFittingStudio currentTopology={STANDARD_CIRCUIT_PRESETS[0]} onApplyTopology={() => {}} /> };
});
const Inverse = lazy(() => import('../src/components/InverseAlloyStudio').then(m => ({ default: m.InverseAlloyStudio })));
const targets: InverseDesignTargets = {
  applicationName: 'Synthetic UI fixture', baseMatrix: 'Nickel',
  targetYieldStrength_25C: 900, targetYieldStrength_Elevated: 700, serviceTemperature_C: 600,
  minElongation_pct: 10, minFractureToughness_K1c: 50, minPREN: 20,
  maxDensity_gcm3: 9, maxCostUSD_kg: 100, manufacturingRoute: 'LPBF 3D Printing',
  elementExclusions: { noCobalt: false, noRhenium: true, noTantalum: true, lowCarbon: true },
};
const candidate = solveInverseAlloyCandidates(targets)[0];
const realFetch = window.fetch.bind(window);
let transport = 'real';
window.fetch = async (input, init) => {
  if (['/api/python/cnls-fit', '/api/python/cnls-autofit'].includes(String(input)) && init?.body && typeof init.body === 'string') {
    const action = JSON.parse(init.body).action ?? 'fit';
    if (action === 'fit' || action === 'auto_fit') {
      if (transport === 'failure') return new Response(JSON.stringify({ error: 'Controlled test failure' }), { status: 503 });
      if (transport === 'partial') return new Response(JSON.stringify({ success: true }));
    }
  }
  return realFetch(input, init);
};
function Harness() {
  const [tab, setTab] = useState('heat');
  const [composition, setComposition] = useState<Record<string, number> | null>(null);
  const [navigation, setNavigation] = useState('');
  return <main className="min-h-screen bg-slate-950 text-white p-5">
    <h1>Component contract tests — synthetic inputs, no experimental evidence</h1>
    <nav className="flex gap-5 my-4">{['heat', 'eds', 'ground', 'circuit', 'fitting', 'inverse'].map(id =>
      <button key={id} onClick={() => setTab(id)}>{id}</button>)}</nav>
    <output aria-label="Transfer result">{composition ? JSON.stringify(composition) : navigation}</output>
    <label className="block mb-3">CNLS test transport <select className="bg-slate-800" defaultValue="real" onChange={e => { transport = e.target.value; }}>
      <option value="real">Real Python</option><option value="failure">HTTP 503</option><option value="partial">Incomplete report</option>
    </select></label>
    <Suspense fallback={<p>Loading component</p>}>
      {tab === 'heat' && <HeatTreatmentAgingSimulator candidate={candidate} targets={targets} />}
      {tab === 'eds' && <EDS onSendToAlloyBuilder={setComposition} />}
      {tab === 'ground' && <GroundTruth />}
      {tab === 'circuit' && <Circuit />}
      {tab === 'fitting' && <Fitting />}
      {tab === 'inverse' && <Inverse onNavigate={setNavigation} />}
    </Suspense>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);

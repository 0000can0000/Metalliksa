import React, { useState } from 'react';
import { Cpu, Search, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { pythonComputationService, ExperimentalValidationResult } from '../services/pythonComputationService';

export const ExperimentalValidationLab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExperimentalValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [expPdas, setExpPdas] = useState<string>('1.6');
  const [expKeyhole, setExpKeyhole] = useState<string>('150');


  const runValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pythonComputationService.computeExperimentalValidation({
        params: { laserPower_W: 250, scanSpeed_mms: 1000 },
        material: { id: 'ti64' },
        simulationResult: { pdas_um: 1.5, keyhole_depth_um: 120.0 },
        experimentalData: { pdas_um: parseFloat(expPdas), keyhole_depth_um: parseFloat(expKeyhole), source: 'EBSD / CT User Input' }
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3 bg-cyan-950/40 p-4 rounded-xl border border-cyan-800/50">
        <ShieldCheck className="w-8 h-8 text-cyan-400" />
        <div>
          <h2 className="text-lg font-bold text-white">Experimental Validation &amp; Traceability</h2>
          <p className="text-sm text-cyan-200/80">Compare LPBF simulations against experimental EBSD/CT findings.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-3">EBSD Microstructure Input</h3>
          <label className="block text-xs text-slate-400 mb-1">Measured PDAS (¦m)</label>
          <input type="number" step="0.1" value={expPdas} onChange={e => setExpPdas(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white mb-2" />
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-3">CT Defect Input</h3>
          <label className="block text-xs text-slate-400 mb-1">Measured Keyhole Depth (¦m)</label>
          <input type="number" step="1" value={expKeyhole} onChange={e => setExpKeyhole(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white mb-2" />
        </div>
      </div>

      <button onClick={runValidation} disabled={loading} className="flex items-center justify-center gap-2 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
        <Cpu className="w-5 h-5" /> {loading ? 'Validating...' : 'Run Traceability Pipeline'}
      </button>

      {error && <div className="bg-red-950/50 text-red-400 p-4 rounded-xl border border-red-900/50">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Traceability Record</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-400">Record ID:</div><div className="text-white font-mono">{result.traceability.recordId}</div>
              <div className="text-slate-400">Timestamp:</div><div className="text-white">{result.traceability.timestamp}</div>
              <div className="text-slate-400">Evidence Source:</div><div className="text-white">{result.traceability.evidenceSource}</div>
              <div className="text-slate-400">Overall Match:</div>
              <div className={result.overallMatch === 'high' ? 'text-emerald-400 font-bold uppercase' : 'text-amber-400 font-bold uppercase'}>
                {result.overallMatch}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {result.metrics.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  {m.status === 'pass' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  <div>
                    <div className="text-sm font-bold text-white">{m.metric} <span className="text-xs text-slate-400 font-normal ml-2">({m.source})</span></div>
                    <div className="text-xs text-slate-400">Simulated: {m.simulated.toFixed(1)} {m.unit} | Experimental: {m.experimental.toFixed(1)} {m.unit}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${m.error_pct < 15 ? 'text-emerald-400' : 'text-amber-400'}`}>{m.error_pct.toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500 uppercase">Error (MAPE)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

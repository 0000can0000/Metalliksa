import React from 'react';
import { FlaskConical, Info } from 'lucide-react';

/** No fixed predictions or implicit measurement defaults at an unbound boundary. */
export const ExperimentalValidationLab: React.FC = () => (
  <section aria-labelledby="lpbf-experiment-heading" className="max-w-4xl mx-auto p-4 space-y-4">
    <div className="flex items-center gap-3 bg-cyan-950/40 p-4 rounded-xl border border-cyan-800/50">
      <FlaskConical aria-hidden="true" className="w-8 h-8 text-cyan-400 shrink-0" />
      <div>
        <h2 id="lpbf-experiment-heading" className="text-lg font-bold text-white">LPBF Experimental Comparison</h2>
        <p className="text-sm text-cyan-100">Compare traceable measurements with an identified simulation.</p>
      </div>
    </div>
    <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 space-y-3">
      <h3 className="flex items-center gap-2 text-base font-semibold text-amber-200">
        <Info aria-hidden="true" className="w-5 h-5" /> Comparison unavailable
      </h3>
      <p className="text-sm text-slate-200">This panel has no linked completed simulation run or calibrated measurement dataset. No comparison has been performed.</p>
      <p className="text-sm text-slate-200">A comparison requires a recorded model and material, matching process conditions, an exact source revision, measurement definitions and uncertainty information.</p>
      <p className="text-sm text-slate-200">The shared thermal core does not resolve PDAS or keyhole depth. Those quantities require an identified model with suitable physics and independently reviewed evidence.</p>
      <p className="text-sm text-slate-300">Use the LPBF Engineering workspace to compute thermal results and inspect source records. Source file integrity and numerical agreement alone do not establish experimental validation.</p>
    </div>
  </section>
);

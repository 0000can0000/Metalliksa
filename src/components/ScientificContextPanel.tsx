import React from 'react';
import { BookOpen, FlaskConical, ShieldCheck } from 'lucide-react';
import type { ActiveSpecimenState } from '../store/useMaterialSpecimenStore';
import type { ModuleId } from '../data/workspaces';
import { buildScientificContext } from '../utils/scientificContext';

export function ScientificContextPanel({ moduleId, specimen }: { moduleId: ModuleId; specimen: ActiveSpecimenState }) {
  const context = buildScientificContext(moduleId, specimen);
  return <section aria-labelledby="scientific-context-title" className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4">
    <div className="flex items-start gap-3">
      <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-2 text-cyan-300"><BookOpen className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">Scientific context · live interpretation</p><h2 id="scientific-context-title" className="mt-1 text-sm font-semibold text-white">{context.title}</h2><p className="mt-2 text-xs leading-relaxed text-slate-300">{context.observation}</p></div>
    </div>
    <div className="mt-4 grid gap-3 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><p className="flex items-center gap-2 text-xs font-medium text-sky-200"><FlaskConical className="h-3.5 w-3.5" /> Mechanism</p><p className="mt-2 text-xs leading-relaxed text-slate-400">{context.mechanism}</p></div>
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><p className="text-xs font-medium text-sky-200">What drives the result</p><ul className="mt-2 space-y-1 text-xs text-slate-400">{context.variables.map(variable => <li key={variable}>· {variable}</li>)}</ul></div>
      <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3"><p className="flex items-center gap-2 text-xs font-medium text-amber-200"><ShieldCheck className="h-3.5 w-3.5" /> How to read it</p><p className="mt-2 text-xs leading-relaxed text-slate-400">{context.interpretation}</p><p className="mt-2 border-t border-amber-500/10 pt-2 text-[11px] leading-relaxed text-amber-200/80">Limitation: {context.limitation}</p></div>
    </div>
  </section>;
}

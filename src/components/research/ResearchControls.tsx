import React, { useId } from 'react';
import { useResearchStore } from '../../store/useResearchStore';
import { researchLabel } from '../../utils/researchRegistry';

export const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-40';
export const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40';
export const primaryClass = `${buttonClass} border-sky-600 bg-sky-950/60 text-sky-200`;
export const panelClass = 'rounded-xl border border-slate-800 bg-slate-900/60 p-5';
export const confidences = ['unresolved', 'low', 'medium', 'high'];

export function Field({ label, value, onChange, multiline = false, type = 'text', placeholder = '', required = false }: { key?: string; label: string; value: string; onChange: (value: string) => void; multiline?: boolean; type?: string; placeholder?: string; required?: boolean }) {
  const id = useId();
  return <label htmlFor={id} className="block space-y-1.5 text-xs text-slate-400"><span>{label}{required ? ' *' : ''}</span>{multiline ? <textarea id={id} className={`${inputClass} min-h-20`} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} /> : <input id={id} className={inputClass} type={type} step={type === 'number' ? 'any' : undefined} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} />}</label>;
}
export function Select({ label, value, options, onChange }: { key?: string; label: string; value: string; options: readonly string[] | { value: string; label: string }[]; onChange: (value: string) => void }) {
  const id = useId();
  return <label htmlFor={id} className="block space-y-1.5 text-xs text-slate-400"><span>{label}</span><select id={id} className={inputClass} value={value} onChange={e => onChange(e.target.value)}>{options.map(option => typeof option === 'string' ? <option key={option} value={option}>{researchLabel(option)}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
export function useDraft(key: string, defaults: Record<string, string>) {
  const saved = useResearchStore(state => state.drafts[key]), setDraft = useResearchStore(state => state.setDraft);
  const draft = { ...defaults, ...saved };
  return { draft, patch: (name: string, value: string) => setDraft(key, { ...draft, [name]: value }), replace: (value: Record<string, string>) => setDraft(key, value) };
}
export function Empty({ children }: { children: React.ReactNode }) { return <p className="rounded-lg border border-dashed border-slate-700 p-6 text-sm text-slate-400">{children}</p>; }
export function Notice({ messages }: { messages: string[] }) { return messages.length ? <div role="status" className="rounded-lg border border-amber-700/60 bg-amber-950/20 p-3 text-sm text-amber-200">{messages.map((message, index) => <p key={index}>{message}</p>)}</div> : null; }
export function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300">{children}</span>; }

import React from 'react';
import { useResearchStore } from '../store/useResearchStore';
import { useMaterialSpecimenStore } from '../store/useMaterialSpecimenStore';
import { getResearchIntegrationRecords, researchEvidenceLabel } from '../utils/researchRegistry';
import type { ResearchTargetModule } from '../types/research';

export function ResearchIntegrationPanel({ targetModule }: { targetModule: ResearchTargetModule }) {
  const research = useResearchStore();
  const material = useMaterialSpecimenStore(s => s.activeSpecimen);
  const records = getResearchIntegrationRecords(research, targetModule, material.id);
  return <details className="mb-5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
    <summary className="cursor-pointer text-sm text-cyan-200">Research evidence for {material.name} · {records.length} reviewed reference{records.length === 1 ? '' : 's'}</summary>
    <p className="my-3 text-xs text-slate-400">References retain their original units and conditions. Linking evidence does not replace solver material properties, apply a calibration or validate a result. Named alloy tables are not recalculated from edited composition; modified alloys require explicitly sourced properties.</p>
    {!records.length && <p className="text-sm text-slate-400 mb-3">No reviewed evidence is linked to this material and module. Register and review a finding in Research Hub to make it available here.</p>}
    <ul className="divide-y divide-slate-800">{records.map(({ record, finding, source }) => <li key={record.id} className="py-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><strong className="text-slate-200">{finding.property}: {finding.value} {finding.unit}{finding.uncertainty !== undefined ? ` ± ${finding.uncertainty} ${finding.unit}` : ''}</strong><span className="text-xs text-amber-200">{researchEvidenceLabel(finding)} · {finding.confidence} confidence</span></div>
      <p className="text-xs text-slate-400 mt-1">{source.title} · {finding.locator}</p><p className="text-xs text-slate-500 mt-1">{finding.conditions.process} · {finding.conditions.processParameters} · {finding.conditions.measurementMethod}</p>
      <p className="mt-1 text-xs text-amber-200/80">Limitations: {finding.limitations || 'Not supplied; applicability remains unresolved.'}</p>
    </li>)}</ul>
    <button onClick={() => { research.setActiveTab('registry'); window.dispatchEvent(new CustomEvent('metallix-navigate-tab', { detail: { tabId: 'research-hub' } })); }} className="text-xs text-cyan-300 underline">Review registry and source provenance</button>
  </details>;
}

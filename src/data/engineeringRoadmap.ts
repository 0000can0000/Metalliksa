/** Versioned engineering work evidence; never a scientific qualification score. */
export const MILESTONES = [
  { id: 'defined', weight: 10 }, { id: 'implemented', weight: 35 },
  { id: 'tested', weight: 30 }, { id: 'reviewed', weight: 15 }, { id: 'accepted', weight: 10 },
] as const;
export type MilestoneId = typeof MILESTONES[number]['id'];
export interface MilestoneEvidence { id: MilestoneId; evidence: string; date: string; reviewer: string }
export interface EngineeringTask {
  id: string; title: string; weight: number; dependencies: string[]; acceptance: string;
  milestones: MilestoneEvidence[]; blocker: string | null; nextAction: string;
}
const cards = [
  ['A01', 'Module and evidence inventory', '', 'Map all user modules to code, solver, environment, evidence and unresolved limitations.'],
  ['A02', 'Reproducible engineering environment', 'A01', 'Verify application Python, CUDA training, ParaView output reading, Docker engine and clean application setup with locked dependencies.'],
  ['B01', 'Customer discovery', '', 'Record five founder-led discovery interviews and a real pilot need.'],
  ['B02', 'Pilot scope and acceptance', 'A01 B01', 'Agree material, machine, process range, holdout split, error and runtime targets with the pilot customer.'],
  ['C01', 'Material properties and units', 'A01 B02', 'Trace temperature-dependent properties, units, ranges and uncertainty; reject invalid inputs.'],
  ['C02', 'Benchmark data pipeline', 'A02 B02', 'Verify checksums, calibration, signal conversion and leakage-free calibration/holdout datasets.'],
  ['D01', 'Numerical verification', 'C01 C02', 'Demonstrate analytic references, energy balance and three-level mesh/time convergence against declared tolerances.'],
  ['D02', 'Independent experimental validation', 'D01', 'Report held-out melt-pool errors, bias and uncertainty including failures against the agreed pilot thresholds.'],
  ['D03', 'Physics scope and process window', 'D02', 'Declare conduction/keyhole/powder limits and block unsupported recommendations.'],
  ['E01', 'Materials Intelligence and Research Hub', 'C01 C02', 'Version source-to-material links; test corrections, units, review withdrawal and durable recovery.'],
  ['E02', 'Microstructure and solidification', 'D02', 'Compare predictions with appropriate independent micrographs or EBSD measurements.'],
  ['E03', 'Residual stress and distortion', 'D02', 'Verify mechanical or calibrated inherent-strain results against independent measurements.'],
  ['E04', 'Defects and mechanical performance', 'D03', 'Validate against CT, porosity and mechanical tests; keep threshold screening distinct from physical pore simulation.'],
  ['E05', 'Uncertainty and digital twin', 'D02 E01', 'Separate measurement/model uncertainty, test holdout coverage and preserve build/data/solver lineage.'],
  ['F01', 'PyTorch prediction and optimization', 'D02 E05', 'Beat a simple baseline on independent grouped holdouts; test runtime and out-of-domain fallback.'],
  ['G01', 'Durable engineering jobs', 'A02 B02', 'Test cancellation, timeouts, restart recovery, concurrent jobs, cache identity and backup restoration.'],
  ['G02', 'Access and customer data', 'G01', 'Verify identity, roles, customer isolation, secret handling, licensing and deployment review.'],
  ['G03', 'Engineering reports and release gate', 'D03 E01 E05 G02', 'Test traceable reports, end-to-end flows, runtime budgets, installation and rollback.'],
  ['H01', 'Industrial pilot', 'B02 G03', 'Complete agreed customer tests, engineering review and comparison against the initial workflow.'],
  ['H02', 'Commercial launch', 'H01', 'Document pricing, delivery cost, data/IP responsibility, support and an evidenced go/no-go decision.'],
] as const;
export const ROADMAP_VERSION = 'v1';
export const ROADMAP_UPDATED = '2026-09-15';
const recordedMilestones: Record<string, MilestoneEvidence[]> = {
  A01: [
    { id: 'defined', evidence: 'docs/MODULE_EVIDENCE_INVENTORY.md: bounded inventory of 26 navigation modules and evidence limitations.', date: '2026-09-15', reviewer: 'Codex implementation record' },
    { id: 'implemented', evidence: 'docs/MODULE_EVIDENCE_INVENTORY.md: module-to-source, solver, environment and evidence mapping completed; graph coverage limitations disclosed.', date: '2026-09-15', reviewer: 'Codex implementation record' },
    { id: 'tested', evidence: 'tests/workstation.test.ts: four workstation checks passed within the 97-test unit suite; 115 inventory source references checked in the startup checkpoint. Independent inventory review remains pending.', date: '2026-09-15', reviewer: 'Codex verification record' },
  ],
  A02: [
    { id: 'defined', evidence: 'docs/ENVIRONMENT_READINESS.md defines interpreter selection, dependency diagnostics, CUDA smoke and separate Docker/ParaView checks. Full locked environment and tool verification remain incomplete.', date: '2026-09-15', reviewer: 'Codex implementation record' },
  ],
};
export const engineeringRoadmap: EngineeringTask[] = cards.map(([id, title, dependencies, acceptance]) => ({
  id, title, weight: 5, dependencies: dependencies ? dependencies.split(' ') : [], acceptance,
  milestones: recordedMilestones[id] ?? [], blocker: id === 'B01' ? 'Founder interviews and pilot access are not yet recorded.' : null,
  nextAction: id === 'A01' ? 'Review the active module inventory and its evidence gaps.' : 'Complete prerequisites and record the next acceptance evidence.',
}));
export const ENGINEERING_GATES = [
  { id: 'K0', title: 'Scope and environment', tasks: ['A01', 'A02', 'B01', 'B02'] },
  { id: 'K1', title: 'Scientific evidence', tasks: ['C01', 'C02', 'D01', 'D02', 'D03'] },
  // Conservative all-module scope. Narrowing pilot-specific gates requires a versioned scope decision.
  { id: 'K2', title: 'All-module pilot product', tasks: ['E01', 'E02', 'E03', 'E04', 'E05', 'F01', 'G01', 'G02', 'G03'] },
  { id: 'K3', title: 'Customer pilot', tasks: ['H01'] },
  { id: 'K4', title: 'Commercial launch', tasks: ['H02'] },
] as const;

export function summarizeRoadmap(tasks: readonly EngineeringTask[]) {
  if (!tasks.length) throw new Error('The roadmap must contain tasks.');
  const byId = new Map(tasks.map(task => [task.id, task]));
  if (byId.size !== tasks.length) throw new Error('Duplicate task ID.');
  const accepted = new Set(tasks.filter(task => task.milestones.some(m => m.id === 'accepted')).map(task => task.id));
  const visiting = new Set<string>(), visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error('Cyclic task dependencies.');
    if (visited.has(id)) return;
    const task = byId.get(id);
    if (!task) throw new Error(`Unknown dependency: ${id}`);
    visiting.add(id); task.dependencies.forEach(visit); visiting.delete(id); visited.add(id);
  }
  tasks.forEach(task => visit(task.id));
  const items = tasks.map(task => {
    if (!task.id.trim() || !task.title.trim() || !task.acceptance.trim() || !Number.isFinite(task.weight) || task.weight <= 0) throw new Error('Invalid task definition.');
    let percent = 0;
    task.milestones.forEach((milestone, index) => {
      if (MILESTONES[index]?.id !== milestone.id) throw new Error(`Milestone order: ${task.id}`);
      if (!milestone.evidence.trim() || !milestone.reviewer.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(milestone.date) || !Number.isFinite(Date.parse(milestone.date)) || new Date(milestone.date).toISOString().slice(0, 10) !== milestone.date) throw new Error(`Missing milestone evidence: ${task.id}`);
      percent += MILESTONES[index].weight;
    });
    const pendingDependencies = task.dependencies.filter(id => !accepted.has(id));
    if (accepted.has(task.id) && (task.blocker || pendingDependencies.length)) throw new Error(`Acceptance blocked: ${task.id}`);
    return { ...task, percent, pendingDependencies, accepted: accepted.has(task.id) };
  });
  const weight = items.reduce((sum, task) => sum + task.weight, 0);
  if (!Number.isFinite(weight)) throw new Error('Invalid total weight.');
  const earned = items.reduce((sum, task) => sum + task.weight / weight * task.percent, 0);
  return { items, earned, remaining: 100 - earned, acceptedCount: accepted.size,
    acceptedPercent: items.filter(task => task.accepted).reduce((sum, task) => sum + task.weight / weight * 100, 0) };
}

/** Gates are cumulative even where individual task dependencies allow parallel work. */
export function summarizeEngineeringGates(items: readonly { id: string; accepted: boolean }[]) {
  const acceptedTasks = new Set(items.filter(item => item.accepted).map(item => item.id));
  const pendingGates: string[] = [];
  return ENGINEERING_GATES.map(gate => {
    const missingTasks = gate.tasks.filter(id => !acceptedTasks.has(id));
    const pendingPredecessors = [...pendingGates];
    const accepted = missingTasks.length === 0 && pendingPredecessors.length === 0;
    if (!accepted) pendingGates.push(gate.id);
    return { ...gate, missingTasks, pendingPredecessors, accepted };
  });
}

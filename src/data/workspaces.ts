/** Product navigation and maturity are separate from the evidence of any result. */
export type ModuleScope = 'Production' | 'Research' | 'Preview' | 'Unresolved';
export type WorkspaceId = 'lpbf' | 'materials' | 'evidence';
export const WORKSPACES = [
  { id: 'lpbf', label: 'LPBF Engineering', description: 'Process setup through thermal research, build screening and qualification evidence.', defaultModule: '3d-distortion-lab' },
  { id: 'materials', label: 'Materials Intelligence', description: 'Characterization, thermodynamics and material models supporting engineering decisions.', defaultModule: 'database' },
  { id: 'evidence', label: 'Evidence & Qualification', description: 'Sources, experimental records, uncertainty and traceable engineering reports.', defaultModule: 'research-hub' },
] as const;

export const MODULES = [
  { id: '3d-distortion-lab', workspace: 'lpbf', label: 'LPBF workflow', scope: 'Research', description: 'One material and process vector; explicit simulation and screening scope.', next: 'lpbf-optimizer' },
  { id: 'lpbf-optimizer', workspace: 'lpbf', label: 'Bayesian Optimization', scope: 'Preview', description: 'Autonomous closed-loop search for optimal parameters balancing productivity and defect risk.', next: 'solidification-microstructure' },
  { id: 'solidification-microstructure', workspace: 'lpbf', label: 'Microstructure Lab', scope: 'Research', description: 'In-situ G/R solidification front tracking with Hunt-Lu PDAS, Kirkwood SDAS and dendrite morphology prediction.', next: 'thermomechanical-distortion' },
  { id: 'thermomechanical-distortion', workspace: 'lpbf', label: 'Thermomechanical Lab', scope: 'Research', description: 'Macro-scale inherent strain estimation and King & Cunningham keyhole porosity risk analysis.', next: 'experimental-validation' },
  { id: 'experimental-validation', workspace: 'lpbf', label: 'EBSD/CT Validation', scope: 'Research', description: 'Phase 10: Experimental EBSD/CT metric comparison and Traceability Pipeline.', next: 'modulus-fno-lab' },
  { id: 'modulus-fno-lab', workspace: 'lpbf', label: 'Modulus FNO Surrogate', scope: 'Preview', description: 'Phase 11: Part-scale 3D thermal history prediction using NVIDIA Modulus Fourier Neural Operators.', next: 'toolpath-studio' },
  { id: 'toolpath-studio', workspace: 'lpbf', label: 'Toolpath & Kinematics', scope: 'Research', description: 'Phase 12: Galvanometer mirror acceleration, G-Code/CLI delays and local thermal hotspot detection.', next: 'research-hub' },
  { id: 'database', workspace: 'materials', label: 'Materials Database', scope: 'Research', description: 'Handbook values and reviewed research references; source applicability requires review.', next: '3d-distortion-lab' },
  { id: 'alloy-builder', workspace: 'materials', label: 'Alloy Builder', scope: 'Research', description: 'Composition exploration and inverse design with model-dependent estimates.', next: 'phase-diagram' },
  { id: 'phase-diagram', workspace: 'materials', label: 'CALPHAD', scope: 'Research', description: 'Phase equilibrium within the selected database and model coverage.', next: 'ttt-cct-kinetics' },
  { id: 'ttt-cct-kinetics', workspace: 'materials', label: 'TTT / CCT', scope: 'Research', description: 'Transformation kinetics depend on supplied material parameters.', next: 'thermal-scheduler' },
  { id: 'thermal-scheduler', workspace: 'materials', label: 'Thermal Cycle', scope: 'Research', description: 'Prescribed thermal histories and kinetics estimates.', next: '3d-distortion-lab' },
  { id: 'xrd-lab', workspace: 'materials', label: 'XRD', scope: 'Research', description: 'Diffraction fitting, instrument correction and microstrain analysis.', next: 'research-hub' },
  { id: 'ebsd-lab', workspace: 'materials', label: 'EBSD & Grain', scope: 'Research', description: 'Texture and grain analysis; distinguish imported measurements from demonstrations.', next: 'research-hub' },
  { id: 'eds-lab', workspace: 'materials', label: 'SEM-EDS', scope: 'Research', description: 'Spectroscopy and composition characterization with method limitations.', next: 'alloy-builder' },
  { id: 'micrograph', workspace: 'materials', label: 'Micrograph Analysis', scope: 'Preview', description: 'Image segmentation requires scale calibration and independent inspection.', next: 'research-hub' },
  { id: 'electrochem-suite', workspace: 'materials', label: 'Corrosion / EIS', scope: 'Research', description: 'Electrochemical measurements, equivalent circuits and model fitting.', next: 'research-hub' },
  { id: 'hardness-tensile', workspace: 'materials', label: 'Mechanical Prediction', scope: 'Research', description: 'Hardness-based correlations are estimates, not tensile test certificates.', next: 'qualification' },
  { id: 'mechanical-ai-lab', workspace: 'materials', label: 'AI Property Prediction', scope: 'Preview', description: 'Model availability and training-domain coverage must be checked for each inference.', next: 'research-hub' },
  { id: 'icme-motor', workspace: 'materials', label: 'ICME Modeling', scope: 'Research', description: 'Coupled microstructure and property estimates with inherited assumptions.', next: '3d-distortion-lab' },
  { id: 'crystal', workspace: 'materials', label: 'Crystal Explorer', scope: 'Preview', description: 'Educational crystal visualization; not an experimental structure determination.', next: 'xrd-lab' },
  { id: 'materials-project', workspace: 'materials', label: 'Materials Project', scope: 'Research', description: 'External computed-material records; connection and coverage may be unavailable.', next: 'database' },
  { id: 'hypersonic-tps', workspace: 'materials', label: 'Extreme Environments', scope: 'Preview', description: 'Specialist thermal protection models; application-specific validation is required.', next: 'research-hub' },
  { id: 'calculators', workspace: 'materials', label: 'Engineering Calculators', scope: 'Research', description: 'Unit-aware engineering correlations within their stated assumptions.', next: 'database' },
  { id: 'research-hub', workspace: 'evidence', label: 'Research Hub', scope: 'Research', description: 'Research briefs, source comparison, numeric extraction and reviewed registry links.', next: 'experimental-data' },
  { id: 'experimental-data', workspace: 'evidence', label: 'Experimental Data', scope: 'Research', description: 'Measured findings, traceability gaps and feedback linked to simulation jobs.', next: '3d-distortion-lab' },
  { id: 'digital-twin', workspace: 'evidence', label: 'Digital Twin', scope: 'Research', description: 'Specimen history and module context; completeness does not establish qualification.', next: 'experimental-data' },
  { id: 'uq-lab', workspace: 'evidence', label: 'Uncertainty & Coupons', scope: 'Research', description: 'Sampling and uploaded coupon statistics; simulation scatter is not test evidence.', next: 'qualification' },
  { id: 'qualification', workspace: 'evidence', label: 'ASTM / MMPDS Screening', scope: 'Research', description: 'Protocol screening and coupon statistics; no automatic standards certification.', next: 'traceability' },
  { id: 'aerospace-pdf-audit', workspace: 'evidence', label: 'Audit Templates', scope: 'Preview', description: 'Demonstration report templates; no airworthiness or NADCAP approval.', next: 'traceability' },
  { id: 'traceability', workspace: 'evidence', label: 'Export / Traceability', scope: 'Research', description: 'Export active specimen, source provenance and linked evidence as a review package.', next: 'research-hub' },
  { id: 'copilot', workspace: 'evidence', label: 'Research Assistant', scope: 'Preview', description: 'AI suggestions require source verification before use in engineering decisions.', next: 'research-hub' },
] as const satisfies ReadonlyArray<{ id: string; workspace: WorkspaceId; label: string; scope: ModuleScope; description: string; next: string }>;
export type ModuleId = typeof MODULES[number]['id'];
export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === 'string' && MODULES.some(module => module.id === value);
}
export function moduleFromHash(hash: string): ModuleId | null {
  const value = hash.replace(/^#\/?/, '').split(/[?\/]/)[0];
  return isModuleId(value) ? value : null;
}
export function moduleHash(id: ModuleId): string { return `#/${id}`; }

# src/utils/materialDataPipeline.ts

- ModuleTargetId · type · L5-L13 — type ModuleTargetId = | "thermal-scheduler" | "xrd-lab" | "hardness-tensile" | "alloy-builder" | "icme-motor" | "phase-diagram" | "database" | "3d-distortion-lab";
- PipelineXRDPeak · interface · L15-L21 — interface PipelineXRDPeak
- PipelineMaterialPayload · interface · L23-L75 — interface PipelineMaterialPayload
- normalizeComposition · function · L82-L94 — function normalizeComposition(comp: Record<string, number | { min: number; max: number }>): Record<string, number>
- detectBaseMetal · function · L97-L120 — function detectBaseMetal(category: string, comp: Record<string, number>): "Ni" | "Fe" | "Ti" | "Al" | "Cu" | "Co" | "Mg" | "Other"
- deriveKineticProfile · function · L123-L441 — function deriveKineticProfile( matName: string, baseMetal: "Ni" | "Fe" | "Ti" | "Al" | "Cu" | "Co" | "Mg" | "Other", comp: Record<string, number>, yieldStrength: number ): { profile: MaterialThermalProfile; stages: ThermalStage[]; icme: PipelineMaterialPayload["icmeProfile"] }
- deriveHardnessProfile · function · L444-L507 — function deriveHardnessProfile( matName: string, category: string, baseMetal: string, yieldStrength: number, tensileStrength: number, youngsModulus: number, elongation: number, hardnessStr: string ): { hardnessProfile: HardnessAlloyPreset; hardnessHV: number; hardnessHRC?: number }
- deriveXRDProfile · function · L510-L578 — function deriveXRDProfile( matName: string, baseMetal: string, comp: Record<string, number> ): PipelineMaterialPayload["xrdProfile"]
- createPipelinePayloadFromMaterialSpec · function · L581-L626 — function createPipelinePayloadFromMaterialSpec(mat: MaterialSpec, sourceModule = "Materials Database"): PipelineMaterialPayload
- createPipelinePayloadFromCandidate · function · L629-L691 — function createPipelinePayloadFromCandidate( candidate: { alloyName?: string; chemicalFormula?: string; composition_wtPct?: Record<string, number>; composition?: Record<string, number>; predictedProperties?: any; baseMetal?: string; matrix?: string; }, sourceModule = "Alloy Formulator & Inverse Studio" ): PipelineMaterialPayload
- setActivePipelineMaterial · function · L694-L704 — function setActivePipelineMaterial(payload: PipelineMaterialPayload): void
- clearActivePipelineMaterial · function · L707-L717 — function clearActivePipelineMaterial(): void
- getActivePipelineMaterial · function · L720-L728 — function getActivePipelineMaterial(): PipelineMaterialPayload | null
- subscribeToPipelineMaterial · function · L731-L746 — function subscribeToPipelineMaterial(callback: (payload: PipelineMaterialPayload | null) => void): () => void
- handler · function · L732-L735 — handler = (e: Event)
- dispatchNavigateToTab · function · L749-L753 — function dispatchNavigateToTab(tabId: string): void

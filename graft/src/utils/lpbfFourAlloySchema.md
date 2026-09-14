# src/utils/lpbfFourAlloySchema.ts

- alloyRecords · function · L58-L61 — function alloyRecords(alloyId: LPBFAlloyId): TraceableLPBFRecord[]
- denseConductionHull · function · L63-L83 — function denseConductionHull(alloyId: LPBFAlloyId): { powerMin_W: number; powerMax_W: number; speedMin_mm_s: number; speedMax_mm_s: number; n: number; } | null
- evaluateLiteraturePvWindow · function · L85-L104 — function evaluateLiteraturePvWindow( alloyId: LPBFAlloyId, power_W: number, speed_mm_s: number ): { inside: boolean; box: (typeof LITERATURE_PV_WINDOWS)[LPBFAlloyId]; hull: ReturnType<typeof denseConductionHull> }
- HeatTreatmentCohort · interface · L106-L116 — interface HeatTreatmentCohort
- mean · function · L118-L121 — function mean(xs: number[]): number | null
- heatTreatmentCohorts · function · L123-L145 — function heatTreatmentCohorts(alloyId: LPBFAlloyId): HeatTreatmentCohort[]
- OrientationCohort · interface · L147-L156 — interface OrientationCohort
- orientationCohorts · function · L158-L179 — function orientationCohorts( alloyId: LPBFAlloyId, heatTreatment?: HeatTreatmentCondition ): OrientationCohort[]
- mapDisplayNameToAlloyId · function · L181-L188 — function mapDisplayNameToAlloyId(name: string): LPBFAlloyId | null
- alloyIdToAnisotropyKey · function · L190-L195 — function alloyIdToAnisotropyKey(id: LPBFAlloyId): string
- pickNum · function · L199-L201 — function pickNum(v: number | null, fallback: number): number
- AnisotropyPayload · type · L203-L233 — type AnisotropyPayload = { name: string; alloyFamily: string; asBuilt: { sigma_y_0deg_MPa: number; sigma_y_45deg_MPa: number; sigma_y_90deg_MPa: number; sigma_uts_0deg_MPa: number; sigma_uts_90deg_MPa: number; elongation_0deg_pct: number; elongation_90deg_pct: number; fatigueLimit_0deg_MPa: number; fatigueLimit_90deg_MPa: number; youngsModulus_0deg_GPa: number; youngsModulus_90deg_GPa: number; hallPetch_k_y: number; taylorFactor: number; dominantTexture: string; }; heatTreated_HIP: { sigma_y_0deg_MPa: number; sigma_y_90deg_MPa: number; sigma_uts_0deg_MPa: number; sigma_uts_90deg_MPa: number; elongation_0deg_pct: number; elongation_90deg_pct: number; fatigueLimit_0deg_MPa: number; fatigueLimit_90deg_MPa: number; anisotropyIndex_pct: number; }; };
- anisotropyOverlayFromGroundTruth · function · L235-L280 — function anisotropyOverlayFromGroundTruth( fallback: AnisotropyPayload, alloyId: LPBFAlloyId ): { data: AnisotropyPayload; grounded: boolean; sourced: boolean; dois: string[] }
- overlayAnisotropyFromGroundTruth · function · L282-L287 — function overlayAnisotropyFromGroundTruth( alloyId: LPBFAlloyId, fallback: AnisotropyPayload )

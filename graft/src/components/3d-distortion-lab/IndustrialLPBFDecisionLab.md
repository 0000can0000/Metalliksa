# src/components/3d-distortion-lab/IndustrialLPBFDecisionLab.tsx

- Props · interface · L33-L37 — interface Props
- IndustrialLPBFDecisionLab · function · L39-L620 — IndustrialLPBFDecisionLab: React.FC<Props> = ({ onOpenSlicer, onOpenGroundTruth, onOpenMeltPool })
- shortRisk · function · L622-L624 — function shortRisk(s: string): string
- verdictTone · function · L626-L630 — function verdictTone(v: PrintVerdict): string
- VerdictBanner · function · L632-L707 — VerdictBanner: React.FC<{ verdict: PrintVerdict; headline: string; reasons: string[]; modelId?: string; gates?: PythonLpbfScreeningGate[]; dominantGate?: string; pPrintable?: number; dhMean?: number; dhStd?: number; ambenchMape?: number | null; murakamiStatus?: string; qualStatus?: string; }> = ({ verdict, headline, reasons, modelId, gates, dominantGate, pPrintable, dhMean, dhStd, ambenchMape, murakamiStatus, qualStatus, })
- Metric · function · L709-L715 — Metric: React.FC<{ label: string; value: string; ok?: boolean; hint?: string }> = ({ label, value, ok = true, hint })
- Tiny · function · L717-L725 — Tiny: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon })
- SkeletonLines · function · L727-L729 — SkeletonLines: React.FC = ()

# src/components/LpbfBuildJobRail.tsx

- LpbfBuildJobStage · type · L19-L19 — type LpbfBuildJobStage = "alloy" | "cad" | "process" | "record";
- isAdvancedLpbfSubTab · function · L39-L41 — function isAdvancedLpbfSubTab(subTab: string): boolean
- subTabToBuildJobStage · function · L43-L54 — function subTabToBuildJobStage( subTab: string, focusedStage?: LpbfBuildJobStage | null ): LpbfBuildJobStage | null
- gateChipTone · function · L56-L60 — function gateChipTone(status: string): string
- gateChipLabel · function · L62-L75 — function gateChipLabel(id: string): string
- screeningAlloyWarning · function · L77-L83 — function screeningAlloyWarning(name: string, baseMetal: string, alloyId: LPBFAlloyId): string | null
- verdictTone · function · L85-L89 — function verdictTone(verdict: PrintVerdict): string
- Props · interface · L91-L96 — interface Props
- LpbfBuildJobRail · function · L98-L584 — LpbfBuildJobRail: React.FC<Props> = ({ activeSubTab, focusedWizardStage, onNavigateStage, onBackToDecision, })
- copyJob · function · L175-L183 — copyJob = async ()
- JobSlider · function · L586-L609 — JobSlider: React.FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; }> = ({ label, value, min, max, step, onChange })

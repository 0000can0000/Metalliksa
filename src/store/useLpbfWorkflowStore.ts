import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LPBF_WORKFLOW_STAGES = [
  { id: "setup", label: "Process Setup", purpose: "Identify the build, machine and powder before selecting a process vector." },
  { id: "material", label: "Material & Parameters", purpose: "Review the shared alloy, units and process window. Changes apply across LPBF labs." },
  { id: "thermal", label: "Thermal Simulation", purpose: "Choose a physical model, inspect material evidence and run the existing worker." },
  { id: "melt-pool", label: "Melt Pool Analysis", purpose: "Inspect the completed job's geometry, fields and numerical evidence." },
  { id: "defects", label: "Defect & Regime Screening", purpose: "Review the Python build-job decision and its assumptions. Defect risks are screening outputs." },
  { id: "build", label: "Build / Slicer", purpose: "Prepare geometry and slicing with the same material and process vector." },
  { id: "comparison", label: "Experimental Comparison", purpose: "Attach real measurements and review comparison separately from numerical verification." },
  { id: "qualification", label: "Qualification Report", purpose: "Export the current context, executed inputs, evidence and unresolved qualification gaps." },
] as const;
export type LpbfWorkflowStage = typeof LPBF_WORKFLOW_STAGES[number]["id"];
export function isLpbfWorkflowStage(value: unknown): value is LpbfWorkflowStage {
  return LPBF_WORKFLOW_STAGES.some(stage => stage.id === value);
}
export interface LpbfBuildContext {
  buildId: string;
  machine: string;
  powderLot: string;
  powderCondition: string;
  heatTreatment: string;
  measurementMethod: string;
  notes: string;
}
interface LpbfWorkflowState {
  stage: LpbfWorkflowStage;
  context: LpbfBuildContext;
  setStage: (stage: LpbfWorkflowStage) => void;
  updateContext: (patch: Partial<LpbfBuildContext>) => void;
}
export const useLpbfWorkflowStore = create<LpbfWorkflowState>()(persist((set) => ({
  stage: "setup",
  context: {buildId:"",machine:"",powderLot:"",powderCondition:"",heatTreatment:"",measurementMethod:"",notes:""},
  setStage: stage => set({stage}),
  updateContext: patch => set(state => ({context:{...state.context,...patch}})),
}), {
  name:"metalliksa.lpbf.workflow.v1",
  partialize: state => ({stage:state.stage,context:state.context}),
  merge: (saved, current) => {
    const persisted = saved as Partial<LpbfWorkflowState> | undefined;
    const context = {...current.context};
    for (const key of Object.keys(context) as (keyof LpbfBuildContext)[]) {
      if (typeof persisted?.context?.[key] === "string") context[key] = persisted.context[key];
    }
    return {...current, stage:isLpbfWorkflowStage(persisted?.stage)?persisted.stage:current.stage,context};
  },
}));

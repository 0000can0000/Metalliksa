import React from "react";
import { Box, Layers, Sliders, AlertTriangle, Database, ChevronRight } from "lucide-react";
import { useMaterialSpecimenStore, LpbfScanStrategy } from "../store/useMaterialSpecimenStore";
import { useLpbfBuildJobPython } from "../store/useLpbfBuildJobStore";
import type { PrintVerdict } from "../utils/lpbfIndustrialDecision";

export type LpbfBuildJobStage = "cad" | "scan" | "process" | "regime" | "defects" | "record";

export const LPBF_BUILD_JOB_STAGES: {
  id: LpbfBuildJobStage;
  step: string;
  label: string;
  subTab: string;
}[] = [
  { id: "cad", step: "1", label: "STL / CAD", subTab: "basic-stl-slicer" },
  { id: "scan", step: "2", label: "Slice + Scan", subTab: "multi-track-accumulation" },
  { id: "process", step: "3", label: "Decision (Python)", subTab: "industrial-decision" },
  { id: "regime", step: "4", label: "Melt pool", subTab: "3d-cross-section-melt-pool" },
  { id: "defects", step: "5", label: "Pores / Distortion / Ṫ", subTab: "3d-macro-distortion" },
  { id: "record", step: "6", label: "DOI Specimen", subTab: "ground-truth-foundation" },
];

export function subTabToBuildJobStage(subTab: string): LpbfBuildJobStage {
  if (subTab === "basic-stl-slicer") return "cad";
  if (subTab === "multi-track-accumulation") return "scan";
  if (subTab === "industrial-decision") return "process";
  if (subTab === "3d-cross-section-melt-pool" || subTab === "rosenthal-laser-profile") return "regime";
  if (subTab === "2d-thermal-melt-pool" || subTab === "operando-synchrotron") return "regime";
  if (
    subTab === "3d-macro-distortion" ||
    subTab === "marangoni-pore-heatmap" ||
    subTab === "solidification-front-cet" ||
    subTab === "anisotropic-fatigue-estimator"
  ) {
    return "defects";
  }
  return "record";
}

function verdictTone(verdict: PrintVerdict): string {
  if (verdict === "printable") return "text-emerald-300 border-emerald-500/40 bg-emerald-500/10";
  if (verdict === "risky") return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  return "text-rose-300 border-rose-500/40 bg-rose-500/10";
}

interface Props {
  activeSubTab: string;
  onNavigateStage: (subTab: string) => void;
}

export const LpbfBuildJobRail: React.FC<Props> = ({ activeSubTab, onNavigateStage }) => {
  const specimen = useMaterialSpecimenStore((s) => s.activeSpecimen);
  const updateLpbfProcess = useMaterialSpecimenStore((s) => s.updateLpbfProcess);
  const { job, error, busy } = useLpbfBuildJobPython();
  const lpbf = specimen.lpbf;
  const activeStage = subTabToBuildJobStage(activeSubTab);
  const decision = job?.verdict ?? null;
  const thermal = job?.thermal ?? null;
  const slicer = job?.slicer ?? null;
  const pp = thermal?.processParameters;
  const geo = thermal?.meltPoolGeometry;
  const lof = decision?.lofGeometry;
  const pv = decision?.literatureWindow;
  const lofTight =
    decision != null &&
    (decision.lofGeometry.widthOverHatch < 1.05 || decision.lofGeometry.depthOverLayer < 1.15);

  return (
    <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-3.5 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-white font-mono">Build Job — Digital Twin</span>
          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[280px]">
            {specimen.name}
          </span>
        </div>
        <div
          className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border ${
            decision
              ? verdictTone(decision.verdict)
              : busy
                ? "text-slate-300 border-[#162032] bg-[#0c1322]"
                : error
                  ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
                  : "text-slate-400 border-[#162032] bg-[#0c1322]"
          }`}
          title={
            decision?.headline ||
            error ||
            "Waiting for Python /api/python/lpbf-build-job (rosenthal-screening-v1)"
          }
        >
          {decision ? decision.verdict : busy ? "Evaluating…" : error ? "Python offline" : "Python pending"}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {LPBF_BUILD_JOB_STAGES.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <button
              type="button"
              onClick={() => onNavigateStage(stage.subTab)}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                activeStage === stage.id
                  ? "bg-sky-500/20 text-sky-200 border-sky-400/50"
                  : "bg-[#0c1322] text-slate-400 border-[#162032] hover:text-white"
              }`}
            >
              <span className="text-slate-500 mr-1">{stage.step}</span>
              {stage.label}
            </button>
            {idx < LPBF_BUILD_JOB_STAGES.length - 1 && (
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <JobSlider
          label="P (W)"
          value={lpbf.laserPower_W}
          min={100}
          max={800}
          step={10}
          onChange={(v) => updateLpbfProcess({ laserPower_W: v })}
        />
        <JobSlider
          label="v (mm/s)"
          value={lpbf.scanSpeed_mms}
          min={200}
          max={2500}
          step={10}
          onChange={(v) => updateLpbfProcess({ scanSpeed_mms: v })}
        />
        <JobSlider
          label="h (µm)"
          value={lpbf.hatch_um}
          min={40}
          max={200}
          step={5}
          onChange={(v) => updateLpbfProcess({ hatch_um: v })}
        />
        <JobSlider
          label="t (µm)"
          value={lpbf.layer_um}
          min={20}
          max={80}
          step={5}
          onChange={(v) => updateLpbfProcess({ layer_um: v })}
        />
        <JobSlider
          label="d (µm)"
          value={lpbf.beamDiameter_um}
          min={40}
          max={140}
          step={5}
          onChange={(v) => updateLpbfProcess({ beamDiameter_um: v })}
        />
        <JobSlider
          label="Preheat (°C)"
          value={lpbf.preheatTemp_C}
          min={25}
          max={500}
          step={5}
          onChange={(v) => updateLpbfProcess({ preheatTemp_C: v })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
        <span className="text-slate-500" title={(job?.assumptions || []).join(" ")}>
          {job?.modelId || "rosenthal-screening-v1"}
        </span>
        <span className="flex items-center gap-1">
          <Sliders className="w-3 h-3 text-cyan-400" />
          VED {pp?.volumetricEnergyDensity_J_mm3 ?? "—"} J/mm³
        </span>
        <span>LED {pp ? (pp.linearEnergyDensity_J_m / 1000).toFixed(3) : "—"} J/mm</span>
        <span>I₀ {pp?.peakIntensity_MW_cm2 ?? "—"} MW/cm²</span>
        <span>ΔH/hₛ {pp?.normalizedEnthalpy ?? "—"}</span>
        <span>W {geo?.width_um ?? "—"} µm · D {geo?.depth_um ?? "—"} µm</span>
        <span className={lof && lof.widthOverHatch < 1.05 ? "text-amber-300" : ""}>
          W/h {lof ? lof.widthOverHatch.toFixed(2) : "—"}
        </span>
        <span className={lof && lof.depthOverLayer < 1.15 ? "text-amber-300" : ""}>
          D/t {lof ? lof.depthOverLayer.toFixed(2) : "—"}
        </span>
        <span className={pv && !pv.inside ? "text-amber-300" : "text-slate-400"}>
          P–v {pv ? (pv.inside ? "inside box" : "outside box") : "—"}
        </span>
        <span>
          Ṫ{" "}
          {thermal?.solidificationKinetics.coolingRate_K_s != null
            ? `${(thermal.solidificationKinetics.coolingRate_K_s / 1e6).toFixed(2)}×10⁶ K/s`
            : "—"}
        </span>
        <span>
          {slicer?.buildTimeSummary ? `${slicer.buildTimeSummary.totalBuildTime_hr} h` : "— h"}
          {slicer?.meshMetrics ? ` · ${slicer.meshMetrics.estimatedPartMass_g} g` : ""}
        </span>
        <span className={slicer?.geometrySource === "uploaded-stl" ? "text-sky-300" : "text-slate-500"}>
          {slicer?.geometrySource === "uploaded-stl"
            ? `STL ${slicer.cadAssetName || "mesh"}`
            : slicer
              ? `Demo ${slicer.preset || "CAD"}`
              : "STL pending"}
        </span>
        {lofTight && (
          <span className="text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Hatch/layer overlap below Python LoF gates
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Layers className="w-3 h-3 text-sky-400" />
          {lpbf.scanStrategy}
        </span>
        {lpbf.cadAssetName && (
          <span className="text-sky-300 truncate max-w-[160px]">{lpbf.cadAssetName}</span>
        )}
        {lpbf.specimenDoi && (
          <span className="flex items-center gap-1 text-emerald-300">
            <Database className="w-3 h-3" />
            {lpbf.specimenDoi}
          </span>
        )}
        <select
          value={lpbf.scanStrategy}
          onChange={(e) => updateLpbfProcess({ scanStrategy: e.target.value as LpbfScanStrategy })}
          className="bg-[#0c1322] border border-[#162032] rounded px-1.5 py-0.5 text-[10px] text-slate-200"
        >
          <option value="meander-67">Meander 67°</option>
          <option value="island">Island 5×5</option>
          <option value="stripe">Stripe</option>
        </select>
      </div>
    </div>
  );
};

const JobSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, onChange }) => (
  <label className="block space-y-0.5">
    <div className="flex justify-between text-[10px] font-mono">
      <span className="text-slate-400">{label}</span>
      <span className="text-sky-300 font-bold">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 accent-sky-400 cursor-pointer"
    />
  </label>
);

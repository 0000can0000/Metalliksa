import React, { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Gauge,
  Grid,
  Layers,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Zap,
} from "lucide-react";
import { useMaterialSpecimenStore } from "../../store/useMaterialSpecimenStore";
import { useLpbfBuildMeshStore } from "../../store/useLpbfBuildMeshStore";
import { useLpbfBuildJobPython } from "../../store/useLpbfBuildJobStore";
import {
  findNearestLiteratureRecord,
  inferSlicerPreset,
  mapSpecimenToSolverMaterials,
  PrintVerdict,
} from "../../utils/lpbfIndustrialDecision";
import { heatTreatmentCohorts, orientationCohorts } from "../../utils/lpbfFourAlloySchema";

interface Props {
  onOpenSlicer?: () => void;
  onOpenGroundTruth?: () => void;
}

export const IndustrialLPBFDecisionLab: React.FC<Props> = ({ onOpenSlicer, onOpenGroundTruth }) => {
  const specimen = useMaterialSpecimenStore((s) => s.activeSpecimen);
  const updateLpbfProcess = useMaterialSpecimenStore((s) => s.updateLpbfProcess);
  const liveMesh = useLpbfBuildMeshStore((s) => s.mesh);
  const lpbf = specimen.lpbf;
  const { job, error, busy, roundTripMs, rerun } = useLpbfBuildJobPython();

  const materials = useMemo(
    () => mapSpecimenToSolverMaterials(specimen.name, specimen.baseMetal),
    [specimen.name, specimen.baseMetal]
  );

  const thermal = job?.thermal ?? null;
  const slicer = job?.slicer ?? null;
  const decision = job?.verdict ?? null;
  const litWindow = job?.verdict?.literatureWindow;
  const htCohorts = useMemo(() => heatTreatmentCohorts(materials.alloyId), [materials.alloyId]);
  const oriCohorts = useMemo(() => orientationCohorts(materials.alloyId), [materials.alloyId]);

  const literature = useMemo(
    () =>
      findNearestLiteratureRecord(
        materials.alloyId,
        lpbf.laserPower_W,
        lpbf.scanSpeed_mms,
        lpbf.hatch_um,
        lpbf.layer_um
      ),
    [materials.alloyId, lpbf.laserPower_W, lpbf.scanSpeed_mms, lpbf.hatch_um, lpbf.layer_um]
  );

  const yieldOk =
    literature && literature.record.properties.yieldStrength_MPa
      ? specimen.yieldStrength_25C_MPa >= literature.record.properties.yieldStrength_MPa * 0.9
      : null;
  const utsOk =
    literature && literature.record.properties.ultimateTensileStrength_MPa
      ? specimen.uts_25C_MPa >= literature.record.properties.ultimateTensileStrength_MPa * 0.9
      : null;

  return (
    <div className="space-y-4 font-mono">
      <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
              <Gauge className="w-3.5 h-3.5" />
              Industrial decision engine
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Python Build Job verdict</h2>
            <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">
              One Python call owns printability (LoF, keyhole, balling, recoater, literature P–v). The UI does not re-score. Melt pool is Rosenthal screening, not Goldak FEA. Analytical labs remain under Advanced physics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {roundTripMs != null && (
              <span className="text-[10px] text-slate-500">
                Round-trip {roundTripMs} ms
                {thermal?.computeTimeMs != null ? ` · solver ${thermal.computeTimeMs} ms` : ""}
              </span>
            )}
            <button
              type="button"
              onClick={() => void rerun()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
              Re-run Python
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {error} Start the Vite/API stack so <code className="text-amber-100">/api/python/lpbf-build-job</code> can reach{" "}
            <code className="text-amber-100">python/lpbf_build_job_solver.py</code>.
          </span>
        </div>
      )}

      {decision && thermal && (
        <VerdictBanner verdict={decision.verdict} headline={decision.headline} reasons={decision.reasons} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white">Is this P–v window safe?</h3>
            <span className="ml-auto text-[10px] text-slate-500">{materials.pythonThermal}</span>
          </div>
          {thermal?.processWindowMap ? (
            <>
              <div className="grid grid-cols-7 gap-1">
                {thermal.processWindowMap.grid.map((pt, idx) => {
                  const isCurrent =
                    Math.abs(pt.power_W - lpbf.laserPower_W) < 45 &&
                    Math.abs(pt.speed_mm_s - lpbf.scanSpeed_mms) < 220;
                  return (
                    <button
                      key={idx}
                      type="button"
                      title={`${pt.power_W} W, ${pt.speed_mm_s} mm/s — ${pt.regime}`}
                      onClick={() =>
                        updateLpbfProcess({ laserPower_W: pt.power_W, scanSpeed_mms: pt.speed_mm_s })
                      }
                      className={`p-1 rounded text-left border text-[8px] font-mono ${
                        isCurrent ? "ring-2 ring-sky-400 border-white z-10" : "border-slate-800/70"
                      }`}
                      style={{ backgroundColor: `${pt.color}22` }}
                    >
                      <div className="flex justify-between text-white">
                        <span>{pt.power_W}W</span>
                        <span className="text-slate-400">{pt.speed_mm_s}</span>
                      </div>
                      <div style={{ color: pt.color }}>{pt.regime.split(" ")[0]}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">
                Click a cell to load P and v into the Build Job store. Geometric LoF uses W vs h and D vs t. Literature box:{" "}
                {litWindow
                  ? `${litWindow.box.powerMin_W}–${litWindow.box.powerMax_W} W · ${litWindow.box.speedMin_mm_s}–${litWindow.box.speedMax_mm_s} mm/s ${litWindow.inside ? "(inside)" : "(outside)"}.`
                  : "waiting for Python."}
              </p>
              <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Conduction</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500" /> Keyhole</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> LoF</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500" /> Balling</span>
              </div>
            </>
          ) : (
            <SkeletonLines />
          )}
        </div>

        <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white">Will the part print?</h3>
            <button type="button" onClick={onOpenSlicer} className="ml-auto text-[10px] text-cyan-300 underline">
              STL slicer
            </button>
          </div>
          {thermal && decision ? (
            <div className="grid grid-cols-2 gap-2">
              <Metric
                label="W / h"
                value={decision.lofGeometry.widthOverHatch.toFixed(2)}
                ok={decision.lofGeometry.widthOverHatch >= 1.05}
                hint="> 1.05"
              />
              <Metric
                label="D / t"
                value={decision.lofGeometry.depthOverLayer.toFixed(2)}
                ok={decision.lofGeometry.depthOverLayer >= 1.15}
                hint="> 1.15"
              />
              <Metric
                label="ΔH/hₛ"
                value={String(thermal.processParameters.normalizedEnthalpy)}
                ok={thermal.processParameters.normalizedEnthalpy < 30}
                hint="King onset ~30"
              />
              <Metric
                label="P–v literature"
                value={decision.literatureWindow.inside ? "Inside box" : "Outside box"}
                ok={decision.literatureWindow.inside}
                hint={`${decision.literatureWindow.box.powerMin_W}–${decision.literatureWindow.box.powerMax_W} W`}
              />
              <Metric label="Recoater" value={shortRisk(thermal.defectDiagnostics.recoaterCrashRisk)} ok={!thermal.defectDiagnostics.recoaterCrashRisk.startsWith("High")} />
              <Metric label="Balling" value={shortRisk(thermal.defectDiagnostics.ballingInstabilityRisk)} ok={!thermal.defectDiagnostics.ballingInstabilityRisk.startsWith("High")} />
            </div>
          ) : (
            <SkeletonLines />
          )}
          {slicer?.buildTimeSummary && (
            <div className="rounded-lg border border-[#162032] bg-[#060a12] p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {slicer.geometrySource === "uploaded-stl"
                  ? `Live STL ${liveMesh?.name || slicer.cadAssetName || "mesh"}`
                  : `Demo preset ${slicer.preset || inferSlicerPreset(lpbf.cadAssetName)}`}{" "}
                · {slicer.buildTimeSummary.totalLayers} layers · {slicer.buildTimeSummary.totalBuildTime_hr} h
              </div>
              <div className="text-[10px] text-slate-500">
                Laser {slicer.buildTimeSummary.totalLaserTime_hr} h · Recoat {slicer.buildTimeSummary.totalRecoatTime_hr} h · Peak area{" "}
                {slicer.buildTimeSummary.peakLayerArea_mm2} mm²
                {slicer.meshMetrics ? ` · ~${slicer.meshMetrics.estimatedPartMass_g} g` : ""}
                {slicer.meshMetrics
                  ? ` · ${slicer.meshMetrics.triangleCount} tris`
                  : ""}
              </div>
              {liveMesh && liveMesh.nativeTriangleCount > liveMesh.usedTriangleCount && (
                <p className="text-[10px] text-slate-500">
                  Uniform subsample {liveMesh.usedTriangleCount} of {liveMesh.nativeTriangleCount} triangles for the Python slicer.
                </p>
              )}
              {!liveMesh && lpbf.cadAssetName && (
                <p className="text-[10px] text-amber-300/80">
                  Filename {lpbf.cadAssetName} is on the twin but the triangle buffer is session-only — re-upload the STL in the slicer to slice the live mesh.
                </p>
              )}
              {!liveMesh && !lpbf.cadAssetName && (
                <p className="text-[10px] text-amber-300/80">No uploaded STL on the twin — using a demo CAD preset. Open the slicer to bind a CAD file.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs font-bold text-white">Is warpage acceptable?</h3>
          </div>
          {thermal ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="Distortion index"
                  value={thermal.defectDiagnostics.distortionIndex.toFixed(2)}
                  ok={thermal.defectDiagnostics.distortionIndex < 0.65}
                  hint="< 0.65"
                />
                <Metric
                  label="σ_res (MPa)"
                  value={String(thermal.defectDiagnostics.effectiveResidualStress_MPa)}
                  ok={thermal.defectDiagnostics.effectiveResidualStress_MPa < specimen.yieldStrength_25C_MPa * 0.7}
                  hint={`< 0.7 Rp0.2 (${Math.round(specimen.yieldStrength_25C_MPa * 0.7)})`}
                />
                <Metric label="Peak T (°C)" value={String(thermal.hydrodynamicsAndRecoil.peakTemperature_C)} ok />
                <Metric label="Preheat (°C)" value={String(lpbf.preheatTemp_C)} ok={lpbf.preheatTemp_C >= 80} />
              </div>
              <p className="text-[10px] text-slate-500">
                Layer-equivalent inherent strain proxy from the Python residual-stress index — not melt-pool FEM. Raise preheat or switch to island scan if the index stays high.
              </p>
            </>
          ) : (
            <SkeletonLines />
          )}
        </div>

        <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-white">Does the specimen pass vs literature?</h3>
            <button type="button" onClick={onOpenGroundTruth} className="ml-auto text-[10px] text-sky-300 underline">
              Ground truth
            </button>
          </div>
          {literature ? (
            <div className="space-y-2 text-[11px]">
              <div className="text-slate-200 font-bold">{literature.record.build.alloyName}</div>
              <div className="text-slate-400">
                {literature.record.source.citation} ({literature.record.source.year}) · DOI {literature.record.source.doi || "—"}
              </div>
              <div className="text-slate-500">
                Lit. P {literature.record.params.laserPower_W} W · v {literature.record.params.scanSpeed_mm_s} mm/s · h{" "}
                {literature.record.params.hatchSpacing_um} µm · t {literature.record.params.layerThickness_um} µm · match Δ{" "}
                {literature.distance.toFixed(2)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric
                  label="Density %"
                  value={literature.record.properties.relativeDensity_pct.toFixed(2)}
                  ok={literature.record.properties.relativeDensity_pct >= 99.5}
                />
                <Metric
                  label="Rp0.2 twin vs lit"
                  value={`${specimen.yieldStrength_25C_MPa} / ${literature.record.properties.yieldStrength_MPa ?? "—"}`}
                  ok={yieldOk !== false}
                />
                <Metric
                  label="UTS twin vs lit"
                  value={`${specimen.uts_25C_MPa} / ${literature.record.properties.ultimateTensileStrength_MPa ?? "—"}`}
                  ok={utsOk !== false}
                />
              </div>
              {htCohorts.length > 0 && (
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  {htCohorts.map((c) => (
                    <div key={c.label}>
                      {c.label}: n={c.n}
                      {c.meanYS != null ? ` · Rp0.2 ${c.meanYS}` : ""}
                      {c.meanUTS != null ? ` · UTS ${c.meanUTS}` : ""}
                      {c.meanElong != null ? ` · A ${c.meanElong}%` : ""}
                    </div>
                  ))}
                </div>
              )}
              {oriCohorts.length > 0 && (
                <div className="text-[10px] text-slate-500">
                  Orientation coupons: {oriCohorts.map((c) => `${c.label} n=${c.n}`).join(" · ")}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No traceable coupon in the library for this alloy yet.</p>
          )}
        </div>
      </div>

      {thermal && (
        <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-3.5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <Tiny label="Engine" value={job?.modelId || "Python"} icon={<Cpu className="w-3 h-3" />} />
          <Tiny label="Regime" value={thermal.meltPoolGeometry.regime} icon={<Zap className="w-3 h-3" />} />
          <Tiny label="W×D (µm)" value={`${thermal.meltPoolGeometry.width_um}×${thermal.meltPoolGeometry.depth_um}`} icon={<Layers className="w-3 h-3" />} />
          <Tiny label="ΔH/hₛ" value={String(thermal.processParameters.normalizedEnthalpy)} icon={<Activity className="w-3 h-3" />} />
          <Tiny label="I₀ MW/cm²" value={String(thermal.processParameters.peakIntensity_MW_cm2 ?? "—")} />
          <Tiny label="LED J/mm" value={(thermal.processParameters.linearEnergyDensity_J_m / 1000).toFixed(3)} />
          <Tiny label="VED J/mm³" value={String(thermal.processParameters.volumetricEnergyDensity_J_mm3)} />
          <Tiny label="Ṫ K/s" value={thermal.solidificationKinetics.coolingRate_K_s.toExponential(1)} />
        </div>
      )}

      {job?.assumptions && job.assumptions.length > 0 && (
        <div className="rounded-2xl border border-[#1e2d46] bg-[#090e18] p-3.5 space-y-2">
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            {job.modelId} assumptions
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-400">
            {job.assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function shortRisk(s: string): string {
  return s.split(" ")[0] || s;
}

function verdictTone(v: PrintVerdict): string {
  if (v === "printable") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  if (v === "risky") return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  return "border-rose-500/40 bg-rose-500/10 text-rose-100";
}

const VerdictBanner: React.FC<{ verdict: PrintVerdict; headline: string; reasons: string[] }> = ({
  verdict,
  headline,
  reasons,
}) => (
  <div className={`rounded-2xl border p-4 ${verdictTone(verdict)}`}>
    <div className="flex items-center gap-2 font-bold text-sm">
      {verdict === "printable" ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
      {headline}
    </div>
    <ul className="mt-2 space-y-1 text-[11px] opacity-90 list-disc pl-5">
      {reasons.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  </div>
);

const Metric: React.FC<{ label: string; value: string; ok?: boolean; hint?: string }> = ({ label, value, ok = true, hint }) => (
  <div className={`rounded-lg border px-2 py-1.5 ${ok ? "border-[#162032] bg-[#060a12]" : "border-amber-500/40 bg-amber-500/10"}`}>
    <div className="text-[9px] text-slate-500 uppercase">{label}</div>
    <div className="text-[12px] text-white font-bold truncate">{value}</div>
    {hint && <div className="text-[9px] text-slate-500">{hint}</div>}
  </div>
);

const Tiny: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-lg border border-[#162032] bg-[#060a12] px-2 py-1.5">
    <div className="flex items-center gap-1 text-[9px] text-slate-500 uppercase">
      {icon}
      {label}
    </div>
    <div className="text-[11px] text-slate-200 truncate">{value}</div>
  </div>
);

const SkeletonLines: React.FC = () => (
  <div className="h-24 rounded-lg bg-[#060a12] border border-[#162032] animate-pulse" />
);

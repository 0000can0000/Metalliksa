import React, { useEffect, useRef, useState } from "react";
import { simulationApi, SimulationCapabilities, SimulationInput, SimulationJob, SimulationMode, SimulationResult } from "../../services/lpbfSimulationService";
import { useMaterialSpecimenStore } from "../../store/useMaterialSpecimenStore";

const modes: { id: SimulationMode; label: string; description: string }[] = [
  { id: "screening", label: "Quick Screening", description: "Seconds · Rosenthal / Goldak conduction estimates · low confidence" },
  { id: "standard", label: "Standard Simulation", description: "Seconds to minutes · transient enthalpy / powder / scan history · unvalidated thermal model" },
  { id: "high-fidelity", label: "High-Fidelity Simulation", description: "Free-surface CFD unavailable · explicitly falls back to Screening only" },
  { id: "calibration", label: "Calibration / Validation", description: "Transient prediction vs measured width/depth · calibration is not independent validation" },
];
const fmt = (n: unknown) => typeof n === "number" ? n.toLocaleString("en-US", { maximumSignificantDigits: 5 }) : "Not resolved";

export function LpbfEngineeringSimulation({ input }: { input: SimulationInput }) {
  const sharedStrategy = useMaterialSpecimenStore(s => s.activeSpecimen.lpbf.scanStrategy);
  const [mode, setMode] = useState<SimulationMode>("screening");
  const [settings, setSettings] = useState<Partial<SimulationInput>>({ mesh_um: 20, maxDt_s: 1e-6, tracks: 1, layers: 1, trackLength_um: 600, dwell_s: .0002, cooling_s: .0005, packingFraction: .55, powderConductivityRatio: .12, convection_W_m2K: 20, timeout_s: 300, scanAngle_deg: 0, layerRotation_deg: 67, study: "none", backend: "auto" });
  const [caps, setCaps] = useState<SimulationCapabilities>();
  const [job, setJob] = useState<SimulationJob>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [measurementText, setMeasurementText] = useState("");
  const [width, setWidth] = useState(""); const [depth, setDepth] = useState("");
  const [source, setSource] = useState(""); const [customMaterial, setCustomMaterial] = useState("");
  const [propertyText, setPropertyText] = useState("");
  const submitted = useRef("");
  const [loadedSignature, setLoadedSignature] = useState("");
  const signature = JSON.stringify([input, sharedStrategy, settings, mode, width, depth, source, measurementText, customMaterial, propertyText]);
  const active = job?.status === "queued" || job?.status === "running";
  useEffect(() => { let live = true; simulationApi.capabilities().then(c => { if (live) setCaps(c); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, []);
  useEffect(() => {
    if (!active || !job) return;
    let live = true; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await simulationApi.get(job.id);
        if (live) { setJob(next); if (next.status === "completed") setLoadedSignature(submitted.current); }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "Worker connection failed"); }
      if (live) timer = setTimeout(poll, 1000);
    };
    timer = setTimeout(poll, 500);
    return () => { live = false; clearTimeout(timer); };
  }, [active, job?.id]);
  const submit = async () => {
    setBusy(true); setError("");
    try {
      if (sharedStrategy === "island" && !settings.strategy && (mode === "standard" || mode === "calibration")) throw new Error("Shared island scanning is not implemented. Select a supported strategy explicitly in simulation settings.");
      const payload: SimulationInput = { ...input, ...settings, mode, strategy: settings.strategy ?? (sharedStrategy === "stripe" ? "unidirectional" : "meander") };
      if (customMaterial) payload.material = customMaterial;
      if (propertyText.trim()) payload.properties = JSON.parse(propertyText);
      if (measurementText.trim()) payload.measurements = JSON.parse(measurementText);
      else if (width || depth || mode === "calibration") payload.measurements = [{ width_um: Number(width), depth_um: Number(depth), source }];
      submitted.current = signature;
      const next = await simulationApi.submit(payload); setJob(next);
      if (next.status === "completed") setLoadedSignature(signature);
    } catch (e) { setError(e instanceof Error ? e.message : "Submission failed"); }
    finally { setBusy(false); }
  };
  const r = job?.result;
  const download = () => {
    if (!r) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `lpbf-${job.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="rounded-xl border border-sky-800 bg-slate-950 p-4 space-y-3 text-slate-200" aria-label="LPBF engineering simulation">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-base">Melt pool · engineering simulation</h3><span>{caps ? `${caps.openfoamVersion || "OpenFOAM unavailable"} · ${caps.openfoamThermal ? "thermal worker ready" : "reference worker"}` : "Connecting to worker…"}</span></div>
    <div className="flex flex-wrap items-center gap-3">
      <label>Mode <select className="bg-slate-900 border border-slate-600 rounded p-2" value={mode} onChange={e => setMode(e.target.value as SimulationMode)}>{modes.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
      <button className="rounded bg-sky-700 px-4 py-2 disabled:opacity-40" disabled={busy || active} onClick={submit}>{busy ? "Submitting…" : "Run simulation"}</button>
      {active && <button className="rounded border border-red-600 px-3 py-2" onClick={() => simulationApi.cancel(job.id).then(setJob).catch(e => setError(e.message))}>Cancel</button>}
      {r && <button className="underline" onClick={download}>Export result JSON</button>}
    </div>
    <p className="text-slate-400">{modes.find(m => m.id === mode)?.description}</p>
    <p className="text-slate-400">Process vector: {input.material} · {input.power_W} W · {input.speed_mm_s} mm/s · beam {input.beamDiameter_um} µm · preheat {input.preheat_C} °C. Use the shared controls below.</p>
    {active && <div role="status"><progress className="w-full" max={1} value={job.progress} />{job.status} · {Math.round(job.progress*100)}%</div>}
    {(error || job?.error) && <p role="alert" className="text-red-300 whitespace-pre-wrap">{error || job?.error}</p>}
    {r && <>
      <p className="text-amber-300 font-semibold">{r.label} · confidence: {r.confidence} · {r.validationStatus}{job.cacheHit ? " · cached" : ""}</p>
      {loadedSignature !== signature && <p className="text-amber-300">Inputs changed. Displayed result belongs to the saved settings; run again to update.</p>}
      {r.fallbackReason && <p className="text-amber-300">{r.fallbackReason}</p>}
      <p className="text-lg">Length {fmt(r.metrics.length_um)} · Width {fmt(r.metrics.width_um)} · Depth {fmt(r.metrics.depth_um)} µm</p>
      <p>Regime: {r.regime} · Main risk: {r.mainRisk}</p><p>{r.recommendation}</p>
      <p className="text-slate-400">Solver: {r.solver.id} · {r.material.name} · properties: {r.material.quality}</p>
      {r.thermalHistory && r.thermalHistory.length > 1 && <div>
        <p>Peak temperature history (K) · {fmt(Math.max(...r.thermalHistory.map(h => h.peak_K)))} K</p>
        <svg viewBox="0 0 600 100" className="w-full h-28 bg-slate-900" role="img" aria-label="Peak temperature versus elapsed time">
          <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={r.thermalHistory.map(h => `${10+580*h.time_s/r.thermalHistory.at(-1)!.time_s},${90-80*h.peak_K/Math.max(...r.thermalHistory!.map(v => v.peak_K))}`).join(" ")} />
        </svg><p className="text-slate-400">0 → {fmt(r.thermalHistory.at(-1)?.time_s)} s · Field history is thermal input, not a stress solution.</p>
      </div>}
      <details className="border-t border-slate-700 pt-2"><summary className="cursor-pointer">Physics, verification and measured comparison</summary>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 py-3">{Object.entries(r.metrics).filter(([,v]) => typeof v === "number" || v === null).map(([k,v]) => <div key={k}><dt className="text-slate-400 break-all">{k}</dt><dd>{fmt(v)}</dd></div>)}</dl>
        {r.energyBalance && <p>Energy: absorbed {fmt(r.energyBalance.input_J)} J · lost {fmt(r.energyBalance.losses_J)} J · stored {fmt(r.energyBalance.stored_J)} J · imbalance {fmt(r.energyBalance.relativeError*100)}%</p>}
        {Object.entries<SimulationResult["analyticalComparison"][string]>(r.analyticalComparison).map(([model,g]) => <p key={model}>{model} screening: L {fmt(g.length_um)} / W {fmt(g.width_um)} / D {fmt(g.depth_um)} µm</p>)}
        {r.measurementComparison && Object.entries<NonNullable<SimulationResult["measurementComparison"]>[string]>(r.measurementComparison).map(([key,c]) => <p key={key}>{key}: RMSE {fmt(c.rmse_um)} µm · bias {fmt(c.bias_um)} µm · errors {c.errors_pct.map(fmt).join(", ")}% · dimension calibration factor {fmt(c.calibrationFactor)}. {c.note}</p>)}
        {r.convergenceStudy !== undefined && <pre className="max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(r.convergenceStudy, null, 2)}</pre>}
        <p className="text-slate-400">{r.material.source}</p><ul className="list-disc pl-4 text-slate-400">{r.assumptions.map(a => <li key={a}>{a}</li>)}</ul>
      </details>
    </>}
    <details className="border-t border-slate-700 pt-2"><summary className="cursor-pointer">Simulation settings, material evidence and calibration</summary>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3">{([
        ["mesh_um", "Mesh (µm)"], ["maxDt_s", "Maximum timestep (s)"], ["tracks", "Tracks"], ["layers", "Layers"],
        ["trackLength_um", "Track length (µm)"], ["dwell_s", "Dwell (s)"], ["cooling_s", "Final cooling (s)"],
        ["scanAngle_deg", "Scan angle (°)"], ["layerRotation_deg", "Layer rotation (°)"], ["packingFraction", "Powder packing fraction"],
        ["powderConductivityRatio", "Powder / solid conductivity"], ["convection_W_m2K", "Convection (W/m²K)"], ["timeout_s", "Timeout (s)"],
      ] as const).map(([key,label]) => <label key={key} className="space-y-1">{label}<input type="number" className="w-full bg-slate-900 rounded border border-slate-700 p-2" value={settings[key] ?? ""} onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))} /></label>)}</div>
      <div className="flex flex-wrap gap-3">
        <label>Backend <select className="bg-slate-900 p-2" value={settings.backend} onChange={e => setSettings(s => ({...s, backend: e.target.value as SimulationInput["backend"]}))}><option value="auto">Automatic</option><option value="reference">Reference enthalpy FV</option><option value="openfoam-thermal">OpenFOAM 14 thermal</option></select></label>
        <label>Study <select className="bg-slate-900 p-2" value={settings.study} onChange={e => setSettings(s => ({...s, study: e.target.value as SimulationInput["study"]}))}><option value="none">Single solve</option><option value="mesh">Three meshes (~3× cost)</option><option value="timestep">Three timesteps (~3× cost)</option></select></label>
        <label>Strategy <select className="bg-slate-900 p-2" value={settings.strategy || "shared"} onChange={e => setSettings(s => ({...s, strategy: e.target.value === "shared" ? undefined : e.target.value as SimulationInput["strategy"]}))}><option value="shared">Shared ({sharedStrategy})</option><option value="meander">Meander</option><option value="unidirectional">Unidirectional</option></select></label>
      </div>
      <label className="block mt-3">Absorptivity override (0–1; blank uses material evidence)<input type="number" step="0.01" className="bg-slate-900 p-2 ml-2" value={settings.absorptivity ?? ""} onChange={e => setSettings(s => ({...s, absorptivity: e.target.value === "" ? undefined : Number(e.target.value)}))}/></label>
      <div className="flex flex-wrap gap-2 mt-3">
        <input aria-label="Measured width in micrometres" placeholder="Measured width (µm)" type="number" value={width} onChange={e => setWidth(e.target.value)} className="bg-slate-900 p-2" />
        <input aria-label="Measured depth in micrometres" placeholder="Measured depth (µm)" type="number" value={depth} onChange={e => setDepth(e.target.value)} className="bg-slate-900 p-2" />
        <input aria-label="Measurement source" placeholder="Measurement source / specimen ID / DOI" value={source} onChange={e => setSource(e.target.value)} className="bg-slate-900 p-2 grow" />
      </div>
      <p className="mt-2 text-slate-400">Replicate measurements must use this exact process vector. Distinct process vectors require separate jobs. Calibration factors are reported, never silently applied.</p>
      <textarea aria-label="Replicate measurement JSON" placeholder='Optional replicate JSON: [{"width_um":100,"depth_um":50,"source":"Specimen ID"}]' value={measurementText} onChange={e => setMeasurementText(e.target.value)} className="bg-slate-900 w-full p-2 mt-2" />
      <label className="block mt-3">Material for this engineering run <select className="bg-slate-900 p-2 ml-2" value={customMaterial} onChange={e => { setCustomMaterial(e.target.value); setPropertyText(""); }}><option value="">Shared material: {input.material}</option>{caps?.materials.map(m => <option key={m.name} value={m.name}>{m.name} · {m.quality}</option>)}</select></label>
      <p className="text-slate-400">15 alloy identities. Missing data blocks execution until a sourced property table is supplied. The analytical studio below keeps its own displayed alloy.</p>
      <textarea aria-label="Sourced material property JSON" placeholder='Optional sourced material JSON; see docs/LPBF_ENGINEERING.md for schema and SI units' className="w-full bg-slate-900 p-2 mt-2 h-20" value={propertyText} onChange={e => setPropertyText(e.target.value)} />
    </details>
    {job && <details><summary className="cursor-pointer">Worker log · {job.id}</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap text-slate-400">{job.log || job.status}</pre></details>}
    <p className="text-amber-300">The 3D studio below displays analytical screening geometry and illustrative flow arrows. It does not render an OpenFOAM free surface.</p>
  </section>;
}

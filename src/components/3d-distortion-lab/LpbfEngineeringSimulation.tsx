import React, { useEffect, useRef, useState } from "react";
import { simulationApi, SimulationInput, SimulationJob, SimulationMode, SimulationCapabilities, ResourceEstimate, SimulationResult } from "../../services/lpbfSimulationService";
import { useMaterialSpecimenStore } from "../../store/useMaterialSpecimenStore";

const defaults: Partial<SimulationInput> = { stripeWidth_um:500,islandSize_um:200,mesh_um:20,maxDt_s:1e-6,tracks:1,layers:1,trackLength_um:600,dwell_s:.0002,cooling_s:.0005,packingFraction:.55,powderConductivityRatio:.12,convection_W_m2K:20,timeout_s:300,scanAngle_deg:0,layerRotation_deg:67,study:"none",backend:"auto" };
const controls = [
  ["stripeWidth_um","Stripe width (µm)",20,3000], ["islandSize_um","Island size (µm)",50,3000],
  ["mesh_um","Mesh spacing (µm)",5,80], ["maxDt_s","Maximum timestep (s)",1e-9,1e-4],
  ["tracks","Track count",1,8], ["layers","Layer count",1,5], ["trackLength_um","Track length (µm)",100,3000],
  ["dwell_s","Inter-track dwell (s)",0,.1], ["cooling_s","Final cooling (s)",0,.1],
  ["scanAngle_deg","Scan angle (°)",-360,360], ["layerRotation_deg","Layer rotation (°)",-360,360],
  ["packingFraction","Powder packing fraction",.2,1], ["powderConductivityRatio","Powder / solid conductivity",.01,1],
  ["convection_W_m2K","Convection (W/m²K)",0,1000], ["timeout_s","Timeout (s)",10,3600],
] as const;
const modes: {id:SimulationMode;name:string;scope:string}[] = [
  {id:"screening",name:"Quick Screening",scope:"Seconds · Rosenthal / Goldak · analytical conduction only · not eligible for experimental validation"},
  {id:"standard",name:"Standard Simulation",scope:"Seconds to minutes · OpenFOAM or reference enthalpy FV · phase change and thermal history · numerical only; flow unresolved"},
  {id:"high-fidelity",name:"High-Fidelity CFD",scope:"Free-surface CFD unavailable · falls back to Screening only · no solved velocity or keyhole"},
  {id:"calibration",name:"Calibration / Validation",scope:"Transient thermal + measured comparison · matching process vector required for calibration · independent validation pending"},
];
const storageKey = "metalliksa.lpbf.engineering.job.v2";
const fmt = (n:unknown) => typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US",{maximumSignificantDigits:5}) : "Not resolved";
const inputClass = "w-full rounded bg-slate-900 border border-slate-700 p-2 text-slate-100";

export function LpbfEngineeringSimulation({input}:{input:SimulationInput}) {
  const sharedStrategy = useMaterialSpecimenStore(s=>s.activeSpecimen.lpbf.scanStrategy);
  const [settings,setSettings] = useState(defaults);
  const [mode,setMode] = useState<SimulationMode>("screening");
  const [caps,setCaps] = useState<SimulationCapabilities>();
  const [job,setJob] = useState<SimulationJob>();
  const [estimate,setEstimate] = useState<ResourceEstimate>();
  const [estimateError,setEstimateError] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [material,setMaterial] = useState("");
  const [properties,setProperties] = useState("");
  const [measurements,setMeasurements] = useState("");
  const [width,setWidth] = useState(""); const [depth,setDepth] = useState(""); const [source,setSource] = useState("");
  const signature = JSON.stringify([input,settings,mode,material,properties,measurements,width,depth,source,sharedStrategy]);
  const submitted = useRef("");
  const [resultSignature,setResultSignature] = useState("");
  const active = job?.status === "queued" || job?.status === "running";
  const r = job?.status === "completed" ? job.result : undefined;
  const payload = (selectedMode:SimulationMode):SimulationInput => ({...input,...settings,mode:selectedMode,
    material:material || input.material, strategy:settings.strategy ?? sharedStrategy,
    ...(properties.trim() ? {properties:JSON.parse(properties)} : {})});
  useEffect(()=>{
    let live=true;
    simulationApi.capabilities().then(c=>{if(live)setCaps(c);}).catch(e=>{if(live)setError(e.message);});
    try {
      const saved=JSON.parse(localStorage.getItem(storageKey)||"null");
      if(saved?.id) simulationApi.get(saved.id).then(j=>{if(live){submitted.current=saved.signature||"";setResultSignature(saved.signature||"");setJob({...j,cacheHit:saved.cacheHit});}}).catch(e=>{if(live)setError(`Saved job unavailable: ${e.message}`);});
    } catch { /* Invalid browser storage must not block a new simulation. */ }
    return ()=>{live=false;};
  },[]);
  useEffect(()=>{
    if(!job)return;
    try {localStorage.setItem(storageKey,JSON.stringify({id:job.id,signature:submitted.current,cacheHit:job.cacheHit}));} catch { /* Storage may be disabled. */ }
  },[job]);
  useEffect(()=>{
    if(!active || !job)return;
    let live=true; let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      let terminal=false;
      try { const next=await simulationApi.get(job.id); terminal=next.status!=="queued" && next.status!=="running";
        if(live){setError("");setJob(old=>({...next,cacheHit:old?.cacheHit,deduplicated:old?.deduplicated}));if(next.status==="completed")setResultSignature(submitted.current);}
      } catch(e){if(live)setError(e instanceof Error?e.message:"Worker connection failed");}
      if(live&&!terminal)timer=setTimeout(poll,document.hidden?5000:1500);
    };
    timer=setTimeout(poll,500);return()=>{live=false;clearTimeout(timer);};
  },[active,job?.id]);
  useEffect(()=>{
    let live=true;setEstimate(undefined);setEstimateError("");
    const timer=setTimeout(()=>{
      try {simulationApi.estimate(payload("standard")).then(e=>{if(live)setEstimate(e);}).catch(e=>{if(live)setEstimateError(e.message);});}
      catch {if(live)setEstimateError("Material JSON is invalid");}
    },750);
    return()=>{live=false;clearTimeout(timer);};
  },[JSON.stringify(input),JSON.stringify(settings),material,properties,sharedStrategy]);
  const submit=async()=>{
    setBusy(true);setError("");
    try {
      for(const [key,,min,max] of controls){const v=settings[key];if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new Error(`${key} must be in [${min}, ${max}]`);}
      const p=payload(mode);
      if(measurements.trim())p.measurements=JSON.parse(measurements);
      else if(width||depth||mode==="calibration")p.measurements=[{width_um:Number(width),depth_um:Number(depth),source}];
      submitted.current=signature;
      const next=await simulationApi.submit(p);setJob(next);if(next.status==="completed")setResultSignature(signature);
    }catch(e){setError(e instanceof Error?e.message:"Submission failed");}finally{setBusy(false);}
  };
  const download=()=>{if(!r)return;const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`lpbf-${job.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const history=r?.thermalHistory;
  const end=history?.at(-1)?.time_s||1;
  const peak=history?.length?Math.max(...history.map(h=>h.peak_K)):1;
  return <section aria-label="LPBF engineering simulation" className="rounded-xl border border-slate-700 bg-slate-950 p-5 md:p-7 space-y-5 text-slate-200 font-sans">
    <header className="flex flex-wrap justify-between gap-3"><div><p className="text-xs tracking-widest uppercase text-sky-400">Thermal research workspace</p><h3 className="text-2xl font-semibold tracking-tight mt-1">Melt pool engineering</h3></div><p className="text-sm text-slate-400">{caps?`${caps.openfoamVersion||"OpenFOAM unavailable"} · ${caps.openfoamThermal?"thermal worker ready":"reference worker"}`:"Connecting to worker…"}</p></header>
    <div className="flex flex-wrap items-center gap-3"><label>Mode <select className="bg-slate-900 border border-slate-600 rounded p-2" value={mode} onChange={e=>setMode(e.target.value as SimulationMode)}>{modes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button className="rounded bg-sky-700 px-5 py-2 disabled:opacity-40" disabled={busy||active} onClick={submit}>{busy?"Submitting…":"Run simulation"}</button>{active&&<button className="rounded border border-red-500 px-4 py-2" onClick={()=>simulationApi.cancel(job.id).then(setJob).catch(e=>setError(e.message))}>Cancel</button>}{r&&<button className="underline text-sm" onClick={download}>Export result JSON</button>}</div>
    <p className="text-sm text-slate-400">{modes.find(m=>m.id===mode)?.scope}</p>
    <p className="text-sm">Shared process: {input.material} · {input.power_W} W · {input.speed_mm_s} mm/s · beam {input.beamDiameter_um} µm · hatch {input.hatch_um} µm · layer {input.layer_um} µm · preheat {input.preheat_C} °C. Edit shared controls below.</p>
    {(mode==="standard"||mode==="calibration")&&<p className="text-xs text-slate-400" role="status">{estimateError||(estimate?`Preflight: ${fmt(estimate.cells)} cells · ${fmt(estimate.spacing_m*1e6)} µm · ~${fmt(estimate.minimumEstimatedSteps)} estimated steps · ~${fmt(estimate.workingMemoryEstimate_MB)} MB working arrays · ${estimate.runs} solve(s). ${estimate.exceedsCellBudget?"Cell budget exceeded.":estimate.exceedsStepBudget?"Requested timestep exceeds the 250,000-step budget. Increase timestep or shorten the process history.":estimate.runtimeEstimate}`:"Estimating resources…")}</p>}
    {job&&<p className="text-xs text-slate-400">Job: {job.status} · {job.requestSummary?.mode} / {job.requestSummary?.backend} · Cache: {job.cacheHit?"hit — saved result reused":job.deduplicated?"joined existing job":"new computation"} · {job.id}</p>}
    {active&&<div role="status"><progress className="w-full" max={1} value={job.progress}/>{job.status} · {Math.round(job.progress*100)}%</div>}
    {(error||job?.error)&&<p role="alert" className="text-red-300 whitespace-pre-wrap">{error||job?.error}</p>}
    {r&&<>
      <div><p className="text-amber-300 font-semibold">{r.label} · {r.validationStatus} · confidence: {r.confidence}</p><p className="text-xs text-slate-400 mt-1">{r.confidenceReason} Solver: {r.solver.id} · {r.material.quality}</p></div>
      {resultSignature!==signature&&<p className="text-amber-300">Displayed result belongs to saved settings. Run again to evaluate the current inputs.</p>}
      {r.fallbackReason&&<p className="text-amber-300">{r.fallbackReason}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 py-5 border-y border-slate-700">{[["Length",r.metrics.length_um,"µm"],["Width",r.metrics.width_um,"µm"],["Depth",r.metrics.depth_um,"µm"],["Peak temperature",r.metrics.peakTemperature_K,"K"]].map(([label,value,unit])=><div key={String(label)}><p className="text-xs uppercase tracking-widest text-slate-400">{String(label)}</p><p className="text-3xl font-semibold tabular-nums mt-2">{fmt(value)} <span className="text-sm text-slate-400">{String(unit)}</span></p></div>)}</div>
      <div className="space-y-2"><p>Regime: <span className="text-sky-300">{r.regime}</span> · Main risk: <span className="text-amber-300">{r.mainRisk}</span></p><p>{r.recommendation}</p><p className="text-xs text-slate-400">{r.riskScope}</p></div>
      {r.energyBalance&&<div aria-label="Energy balance"><p>Energy closure error {fmt(r.energyBalance.relativeError*100)}% · absorbed {fmt(r.energyBalance.input_J)} J</p><div className="flex h-3 rounded overflow-hidden bg-slate-800 mt-2"><div className="bg-sky-500" style={{width:`${Math.max(0,100*r.energyBalance.stored_J/Math.max(r.energyBalance.input_J,1e-30))}%`}}/><div className="bg-amber-500" style={{width:`${Math.max(0,100*r.energyBalance.losses_J/Math.max(r.energyBalance.input_J,1e-30))}%`}}/></div><p className="text-xs text-slate-400 mt-1">Blue: stored {fmt(r.energyBalance.stored_J)} J · Amber: boundary losses {fmt(r.energyBalance.losses_J)} J. Conservation does not establish accuracy.</p></div>}
      <p className="text-sm">Mass: {r.massBalance?`${fmt(r.massBalance.relativeError*100)}% closure error · stationary reference mass` : "Not applicable to screening"} · Free-surface unresolved · Stress not solved</p>
      {r.fieldPreviews && <details className="border-t border-slate-700 pt-3"><summary className="cursor-pointer">Resolved temperature and phase fields · X–Z slice</summary><p className="text-xs text-slate-400 my-2">Peak sampled melt volume; actual cell fields. Enthalpy liquid fraction is not a metal/gas VOF interface. The analytical studio is separate.</p>{r.fieldPreviews.map(name=><img key={name} loading="lazy" className="w-full my-3" alt={name==="temperature-slice.svg"?"Resolved OpenFOAM or reference temperature slice":"Resolved enthalpy liquid fraction slice"} src={`/api/lpbf/jobs/${job.id}/artifacts/${encodeURIComponent(name)}`}/>)}</details>}
      {r.thermalHistory && <a className="text-sm underline" href={`/api/lpbf/jobs/${job.id}/artifacts/thermal-history.csv`}>Download thermal history CSV</a>}
      {history&&history.length>1&&<div><p className="text-sm">Domain peak temperature (K) versus elapsed time (ms)</p><svg viewBox="0 0 640 180" className="w-full h-48 bg-slate-900 mt-2" role="img" aria-label="Resolved domain peak temperature history and laser-on intervals"><text x="4" y="16" fill="#94a3b8" fontSize="11">{fmt(peak)} K</text><line x1="65" y1="145" x2="625" y2="145" stroke="#475569"/>{r.scanPath?.map((s,i)=><rect key={i} x={65+560*s.start_s/end} y="150" width={Math.max(1,560*(s.end_s-s.start_s)/end)} height="5" fill="#f59e0b"/>)}<polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={history.map(h=>`${65+560*h.time_s/end},${140-120*h.peak_K/peak}`).join(" ")}/><text x="65" y="175" fill="#94a3b8" fontSize="11">0 ms</text><text x="540" y="175" fill="#94a3b8" fontSize="11">{fmt(end*1000)} ms</text></svg><p className="text-xs text-slate-400">Amber intervals: laser on; gaps: dwell / cooling. Domain maximum is not a material-point history. Local liquidus crossings enter G/R statistics, not this peak curve.</p></div>}
      <details className="border-t border-slate-700 pt-3"><summary className="cursor-pointer">Physics, verification and measured comparison</summary><dl className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">{Object.entries(r.metrics).map(([k,v])=><div key={k}><dt className="text-xs text-slate-400 break-all">{k}</dt><dd className="tabular-nums">{fmt(v)}</dd></div>)}</dl>
        {r.discretization&&<p>Mesh: {fmt(r.discretization.cells)} cells · uniform {fmt(r.discretization.mesh_m*1e6)} µm · {fmt(r.discretization.steps)} steps · minimum Δt {fmt(r.discretization.minimumDt_s)} s. Local refinement unresolved.</p>}
        {r.massBalance&&<p className="text-sm">Mass (kg): initial {fmt(r.massBalance.initial_kg)} + deposited {fmt(r.massBalance.deposited_kg)} = final {fmt(r.massBalance.final_kg)}. {r.massBalance.scope}</p>}
        {r.phaseAudit&&<p className="text-sm">Phase partition: liquid {fmt(r.phaseAudit.liquidVolume_m3)} m³ · solid {fmt(r.phaseAudit.solidVolume_m3)} m³. {r.phaseAudit.scope}</p>}
        {Object.entries<SimulationResult["analyticalComparison"][string]>(r.analyticalComparison).map(([name,g])=><p key={name}>{name} screening: L {fmt(g.length_um)} / W {fmt(g.width_um)} / D {fmt(g.depth_um)} µm</p>)}
        {r.measurementComparison&&Object.entries<NonNullable<SimulationResult["measurementComparison"]>[string]>(r.measurementComparison).map(([key,c])=><p key={key}>{key}: RMSE {fmt(c.rmse_um)} µm · bias {fmt(c.bias_um)} µm · signed errors {c.errors_pct.map(fmt).join(", ")}% · calibration factor {fmt(c.calibrationFactor)}. {c.note}</p>)}
        {r.measurementEvidence?.map((e,i)=><p key={i}>{e.source} · process: {e.sameProcessVector} · holdout: {e.independentHoldout==null?"unknown":e.independentHoldout?"user-declared independent":"calibration data"} · uncertainty: {JSON.stringify(e.uncertainty_um)}</p>)}
        {r.convergenceStudy!==undefined&&<div><p className="text-amber-300 mt-3">Coarse / medium / fine · Numerical convergence only</p><pre className="max-h-64 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(r.convergenceStudy,null,2)}</pre></div>}
        <p className="text-slate-400 my-3">{r.material.source}</p><ul className="list-disc pl-5 text-sm text-slate-400 space-y-1">{r.assumptions.map(a=><li key={a}>{a}</li>)}</ul>
      </details>
      {r.artifacts&&<details className="border-t border-slate-700 pt-3"><summary className="cursor-pointer">Artifacts and reproducibility · {r.artifacts.length} files</summary><p className="text-sm text-slate-400 my-2">{r.retentionPolicy}</p><div className="max-h-64 overflow-auto text-xs font-mono space-y-3">{r.artifacts.map(a=><div key={a.path}><p>{a.path} · {fmt(a.size_bytes)} bytes</p><p className="text-slate-500 break-all">SHA-256 {a.sha256}</p></div>)}</div></details>}
    </>}
    <details className="border-t border-slate-700 pt-3"><summary className="cursor-pointer">Simulation settings, material evidence and calibration</summary><button className="underline text-sm mt-3" onClick={()=>setSettings({...defaults})}>Reset simulation settings</button>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">{controls.map(([key,label,min,max])=><label key={key} className="text-sm space-y-1">{label}<input className={inputClass} type="number" min={min} max={max} step={key==="tracks"||key==="layers"?1:"any"} value={Number.isFinite(settings[key])?settings[key]:""} onChange={e=>setSettings(s=>({...s,[key]:e.target.value===""?NaN:Number(e.target.value)}))}/><span className="block text-xs text-slate-500">Range {min} – {max}</span></label>)}</div>
      <p className="text-xs text-slate-400 mb-3">Finer mesh, shorter timestep and longer process histories increase compute cost; see preflight above. Process power, speed, beam, hatch, layer and preheat use the shared controls.</p>
      <div className="grid md:grid-cols-3 gap-3"><label>Backend<select className={inputClass} value={settings.backend} onChange={e=>setSettings(s=>({...s,backend:e.target.value as SimulationInput["backend"]}))}><option value="auto">Automatic</option><option value="reference">Reference enthalpy FV</option><option value="openfoam-thermal">OpenFOAM 14 thermal</option></select></label><label>Study<select className={inputClass} value={settings.study} onChange={e=>setSettings(s=>({...s,study:e.target.value as SimulationInput["study"]}))}><option value="none">Single solve</option><option value="mesh">Three meshes</option><option value="timestep">Three timesteps</option></select></label><label>Strategy<select className={inputClass} value={settings.strategy||"shared"} onChange={e=>setSettings(s=>({...s,strategy:e.target.value==="shared"?undefined:e.target.value as SimulationInput["strategy"]}))}><option value="shared">Shared ({sharedStrategy})</option><option value="meander">Meander</option><option value="unidirectional">Unidirectional</option><option value="stripe">Stripe</option><option value="island">Rectangular islands</option></select></label></div>
      <div className="grid md:grid-cols-2 gap-3 my-3">{(["absorptivity","emissivity"] as const).map(key=><label key={key}>{key} override (0–1; blank uses material)<input className={inputClass} type="number" min="0" max="1" step="0.01" value={Number.isFinite(settings[key])?settings[key]:""} onChange={e=>setSettings(s=>({...s,[key]:e.target.value===""?undefined:Number(e.target.value)}))}/></label>)}</div>
      <div className="grid md:grid-cols-3 gap-3"><input aria-label="Measured width in micrometres" className={inputClass} placeholder="Measured width (µm)" type="number" value={width} onChange={e=>setWidth(e.target.value)}/><input aria-label="Measured depth in micrometres" className={inputClass} placeholder="Measured depth (µm)" type="number" value={depth} onChange={e=>setDepth(e.target.value)}/><input aria-label="Measurement source" className={inputClass} placeholder="Specimen ID / DOI" value={source} onChange={e=>setSource(e.target.value)}/></div>
      <p className="text-xs text-slate-400 my-2">Comparison requires real measurements. Calibration factor is withheld without an exact processVector in replicate JSON. Optional uncertainty_um and independentHoldout record supplied evidence; no automatic validation. See docs/LPBF_ENGINEERING.md.</p>
      <textarea aria-label="Replicate measurement JSON" className={inputClass} placeholder="Optional replicate measurement JSON" value={measurements} onChange={e=>setMeasurements(e.target.value)}/>
      <label className="block my-3">Material for this engineering run<select className={inputClass} value={material} onChange={e=>{setMaterial(e.target.value);setProperties("");}}><option value="">Shared: {input.material}</option>{caps?.materials.map(m=><option key={m.name} value={m.name}>{m.name} · {m.quality}</option>)}</select></label><p className="text-xs text-slate-400 mb-2">15 identities; missing data blocks execution. No silent alloy substitution. Analytical studio retains its displayed material.</p><textarea aria-label="Sourced material property JSON" className={inputClass} placeholder="Optional sourced material JSON; see docs/LPBF_ENGINEERING.md" value={properties} onChange={e=>setProperties(e.target.value)}/>
    </details>
    {job&&<details className="border-t border-slate-700 pt-3"><summary className="cursor-pointer">Worker log · {job.id}</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-400 mt-3">{job.log||job.status}</pre></details>}
    <p className="text-xs text-amber-300">The 3D studio below displays analytical screening geometry and illustrative flow arrows. It does not render an OpenFOAM free surface.</p>
  </section>;
}

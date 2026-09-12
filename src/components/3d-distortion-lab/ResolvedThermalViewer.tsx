import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface Frame { path: string; time_s: number; surface_m: number; minimum_K: number; maximum_K: number }
interface Series { version: number; cells: number; spacing_m: number; coordinates: string; solidus_K: number; liquidus_K: number; frames: Frame[] }
export function parseFieldSeries(value: unknown): Series {
  const s = value as Series;
  if (!s || s.version !== 1 || !Number.isInteger(s.cells) || s.cells < 1 || s.cells > 600000 || s.coordinates !== "field-coordinates.bin"
    || !Number.isFinite(s.spacing_m) || s.spacing_m <= 0 || !Number.isFinite(s.solidus_K) || !Number.isFinite(s.liquidus_K) || s.solidus_K <= 0 || s.liquidus_K <= s.solidus_K
    || !Array.isArray(s.frames) || !s.frames.length || s.frames.length > 128 || !s.frames.every((f,i) => f && f.path === `field-frame-${String(i).padStart(3,"0")}.bin`
      && [f.time_s,f.surface_m,f.minimum_K,f.maximum_K].every(Number.isFinite) && f.time_s >= 0 && f.minimum_K > 0 && f.maximum_K >= f.minimum_K && (!i || f.time_s > s.frames[i-1].time_s))) throw new Error("Invalid resolved field series");
  return s;
}
export function decodeField(buffer: ArrayBuffer, count: number): Float32Array {
  if (buffer.byteLength !== count*4) throw new Error("Truncated or oversized field artifact");
  const view = new DataView(buffer), values = new Float32Array(count);
  for(let i=0;i<count;i++){values[i]=view.getFloat32(i*4,true);if(!Number.isFinite(values[i]))throw new Error("Nonfinite field artifact");}
  return values;
}
export function ResolvedThermalViewer({jobId}:{jobId:string}) {
  const resetVersion=useRef(0);
  const cameraState=useRef<{position:THREE.Vector3;target:THREE.Vector3}>();
  const rendererRef=useRef<THREE.WebGLRenderer>();
  useEffect(()=>()=>{rendererRef.current?.dispose();rendererRef.current?.forceContextLoss();rendererRef.current?.domElement.remove();rendererRef.current=undefined;},[]);
  const host = useRef<HTMLDivElement>(null);
  const [series,setSeries]=useState<Series>(); const [coordinates,setCoordinates]=useState<Float32Array>();
  const [values,setValues]=useState<Float32Array>(); const [index,setIndex]=useState(0);
  const [loadedIndex,setLoadedIndex]=useState(-1); const [quantity,setQuantity]=useState("temperature");
  const [section,setSection]=useState(100); const [hotOnly,setHotOnly]=useState(false);
  const [wireframe,setWireframe]=useState(false); const [rotate,setRotate]=useState(false);
  const [playing,setPlaying]=useState(false); const [error,setError]=useState("");
  const [visible,setVisible]=useState(0); const [reset,setReset]=useState(0);
  const base=`/api/lpbf/jobs/${jobId}/artifacts/`;
  useEffect(()=>{
    const abort=new AbortController();setSeries(undefined);setValues(undefined);setCoordinates(undefined);setIndex(0);setLoadedIndex(-1);setError("");setPlaying(false);
    const get=async(name:string)=>{const r=await fetch(base+name,{signal:abort.signal});if(!r.ok)throw new Error(`Field artifact HTTP ${r.status}`);return r;};
    (async()=>{const s=parseFieldSeries(await (await get("field-series.json")).json());const c=decodeField(await (await get(s.coordinates)).arrayBuffer(),s.cells*3);if(!abort.signal.aborted){setSeries(s);setCoordinates(c);setIndex(s.frames.reduce((best,f,i)=>f.maximum_K>s.frames[best].maximum_K?i:best,0));}})().catch(e=>{if(!abort.signal.aborted)setError(e.message);});
    return()=>abort.abort();
  },[base]);
  useEffect(()=>{
    if(!series)return;const abort=new AbortController();setError("");
    fetch(base+series.frames[index].path,{signal:abort.signal}).then(async r=>{if(!r.ok)throw new Error(`Field frame HTTP ${r.status}`);const v=decodeField(await r.arrayBuffer(),series.cells);if(v.some(t=>t<=0))throw new Error("Nonphysical temperature");if(!abort.signal.aborted){setValues(v);setLoadedIndex(index);}}).catch(e=>{if(!abort.signal.aborted){setError(e.message);setPlaying(false);}});
    return()=>abort.abort();
  },[series,index,base]);
  useEffect(()=>{if(!playing||!series||loadedIndex!==index)return;const timer=setTimeout(()=>{if(index===series.frames.length-1)setPlaying(false);else setIndex(index+1);},200);return()=>clearTimeout(timer);},[playing,series,index,loadedIndex]);
  useEffect(()=>{
    if(!host.current||!series||!coordinates||!values||loadedIndex<0)return;
    const element=host.current;let renderer:THREE.WebGLRenderer;
    try{renderer=rendererRef.current ?? new THREE.WebGLRenderer({antialias:true});rendererRef.current=renderer;}catch{setError("WebGL unavailable. Download the field artifacts or use the resolved X–Z slices.");return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label","Resolved 3D thermal cell field. Arrow keys pan; use reset camera to restore the view.");
    renderer.domElement.tabIndex=0;
    const scene=new THREE.Scene();scene.background=new THREE.Color("#080f1c");
    const camera=new THREE.PerspectiveCamera(40,1,.1,100000);
    const bounds=new THREE.Box3();for(let i=0;i<series.cells;i++)bounds.expandByPoint(new THREE.Vector3(coordinates[i*3]*1e6,coordinates[i*3+1]*1e6,coordinates[i*3+2]*1e6));
    const center=bounds.getCenter(new THREE.Vector3()),extent=bounds.getSize(new THREE.Vector3()).length()+series.spacing_m*1e6;
    camera.up.set(0,0,1);camera.position.copy(center).add(new THREE.Vector3(extent*.9,-extent*1.1,extent*.85));
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(center);controls.listenToKeyEvents(renderer.domElement);controls.enableDamping=true;controls.autoRotate=rotate;controls.autoRotateSpeed=.5;
    if(resetVersion.current!==reset){cameraState.current=undefined;resetVersion.current=reset;}
    if(cameraState.current){camera.position.copy(cameraState.current.position);controls.target.copy(cameraState.current.target);}
    const frame=series.frames[loadedIndex],globalMax=Math.max(...series.frames.map(f=>f.maximum_K)),globalMin=Math.min(...series.frames.map(f=>f.minimum_K));
    // Exact cell cubes up to the display budget; larger domains use explicitly sampled cell cubes.
    const stride=Math.max(1,Math.ceil(series.cells/50000));const positions:number[]=[],colors:number[]=[];const colour=new THREE.Color();
    for(let i=0;i<series.cells;i+=stride){
      const x=coordinates[i*3]*1e6,y=coordinates[i*3+1]*1e6,z=coordinates[i*3+2]*1e6,t=values[i];
      if(coordinates[i*3+2]>=frame.surface_m || y>bounds.min.y+(bounds.max.y-bounds.min.y)*section/100 || (hotOnly&&t<series.solidus_K))continue;
      const f=quantity==="phase"?Math.max(0,Math.min(1,(t-series.solidus_K)/(series.liquidus_K-series.solidus_K))):Math.max(0,Math.min(1,(t-globalMin)/Math.max(1,globalMax-globalMin)));
      // Color denotes physical phase, never a rainbow implying validation.
      if(t<series.solidus_K) colour.set("#1e40af").lerp(new THREE.Color("#60a5fa"),quantity==="phase"?0:Math.max(0,Math.min(1,(t-globalMin)/Math.max(1,series.solidus_K-globalMin))));
      else if(t<series.liquidus_K) colour.set("#f59e0b").lerp(new THREE.Color("#fb923c"),(t-series.solidus_K)/(series.liquidus_K-series.solidus_K));
      else colour.set("#f97316").lerp(new THREE.Color("#ef4444"),f);
      positions.push(x,y,z);colors.push(colour.r,colour.g,colour.b);
    }
    setVisible(positions.length/3);
    const geometry=new THREE.BoxGeometry(series.spacing_m*1e6*.94,series.spacing_m*1e6*.94,series.spacing_m*1e6*.94);
    const material=new THREE.MeshBasicMaterial({wireframe});const mesh=new THREE.InstancedMesh(geometry,material,positions.length/3);const matrix=new THREE.Matrix4();
    for(let i=0;i<positions.length/3;i++){matrix.makeTranslation(...positions.slice(i*3,i*3+3) as [number,number,number]);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(...colors.slice(i*3,i*3+3) as [number,number,number]));}scene.add(mesh);
    const axes=new THREE.AxesHelper(extent*.22);axes.position.copy(bounds.min);scene.add(axes);
    const box=new THREE.Box3Helper(bounds,0x334155);scene.add(box);
    const resize=()=>{const width=Math.max(1,element.clientWidth),height=Math.max(1,element.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(element);resize();let raf=0;let inView=true;
    const visibility=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;});visibility.observe(element);
    const render=()=>{if(inView&&!document.hidden){controls.update();renderer.render(scene,camera);}raf=requestAnimationFrame(render);};render();
    return()=>{cameraState.current={position:camera.position.clone(),target:controls.target.clone()};cancelAnimationFrame(raf);observer.disconnect();visibility.disconnect();controls.dispose();mesh.dispose();geometry.dispose();material.dispose();axes.geometry.dispose();(axes.material as THREE.Material).dispose();box.geometry.dispose();(box.material as THREE.Material).dispose();renderer.renderLists.dispose();};
  },[series,coordinates,values,loadedIndex,quantity,section,hotOnly,reset,wireframe,rotate]);
  const frame=series?.frames[loadedIndex];
  return <section aria-label="Resolved thermal field explorer" className="overflow-hidden rounded-xl bg-[#080f1c] ring-1 ring-slate-700/70">
    <header className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h4 className="font-semibold">Resolved 3D thermal field</h4><p className="text-xs text-slate-400 mt-1">Actual solver cells · temperature and enthalpy phase fraction · opens at peak-temperature sample</p></div><select aria-label="Field quantity" value={quantity} onChange={e=>setQuantity(e.target.value)} className="bg-slate-800 rounded p-2 text-sm"><option value="temperature">Temperature · K</option><option value="phase">Liquid fraction · 0–1</option></select></header>
    {error&&<p role="alert" className="px-4 text-red-300">{error}</p>}
    <div ref={host} className="h-[360px] sm:h-[470px] w-full touch-none"/>
    <div className="px-4 pb-4 space-y-3"><div className="flex flex-wrap gap-4 text-xs text-slate-300"><span>{frame?`${(frame.time_s*1000).toFixed(4)} ms · frame ${loadedIndex+1}/${series?.frames.length}`:"Loading resolved fields…"}</span><span>{frame?`Domain peak ${frame.maximum_K.toFixed(1)} K`:""}</span><span>{series?`${visible.toLocaleString("en-US")} displayed / ${series.cells.toLocaleString("en-US")} mesh cells · ${(series.spacing_m*1e6).toFixed(2)} µm`:""}</span></div>
    <div className="flex gap-3 items-center"><button disabled={!series||!!error} onClick={()=>{if(series&&index===series.frames.length-1)setIndex(0);setPlaying(!playing);}} className="rounded bg-sky-700 px-4 py-2 text-sm disabled:opacity-40">{playing?"Pause":"Play"}</button><input aria-label="Simulation time" className="flex-1 accent-sky-400 min-w-0" type="range" min={0} max={(series?.frames.length||1)-1} value={index} onChange={e=>{setPlaying(false);setIndex(Number(e.target.value));}}/><span className="text-xs text-slate-400">{loadedIndex!==index?"Loading frame…":"Sampled time"}</span></div>
    <div className="flex flex-wrap items-center gap-4 text-sm"><label className="flex items-center gap-2">Y section<input aria-label="Y section" type="range" min="0" max="100" value={section} onChange={e=>setSection(Number(e.target.value))}/>{section}%</label><label><input type="checkbox" checked={hotOnly} onChange={e=>setHotOnly(e.target.checked)}/> Mushy / liquid cells only</label><label><input type="checkbox" checked={wireframe} onChange={e=>setWireframe(e.target.checked)}/> Mesh edges</label><label><input type="checkbox" checked={rotate} onChange={e=>setRotate(e.target.checked)}/> Auto-rotate</label><button className="underline text-slate-300" onClick={()=>{cameraState.current=undefined;setReset(v=>v+1);}}>Reset camera</button></div>
    <div className="h-2 rounded bg-gradient-to-r from-blue-500 via-amber-400 to-red-500"/><p className="text-xs text-slate-400">{quantity==="phase"?"0 solid → 1 liquid; enthalpy fraction, not a gas interface":series?`${Math.min(...series.frames.map(f=>f.minimum_K)).toFixed(0)} → ${Math.max(...series.frames.map(f=>f.maximum_K)).toFixed(0)} K · fixed scale across all frames`:""}. Blue: solid / cool · amber: mushy · orange / red: liquid. Vapor is unresolved; no vapor cells are inferred. Uniform mesh; no local refinement. X red · Y green · Z blue. Drag to orbit; scroll to zoom.</p>
    <p className="text-xs text-amber-200/80">Unvalidated transient thermal · no resolved velocity, keyhole or free surface. {series&&series.cells>50000?`Display samples every ${Math.ceil(series.cells/50000)}th cell; gaps are display sampling, not pores. Full fields remain in artifacts.`:"Uniform cell rendering; no geometric smoothing."} Playback is sampled and slowed for inspection.</p></div>
  </section>;
}

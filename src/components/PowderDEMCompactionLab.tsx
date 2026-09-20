import React, { useEffect, useRef, useState } from 'react';
import { Activity, Disc, Layers, Play } from 'lucide-react';
import { pythonComputationService } from '../services/pythonComputationService';

type SlotProps = { children: React.ReactNode; className?: string };
const Card = ({ children, className = '' }: SlotProps) => <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
const CardHeader = ({ children, className = '' }: SlotProps) => <header className={`border-b border-slate-100 bg-slate-50 p-4 ${className}`}>{children}</header>;
const CardContent = ({ children, className = '' }: SlotProps) => <div className={`p-4 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }: SlotProps) => <h2 className={`font-semibold text-slate-800 ${className}`}>{children}</h2>;
const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} className={`rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 ${props.className ?? ''}`} />;
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full rounded border border-slate-300 px-2 py-1.5 text-sm ${props.className ?? ''}`} />;
const Label = ({ children }: SlotProps) => <span className="block text-xs text-slate-500">{children}</span>;
const Badge = ({ children }: SlotProps & { variant?: string }) => <span className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">{children}</span>;

export function PowderDEMCompactionLab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [params, setParams] = useState({ d10: 15, d50: 30, d90: 45, recoaterGap: 100, particlesCount: 400 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      setResult(await pythonComputationService.simulatePowderDEMCompaction({
        d10_um: params.d10, d50_um: params.d50, d90_um: params.d90,
        recoater_gap_um: params.recoaterGap, box_width_um: 500, num_particles: params.particlesCount,
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!result || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = canvas.width / 500;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - params.recoaterGap * scale);
    ctx.lineTo(canvas.width, canvas.height - params.recoaterGap * scale);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const particle of result.particles ?? []) {
      const radius = particle.r_um * scale;
      ctx.beginPath();
      ctx.arc(particle.x_um * scale, canvas.height - particle.y_um * scale, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();
    }
  }, [result, params.recoaterGap]);

  return <div className="mx-auto max-w-6xl space-y-6 p-6">
    <header>
      <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-800"><Disc className="h-8 w-8 text-blue-600" />Phase 18: Deterministic Powder Bed Compaction</h1>
      <p className="mt-1 text-slate-500">Quasi-Monte Carlo particle packing and recoater-gap screening.</p>
    </header>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Layers className="h-5 w-5" />Powder &amp; recoater parameters</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{([['d10','D10 (µm)'],['d50','D50 (µm)'],['d90','D90 (µm)'],['recoaterGap','Recoater gap (µm)'],['particlesCount','Particle count']] as const).map(([key,label]) => <label key={key} className="space-y-1 text-sm"><Label>{label}</Label><Input type="number" value={params[key]} onChange={event => setParams({ ...params, [key]: Number(event.target.value) })} /></label>)}</div>
        <Button onClick={handleSimulate} disabled={loading} className="w-full">{loading ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Run deterministic compaction</Button>
      </CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Packing density visualization</CardTitle>{result && <Badge variant="outline">Packing fraction: {result.packing_fraction_pct}%</Badge>}</CardHeader><CardContent>
        {!result ? <div className="py-24 text-center text-slate-400"><Disc className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>Configure parameters and run the solver.</p></div> : <><div className="mb-4 grid grid-cols-3 gap-4 text-center"><div><p className="text-sm text-slate-500">Packing fraction</p><p className="text-2xl font-bold">{result.packing_fraction_pct}%</p></div><div><p className="text-sm text-slate-500">Hausner ratio</p><p className="text-2xl font-bold">{result.hausner_ratio}</p></div><div><p className="text-sm text-slate-500">Deposited particles</p><p className="text-2xl font-bold">{result.total_deposited}</p></div></div><canvas ref={canvasRef} width={800} height={300} className="w-full rounded border bg-slate-900" /><p className="mt-2 text-xs text-slate-500">Dashed red line marks the recoater gap.</p></>}
      </CardContent></Card>
    </div>
  </div>;
}

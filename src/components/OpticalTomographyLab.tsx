import React, { useEffect, useRef, useState } from 'react';
import { Activity, Camera, Info, Play } from 'lucide-react';
import { pythonComputationService } from '../services/pythonComputationService';

type SlotProps = { children: React.ReactNode; className?: string };
const Card = ({ children, className = '' }: SlotProps) => <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
const CardHeader = ({ children, className = '' }: SlotProps) => <header className={`border-b border-slate-100 bg-slate-50 p-4 ${className}`}>{children}</header>;
const CardContent = ({ children, className = '' }: SlotProps) => <div className={`p-4 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }: SlotProps) => <h2 className={`font-semibold text-slate-800 ${className}`}>{children}</h2>;
const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} className={`rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50 ${props.className ?? ''}`} />;
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`w-full rounded border border-slate-300 px-2 py-1.5 text-sm ${props.className ?? ''}`} />;
const Label = ({ children }: SlotProps) => <span className="block text-xs text-slate-500">{children}</span>;

export function OpticalTomographyLab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [params, setParams] = useState({ laserPower: 250, scanSpeed: 800, thermalK: 20, thermalAlpha: 5e-6, fov: 1000 });
  const meanRef = useRef<HTMLCanvasElement>(null);
  const sigmaRef = useRef<HTMLCanvasElement>(null);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      setResult(await pythonComputationService.simulateOpticalTomography({
        laser_power_W: params.laserPower, scan_speed_mm_s: params.scanSpeed,
        material_k: params.thermalK, material_alpha: params.thermalAlpha,
        sensor_resolution: [64, 64], fov_um: params.fov,
      }));
    } finally {
      setLoading(false);
    }
  };

  const draw = (canvas: HTMLCanvasElement, values: number[], maxValue: number, color: 'hot' | 'gray') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const [resX, resY] = result.resolution;
    const cellW = canvas.width / resX;
    const cellH = canvas.height / resY;
    values.forEach((value, index) => {
      const normalized = maxValue > 0 ? Math.min(1, Math.max(0, value / maxValue)) : 0;
      const intensity = Math.floor(normalized * 255);
      ctx.fillStyle = color === 'hot' ? `rgb(${Math.min(255, intensity * 3)},${Math.min(255, Math.max(0, (intensity - 85) * 3))},${Math.min(255, Math.max(0, (intensity - 170) * 3))})` : `rgb(${intensity},${intensity},${intensity})`;
      ctx.fillRect((index % resX) * cellW, Math.floor(index / resX) * cellH, Math.ceil(cellW), Math.ceil(cellH));
    });
  };

  useEffect(() => {
    if (!result || !meanRef.current || !sigmaRef.current) return;
    draw(meanRef.current, result.pixels_1d, result.max_expected_intensity, 'hot');
    draw(sigmaRef.current, result.pixels_noise_sigma, Math.sqrt(result.max_expected_intensity), 'gray');
  }, [result]);

  return <div className="mx-auto max-w-6xl space-y-6 p-6">
    <header><h1 className="flex items-center gap-2 text-3xl font-bold text-slate-800"><Camera className="h-8 w-8 text-orange-600" />Phase 19: In-Situ Optical Tomography</h1><p className="mt-1 text-slate-500">Expected photon flux and analytical NETD noise bounds.</p></header>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Info className="h-5 w-5" />Sensor &amp; laser parameters</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4">{([['laserPower','Laser power (W)'],['scanSpeed','Scan speed (mm/s)'],['thermalK','Thermal conductivity (W/mK)'],['thermalAlpha','Thermal diffusivity (m²/s)'],['fov','Field of view (µm)']] as const).map(([key,label]) => <label key={key} className="space-y-1 text-sm"><Label>{label}</Label><Input type="number" value={params[key]} onChange={event => setParams({ ...params, [key]: Number(event.target.value) })} /></label>)}</div><Button onClick={handleSimulate} disabled={loading} className="w-full">{loading ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Generate tomography data</Button></CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Sensor outputs</CardTitle></CardHeader><CardContent>{!result ? <div className="py-24 text-center text-slate-400"><Camera className="mx-auto mb-3 h-12 w-12 opacity-20" /><p>Run the simulation to view expected sensor frames.</p></div> : <div className="grid grid-cols-2 gap-6"><div className="text-center"><h3 className="mb-2 font-semibold">Expected intensity</h3><canvas ref={meanRef} width={300} height={300} className="mx-auto w-full max-w-[300px] rounded border bg-black" /><p className="mt-2 text-xs text-slate-500">Peak: {result.max_expected_intensity.toFixed(1)} ADU</p></div><div className="text-center"><h3 className="mb-2 font-semibold">Noise bound (1-sigma)</h3><canvas ref={sigmaRef} width={300} height={300} className="mx-auto w-full max-w-[300px] rounded border bg-black" /><p className="mt-2 text-xs text-slate-500">Analytical Poisson standard deviation</p></div></div>}</CardContent></Card>
    </div>
  </div>;
}

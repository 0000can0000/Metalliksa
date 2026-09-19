import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Play, Activity, Layers, Disc } from 'lucide-react';
import { pythonComputationService } from '../services/pythonComputationService';

export function PowderDEMCompactionLab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [params, setParams] = useState({
    d10: 15.0,
    d50: 30.0,
    d90: 45.0,
    recoaterGap: 100.0,
    particlesCount: 400
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const data = await pythonComputationService.simulatePowderDEMCompaction({
        d10_um: params.d10,
        d50_um: params.d50,
        d90_um: params.d90,
        recoater_gap_um: params.recoaterGap,
        box_width_um: 500.0,
        num_particles: params.particlesCount
      });
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      const scale = width / 500.0; 
      
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);
      
      const recoaterY = height - (params.recoaterGap * scale);
      ctx.strokeStyle = "#ef4444";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, recoaterY);
      ctx.lineTo(width, recoaterY);
      ctx.stroke();
      
      ctx.setLineDash([]);
      result.particles.forEach((p: any) => {
        const x = p.x_um * scale;
        const r = p.r_um * scale;
        const y = height - (p.y_um * scale);
        
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = "#94a3b8";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#cbd5e1";
        ctx.stroke();
      });
    }
  }, [result, params.recoaterGap]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Disc className="w-8 h-8 text-blue-600" />
            Phase 18: Deterministic Powder Bed Compaction
          </h1>
          <p className="text-slate-500 mt-1">Quasi-Monte Carlo (Halton Sequence) based particle packing analyzer.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-500" />
              Powder & Recoater Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>D10 (µm)</Label>
                <Input type="number" value={params.d10} onChange={e => setParams({...params, d10: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <Label>D50 (µm)</Label>
                <Input type="number" value={params.d50} onChange={e => setParams({...params, d50: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <Label>D90 (µm)</Label>
                <Input type="number" value={params.d90} onChange={e => setParams({...params, d90: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <Label>Recoater Gap (µm)</Label>
                <Input type="number" value={params.recoaterGap} onChange={e => setParams({...params, recoaterGap: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Particle Sampling Count</Label>
                <Input type="number" value={params.particlesCount} onChange={e => setParams({...params, particlesCount: parseInt(e.target.value)})} />
                <p className="text-xs text-slate-400 mt-1">Generated via Halton low-discrepancy sequences.</p>
              </div>
            </div>
            
            <Button onClick={handleSimulate} disabled={loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              {loading ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Run Deterministic Compaction
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-2 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" />
              Packing Density Visualization
            </CardTitle>
            {result && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Packing Fraction: {result.packing_fraction_pct}%
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            {result ? (
              <div className="w-full">
                <div className="flex gap-4 justify-center mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-md border border-slate-100 flex-1">
                    <p className="text-sm text-slate-500 font-medium">Packing Fraction</p>
                    <p className="text-2xl font-bold text-slate-800">{result.packing_fraction_pct}%</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-md border border-slate-100 flex-1">
                    <p className="text-sm text-slate-500 font-medium">Hausner Ratio (Est.)</p>
                    <p className="text-2xl font-bold text-slate-800">{result.hausner_ratio}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-md border border-slate-100 flex-1">
                    <p className="text-sm text-slate-500 font-medium">Deposited Particles</p>
                    <p className="text-2xl font-bold text-slate-800">{result.total_deposited}</p>
                  </div>
                </div>
                <div className="relative border border-slate-300 rounded-sm overflow-hidden bg-slate-900 w-full flex justify-center">
                  <canvas ref={canvasRef} width={800} height={300} className="w-full max-w-full object-contain" />
                  <div className="absolute top-2 right-2 text-xs text-white/50 bg-black/50 px-2 py-1 rounded">Red line = Recoater Gap</div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center">
                <Disc className="w-12 h-12 mb-3 opacity-20" />
                <p>Configure parameters and run the deterministic solver.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

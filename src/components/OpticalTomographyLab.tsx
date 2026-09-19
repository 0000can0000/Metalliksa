import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Play, Camera, Info, Activity } from 'lucide-react';
import { pythonComputationService } from '../services/pythonComputationService';

export function OpticalTomographyLab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [params, setParams] = useState({
    laserPower: 250.0,
    scanSpeed: 800.0,
    thermalK: 20.0,
    thermalAlpha: 5e-6,
    fov: 1000.0
  });
  
  const canvasMeanRef = useRef<HTMLCanvasElement>(null);
  const canvasSigmaRef = useRef<HTMLCanvasElement>(null);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const data = await pythonComputationService.simulateOpticalTomography({
        laser_power_W: params.laserPower,
        scan_speed_mm_s: params.scanSpeed,
        material_k: params.thermalK,
        material_alpha: params.thermalAlpha,
        sensor_resolution: [64, 64],
        fov_um: params.fov
      });
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  const drawHeatmap = (canvas: HTMLCanvasElement, data1D: number[], resX: number, resY: number, maxVal: number, colormap: 'hot' | 'viridis') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / resX;
    const cellH = h / resY;
    
    ctx.clearRect(0, 0, w, h);
    
    for (let i = 0; i < resY; i++) {
      for (let j = 0; j < resX; j++) {
        const val = data1D[i * resX + j];
        const normalized = maxVal > 0 ? Math.min(1, Math.max(0, val / maxVal)) : 0;
        
        let color = '';
        if (colormap === 'hot') {
          const r = Math.min(255, Math.floor(normalized * 3 * 255));
          const g = Math.min(255, Math.floor((normalized - 0.33) * 3 * 255 * (normalized > 0.33 ? 1 : 0)));
          const b = Math.min(255, Math.floor((normalized - 0.66) * 3 * 255 * (normalized > 0.66 ? 1 : 0)));
          color = `rgb(${r},${g},${b})`;
        } else {
          const intensity = Math.floor(normalized * 255);
          color = `rgb(${intensity},${intensity},${intensity})`;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(j * cellW, i * cellH, Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  };

  useEffect(() => {
    if (result && canvasMeanRef.current && canvasSigmaRef.current) {
      drawHeatmap(canvasMeanRef.current, result.pixels_1d, result.resolution[0], result.resolution[1], result.max_expected_intensity, 'hot');
      const maxSigma = Math.sqrt(result.max_expected_intensity);
      drawHeatmap(canvasSigmaRef.current, result.pixels_noise_sigma, result.resolution[0], result.resolution[1], maxSigma, 'viridis');
    }
  }, [result]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Camera className="w-8 h-8 text-orange-600" />
            Phase 19: In-Situ Optical Tomography
          </h1>
          <p className="text-slate-500 mt-1">Analytical expected photon flux and rigorous statistical uncertainty bounds (NETD).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-500" />
              Sensor & Laser Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Laser Power (W)</Label>
                <Input type="number" value={params.laserPower} onChange={e => setParams({...params, laserPower: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <Label>Scan Speed (mm/s)</Label>
                <Input type="number" value={params.scanSpeed} onChange={e => setParams({...params, scanSpeed: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <Label>Thermal Cond. (W/mK)</Label>
                <Input type="number" value={params.thermalK} onChange={e => setParams({...params, thermalK: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <Label>Thermal Diffusivity (m²/s)</Label>
                <Input type="number" value={params.thermalAlpha} onChange={e => setParams({...params, thermalAlpha: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Field of View (µm)</Label>
                <Input type="number" value={params.fov} onChange={e => setParams({...params, fov: parseFloat(e.target.value)})} />
              </div>
            </div>
            
            <Button onClick={handleSimulate} disabled={loading} className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
              {loading ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Generate Tomography Data
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-2 shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg">Sensor Outputs</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {result ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center">
                  <h3 className="font-semibold text-slate-700 mb-2">Expected Intensity (Mean)</h3>
                  <div className="w-full max-w-[300px] aspect-square border border-slate-300 rounded-sm overflow-hidden bg-black">
                    <canvas ref={canvasMeanRef} width={300} height={300} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Peak: {result.max_expected_intensity.toFixed(1)} ADU</p>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="font-semibold text-slate-700 mb-2">Noise Bound (1-Sigma)</h3>
                  <div className="w-full max-w-[300px] aspect-square border border-slate-300 rounded-sm overflow-hidden bg-black">
                    <canvas ref={canvasSigmaRef} width={300} height={300} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Analytical Poisson standard deviation</p>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center">
                <Camera className="w-12 h-12 mb-3 opacity-20" />
                <p>Run simulation to view expected sensor frames.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

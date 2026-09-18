import React, { useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { pythonComputationService } from '../services/pythonComputationService';

export const ModulusFNOLab: React.FC = () => {
  const [laserPower, setLaserPower] = useState(350);
  const [scanSpeed, setScanSpeed] = useState(1200);
  const [preheatTemp, setPreheatTemp] = useState(200);
  const [hatch, setHatch] = useState(100);
  const [layer, setLayer] = useState(40);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await pythonComputationService.computeModulusFNO({
        laserPower_W: laserPower,
        scanSpeed_mms: scanSpeed,
        preheatTemp_C: preheatTemp,
        hatch_um: hatch,
        layer_um: layer,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Computation failed');
    } finally {
      setIsLoading(false);
    }
  }, [laserPower, scanSpeed, preheatTemp, hatch, layer]);

  // Generate chart data based on result thermal_field_sample
  const chartData = result?.thermal_field_sample?.map((temp: number, index: number) => ({
    z: index * layer,
    temperature: temp
  })) || [];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200">
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-bold text-white">Modulus FNO Surrogate Lab</h2>
          <p className="text-sm text-gray-400">Phase 11: 3D Part-scale Thermal History Prediction via NVIDIA Fourier Neural Operators</p>
        </div>
        <button
          onClick={handlePredict}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium disabled:opacity-50"
        >
          {isLoading ? 'Running Inference...' : 'Predict Thermal History'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 p-4 border-r border-gray-700 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Process Variables</h3>
            
            <label className="block text-sm">
              <span className="text-gray-400">Laser Power (W)</span>
              <input type="range" min={50} max={1000} step={10} value={laserPower} onChange={e => setLaserPower(Number(e.target.value))} className="w-full mt-2" />
              <div className="text-right text-white font-mono">{laserPower} W</div>
            </label>

            <label className="block text-sm">
              <span className="text-gray-400">Scan Speed (mm/s)</span>
              <input type="range" min={100} max={3000} step={50} value={scanSpeed} onChange={e => setScanSpeed(Number(e.target.value))} className="w-full mt-2" />
              <div className="text-right text-white font-mono">{scanSpeed} mm/s</div>
            </label>

            <label className="block text-sm">
              <span className="text-gray-400">Preheat Temp (°C)</span>
              <input type="range" min={25} max={800} step={25} value={preheatTemp} onChange={e => setPreheatTemp(Number(e.target.value))} className="w-full mt-2" />
              <div className="text-right text-white font-mono">{preheatTemp} °C</div>
            </label>

            <label className="block text-sm">
              <span className="text-gray-400">Hatch Spacing (µm)</span>
              <input type="range" min={40} max={200} step={5} value={hatch} onChange={e => setHatch(Number(e.target.value))} className="w-full mt-2" />
              <div className="text-right text-white font-mono">{hatch} µm</div>
            </label>

            <label className="block text-sm">
              <span className="text-gray-400">Layer Thickness (µm)</span>
              <input type="range" min={20} max={100} step={5} value={layer} onChange={e => setLayer(Number(e.target.value))} className="w-full mt-2" />
              <div className="text-right text-white font-mono">{layer} µm</div>
            </label>
          </div>
          
          <div className="p-3 bg-green-900/30 border border-green-800 rounded text-sm text-green-200">
            <strong>Fourier Neural Operator:</strong> Solves the time-dependent PDE in the frequency domain, achieving massive speedups (ms vs hours) for full-part thermal histories while maintaining physical fidelity.
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-950">
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-700 text-red-200 rounded">
              Error: {error}
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="flex h-full items-center justify-center text-gray-500">
              Configure parameters and run Modulus FNO to view part-scale thermal predictions.
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-3 rounded-lg bg-gray-800 border border-gray-700 min-w-[120px]">
                  <span className="text-xs text-gray-400 mb-1">Max Temp</span>
                  <span className="text-lg font-mono font-bold text-red-400">
                    {result.max_temp_C?.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">°C</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-gray-800 border border-gray-700 min-w-[120px]">
                  <span className="text-xs text-gray-400 mb-1">Avg Cooling Rate</span>
                  <span className="text-lg font-mono font-bold text-blue-400">
                    {result.avg_cooling_rate_Ks?.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">K/s</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-gray-800 border border-gray-700 min-w-[120px]">
                  <span className="text-xs text-gray-400 mb-1">Inference Time</span>
                  <span className="text-lg font-mono font-bold text-green-400">
                    {result.inference_time_ms?.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500">ms</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-gray-800 border border-gray-700 min-w-[120px]">
                  <span className="text-xs text-gray-400 mb-1">Grid Resolution</span>
                  <span className="text-lg font-mono font-bold text-purple-400">
                    {result.grid_shape?.[0]}x{result.grid_shape?.[1]}x{result.grid_shape?.[2]}
                  </span>
                  <span className="text-xs text-gray-500">voxels</span>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded p-4 h-[400px] flex flex-col">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Depth Temperature Profile (Z-axis Sample)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="z" label={{ value: 'Depth (µm)', position: 'insideBottomRight', offset: -10, fill: '#9ca3af' }} stroke="#9ca3af" />
                    <YAxis label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} stroke="#9ca3af" domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                    <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">FNO Model Status</h3>
                <p className="text-sm text-gray-400 mb-2">
                  The Fourier Neural Operator was executed on <strong>{result.device}</strong>. It predicts the 3D transient scalar field much faster than a standard CFD/FEA solver by evaluating the global convolution in the Fourier domain.
                </p>
                <div className="flex gap-4 items-center">
                  <div className="px-3 py-1 rounded text-sm font-bold bg-green-900/50 text-green-400 border border-green-700">
                    Modulus FNO: ACTIVE
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

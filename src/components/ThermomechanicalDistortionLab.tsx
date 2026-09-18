/**
 * ThermomechanicalDistortionLab.tsx  — Phase 9
 * ================================================
 * Macroscopic Thermomechanical Distortion and Keyhole Porosity Lab.
 *
 * Visualises:
 *   - Inherent Strain components (exx, eyy, ezz)
 *   - Residual Stress vs Yield Strength
 *   - Distortion estimates
 *   - Keyhole Porosity risk (King & Cunningham criteria)
 */

import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { pythonComputationService } from '../services/pythonComputationService';
import type { ThermomechanicalDistortionResult } from '../services/pythonComputationService';

const ALLOY_DEFAULTS: Record<string, { melting_temp_c: number; cte: number; youngs_modulus_gpa: number; yield_strength_mpa: number }> = {
  'Inconel 718': { melting_temp_c: 1336, cte: 1.3e-5, youngs_modulus_gpa: 200, yield_strength_mpa: 1050 },
  'Ti-6Al-4V':   { melting_temp_c: 1604, cte: 8.6e-6, youngs_modulus_gpa: 114, yield_strength_mpa: 880 },
  'AlSi10Mg':    { melting_temp_c: 570,  cte: 2.1e-5, youngs_modulus_gpa: 70,  yield_strength_mpa: 240 },
  '316L SS':     { melting_temp_c: 1370, cte: 1.6e-5, youngs_modulus_gpa: 195, yield_strength_mpa: 450 },
};

const InfoBadge: React.FC<{ label: string; value: string | number; unit?: string; color?: string }> = ({
  label, value, unit, color = '#94a3b8'
}) => (
  <div className="flex flex-col items-center p-3 rounded-lg bg-gray-800 border border-gray-700 min-w-[120px]">
    <span className="text-xs text-gray-400 mb-1">{label}</span>
    <span className="text-lg font-mono font-bold" style={{ color }}>
      {typeof value === 'number' ? (Math.abs(value) < 0.01 && value !== 0 ? value.toExponential(2) : value.toFixed(3)) : value}
    </span>
    {unit && <span className="text-xs text-gray-500">{unit}</span>}
  </div>
);

export const ThermomechanicalDistortionLab: React.FC = () => {
  const [laserPower, setLaserPower] = useState(250);
  const [scanSpeed, setScanSpeed] = useState(1000);
  const [preheatTemp, setPreheatTemp] = useState(25);
  const [selectedAlloy, setSelectedAlloy] = useState('Ti-6Al-4V');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ThermomechanicalDistortionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alloyProps = ALLOY_DEFAULTS[selectedAlloy] ?? ALLOY_DEFAULTS['Ti-6Al-4V'];

  const handleCompute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await pythonComputationService.computeThermomechanicalDistortion({
        params: {
          laserPower_W: laserPower,
          scanSpeed_mms: scanSpeed,
          preheatTemp_C: preheatTemp,
        },
        material: alloyProps,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Computation failed');
    } finally {
      setIsLoading(false);
    }
  }, [laserPower, scanSpeed, preheatTemp, alloyProps]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200">
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-bold text-white">Thermomechanical & Distortion Lab</h2>
          <p className="text-sm text-gray-400">Phase 9: Macro-Scale Inherent Strain & Keyhole Porosity Coupling</p>
        </div>
        <button
          onClick={handleCompute}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium disabled:opacity-50"
        >
          {isLoading ? 'Computing...' : 'Run Analysis'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 p-4 border-r border-gray-700 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Process Params</h3>
            
            <label className="block text-sm">
              <span className="text-gray-400">Material</span>
              <select
                className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                value={selectedAlloy}
                onChange={e => setSelectedAlloy(e.target.value)}
              >
                {Object.keys(ALLOY_DEFAULTS).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>

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
          </div>
          
          <div className="p-3 bg-blue-900/30 border border-blue-800 rounded text-sm text-blue-200">
            <strong>Inherent Strain Model:</strong> Computes macroscopic strain based on local thermal history gradient against yield constraints, providing a fast part-scale screening tool.
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
              Configure parameters and run analysis to view thermomechanical distortion.
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <InfoBadge label="In-Plane Strain (\u03B5xx)" value={result.strains.exx} unit="m/m" color="#3b82f6" />
                <InfoBadge label="Out-Plane Strain (\u03B5zz)" value={result.strains.ezz} unit="m/m" color="#10b981" />
                <InfoBadge label="Max Deflection" value={result.distortion.maxDeflection_mm} unit="mm" color={result.distortion.maxDeflection_mm > 1.0 ? '#ef4444' : '#f59e0b'} />
                <InfoBadge label="Residual Stress" value={result.residualStress.vonMises_MPa} unit="MPa" color={result.residualStress.riskLevel === 'high' ? '#ef4444' : '#22c55e'} />
              </div>

              <div className="grid grid-cols-2 gap-6 h-80">
                <div className="bg-gray-800 border border-gray-700 rounded p-4 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Inherent Strain Components</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'εxx (Scan)', value: result.strains.exx * 1000 },
                      { name: 'εyy (Trans)', value: result.strains.eyy * 1000 },
                      { name: 'εzz (Build)', value: result.strains.ezz * 1000 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis label={{ value: 'Strain \u00D7 10\u207B\u00B3', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                      <Bar dataKey="value" fill="#3b82f6">
                        {
                          [0,1,2].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 2 ? '#10b981' : '#3b82f6'} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 rounded p-4 flex flex-col">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Residual Stress vs Yield Limit</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Estimated von Mises', value: result.residualStress.vonMises_MPa },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" domain={[0, Math.max(result.residualStress.yieldLimit_MPa * 1.2, result.residualStress.vonMises_MPa * 1.2)]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                      <ReferenceLine y={result.residualStress.yieldLimit_MPa} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Yield Strength Limit', fill: '#ef4444' }} />
                      <Bar dataKey="value" fill={result.residualStress.riskLevel === 'high' ? '#ef4444' : '#f59e0b'} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-gray-800 border border-gray-700 rounded p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Keyhole Porosity & Defect Risk (King & Cunningham Criteria)</h3>
                <p className="text-sm text-gray-400 mb-2">
                  High-speed X-ray vapor depression collapse stability based on enthalpy and morphology limits.
                </p>
                <div className="flex gap-4 items-center">
                  <div className={`px-3 py-1 rounded text-sm font-bold ${result.residualStress.riskLevel === 'high' ? 'bg-red-900/50 text-red-400 border border-red-700' : 'bg-green-900/50 text-green-400 border border-green-700'}`}>
                    Porosity Trap Risk: {result.residualStress.riskLevel.toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-500">Note: Full defect screening requires melt pool aspect ratio coupling.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

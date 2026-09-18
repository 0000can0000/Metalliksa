/**
 * SolidificationMicrostructureLab.tsx  — Phase 8
 * ================================================
 * Microstructure Lab UI component for LPBF solidification analysis.
 *
 * Visualises:
 *   - G-R Map: Recharts scatter plot with Hunt CET boundary lines
 *   - PDAS/SDAS: Bar chart with literature reference ranges
 *   - Morphology: Pie/doughnut chart (columnar vs equiaxed vs mixed)
 *   - Diagnostics: CFD field summary
 *
 * Calls /api/python/lpbf-solidification-microstructure via
 * pythonComputationService.computeSolidificationMicrostructure().
 */

import React, { useState, useCallback } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
  PieChart, Pie, Legend, LabelList,
} from 'recharts';
import { pythonComputationService } from '../services/pythonComputationService';
import type { SolidificationMicrostructureResult } from '../services/pythonComputationService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOY_DEFAULTS: Record<string, { k_WmK: number; liquidus_K: number; absorptivity: number }> = {
  'Inconel 718': { k_WmK: 14.7, liquidus_K: 1609, absorptivity: 0.35 },
  'Ti-6Al-4V':   { k_WmK: 7.0,  liquidus_K: 1933, absorptivity: 0.40 },
  'AlSi10Mg':    { k_WmK: 160.0, liquidus_K: 850,  absorptivity: 0.09 },
  '316L SS':     { k_WmK: 16.0, liquidus_K: 1727, absorptivity: 0.35 },
};

const MORPHOLOGY_COLORS: Record<string, string> = {
  columnar: '#3b82f6',
  equiaxed: '#22c55e',
  mixed:    '#f59e0b',
};

// Hunt G/R boundary lines for G-R map:
//   columnar/mixed threshold: G/R = 1e8  → G = 1e8 * R
//   mixed/equiaxed threshold: G/R = 1e6  → G = 1e6 * R
const GR_SCATTER = Array.from({ length: 40 }, (_, i) => {
  const R = Math.exp(Math.log(1e-5) + (i / 39) * Math.log(2 / 1e-5));
  return {
    R_ms: R,
    G_col: 1e8 * R,  // columnar/mixed boundary
    G_eq:  1e6 * R,  // mixed/equiaxed boundary
  };
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const InfoBadge: React.FC<{ label: string; value: string | number; unit?: string; color?: string }> = ({
  label, value, unit, color = '#94a3b8'
}) => (
  <div className="flex flex-col items-center p-3 rounded-lg bg-gray-800 border border-gray-700 min-w-[120px]">
    <span className="text-xs text-gray-400 mb-1">{label}</span>
    <span className="text-lg font-mono font-bold" style={{ color }}>
      {typeof value === 'number' ? value.toExponential(2) : value}
    </span>
    {unit && <span className="text-xs text-gray-500">{unit}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface Props {
  onSendToModule?: (moduleId: string, data: unknown) => void;
}

export const SolidificationMicrostructureLab: React.FC<Props> = ({ onSendToModule }) => {
  // Process parameters
  const [laserPower, setLaserPower] = useState(285);
  const [scanSpeed, setScanSpeed] = useState(960);
  const [hatch, setHatch] = useState(110);
  const [layerThickness, setLayerThickness] = useState(40);
  const [selectedAlloy, setSelectedAlloy] = useState('Inconel 718');

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SolidificationMicrostructureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gr-map' | 'spacing' | 'morphology' | 'diagnostics'>('gr-map');

  const alloyProps = ALLOY_DEFAULTS[selectedAlloy] ?? ALLOY_DEFAULTS['Inconel 718'];

  const handleCompute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await pythonComputationService.computeSolidificationMicrostructure({
        params: {
          power_W: laserPower,
          speed_mm_s: scanSpeed,
          hatch_um: hatch,
          layerThickness_um: layerThickness,
        },
        material: {
          k_WmK: alloyProps.k_WmK,
          liquidus_K: alloyProps.liquidus_K,
          absorptivity: alloyProps.absorptivity,
        },
      });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Computation failed');
    } finally {
      setIsLoading(false);
    }
  }, [laserPower, scanSpeed, hatch, layerThickness, alloyProps]);

  // ---- G-R Map data point ------------------------------------------------
  const grPoint = result
    ? [{ R_ms: result.R_m_s, G_K_m: result.G_K_m }]
    : [];

  // ---- PDAS/SDAS bar data ------------------------------------------------
  const spacingData = result
    ? [
        { name: 'PDAS', value: result.PDAS_um, ref_lo: 1.0, ref_hi: 30.0 },
        { name: 'SDAS', value: result.SDAS_um, ref_lo: 0.5, ref_hi: 15.0 },
      ]
    : [];

  // ---- Morphology pie data -----------------------------------------------
  const morphData = result
    ? (Object.entries(result.morphologyFractions) as [string, number][])
        .filter(([, v]) => v > 0.005)
        .map(([k, v]) => ({
          name: k.charAt(0).toUpperCase() + k.slice(1),
          value: parseFloat((v * 100).toFixed(1)),
          fill: MORPHOLOGY_COLORS[k] ?? '#6b7280',
        }))
    : [];

  // ---- Morphology badge color --------------------------------------------
  const morphColor = result
    ? MORPHOLOGY_COLORS[result.morphology] ?? '#6b7280'
    : '#6b7280';

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Microstructure Lab</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            In-situ G/R solidification front · Hunt-Lu PDAS · Kirkwood SDAS · Dendrite morphology
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-blue-900/60 text-blue-300 font-mono">Phase 8</span>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 bg-gray-800 rounded-lg p-3 border border-gray-700">
        {/* Alloy selector */}
        <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
          <label className="text-xs text-gray-400">Alloy</label>
          <select
            className="bg-gray-700 text-gray-100 rounded px-2 py-1 text-sm border border-gray-600"
            value={selectedAlloy}
            onChange={e => setSelectedAlloy(e.target.value)}
          >
            {Object.keys(ALLOY_DEFAULTS).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Numeric inputs */}
        {[
          { label: 'Power (W)', val: laserPower, set: setLaserPower, min: 50, max: 1000, step: 5 },
          { label: 'Speed (mm/s)', val: scanSpeed, set: setScanSpeed, min: 100, max: 3000, step: 10 },
          { label: 'Hatch (µm)', val: hatch, set: setHatch, min: 50, max: 300, step: 5 },
          { label: 'Layer (µm)', val: layerThickness, set: setLayerThickness, min: 20, max: 120, step: 5 },
        ].map(({ label, val, set, min, max, step }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">{label}</label>
            <input
              type="number"
              className="bg-gray-700 text-gray-100 rounded px-2 py-1 text-sm border border-gray-600 w-full"
              value={val}
              min={min}
              max={max}
              step={step}
              onChange={e => set(Number(e.target.value))}
            />
          </div>
        ))}

        {/* Compute button */}
        <div className="flex items-end">
          <button
            onClick={handleCompute}
            disabled={isLoading}
            className={`w-full py-2 rounded text-sm font-semibold transition-colors ${
              isLoading
                ? 'bg-blue-900/40 text-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isLoading ? 'Computing…' : 'Compute'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* KPI badges */}
          <div className="flex flex-wrap gap-3">
            <InfoBadge label="Thermal Gradient G" value={result.G_K_m} unit="K/m" color="#60a5fa" />
            <InfoBadge label="Solidification Rate R" value={result.R_m_s} unit="m/s" color="#34d399" />
            <InfoBadge label="Cooling Rate Ṫ" value={result.coolingRate_K_s} unit="K/s" color="#f87171" />
            <InfoBadge label="PDAS λ₁" value={`${result.PDAS_um.toFixed(1)} µm`} color="#a78bfa" />
            <InfoBadge label="SDAS λ₂" value={`${result.SDAS_um.toFixed(1)} µm`} color="#fb923c" />
            <div className="flex flex-col items-center p-3 rounded-lg bg-gray-800 border border-gray-700 min-w-[120px]">
              <span className="text-xs text-gray-400 mb-1">Morphology</span>
              <span className="text-base font-bold capitalize" style={{ color: morphColor }}>
                {result.morphology}
              </span>
              <span className="text-xs text-gray-500">{result.source.includes('rosenthal') ? 'analytical' : 'CFD'}</span>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1">
            {(['gr-map', 'spacing', 'morphology', 'diagnostics'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab === 'gr-map' ? 'G-R Map' : tab === 'spacing' ? 'PDAS / SDAS' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Chart panels */}
          <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-3 min-h-[300px]">

            {/* G-R Map */}
            {activeTab === 'gr-map' && (
              <div className="h-full">
                <p className="text-xs text-gray-400 mb-2">
                  Hunt G/R morphology map — boundaries: columnar/mixed at G/R = 10⁸, mixed/equiaxed at G/R = 10⁶
                </p>
                <ResponsiveContainer width="100%" height="90%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="R_ms"
                      type="number"
                      scale="log"
                      domain={[1e-5, 2]}
                      name="R (m/s)"
                      tickFormatter={v => v.toExponential(0)}
                      label={{ value: 'R (m/s)', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="G_K_m"
                      type="number"
                      scale="log"
                      domain={[1e4, 1e10]}
                      name="G (K/m)"
                      tickFormatter={v => v.toExponential(0)}
                      label={{ value: 'G (K/m)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(v: number, name: string) => [v.toExponential(3), name]}
                    />
                    {/* Boundary lines (columnar/mixed) */}
                    {GR_SCATTER.slice(0, -1).map((pt, i) => (
                      <ReferenceLine key={`col-${i}`}
                        segment={[{ x: pt.R_ms, y: pt.G_col }, { x: GR_SCATTER[i+1].R_ms, y: GR_SCATTER[i+1].G_col }]}
                        stroke="#3b82f6" strokeDasharray="4 2" strokeOpacity={0.6}
                      />
                    ))}
                    {/* Boundary lines (mixed/equiaxed) */}
                    {GR_SCATTER.slice(0, -1).map((pt, i) => (
                      <ReferenceLine key={`eq-${i}`}
                        segment={[{ x: pt.R_ms, y: pt.G_eq }, { x: GR_SCATTER[i+1].R_ms, y: GR_SCATTER[i+1].G_eq }]}
                        stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.6}
                      />
                    ))}
                    {/* Operating point */}
                    <Scatter
                      data={grPoint}
                      dataKey="G_K_m"
                      fill={morphColor}
                      name="Operating point"
                      shape="star"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* PDAS / SDAS bar chart */}
            {activeTab === 'spacing' && (
              <div className="h-full">
                <p className="text-xs text-gray-400 mb-2">
                  Hunt-Lu PDAS and Kirkwood SDAS with typical LPBF reference range
                </p>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={spacingData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis
                      unit=" µm"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      label={{ value: 'Spacing (µm)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(2)} µm`]}
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '6px' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {spacingData.map((entry) => (
                        <Cell key={entry.name} fill={entry.name === 'PDAS' ? '#a78bfa' : '#fb923c'} />
                      ))}
                      <LabelList dataKey="value" position="top" formatter={(v: number) => `${v.toFixed(2)} µm`} fill="#e5e7eb" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Typical LPBF range: PDAS 1–30 µm | SDAS 0.5–15 µm
                </p>
              </div>
            )}

            {/* Morphology pie chart */}
            {activeTab === 'morphology' && (
              <div className="h-full flex flex-col">
                <p className="text-xs text-gray-400 mb-2">
                  Hunt G/R criterion — morphology distribution at solidification front
                </p>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={morphData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={60}
                      dataKey="value"
                      label={({ name, value }) => `${name} ${value}%`}
                      labelLine={{ stroke: '#6b7280' }}
                    >
                      {morphData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`]}
                      contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '6px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Diagnostics */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Thermal Field</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          ['G (mean)', `${result.G_K_m.toExponential(3)} K/m`],
                          ['G (max)',  `${result.maxG_K_m.toExponential(3)} K/m`],
                          ['R (mean)', `${result.R_m_s.toExponential(3)} m/s`],
                          ['R (max)',  `${result.maxR_m_s.toExponential(3)} m/s`],
                          ['Ṫ (mean)', `${result.coolingRate_K_s.toExponential(3)} K/s`],
                        ].map(([k, v]) => (
                          <tr key={k}>
                            <td className="text-gray-400 py-0.5 pr-2">{k}</td>
                            <td className="text-gray-200 font-mono">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Microstructure</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          ['PDAS λ₁', `${result.PDAS_um.toFixed(2)} µm`],
                          ['SDAS λ₂', `${result.SDAS_um.toFixed(2)} µm`],
                          ['Morphology', result.morphology],
                          ['Front cells', result.frontCellCount.toString()],
                          ['Source', result.source.includes('rosenthal') ? 'Rosenthal' : 'OpenFOAM CFD'],
                        ].map(([k, v]) => (
                          <tr key={k}>
                            <td className="text-gray-400 py-0.5 pr-2">{k}</td>
                            <td className="text-gray-200 font-mono">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded p-2 border border-gray-600">
                  <p className="text-xs text-gray-400 italic">{result.disclaimer}</p>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>📚 Hunt-Lu PDAS: doi:{result.doi.pdas}</p>
                  <p>📚 Kirkwood SDAS: doi:{result.doi.sdas}</p>
                  <p>📚 Hunt morphology: doi:{result.doi.morphology}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Set process parameters above and click <strong className="text-gray-300 mx-1">Compute</strong> to analyse solidification microstructure.
        </div>
      )}
    </div>
  );
};

export default SolidificationMicrostructureLab;

import React, { useState } from "react";
import {
  Activity,
  Layers,
  Flame,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Thermometer,
} from "lucide-react";
import { CandidateAlloySolution } from "../utils/inverseAlloyOptimizer";

interface Props {
  candidate: CandidateAlloySolution;
  serviceTemperature_C: number;
}

export const PhysicalMetallurgyDossier: React.FC<Props> = ({ candidate, serviceTemperature_C }) => {
  const [hoveredTemp, setHoveredTemp] = useState<number | null>(null);

  const { strengthBreakdown, temperatureCurve, scheilKou } = candidate;

  // Find yield strength at user's service temperature
  const closestTempPoint = temperatureCurve.reduce((prev, curr) =>
    Math.abs(curr.temperature_C - serviceTemperature_C) < Math.abs(prev.temperature_C - serviceTemperature_C)
      ? curr
      : prev
  );

  const activeHoverPoint = hoveredTemp !== null
    ? temperatureCurve.find((p) => p.temperature_C === hoveredTemp) || closestTempPoint
    : closestTempPoint;

  // Calculate percentages for strength decomposition bar
  const total = Math.max(1, strengthBreakdown.totalCalculated_MPa);
  const pctPeierls = Math.round((strengthBreakdown.peierlsStress_MPa / total) * 100);
  const pctSS = Math.round((strengthBreakdown.solidSolution_MPa / total) * 100);
  const pctPpt = Math.round((strengthBreakdown.precipitation_MPa / total) * 100);
  const pctGB = Math.round((strengthBreakdown.hallPetchGrain_MPa / total) * 100);

  // SVG dimensions for temperature yield curve
  const svgWidth = 520;
  const svgHeight = 160;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;

  const minT = 25;
  const maxT = Math.max(...temperatureCurve.map((p) => p.temperature_C));
  const maxStrength = Math.max(...temperatureCurve.map((p) => p.yieldStrength_MPa)) * 1.15;

  const getX = (t: number) =>
    padLeft + ((t - minT) / (maxT - minT)) * (svgWidth - padLeft - padRight);
  const getY = (s: number) =>
    svgHeight - padBottom - (s / maxStrength) * (svgHeight - padTop - padBottom);

  const pathD = temperatureCurve
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${getX(p.temperature_C).toFixed(1)} ${getY(p.yieldStrength_MPa).toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L ${getX(maxT).toFixed(1)} ${svgHeight - padBottom} L ${getX(minT).toFixed(1)} ${svgHeight - padBottom} Z`;

  return (
    <div className="space-y-4 pt-2">
      {/* SECTION 1: PHYSICAL STRENGTH DECOMPOSITION */}
      <div className="p-3.5 rounded-xl bg-[#0c1322] border border-[#1a263c] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Physical Yield Strength Decomposition (Additive Strengthening Contributions)</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            Total σ_y = {strengthBreakdown.totalCalculated_MPa} MPa
          </span>
        </div>

        {/* Multi-segment stacked progress bar */}
        <div className="h-3 rounded-full bg-[#070c16] overflow-hidden flex border border-[#162032]">
          <div
            className="bg-slate-400 transition-all duration-300 relative group"
            style={{ width: `${pctPeierls}%` }}
            title={`Peierls Lattice Friction: ${strengthBreakdown.peierlsStress_MPa} MPa (${pctPeierls}%)`}
          />
          <div
            className="bg-sky-500 transition-all duration-300 relative group"
            style={{ width: `${pctSS}%` }}
            title={`Solid Solution Strengthening (Labusch): ${strengthBreakdown.solidSolution_MPa} MPa (${pctSS}%)`}
          />
          <div
            className="bg-emerald-400 transition-all duration-300 relative group"
            style={{ width: `${pctPpt}%` }}
            title={`Precipitation / Orowan Strengthening: ${strengthBreakdown.precipitation_MPa} MPa (${pctPpt}%)`}
          />
          <div
            className="bg-amber-400 transition-all duration-300 relative group"
            style={{ width: `${pctGB}%` }}
            title={`Hall-Petch Grain Boundary: ${strengthBreakdown.hallPetchGrain_MPa} MPa (${pctGB}%)`}
          />
        </div>

        {/* 4 Component Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#070c16] border border-[#162032]">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>σ_0 (Peierls)</span>
              <span className="text-slate-500">{pctPeierls}%</span>
            </div>
            <strong className="text-white text-sm block mt-0.5">{strengthBreakdown.peierlsStress_MPa} MPa</strong>
            <span className="text-[9px] text-slate-500 block leading-tight">Pure Lattice Resistance</span>
          </div>

          <div className="p-2 rounded-lg bg-[#070c16] border border-[#162032]">
            <div className="flex items-center justify-between text-sky-400 text-[10px]">
              <span>Δσ_ss (Solid Solution)</span>
              <span className="text-sky-500">{pctSS}%</span>
            </div>
            <strong className="text-sky-300 text-sm block mt-0.5">{strengthBreakdown.solidSolution_MPa} MPa</strong>
            <span className="text-[9px] text-slate-500 block leading-tight">Labusch Lattice Strain</span>
          </div>

          <div className="p-2 rounded-lg bg-[#070c16] border border-[#162032]">
            <div className="flex items-center justify-between text-emerald-400 text-[10px]">
              <span>Δσ_ppt (Precipitate)</span>
              <span className="text-emerald-500">{pctPpt}%</span>
            </div>
            <strong className="text-emerald-300 text-sm block mt-0.5">{strengthBreakdown.precipitation_MPa} MPa</strong>
            <span className="text-[9px] text-slate-500 block leading-tight">Orowan / Nano-Phases</span>
          </div>

          <div className="p-2 rounded-lg bg-[#070c16] border border-[#162032]">
            <div className="flex items-center justify-between text-amber-400 text-[10px]">
              <span>Δσ_gb (Hall-Petch)</span>
              <span className="text-amber-500">{pctGB}%</span>
            </div>
            <strong className="text-amber-300 text-sm block mt-0.5">{strengthBreakdown.hallPetchGrain_MPa} MPa</strong>
            <span className="text-[9px] text-slate-500 block leading-tight">k_y / √d (20 μm grain)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: TEMPERATURE-DEPENDENT YIELD CURVE & SCHEIL CRACKING METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Yield vs Temperature Curve Graph */}
        <div className="lg:col-span-7 p-3.5 rounded-xl bg-[#0c1322] border border-[#1a263c] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-400" />
              Temperature-Dependent Yield Strength Curve (σ_y vs. T)
            </span>
            <div className="text-[11px] font-mono">
              <span className="text-slate-400">{activeHoverPoint.temperature_C}°C: </span>
              <strong className="text-amber-300">{activeHoverPoint.yieldStrength_MPa} MPa</strong>
            </div>
          </div>

          {/* SVG Graph */}
          <div className="w-full overflow-hidden bg-[#070c16] rounded-lg border border-[#162032] p-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto cursor-crosshair"
              onMouseLeave={() => setHoveredTemp(null)}
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                const y = padTop + ratio * (svgHeight - padTop - padBottom);
                const val = Math.round((1 - ratio) * maxStrength);
                return (
                  <g key={ratio}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Temperature X Grid */}
              {[100, 300, 500, 700, 900, 1100].filter((t) => t <= maxT).map((t) => {
                const x = getX(t);
                return (
                  <g key={t}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={svgHeight - padBottom}
                      stroke="#162032"
                    />
                    <text
                      x={x}
                      y={svgHeight - 8}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {t}°C
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient */}
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#curveGradient)" />
              <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

              {/* Operating Temp Marker */}
              {serviceTemperature_C <= maxT && (
                <g>
                  <line
                    x1={getX(serviceTemperature_C)}
                    y1={padTop}
                    x2={getX(serviceTemperature_C)}
                    y2={svgHeight - padBottom}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  <circle
                    cx={getX(serviceTemperature_C)}
                    cy={getY(closestTempPoint.yieldStrength_MPa)}
                    r="4.5"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* Hover Interactive Dots */}
              {temperatureCurve.map((p) => {
                const x = getX(p.temperature_C);
                const y = getY(p.yieldStrength_MPa);
                return (
                  <circle
                    key={p.temperature_C}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="transparent"
                    className="hover:fill-sky-400 transition cursor-pointer"
                    onMouseEnter={() => setHoveredTemp(p.temperature_C)}
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Target Service Temperature ({serviceTemperature_C}°C): <strong>{closestTempPoint.yieldStrength_MPa} MPa</strong>
            </span>
            <span>Hover over curve to read temperature strength</span>
          </div>
        </div>

        {/* Scheil-Gulliver & Kou Cracking Criteria */}
        <div className="lg:col-span-5 p-3.5 rounded-xl bg-[#0c1322] border border-[#1a263c] flex flex-col justify-between space-y-2.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                Scheil-Gulliver &amp; Kou Cracking Criteria
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  scheilKou.crackingSeverity.includes("Immune") || scheilKou.crackingSeverity.includes("Low")
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {scheilKou.crackingSeverity}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Tear susceptibility index of the interdendritic liquid film during late-stage solidification (fs: 90% → 99%):
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="p-2 rounded-lg bg-[#070c16] border border-[#162032]">
              <span className="text-[10px] text-slate-400 block">Kou Cracking Index:</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                |dT/d(fs^0.5)| = {scheilKou.kouCrackingIndex}
              </div>
              <span className="text-[9px] text-slate-500">Critical threshold: &lt; 50 (for LPBF)</span>
            </div>

            <div className="p-2 rounded-lg bg-[#070c16] border border-[#162032]">
              <span className="text-[10px] text-slate-400 block">Recommended Build Plate Preheat:</span>
              <div className="text-base font-bold text-sky-400 mt-0.5">
                {scheilKou.recommendedPreheatTemp_C}°C
              </div>
              <span className="text-[9px] text-slate-500">Mitigates thermal shock cracking</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#070c16] border border-[#162032] text-[11px] font-mono text-slate-300 flex items-center justify-between">
            <span>Scheil T_90% : <strong>{scheilKou.scheilT90_C}°C</strong></span>
            <span className="text-slate-500">→</span>
            <span>Scheil T_99% : <strong className="text-rose-300">{scheilKou.scheilT99_C}°C</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

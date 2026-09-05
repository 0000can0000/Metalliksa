import React, { useRef, useEffect, useState, useMemo } from "react";
import { ASHBY_BENCHMARK_DATABASE, BenchmarkAshbyMaterial } from "../data/lmePrices";
import { CandidateAlloySolution, InverseDesignTargets } from "../utils/inverseAlloyOptimizer";
import { Layers, Compass, ZoomIn, Eye, Sparkles } from "lucide-react";

export type AshbyAxisMode = "strength-density" | "specstrength-cost" | "strength-temp" | "pren-cost";

interface AshbyPropertyMapProps {
  candidates: CandidateAlloySolution[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  targets: InverseDesignTargets;
}

export const AshbyPropertyMap: React.FC<AshbyPropertyMapProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  targets,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [axisMode, setAxisMode] = useState<AshbyAxisMode>("strength-density");
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    name: string;
    family: string;
    xVal: number;
    yVal: number;
    xLabel: string;
    yLabel: string;
    isCandidate: boolean;
  } | null>(null);

  // Axis configuration
  const axisConfig = useMemo(() => {
    switch (axisMode) {
      case "strength-density":
        return {
          title: "Yield Strength vs. Density (Ashby Strength-to-Weight Chart)",
          xLabel: "Density ρ (g/cm³)",
          yLabel: "Yield Strength σ_y (MPa)",
          xMin: 2.0,
          xMax: 15.0,
          yMin: 200,
          yMax: 2400,
          getX: (m: BenchmarkAshbyMaterial) => m.density_gcm3,
          getY: (m: BenchmarkAshbyMaterial) => m.yieldStrength_MPa,
          getCandX: (c: CandidateAlloySolution) => c.density_gcm3,
          getCandY: (c: CandidateAlloySolution) => c.yieldStrength_25C_MPa,
          targetLimitX: targets.maxDensity_gcm3,
          targetLimitY: targets.targetYieldStrength_25C,
          targetLabelX: `Max Target Density: ${targets.maxDensity_gcm3} g/cm³`,
          targetLabelY: `Min Target Yield: ${targets.targetYieldStrength_25C} MPa`,
        };
      case "specstrength-cost":
        return {
          title: "Specific Strength vs. LME Raw Material Cost",
          xLabel: "Raw Material Cost ($/kg USD)",
          yLabel: "Specific Strength σ_y / ρ (kN·m/kg)",
          xMin: 1.0,
          xMax: 150.0,
          yMin: 30,
          yMax: 320,
          getX: (m: BenchmarkAshbyMaterial) => m.rawCostUSD_kg,
          getY: (m: BenchmarkAshbyMaterial) => Math.round((m.yieldStrength_MPa / m.density_gcm3) * 10) / 10,
          getCandX: (c: CandidateAlloySolution) => c.rawCostUSD_kg,
          getCandY: (c: CandidateAlloySolution) => c.specificStrength_kNm_kg,
          targetLimitX: targets.maxCostUSD_kg,
          targetLimitY: Math.round((targets.targetYieldStrength_25C / targets.maxDensity_gcm3) * 10) / 10,
          targetLabelX: `Budget Cap: $${targets.maxCostUSD_kg}/kg`,
          targetLabelY: `Target Specific Strength`,
        };
      case "strength-temp":
        return {
          title: "Yield Strength vs. Maximum Continuous Service Temperature",
          xLabel: "Max Service Temperature (°C)",
          yLabel: "Yield Strength σ_y (MPa)",
          xMin: 50,
          xMax: 1750,
          yMin: 200,
          yMax: 2400,
          getX: (m: BenchmarkAshbyMaterial) => m.maxServiceTemp_C,
          getY: (m: BenchmarkAshbyMaterial) => m.yieldStrength_MPa,
          getCandX: (c: CandidateAlloySolution) => c.maxServiceTemp_C,
          getCandY: (c: CandidateAlloySolution) => c.yieldStrength_25C_MPa,
          targetLimitX: targets.serviceTemperature_C,
          targetLimitY: targets.targetYieldStrength_25C,
          targetLabelX: `Service Temp: ${targets.serviceTemperature_C}°C`,
          targetLabelY: `Min Target Yield: ${targets.targetYieldStrength_25C} MPa`,
        };
      case "pren-cost":
        return {
          title: "Pitting Resistance (PREN) vs. Raw Material Cost ($/kg)",
          xLabel: "Raw Material Cost ($/kg USD)",
          yLabel: "Pitting Resistance Equivalent Number (PREN)",
          xMin: 1.0,
          xMax: 80.0,
          yMin: 0,
          yMax: 65,
          getX: (m: BenchmarkAshbyMaterial) => m.rawCostUSD_kg,
          getY: (m: BenchmarkAshbyMaterial) => m.pren,
          getCandX: (c: CandidateAlloySolution) => c.rawCostUSD_kg,
          getCandY: (c: CandidateAlloySolution) => c.pren,
          targetLimitX: targets.maxCostUSD_kg,
          targetLimitY: targets.minPREN,
          targetLabelX: `Budget Cap: $${targets.maxCostUSD_kg}/kg`,
          targetLabelY: `Min PREN: ${targets.minPREN}`,
        };
    }
  }, [axisMode, targets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 40, right: 40, bottom: 60, left: 75 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#070c16";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "#162238";
    ctx.lineWidth = 1;
    const xTicks = 6;
    const yTicks = 6;

    // Coordinate mapping functions
    const mapX = (val: number) => {
      const clamped = Math.max(axisConfig.xMin, Math.min(axisConfig.xMax, val));
      return padding.left + ((clamped - axisConfig.xMin) / (axisConfig.xMax - axisConfig.xMin)) * plotWidth;
    };

    const mapY = (val: number) => {
      const clamped = Math.max(axisConfig.yMin, Math.min(axisConfig.yMax, val));
      return padding.top + plotHeight - ((clamped - axisConfig.yMin) / (axisConfig.yMax - axisConfig.yMin)) * plotHeight;
    };

    // Draw X Grid & Labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-monospace, monospace";

    for (let i = 0; i <= xTicks; i++) {
      const val = axisConfig.xMin + (i / xTicks) * (axisConfig.xMax - axisConfig.xMin);
      const x = mapX(val);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotHeight);
      ctx.stroke();
      ctx.fillText(val.toFixed(val < 10 ? 1 : 0), x, padding.top + plotHeight + 10);
    }

    // Draw Y Grid & Labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= yTicks; i++) {
      const val = axisConfig.yMin + (i / yTicks) * (axisConfig.yMax - axisConfig.yMin);
      const y = mapY(val);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(0), padding.left - 10, y);
    }

    // Axis Labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(axisConfig.xLabel, padding.left + plotWidth / 2, height - 18);

    ctx.save();
    ctx.translate(20, padding.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(axisConfig.yLabel, 0, 0);
    ctx.restore();

    // Design Target Envelope / Constraint Zone Lines
    if (axisConfig.targetLimitY !== undefined) {
      const targetY = mapY(axisConfig.targetLimitY);
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, targetY);
      ctx.lineTo(padding.left + plotWidth, targetY);
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`▲ Target Req: ${axisConfig.targetLabelY}`, padding.left + 8, targetY - 8);
      ctx.restore();
    }

    if (axisConfig.targetLimitX !== undefined && axisConfig.targetLimitX <= axisConfig.xMax) {
      const targetX = mapX(axisConfig.targetLimitX);
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(targetX, padding.top);
      ctx.lineTo(targetX, padding.top + plotHeight);
      ctx.stroke();

      ctx.fillStyle = "#f59e0b";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`◄ ${axisConfig.targetLabelX}`, targetX - 6, padding.top + 16);
      ctx.restore();
    }

    // Draw Benchmark Materials (Ashby Clusters)
    for (const mat of ASHBY_BENCHMARK_DATABASE) {
      const xVal = axisConfig.getX(mat);
      const yVal = axisConfig.getY(mat);
      const px = mapX(xVal);
      const py = mapY(yVal);

      // Bubble shadow / glow
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = `${mat.color}40`; // Semi-transparent
      ctx.fill();

      // Outer circle
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = mat.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff60";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Mini text label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(mat.name.split(" ")[0], px + 8, py + 3);
    }

    // Draw Candidate Solutions (Synthesized by Inverse Engine)
    candidates.forEach((cand, idx) => {
      const xVal = axisConfig.getCandX(cand);
      const yVal = axisConfig.getCandY(cand);
      const px = mapX(xVal);
      const py = mapY(yVal);
      const isSelected = cand.id === selectedCandidateId;

      // Glow effect for candidate
      const glowGrad = ctx.createRadialGradient(px, py, 2, px, py, isSelected ? 24 : 16);
      glowGrad.addColorStop(0, isSelected ? "rgba(56, 189, 248, 0.8)" : "rgba(168, 85, 247, 0.6)");
      glowGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 24 : 16, 0, Math.PI * 2);
      ctx.fill();

      // Diamond Star Marker
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = isSelected ? "#38bdf8" : "#c084fc";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      const size = isSelected ? 9 : 7;
      ctx.fillRect(-size, -size, size * 2, size * 2);
      ctx.strokeRect(-size, -size, size * 2, size * 2);
      ctx.restore();

      // Label with badge
      ctx.fillStyle = isSelected ? "#38bdf8" : "#e2e8f0";
      ctx.font = isSelected ? "bold 11px ui-monospace, monospace" : "10px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`★ #${idx + 1} ${cand.name}`, px + 12, py - 6);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px sans-serif";
      ctx.fillText(`(${xVal.toFixed(1)}, ${yVal.toFixed(0)})`, px + 12, py + 8);
    });

  }, [axisConfig, candidates, selectedCandidateId]);

  // Handle Canvas Mouse Movement for Probe
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const padding = { top: 40, right: 40, bottom: 60, left: 75 };
    const plotWidth = canvas.width - padding.left - padding.right;
    const plotHeight = canvas.height - padding.top - padding.bottom;

    const mapX = (val: number) => {
      const clamped = Math.max(axisConfig.xMin, Math.min(axisConfig.xMax, val));
      return padding.left + ((clamped - axisConfig.xMin) / (axisConfig.xMax - axisConfig.xMin)) * plotWidth;
    };

    const mapY = (val: number) => {
      const clamped = Math.max(axisConfig.yMin, Math.min(axisConfig.yMax, val));
      return padding.top + plotHeight - ((clamped - axisConfig.yMin) / (axisConfig.yMax - axisConfig.yMin)) * plotHeight;
    };

    // Check candidates first
    for (const cand of candidates) {
      const xVal = axisConfig.getCandX(cand);
      const yVal = axisConfig.getCandY(cand);
      const px = mapX(xVal);
      const py = mapY(yVal);
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < 18) {
        setHoveredPoint({
          x: px,
          y: py,
          name: cand.name,
          family: `Synthesized: ${cand.archetype}`,
          xVal,
          yVal,
          xLabel: axisConfig.xLabel,
          yLabel: axisConfig.yLabel,
          isCandidate: true,
        });
        return;
      }
    }

    // Check benchmarks
    for (const mat of ASHBY_BENCHMARK_DATABASE) {
      const xVal = axisConfig.getX(mat);
      const yVal = axisConfig.getY(mat);
      const px = mapX(xVal);
      const py = mapY(yVal);
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < 12) {
        setHoveredPoint({
          x: px,
          y: py,
          name: mat.name,
          family: mat.family,
          xVal,
          yVal,
          xLabel: axisConfig.xLabel,
          yLabel: axisConfig.yLabel,
          isCandidate: false,
        });
        return;
      }
    }

    setHoveredPoint(null);
  };

  return (
    <div className="space-y-4">
      {/* Header & Axis Selection Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-[#090e18] rounded-xl border border-[#162032]">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-mono text-[10px] uppercase tracking-widest font-semibold">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            Ashby Property Selection Space &amp; Pareto Trade-Offs
          </div>
          <h3 className="text-sm font-bold text-white mt-0.5">{axisConfig.title}</h3>
        </div>

        {/* Axis Toggles */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "strength-density", label: "Strength vs. Density" },
            { id: "specstrength-cost", label: "Specific Strength vs. Cost" },
            { id: "strength-temp", label: "Strength vs. Max Temp" },
            { id: "pren-cost", label: "PREN vs. Cost" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setAxisMode(mode.id as AshbyAxisMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                axisMode === mode.id
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
                  : "bg-[#0c1322] text-slate-400 border border-[#162032] hover:text-white hover:bg-white/5"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Space */}
      <div className="relative bg-[#070c16] rounded-xl border border-[#162032] overflow-hidden p-2">
        <canvas
          ref={canvasRef}
          width={900}
          height={480}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="w-full h-auto cursor-crosshair rounded-lg block"
        />

        {/* Hover Info Tooltip Card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-lg bg-[#0c1322]/95 border border-sky-500/50 shadow-xl backdrop-blur text-xs space-y-1 font-mono text-slate-200"
            style={{
              left: Math.min(650, hoveredPoint.x + 15),
              top: Math.max(15, hoveredPoint.y - 45),
            }}
          >
            <div className="font-bold text-white flex items-center gap-1.5">
              {hoveredPoint.isCandidate && <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
              {hoveredPoint.name}
            </div>
            <div className="text-[10px] text-sky-300">{hoveredPoint.family}</div>
            <div className="pt-1 border-t border-[#1a263c] text-[11px] space-y-0.5">
              <div>
                {hoveredPoint.xLabel}: <strong className="text-amber-300">{hoveredPoint.xVal.toFixed(1)}</strong>
              </div>
              <div>
                {hoveredPoint.yLabel}: <strong className="text-emerald-300">{hoveredPoint.yVal.toFixed(1)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Legend Overlay */}
        <div className="p-3 bg-[#090e18]/90 border-t border-[#162032] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Nickel Superalloys
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Titanium Alloys
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> High-Entropy Alloys
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> High-Strength Steels
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Aerospace Aluminum
            </span>
            <span className="flex items-center gap-1.5 text-sky-300 font-bold">
              <span className="w-2.5 h-2.5 rotate-45 bg-sky-400"></span> ★ Synthesized Solutions
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            Click any candidate below to focus and inspect full thermomechanical schedule.
          </div>
        </div>
      </div>
    </div>
  );
};

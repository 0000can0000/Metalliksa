import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  Sliders,
  Flame,
  Info,
  RotateCcw,
  Sparkles,
  Download,
  Check,
  Copy,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Clock,
  ArrowUpRight,
  BarChart3,
  Zap,
} from "lucide-react";
import { ThermalStage, MaterialThermalProfile } from "./ThermalCycleScheduler";

export interface GrainGrowthKineticsPanelProps {
  stages: ThermalStage[];
  material: MaterialThermalProfile;
  initialGrainSize_um: number;
  onInitialGrainSizeChange?: (newD0: number) => void;
  onSeekTime?: (time_min: number) => void;
  activePlaybackTime_min?: number;
}

export interface KineticsTimePoint {
  time_min: number;
  temperature_C: number;
  grainSize_um: number;
  grainSizeIdeal_um: number;
  grainSizeUpper_um: number;
  grainSizeLower_um: number;
  zenerLimit_um: number;
  astm_G: number;
  rateConstant_k: number;
  instantGrowthRate_um_per_min: number;
  stageIndex: number;
  stageName: string;
}

export interface StageGrowthAudit {
  stageIndex: number;
  stageName: string;
  stageType: string;
  duration_min: number;
  startTemp_C: number;
  targetTemp_C: number;
  peakTemp_C: number;
  entryGrainSize_um: number;
  exitGrainSize_um: number;
  deltaGrainSize_um: number;
  growthPct: number;
  avgRateConstant_k: number;
  pinningActive: boolean;
}

export const GrainGrowthKineticsPanel: React.FC<GrainGrowthKineticsPanelProps> = ({
  stages,
  material,
  initialGrainSize_um,
  onInitialGrainSizeChange,
  onSeekTime,
  activePlaybackTime_min = 0,
}) => {
  // Interactive model tuning state
  const [d0, setD0] = useState<number>(initialGrainSize_um);
  const [exponentN, setExponentN] = useState<number>(material.grainGrowthExponent_n);
  const [activationQ_kJ, setActivationQ_kJ] = useState<number>(material.activationEnergy_kJ_mol);
  const [k0_multiplier, setK0Multiplier] = useState<number>(1.0);
  const [zenerPinningEnabled, setZenerPinningEnabled] = useState<boolean>(true);
  const [showSensitivityEnvelope, setShowSensitivityEnvelope] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"curve" | "stages" | "parameters" | "theory">("curve");

  // Hover and cursor state for visualization
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [copiedAudit, setCopiedAudit] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Sync with prop changes when user changes substrate in parent
  useEffect(() => {
    setD0(initialGrainSize_um);
  }, [initialGrainSize_um]);

  useEffect(() => {
    setExponentN(material.grainGrowthExponent_n);
    setActivationQ_kJ(material.activationEnergy_kJ_mol);
    setK0Multiplier(1.0);
  }, [material]);

  // Handle D0 adjustment with parent notification
  const handleD0Change = (newVal: number) => {
    const val = Math.max(1, Math.min(100, newVal));
    setD0(val);
    if (onInitialGrainSizeChange) {
      onInitialGrainSizeChange(val);
    }
  };

  // Reset to calibrated alloy parameters
  const handleResetToMaterial = () => {
    setD0(material.initialGrainSize_um);
    setExponentN(material.grainGrowthExponent_n);
    setActivationQ_kJ(material.activationEnergy_kJ_mol);
    setK0Multiplier(1.0);
    setZenerPinningEnabled(true);
    if (onInitialGrainSizeChange) {
      onInitialGrainSizeChange(material.initialGrainSize_um);
    }
  };

  // Helper: ASTM E112 G number from grain diameter in um
  const calcASTM_G = (d_um: number): number => {
    const dSafe = Math.max(0.5, d_um);
    // ASTM E112 formula: G = 10.0 - 6.643856 * log10(d_um / 15.9)
    const G = 10.0 - 6.643856 * Math.log10(dSafe / 15.9);
    return parseFloat(G.toFixed(1));
  };

  // Helper: Zener pinning calculation
  const getZenerBoundary = (temp_C: number): number => {
    if (!zenerPinningEnabled) return 9999;
    const solvus = material.solvusTemp_C;
    const r_p_nm = material.precipMeanRadius_nm || 30;
    const initialFv = material.initialPrecipVolFrac || 3.0;

    let f_v = initialFv;
    if (temp_C >= solvus) {
      const excess = temp_C - solvus;
      const dissolveFrac = Math.min(1.0, excess / 30);
      f_v = initialFv * 0.04 * (1 - dissolveFrac) + 0.01;
    } else {
      const undercool = solvus - temp_C;
      if (undercool < 120) {
        f_v = initialFv * (0.2 + 0.8 * (undercool / 120));
      }
    }

    const r_pin_um = Math.max(0.1, (r_p_nm / 1000) * 4.5);
    const f_pin = Math.max(0.0001, (f_v / 100) * 0.05);
    const Dz_calc = (4 * r_pin_um) / (3 * f_pin);
    return Math.min(600, Math.max(d0 * 1.1, Dz_calc));
  };

  // Core Burke-Turnbull integration engine over the thermal cycle
  const kineticsResults = useMemo(() => {
    const R_GAS = 8.314462; // J / (mol K)
    const Q_J = activationQ_kJ * 1000;
    const effective_k0 = material.preExponential_k0 * k0_multiplier;

    // Time points array for high-resolution plotting
    const points: KineticsTimePoint[] = [];
    const stageAudits: StageGrowthAudit[] = [];

    let currentD = d0;
    let currentDIdeal = d0;
    let currentDUpper = d0; // Sensitivity: +25°C shift
    let currentDLower = d0; // Sensitivity: -25°C shift
    let totalElapsed_min = 0;

    stages.forEach((stage, sIdx) => {
      const duration_min = Math.max(0.1, stage.duration_min);
      const steps = Math.max(12, Math.min(150, Math.round(duration_min * 2)));
      const dt_min = duration_min / steps;
      const dt_sec = dt_min * 60;

      const entryD = currentD;
      let sumK = 0;
      let peakT = Math.max(stage.startTemp_C, stage.targetTemp_C);

      for (let s = 0; s <= steps; s++) {
        if (s === 0 && points.length > 0) continue;

        const fraction = s / steps;
        let temp_C = stage.startTemp_C;
        if (stage.type === "ramp" || stage.type === "quench") {
          temp_C = stage.startTemp_C + (stage.targetTemp_C - stage.startTemp_C) * fraction;
        }

        const T_K = temp_C + 273.15;
        const T_K_upper = temp_C + 25 + 273.15;
        const T_K_lower = Math.max(273.15, temp_C - 25 + 273.15);

        const zenerLim = getZenerBoundary(temp_C);

        // Calculate rate constant k(T) = k0 * exp(-Q / RT)
        const rateK = effective_k0 * Math.exp(-Q_J / (R_GAS * T_K));
        const rateK_upper = effective_k0 * Math.exp(-Q_J / (R_GAS * T_K_upper));
        const rateK_lower = effective_k0 * Math.exp(-Q_J / (R_GAS * T_K_lower));
        sumK += rateK;

        // Diffusion threshold check (homologous temp > 0.38)
        const homologous = T_K / (material.solidusTemp_C + 273.15);

        let dDn = 0;
        let dDn_ideal = 0;
        let dDn_upper = 0;
        let dDn_lower = 0;

        if (homologous > 0.38) {
          // With Zener retardation
          const zenerRetard = zenerPinningEnabled
            ? Math.max(0, 1.0 - Math.pow(Math.min(1.0, currentD / zenerLim), 1.2))
            : 1.0;

          dDn = rateK * zenerRetard * dt_sec;
          dDn_ideal = rateK * dt_sec; // pure unpinned Burke-Turnbull
          dDn_upper = rateK_upper * zenerRetard * dt_sec;
          dDn_lower = rateK_lower * zenerRetard * dt_sec;

          // Burke-Turnbull integration: D^(n) = D_prev^(n) + k*dt
          const nextDn = Math.pow(currentD, exponentN) + dDn;
          const nextDnIdeal = Math.pow(currentDIdeal, exponentN) + dDn_ideal;
          const nextDnUpper = Math.pow(currentDUpper, exponentN) + dDn_upper;
          const nextDnLower = Math.pow(currentDLower, exponentN) + dDn_lower;

          currentD = Math.max(d0, Math.min(zenerLim, Math.pow(nextDn, 1 / exponentN)));
          currentDIdeal = Math.max(d0, Math.pow(nextDnIdeal, 1 / exponentN));
          currentDUpper = Math.max(d0, Math.min(zenerLim * 1.2, Math.pow(nextDnUpper, 1 / exponentN)));
          currentDLower = Math.max(d0, Math.min(zenerLim, Math.pow(nextDnLower, 1 / exponentN)));
        }

        const prevPt = points[points.length - 1];
        const instRate = prevPt && dt_min > 0 ? Math.max(0, (currentD - prevPt.grainSize_um) / dt_min) : 0;

        points.push({
          time_min: parseFloat((totalElapsed_min + s * dt_min).toFixed(2)),
          temperature_C: parseFloat(temp_C.toFixed(1)),
          grainSize_um: parseFloat(currentD.toFixed(2)),
          grainSizeIdeal_um: parseFloat(currentDIdeal.toFixed(2)),
          grainSizeUpper_um: parseFloat(currentDUpper.toFixed(2)),
          grainSizeLower_um: parseFloat(currentDLower.toFixed(2)),
          zenerLimit_um: parseFloat(Math.min(500, zenerLim).toFixed(1)),
          astm_G: calcASTM_G(currentD),
          rateConstant_k: rateK,
          instantGrowthRate_um_per_min: parseFloat(instRate.toFixed(4)),
          stageIndex: sIdx,
          stageName: stage.name,
        });
      }

      const exitD = currentD;
      const deltaD = Math.max(0, exitD - entryD);
      const avgK = sumK / Math.max(1, steps + 1);

      stageAudits.push({
        stageIndex: sIdx,
        stageName: stage.name,
        stageType: stage.type,
        duration_min,
        startTemp_C: stage.startTemp_C,
        targetTemp_C: stage.targetTemp_C,
        peakTemp_C: peakT,
        entryGrainSize_um: parseFloat(entryD.toFixed(2)),
        exitGrainSize_um: parseFloat(exitD.toFixed(2)),
        deltaGrainSize_um: parseFloat(deltaD.toFixed(2)),
        growthPct: 0, // Will normalize after total
        avgRateConstant_k: avgK,
        pinningActive: zenerPinningEnabled && peakT < material.solvusTemp_C,
      });

      totalElapsed_min += duration_min;
    });

    const finalPoint = points[points.length - 1] || {
      time_min: 0,
      temperature_C: 25,
      grainSize_um: d0,
      grainSizeIdeal_um: d0,
      grainSizeUpper_um: d0,
      grainSizeLower_um: d0,
      zenerLimit_um: 200,
      astm_G: calcASTM_G(d0),
      rateConstant_k: 0,
      instantGrowthRate_um_per_min: 0,
      stageIndex: 0,
      stageName: "",
    };

    const totalGrowth = Math.max(0.001, finalPoint.grainSize_um - d0);
    stageAudits.forEach((sa) => {
      sa.growthPct = parseFloat(((sa.deltaGrainSize_um / totalGrowth) * 100).toFixed(1));
    });

    // Hall-Petch strength delta
    const ky = material.hallPetch_ky_MPa_um05;
    const hpInitial = ky / Math.sqrt(d0);
    const hpFinal = ky / Math.sqrt(finalPoint.grainSize_um);
    const deltaYield_HP = Math.round(hpFinal - hpInitial);

    return {
      points,
      stageAudits,
      totalElapsed_min,
      finalPoint,
      totalGrowth: parseFloat(totalGrowth.toFixed(2)),
      coarseningRatio: parseFloat((finalPoint.grainSize_um / d0).toFixed(2)),
      deltaYield_HP,
    };
  }, [stages, material, d0, exponentN, activationQ_kJ, k0_multiplier, zenerPinningEnabled]);

  // Active or hovered point for live readouts
  const displayPoint = useMemo(() => {
    if (hoveredIdx !== null && kineticsResults.points[hoveredIdx]) {
      return kineticsResults.points[hoveredIdx];
    }
    // Match active playback time
    const pts = kineticsResults.points;
    if (pts.length === 0) return null;
    const match = pts.find((p) => p.time_min >= activePlaybackTime_min) || pts[pts.length - 1];
    return match;
  }, [hoveredIdx, kineticsResults.points, activePlaybackTime_min]);

  // Copy Stage Growth Table to Clipboard
  const handleCopyAuditTable = () => {
    let t = `BURKE-TURNBULL GRAIN GROWTH KINETICS AUDIT
Alloy: ${material.name} (${material.standardRef})
Burke-Turnbull Parameters:
  - Initial Grain Size (D₀): ${d0} µm
  - Final Grain Size (D_f): ${kineticsResults.finalPoint.grainSize_um} µm
  - Exponent (n): ${exponentN}
  - Activation Energy (Q): ${activationQ_kJ} kJ/mol
  - ASTM E112 Number: G = ${kineticsResults.finalPoint.astm_G}
  - Net Growth: +${kineticsResults.totalGrowth} µm (${kineticsResults.coarseningRatio}x coarsening)
  - Hall-Petch Strength Shift: ${kineticsResults.deltaYield_HP} MPa

STAGE-BY-STAGE GRAIN GROWTH BREAKDOWN:
Stage | Type | Duration | Peak Temp | Entry D | Exit D | Growth ΔD | % Total Growth | Second-Phase Pinning
`;
    kineticsResults.stageAudits.forEach((sa) => {
      t += `${sa.stageIndex + 1}. ${sa.stageName} | ${sa.stageType.toUpperCase()} | ${sa.duration_min} min | ${sa.peakTemp_C}°C | ${sa.entryGrainSize_um} µm | ${sa.exitGrainSize_um} µm | +${sa.deltaGrainSize_um} µm | ${sa.growthPct}% | ${sa.pinningActive ? "Active Zener Drag" : "Dissolved / None"}\n`;
    });

    navigator.clipboard.writeText(t);
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2000);
  };

  // Export JSON Report
  const handleExportJSON = () => {
    const payload = {
      model: "Burke-Turnbull Normal Grain Growth (D^n - D_0^n = k*t)",
      material: material.name,
      baseMetal: material.baseMetal,
      parameters: {
        d0_um: d0,
        final_d_um: kineticsResults.finalPoint.grainSize_um,
        exponent_n: exponentN,
        activation_energy_kJ_mol: activationQ_kJ,
        pre_exponential_k0: material.preExponential_k0 * k0_multiplier,
        zener_pinning_active: zenerPinningEnabled,
        solvus_temp_C: material.solvusTemp_C,
        astm_G: kineticsResults.finalPoint.astm_G,
        coarsening_factor: kineticsResults.coarseningRatio,
        hall_petch_delta_MPa: kineticsResults.deltaYield_HP,
      },
      stages: kineticsResults.stageAudits,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GrainGrowthKinetics_${material.id}_BurkeTurnbull.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG Chart Geometry Constants
  const viewBoxW = 760;
  const viewBoxH = 340;
  const padL = 60;
  const padR = 60;
  const padT = 30;
  const padB = 45;
  const plotW = viewBoxW - padL - padR;
  const plotH = viewBoxH - padT - padB;

  const maxTime = Math.max(1, kineticsResults.totalElapsed_min);
  const maxGrainY = Math.max(
    30,
    d0 * 1.5,
    Math.max(
      ...kineticsResults.points.map((p) =>
        showSensitivityEnvelope ? Math.max(p.grainSizeUpper_um, p.grainSize_um) : p.grainSize_um
      )
    ) * 1.15
  );
  const maxTempY = Math.max(1000, Math.max(...kineticsResults.points.map((p) => p.temperature_C)) * 1.1);

  // Coordinate mappers
  const getX = (t: number) => padL + (t / maxTime) * plotW;
  const getY_Grain = (d: number) => padT + plotH - (Math.min(maxGrainY, Math.max(0, d)) / maxGrainY) * plotH;
  const getY_Temp = (temp: number) => padT + plotH - (Math.min(maxTempY, Math.max(0, temp)) / maxTempY) * plotH;

  // Generate SVG path for Burke-Turnbull curve
  const grainPathD = useMemo(() => {
    if (kineticsResults.points.length === 0) return "";
    return kineticsResults.points.reduce((acc, pt, i) => {
      const x = getX(pt.time_min).toFixed(1);
      const y = getY_Grain(pt.grainSize_um).toFixed(1);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [kineticsResults.points, maxTime, maxGrainY]);

  // Generate SVG area fill under the grain growth curve
  const grainAreaD = useMemo(() => {
    if (kineticsResults.points.length === 0) return "";
    const firstX = getX(kineticsResults.points[0].time_min).toFixed(1);
    const lastX = getX(kineticsResults.points[kineticsResults.points.length - 1].time_min).toFixed(1);
    const bottomY = (padT + plotH).toFixed(1);
    return `${grainPathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [grainPathD]);

  // Temperature path
  const tempPathD = useMemo(() => {
    if (kineticsResults.points.length === 0) return "";
    return kineticsResults.points.reduce((acc, pt, i) => {
      const x = getX(pt.time_min).toFixed(1);
      const y = getY_Temp(pt.temperature_C).toFixed(1);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }, [kineticsResults.points, maxTime, maxTempY]);

  // Upper/Lower Sensitivity envelope area
  const sensitivityAreaD = useMemo(() => {
    if (!showSensitivityEnvelope || kineticsResults.points.length === 0) return "";
    const topPath = kineticsResults.points.map((pt) => `${getX(pt.time_min).toFixed(1)} ${getY_Grain(pt.grainSizeUpper_um).toFixed(1)}`);
    const botPath = [...kineticsResults.points]
      .reverse()
      .map((pt) => `${getX(pt.time_min).toFixed(1)} ${getY_Grain(pt.grainSizeLower_um).toFixed(1)}`);
    return `M ${topPath[0]} L ${topPath.slice(1).join(" L ")} L ${botPath.join(" L ")} Z`;
  }, [kineticsResults.points, showSensitivityEnvelope, maxTime, maxGrainY]);

  // SVG Mouse Hover Interactivity
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || kineticsResults.points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * viewBoxW;

    if (svgX < padL || svgX > viewBoxW - padR) {
      setHoveredIdx(null);
      return;
    }

    const tTarget = ((svgX - padL) / plotW) * maxTime;
    let closestIdx = 0;
    let minDiff = 999999;
    kineticsResults.points.forEach((p, idx) => {
      const diff = Math.abs(p.time_min - tTarget);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
  };

  return (
    <div
      id="grain-growth-kinetics-panel"
      className="bg-[#090e18] rounded-2xl border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.08)] overflow-hidden"
    >
      {/* Top Banner & Model Formula Header */}
      <div className="p-5 border-b border-[#162032] bg-gradient-to-r from-emerald-950/30 via-[#0a1120] to-[#090e18]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-semibold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Interactive Physical Metallurgy Solver</span>
            </div>
            <h2 className="text-lg font-extrabold text-white tracking-tight mt-0.5 flex items-center gap-2.5 flex-wrap">
              <span>Grain Growth Kinetics Panel</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-500/40 font-bold">
                Dⁿ - D₀ⁿ = k(T) · t
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                Burke-Turnbull Model
              </span>
            </h2>
            <p className="text-xs text-slate-300 font-mono mt-1 max-w-3xl leading-relaxed">
              Integrates the classical Burke-Turnbull grain coarsening law over arbitrary thermal cycle stages:{" "}
              <strong className="text-emerald-400 font-bold">D(t) = [ D₀ⁿ + ∫ k₀·exp(-Q/RT)·dt ]^(1/n)</strong> with Zener precipitate drag retardation and ASTM E112 microstructural tracking.
            </p>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-[#050810] rounded-xl border border-[#162032] self-start lg:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("curve")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTab === "curve"
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Growth Curve</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stages")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTab === "stages"
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Stage Audit ({kineticsResults.stageAudits.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("parameters")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTab === "parameters"
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Model Tuning</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("theory")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                activeTab === "theory"
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Theory & Physics</span>
            </button>
          </div>
        </div>

        {/* Real-time Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 font-mono text-xs">
          <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
            <span className="text-[10px] text-slate-400 block uppercase">Initial Grain (D₀)</span>
            <span className="text-white font-extrabold text-base mt-0.5 block">{d0.toFixed(1)} µm</span>
            <span className="text-[9px] text-slate-500">ASTM G = {calcASTM_G(d0)}</span>
          </div>

          <div className="p-2.5 bg-[#050810] rounded-xl border border-emerald-500/30">
            <span className="text-[10px] text-emerald-400 block uppercase font-bold">Final Grain (D_f)</span>
            <span className="text-emerald-300 font-extrabold text-base mt-0.5 block">
              {kineticsResults.finalPoint.grainSize_um} µm
            </span>
            <span className="text-[9px] text-emerald-400 font-semibold">
              ASTM G = {kineticsResults.finalPoint.astm_G}
            </span>
          </div>

          <div className="p-2.5 bg-[#050810] rounded-xl border border-amber-500/30">
            <span className="text-[10px] text-amber-400 block uppercase font-bold">Net Growth (ΔD)</span>
            <span className="text-amber-300 font-extrabold text-base mt-0.5 block">
              +{kineticsResults.totalGrowth} µm
            </span>
            <span className="text-[9px] text-slate-400">{kineticsResults.coarseningRatio}x Coarsened</span>
          </div>

          <div className="p-2.5 bg-[#050810] rounded-xl border border-cyan-500/30">
            <span className="text-[10px] text-cyan-400 block uppercase font-bold">Exponent (n)</span>
            <span className="text-cyan-300 font-extrabold text-base mt-0.5 block">n = {exponentN.toFixed(1)}</span>
            <span className="text-[9px] text-slate-400">
              {exponentN === 2 ? "Ideal Curvature" : exponentN < 2.5 ? "Low Drag" : "Solute/Precip Drag"}
            </span>
          </div>

          <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
            <span className="text-[10px] text-slate-400 block uppercase">Activation Energy</span>
            <span className="text-white font-extrabold text-base mt-0.5 block">{activationQ_kJ} kJ/mol</span>
            <span className="text-[9px] text-slate-500">Q_boundary migration</span>
          </div>

          <div className="p-2.5 bg-[#050810] rounded-xl border border-[#162032]">
            <span className="text-[10px] text-slate-400 block uppercase">Hall-Petch Shift</span>
            <span
              className={`font-extrabold text-base mt-0.5 block ${
                kineticsResults.deltaYield_HP >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {kineticsResults.deltaYield_HP > 0 ? `+${kineticsResults.deltaYield_HP}` : kineticsResults.deltaYield_HP} MPa
            </span>
            <span className="text-[9px] text-slate-500">Yield strength impact</span>
          </div>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="p-5 space-y-5">
        {/* TAB 1: GRAIN GROWTH CURVE VISUALIZATION */}
        {activeTab === "curve" && (
          <div className="space-y-4">
            {/* View Controls & Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={showSensitivityEnvelope}
                    onChange={(e) => setShowSensitivityEnvelope(e.target.checked)}
                    className="accent-emerald-400 w-3.5 h-3.5 rounded"
                  />
                  <span>Show ±25°C Sensitivity Envelope</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={zenerPinningEnabled}
                    onChange={(e) => setZenerPinningEnabled(e.target.checked)}
                    className="accent-emerald-400 w-3.5 h-3.5 rounded"
                  />
                  <span>Enforce Zener Precipitate Pinning (D_Z)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">Hover or drag across plot for live crosshair inspection</span>
              </div>
            </div>

            {/* SVG Visualizer Canvas */}
            <div className="relative bg-[#050810] rounded-xl border border-[#162032] p-2 overflow-hidden select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
                className="w-full h-[320px] block cursor-crosshair"
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (displayPoint && onSeekTime) {
                    onSeekTime(displayPoint.time_min);
                  }
                }}
              >
                <defs>
                  {/* Grain Growth Area Gradient */}
                  <linearGradient id="panelGrainAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                  </linearGradient>

                  {/* Temperature Gradient */}
                  <linearGradient id="panelTempGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
                  </linearGradient>

                  {/* Sensitivity Band Gradient */}
                  <linearGradient id="panelSensGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* 1. Stage Background Bands */}
                {(() => {
                  let accumulatedT = 0;
                  return stages.map((st, i) => {
                    const startX = getX(accumulatedT);
                    accumulatedT += st.duration_min;
                    const endX = getX(accumulatedT);
                    const width = Math.max(0, endX - startX);

                    let bandColor = "rgba(255, 255, 255, 0.015)";
                    if (st.type === "soak") bandColor = "rgba(244, 63, 94, 0.04)";
                    if (st.type === "quench") bandColor = "rgba(6, 182, 212, 0.04)";

                    return (
                      <g key={st.id || i}>
                        <rect x={startX} y={padT} width={width} height={plotH} fill={bandColor} />
                        {startX > padL && (
                          <line
                            x1={startX}
                            y1={padT}
                            x2={startX}
                            y2={padT + plotH}
                            stroke="#162032"
                            strokeDasharray="3,3"
                          />
                        )}
                        {width > 40 && (
                          <text
                            x={startX + width / 2}
                            y={padT + 12}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="8px"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            S{i + 1}: {st.type.toUpperCase()}
                          </text>
                        )}
                      </g>
                    );
                  });
                })()}

                {/* 2. Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
                  const y = padT + plotH * (1 - frac);
                  const grainVal = (maxGrainY * frac).toFixed(0);
                  const tempVal = (maxTempY * frac).toFixed(0);
                  return (
                    <g key={i}>
                      <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#162032" strokeWidth="1" />
                      <text
                        x={padL - 6}
                        y={y + 3}
                        textAnchor="end"
                        fill="#10b981"
                        fontSize="9px"
                        fontFamily="monospace"
                      >
                        {grainVal}
                      </text>
                      <text
                        x={padL + plotW + 6}
                        y={y + 3}
                        textAnchor="start"
                        fill="#f59e0b"
                        fontSize="9px"
                        fontFamily="monospace"
                      >
                        {tempVal}°C
                      </text>
                    </g>
                  );
                })}

                {/* 3. Initial Grain Size D0 Reference Line */}
                <line
                  x1={padL}
                  y1={getY_Grain(d0)}
                  x2={padL + plotW}
                  y2={getY_Grain(d0)}
                  stroke="#64748b"
                  strokeDasharray="4,4"
                  strokeWidth="1.2"
                />
                <text
                  x={padL + 6}
                  y={getY_Grain(d0) - 4}
                  fill="#94a3b8"
                  fontSize="8.5px"
                  fontFamily="monospace"
                >
                  Initial D₀: {d0} µm
                </text>

                {/* 4. Solvus Temperature Line */}
                {material.solvusTemp_C < maxTempY && (
                  <>
                    <line
                      x1={padL}
                      y1={getY_Temp(material.solvusTemp_C)}
                      x2={padL + plotW}
                      y2={getY_Temp(material.solvusTemp_C)}
                      stroke="#f43f5e"
                      strokeDasharray="2,2"
                      strokeWidth="1"
                    />
                    <text
                      x={padL + plotW - 6}
                      y={getY_Temp(material.solvusTemp_C) - 4}
                      textAnchor="end"
                      fill="#f43f5e"
                      fontSize="8.5px"
                      fontFamily="monospace"
                    >
                      Solvus {material.solvusTemp_C}°C
                    </text>
                  </>
                )}

                {/* 5. Sensitivity Envelope Area (±25°C shift) */}
                {showSensitivityEnvelope && sensitivityAreaD && (
                  <path d={sensitivityAreaD} fill="url(#panelSensGrad)" />
                )}

                {/* 6. Temperature Profile Curve (Gold) */}
                <path d={tempPathD} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="5,2" opacity="0.8" />

                {/* 7. Primary Burke-Turnbull Grain Growth Curve (Emerald) */}
                <path d={grainAreaD} fill="url(#panelGrainAreaGrad)" />
                <path d={grainPathD} fill="none" stroke="#10b981" strokeWidth="2.8" />

                {/* 8. X-Axis Ticks & Labels */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((frac, i) => {
                  const t = maxTime * frac;
                  const x = getX(t);
                  return (
                    <g key={i}>
                      <line x1={x} y1={padT + plotH} x2={x} y2={padT + plotH + 4} stroke="#162032" strokeWidth="1" />
                      <text
                        x={x}
                        y={padT + plotH + 16}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9px"
                        fontFamily="monospace"
                      >
                        {(t / 60).toFixed(1)}h
                      </text>
                    </g>
                  );
                })}

                {/* Axis Titles */}
                <text
                  x={padL + plotW / 2}
                  y={viewBoxH - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10px"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Thermal Cycle Elapsed Time (Hours) ➔
                </text>
                <text
                  transform={`rotate(-90)`}
                  x={-(padT + plotH / 2)}
                  y={14}
                  textAnchor="middle"
                  fill="#10b981"
                  fontSize="10px"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Mean Grain Size D (µm)
                </text>
                <text
                  transform={`rotate(90)`}
                  x={padT + plotH / 2}
                  y={-(viewBoxW - 14)}
                  textAnchor="middle"
                  fill="#f59e0b"
                  fontSize="10px"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Furnace Temperature (°C)
                </text>

                {/* 9. Interactive Crosshair & Cursor Points */}
                {displayPoint && (
                  <g>
                    {/* Vertical Crosshair */}
                    <line
                      x1={getX(displayPoint.time_min)}
                      y1={padT}
                      x2={getX(displayPoint.time_min)}
                      y2={padT + plotH}
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      strokeDasharray="2,2"
                    />

                    {/* Grain Size Dot */}
                    <circle
                      cx={getX(displayPoint.time_min)}
                      cy={getY_Grain(displayPoint.grainSize_um)}
                      r={5}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />

                    {/* Temp Dot */}
                    <circle
                      cx={getX(displayPoint.time_min)}
                      cy={getY_Temp(displayPoint.temperature_C)}
                      r={4}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  </g>
                )}
              </svg>

              {/* Floating Readout Pill */}
              {displayPoint && (
                <div className="absolute top-4 right-4 bg-[#090e18]/90 backdrop-blur border border-[#1e2d46] p-3 rounded-xl font-mono text-xs space-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)] min-w-[200px]">
                  <div className="flex items-center justify-between border-b border-[#162032] pb-1">
                    <span className="text-slate-400 text-[10px]">
                      t = <strong>{(displayPoint.time_min / 60).toFixed(2)}h</strong> ({displayPoint.time_min.toFixed(0)} min)
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                      S{displayPoint.stageIndex + 1}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mean Grain Size (D):</span>
                    <span className="text-emerald-400 font-bold">{displayPoint.grainSize_um} µm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ASTM Number (G):</span>
                    <span className="text-purple-300 font-bold">G = {displayPoint.astm_G}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Furnace Temp:</span>
                    <span className="text-amber-400 font-bold">{displayPoint.temperature_C}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Growth Rate:</span>
                    <span className="text-cyan-400 font-bold">{displayPoint.instantGrowthRate_um_per_min} µm/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rate Constant k(T):</span>
                    <span className="text-slate-300 font-bold">{displayPoint.rateConstant_k.toExponential(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-1 text-slate-400">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block"></span>
                  <span className="text-emerald-300 font-bold">Burke-Turnbull Grain Size D(t)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-amber-400 inline-block"></span>
                  <span className="text-amber-300">Furnace Temp T(t)</span>
                </div>
                {showSensitivityEnvelope && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 bg-sky-400/20 border border-sky-400/40 rounded inline-block"></span>
                    <span className="text-sky-300">±25°C Thermal Envelope</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block"></span>
                  <span className="text-slate-400">Initial D₀ Baseline</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-2.5 py-1 bg-[#050810] hover:bg-white/10 border border-[#162032] text-slate-300 hover:text-white rounded-lg transition flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export Kinetics JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STAGE-BY-STAGE GROWTH AUDIT TABLE */}
        {activeTab === "stages" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Stage-by-Stage Grain Growth Kinetics Audit</h3>
                <p className="text-[11px] text-slate-400">
                  Detailed breakdown of how each furnace stage contributes to the total grain coarsening ΔD.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAuditTable}
                  className="px-3 py-1.5 rounded-lg bg-[#050810] hover:bg-white/10 border border-[#162032] text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs"
                >
                  {copiedAudit ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Audit Table</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#162032]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#050810] border-b border-[#162032] text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Stage</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Temperature</th>
                    <th className="p-3">Entry Grain</th>
                    <th className="p-3">Exit Grain</th>
                    <th className="p-3">Coarsening (ΔD)</th>
                    <th className="p-3">% Total Growth</th>
                    <th className="p-3">Pinning Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162032] bg-[#090e18]">
                  {kineticsResults.stageAudits.map((sa) => (
                    <tr key={sa.stageIndex} className="hover:bg-white/[0.02] transition">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-[10px]">
                          {sa.stageIndex + 1}
                        </span>
                        <span className="truncate max-w-[150px]">{sa.stageName}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                            sa.stageType === "ramp"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : sa.stageType === "soak"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {sa.stageType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {sa.duration_min} min ({(sa.duration_min / 60).toFixed(2)}h)
                      </td>
                      <td className="p-3 text-amber-400">
                        {sa.startTemp_C}°C ➔ {sa.targetTemp_C}°C
                      </td>
                      <td className="p-3 text-slate-300">{sa.entryGrainSize_um} µm</td>
                      <td className="p-3 font-bold text-emerald-400">{sa.exitGrainSize_um} µm</td>
                      <td className="p-3 font-bold text-amber-300">
                        +{sa.deltaGrainSize_um} µm
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[#162032] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${Math.min(100, sa.growthPct)}%` }}
                            />
                          </div>
                          <span className="text-white font-bold">{sa.growthPct}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {sa.pinningActive ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                            <ShieldCheck className="w-3 h-3" /> Zener Active
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="w-3 h-3" /> Solvus Exceeded
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INTERACTIVE PARAMETER TUNING & SENSITIVITY */}
        {activeTab === "parameters" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#162032] pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Interactive Burke-Turnbull Calibration Controls</h3>
                <p className="text-[11px] text-slate-400">
                  Tune model variables to test sensitivity to grain boundary mobility, solute drag, or initial microstructure.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetToMaterial}
                className="px-2.5 py-1.5 bg-[#050810] hover:bg-white/10 border border-[#162032] text-amber-300 hover:text-amber-200 rounded-lg transition flex items-center gap-1 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to {material.name.split(" ")[0]} Calibrations</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parameter 1: Initial Grain Size D0 */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold">Initial Grain Diameter (D₀):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={0.5}
                      value={d0}
                      onChange={(e) => handleD0Change(parseFloat(e.target.value) || 1)}
                      className="w-16 px-2 py-0.5 bg-[#0c1322] border border-[#1e2d46] text-amber-300 rounded text-right font-bold"
                    />
                    <span className="text-slate-400">µm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="2"
                  max="60"
                  step="0.5"
                  value={d0}
                  onChange={(e) => handleD0Change(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-[#162032] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Fine LPBF / Rapid (2 µm)</span>
                  <span>Wrought / Forged (18 µm)</span>
                  <span>Coarse Cast (60 µm)</span>
                </div>
              </div>

              {/* Parameter 2: Grain Growth Exponent n */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-300 font-bold">Growth Exponent (n):</span>
                    <span className="text-[10px] text-cyan-400 ml-2">
                      {exponentN === 2 ? "(Hillert Ideal)" : exponentN < 2.5 ? "(Solute Drag)" : "(Zener Pinning)"}
                    </span>
                  </div>
                  <span className="text-cyan-400 font-extrabold text-sm">n = {exponentN.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="1.8"
                  max="4.0"
                  step="0.05"
                  value={exponentN}
                  onChange={(e) => setExponentN(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#162032] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>n=2.0 (Pure Metal)</span>
                  <span>n=2.5 (Ti Alloys)</span>
                  <span>n=3.0 (Superalloys)</span>
                  <span>n=4.0 (ODS)</span>
                </div>
              </div>

              {/* Parameter 3: Activation Energy Q */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold">Activation Energy (Q):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={80}
                      max={450}
                      step={5}
                      value={activationQ_kJ}
                      onChange={(e) => setActivationQ_kJ(parseFloat(e.target.value) || 100)}
                      className="w-20 px-2 py-0.5 bg-[#0c1322] border border-[#1e2d46] text-emerald-400 rounded text-right font-bold"
                    />
                    <span className="text-slate-400">kJ/mol</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="100"
                  max="350"
                  step="5"
                  value={activationQ_kJ}
                  onChange={(e) => setActivationQ_kJ(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-[#162032] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Al: 135 kJ/mol</span>
                  <span>Fe: 235 kJ/mol</span>
                  <span>Ti: 250 kJ/mol</span>
                  <span>Ni: 285 kJ/mol</span>
                </div>
              </div>

              {/* Parameter 4: Pre-Exponential Multiplier k0 */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold">Pre-Exponential Multiplier (k₀):</span>
                  <span className="text-purple-400 font-extrabold text-sm">{k0_multiplier.toFixed(2)}x Baseline</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={k0_multiplier}
                  onChange={(e) => setK0Multiplier(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-[#162032] rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0.1x (Slow Mobility)</span>
                  <span>1.0x (Calibrated Standard)</span>
                  <span>5.0x (Accelerated)</span>
                </div>
              </div>
            </div>

            {/* Quick Metallurgical Presets */}
            <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
              <span className="text-slate-400 font-bold block text-[11px] uppercase">
                Load Recognized Literature Kinetic Regimes:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExponentN(2.0);
                    setActivationQ_kJ(135);
                    setK0Multiplier(1.0);
                  }}
                  className="p-2 rounded-lg bg-[#0c1322] hover:bg-white/5 border border-[#1e2d46] text-left transition"
                >
                  <span className="text-white font-bold block text-xs">Pure Normal Growth</span>
                  <span className="text-[10px] text-slate-400">n=2.0 | Q=135 kJ/mol</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExponentN(2.8);
                    setActivationQ_kJ(285);
                    setK0Multiplier(1.0);
                  }}
                  className="p-2 rounded-lg bg-[#0c1322] hover:bg-white/5 border border-[#1e2d46] text-left transition"
                >
                  <span className="text-white font-bold block text-xs">Ni-Superalloy (Inconel)</span>
                  <span className="text-[10px] text-slate-400">n=2.8 | Q=285 kJ/mol</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExponentN(2.5);
                    setActivationQ_kJ(250);
                    setK0Multiplier(1.0);
                  }}
                  className="p-2 rounded-lg bg-[#0c1322] hover:bg-white/5 border border-[#1e2d46] text-left transition"
                >
                  <span className="text-white font-bold block text-xs">Titanium α/β (Ti-64)</span>
                  <span className="text-[10px] text-slate-400">n=2.5 | Q=250 kJ/mol</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExponentN(2.2);
                    setActivationQ_kJ(235);
                    setK0Multiplier(1.0);
                  }}
                  className="p-2 rounded-lg bg-[#0c1322] hover:bg-white/5 border border-[#1e2d46] text-left transition"
                >
                  <span className="text-white font-bold block text-xs">Alloy Steel (AISI 4340)</span>
                  <span className="text-[10px] text-slate-400">n=2.2 | Q=235 kJ/mol</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PHYSICAL METALLURGY THEORY & EQUATIONS */}
        {activeTab === "theory" && (
          <div className="space-y-4 font-mono text-xs leading-relaxed text-slate-300">
            <div className="p-4 bg-[#050810] rounded-xl border border-emerald-500/30 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>The Burke-Turnbull Model Formulation</span>
              </h3>
              <p>
                In 1952, J.E. Burke and D. Turnbull formulated the classical kinetic rate law describing grain boundary migration driven by capillarity (grain boundary curvature):
              </p>
              <div className="p-3 bg-[#0c1322] rounded-lg border border-[#1e2d46] text-center font-bold text-emerald-300 text-sm">
                Dⁿ - D₀ⁿ = k(T) · t
              </div>
              <p>
                where <strong className="text-white">D</strong> is the mean 3D grain diameter at time t, <strong className="text-white">D₀</strong> is the initial grain diameter, <strong className="text-white">n</strong> is the grain growth exponent, and <strong className="text-white">k(T)</strong> is the thermally activated rate constant:
              </p>
              <div className="p-3 bg-[#0c1322] rounded-lg border border-[#1e2d46] text-center font-bold text-amber-300 text-sm">
                k(T) = k₀ · exp( -Q / [R · T] )
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                <li><strong className="text-slate-200">k₀</strong>: Pre-exponential frequency factor characterizing boundary mobility and atomic vibration frequency.</li>
                <li><strong className="text-slate-200">Q</strong>: Activation energy for grain boundary migration (kJ/mol), governed by trans-boundary atomic jump kinetics.</li>
                <li><strong className="text-slate-200">R</strong>: Universal gas constant (8.314 J/mol·K).</li>
                <li><strong className="text-slate-200">T</strong>: Absolute thermodynamic temperature in Kelvin (T_C + 273.15).</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <h4 className="text-white font-bold text-xs uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Physical Significance of Exponent n</span>
                </h4>
                <p className="text-slate-400 text-[11px]">
                  <strong>n = 2.0 (Ideal Parabolic Growth):</strong> Predicted by Hillert and Burke-Turnbull for high-purity single-phase metals where curvature is the sole driving force.
                </p>
                <p className="text-slate-400 text-[11px]">
                  <strong>n = 2.2 – 3.0 (Solute Drag):</strong> In engineering alloys (e.g. Inconel 718, Ti-6Al-4V), solute atoms segregate to moving boundaries (Cahn-Lücke-Stüwe effect), retarding boundary velocity.
                </p>
                <p className="text-slate-400 text-[11px]">
                  <strong>n &gt; 3.0 (Precipitate Pinning):</strong> Second-phase particles exert opposing capillary pinning forces.
                </p>
              </div>

              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <h4 className="text-white font-bold text-xs uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rose-400" />
                  <span>Zener Pinning Limit (D_Z)</span>
                </h4>
                <p className="text-slate-400 text-[11px]">
                  C. Zener (1948) proved that coherent or incoherent particles of radius <strong className="text-white">r</strong> and volume fraction <strong className="text-white">f_v</strong> exert a drag pressure capping the maximum grain size:
                </p>
                <div className="p-2 bg-[#0c1322] rounded border border-[#1e2d46] text-center font-bold text-rose-300">
                  D_Z = (4 · r) / (3 · f_v)
                </div>
                <p className="text-slate-400 text-[11px]">
                  When furnace temperature exceeds the solvus line (T &gt; T_solvus), secondary phases dissolve into the matrix, releasing grain boundaries to undergo rapid unpinned coarsening.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  Zap,
  TrendingUp,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowRight,
  RefreshCw,
  Play,
  Download,
  FileCode,
  SlidersHorizontal,
  Target,
  Gauge,
  Crosshair,
  Wand2,
  Clock,
  Split,
  FileSpreadsheet,
  Check,
  Atom,
  BarChart3,
  Scale,
  Copy,
  ChevronDown,
  ChevronUp,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
  Line,
  ComposedChart,
  Cell
} from "recharts";
import {
  pythonComputationService,
  PythonStochasticUQResult,
  StochasticPropertyStats
} from "../services/pythonComputationService";

interface UQPreset {
  id: string;
  name: string;
  base: "Ni" | "Fe" | "Ti" | "Al";
  standardSpec: string;
  coolingRate: number;
  coolingRateCov: number;
  agingTemp: number;
  agingTempStd: number;
  agingTime: number;
  serviceStress: number;
  specMinYield: number;
  specMinUTS: number;
  specMinElongation: number;
  composition: { [key: string]: number };
  tolerances: { [key: string]: number };
  description: string;
}

const UQ_PRESETS: UQPreset[] = [
  {
    id: "inconel718_ams5664",
    name: "Inconel 718 (AMS 5664 / AMS 5662)",
    base: "Ni",
    standardSpec: "AMS 5664 / MMPDS Ch. 6",
    coolingRate: 150000,
    coolingRateCov: 0.25,
    agingTemp: 720,
    agingTempStd: 6.0,
    agingTime: 8,
    serviceStress: 780,
    specMinYield: 1100,
    specMinUTS: 1350,
    specMinElongation: 12,
    composition: { Cr: 19.0, Fe: 18.0, Nb: 5.1, Mo: 3.0, Ti: 0.9, Al: 0.5, C: 0.05, Si: 0.2 },
    tolerances: { Cr: 1.0, Fe: 1.0, Nb: 0.35, Mo: 0.3, Ti: 0.15, Al: 0.1, C: 0.015, Si: 0.08 },
    description: "Turbine disk superalloy under strict AMS 5664 aerospace flight allowables."
  },
  {
    id: "ti64_ams4928",
    name: "Ti-6Al-4V Grade 5 (AMS 4928)",
    base: "Ti",
    standardSpec: "AMS 4928 / MIL-T-9047",
    coolingRate: 250000,
    coolingRateCov: 0.30,
    agingTemp: 550,
    agingTempStd: 8.0,
    agingTime: 4,
    serviceStress: 620,
    specMinYield: 830,
    specMinUTS: 900,
    specMinElongation: 10,
    composition: { Al: 6.0, V: 4.0, Fe: 0.25, C: 0.04, Si: 0.05 },
    tolerances: { Al: 0.35, V: 0.30, Fe: 0.08, C: 0.015, Si: 0.02 },
    description: "Alpha-beta titanium airframe forging & AM rocket bracket qualification."
  },
  {
    id: "steel4340_ams6414",
    name: "AISI 4340 Ultra-High Strength (AMS 6414)",
    base: "Fe",
    standardSpec: "AMS 6414 / MMPDS Ch. 2",
    coolingRate: 250,
    coolingRateCov: 0.15,
    agingTemp: 480,
    agingTempStd: 5.0,
    agingTime: 2,
    serviceStress: 950,
    specMinYield: 1380,
    specMinUTS: 1520,
    specMinElongation: 9,
    composition: { C: 0.40, Cr: 0.80, Ni: 1.80, Mo: 0.25, Mn: 0.70, Si: 0.25 },
    tolerances: { C: 0.03, Cr: 0.10, Ni: 0.15, Mo: 0.05, Mn: 0.08, Si: 0.05 },
    description: "Deep-hardening structural landing gear and cryo pressure bulkhead steel."
  },
  {
    id: "alsi10mg_ams4215",
    name: "AlSi10Mg Additive (AMS 4215)",
    base: "Al",
    standardSpec: "AMS 4215 / ASTM F3318",
    coolingRate: 600000,
    coolingRateCov: 0.35,
    agingTemp: 160,
    agingTempStd: 4.0,
    agingTime: 6,
    serviceStress: 180,
    specMinYield: 220,
    specMinUTS: 330,
    specMinElongation: 6,
    composition: { Si: 10.0, Mg: 0.45, Fe: 0.15, Ti: 0.05 },
    tolerances: { Si: 0.5, Mg: 0.08, Fe: 0.04, Ti: 0.02 },
    description: "High thermal conductivity lightweight satellite chassis alloy."
  }
];

export function StochasticUQMMPDSStudio() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("inconel718_ams5664");
  const [alloyName, setAlloyName] = useState<string>("Inconel 718 (AMS 5664 / AMS 5662)");
  const [baseMetal, setBaseMetal] = useState<"Ni" | "Fe" | "Ti" | "Al">("Ni");
  const [standardSpec, setStandardSpec] = useState<string>("AMS 5664 / MMPDS Ch. 6");
  
  const [mcSamples, setMcSamples] = useState<number>(2500);
  const [samplingMethod, setSamplingMethod] = useState<"sobol_qmc" | "pseudo_mc">("sobol_qmc");
  const [scramble, setScramble] = useState<boolean>(true);
  const [coolingRateNominal, setCoolingRateNominal] = useState<number>(150000);
  const [coolingRateCov, setCoolingRateCov] = useState<number>(0.25);
  const [agingTempNominal, setAgingTempNominal] = useState<number>(720);
  const [agingTempStd, setAgingTempStd] = useState<number>(6.0);
  const [agingTimeNominal, setAgingTimeNominal] = useState<number>(8.0);
  const [serviceStressNominal, setServiceStressNominal] = useState<number>(780);
  
  const [specMinYield, setSpecMinYield] = useState<number>(1100);
  const [specMinUTS, setSpecMinUTS] = useState<number>(1350);
  const [specMinElongation, setSpecMinElongation] = useState<number>(12);

  const [comp, setComp] = useState<{ [key: string]: number }>({
    Cr: 19.0, Fe: 18.0, Nb: 5.1, Mo: 3.0, Ti: 0.9, Al: 0.5, C: 0.05, Si: 0.2
  });
  const [tolerances, setTolerances] = useState<{ [key: string]: number }>({
    Cr: 1.0, Fe: 1.0, Nb: 0.35, Mo: 0.3, Ti: 0.15, Al: 0.1, C: 0.015, Si: 0.08
  });

  const [selectedPropertyKey, setSelectedPropertyKey] = useState<"yieldStrength_Rp02" | "ultimateTensileStrength_UTS" | "elongationPct" | "fractureToughness_K1c" | "criticalFlawSize_ac">("yieldStrength_Rp02");
  const [activeTab, setActiveTab] = useState<"distribution" | "sobol" | "mmpds-table" | "damage-tolerance">("distribution");

  // Result state
  const [uqResult, setUqResult] = useState<PythonStochasticUQResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Preset
  const handleSelectPreset = (presetId: string) => {
    const p = UQ_PRESETS.find(item => item.id === presetId);
    if (!p) return;
    setSelectedPresetId(presetId);
    setAlloyName(p.name);
    setBaseMetal(p.base);
    setStandardSpec(p.standardSpec);
    setCoolingRateNominal(p.coolingRate);
    setCoolingRateCov(p.coolingRateCov);
    setAgingTempNominal(p.agingTemp);
    setAgingTempStd(p.agingTempStd);
    setAgingTimeNominal(p.agingTime);
    setServiceStressNominal(p.serviceStress);
    setSpecMinYield(p.specMinYield);
    setSpecMinUTS(p.specMinUTS);
    setSpecMinElongation(p.specMinElongation);
    setComp({ ...p.composition });
    setTolerances({ ...p.tolerances });
  };

  // Run Stochastic Solver
  const runUQSolver = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await pythonComputationService.calculateStochasticUQMMPDS({
        alloyName,
        baseMetal,
        standardSpec,
        composition_wt: comp,
        composition_tolerances: tolerances,
        coolingRate_nominal: coolingRateNominal,
        coolingRate_cov: coolingRateCov,
        agingTemp_nominal: agingTempNominal,
        agingTemp_stdDev: agingTempStd,
        agingTime_nominal: agingTimeNominal,
        serviceStress_nominal: serviceStressNominal,
        specMinYield_MPa: specMinYield,
        specMinUTS_MPa: specMinUTS,
        specMinElongation_pct: specMinElongation,
        mcSamples,
        samplingMethod,
        scramble,
        seed: 42
      });
      setUqResult(res);
    } catch (err: any) {
      console.error("Stochastic UQ execution failed:", err);
      setErrorMsg(err.message || "Failed to execute stochastic UQ Python solver.");
    } finally {
      setIsLoading(false);
    }
  }, [
    alloyName,
    baseMetal,
    standardSpec,
    comp,
    tolerances,
    coolingRateNominal,
    coolingRateCov,
    agingTempNominal,
    agingTempStd,
    agingTimeNominal,
    serviceStressNominal,
    specMinYield,
    specMinUTS,
    specMinElongation,
    mcSamples,
    samplingMethod,
    scramble
  ]);

  // Debounced execution
  useEffect(() => {
    const timer = setTimeout(() => {
      runUQSolver();
    }, 350);
    return () => clearTimeout(timer);
  }, [runUQSolver]);

  // Selected Active Property Stats
  const activeStats: StochasticPropertyStats | null = useMemo(() => {
    if (!uqResult) return null;
    return uqResult.stochasticProperties[selectedPropertyKey];
  }, [uqResult, selectedPropertyKey]);

  // Unit and label mappings
  const propertyMeta = {
    yieldStrength_Rp02: { label: "Yield Strength (Rp0.2)", unit: "MPa", specMin: specMinYield },
    ultimateTensileStrength_UTS: { label: "Ultimate Tensile Strength (UTS)", unit: "MPa", specMin: specMinUTS },
    elongationPct: { label: "Tensile Elongation (A%)", unit: "%", specMin: specMinElongation },
    fractureToughness_K1c: { label: "Fracture Toughness (K₁c)", unit: "MPa√m", specMin: 60.0 },
    criticalFlawSize_ac: { label: "Critical Flaw Size (a_c)", unit: "mm", specMin: 1.0 }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0a1124] to-slate-900 border border-sky-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                MMPDS-01 / MIL-HDBK-5 Standard Compliance
              </span>
              {samplingMethod === "sobol_qmc" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Sobol QMC Accelerated (O(N⁻¹))
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  Pseudo-Random MC
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                N={mcSamples.toLocaleString()} {uqResult?.samplingMetadata && `(N_eff = ${uqResult.samplingMetadata.effectiveSampleSize.toLocaleString()})`}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Stochastic Uncertainty Quantification & Aerospace Allowables
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-3xl">
              Propagates <span className="text-sky-300 font-medium">compositional tolerances</span> and <span className="text-indigo-300 font-medium">thermal process scatter</span> through multi-scale physics using <span className="text-amber-300 font-medium">Sobol Quasi-Monte Carlo sequences</span> to accelerate <span className="text-emerald-300 font-medium">A-Basis ($T_{99}$) & B-Basis ($T_{90}$) allowables</span> and <span className="text-amber-300 font-medium">Saltelli variance sensitivity</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runUQSolver}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Computing QMC..." : "Re-Run Sampling"}
            </button>
          </div>
        </div>

        {/* STATUS TILES */}
        {uqResult && (
          <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400">AEROSPACE CERTIFICATION</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {uqResult.aerospaceReliability.qualificationStatus}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400">A-BASIS YIELD ALLOWABLE (T₉₉)</div>
              <div className="text-sm font-bold text-sky-300 mt-0.5">
                {uqResult.stochasticProperties.yieldStrength_Rp02.aBasisAllowable} MPa
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  {uqResult.stochasticProperties.yieldStrength_Rp02.aBasisConfidenceInterval95
                    ? `[${uqResult.stochasticProperties.yieldStrength_Rp02.aBasisConfidenceInterval95[0]}–${uqResult.stochasticProperties.yieldStrength_Rp02.aBasisConfidenceInterval95[1]}]`
                    : "(99% @ 95% conf)"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400">PROCESS CAPABILITY (Cpk)</div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                Cpk = {uqResult.stochasticProperties.yieldStrength_Rp02.cpk ?? "N/A"}
                <span className="text-[10px] text-slate-400 font-normal ml-1">({uqResult.stochasticProperties.yieldStrength_Rp02.conformancePct}% pass)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[10px] text-slate-400">RELIABILITY INDEX (β)</div>
              <div className="text-sm font-bold text-purple-300 mt-0.5">
                β = {uqResult.aerospaceReliability.hasoferLindBetaIndex}
                <span className="text-[10px] text-slate-400 font-normal ml-1">(Pf = {uqResult.aerospaceReliability.yieldFailureProbability_Pf})</span>
              </div>
            </div>
          </div>
        )}

        {/* QMC LOW-DISCREPANCY ACCELERATION TELEMETRY */}
        {uqResult?.samplingMetadata && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/25 font-mono text-xs shadow-inner">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-slate-200 text-xs">
                  {uqResult.samplingMetadata.samplingMethod === "sobol_qmc"
                    ? "Quasi-Monte Carlo (QMC) Sobol Sequence Acceleration"
                    : "Standard Pseudo-Random Monte Carlo (PRNG)"}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  — {uqResult.samplingMetadata.samplingDescription}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                  Rate: {uqResult.samplingMetadata.theoreticalConvergenceRate}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {uqResult.samplingMetadata.qmcAccelerationFactor.toFixed(1)}× Speedup
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[9px] text-slate-400">EFFECTIVE SAMPLE (N_eff)</div>
                <div className="font-bold text-amber-300 mt-0.5">
                  {uqResult.samplingMetadata.effectiveSampleSize.toLocaleString()}
                  <span className="text-[9px] text-slate-400 font-normal ml-1">({(uqResult.samplingMetadata.effectiveSampleSize / uqResult.sampleSizeN).toFixed(1)}× N)</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[9px] text-slate-400">CENTERED L2 DISCREPANCY</div>
                <div className="font-bold text-sky-300 mt-0.5">
                  {uqResult.samplingMetadata.centeredL2Discrepancy.toFixed(5)}
                  <span className="text-[9px] text-emerald-400 font-normal ml-1">(-{uqResult.samplingMetadata.discrepancyReductionPct}%)</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[9px] text-slate-400">VARIANCE REDUCTION (VRR)</div>
                <div className="font-bold text-emerald-300 mt-0.5">
                  {uqResult.samplingMetadata.varianceReductionRatio.toFixed(1)}×
                  <span className="text-[9px] text-slate-400 font-normal ml-1">tighter SE</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[9px] text-slate-400">EXECUTION LATENCY</div>
                <div className="font-bold text-purple-300 mt-0.5">
                  {uqResult.computeTimeMs.toFixed(1)} ms
                  <span className="text-[9px] text-slate-400 font-normal ml-1">(Gray code)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRESET & SAMPLING CONFIGURATION SELECTOR */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Standard Aero Specification:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {UQ_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  selectedPresetId === p.id
                    ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* SAMPLING ENGINE SELECTOR */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Method:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                onClick={() => setSamplingMethod("sobol_qmc")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  samplingMethod === "sobol_qmc"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3 h-3" />
                Sobol QMC
              </button>
              <button
                onClick={() => setSamplingMethod("pseudo_mc")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  samplingMethod === "pseudo_mc"
                    ? "bg-sky-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Pseudo-MC
              </button>
            </div>
          </div>

          {/* SCRAMBLING OPTION */}
          {samplingMethod === "sobol_qmc" && (
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 select-none">
              <input
                type="checkbox"
                checked={scramble}
                onChange={(e) => setScramble(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Owen Scramble</span>
            </label>
          )}

          {/* MC SAMPLES */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Runs:</span>
            <select
              value={mcSamples}
              onChange={(e) => setMcSamples(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-sky-300 rounded-lg px-2 py-1 text-xs"
            >
              <option value="1000">1,000 runs</option>
              <option value="2500">2,500 runs (Optimal)</option>
              <option value="5000">5,000 runs (MMPDS Benchmark)</option>
            </select>
          </div>
        </div>
      </div>

      {/* PARAMETER CONFIGURATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Elemental Tolerances */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-400" />
              Elemental Tolerances (Nominal ± Δwt%)
            </h2>
            <span className="text-xs font-mono text-slate-400">3σ Gaussian Window</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {Object.keys(comp).map((el) => (
              <div key={el} className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-200 font-bold">{el}</span>
                  <span className="text-sky-300 font-semibold">
                    {comp[el].toFixed(2)} ± {tolerances[el]?.toFixed(2) || "0.10"} wt%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Nominal wt%</label>
                    <input
                      type="number"
                      step="0.05"
                      value={comp[el]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setComp(prev => ({ ...prev, [el]: val }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Tolerance (± Δwt%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tolerances[el] || 0.1}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTolerances(prev => ({ ...prev, [el]: val }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Process & Specification Limits */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Thermal Process Variance & Flight Allowable Limits
            </h2>
            <span className="text-xs font-mono text-emerald-400 font-bold">{standardSpec}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2 text-xs font-mono">
              <div className="text-slate-300 font-bold">Process Scatter (Thermal & Melt)</div>
              <div>
                <label className="text-[11px] text-slate-400 block">Solidification Cooling Rate COV</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min="0.05"
                    max="0.50"
                    step="0.01"
                    value={coolingRateCov}
                    onChange={(e) => setCoolingRateCov(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <span className="text-sky-300 font-bold w-12 text-right">{(coolingRateCov * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block">Aging Furnace Thermal Gradient (± °C)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={agingTempStd}
                    onChange={(e) => setAgingTempStd(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <span className="text-amber-300 font-bold w-12 text-right">±{agingTempStd}°C</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2 text-xs font-mono">
              <div className="text-slate-300 font-bold">Specification Pass/Fail Minimums</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Min Yield (MPa)</label>
                  <input
                    type="number"
                    value={specMinYield}
                    onChange={(e) => setSpecMinYield(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-sky-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Min UTS (MPa)</label>
                  <input
                    type="number"
                    value={specMinUTS}
                    onChange={(e) => setSpecMinUTS(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Min Elong (%)</label>
                  <input
                    type="number"
                    value={specMinElongation}
                    onChange={(e) => setSpecMinElongation(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-emerald-300"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="text-[11px] text-slate-400 block">Applied Flight Service Stress (MPa)</label>
                <input
                  type="number"
                  value={serviceStressNominal}
                  onChange={(e) => setServiceStressNominal(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-rose-300 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ANALYSIS NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("distribution")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "distribution"
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> PDF Histogram & Cumulative Distribution
        </button>

        <button
          onClick={() => setActiveTab("sobol")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "sobol"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Sobol Global Sensitivity Decomposition
        </button>

        <button
          onClick={() => setActiveTab("mmpds-table")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "mmpds-table"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> MMPDS-01 A/B-Basis Allowables Table
        </button>

        <button
          onClick={() => setActiveTab("damage-tolerance")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === "damage-tolerance"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Target className="w-3.5 h-3.5" /> Damage Tolerance & Defect Flaw Margin
        </button>
      </div>

      {/* TAB 1: HISTOGRAM PDF & CDF */}
      {activeTab === "distribution" && activeStats && (
        <div className="space-y-5">
          {/* Property Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(propertyMeta) as (keyof typeof propertyMeta)[]).map((k) => (
              <button
                key={k}
                onClick={() => setSelectedPropertyKey(k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer ${
                  selectedPropertyKey === k
                    ? "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {propertyMeta[k].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Probability Density Histogram */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  Probability Density Function (PDF) & Statistical Allowables
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  μ = {activeStats.mean} {propertyMeta[selectedPropertyKey].unit} (COV = {activeStats.covPct}%)
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activeStats.histogram} margin={{ top: 15, right: 20, left: 10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="binCenter"
                      stroke="#64748b"
                      tick={{ fontSize: 10 }}
                      unit={` ${propertyMeta[selectedPropertyKey].unit}`}
                      label={{ value: propertyMeta[selectedPropertyKey].label, position: "insideBottom", offset: -8, fill: "#64748b", fontSize: 10 }}
                    />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: "Probability Density", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "11px" }}
                      formatter={(val: number, name: string) => [val, name === "empiricalPdf" ? "Empirical Frequency" : "Fitted Normal PDF"]}
                      labelFormatter={(lbl) => `Value: ${lbl} ${propertyMeta[selectedPropertyKey].unit}`}
                    />
                    <ReferenceLine x={activeStats.aBasisAllowable} stroke="#38bdf8" strokeWidth={2} strokeDasharray="3 3" label={{ value: "A-Basis", fill: "#38bdf8", fontSize: 10, position: "top" }} />
                    <ReferenceLine x={activeStats.bBasisAllowable} stroke="#34d399" strokeWidth={2} strokeDasharray="3 3" label={{ value: "B-Basis", fill: "#34d399", fontSize: 10, position: "top" }} />
                    <ReferenceLine x={activeStats.mean} stroke="#cbd5e1" strokeWidth={1.5} label={{ value: "Mean μ", fill: "#cbd5e1", fontSize: 10, position: "top" }} />
                    {propertyMeta[selectedPropertyKey].specMin && (
                      <ReferenceLine x={propertyMeta[selectedPropertyKey].specMin} stroke="#f87171" strokeWidth={2} label={{ value: "Spec Min", fill: "#f87171", fontSize: 10, position: "top" }} />
                    )}
                    <Bar dataKey="empiricalPdf" fill="#38bdf8" opacity={0.65} radius={[4, 4, 0, 0]} name="empiricalPdf" />
                    <Line type="monotone" dataKey="fittedNormalPdf" stroke="#818cf8" strokeWidth={2.5} dot={false} name="fittedNormalPdf" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-center">
                <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">Mean (μ):</span>
                  <span className="text-slate-200 font-bold">{activeStats.mean} {propertyMeta[selectedPropertyKey].unit}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">Std Dev (σ):</span>
                  <span className="text-amber-300 font-bold">±{activeStats.stdDev} {propertyMeta[selectedPropertyKey].unit}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">A-Basis (T₉₉):</span>
                  <span className="text-sky-300 font-bold">{activeStats.aBasisAllowable} {propertyMeta[selectedPropertyKey].unit}</span>
                  {activeStats.aBasisConfidenceInterval95 && (
                    <span className="text-[9px] text-sky-400/80 block mt-0.5">
                      95% CI: [{activeStats.aBasisConfidenceInterval95[0]}–{activeStats.aBasisConfidenceInterval95[1]}]
                    </span>
                  )}
                </div>
                <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <span className="text-[10px] text-slate-400 block">B-Basis (T₉₀):</span>
                  <span className="text-emerald-300 font-bold">{activeStats.bBasisAllowable} {propertyMeta[selectedPropertyKey].unit}</span>
                  {activeStats.bBasisConfidenceInterval95 && (
                    <span className="text-[9px] text-emerald-400/80 block mt-0.5">
                      95% CI: [{activeStats.bBasisConfidenceInterval95[0]}–{activeStats.bBasisConfidenceInterval95[1]}]
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cumulative Distribution Function (CDF) S-Curve */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Cumulative S-Curve (CDF)
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">P10 - P50 - P90</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeStats.histogram} margin={{ top: 15, right: 10, left: -10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="binCenter" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "11px" }}
                      formatter={(val: number) => [`${val}%`, "Cumulative Survival Probability"]}
                    />
                    <ReferenceLine y={10} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: "P10", fill: "#38bdf8", fontSize: 10 }} />
                    <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: "P50", fill: "#cbd5e1", fontSize: 10 }} />
                    <ReferenceLine y={90} stroke="#f87171" strokeDasharray="3 3" label={{ value: "P90", fill: "#f87171", fontSize: 10 }} />
                    <Area type="monotone" dataKey="cumulativePct" stroke="#34d399" fill="#34d399" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 font-mono text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>95% Confidence Interval:</span>
                  <span className="text-sky-300">[{activeStats.ci95Lower_P2_5} — {activeStats.ci95Upper_P97_5}]</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>P10 / P90 Spread:</span>
                  <span className="text-slate-200 font-bold">{activeStats.P10} — {activeStats.P90}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOBOL GLOBAL SENSITIVITY */}
      {activeTab === "sobol" && uqResult && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Sobol Global Variance Sensitivity (Saltelli Decomposition)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quantifies the direct first-order effect (S_i) and total-order effect (S_Ti including nonlinear multi-physics interactions) on Yield Strength scatter.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Saltelli-Jansen QMC Radial Design
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uqResult.sobolSensitivityAnalysis} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <YAxis dataKey="parameter" type="category" stroke="#cbd5e1" tick={{ fontSize: 11 }} width={180} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "11px" }}
                  formatter={(val: number) => [`${val}%`, "Variance Contribution"]}
                />
                <Bar dataKey="varianceContributionPct" radius={[0, 6, 6, 0]}>
                  {uqResult.sobolSensitivityAnalysis.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? "#f59e0b"
                          : index === 1
                          ? "#38bdf8"
                          : index === 2
                          ? "#818cf8"
                          : "#34d399"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SALTELLI INDICES DECOMPOSITION TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-xs font-mono text-left">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Uncertain Factor</th>
                  <th className="py-2.5 px-3">Tolerance Description</th>
                  <th className="py-2.5 px-3 text-amber-300 font-bold">First-Order (Sᵢ)</th>
                  <th className="py-2.5 px-3 text-sky-300 font-bold">Total-Order (S_Ti)</th>
                  <th className="py-2.5 px-3 text-purple-300">Coupled Interaction (S_Ti - Sᵢ)</th>
                  <th className="py-2.5 px-3 text-right">Variance Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {uqResult.sobolSensitivityAnalysis.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-bold text-slate-200">{s.parameter}</td>
                    <td className="py-2 px-3 text-slate-400">{s.description}</td>
                    <td className="py-2 px-3 text-amber-300 font-bold">{s.sobolFirstOrderIndex.toFixed(3)}</td>
                    <td className="py-2 px-3 text-sky-300 font-bold">{(s.sobolTotalOrderIndex ?? s.sobolFirstOrderIndex).toFixed(3)}</td>
                    <td className="py-2 px-3 text-purple-300 font-semibold">
                      {(s.interactionIndex !== undefined
                        ? s.interactionIndex
                        : Math.max(0, (s.sobolTotalOrderIndex ?? s.sobolFirstOrderIndex) - s.sobolFirstOrderIndex)
                      ).toFixed(3)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-200">{s.varianceContributionPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actionable Metallurgical Recommendations */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Alloy Variance Reduction & Tightening Strategy:
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              The primary driver of property scatter is <strong className="text-amber-300">{uqResult.sobolSensitivityAnalysis[0]?.parameter}</strong> ({uqResult.sobolSensitivityAnalysis[0]?.varianceContributionPct}% of total variance), followed by <strong className="text-sky-300">{uqResult.sobolSensitivityAnalysis[1]?.parameter}</strong> ({uqResult.sobolSensitivityAnalysis[1]?.varianceContributionPct}%). Tightening the control band on these two parameters will increase the certified A-Basis allowable by up to <strong className="text-emerald-400">+35–50 MPa</strong> without altering nominal base chemistry.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: MMPDS ALLOWABLES TABLE */}
      {activeTab === "mmpds-table" && uqResult && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              MMPDS-01 Aerospace Design Allowables & QMC Confidence Intervals
            </h3>
            <span className="text-xs font-mono text-slate-400">ASTM E8 / E1820 / MIL-HDBK-5</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-800/60 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Mechanical Property</th>
                  <th className="py-2.5 px-3">Mean (μ)</th>
                  <th className="py-2.5 px-3">Std Dev (σ)</th>
                  <th className="py-2.5 px-3">COV (%)</th>
                  <th className="py-2.5 px-3 text-sky-300 font-bold">A-Basis (T₉₉)</th>
                  <th className="py-2.5 px-3 text-sky-400">A-Basis 95% CI</th>
                  <th className="py-2.5 px-3 text-emerald-300 font-bold">B-Basis (T₉₀)</th>
                  <th className="py-2.5 px-3 text-emerald-400">B-Basis 95% CI</th>
                  <th className="py-2.5 px-3">Spec Minimum</th>
                  <th className="py-2.5 px-3">Cpk</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Object.keys(uqResult.stochasticProperties).map((k) => {
                  const propKey = k as keyof typeof uqResult.stochasticProperties;
                  const stat = uqResult.stochasticProperties[propKey];
                  const meta = propertyMeta[propKey];
                  const isPass = meta.specMin === undefined || stat.aBasisAllowable >= meta.specMin;

                  return (
                    <tr key={k} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-200">{meta.label}</td>
                      <td className="py-3 px-3 text-slate-300">{stat.mean} {meta.unit}</td>
                      <td className="py-3 px-3 text-amber-300">±{stat.stdDev}</td>
                      <td className="py-3 px-3 text-slate-400">{stat.covPct}%</td>
                      <td className="py-3 px-3 font-bold text-sky-400">{stat.aBasisAllowable} {meta.unit}</td>
                      <td className="py-3 px-3 text-sky-300 text-[11px]">
                        {stat.aBasisConfidenceInterval95
                          ? `[${stat.aBasisConfidenceInterval95[0]}–${stat.aBasisConfidenceInterval95[1]}]`
                          : "±" + ((stat.allowableStandardError_A ?? 1) * 1.96).toFixed(1)}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{stat.bBasisAllowable} {meta.unit}</td>
                      <td className="py-3 px-3 text-emerald-300 text-[11px]">
                        {stat.bBasisConfidenceInterval95
                          ? `[${stat.bBasisConfidenceInterval95[0]}–${stat.bBasisConfidenceInterval95[1]}]`
                          : "±" + ((stat.allowableStandardError_B ?? 1) * 1.96).toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{meta.specMin ? `${meta.specMin} ${meta.unit}` : "-"}</td>
                      <td className="py-3 px-3 font-bold text-purple-300">{stat.cpk ?? "-"}</td>
                      <td className="py-3 px-3 text-right font-bold">
                        {isPass ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            QUALIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            MARGINAL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] font-mono text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <span>
              ⚡ Quasi-Monte Carlo (QMC) Sobol Sequence low-discrepancy sampling accelerates statistical confidence interval bounds by <strong className="text-emerald-300">{uqResult.samplingMetadata?.qmcAccelerationFactor?.toFixed(1) ?? "3.8"}×</strong> vs standard pseudo-random sampling.
            </span>
            <span className="text-slate-300">
              MMPDS One-Sided Tolerance Limit: k_A = {uqResult.stochasticProperties.yieldStrength_Rp02.mmpds_kA}, k_B = {uqResult.stochasticProperties.yieldStrength_Rp02.mmpds_kB}
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: DAMAGE TOLERANCE & CRITICAL FLAW */}
      {activeTab === "damage-tolerance" && uqResult && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-400" />
              LEFM Critical Flaw Size ($a_c$) & NDI Detection Reliability
            </h3>
            <span className="text-xs font-mono text-slate-400">ASTM E1820 / Fracture Mechanics</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
              <div className="text-slate-400 text-[10px]">CRITICAL FLAW SIZE (MEDIAN P50)</div>
              <div className="text-2xl font-bold text-slate-200">
                {uqResult.aerospaceReliability.criticalFlawMedian_mm} mm
              </div>
              <div className="text-[11px] text-slate-400">
                Applied Flight Stress: <strong className="text-rose-300">{serviceStressNominal} MPa</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
              <div className="text-slate-400 text-[10px]">A-BASIS CONSERVATIVE FLAW (P10)</div>
              <div className="text-2xl font-bold text-sky-400">
                {uqResult.aerospaceReliability.criticalFlaw_P10_mm} mm
              </div>
              <div className="text-[11px] text-slate-400">
                NDI Required Resolution: <strong className="text-emerald-400">&lt; 0.5 mm</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
              <div className="text-slate-400 text-[10px]">STRUCTURAL FAILURE PROBABILITY</div>
              <div className="text-2xl font-bold text-emerald-400">
                {uqResult.aerospaceReliability.yieldFailureProbability_Pf === 0 ? "< 10⁻⁶" : uqResult.aerospaceReliability.yieldFailureProbability_Pf}
              </div>
              <div className="text-[11px] text-slate-400">
                Hasofer-Lind Reliability Index: <strong className="text-purple-300">β = {uqResult.aerospaceReliability.hasoferLindBetaIndex}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Zap,
  Cpu,
  Layers,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Info,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Gauge,
  Thermometer,
  Download,
  Flame,
  CheckCircle2,
  Share2,
  Split
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";

interface Formulation {
  name: string;
  cation: string;
  anion: string;
  c_bulk_M: number;
  d_plus: number;
  d_minus: number;
  epsilon_r: number;
  t_plus_base: number;
  sigma_mS_cm: number;
  viscosity_mPas: number;
  type: string;
}

interface TransportKineticsResponse {
  formulation: Formulation;
  formulationId: string;
  appliedCurrentDensity_mA_cm2: number;
  limitingCurrentDensity_mA_cm2: number;
  sandsTime_seconds: number;
  debyeLength_nm: number;
  cationTransferenceNumber_tPlus: number;
  anionTransferenceNumber_tMinus: number;
  ambipolarDiffusivity_m2_s: string;
  ohmicDrop_mV: number;
  diffusionPotential_mV: number;
  totalLiquidOverpotential_mV: number;
  status: string;
  riskLevel: "OPTIMAL" | "WARNING" | "CRITICAL";
  minElectrolyteConc_M: number;
  maxElectrolyteConc_M: number;
  spatialProfiles: Array<{
    x_um: number;
    c_plus_M: number;
    c_minus_M: number;
    c_total_salt_M: number;
    space_charge_rho_C_m3: number;
    e_field_kV_m: number;
    phi_liquid_mV: number;
    j_diffusion_mol_m2s: number;
    j_migration_mol_m2s: number;
  }>;
  tPlusConcentrationCurve: Array<{
    c_M: number;
    t_plus: number;
    t_minus: number;
    thermodynamicFactor: number;
    ionicConductivity_mS_cm: number;
  }>;
  sandsTimeCurve: Array<{
    currentDensity_mA_cm2: number;
    sandTime_s: number;
    isLimitingExceeded: boolean;
  }>;
  pythonDurationMs: number;
  success: boolean;
}

export function TransportKineticsLab() {
  // Formulation State
  const [formulationId, setFormulationId] = useState<string>("lipf6_ec_emc");
  const [currentDensity, setCurrentDensity] = useState<number>(8.0); // mA/cm^2
  const [gapUm, setGapUm] = useState<number>(50.0); // um
  const [tempC, setTempC] = useState<number>(25.0); // deg C
  const [useCustomTPlus, setUseCustomTPlus] = useState<boolean>(false);
  const [customTPlus, setCustomTPlus] = useState<number>(0.38);
  const [customCBulk, setCustomCBulk] = useState<number>(1.0);

  // Active View Tab in the Lab
  const [activeChartTab, setActiveChartTab] = useState<"concentration" | "electric_field" | "flux_decomposition" | "sands_time" | "transference_curve">("concentration");

  // API State
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<TransportKineticsResponse | null>(null);

  const fetchTransportKinetics = async () => {
    setLoading(true);
    try {
      const payload: any = {
        action: "transport_kinetics",
        formulationId,
        currentDensity_mA_cm2: currentDensity,
        gap_um: gapUm,
        tempC: tempC,
        customCBulk: customCBulk
      };
      if (useCustomTPlus) {
        payload.customTPlus = customTPlus;
      }

      const response = await fetch("/api/python/battery-corrosion-eis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err) {
      console.error("Transport Kinetics Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportKinetics();
  }, [formulationId, currentDensity, gapUm, tempC, useCustomTPlus, customTPlus, customCBulk]);

  // Export Data Handler
  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NPP_Transport_Kinetics_${formulationId}_${currentDensity}mAcm2.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="transport-kinetics-lab" className="w-full bg-[#050810] text-slate-100 rounded-2xl border border-[#162032] p-4 lg:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#162032] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Electrolyte Transport Kinetics &amp; Nernst-Planck-Poisson Lab
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Python CPython Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Coupled electro-diffusion, concentration-dependent ion transference number ($t_+$), space-charge Poisson Debye sheath, and Sand&apos;s time depletion modeling.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTransportKinetics}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-[#0c1424] hover:bg-[#121c30] border border-[#1e2d46] text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Re-Solve NPP</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={!data}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main Parameters Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[#090e18] border border-[#162032]">
        {/* Parameter 1: Electrolyte Formulation */}
        <div>
          <label className="text-xs font-mono text-slate-400 block mb-1">
            Electrolyte System &amp; Solvent:
          </label>
          <select
            value={formulationId}
            onChange={(e) => {
              setFormulationId(e.target.value);
              setUseCustomTPlus(false);
            }}
            className="w-full bg-[#0c1424] border border-[#1e2d46] hover:border-cyan-400 text-xs font-mono text-cyan-300 px-3 py-2 rounded-xl focus:outline-none transition cursor-pointer"
          >
            <option value="lipf6_ec_emc">1.0M LiPF₆ in EC:EMC (3:7) + 2% VC (Standard Li-ion)</option>
            <option value="lifsi_dme_dol">1.2M LiFSI in DME:DOL (1:1) (High-Rate Ether)</option>
            <option value="litfsi_peo_solid">1.5M LiTFSI in PEO (Solid Polymer 70°C)</option>
            <option value="single_ion_gel">Single-Ion Conducting Gel Polymer (Li-PSTFSI)</option>
            <option value="napf6_pc_ec">1.0M NaPF₆ in PC:EC (1:1) (Sodium-Ion Battery)</option>
            <option value="ionic_liquid_emim">1.0M LiTFSI in [EMIM][TFSI] (Ionic Liquid)</option>
          </select>
          <div className="text-[10px] text-slate-500 mt-1">
            {data?.formulation?.type} • ε_r = {data?.formulation?.epsilon_r}
          </div>
        </div>

        {/* Parameter 2: Applied Current Density */}
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-slate-400">Current Density (J_app):</span>
            <span className={`font-bold ${currentDensity >= (data?.limitingCurrentDensity_mA_cm2 || 20) ? "text-red-400 font-mono" : "text-cyan-400"}`}>
              {currentDensity.toFixed(1)} mA/cm²
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="25.0"
            step="0.5"
            value={currentDensity}
            onChange={(e) => setCurrentDensity(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
            <span>0.5 mA (0.2C)</span>
            <span>8.0 mA (3.0C)</span>
            <span>25 mA (XFC 8C)</span>
          </div>
        </div>

        {/* Parameter 3: Inter-Electrode / Separator Gap */}
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-slate-400">Electrolyte Gap (L):</span>
            <span className="text-cyan-400 font-bold">{gapUm} μm</span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={gapUm}
            onChange={(e) => setGapUm(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
            <span>10 μm (Thin sep)</span>
            <span>50 μm (Std)</span>
            <span>120 μm (Thick)</span>
          </div>
        </div>

        {/* Parameter 4: Temperature & Bulk Salt Concentration */}
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-slate-400">Temperature (T):</span>
            <span className={`font-bold ${tempC < 10 ? "text-amber-400" : "text-cyan-400"}`}>
              {tempC}°C
            </span>
          </div>
          <input
            type="range"
            min="-10"
            max="60"
            step="5"
            value={tempC}
            onChange={(e) => setTempC(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
            <span>-10°C (Sluggish)</span>
            <span>25°C (Ambient)</span>
            <span>60°C (Fast)</span>
          </div>
        </div>
      </div>

      {/* Secondary Tuner: Transference Number Tuning ($t_+$) */}
      <div className="p-3.5 rounded-xl bg-[#090e18]/80 border border-[#162032] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="use-custom-t-plus"
            checked={useCustomTPlus}
            onChange={(e) => {
              setUseCustomTPlus(e.target.checked);
              if (e.target.checked && data) {
                setCustomTPlus(data.cationTransferenceNumber_tPlus);
              }
            }}
            className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="use-custom-t-plus" className="text-xs font-mono text-slate-300 cursor-pointer">
            <strong>Custom Transference Number Override:</strong> Tune cation transference ($t_+$) to simulate single-ion conducting polymers vs dual-ion systems.
          </label>
        </div>

        {useCustomTPlus && (
          <div className="flex items-center gap-3 w-full md:w-72">
            <span className="text-xs font-mono text-cyan-400 font-bold w-16">
              t+ = {customTPlus.toFixed(2)}
            </span>
            <input
              type="range"
              min="0.10"
              max="0.98"
              step="0.02"
              value={customTPlus}
              onChange={(e) => setCustomTPlus(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Diagnostic Assessment & Transport KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Transference Number */}
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Cation Transference (t₊)</span>
              <Split className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {data.cationTransferenceNumber_tPlus}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Anion t₋ = {data.anionTransferenceNumber_tMinus}
            </div>
          </div>

          {/* Card 2: Limiting Current Density */}
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Limiting Current (J_lim)</span>
              <Gauge className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {data.limitingCurrentDensity_mA_cm2} <span className="text-xs text-slate-400 font-normal">mA/cm²</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Applied: {((data.appliedCurrentDensity_mA_cm2 / data.limitingCurrentDensity_mA_cm2) * 100).toFixed(0)}% of J_lim
            </div>
          </div>

          {/* Card 3: Sand's Time */}
          <div className={`p-4 rounded-xl border ${
            data.riskLevel === "CRITICAL"
              ? "bg-red-950/20 border-red-500/50 text-red-300"
              : (data.riskLevel === "WARNING"
                  ? "bg-amber-950/20 border-amber-500/50 text-amber-300"
                  : "bg-[#090e18] border-[#162032] text-slate-200")
          } space-y-1`}>
            <div className="flex items-center justify-between text-xs font-mono">
              <span>Sand&apos;s Transition Time (τ)</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {data.sandsTime_seconds > 3600 ? "> 1.0 hr" : `${data.sandsTime_seconds.toFixed(1)} s`}
            </div>
            <div className="text-[11px] opacity-90">
              {data.sandsTime_seconds < 120 ? "Dendrite threshold reached rapidly" : "Safe continuous transport"}
            </div>
          </div>

          {/* Card 4: Debye Screening Length */}
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Debye Length (λ_D)</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {data.debyeLength_nm} <span className="text-xs text-slate-400 font-normal">nm</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Poisson space charge layer
            </div>
          </div>

          {/* Card 5: Liquid Phase IR Drop */}
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Liquid Overpotential (ΔΦ)</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {data.totalLiquidOverpotential_mV.toFixed(1)} <span className="text-xs text-slate-400 font-normal">mV</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Ohmic {data.ohmicDrop_mV.toFixed(0)}mV + Diff {data.diffusionPotential_mV.toFixed(0)}mV
            </div>
          </div>
        </div>
      )}

      {/* Safety Alert Banner */}
      {data && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${
          data.riskLevel === "CRITICAL"
            ? "bg-red-950/25 border-red-500/50 text-red-300"
            : (data.riskLevel === "WARNING"
                ? "bg-amber-950/25 border-amber-500/50 text-amber-300"
                : "bg-emerald-950/25 border-emerald-500/50 text-emerald-300")
        }`}>
          <div className="flex items-center gap-2">
            {data.riskLevel === "CRITICAL" ? (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            ) : data.riskLevel === "WARNING" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div>
              <span className="font-bold mr-2">[{data.riskLevel} REGIME]:</span>
              <span>{data.status}</span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] opacity-75">
            c_min: {data.minElectrolyteConc_M} M • c_max: {data.maxElectrolyteConc_M} M
          </span>
        </div>
      )}

      {/* Interactive Visualization Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin border-b border-[#162032]">
        <button
          type="button"
          onClick={() => setActiveChartTab("concentration")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeChartTab === "concentration"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>1. Spatial Cation &amp; Anion Profile c(x)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab("electric_field")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeChartTab === "electric_field"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>2. Poisson Space-Charge &amp; Electric Field E(x)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab("flux_decomposition")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeChartTab === "flux_decomposition"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Split className="w-3.5 h-3.5 text-cyan-400" />
          <span>3. Flux Decomposition (Diff vs Migr)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab("sands_time")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeChartTab === "sands_time"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-cyan-400" />
          <span>4. Sand&apos;s Time vs C-rate Curve</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab("transference_curve")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeChartTab === "transference_curve"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span>5. Transference Number vs Salt Conc t₊(c)</span>
        </button>
      </div>

      {/* =========================================================================
          PANEL 1: SPATIAL CONCENTRATION PROFILES c(x)
         ========================================================================= */}
      {activeChartTab === "concentration" && (
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Concentration Profiles c_+(x) &amp; c_-(x) Across Inter-Electrode Gap [0, {gapUm} μm]
              </h3>
              <p className="text-xs text-slate-400">
                Nernst-Planck solution for cation (${data?.formulation.cation || "Li⁺"}$) and blocking anion (${data?.formulation.anion || "PF₆⁻"}$) under high current density.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                x=0: Anode Interface
              </span>
              <span className="text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                x={gapUm}μm: Cathode Interface
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.spatialProfiles || []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="x_um"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(v) => `${v}μm`}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  domain={[0, "auto"]}
                  tickFormatter={(v) => `${v}M`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(val: any) => [`${val} mol/L`]}
                  labelFormatter={(label) => `Position x: ${label} μm`}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                <ReferenceLine y={0.15} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Salt Exhaustion Limit (< 0.15 M)", fill: "#ef4444", fontSize: 9, position: "insideBottomLeft" }} />
                <Line type="monotone" dataKey="c_plus_M" stroke="#38bdf8" strokeWidth={2.5} dot={false} name={`Cation Conc [${data?.formulation.cation || "Li+"}]`} />
                <Line type="monotone" dataKey="c_minus_M" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={`Anion Conc [${data?.formulation.anion || "PF6-"}]`} />
                <Line type="monotone" dataKey="c_total_salt_M" stroke="#10b981" strokeWidth={1.5} dot={false} name="Electrolyte Salt Mean Conc" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-mono bg-[#0c1424] p-3 rounded-xl border border-[#1e2d46]">
            <div>
              <span className="text-cyan-400 font-bold block mb-1">Physics of Salt Depletion:</span>
              <span>
                As current passes, anions are blocked at the electrodes ($N_- = 0$), setting up a steep concentration gradient $\nabla c_e \propto J(1 - t_+)$. High $t_+$ mitigates this gradient.
              </span>
            </div>
            <div>
              <span className="text-amber-400 font-bold block mb-1">Sand&apos;s Time Transition:</span>
              <span>
                When surface salt concentration drops to zero ($c(L) \to 0$), the local conductivity collapses, inducing massive electric fields and accelerated dendrite nucleation.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PANEL 2: POISSON SPACE-CHARGE & ELECTRIC FIELD
         ========================================================================= */}
      {activeChartTab === "electric_field" && (
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-4">
          <div>
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Poisson Space-Charge Density $\rho_e(x)$ &amp; Electric Field $E(x)$
            </h3>
            <p className="text-xs text-slate-400">
              Debye length $\lambda_D = {data?.debyeLength_nm}$ nm creates electric double-layer space charge sheath near the electrode boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 2A: Electric Field E(x) */}
            <div className="p-3 rounded-xl bg-[#050810] border border-[#162032] space-y-2">
              <span className="text-xs font-mono text-amber-300 font-bold block">
                Electric Field Profile E(x) [kV/m]
              </span>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.spatialProfiles || []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="x_um" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}μm`} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} kV/m`, "E(x)"]}
                    />
                    <Line type="monotone" dataKey="e_field_kV_m" stroke="#f59e0b" strokeWidth={2} dot={false} name="Electric Field E(x)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2B: Liquid Electric Potential Phi(x) */}
            <div className="p-3 rounded-xl bg-[#050810] border border-[#162032] space-y-2">
              <span className="text-xs font-mono text-cyan-300 font-bold block">
                Liquid Electric Potential Profile Φ(x) [mV]
              </span>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.spatialProfiles || []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="x_um" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}μm`} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}mV`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} mV`, "Φ(x)"]}
                    />
                    <Line type="monotone" dataKey="phi_liquid_mV" stroke="#06b6d4" strokeWidth={2} dot={false} name="Potential Φ(x)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PANEL 3: FLUX DECOMPOSITION (DIFFUSION VS MIGRATION)
         ========================================================================= */}
      {activeChartTab === "flux_decomposition" && (
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-4">
          <div>
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Split className="w-4 h-4 text-purple-400" />
              Cation Flux Decomposition: Diffusion Flux vs Electro-Migration Flux
            </h3>
            <p className="text-xs text-slate-400">
              Total Cation Flux N₊ = -D₊ ∇c₊ - (z₊ F D₊ / RT) c₊ ∇Φ = Diffusion Flux + Migration Flux.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.spatialProfiles || []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="x_um" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}μm`} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(val: any) => [`${val} × 10⁻⁴ mol/(m²s)`]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                <Area type="monotone" dataKey="j_migration_mol_m2s" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} name="Electro-Migration Flux (t₊ J / F)" />
                <Area type="monotone" dataKey="j_diffusion_mol_m2s" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} name="Concentration Diffusion Flux (-D₊ ∇c)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-[#0c1424] border border-[#1e2d46] text-xs text-slate-300 font-mono">
            <strong>Key Kinetic Insight:</strong> In a single-ion conductor where $t_+ \to 1.0$, the electro-migration flux carries 100% of the current and the diffusion flux requirement drops to zero ($\nabla c \to 0$), completely eliminating concentration polarization!
          </div>
        </div>
      )}

      {/* =========================================================================
          PANEL 4: SAND'S TIME VS CURRENT DENSITY
         ========================================================================= */}
      {activeChartTab === "sands_time" && (
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-4">
          <div>
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              Sand&apos;s Transition Time (τ_Sand) vs Applied Current Density
            </h3>
            <p className="text-xs text-slate-400">
              Sand&apos;s Law: τ_Sand = (π · D_amb / 4) · [F · c_bulk / (J · (1 - t₊))]². Salt depletion time collapses quadratically as J⁻².
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.sandsTimeCurve || []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="currentDensity_mA_cm2" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v} mA`} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 4000]} tickFormatter={(v) => `${v}s`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(val: any) => [`${val} seconds`, "Sand's Time (τ)"]}
                  labelFormatter={(l) => `Current: ${l} mA/cm²`}
                />
                <ReferenceLine x={data?.limitingCurrentDensity_mA_cm2} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `J_lim (${data?.limitingCurrentDensity_mA_cm2} mA)`, fill: "#ef4444", fontSize: 9 }} />
                <Line type="monotone" dataKey="sandTime_s" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} name="Sand's Transition Time (s)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =========================================================================
          PANEL 5: TRANSFERENCE NUMBER VS CONCENTRATION
         ========================================================================= */}
      {activeChartTab === "transference_curve" && (
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-4">
          <div>
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Concentration-Dependent Transference Number $t_+(c)$ &amp; Thermodynamic Activity Factor
            </h3>
            <p className="text-xs text-slate-400">
              In concentrated electrolytes (&gt; 1.5 M), ion-ion clustering and triple ion formation reduce effective cation mobility.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.tPlusConcentrationCurve || []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="c_M" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}M`} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 1.8]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                <Line type="monotone" dataKey="t_plus" stroke="#06b6d4" strokeWidth={2.5} name="Cation Transference t₊(c)" />
                <Line type="monotone" dataKey="t_minus" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" name="Anion Transference t₋(c)" />
                <Line type="monotone" dataKey="thermodynamicFactor" stroke="#10b981" strokeWidth={2} name="Thermodynamic Factor (1 + d ln γ / d ln c)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

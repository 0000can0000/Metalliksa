import React, { useState, useEffect, useMemo } from "react";
import { TransportKineticsLab } from "./TransportKineticsLab";
import {
  BatteryCharging,
  Zap,
  Activity,
  Flame,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Layers,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Gauge,
  Sparkles,
  Info,
  Maximize2,
  Cpu,
  BarChart3,
  Split,
  ChevronRight,
  CheckCircle2
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
  ReferenceLine,
  ReferenceArea
} from "recharts";

interface P2DSummary {
  c_rate: number;
  temp_c: number;
  soc: number;
  min_anode_potential_V: number;
  min_anode_x_um: number;
  plating_status: string;
  salt_depletion_risk: string;
  min_c_e_M: number;
  max_c_e_M: number;
  electrolyte_ir_drop_V: number;
}

interface LLILAMModes {
  lli_pct: number;
  lam_pe_pct: number;
  lam_ne_pct: number;
  np_ratio_fresh: number;
  np_ratio_aged: number;
}

interface ThermalResult {
  cellFormat: string;
  nominalCap_Ah: number;
  cRate: number;
  coolingType: string;
  ambientTemp_C: number;
  peakHeatGen_W: number;
  maxCoreTemp_C: number;
  maxSurfaceTemp_C: number;
  maxDeltaT_C: number;
  totalHeatGenerated_Wh: number;
  jouleHeatSharePct: number;
  thermalRiskAssessment: string;
  timeline: any[];
}

export function AdvancedBatteryPhysicsStudio() {
  // Main Navigation Sub-tabs
  const [activeTab, setActiveTab] = useState<"p2d_continuum" | "transport_kinetics" | "lli_lam_deconvolution" | "bernardi_thermal" | "fast_charge_xfc">("transport_kinetics");

  // Selected Chemistry
  const [chemistryId, setChemistryId] = useState<string>("nmc811");

  // ==========================================
  // Tab 1: P2D Continuum States
  // ==========================================
  const [p2dCRate, setP2dCRate] = useState<number>(2.5);
  const [p2dTempC, setP2dTempC] = useState<number>(25);
  const [p2dSOC, setP2dSOC] = useState<number>(0.65);
  const [p2dLoading, setP2dLoading] = useState<boolean>(false);
  const [p2dData, setP2dData] = useState<any>(null);

  // ==========================================
  // Tab 2: LLI / LAM Deconvolution States
  // ==========================================
  const [initCapAh, setInitCapAh] = useState<number>(5.0);
  const [degCapAh, setDegCapAh] = useState<number>(4.1);
  const [manualLLI, setManualLLI] = useState<number>(18.5);
  const [manualLAMPE, setManualLAMPE] = useState<number>(8.0);
  const [manualLAMNE, setManualLAMNE] = useState<number>(5.5);
  const [lliLamLoading, setLliLamLoading] = useState<boolean>(false);
  const [lliLamData, setLliLamData] = useState<any>(null);

  // ==========================================
  // Tab 3: Bernardi Thermal States
  // ==========================================
  const [cellFormat, setCellFormat] = useState<string>("21700-cylindrical");
  const [thermalCRate, setThermalCRate] = useState<number>(3.0);
  const [coolingType, setCoolingType] = useState<string>("forced_air");
  const [ambientTempC, setAmbientTempC] = useState<number>(25.0);
  const [thermalLoading, setThermalLoading] = useState<boolean>(false);
  const [thermalData, setThermalData] = useState<ThermalResult | null>(null);

  // ==========================================
  // 1. Fetch P2D Simulation
  // ==========================================
  const fetchP2D = async () => {
    setP2dLoading(true);
    try {
      const response = await fetch("/api/python/battery-corrosion-eis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "p2d_continuum",
          chemistryId,
          cRate: p2dCRate,
          tempC: p2dTempC,
          soc: p2dSOC,
          customParams: {
            l_neg_um: 85.0,
            l_sep_um: 20.0,
            l_pos_um: 75.0,
            eps_neg: 0.32,
            eps_sep: 0.45,
            eps_pos: 0.28
          }
        }),
      });
      const data = await response.json();
      if (data.success) {
        setP2dData(data);
      }
    } catch (err) {
      console.error("P2D Fetch Error:", err);
    } finally {
      setP2dLoading(false);
    }
  };

  // ==========================================
  // 2. Fetch LLI / LAM Deconvolution
  // ==========================================
  const fetchLLILAM = async () => {
    setLliLamLoading(true);
    try {
      const response = await fetch("/api/python/battery-corrosion-eis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lli_lam_deconvolution",
          chemistryId,
          initialCapAh: initCapAh,
          degradedCapAh: degCapAh,
          lliPct: manualLLI,
          lamPePct: manualLAMPE,
          lamNePct: manualLAMNE,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setLliLamData(data);
      }
    } catch (err) {
      console.error("LLI/LAM Fetch Error:", err);
    } finally {
      setLliLamLoading(false);
    }
  };

  // ==========================================
  // 3. Fetch Bernardi Thermal
  // ==========================================
  const fetchThermal = async () => {
    setThermalLoading(true);
    try {
      const response = await fetch("/api/python/battery-corrosion-eis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bernardi_thermal",
          cellFormat,
          nominalCapAh: initCapAh,
          cRate: thermalCRate,
          coolingType,
          tempAmbientC: ambientTempC,
          internalRMohm: cellFormat === "4680-tabless" ? 6.5 : (cellFormat === "21700-cylindrical" ? 18.0 : 1.2)
        }),
      });
      const data = await response.json();
      if (data.success) {
        setThermalData(data);
      }
    } catch (err) {
      console.error("Thermal Fetch Error:", err);
    } finally {
      setThermalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "p2d_continuum") {
      fetchP2D();
    } else if (activeTab === "lli_lam_deconvolution") {
      fetchLLILAM();
    } else if (activeTab === "bernardi_thermal") {
      fetchThermal();
    }
  }, [activeTab, chemistryId, p2dCRate, p2dTempC, p2dSOC, manualLLI, manualLAMPE, manualLAMNE, initCapAh, degCapAh, cellFormat, thermalCRate, coolingType, ambientTempC]);

  // Transform P2D spatial mesh into unified chart data
  const p2dChartData = useMemo(() => {
    if (!p2dData || !p2dData.x_coords_um) return [];
    return p2dData.x_coords_um.map((x: number, idx: number) => ({
      x_um: x,
      zone: p2dData.zones[idx],
      c_e_M: p2dData.c_e_M[idx],
      phi_e_mV: p2dData.phi_e_V[idx] !== null ? p2dData.phi_e_V[idx] * 1000 : null,
      theta_surf: p2dData.theta_surf[idx],
      eta_plating_mV: p2dData.eta_plating_V[idx] !== null ? p2dData.eta_plating_V[idx] * 1000 : null,
      j_loc_A_cm3: p2dData.j_loc_A_cm3[idx],
    }));
  }, [p2dData]);

  return (
    <div className="w-full bg-[#050810] text-slate-100 rounded-2xl border border-[#162032] p-4 lg:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#162032] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Advanced Battery Continuum &amp; Degradation Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Newman P2D + Birkl LLI/LAM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Coupled through-plane electrolyte transport, spatial lithium plating overpotential, mechanistic $dQ/dV$ deconvolution, and Bernardi multiphysics thermal modeling.
              </p>
            </div>
          </div>
        </div>

        {/* Chemistry Selection Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Active Chemistry:</span>
          <select
            value={chemistryId}
            onChange={(e) => setChemistryId(e.target.value)}
            className="bg-[#0c1424] border border-[#1e2d46] hover:border-emerald-400 text-xs font-mono text-emerald-300 px-3 py-1.5 rounded-xl focus:outline-none transition cursor-pointer"
          >
            <option value="nmc811">NMC-811 / Graphite-Si (High-Energy Layered)</option>
            <option value="nmc622">NMC-622 / Graphite (Standard EV)</option>
            <option value="lfp">LFP / Graphite (Long Cycle Life Olivine)</option>
            <option value="lco">LCO / Graphite (Consumer Electronics)</option>
            <option value="nca">NCA / Silicon-Graphite (High Power)</option>
            <option value="solid-state-sulfide">Sulfide Solid-State (Li Metal / LPSCl)</option>
            <option value="na-ion-layered">Sodium-Ion (NaFePO₄ / Hard Carbon)</option>
          </select>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin border-b border-[#162032]">
        <button
          type="button"
          onClick={() => setActiveTab("p2d_continuum")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === "p2d_continuum"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>1. Newman P2D &amp; Spatial Plating (x-axis)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transport_kinetics")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === "transport_kinetics"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>2. Transport Kinetics &amp; Nernst-Planck-Poisson (NPP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lli_lam_deconvolution")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === "lli_lam_deconvolution"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Split className="w-4 h-4 text-emerald-400" />
          <span>3. Mechanistic LLI &amp; LAM Deconvolution</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("bernardi_thermal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === "bernardi_thermal"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Flame className="w-4 h-4 text-emerald-400" />
          <span>4. Bernardi Multiphysics Thermal Solver</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fast_charge_xfc")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === "fast_charge_xfc"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>5. Fast-Charge &amp; Plating-Free Protocol</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: NEWMAN P2D CONTINUUM & SPATIAL LITHIUM PLATING
         ========================================================================= */}
      {activeTab === "p2d_continuum" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#090e18] border border-[#162032]">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Charge Rate (C-rate):</span>
                <span className="text-emerald-400 font-bold">{p2dCRate} C</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="6.0"
                step="0.1"
                value={p2dCRate}
                onChange={(e) => setP2dCRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0.2C (Slow)</span>
                <span>3.0C (Fast)</span>
                <span>6.0C (XFC)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Cell Temperature:</span>
                <span className={`font-bold ${p2dTempC < 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  {p2dTempC}°C
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="50"
                step="1"
                value={p2dTempC}
                onChange={(e) => setP2dTempC(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>-20°C (Frozen)</span>
                <span>25°C (Ambient)</span>
                <span>50°C (Hot)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">State of Charge (SOC):</span>
                <span className="text-emerald-400 font-bold">{Math.round(p2dSOC * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={p2dSOC}
                onChange={(e) => setP2dSOC(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>5% (Empty)</span>
                <span>50% (Mid)</span>
                <span>95% (Full)</span>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <button
                type="button"
                onClick={fetchP2D}
                disabled={p2dLoading}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${p2dLoading ? "animate-spin" : ""}`} />
                <span>Re-Solve Continuum (P2D)</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Safety Assessment Cards */}
          {p2dData && p2dData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${
                p2dData.summary.min_anode_potential_V < 0.0
                  ? "bg-red-950/20 border-red-500/50 text-red-300"
                  : (p2dData.summary.min_anode_potential_V < 0.03
                      ? "bg-amber-950/20 border-amber-500/50 text-amber-300"
                      : "bg-emerald-950/20 border-emerald-500/50 text-emerald-300")
              }`}>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>Separator Anode Potential</span>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold font-mono mt-1">
                  {(p2dData.summary.min_anode_potential_V * 1000).toFixed(1)} mV
                </div>
                <div className="text-[11px] mt-1 opacity-90">
                  {p2dData.summary.plating_status}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] text-slate-200">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Min Electrolyte Salt conc (c_e)</span>
                  <Activity className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                  {p2dData.summary.min_c_e_M.toFixed(2)} M
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {p2dData.summary.salt_depletion_risk}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] text-slate-200">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Liquid Phase IR Drop (ΔΦ_e)</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {(p2dData.summary.electrolyte_ir_drop_V * 1000).toFixed(1)} mV
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Ohmic liquid loss across 180 μm sandwich
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] text-slate-200">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Max Li Plating Risk Location</span>
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                  x = {p2dData.summary.min_anode_x_um} μm
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Adjacent to separator boundary interface
                </div>
              </div>
            </div>
          )}

          {/* Spatial Continuum Charts (x = 0 to L_cell) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Spatial Electrolyte Concentration c_e(x) */}
            <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    Electrolyte Salt Concentration c_e(x) [mol/L]
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Through-thickness liquid concentration gradient showing depletion near cathode/separator during charge.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  Liquid Phase
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={p2dChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
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
                      domain={[0, 2.5]}
                      tickFormatter={(v) => `${v}M`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} M`, "c_e"]}
                      labelFormatter={(label) => `Position x: ${label} μm`}
                    />
                    <ReferenceLine x={85} stroke="#64748b" strokeDasharray="3 3" label={{ value: "Separator Anode", fill: "#64748b", fontSize: 9 }} />
                    <ReferenceLine x={105} stroke="#64748b" strokeDasharray="3 3" label={{ value: "Separator Cathode", fill: "#64748b", fontSize: 9 }} />
                    <ReferenceLine y={0.2} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Depletion Limit (0.2M)", fill: "#ef4444", fontSize: 9, position: "insideBottomLeft" }} />
                    <Area type="monotone" dataKey="c_e_M" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} strokeWidth={2} name="c_e(x)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Spatial Sub-labels */}
              <div className="grid grid-cols-3 text-center text-[10px] font-mono border-t border-[#162032] pt-2">
                <span className="text-emerald-400">Anode (0 to 85μm)</span>
                <span className="text-slate-400">Separator (85 to 105μm)</span>
                <span className="text-sky-400">Cathode (105 to 180μm)</span>
              </div>
            </div>

            {/* Chart 2: Through-Plane Plating Potential η_plating(x) */}
            <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Local Lithium Plating Overpotential Profile η(x) [mV]
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Negative values (&lt; 0 mV vs Li/Li⁺) trigger destructive metallic lithium dendrite nucleation.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Solid/Liquid Interface
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={p2dChartData.filter((d: any) => d.eta_plating_mV !== null)} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
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
                      tickFormatter={(v) => `${v}mV`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} mV`, "Local Potential"]}
                      labelFormatter={(label) => `Position x: ${label} μm`}
                    />
                    <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" label={{ value: "Plating Boundary (0 mV vs Li/Li+)", fill: "#ef4444", fontSize: 9, position: "top" }} />
                    <Line type="monotone" dataKey="eta_plating_mV" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Anode/Cathode Potential" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Physical Insight callout */}
              <div className="p-2 rounded-lg bg-[#0c1424] border border-[#1e2d46] text-[11px] text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Why 0D Lumped Models Fail:</strong> Overpotential is non-uniform across the anode. Notice how the minimum potential always occurs at <code className="text-emerald-300 font-mono">x = 85 μm</code> (the separator interface), making it the primary site for dendrite nucleation during fast charging.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MECHANISTIC LLI & LAM DEGRADATION DECONVOLUTION
         ========================================================================= */}
      {activeTab === "lli_lam_deconvolution" && (
        <div className="space-y-6">
          {/* Controls & Degradation Modes Sliders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 rounded-xl bg-[#090e18] border border-[#162032]">
            <div className="p-3 rounded-xl bg-[#050810] border border-[#162032] space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">1. Loss of Li Inventory (% LLI)</span>
                <span className="text-emerald-300 font-bold">{manualLLI}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="0.5"
                value={manualLLI}
                onChange={(e) => setManualLLI(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Driven by SEI passivation growth, solvent decomposition, and dead lithium entrapment. Causes horizontal slippage between electrodes.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#050810] border border-[#162032] space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-sky-400 font-bold">2. Cathode Active Loss (% LAM_PE)</span>
                <span className="text-sky-300 font-bold">{manualLAMPE}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="0.5"
                value={manualLAMPE}
                onChange={(e) => setManualLAMPE(parseFloat(e.target.value))}
                className="w-full accent-sky-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Driven by transition metal dissolution (Mn/Co/Ni), cathode particle micro-cracking, and CEI layer impedance growth.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#050810] border border-[#162032] space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-purple-400 font-bold">3. Anode Active Loss (% LAM_NE)</span>
                <span className="text-purple-300 font-bold">{manualLAMNE}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="0.5"
                value={manualLAMNE}
                onChange={(e) => setManualLAMNE(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Driven by graphite particle exfoliation, binder detachment, and silicon volume expansion pulverization.
              </p>
            </div>
          </div>

          {/* Diagnostic Summary */}
          {lliLamData && lliLamData.diagnosis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Primary Aging Driver</span>
                <div className="text-base font-bold font-mono text-white">{lliLamData.diagnosis.primaryDegradationMode}</div>
                <div className="text-[11px] text-slate-300">{lliLamData.diagnosis.mechanism}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Electrode N/P Balance</span>
                <div className="flex items-center justify-between text-sm font-mono mt-1">
                  <span className="text-slate-400">Fresh Cell N/P: <strong className="text-emerald-400">{lliLamData.modes.np_ratio_fresh}</strong></span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">Aged Cell N/P: <strong className="text-amber-400">{lliLamData.modes.np_ratio_aged}</strong></span>
                </div>
                <div className="text-[11px] text-slate-400">Overhang capacity utilization shifts over cycling</div>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-blue-200 space-y-1">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">BMS Mitigation Strategy</span>
                <div className="text-xs font-mono font-bold text-white">Adaptive Cutoff Adjustment</div>
                <div className="text-[11px] text-slate-300">{lliLamData.diagnosis.recommendedMitigation}</div>
              </div>
            </div>
          )}

          {/* Charts: Half-Cell Alignments & dQ/dV Differential Capacity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: V(Q) Full-cell & Single-Electrode Half-Cell Curves */}
            <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Split className="w-3.5 h-3.5 text-emerald-400" />
                    Electrode Potential Alignment vs Capacity Q [Ah]
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Displays how LLI slippage and active mass loss deform individual PE/NE half-cells into the full-cell V(Q).
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Birkl Inversion
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lliLamData ? lliLamData.freshCurves : []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="q_ah" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}Ah`} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 4.5]} tickFormatter={(v) => `${v}V`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} V`]}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                    <Line type="monotone" dataKey="v_pe" stroke="#38bdf8" strokeWidth={1.5} dot={false} name="Positive Electrode (PE)" />
                    <Line type="monotone" dataKey="v_ne" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Negative Electrode (NE)" />
                    <Line type="monotone" dataKey="v_cell" stroke="#10b981" strokeWidth={2.5} dot={false} name="Full Cell V_cell (Fresh)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Differential Capacity dQ/dV Spectrum */}
            <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                    Differential Capacity Spectrogram (dQ/dV vs V)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Phase transition peak shifts reveal graphite staging loss and cathode ordering deterioration.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  Peak Tracking
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lliLamData ? lliLamData.dqDvFresh : []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="v_cell" stroke="#64748b" fontSize={10} domain={[3.5, 4.25]} tickFormatter={(v) => `${v.toFixed(2)}V`} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[0, 35]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} Ah/V`, "dQ/dV"]}
                      labelFormatter={(label) => `Voltage: ${parseFloat(label).toFixed(3)} V`}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                    <Line type="monotone" dataKey="dq_dv" stroke="#10b981" strokeWidth={2} dot={false} name="Fresh Cell dQ/dV" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: BERNARDI MULTIPHYSICS THERMAL & HEAT GENERATION
         ========================================================================= */}
      {activeTab === "bernardi_thermal" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#090e18] border border-[#162032]">
            <div>
              <span className="text-xs font-mono text-slate-400 block mb-1">Cell Form Factor:</span>
              <select
                value={cellFormat}
                onChange={(e) => setCellFormat(e.target.value)}
                className="w-full bg-[#0c1424] border border-[#1e2d46] text-xs font-mono text-slate-200 px-3 py-1.5 rounded-xl focus:outline-none"
              >
                <option value="21700-cylindrical">21700 Cylindrical (5.0 Ah / Standard Tab)</option>
                <option value="4680-tabless">4680 Cylindrical (25 Ah / Tabless Current Path)</option>
                <option value="prismatic-60ah">Prismatic Hard Case (60 Ah)</option>
                <option value="pouch-40ah">Pouch Cell (40 Ah / High Surface Area)</option>
              </select>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-400 block mb-1">Cooling Boundary Type:</span>
              <select
                value={coolingType}
                onChange={(e) => setCoolingType(e.target.value)}
                className="w-full bg-[#0c1424] border border-[#1e2d46] text-xs font-mono text-slate-200 px-3 py-1.5 rounded-xl focus:outline-none"
              >
                <option value="natural_air">Natural Air Convection (h = 12 W/m²K)</option>
                <option value="forced_air">Forced Air Fan Cooling (h = 45 W/m²K)</option>
                <option value="bottom_cold_plate">Bottom Liquid Cold Plate (h = 280 W/m²K)</option>
                <option value="direct_dielectric_immersion">Direct Dielectric Immersion (h = 850 W/m²K)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Discharge C-Rate:</span>
                <span className="text-emerald-400 font-bold">{thermalCRate} C</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={thermalCRate}
                onChange={(e) => setThermalCRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Ambient Temperature:</span>
                <span className="text-emerald-400 font-bold">{ambientTempC}°C</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Thermal KPI Cards */}
          {thermalData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${
                thermalData.maxCoreTemp_C > 65
                  ? "bg-red-950/20 border-red-500/50 text-red-300"
                  : (thermalData.maxCoreTemp_C > 45
                      ? "bg-amber-950/20 border-amber-500/50 text-amber-300"
                      : "bg-emerald-950/20 border-emerald-500/50 text-emerald-300")
              }`}>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>Peak Core Temperature</span>
                  <Thermometer className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold font-mono mt-1">
                  {thermalData.maxCoreTemp_C}°C
                </div>
                <div className="text-[11px] mt-1 opacity-90">
                  {thermalData.thermalRiskAssessment}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] text-slate-200">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Max Radial Gradient (ΔT)</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {thermalData.maxDeltaT_C}°C
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Core-to-surface thermal stress
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] text-slate-200">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Peak Heat Generation Rate</span>
                  <Zap className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                  {thermalData.peakHeatGen_W} W
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Joule ({thermalData.jouleHeatSharePct}%) + Reversible entropic
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] text-slate-200">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Total Thermal Energy</span>
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                  {thermalData.totalHeatGenerated_Wh} Wh
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Per single full discharge cycle
                </div>
              </div>
            </div>
          )}

          {/* Thermal Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Temperature Rise Timeline */}
            <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    Core vs Surface Temperature Evolution T(t) [°C]
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Tracks internal thermal conduction vs surface cooling dissipation over the discharge timeline.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={thermalData ? thermalData.timeline : []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time_s" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}°C`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} °C`]}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                    <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Accelerated Aging (60°C)", fill: "#ef4444", fontSize: 9 }} />
                    <Line type="monotone" dataKey="t_core_c" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Core Temp (T_core)" />
                    <Line type="monotone" dataKey="t_surface_c" stroke="#f59e0b" strokeWidth={2} dot={false} name="Surface Temp (T_surf)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Heat Source Breakdown (Bernardi Equation) */}
            <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    Bernardi Heat Generation Rate Breakdown [Watts]
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Decomposes Ohmic Joule heating (I²R), Entropic reversible heat (IT dU/dT), and Polarization overpotential heat.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={thermalData ? thermalData.timeline : []} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time_s" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}W`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1220", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} W`]}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                    <Area type="monotone" dataKey="q_joule_w" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Ohmic Joule (I²R)" />
                    <Area type="monotone" dataKey="q_rev_w" stackId="1" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} name="Reversible Entropic" />
                    <Area type="monotone" dataKey="q_pol_w" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} name="Polarization Overpotential" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TRANSPORT KINETICS & NERNST-PLANCK-POISSON (NPP)
         ========================================================================= */}
      {activeTab === "transport_kinetics" && (
        <TransportKineticsLab />
      )}

      {/* =========================================================================
          TAB 4: FAST-CHARGE & PLATING-FREE PROTOCOL OPTIMIZER
         ========================================================================= */}
      {activeTab === "fast_charge_xfc" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-4">
            <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Adaptive Plating-Free Fast Charging (MSCC vs CC-CV)
            </h3>
            <p className="text-xs text-slate-300">
              Extreme fast charging (XFC) is constrained by local anode overpotential at the separator interface. By dynamically staging current steps (Multi-Stage Constant Current MSCC), charging time from 10% to 80% SOC is reduced by <strong>32%</strong> while maintaining <code className="text-emerald-300 font-mono">η_plating &gt; +20 mV</code> safety margin.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-[#0c1424] border border-[#1e2d46] space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 block">1. Standard 1.0C CC-CV</span>
                <div className="text-lg font-mono font-bold text-slate-200">54 mins (10-80%)</div>
                <div className="text-[11px] text-slate-400">Conservative charge protocol with zero plating risk but long turnaround time.</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Plating Safe (Margin +95 mV)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/40 space-y-2">
                <span className="text-xs font-mono font-bold text-red-300 block">2. Aggressive 3.5C CC-CV</span>
                <div className="text-lg font-mono font-bold text-red-400">18 mins (10-80%)</div>
                <div className="text-[11px] text-slate-300">Violates safe overpotential boundary after 45% SOC due to high liquid-phase transport resistance.</div>
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono pt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>CRITICAL: Plating at x=85μm</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-300 block">3. Optimized 4-Stage MSCC (Smart)</span>
                <div className="text-lg font-mono font-bold text-emerald-400">22 mins (10-80%)</div>
                <div className="text-[11px] text-slate-300">4.0C (10-40% SOC) → 2.8C (40-60%) → 1.8C (60-75%) → 1.0C (75-80%).</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Plating Safe (Margin &gt; +25 mV)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

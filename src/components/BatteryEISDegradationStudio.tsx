import { ResponsiveContainer } from './VisibleResponsiveContainer';
import React, { useState, useEffect } from "react";
import {
  BatteryCharging,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Sliders,
  Layers,
  Code,
  ArrowRight,
  Flame,
  ShieldAlert,
  Thermometer,
  Gauge
} from "lucide-react";
import {
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Scatter
} from "recharts";

interface BatteryEISDegradationStudioProps {
  initialChemistryId?: string;
  onSendToCNLS?: (points: any[], name: string) => void;
}

export function BatteryEISDegradationStudio({
  initialChemistryId = "nmc811",
  onSendToCNLS,
}: BatteryEISDegradationStudioProps) {
  const [chemId, setChemId] = useState<string>(initialChemistryId);
  const [cycles, setCycles] = useState<number>(800);
  const [tempC, setTempC] = useState<number>(25);
  const [chargeCRate, setChargeCRate] = useState<number>(1.5);
  const [r0Base, setR0Base] = useState<number>(0.08);
  const [rSeiBase, setRSeiBase] = useState<number>(0.25);
  const [rCtBase, setRCtBase] = useState<number>(0.65);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"nyquist" | "impedance_growth" | "plating_safety" | "python_code">("nyquist");

  // Call Python Backend Solver
  const runPythonSimulation = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/python/battery-corrosion-eis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "battery_degradation",
          chemistryId: chemId,
          initialParams: {
            r0_ohm: r0Base,
            rSei_ohm: rSeiBase,
            rCt_ohm: rCtBase,
            cSei_uF: 15.0,
            cDl_uF: 50.0,
            warburgSigma: 4.5,
          },
          cycles,
          tempC,
          chargeCRate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Python solver HTTP error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setSimResult(data);
    } catch (err: any) {
      console.error("Battery EIS simulation error:", err);
      setErrorMsg(err.message || "Failed to execute Python electrochemistry solver.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runPythonSimulation();
  }, [chemId, cycles, tempC, chargeCRate, r0Base, rSeiBase, rCtBase]);

  // Current status at requested cycle
  const currentStage = simResult?.evolution?.find((e: any) => e.cycle === cycles) || simResult?.evolution?.slice(-1)[0];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-[#090e18] border border-[#162032] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Battery EIS Multi-Cycle Degradation &amp; Fast-Charging Safety Engine
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">
                CPython 3.10+ Arrhenius &amp; SEI Kinetics
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Simulates SEI growth R_SEI(N), charge-transfer rise R_ct(T), capacity retention SOH(N), and lithium plating overpotential
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSendToCNLS && simResult?.nyquistMultiCycle?.[0] && (
            <button
              type="button"
              onClick={() => {
                const latestSpec = simResult.nyquistMultiCycle.slice(-1)[0]?.spectrum || [];
                const points = latestSpec.map((pt: any) => ({
                  frequency: pt.frequency,
                  zReal: pt.zReal,
                  zImag: -pt.minusZImag,
                  minusZImag: pt.minusZImag,
                  zMag: Math.sqrt(pt.zReal * pt.zReal + pt.minusZImag * pt.minusZImag),
                  phaseDeg: (Math.atan2(-pt.minusZImag, pt.zReal) * 180) / Math.PI,
                }));
                onSendToCNLS(points, `Battery_${chemId.toUpperCase()}_Cycle${cycles}`);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Send Spectrum to CNLS Studio</span>
            </button>
          )}

          <button
            type="button"
            onClick={runPythonSimulation}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-emerald-500 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Re-Solve</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Controls (5 Cols), Right Plots & Telemetry (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-[#162032] pb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Aging &amp; Charging Parameters
            </span>

            {/* Chemistry Selector */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Battery Chemistry</label>
              <select
                value={chemId}
                onChange={(e) => setChemId(e.target.value)}
                className="w-full bg-[#050810] border border-[#1e2d46] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="nmc811">Nickel-Rich Layered (NMC811 / Graphite)</option>
                <option value="lfp">Lithium Iron Phosphate (LFP / Graphite)</option>
                <option value="ssb-llzo">Solid-State Lithium (LLZO Garnet / Li Metal)</option>
                <option value="sib-prussian">Sodium-ion (Prussian White / Hard Carbon)</option>
                <option value="nca-si">Silicon-Graphite Composite (NCA / Si-Gr)</option>
              </select>
            </div>

            {/* Cycle Count Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cycle Count (N)</span>
                <span className="text-emerald-400 font-bold font-mono">{cycles} cycles</span>
              </div>
              <input
                type="range"
                min={1}
                max={2000}
                step={25}
                value={cycles}
                onChange={(e) => setCycles(parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
            </div>

            {/* Ambient Temperature Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-sky-400" />
                  Cell Temperature (T)
                </span>
                <span className="text-sky-300 font-bold font-mono">{tempC} °C</span>
              </div>
              <input
                type="range"
                min={-20}
                max={55}
                step={1}
                value={tempC}
                onChange={(e) => setTempC(parseInt(e.target.value))}
                className="w-full accent-sky-400 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
            </div>

            {/* Fast Charging C-rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-amber-400" />
                  Fast-Charge C-Rate
                </span>
                <span className="text-amber-300 font-bold font-mono">{chargeCRate.toFixed(1)} C</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={4.0}
                step={0.1}
                value={chargeCRate}
                onChange={(e) => setChargeCRate(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
              />
            </div>

            {/* Baseline Resistances */}
            <div className="border-t border-[#162032] pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Fresh Cell Pristine Resistances (Ω)
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 block">R₀ (Ohmic)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={r0Base}
                    onChange={(e) => setR0Base(parseFloat(e.target.value) || 0.05)}
                    className="w-full bg-[#050810] border border-[#1e2d46] rounded px-1.5 py-1 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">R_SEI</span>
                  <input
                    type="number"
                    step="0.02"
                    value={rSeiBase}
                    onChange={(e) => setRSeiBase(parseFloat(e.target.value) || 0.1)}
                    className="w-full bg-[#050810] border border-[#1e2d46] rounded px-1.5 py-1 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">R_ct</span>
                  <input
                    type="number"
                    step="0.05"
                    value={rCtBase}
                    onChange={(e) => setRCtBase(parseFloat(e.target.value) || 0.3)}
                    className="w-full bg-[#050810] border border-[#1e2d46] rounded px-1.5 py-1 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          {currentStage && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#090e18] border border-[#162032]">
                <span className="text-[9px] text-slate-400 block">State of Health (SOH)</span>
                <span className="text-base font-bold text-emerald-400 font-mono">{currentStage.sohPct}%</span>
                <span className="text-[9px] text-slate-500 block">Cap Retention</span>
              </div>
              <div className="p-3 rounded-xl bg-[#090e18] border border-[#162032]">
                <span className="text-[9px] text-slate-400 block">Total DC Resistance</span>
                <span className="text-base font-bold text-sky-400 font-mono">{currentStage.rTotal_ohm} Ω</span>
                <span className="text-[9px] text-slate-500 block">R₀ + R_SEI + R_ct</span>
              </div>
            </div>
          )}

          {/* Lithium Plating Risk Banner */}
          {currentStage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                currentStage.anodePotential_V <= 0
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : currentStage.anodePotential_V < 0.035
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block uppercase text-[10px]">
                  {currentStage.platingRisk}
                </span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Anode Overpotential: <strong>{currentStage.anodePotential_V} V vs Li/Li⁺</strong> (Safe Max C-rate: {simResult?.maxSafeCRate} C)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Visualization & Graphs */}
        <div className="lg:col-span-8 p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
          {/* Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-[#162032] pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSubTab("nyquist")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === "nyquist"
                    ? "bg-emerald-500/20 border border-emerald-400 text-emerald-200"
                    : "bg-[#050810] border border-[#162032] text-slate-400 hover:text-slate-200"
                }`}
              >
                Multi-Cycle Nyquist Evolution
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("impedance_growth")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === "impedance_growth"
                    ? "bg-emerald-500/20 border border-emerald-400 text-emerald-200"
                    : "bg-[#050810] border border-[#162032] text-slate-400 hover:text-slate-200"
                }`}
              >
                R_SEI &amp; R_ct Growth Curves
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("plating_safety")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === "plating_safety"
                    ? "bg-emerald-500/20 border border-emerald-400 text-emerald-200"
                    : "bg-[#050810] border border-[#162032] text-slate-400 hover:text-slate-200"
                }`}
              >
                Plating Boundary (E_anode vs C-rate)
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("python_code")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === "python_code"
                    ? "bg-emerald-500/20 border border-emerald-400 text-emerald-200"
                    : "bg-[#050810] border border-[#162032] text-slate-400 hover:text-slate-200"
                }`}
              >
                Python Engine Code
              </button>
            </div>

            {simResult?.pythonDurationMs && (
              <span className="text-[10px] text-emerald-400 font-mono">
                CPython solved in {simResult.pythonDurationMs} ms
              </span>
            )}
          </div>

          {/* Sub-Tab 1: Multi-Cycle Nyquist */}
          {activeSubTab === "nyquist" && (
            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2638" />
                  <XAxis
                    dataKey="zReal"
                    type="number"
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    label={{ value: "Z' Real (Ω)", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="minusZImag"
                    type="number"
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    label={{ value: "-Z'' Imag (Ω)", angle: -90, position: "insideLeft", offset: 10, fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: "12px", fontSize: "11px", color: "#f8fafc" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                  {simResult?.nyquistMultiCycle?.map((group: any, idx: number) => {
                    const colors = ["#10b981", "#38bdf8", "#f43f5e"];
                    const color = colors[idx % colors.length];
                    return (
                      <Line
                        key={idx}
                        data={group.spectrum}
                        type="monotone"
                        dataKey="minusZImag"
                        stroke={color}
                        strokeWidth={2.5}
                        dot={false}
                        name={`Cycle ${group.cycle} (SOH ${group.soh}%)`}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sub-Tab 2: R_SEI & R_ct Growth Curves */}
          {activeSubTab === "impedance_growth" && (
            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simResult?.evolution || []} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2638" />
                  <XAxis
                    dataKey="cycle"
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    label={{ value: "Cycle Number (N)", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="res"
                    stroke="#38bdf8"
                    tick={{ fontSize: 10, fill: "#38bdf8" }}
                    label={{ value: "Impedance (Ω)", angle: -90, position: "insideLeft", offset: 10, fill: "#38bdf8", fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="soh"
                    orientation="right"
                    domain={[40, 100]}
                    stroke="#10b981"
                    tick={{ fontSize: 10, fill: "#10b981" }}
                    label={{ value: "Capacity Retention (%)", angle: 90, position: "insideRight", offset: 10, fill: "#10b981", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: "12px", fontSize: "11px", color: "#f8fafc" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                  <Line yAxisId="res" type="monotone" dataKey="rSei_ohm" stroke="#38bdf8" strokeWidth={2} dot={false} name="R_SEI (Ω)" />
                  <Line yAxisId="res" type="monotone" dataKey="rCt_ohm" stroke="#a855f7" strokeWidth={2} dot={false} name="R_ct (Ω)" />
                  <Line yAxisId="res" type="monotone" dataKey="rTotal_ohm" stroke="#f43f5e" strokeWidth={2.5} dot={false} name="R_total (Ω)" />
                  <Line yAxisId="soh" type="monotone" dataKey="sohPct" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} name="SOH (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sub-Tab 3: Plating Safety */}
          {activeSubTab === "plating_safety" && (
            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simResult?.evolution || []} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2638" />
                  <XAxis
                    dataKey="cycle"
                    stroke="#64748b"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    label={{ value: "Cycle Number (N)", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    domain={[-0.1, 0.15]}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    label={{ value: "Anode Potential E_anode (V vs Li/Li⁺)", angle: -90, position: "insideLeft", offset: 10, fill: "#94a3b8", fontSize: 11 }}
                  />
                  <ReferenceLine y={0.0} stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" label={{ value: "Lithium Plating Boundary (0.0 V)", fill: "#f43f5e", fontSize: 10, position: "top" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: "12px", fontSize: "11px", color: "#f8fafc" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                  <Line type="monotone" dataKey="anodePotential_V" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} name="E_anode vs Li/Li⁺" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sub-Tab 4: Python Code */}
          {activeSubTab === "python_code" && (
            <div className="h-[360px] overflow-y-auto bg-[#050810] border border-[#162032] rounded-xl p-4 font-mono text-[11px] text-slate-300 leading-relaxed space-y-2">
              <div className="text-emerald-400 font-bold"># Python 3.10+ SEI &amp; Lithium Plating Kinetic Solver</div>
              <pre className="text-slate-300 whitespace-pre-wrap">
{`import math, cmath

def simulate_battery_eis(cycles=${cycles}, temp_c=${tempC}, c_rate=${chargeCRate}):
    t_kelvin = temp_c + 273.15
    ea_sei = 42000.0  # J/mol
    ea_ct = 55000.0   # J/mol
    r_gas = 8.314
    
    # Arrhenius Temperature Scaling
    arrh_ct = math.exp((ea_ct / r_gas) * (1.0 / t_kelvin - 1.0 / 298.15))
    
    # Multi-Cycle Parabolic SEI Growth
    r_sei = (${rSeiBase} + 0.018 * math.sqrt(cycles)) * arrh_ct
    r_ct = (${rCtBase} * (1.0 + 0.0012 * (cycles ** 0.72))) * arrh_ct
    
    # Plating Overpotential
    e_anode = 0.095 - (c_rate * 1.5) * (r_sei * 0.4 + r_ct * 0.6)
    return {"r_sei": r_sei, "r_ct": r_ct, "e_anode": e_anode}
`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

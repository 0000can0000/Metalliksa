import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  Zap,
  Battery,
  BatteryCharging,
  Layers,
  Thermometer,
  Activity,
  Flame,
  Droplets,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Compass,
  ArrowRight,
  TrendingDown,
  Percent,
} from "lucide-react";

type SubModule = "corrosion" | "battery";

// Standard Reduction Potentials at 25°C (vs. SHE - Standard Hydrogen Electrode)
interface GalvanicMetal {
  name: string;
  symbol: string;
  e0: number; // Volts vs SHE
  valency: number;
  density: number; // g/cm³
  atomicMass: number; // g/mol
  category: "Active (Anodic)" | "Moderate" | "Noble (Cathodic)";
  pittingIndex?: number; // PREN approx if applicable
  description: string;
}

const GALVANIC_SERIES: GalvanicMetal[] = [
  { name: "Magnesium (AZ31B)", symbol: "Mg", e0: -2.37, valency: 2, density: 1.74, atomicMass: 24.3, category: "Active (Anodic)", description: "Highly anodic, sacrificial anode alloy for extreme cathodic protection." },
  { name: "Aluminum (7075-T6)", symbol: "Al", e0: -1.66, valency: 3, density: 2.81, atomicMass: 26.98, category: "Active (Anodic)", description: "Aerospace aluminum; prone to galvanic corrosion when coupled to carbon or titanium." },
  { name: "Zinc (Galvanizing)", symbol: "Zn", e0: -0.76, valency: 2, density: 7.14, atomicMass: 65.38, category: "Active (Anodic)", description: "Standard sacrificial coating for structural carbon steels." },
  { name: "Carbon Steel (AISI 1018)", symbol: "Fe", e0: -0.44, valency: 2, density: 7.87, atomicMass: 55.85, category: "Moderate", description: "General structural steel; corrodes uniformly unless coated or cathodically protected." },
  { name: "Cadmium (Plating)", symbol: "Cd", e0: -0.40, valency: 2, density: 8.65, atomicMass: 112.41, category: "Moderate", description: "Aerospace fastener electroplating to prevent galvanic seizing with Al alloys." },
  { name: "Nickel 200", symbol: "Ni", e0: -0.25, valency: 2, density: 8.90, atomicMass: 58.69, category: "Moderate", description: "High resistance to caustics and molten alkalis; forms passive NiO film." },
  { name: "Lead-Tin Solder (60/40)", symbol: "Pb/Sn", e0: -0.13, valency: 2, density: 8.50, atomicMass: 150.0, category: "Moderate", description: "Electronic joint alloy; moderate galvanic passivity in neutral solutions." },
  { name: "Copper (C11000 ETP)", symbol: "Cu", e0: +0.34, valency: 2, density: 8.96, atomicMass: 63.55, category: "Noble (Cathodic)", description: "Noble conductive metal; acts as aggressive cathode against Al, Zn, Fe." },
  { name: "Stainless Steel 316L (Passive)", symbol: "SS 316L", e0: +0.05, valency: 2.5, density: 8.00, atomicMass: 55.5, category: "Noble (Cathodic)", pittingIndex: 25, description: "Austenitic Mo-bearing steel with dense Cr2O3 passive layer; noble in aerated seawater." },
  { name: "Titanium (Ti-6Al-4V)", symbol: "Ti-64", e0: +0.20, valency: 4, density: 4.43, atomicMass: 47.87, category: "Noble (Cathodic)", description: "Immune to chloride pitting due to resilient TiO2 ceramic barrier. Highly noble." },
  { name: "Inconel 718 (Passive)", symbol: "Ni-Cr-Fe", e0: +0.15, valency: 3, density: 8.19, atomicMass: 58.0, category: "Noble (Cathodic)", pittingIndex: 45, description: "Superalloy with exceptional high-temperature and marine oxidation immunity." },
  { name: "Platinum / Carbon CFRP", symbol: "Pt/C", e0: +1.20, valency: 2, density: 21.45, atomicMass: 195.08, category: "Noble (Cathodic)", description: "Extremely noble; conductive carbon fibers in aerospace composites act as heavy cathodes." },
];

// Battery Chemistries for Energy Storage Metallurgy
interface BatteryChemistry {
  id: string;
  name: string;
  abbreviation: string;
  anode: string;
  cathode: string;
  electrolyte: string;
  nominalVoltage: number; // Volts
  theoreticalCapacity: number; // mAh/g cathode
  practicalEnergyDensity: number; // Wh/kg cell level
  cycleLife: number; // cycles to 80% SOH
  thermalRunawayTemp: number; // °C
  diffusionCoefficientLi: string; // cm²/s
  crystalStructure: string;
  degradationMechanisms: string[];
}

const BATTERY_CHEMISTRIES: BatteryChemistry[] = [
  {
    id: "lfp",
    name: "Lithium Iron Phosphate",
    abbreviation: "LFP (LiFePO₄)",
    anode: "Synthetic Graphite (C₆)",
    cathode: "LiFePO₄ (Olivine Pnma)",
    electrolyte: "1M LiPF₆ in EC/DMC",
    nominalVoltage: 3.2,
    theoreticalCapacity: 170,
    practicalEnergyDensity: 160,
    cycleLife: 4000,
    thermalRunawayTemp: 270,
    diffusionCoefficientLi: "10⁻¹⁴ to 10⁻¹²",
    crystalStructure: "Olivine (1D Li⁺ diffusion channels along [010] axis)",
    degradationMechanisms: [
      "Iron dissolution and migration to anode SEI",
      "Graphite particle cracking & SEI continuous growth",
      "Low 1D electronic conductivity requiring Carbon nano-coating",
    ],
  },
  {
    id: "nmc811",
    name: "Nickel Manganese Cobalt (8:1:1)",
    abbreviation: "NMC811 (LiNi₀.₈Mn₀.₁Co₀.₁O₂)",
    anode: "Silicon-Graphite Composite (Si-Gr 10%)",
    cathode: "LiNi₀.₈Mn₀.₁Co₀.₁O₂ (Layered R-3m)",
    electrolyte: "LiPF₆ + FEC/VC additives in Carbonates",
    nominalVoltage: 3.7,
    theoreticalCapacity: 275,
    practicalEnergyDensity: 290,
    cycleLife: 1500,
    thermalRunawayTemp: 190,
    diffusionCoefficientLi: "10⁻¹¹ to 10⁻¹⁰",
    crystalStructure: "Layered α-NaFeO₂ rock-salt (2D Li⁺ diffusion planes)",
    degradationMechanisms: [
      "H2 → H3 phase transition lattice contraction (>4.1V)",
      "Ni⁴⁺ catalytic electrolyte oxidation and gas evolution (O₂ release)",
      "Intergranular microcracking under repeated anisotropic strain",
      "Transition metal cross-over poisoning anode SEI layer",
    ],
  },
  {
    id: "lco",
    name: "Lithium Cobalt Oxide",
    abbreviation: "LCO (LiCoO₂)",
    anode: "Mesocarbon Microbeads (MCMB Graphite)",
    cathode: "LiCoO₂ (Layered R-3m)",
    electrolyte: "1M LiPF₆ in EC/DEC",
    nominalVoltage: 3.8,
    theoreticalCapacity: 274,
    practicalEnergyDensity: 240,
    cycleLife: 1000,
    thermalRunawayTemp: 150,
    diffusionCoefficientLi: "10⁻¹² to 10⁻¹¹",
    crystalStructure: "Layered hexagonal (2D Li⁺ planar diffusion)",
    degradationMechanisms: [
      "Cobalt extraction exceeding 50% causes structural collapse",
      "High thermal instability and oxygen exotherm release",
      "Lithium plating during fast-charging at lower temperatures",
    ],
  },
  {
    id: "solid-state",
    name: "All-Solid-State Lithium Metal (SSB)",
    abbreviation: "Li-LLZO / Sulfide SSB",
    anode: "Pure Lithium Metal Foil",
    cathode: "Single-Crystal NMC811 coated with LiNbO₃",
    electrolyte: "Li₇La₃Zr₂O₁₂ (LLZO Garnet) / Li₆PS₅Cl (Argyrodite)",
    nominalVoltage: 3.85,
    theoreticalCapacity: 275,
    practicalEnergyDensity: 420,
    cycleLife: 2000,
    thermalRunawayTemp: 350,
    diffusionCoefficientLi: "10⁻⁸ (bulk solid electrolyte)",
    crystalStructure: "Cubic Garnet Ia-3d / Argyrodite F-43m",
    degradationMechanisms: [
      "Lithium dendrite propagation along solid electrolyte grain boundaries",
      "High chemo-mechanical interfacial impedance & contact voiding",
      "Chemo-mechanical stack pressure maintenance requirement (1-5 MPa)",
    ],
  },
  {
    id: "na-ion",
    name: "Sodium-Ion Battery (SIB)",
    abbreviation: "Na-Ion (Na₃V₂(PO₄)₃ / Hard Carbon)",
    anode: "Hard Carbon (Pyrolyzed Biomass / Pitch)",
    cathode: "Prussian Blue Analogues (PBA) / NFPP",
    electrolyte: "1M NaPF₆ in PC/EC",
    nominalVoltage: 3.1,
    theoreticalCapacity: 130,
    practicalEnergyDensity: 150,
    cycleLife: 3500,
    thermalRunawayTemp: 280,
    diffusionCoefficientLi: "10⁻¹² (Na⁺ diffusion)",
    crystalStructure: "Open 3D NASICON Framework / Prussian White Cubic",
    degradationMechanisms: [
      "Large Na⁺ ionic radius (1.02 Å vs Li⁺ 0.76 Å) induces volume strain",
      "Interstitial moisture trapping in Prussian Blue crystal matrix",
      "Initial Coulombic Efficiency loss during first-cycle SEI formation",
    ],
  },
];

export function CorrosionAndBatteryLab() {
  const [activeSub, setActiveSub] = useState<SubModule>("corrosion");

  // ==================== CORROSION STATE ====================
  const [anodeIdx, setAnodeIdx] = useState<number>(1); // 7075 Al
  const [cathodeIdx, setCathodeIdx] = useState<number>(7); // Copper
  const [currentDensity, setCurrentDensity] = useState<number>(2.5); // mA/cm²
  const [surfaceAreaAnode, setSurfaceAreaAnode] = useState<number>(50); // cm²
  const [surfaceAreaCathode, setSurfaceAreaCathode] = useState<number>(100); // cm²
  const [environment, setEnvironment] = useState<"seawater" | "industrial" | "rural" | "acidic">("seawater");
  const [crPercent, setCrPercent] = useState<number>(18.0);
  const [moPercent, setMoPercent] = useState<number>(2.5);
  const [nPercent, setNPercent] = useState<number>(0.15);
  const [wPercent, setWPercent] = useState<number>(0.0);

  // Faraday's Law Corrosion Rate:
  // Corrosion Rate (mm/year) = (0.00327 * i_corr (µA/cm²) * M (g/mol)) / (n * rho (g/cm³))
  // Area ratio acceleration factor = Area_cathode / Area_anode
  const metalAnode = GALVANIC_SERIES[anodeIdx];
  const metalCathode = GALVANIC_SERIES[cathodeIdx];

  const potentialDiff = Math.abs(metalCathode.e0 - metalAnode.e0);
  const areaRatio = surfaceAreaCathode / Math.max(1, surfaceAreaAnode);

  const envMultiplier = useMemo(() => {
    switch (environment) {
      case "acidic": return 3.5;
      case "seawater": return 2.0;
      case "industrial": return 1.4;
      case "rural": return 0.6;
    }
  }, [environment]);

  // Actual galvanic accelerated current density (mA/cm² -> µA/cm²)
  const effectiveIcorr_uA = currentDensity * 1000 * Math.max(0.5, Math.pow(areaRatio, 0.7)) * envMultiplier * (potentialDiff / 1.0);

  const faradayRateMmYear = useMemo(() => {
    const M = metalAnode.atomicMass;
    const n = metalAnode.valency;
    const rho = metalAnode.density;
    // CR = (K * i_corr * EW) / rho where EW = M/n, K = 0.00327 for mm/yr
    const cr = (0.00327 * effectiveIcorr_uA * M) / (n * rho);
    return Math.max(0, cr);
  }, [metalAnode, effectiveIcorr_uA]);

  const faradayMpy = faradayRateMmYear * 39.37; // mils per year

  // Pitting Resistance Equivalent Number (PREN) calculation:
  // PREN = %Cr + 3.3(%Mo + 0.5%W) + 16(%N) (or 30*N for duplex)
  const prenScore = useMemo(() => {
    return crPercent + 3.3 * (moPercent + 0.5 * wPercent) + 16 * nPercent;
  }, [crPercent, moPercent, wPercent, nPercent]);

  // ==================== BATTERY STATE ====================
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>("nmc811");
  const [cRate, setCRate] = useState<number>(1.0); // 1C
  const [ambientTemp, setAmbientTemp] = useState<number>(25); // °C
  const [numCycles, setNumCycles] = useState<number>(350);
  const [packCapacityAh, setPackCapacityAh] = useState<number>(75); // 75 Ah cell

  const selectedChem = useMemo(
    () => BATTERY_CHEMISTRIES.find((b) => b.id === selectedBatteryId) || BATTERY_CHEMISTRIES[0],
    [selectedBatteryId]
  );

  // State of Health (SOH) Degradation Model:
  // Capacity loss = A * exp(-Ea / (R*T)) * sqrt(cycles) * (C_rate^0.4)
  const estimatedSOH = useMemo(() => {
    const tempKelvin = ambientTemp + 273.15;
    // Temperature stress factor relative to 298.15K
    const tempStress = Math.exp((ambientTemp - 25) / 30);
    const cRateStress = Math.pow(cRate, 0.45);
    const cycleFactor = Math.sqrt(numCycles) / Math.sqrt(selectedChem.cycleLife);
    const totalLossPercent = 20 * cycleFactor * tempStress * cRateStress;
    const soh = Math.max(20, Math.min(100, 100 - totalLossPercent));
    return parseFloat(soh.toFixed(1));
  }, [ambientTemp, cRate, numCycles, selectedChem]);

  // Joule Heating / Heat Generation (W):
  // Q = I² * R_int + I * T * (dE/dT) (entropical heat)
  // R_int approx inversely proportional to SOH and exponential with cold
  const internalResistance_mOhm = useMemo(() => {
    const baseR = selectedChem.id === "solid-state" ? 1.8 : selectedChem.id === "lfp" ? 1.2 : 0.8;
    const sohDegradation = Math.pow(100 / Math.max(40, estimatedSOH), 1.5);
    const tempFactor = ambientTemp < 15 ? 1 + (15 - ambientTemp) * 0.08 : 1.0;
    return baseR * sohDegradation * tempFactor;
  }, [selectedChem, estimatedSOH, ambientTemp]);

  const dischargeCurrent_A = packCapacityAh * cRate;
  const thermalPower_Watts = useMemo(() => {
    const iSqR = Math.pow(dischargeCurrent_A, 2) * (internalResistance_mOhm / 1000);
    // Entropic term
    const entropic = dischargeCurrent_A * 0.04;
    return iSqR + entropic;
  }, [dischargeCurrent_A, internalResistance_mOhm]);

  return (
    <div className="space-y-6">
      {/* Module Title & Sub-navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#090e18] p-4 rounded-xl border border-[#162032] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
            {activeSub === "corrosion" ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            ) : (
              <BatteryCharging className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
              <span>Electrochemical Engineering</span>
              <span className="text-slate-500 font-normal">|</span>
              <span className="text-sky-400 text-xs lowercase">
                {activeSub === "corrosion" ? "Corrosion & Galvanic Lab" : "Battery Materials & SEI Degradation"}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Faraday mass loss, Galvanic Couples, PREN Index, Interfacial SEI & Battery State-of-Health
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#050810] rounded-lg border border-[#162032] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setActiveSub("corrosion");
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
              activeSub === "corrosion"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Galvanic & Corrosion</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setActiveSub("battery");
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
              activeSub === "battery"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Battery className="w-3.5 h-3.5" />
            <span>Battery Metallurgy</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CORROSION & GALVANIC WORKSPACE                           */}
      {/* ======================================================== */}
      {activeSub === "corrosion" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Galvanic Couple Simulator */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Galvanic Couple & Faraday Penetration Rate
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                  ASTM G102 / G82
                </span>
              </div>

              {/* Anode vs Cathode Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Anode Metal */}
                <div className="p-3.5 bg-[#050810] rounded-lg border border-red-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      ANODE (Oxidation / Corroding)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      E°: {metalAnode.e0 > 0 ? `+${metalAnode.e0}` : metalAnode.e0} V
                    </span>
                  </div>
                  <select
                    value={anodeIdx}
                    onChange={(e) => setAnodeIdx(parseInt(e.target.value))}
                    className="w-full bg-[#0c1322] border border-[#1e2d46] rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-red-400"
                  >
                    {GALVANIC_SERIES.map((metal, idx) => (
                      <option key={metal.name} value={idx}>
                        {metal.name} ({metal.symbol}) [{metal.e0 > 0 ? `+${metal.e0}` : metal.e0}V]
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{metalAnode.description}</p>
                  
                  <div className="pt-2 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Anode Area:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={surfaceAreaAnode}
                        onChange={(e) => setSurfaceAreaAnode(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-16 px-2 py-0.5 bg-[#0c1322] border border-[#1e2d46] rounded text-right text-white font-bold"
                      />
                      <span className="text-[10px] text-slate-400">cm²</span>
                    </div>
                  </div>
                </div>

                {/* Cathode Metal */}
                <div className="p-3.5 bg-[#050810] rounded-lg border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      CATHODE (Reduction / Protected)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      E°: {metalCathode.e0 > 0 ? `+${metalCathode.e0}` : metalCathode.e0} V
                    </span>
                  </div>
                  <select
                    value={cathodeIdx}
                    onChange={(e) => setCathodeIdx(parseInt(e.target.value))}
                    className="w-full bg-[#0c1322] border border-[#1e2d46] rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                  >
                    {GALVANIC_SERIES.map((metal, idx) => (
                      <option key={metal.name} value={idx}>
                        {metal.name} ({metal.symbol}) [{metal.e0 > 0 ? `+${metal.e0}` : metal.e0}V]
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{metalCathode.description}</p>
                  
                  <div className="pt-2 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Cathode Area:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={surfaceAreaCathode}
                        onChange={(e) => setSurfaceAreaCathode(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-16 px-2 py-0.5 bg-[#0c1322] border border-[#1e2d46] rounded text-right text-white font-bold"
                      />
                      <span className="text-[10px] text-slate-400">cm²</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environmental Electrolyte & Base Current */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300">Electrolyte Environment:</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full bg-[#0c1322] border border-[#1e2d46] rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  >
                    <option value="seawater">Seawater (3.5% NaCl Chloride, High Conductance)</option>
                    <option value="acidic">Acidic Marine / Salt Spray (pH 3.0, Extreme)</option>
                    <option value="industrial">Industrial Atmospheric (SO₂, Moderate)</option>
                    <option value="rural">Rural Atmospheric (Low Humidity, Mild)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">Baseline Corrosion i_corr:</span>
                    <span className="text-amber-400 font-bold">{currentDensity} mA/cm²</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={currentDensity}
                    onChange={(e) => setCurrentDensity(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.1 (Passivated)</span>
                    <span>5.0 (Active)</span>
                    <span>10.0 (Severe)</span>
                  </div>
                </div>
              </div>

              {/* Diagnostic Visual Output Box */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400">Faraday Mass Loss Output</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                    faradayRateMmYear > 2.0 ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}>
                    {faradayRateMmYear > 2.0 ? "CRITICAL PENETRATION RISK" : "MANAGEABLE / MODERATE"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block font-mono">Driving Potential (ΔE)</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">{potentialDiff.toFixed(2)} V</span>
                  </div>
                  <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block font-mono">Area Ratio (Cathode/Anode)</span>
                    <span className="text-sm font-bold text-sky-400 font-mono">{areaRatio.toFixed(2)} : 1</span>
                  </div>
                  <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block font-mono">Penetration Rate</span>
                    <span className="text-sm font-bold text-red-400 font-mono">{faradayRateMmYear.toFixed(3)} mm/yr</span>
                  </div>
                  <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block font-mono">Mils Per Year (MPY)</span>
                    <span className="text-sm font-bold text-orange-300 font-mono">{faradayMpy.toFixed(1)} mpy</span>
                  </div>
                </div>

                {areaRatio > 2.0 && potentialDiff > 0.5 && (
                  <div className="p-2.5 rounded bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Warning: Large Cathode / Small Anode Effect:</strong> Coupling a large cathode area ({surfaceAreaCathode} cm²) to a small anode ({surfaceAreaAnode} cm²) amplifies localized corrosion current density exponentially on the {metalAnode.name}.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Pitting Resistance (PREN) & Stainless Corrosion Advisor */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-4">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Pitting Resistance (PREN)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-[10px] font-mono border border-sky-500/30">
                  ISO 15156 / NACE
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                PREN = %Cr + 3.3(%Mo + 0.5%W) + 16(%N). Evaluates alloy immunity to chloride-induced localized pitting and crevice corrosion.
              </p>

              {/* PREN Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Chromium (%Cr):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={crPercent}
                      onChange={(e) => setCrPercent(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-[#050810] border border-[#1e2d46] rounded text-right text-sky-300 font-bold"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Molybdenum (%Mo):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={moPercent}
                      onChange={(e) => setMoPercent(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-[#050810] border border-[#1e2d46] rounded text-right text-sky-300 font-bold"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Tungsten (%W):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={wPercent}
                      onChange={(e) => setWPercent(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-[#050810] border border-[#1e2d46] rounded text-right text-sky-300 font-bold"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Nitrogen (%N):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={nPercent}
                      onChange={(e) => setNPercent(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-[#050810] border border-[#1e2d46] rounded text-right text-sky-300 font-bold"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>
              </div>

              {/* PREN Result Card */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] text-center space-y-2">
                <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider block">
                  Calculated PREN Index
                </span>
                <div className="text-3xl font-extrabold font-mono text-sky-400 tracking-tight">
                  {prenScore.toFixed(1)}
                </div>

                <div className="pt-2">
                  {prenScore >= 40 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Super Duplex / Offshore Seawater Immune (PREN ≥ 40)
                    </span>
                  ) : prenScore >= 32 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Standard Duplex (e.g., 2205) / High Marine Resistance
                    </span>
                  ) : prenScore >= 24 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Austenitic (e.g., 316L) / Prone to Crevice Pitting in Warm Sea
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Standard Austenitic (304) / Severe Pitting in Chloride
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-mono block">Load Industry Standard Alloys:</span>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCrPercent(18.0);
                      setMoPercent(2.5);
                      setWPercent(0);
                      setNPercent(0.05);
                    }}
                    className="p-1.5 rounded bg-[#0c1322] hover:bg-sky-500/20 text-slate-300 border border-[#1e2d46]"
                  >
                    316L Stainless
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCrPercent(22.0);
                      setMoPercent(3.1);
                      setWPercent(0);
                      setNPercent(0.18);
                    }}
                    className="p-1.5 rounded bg-[#0c1322] hover:bg-sky-500/20 text-slate-300 border border-[#1e2d46]"
                  >
                    2205 Duplex
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCrPercent(25.0);
                      setMoPercent(3.8);
                      setWPercent(0.6);
                      setNPercent(0.28);
                    }}
                    className="p-1.5 rounded bg-[#0c1322] hover:bg-sky-500/20 text-slate-300 border border-[#1e2d46]"
                  >
                    2507 Super Duplex
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BATTERY METALLURGY & SEI DEGRADATION WORKSPACE           */}
      {/* ======================================================== */}
      {activeSub === "battery" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Chemistry Selector & Lattice Parameters */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <div className="flex items-center gap-2">
                  <BatteryCharging className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Battery Chemistry & Solid-State Cathode Diagnostics
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                  Li-Ion / SSB / SIB
                </span>
              </div>

              {/* Chemistry Selector Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BATTERY_CHEMISTRIES.map((chem) => (
                  <button
                    key={chem.id}
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
                      setSelectedBatteryId(chem.id);
                    }}
                    className={`p-3 rounded-lg border text-left transition ${
                      selectedBatteryId === chem.id
                        ? "bg-emerald-500/15 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "bg-[#050810] border-[#162032] text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[11px] font-bold font-mono block text-emerald-400">
                      {chem.abbreviation}
                    </span>
                    <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{chem.name}</span>
                    <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>{chem.nominalVoltage} V</span>
                      <span>{chem.practicalEnergyDensity} Wh/kg</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Chemistry Deep-Dive Spec Sheet */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>{selectedChem.name} Crystallographic Profile</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    D_Li+: {selectedChem.diffusionCoefficientLi} cm²/s
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 bg-[#090e18] rounded border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block">Cathode Active Material</span>
                    <span className="text-white font-semibold text-[11px]">{selectedChem.cathode}</span>
                  </div>
                  <div className="p-2.5 bg-[#090e18] rounded border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block">Anode System</span>
                    <span className="text-white font-semibold text-[11px]">{selectedChem.anode}</span>
                  </div>
                  <div className="p-2.5 bg-[#090e18] rounded border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block">Electrolyte / Separator</span>
                    <span className="text-white font-semibold text-[11px]">{selectedChem.electrolyte}</span>
                  </div>
                </div>

                <div className="pt-2 space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                    Key Metallurgical Degradation & Interfacial Loss Modes:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300 font-mono">
                    {selectedChem.degradationMechanisms.map((deg, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                        <span>{deg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: State of Health (SOH) & Thermal Runaway Simulator */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Degradation & SOH Cycle Predictor
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  Arrhenius / SEI Aging
                </span>
              </div>

              {/* Stress Slider Controls */}
              <div className="space-y-4">
                {/* Cycles */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">Full Equivalent Cycles:</span>
                    <span className="text-emerald-400 font-bold">{numCycles} cycles</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={selectedChem.cycleLife * 1.5}
                    step="10"
                    value={numCycles}
                    onChange={(e) => setNumCycles(parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10 (Fresh Cell)</span>
                    <span>{selectedChem.cycleLife} (Nominal EOL 80%)</span>
                  </div>
                </div>

                {/* Ambient Temperature */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">Operating Temperature:</span>
                    <span className={`font-bold ${ambientTemp > 45 ? "text-red-400" : ambientTemp < 0 ? "text-sky-300" : "text-emerald-400"}`}>
                      {ambientTemp} °C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="65"
                    step="1"
                    value={ambientTemp}
                    onChange={(e) => setAmbientTemp(parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>-20°C (Li-Plating Risk)</span>
                    <span>25°C (Optimal)</span>
                    <span>65°C (SEI Dissolution)</span>
                  </div>
                </div>

                {/* C-Rate */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">Discharge / Fast-Charge Rate:</span>
                    <span className="text-sky-400 font-bold">{cRate.toFixed(1)} C ({dischargeCurrent_A.toFixed(1)} A)</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="5.0"
                    step="0.1"
                    value={cRate}
                    onChange={(e) => setCRate(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* SOH & Thermal Metrics */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase">State of Health (SOH)</span>
                  <span className={`text-lg font-bold font-mono ${
                    estimatedSOH >= 80 ? "text-emerald-400" : estimatedSOH >= 60 ? "text-amber-400" : "text-red-400"
                  }`}>
                    {estimatedSOH}%
                  </span>
                </div>

                {/* SOH Progress bar */}
                <div className="w-full bg-[#0c1322] h-2.5 rounded-full overflow-hidden border border-[#162032]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      estimatedSOH >= 80
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : estimatedSOH >= 60
                        ? "bg-gradient-to-r from-amber-500 to-orange-400"
                        : "bg-gradient-to-r from-red-600 to-rose-400"
                    }`}
                    style={{ width: `${estimatedSOH}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#090e18] rounded border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block">Internal Resistance (R_int)</span>
                    <span className="text-white font-bold text-sm">{internalResistance_mOhm.toFixed(2)} mΩ</span>
                  </div>
                  <div className="p-2.5 bg-[#090e18] rounded border border-[#162032]">
                    <span className="text-[10px] text-slate-400 block">Joule Heat Dissipation</span>
                    <span className="text-amber-400 font-bold text-sm">{thermalPower_Watts.toFixed(1)} W / cell</span>
                  </div>
                </div>

                {ambientTemp > 50 && (
                  <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2 font-mono">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>High temperature accelerates SEI growth & transition metal leaching.</span>
                  </div>
                )}

                {ambientTemp < 0 && cRate > 1.0 && (
                  <div className="p-2 rounded bg-sky-950/30 border border-sky-800/40 text-sky-300 text-xs flex items-center gap-2 font-mono">
                    <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Sub-zero fast charging risks metallic Lithium dendrite plating & short circuit.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

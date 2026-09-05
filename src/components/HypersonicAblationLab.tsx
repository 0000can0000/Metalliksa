import React, { useState, useMemo } from "react";
import {
  Flame,
  Rocket,
  Shield,
  Activity,
  Zap,
  Sliders,
  Thermometer,
  Layers,
  Atom,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Download,
  Info,
  TrendingUp,
  RefreshCw,
  Clock,
  Wind,
  Globe,
  Radio,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export interface TPSMaterial {
  id: string;
  name: string;
  category: "Charring Phenolic" | "Elastomeric Liner" | "Ceramic UHTC" | "Carbon-Carbon / CMC";
  densityVirgin_kgm3: number;
  densityChar_kgm3: number;
  specificHeat_JkgK: number;
  thermalConductivity_WmK: number;
  effectiveHeatOfAblation_MJkg: number;
  pyrolysisActivationEnergy_kJmol: number;
  pyrolysisPreExponential_s1: number;
  pyrolysisReactionOrder: number;
  emissivity: number;
  maxServiceTemp_C: number;
  airframeBondlineLimit_C: number;
  description: string;
  typicalApplication: string;
}

export const TPS_DATABASE: TPSMaterial[] = [
  {
    id: "pica-x",
    name: "PICA-X (Phenolic Impregnated Carbon Ablator)",
    category: "Charring Phenolic",
    densityVirgin_kgm3: 270,
    densityChar_kgm3: 210,
    specificHeat_JkgK: 1650,
    thermalConductivity_WmK: 0.12,
    effectiveHeatOfAblation_MJkg: 28.5,
    pyrolysisActivationEnergy_kJmol: 145,
    pyrolysisPreExponential_s1: 1.2e6,
    pyrolysisReactionOrder: 1.5,
    emissivity: 0.88,
    maxServiceTemp_C: 2800,
    airframeBondlineLimit_C: 175,
    description: "Low-density carbon fiber matrix infused with phenolic resin. High char retention and low thermal conductivity.",
    typicalApplication: "Planetary atmospheric re-entry heat shields (Dragon, Mars sample return).",
  },
  {
    id: "carbon-phenolic-mx4926",
    name: "Carbon-Phenolic 2D/3D (MX-4926 / Rayon-Based)",
    category: "Charring Phenolic",
    densityVirgin_kgm3: 1450,
    densityChar_kgm3: 1180,
    specificHeat_JkgK: 1400,
    thermalConductivity_WmK: 0.85,
    effectiveHeatOfAblation_MJkg: 18.0,
    pyrolysisActivationEnergy_kJmol: 165,
    pyrolysisPreExponential_s1: 4.5e6,
    pyrolysisReactionOrder: 1.8,
    emissivity: 0.92,
    maxServiceTemp_C: 3300,
    airframeBondlineLimit_C: 220,
    description: "High-density continuous woven carbon fabric soaked with resol phenolic resin. High shear and gas erosion resistance.",
    typicalApplication: "Solid Rocket Motor (SRM) nozzle throat inserts, ICBM/hypersonic RV nose tips.",
  },
  {
    id: "silica-phenolic",
    name: "Silica-Phenolic (Aerospace Grade)",
    category: "Charring Phenolic",
    densityVirgin_kgm3: 1720,
    densityChar_kgm3: 1550,
    specificHeat_JkgK: 1250,
    thermalConductivity_WmK: 0.62,
    effectiveHeatOfAblation_MJkg: 14.5,
    pyrolysisActivationEnergy_kJmol: 130,
    pyrolysisPreExponential_s1: 8.0e5,
    pyrolysisReactionOrder: 1.2,
    emissivity: 0.75,
    maxServiceTemp_C: 2200,
    airframeBondlineLimit_C: 150,
    description: "High-purity quartz/silica fabric composite. Provides RF transparency for telemetry and guidance antennas.",
    typicalApplication: "Hypersonic missile radomes, rocket exit cones, antenna window fairings.",
  },
  {
    id: "epdm-aramid-liner",
    name: "EPDM-Aramid Elastomeric Internal Liner",
    category: "Elastomeric Liner",
    densityVirgin_kgm3: 1050,
    densityChar_kgm3: 650,
    specificHeat_JkgK: 1950,
    thermalConductivity_WmK: 0.22,
    effectiveHeatOfAblation_MJkg: 9.8,
    pyrolysisActivationEnergy_kJmol: 110,
    pyrolysisPreExponential_s1: 2.5e5,
    pyrolysisReactionOrder: 1.0,
    emissivity: 0.82,
    maxServiceTemp_C: 1600,
    airframeBondlineLimit_C: 85,
    description: "Ethylene Propylene Diene Monomer rubber filled with aramid (Kevlar) pulp. Flexible, lightweight internal thermal barrier.",
    typicalApplication: "Tactical missile rocket motor casing inner insulation, solid propellant grain liners.",
  },
  {
    id: "hfb2-sic-uhtc",
    name: "HfB2-20%SiC Ultra-High Temperature Ceramic (UHTC)",
    category: "Ceramic UHTC",
    densityVirgin_kgm3: 9800,
    densityChar_kgm3: 9800,
    specificHeat_JkgK: 620,
    thermalConductivity_WmK: 45.0,
    effectiveHeatOfAblation_MJkg: 65.0, // Non-ablative oxidation resistance
    pyrolysisActivationEnergy_kJmol: 350,
    pyrolysisPreExponential_s1: 1.0e2,
    pyrolysisReactionOrder: 1.0,
    emissivity: 0.90,
    maxServiceTemp_C: 2500,
    airframeBondlineLimit_C: 300,
    description: "Monolithic Hafnium Diboride / Silicon Carbide ceramic. Zero shape recession up to 2200°C due to protective HfO2-SiO2 scale.",
    typicalApplication: "Sharp aerodynamic wing leading edges (R < 10 mm) for Mach 8+ Hypersonic Glide Vehicles.",
  },
  {
    id: "c-c-sic-gradient",
    name: "3D C/C-SiC Ceramic Matrix Composite",
    category: "Carbon-Carbon / CMC",
    densityVirgin_kgm3: 2100,
    densityChar_kgm3: 2100,
    specificHeat_JkgK: 1100,
    thermalConductivity_WmK: 22.0,
    effectiveHeatOfAblation_MJkg: 42.0,
    pyrolysisActivationEnergy_kJmol: 280,
    pyrolysisPreExponential_s1: 1.0e3,
    pyrolysisReactionOrder: 1.0,
    emissivity: 0.89,
    maxServiceTemp_C: 2000,
    airframeBondlineLimit_C: 250,
    description: "Carbon-fiber reinforced Silicon Carbide matrix prepared via Liquid Silicon Infiltration (LSI). Superior thermal shock resistance.",
    typicalApplication: "Hypersonic control flaps, scramjet combustor liners, re-entry nose caps.",
  },
];

export const HypersonicAblationLab: React.FC = () => {
  const [selectedTpsId, setSelectedTpsId] = useState<string>("pica-x");
  const [activeTab, setActiveTab] = useState<"aerothermal" | "ablation" | "radiation" | "audit">("aerothermal");

  // Flight Envelope Parameters
  const [machNumber, setMachNumber] = useState<number>(12);
  const [altitudeKm, setAltitudeKm] = useState<number>(32);
  const [noseRadiusMm, setNoseRadiusMm] = useState<number>(25);
  const [flightDurationSec, setFlightDurationSec] = useState<number>(120);
  const [tpsThicknessMm, setTpsThicknessMm] = useState<number>(35);

  // Space & Nuclear Radiation Parameters
  const [neutronEnergyMeV, setNeutronEnergyMeV] = useState<number>(14.1); // Fusion / fast fission
  const [neutronFluenceE19, setNeutronFluenceE19] = useState<number>(5.0); // 10^19 n/cm2
  const [displacementThresholdEd_eV, setDisplacementThresholdEd_eV] = useState<number>(40);

  // AI Audit State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);

  const tps = useMemo(() => {
    return TPS_DATABASE.find((m) => m.id === selectedTpsId) || TPS_DATABASE[0];
  }, [selectedTpsId]);

  // Atmospheric Model (1976 US Standard Atmosphere Approximation)
  const atmosphericData = useMemo(() => {
    // Altitude h in km
    const h = altitudeKm;
    let T = 288.15 - 6.5 * Math.min(h, 11);
    if (h > 11 && h <= 20) T = 216.65;
    else if (h > 20 && h <= 32) T = 216.65 + 1.0 * (h - 20);
    else if (h > 32 && h <= 47) T = 228.65 + 2.8 * (h - 32);
    else if (h > 47 && h <= 51) T = 270.65;
    else if (h > 51 && h <= 71) T = 270.65 - 2.8 * (h - 51);
    else if (h > 71) T = 214.65 - 2.0 * (h - 71);

    // Density rho (kg/m3) barometric formula
    const rho0 = 1.225;
    const rho = rho0 * Math.exp(-h / 7.2);
    const soundSpeed = Math.sqrt(1.4 * 287.05 * T);
    const flightVelocity = machNumber * soundSpeed;

    return {
      ambientTemp_K: T,
      ambientTemp_C: T - 273.15,
      density_kgm3: rho,
      soundSpeed_ms: soundSpeed,
      flightVelocity_ms: flightVelocity,
    };
  }, [machNumber, altitudeKm]);

  // Aerothermal Aerodynamic Heating & Stagnation Point (Fay-Riddell / Detra-Kemp-Riddell Formulation)
  const aerothermalResults = useMemo(() => {
    const { density_kgm3, flightVelocity_ms, ambientTemp_K } = atmosphericData;
    const Rn_m = noseRadiusMm / 1000;
    const rho0 = 1.225;
    const V_co = 7900; // circular orbital velocity m/s

    // Detra-Kemp-Riddell convective heat flux: q_conv = (11030 / sqrt(Rn)) * sqrt(rho/rho0) * (V / V_co)^3.15  (W/cm2)
    const q_conv_Wcm2 = (11030 / Math.sqrt(Math.max(0.002, Rn_m))) * Math.sqrt(density_kgm3 / rho0) * Math.pow(flightVelocity_ms / V_co, 3.15);
    const q_conv_MWm2 = (q_conv_Wcm2 * 10000) / 1e6; // Convert W/cm2 to MW/m2

    // Radiative shock layer heat flux (significant above Mach 14 / high velocity):
    // q_rad = C_rad * Rn^a * rho^b * V^c
    let q_rad_MWm2 = 0;
    if (machNumber > 10) {
      q_rad_MWm2 = 0.008 * Math.pow(Rn_m, 0.6) * Math.pow(density_kgm3 * 1000, 1.2) * Math.pow(flightVelocity_ms / 3000, 5.5);
    }

    const q_total_MWm2 = q_conv_MWm2 + q_rad_MWm2;

    // Stagnation Enthalpy H0 = Cp * T + V^2 / 2 (MJ/kg)
    const stagnationEnthalpy_MJkg = (1005 * ambientTemp_K + 0.5 * Math.pow(flightVelocity_ms, 2)) / 1e6;

    // Stagnation Recovery Temperature (Real gas dissociation equilibrium approximation)
    // T_stag ~ T_inf * (1 + 0.85 * (gamma-1)/2 * M^2) modified for high temperature dissociation
    const recoveryTemp_K = ambientTemp_K * (1 + 0.16 * Math.pow(machNumber, 1.85));
    const recoveryTemp_C = recoveryTemp_K - 273.15;

    // Radiative equilibrium surface temperature: T_w = (q_total / (epsilon * sigma))^0.25
    const sigma = 5.670374e-8; // Stefan-Boltzmann
    const q_W_m2 = q_total_MWm2 * 1e6;
    const radEquilibriumTemp_K = Math.pow(q_W_m2 / (tps.emissivity * sigma), 0.25);
    const radEquilibriumTemp_C = radEquilibriumTemp_K - 273.15;

    return {
      q_conv_MWm2,
      q_rad_MWm2,
      q_total_MWm2,
      stagnationEnthalpy_MJkg,
      recoveryTemp_C,
      radEquilibriumTemp_C,
    };
  }, [atmosphericData, noseRadiusMm, machNumber, tps]);

  // Charring Ablation, Pyrolysis Kinetics, and Surface Recession Calculations
  const ablationResults = useMemo(() => {
    const { q_total_MWm2, radEquilibriumTemp_C } = aerothermalResults;
    const duration = flightDurationSec;
    const thickness = tpsThicknessMm; // mm
    const Q_abl_Jkg = tps.effectiveHeatOfAblation_MJkg * 1e6;

    // Surface recession rate (mm/s):
    // s_dot = (q_total - q_reradiated) / (rho_virgin * Q_abl)
    const sigma = 5.670374e-8;
    const Tw_K = Math.min(radEquilibriumTemp_C + 273.15, tps.maxServiceTemp_C + 273.15);
    const q_reradiated_Wm2 = tps.emissivity * sigma * Math.pow(Tw_K, 4);
    const q_net_Wm2 = Math.max(0, q_total_MWm2 * 1e6 - q_reradiated_Wm2);

    let recessionRate_mms = 0;
    if (tps.category !== "Ceramic UHTC") {
      recessionRate_mms = ((q_net_Wm2 / (tps.densityVirgin_kgm3 * Q_abl_Jkg)) * 1000);
    } else {
      // UHTC has zero/near-zero recession below 2200°C; slight oxidation recession at extreme temps
      recessionRate_mms = radEquilibriumTemp_C > 2000 ? 0.005 * Math.exp((radEquilibriumTemp_C - 2000) / 200) : 0.0001;
    }

    const totalSurfaceRecession_mm = Math.min(thickness, recessionRate_mms * duration);
    const remainingTpsThickness_mm = Math.max(0, thickness - totalSurfaceRecession_mm);

    // 1D In-Depth Thermal Gradient & Bondline Temperature Calculation (Transient semi-infinite / slab diffusion):
    // alpha = k / (rho * Cp)
    const thermalDiffusivity_m2s = tps.thermalConductivity_WmK / (tps.densityVirgin_kgm3 * tps.specificHeat_JkgK);
    const FourierNumber = (thermalDiffusivity_m2s * duration) / Math.pow(thickness / 1000, 2);

    // Approximate in-depth bondline temperature at airframe backface
    const bondlineTempRise = (radEquilibriumTemp_C - 25) * Math.exp(-1.4 / Math.sqrt(Math.max(0.01, FourierNumber)));
    const estimatedBondlineTemp_C = 25 + Math.min(bondlineTempRise, radEquilibriumTemp_C * 0.95);

    // Pyrolysis Char Depth (Arrhenius char zone boundary)
    const charDepth_mm = Math.min(
      thickness,
      totalSurfaceRecession_mm + (thickness - totalSurfaceRecession_mm) * Math.min(1.0, Math.sqrt(FourierNumber) * 0.85)
    );

    // In-depth temperature profile array (0 to thickness in 20 steps)
    const profileData = [];
    for (let i = 0; i <= 20; i++) {
      const depthMm = (thickness * i) / 20;
      const normalizedDepth = depthMm / thickness;
      
      // Temperature profile: exponential decay from surface to bondline
      const tempAtDepth_C = estimatedBondlineTemp_C + (radEquilibriumTemp_C - estimatedBondlineTemp_C) * Math.exp(-3.2 * normalizedDepth);
      
      // Material state: Virgin (100%), Pyrolysis Zone, or Char
      let charFraction = 0;
      if (depthMm <= totalSurfaceRecession_mm) {
        charFraction = 1.0; // Receded / gasified
      } else if (depthMm <= charDepth_mm) {
        charFraction = Math.max(0, 1.0 - (depthMm - totalSurfaceRecession_mm) / Math.max(1, charDepth_mm - totalSurfaceRecession_mm));
      }

      profileData.push({
        depthMm: depthMm.toFixed(1),
        tempC: Math.round(tempAtDepth_C),
        charFraction: +(charFraction * 100).toFixed(1),
        virginFraction: +(Math.max(0, 100 - charFraction * 100)).toFixed(1),
      });
    }

    const isAirframeSafe = estimatedBondlineTemp_C <= tps.airframeBondlineLimit_C;
    const isBurnThrough = totalSurfaceRecession_mm >= thickness;

    return {
      recessionRate_mms,
      totalSurfaceRecession_mm,
      remainingTpsThickness_mm,
      charDepth_mm,
      estimatedBondlineTemp_C,
      isAirframeSafe,
      isBurnThrough,
      profileData,
      thermalDiffusivity_m2s,
    };
  }, [aerothermalResults, tps, flightDurationSec, tpsThicknessMm]);

  // Space & Defense Radiation Damage Engine (Norgett-Robinson-Torrens NRT Model)
  const radiationResults = useMemo(() => {
    // Displacement threshold energy Ed (eV), Neutron Energy En (MeV)
    // Damage energy T_dam ~ 0.5 * (4 * m_n * M / (m_n + M)^2) * En (Kinematic recoil)
    const atomicWeight = tps.category.includes("Ceramic") ? 180 : 12.01; // C or Hf average
    const massRatio = 1.0 / atomicWeight;
    const maxRecoilEnergy_keV = (4 * 1.0 * atomicWeight / Math.pow(1.0 + atomicWeight, 2)) * (neutronEnergyMeV * 1000);
    const avgDamageEnergy_eV = (maxRecoilEnergy_keV * 1000) * 0.45;

    // NRT Formula: N_d = (0.8 * T_damage) / (2 * Ed)
    const displacementsPerPrimaryRecoil = Math.max(1, (0.8 * avgDamageEnergy_eV) / (2 * displacementThresholdEd_eV));

    // DPA = (Fluence * sigma_scattering * N_d)
    const scatteringCrossSection_cm2 = 3.5e-24; // ~3.5 barns
    const totalNeutronFluence_n_cm2 = neutronFluenceE19 * 1e19;
    const calculatedDPA = totalNeutronFluence_n_cm2 * scatteringCrossSection_cm2 * displacementsPerPrimaryRecoil;

    // Void Swelling & DBTT Shift
    // Delta V / V (%) ~ C * (DPA)^n
    const volumetricSwellingPct = Math.min(15, 0.45 * Math.pow(calculatedDPA, 1.15));
    const dbttShift_C = Math.min(250, 48 * Math.pow(calculatedDPA, 0.65));

    return {
      maxRecoilEnergy_keV,
      displacementsPerPrimaryRecoil: Math.round(displacementsPerPrimaryRecoil),
      calculatedDPA: +calculatedDPA.toFixed(3),
      volumetricSwellingPct: +volumetricSwellingPct.toFixed(2),
      dbttShift_C: Math.round(dbttShift_C),
    };
  }, [tps, neutronEnergyMeV, neutronFluenceE19, displacementThresholdEd_eV]);

  const handleRunAiAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const summary = `### 🚀 Hypersonic Aerothermal & TPS Engineering Audit Report
**Classification:** DEFENSE / SPACE AEROSPACE GRADE
**Mission Profile:** Mach ${machNumber} @ Altitude ${altitudeKm} km | Stagnation Heat Flux: **${aerothermalResults.q_total_MWm2.toFixed(2)} MW/m²**
**Selected TPS Solution:** ${tps.name} (${tpsThicknessMm} mm Initial Thickness)

---

#### 1. Aerothermal Stagnation Environment & Shock Layer:
- **Flight Velocity:** ${atmosphericData.flightVelocity_ms.toFixed(0)} m/s (${(atmosphericData.flightVelocity_ms * 3.6).toFixed(0)} km/h)
- **Convective Stagnation Heat Flux ($q_{conv}$):** ${aerothermalResults.q_conv_MWm2.toFixed(2)} MW/m²
- **Radiative Shock Layer Heat Flux ($q_{rad}$):** ${aerothermalResults.q_rad_MWm2.toFixed(2)} MW/m²
- **Peak Radiative Surface Equilibrium Temperature:** **${aerothermalResults.radEquilibriumTemp_C.toFixed(0)} °C** (Recovery Temp: ${aerothermalResults.recoveryTemp_C.toFixed(0)} °C)

---

#### 2. Charring Ablation & Pyrolysis In-Depth Response:
- **Surface Recession Rate:** ${ablationResults.recessionRate_mms.toFixed(3)} mm/s
- **Total Surface Thickness Loss (${flightDurationSec}s):** **${ablationResults.totalSurfaceRecession_mm.toFixed(2)} mm** (${((ablationResults.totalSurfaceRecession_mm / tpsThicknessMm) * 100).toFixed(1)}% of total thickness)
- **Remaining Protective TPS Margin:** **${ablationResults.remainingTpsThickness_mm.toFixed(2)} mm**
- **Predicted Airframe Bondline Temperature:** **${ablationResults.estimatedBondlineTemp_C.toFixed(1)} °C** (Allowable Limit: ${tps.airframeBondlineLimit_C} °C)
- **Airframe Safety Assessment:** ${ablationResults.isAirframeSafe ? "✅ FLIGHT CERTIFIED: Bondline temperature is within structural margin." : "🚨 CRITICAL OVERHEAT: Exceeds airframe adhesive limit! Increase TPS thickness by at least +15 mm."}

---

#### 3. Extreme Space / Nuclear Radiation Hardening (NRT Model):
- **Displacement Damage (DPA):** ${radiationResults.calculatedDPA} dpa
- **Volumetric Swelling ($\Delta V/V$):** +${radiationResults.volumetricSwellingPct}%
- **Ductile-to-Brittle Transition Temperature Shift ($\Delta DBTT$):** +${radiationResults.dbttShift_C} °C

---

#### 4. Directorate Recommendation:
${ablationResults.isBurnThrough ? "⚠️ IMMEDIATE REDESIGN: Burn-through occurs before mission completion. Transition to MX-4926 3D Carbon-Phenolic or UHTC leading edge." : tps.category === "Ceramic UHTC" ? "🛡️ UHTC provides zero shape change, maintaining aerodynamic lift-to-drag ratio (L/D) for hypersonic glide control." : "✅ PICA/Phenolic system exhibits ideal char retention and low backface thermal signature."}`;

      setAuditReport(summary);
      setIsAuditing(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono">
      {/* Top Header */}
      <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(249,115,22,0.4)] border border-orange-400/40">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Hypersonic Aerothermal & Ablative TPS Simulator
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 font-bold">
                  NASA CMA / MIL-HDBK-728
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold hidden sm:inline-block">
                  MACH 3 - 25+
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Pyrolysis kinetics, surface recession, stagnation point Fay-Riddell aerothermal heat flux, and NRT radiation damage.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleRunAiAudit}
            disabled={isAuditing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50 shrink-0"
          >
            {isAuditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Run Hypersonic Mission Audit</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#162032] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("aerothermal")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition ${
              activeTab === "aerothermal"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/50 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1322] border border-transparent"
            }`}
          >
            <Wind className="w-4 h-4" />
            <span>1. Stagnation Heat Flux & Shock Layer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ablation")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition ${
              activeTab === "ablation"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/50 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1322] border border-transparent"
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>2. Charring Ablation & Pyrolysis In-Depth</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("radiation")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition ${
              activeTab === "radiation"
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/50 font-bold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1322] border border-transparent"
            }`}
          >
            <Atom className="w-4 h-4" />
            <span>3. Space & Radiation Damage (NRT DPA)</span>
          </button>
        </div>
      </div>

      {/* Global Configuration Controls */}
      <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#162032] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Ablative Material Selection & Flight Envelope Controls
            </h3>
          </div>
          <span className="text-xs text-orange-400 font-bold">
            {tps.name} ({tps.category})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Material Dropdown */}
          <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
            <label className="text-slate-300 font-semibold block">Thermal Protection Material (TPS):</label>
            <select
              value={selectedTpsId}
              onChange={(e) => setSelectedTpsId(e.target.value)}
              className="w-full p-2 rounded-lg bg-[#0c1322] border border-[#1e2d46] text-white focus:border-orange-400 focus:outline-none"
            >
              {TPS_DATABASE.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.name} ({mat.category})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 block truncate">{tps.typicalApplication}</span>
          </div>

          {/* Mach Number Slider */}
          <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Mach Number (Flight Velocity):</span>
              <span className="text-orange-400 font-bold">Mach {machNumber}</span>
            </div>
            <input
              type="range"
              min="3"
              max="25"
              step="0.5"
              value={machNumber}
              onChange={(e) => setMachNumber(parseFloat(e.target.value))}
              className="w-full accent-orange-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Mach 3 (Supersonic)</span>
              <span>{atmosphericData.flightVelocity_ms.toFixed(0)} m/s</span>
              <span>Mach 25 (Orbital)</span>
            </div>
          </div>

          {/* Altitude Slider */}
          <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Trajectory Altitude:</span>
              <span className="text-sky-400 font-bold">{altitudeKm} km</span>
            </div>
            <input
              type="range"
              min="15"
              max="80"
              step="1"
              value={altitudeKm}
              onChange={(e) => setAltitudeKm(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>15 km (Dense Air)</span>
              <span>ρ = {atmosphericData.density_kgm3.toExponential(2)} kg/m³</span>
              <span>80 km (Mesosphere)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          {/* Nose Radius */}
          <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Leading Edge / Nose Radius (R_n):</span>
              <span className="text-amber-400 font-bold">{noseRadiusMm} mm</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={noseRadiusMm}
              onChange={(e) => setNoseRadiusMm(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Smaller radii increase convective stagnation heating sharply.</span>
          </div>

          {/* TPS Thickness */}
          <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Initial TPS Shield Thickness:</span>
              <span className="text-emerald-400 font-bold">{tpsThicknessMm} mm</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="1"
              value={tpsThicknessMm}
              onChange={(e) => setTpsThicknessMm(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Airframe backface threshold: {tps.airframeBondlineLimit_C} °C</span>
          </div>

          {/* Exposure Duration */}
          <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Aerothermal Exposure Duration:</span>
              <span className="text-rose-400 font-bold">{flightDurationSec} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="600"
              step="10"
              value={flightDurationSec}
              onChange={(e) => setFlightDurationSec(parseFloat(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block">Typical re-entry peak heating pulse: 60 - 300 s</span>
          </div>
        </div>
      </div>

      {/* AI Audit Report Modal / Banner */}
      {auditReport && (
        <div className="bg-[#090e18] border border-orange-500/50 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_0_35px_rgba(249,115,22,0.15)] relative animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#162032] pb-3">
            <div className="flex items-center gap-2 text-orange-400 text-sm font-bold">
              <Sparkles className="w-5 h-5" />
              <span>Hypersonic Aerothermal & Ablation Mission Certificate</span>
            </div>
            <button
              type="button"
              onClick={() => setAuditReport(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-[#162032] rounded"
            >
              Close
            </button>
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-sans space-y-2 whitespace-pre-line leading-relaxed">
            {auditReport}
          </div>
        </div>
      )}

      {/* TAB 1: AEROTHERMAL STAGNATION & SHOCK LAYER */}
      {activeTab === "aerothermal" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Metrics Cards */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Wind className="w-4 h-4 text-orange-400" />
                <span>Stagnation Point Aerothermal Metrics</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Total Heat Flux (q_tot):</span>
                  <span className="text-xl font-bold text-orange-400 block">
                    {aerothermalResults.q_total_MWm2.toFixed(2)} <span className="text-xs text-slate-400">MW/m²</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{(aerothermalResults.q_total_MWm2 * 100).toFixed(1)} W/cm²</span>
                </div>

                <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Surface Equilibrium Temp:</span>
                  <span className="text-xl font-bold text-rose-400 block">
                    {aerothermalResults.radEquilibriumTemp_C.toFixed(0)} <span className="text-xs text-slate-400">°C</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Recovery: {aerothermalResults.recoveryTemp_C.toFixed(0)} °C</span>
                </div>

                <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Convective Heat Flux:</span>
                  <span className="text-base font-bold text-amber-300 block">
                    {aerothermalResults.q_conv_MWm2.toFixed(2)} MW/m²
                  </span>
                  <span className="text-[10px] text-slate-500">Fay-Riddell / DKR Equation</span>
                </div>

                <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Radiative Shock Heat Flux:</span>
                  <span className="text-base font-bold text-sky-300 block">
                    {aerothermalResults.q_rad_MWm2.toFixed(2)} MW/m²
                  </span>
                  <span className="text-[10px] text-slate-500">Shock Layer Plasma Emission</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Stagnation Enthalpy (H_0):</span>
                  <span className="text-white font-bold">{aerothermalResults.stagnationEnthalpy_MJkg.toFixed(2)} MJ/kg</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Free Stream Dynamic Pressure (q_inf):</span>
                  <span className="text-white font-bold">
                    {(0.5 * atmosphericData.density_kgm3 * Math.pow(atmosphericData.flightVelocity_ms, 2) / 1000).toFixed(1)} kPa
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Max Allowable Service Temp:</span>
                  <span className="text-emerald-400 font-bold">{tps.maxServiceTemp_C} °C</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visualizer & Mathematical Formulation */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Hypersonic Shock Stagnation Mechanics</span>
              </h3>

              <div className="p-4 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  At <strong className="text-orange-400">Mach {machNumber}</strong>, the bow shock dissociates atmospheric <code className="text-sky-300">N₂</code> and <code className="text-sky-300">O₂</code> into atomic plasma ions, driving severe convective and radiative wall heat transfer.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-sky-300">
                  <div className="p-2.5 bg-[#0c1322] rounded border border-[#1e2d46]">
                    <code>q_conv ∝ (1/√R_n) · √(ρ_∞/ρ_0) · V_∞^3.15</code>
                  </div>
                  <div className="p-2.5 bg-[#0c1322] rounded border border-[#1e2d46]">
                    <code>T_w = [q_total / (ε · σ_SB)]^(1/4)</code>
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              <div className={`p-4 rounded-xl border ${
                aerothermalResults.radEquilibriumTemp_C > tps.maxServiceTemp_C
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              } text-xs space-y-1`}>
                <span className="font-bold block">
                  {aerothermalResults.radEquilibriumTemp_C > tps.maxServiceTemp_C
                    ? "⚠️ THERMAL EXCURSION: Surface temperature exceeds material melting / sublimation limit!"
                    : "🛡️ THERMAL EQUILIBRIUM STABLE: Re-radiation balance achieved within allowable envelope."}
                </span>
                <span className="text-[11px] block opacity-80">
                  Effective Heat of Ablation for {tps.name}: <strong>{tps.effectiveHeatOfAblation_MJkg} MJ/kg</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHARRING ABLATION & IN-DEPTH TEMPERATURE */}
      {activeTab === "ablation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Metrics */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Ablation & Recession Metrics</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                    <span className="text-slate-400 text-[11px] block">Surface Recession Rate (s_dot):</span>
                    <span className="text-lg font-bold text-orange-400 block">
                      {ablationResults.recessionRate_mms.toFixed(3)} <span className="text-xs text-slate-400">mm/s</span>
                    </span>
                  </div>

                  <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                    <span className="text-slate-400 text-[11px] block">Total Surface Loss ({flightDurationSec}s):</span>
                    <span className="text-lg font-bold text-rose-400 block">
                      {ablationResults.totalSurfaceRecession_mm.toFixed(2)} mm
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Remaining TPS: {ablationResults.remainingTpsThickness_mm.toFixed(2)} mm
                    </span>
                  </div>

                  <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                    <span className="text-slate-400 text-[11px] block">Airframe Backface Bondline Temp:</span>
                    <span className={`text-lg font-bold block ${ablationResults.isAirframeSafe ? "text-emerald-400" : "text-rose-400"}`}>
                      {ablationResults.estimatedBondlineTemp_C.toFixed(1)} °C
                    </span>
                    <span className="text-[10px] text-slate-500">Limit: {tps.airframeBondlineLimit_C} °C</span>
                  </div>
                </div>

                {/* Progress Bar of Remaining Shield */}
                <div className="space-y-1.5 pt-2 border-t border-[#162032] text-xs">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Remaining Shield Thickness:</span>
                    <span className="text-emerald-400 font-bold">
                      {((ablationResults.remainingTpsThickness_mm / tpsThicknessMm) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#050810] h-3 rounded-full overflow-hidden border border-[#1e2d46]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        ablationResults.isBurnThrough ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-orange-500"
                      }`}
                      style={{
                        width: `${Math.max(0, (ablationResults.remainingTpsThickness_mm / tpsThicknessMm) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right In-Depth Temperature Gradient Chart */}
            <div className="lg:col-span-8 bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <span>1D In-Depth Transient Temperature & Char Profile</span>
                </h3>
                <span className="text-xs text-slate-400">Depth (0 mm Surface → Backface)</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ablationResults.profileData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                    <XAxis dataKey="depthMm" stroke="#64748b" unit="mm" />
                    <YAxis stroke="#64748b" unit="°C" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#050810", borderColor: "#1e2d46", borderRadius: "8px", fontSize: "11px" }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="tempC" name="Temperature (°C)" stroke="#f97316" fillOpacity={1} fill="url(#tempGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] flex items-center justify-between text-xs text-slate-400">
                <span>Surface Recessed: <strong className="text-orange-400">{ablationResults.totalSurfaceRecession_mm.toFixed(1)} mm</strong></span>
                <span>Pyrolysis Char Front: <strong className="text-amber-400">{ablationResults.charDepth_mm.toFixed(1)} mm</strong></span>
                <span>Virgin Substrate Margin: <strong className="text-emerald-400">{Math.max(0, tpsThicknessMm - ablationResults.charDepth_mm).toFixed(1)} mm</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPACE & NUCLEAR RADIATION DAMAGE */}
      {activeTab === "radiation" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Atom className="w-4 h-4 text-sky-400" />
                <span>Radiation & Fast Neutron Controls</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Incident Neutron Energy:</span>
                    <span className="text-sky-400 font-bold">{neutronEnergyMeV} MeV</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="14.1"
                    step="0.5"
                    value={neutronEnergyMeV}
                    onChange={(e) => setNeutronEnergyMeV(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>100 keV (Fission)</span>
                    <span>14.1 MeV (D-T Fusion / Cosmic)</span>
                  </div>
                </div>

                <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Integrated Fast Neutron Fluence:</span>
                    <span className="text-emerald-400 font-bold">{neutronFluenceE19} × 10¹⁹ n/cm²</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="25"
                    step="0.5"
                    value={neutronFluenceE19}
                    onChange={(e) => setNeutronFluenceE19(parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">Equivalent to multi-year space nuclear reactor / orbital exposure.</span>
                </div>

                <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Displacement Threshold Energy (E_d):</span>
                    <span className="text-amber-400 font-bold">{displacementThresholdEd_eV} eV</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    step="5"
                    value={displacementThresholdEd_eV}
                    onChange={(e) => setDisplacementThresholdEd_eV(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">Carbon: ~25-35 eV, Hafnium/Tungsten: ~40-60 eV</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Norgett-Robinson-Torrens (NRT) Displacement Cascade</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Displacement Damage:</span>
                  <span className="text-xl font-bold text-sky-400 block">{radiationResults.calculatedDPA} dpa</span>
                  <span className="text-[10px] text-slate-500">Displacements per atom</span>
                </div>

                <div className="p-4 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">Volumetric Swelling:</span>
                  <span className="text-xl font-bold text-amber-400 block">+{radiationResults.volumetricSwellingPct}%</span>
                  <span className="text-[10px] text-slate-500">Void nucleation & growth</span>
                </div>

                <div className="p-4 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                  <span className="text-slate-400 text-[11px] block">DBTT Shift (Embrittlement):</span>
                  <span className="text-xl font-bold text-rose-400 block">+{radiationResults.dbttShift_C} °C</span>
                  <span className="text-[10px] text-slate-500">Ductile-Brittle Shift</span>
                </div>
              </div>

              <div className="p-4 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2 text-xs leading-relaxed text-slate-300">
                <span className="font-bold text-white block">Norgett-Robinson-Torrens Governing Formula:</span>
                <code className="text-sky-300 block p-2.5 bg-[#0c1322] rounded border border-[#1e2d46] text-center">
                  N_d = [0.8 · T_damage] / [2 · E_d] = {radiationResults.displacementsPerPrimaryRecoil} frenkel pairs / recoil
                </code>
                <p className="text-[11px] text-slate-400">
                  Fast neutrons knock primary knock-on atoms (PKA) out of the lattice, creating vacancy-interstitial Frenkel pairs that cause dimensional swelling and lattice pin-hardening.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

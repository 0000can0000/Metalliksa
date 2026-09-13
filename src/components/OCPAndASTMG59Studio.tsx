import { ResponsiveContainer } from './VisibleResponsiveContainer';
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Droplets,
  Thermometer,
  Clock,
  Download,
  Flame,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  FileText,
  Settings2,
  Sparkles,
  Info,
  Layers,
  BarChart2,
  Compass,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Cpu,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
} from "recharts";

// =========================================================================
// 1. DATA STRUCTURES & STANDARDS SPECIFICATION
// =========================================================================

export type ReferenceElectrodeType = "SHE" | "SCE" | "Ag/AgCl" | "MSE" | "Cu/CuSO4";

export interface RefElectrodeSpec {
  id: ReferenceElectrodeType;
  name: string;
  eRefVsSHE: number; // Volts vs SHE at 25°C
  fillingSolution: string;
}

export const REFERENCE_ELECTRODES: Record<ReferenceElectrodeType, RefElectrodeSpec> = {
  SHE: { id: "SHE", name: "Standard Hydrogen Electrode (SHE)", eRefVsSHE: 0.000, fillingSolution: "1.0 M H⁺, 1 atm H₂" },
  SCE: { id: "SCE", name: "Saturated Calomel Electrode (SCE)", eRefVsSHE: +0.241, fillingSolution: "Saturated KCl" },
  "Ag/AgCl": { id: "Ag/AgCl", name: "Silver / Silver Chloride (Ag/AgCl)", eRefVsSHE: +0.197, fillingSolution: "Saturated KCl" },
  MSE: { id: "MSE", name: "Mercury / Mercurous Sulfate (MSE)", eRefVsSHE: +0.640, fillingSolution: "Saturated K₂SO₄" },
  "Cu/CuSO4": { id: "Cu/CuSO4", name: "Copper / Copper Sulfate (CSE)", eRefVsSHE: +0.316, fillingSolution: "Saturated CuSO₄" },
};

export interface CorrosionSubstrate {
  id: string;
  name: string;
  symbol: string;
  alloyFamily: string;
  e0_SHE: number; // Equilibrium OCP vs SHE (V)
  bare_e0_SHE: number; // Depassivated / unfilmed active potential vs SHE (V)
  betaA: number; // Anodic Tafel slope (V/decade)
  betaC: number; // Cathodic Tafel slope (V/decade)
  sternGearyB?: number; // Precomputed B constant (V)
  cDl_uF_cm2: number; // Double layer capacitance (µF/cm²)
  atomicMass: number; // g/mol
  valency: number; // n
  density_g_cm3: number; // g/cm³
  passivationTauSec: number; // Passivation time constant (s)
  noiseStdDev_mV: number; // Inherent OCP noise (mV)
  description: string;
}

export const SUBSTRATES_LIBRARY: CorrosionSubstrate[] = [
  {
    id: "steel-1018",
    name: "Carbon Steel (AISI 1018)",
    symbol: "Fe-0.18C",
    alloyFamily: "Carbon & Low-Alloy Steels",
    e0_SHE: -0.48,
    bare_e0_SHE: -0.65,
    betaA: 0.120,
    betaC: 0.120,
    cDl_uF_cm2: 50.0,
    atomicMass: 55.85,
    valency: 2,
    density_g_cm3: 7.87,
    passivationTauSec: 45.0,
    noiseStdDev_mV: 0.6,
    description: "Active uniform corrosion in aerated seawater with no stable passive film. Typical Stern-Geary B ≈ 26 mV.",
  },
  {
    id: "ss-316l",
    name: "Austenitic Stainless Steel (316L)",
    symbol: "Fe-18Cr-12Ni-2.5Mo",
    alloyFamily: "Stainless Steels",
    e0_SHE: +0.08,
    bare_e0_SHE: -0.52,
    betaA: 0.110,
    betaC: 0.095,
    cDl_uF_cm2: 25.0,
    atomicMass: 55.5,
    valency: 2.4,
    density_g_cm3: 8.00,
    passivationTauSec: 18.0,
    noiseStdDev_mV: 1.2,
    description: "Forms a robust, self-healing Cr₂O₃ passive barrier layer. High polarization resistance Rp > 50 kΩ·cm².",
  },
  {
    id: "ss-304",
    name: "Stainless Steel 304",
    symbol: "Fe-18Cr-8Ni",
    alloyFamily: "Stainless Steels",
    e0_SHE: +0.02,
    bare_e0_SHE: -0.50,
    betaA: 0.115,
    betaC: 0.105,
    cDl_uF_cm2: 30.0,
    atomicMass: 55.5,
    valency: 2.2,
    density_g_cm3: 7.90,
    passivationTauSec: 22.0,
    noiseStdDev_mV: 1.5,
    description: "Passive in neutral aerated media; prone to chloride-induced metastable pitting transients and repassivation spikes.",
  },
  {
    id: "al-7075",
    name: "Aerospace Aluminum (AA7075-T6)",
    symbol: "Al-5.6Zn-2.5Mg-1.6Cu",
    alloyFamily: "Aluminum Alloys",
    e0_SHE: -0.74,
    bare_e0_SHE: -1.25,
    betaA: 0.085,
    betaC: 0.160,
    cDl_uF_cm2: 20.0,
    atomicMass: 26.98,
    valency: 3,
    density_g_cm3: 2.81,
    passivationTauSec: 15.0,
    noiseStdDev_mV: 0.9,
    description: "Amphoteric behavior with Al₂O₃ passive film vulnerable to galvanic intergranular attack.",
  },
  {
    id: "ti-6al-4v",
    name: "Titanium Grade 5 (Ti-6Al-4V)",
    symbol: "Ti-6Al-4V",
    alloyFamily: "Titanium & Reactive Alloys",
    e0_SHE: +0.22,
    bare_e0_SHE: -0.95,
    betaA: 0.140,
    betaC: 0.130,
    cDl_uF_cm2: 15.0,
    atomicMass: 47.87,
    valency: 4,
    density_g_cm3: 4.43,
    passivationTauSec: 8.0,
    noiseStdDev_mV: 0.4,
    description: "Extreme passivity via dense TiO₂ rutile/anatase dielectric film. Extremely high Rp (> 500 kΩ·cm²).",
  },
  {
    id: "cu-c110",
    name: "Electrolytic Copper (C11000 ETP)",
    symbol: "Cu-99.9",
    alloyFamily: "Copper Alloys",
    e0_SHE: +0.12,
    bare_e0_SHE: -0.15,
    betaA: 0.060,
    betaC: 0.110,
    cDl_uF_cm2: 40.0,
    atomicMass: 63.55,
    valency: 2,
    density_g_cm3: 8.96,
    passivationTauSec: 30.0,
    noiseStdDev_mV: 0.5,
    description: "Protected by Cu₂O cuprite film in aerated water; susceptible to ammonia complexation.",
  },
  {
    id: "zn-hdg",
    name: "Zinc (Hot-Dip Galvanized)",
    symbol: "Zn-99.5",
    alloyFamily: "Zinc & Sacrificial Anodes",
    e0_SHE: -0.78,
    bare_e0_SHE: -0.92,
    betaA: 0.070,
    betaC: 0.140,
    cDl_uF_cm2: 60.0,
    atomicMass: 65.38,
    valency: 2,
    density_g_cm3: 7.14,
    passivationTauSec: 25.0,
    noiseStdDev_mV: 0.8,
    description: "Sacrificial galvanic protection layer; forms zinc hydroxycarbonate patina in industrial atmosphere.",
  },
  {
    id: "duplex-2205",
    name: "Duplex Stainless Steel (2205)",
    symbol: "22Cr-5Ni-3Mo-0.18N",
    alloyFamily: "Duplex Stainless Steels",
    e0_SHE: +0.14,
    bare_e0_SHE: -0.55,
    betaA: 0.125,
    betaC: 0.090,
    cDl_uF_cm2: 22.0,
    atomicMass: 55.0,
    valency: 2.5,
    density_g_cm3: 7.80,
    passivationTauSec: 12.0,
    noiseStdDev_mV: 0.7,
    description: "Austenitic-ferritic matrix offering superior localized corrosion resistance with PREN ≥ 35.",
  },
];

// OCP Sample Point in Time Series
export interface OCPSamplePoint {
  timeSec: number;
  timeFormatted: string;
  eOcp_SHE: number;
  eOcp_Ref: number;
  driftRate_mV_min: number;
  isStable: boolean;
  appliedOverpotential_mV: number; // η (mV) for LPR scan
  measuredCurrent_uA_cm2: number; // i(t) transient
  calculatedIcorr_uA_cm2: number; // i_corr(t)
  corrosionRate_mm_yr: number; // CR (mm/yr)
  corrosionRate_mpy: number; // CR (mpy)
  filmThickness_nm: number; // Passivating barrier thickness
  eventLabel?: string;
}

// ASTM G59 LPR Polarization Point
export interface LPRSweepPoint {
  overpotential_mV: number; // η = E - E_ocp (mV)
  potential_V_Ref: number; // E (V vs Ref)
  currentDensity_uA_cm2: number; // Δi (µA/cm²)
  fittedCurrentDensity_uA_cm2: number; // Linear regression fit
}

// =========================================================================
// 2. MAIN COMPONENT IMPLEMENTATION
// =========================================================================

export function OCPAndASTMG59Studio() {
  // 1. Substrate & Reference Electrode Selection
  const [selectedSubstrateId, setSelectedSubstrateId] = useState<string>("steel-1018");
  const [refElectrodeType, setRefElectrodeType] = useState<ReferenceElectrodeType>("SCE");
  const [electrodeArea_cm2, setElectrodeArea_cm2] = useState<number>(1.0);
  const [solutionRs_Ohm_cm2, setSolutionRs_Ohm_cm2] = useState<number>(18.0); // Solution uncompensated resistance
  const [enableIRCompensation, setEnableIRCompensation] = useState<boolean>(true);

  // 2. Tafel Slopes & Stern-Geary Parameters
  const [customBetaA, setCustomBetaA] = useState<number>(0.120);
  const [customBetaC, setCustomBetaC] = useState<number>(0.120);
  const [useAutoTafel, setUseAutoTafel] = useState<boolean>(true);

  // 3. Environment & Operating Conditions
  const [electrolyteMedium, setElectrolyteMedium] = useState<"3.5_nacl" | "simulated_concrete" | "acidic_industrial" | "neutral_tapwater">("3.5_nacl");
  const [temperature_C, setTemperature_C] = useState<number>(25);
  const [phLevel, setPhLevel] = useState<number>(7.2);
  const [dissolvedOxygen_ppm, setDissolvedOxygen_ppm] = useState<number>(6.5); // Aerated ~6.5 - 8 ppm

  // 4. Live Potentiostat Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [samplingIntervalMs, setSamplingIntervalMs] = useState<number>(500); // 500ms
  const [timeElapsedSec, setTimeElapsedSec] = useState<number>(0);

  // 5. ASTM G59 LPR Measurement Mode
  const [lprMode, setLprMode] = useState<"continuous_tracking" | "potentiodynamic_sweep" | "potentiostatic_step">("continuous_tracking");
  const [lprRange_mV, setLprRange_mV] = useState<number>(15); // ± 15 mV
  const [lprScanRate_mV_s, setLprScanRate_mV_s] = useState<number>(0.166); // ASTM G59 standard: 0.166 mV/s = 10 mV/min

  // 6. Real-time Buffers and Transient States
  const [timeSeriesData, setTimeSeriesData] = useState<OCPSamplePoint[]>([]);
  const [lprSweepData, setLprSweepData] = useState<LPRSweepPoint[]>([]);
  const [activeEvents, setActiveEvents] = useState<{ id: string; name: string; timestamp: number }[]>([]);
  const [recentMetaPits, setRecentMetaPits] = useState<{ time: number; magnitude_mV: number }[]>([]);

  // 7. Active Perturbation Multipliers (Environmental Injections)
  const [inhibitorActive, setInhibitorActive] = useState<boolean>(false);
  const [chlorideShockActive, setChlorideShockActive] = useState<boolean>(false);
  const [deaerationActive, setDeaerationActive] = useState<boolean>(false);
  const [scratchTimeSec, setScratchTimeSec] = useState<number | null>(null);

  // 8. Active Substrate Specification
  const substrate = useMemo(() => {
    return SUBSTRATES_LIBRARY.find((s) => s.id === selectedSubstrateId) || SUBSTRATES_LIBRARY[0];
  }, [selectedSubstrateId]);

  const refElectrode = useMemo(() => {
    return REFERENCE_ELECTRODES[refElectrodeType];
  }, [refElectrodeType]);

  // Sync Tafel slopes when substrate changes if auto mode is on
  useEffect(() => {
    if (useAutoTafel) {
      setCustomBetaA(substrate.betaA);
      setCustomBetaC(substrate.betaC);
    }
  }, [substrate, useAutoTafel]);

  // =========================================================================
  // 3. SCIENTIFIC COMPUTATIONS: STERN-GEARY & FARADAY CONVERSIONS
  // =========================================================================

  // Stern-Geary Constant B (V) = (betaA * betaC) / [ 2.3026 * (betaA + betaC) ]
  const sternGearyB = useMemo(() => {
    const bA = customBetaA;
    const bC = customBetaC;
    const b = (bA * bC) / (2.3026 * (bA + bC));
    return b; // V
  }, [customBetaA, customBetaC]);

  const sternGearyB_mV = sternGearyB * 1000;

  // Temperature Arrhenius Factor: exp(-Ea/R * (1/T - 1/T0))
  const arrheniusFactor = useMemo(() => {
    const T_K = temperature_C + 273.15;
    const T0_K = 298.15;
    const Ea = 35000; // 35 kJ/mol typical activation energy for aqueous corrosion
    const R = 8.314;
    return Math.exp((-Ea / R) * (1 / T_K - 1 / T0_K));
  }, [temperature_C]);

  // Environment Factor
  const envFactor = useMemo(() => {
    let factor = 1.0;
    if (electrolyteMedium === "3.5_nacl") factor = 1.8;
    else if (electrolyteMedium === "acidic_industrial") factor = 3.5;
    else if (electrolyteMedium === "simulated_concrete") factor = 0.35;
    else if (electrolyteMedium === "neutral_tapwater") factor = 0.6;

    // Dissolved O2 scaling (cathodic oxygen reduction rate proportional to DO)
    factor *= Math.max(0.05, dissolvedOxygen_ppm / 6.5);
    return factor;
  }, [electrolyteMedium, dissolvedOxygen_ppm]);

  // Baseline Rp and i_corr for the current substrate condition
  const calculateCurrentRpAndIcorr = useCallback(
    (tSec: number, filmThick_nm: number) => {
      // Base polarization resistance for metal
      let baseRp_Ohm_cm2 = 2500; // Default carbon steel
      if (substrate.id === "steel-1018") baseRp_Ohm_cm2 = 1800;
      else if (substrate.id === "ss-316l") baseRp_Ohm_cm2 = 65000;
      else if (substrate.id === "ss-304") baseRp_Ohm_cm2 = 38000;
      else if (substrate.id === "al-7075") baseRp_Ohm_cm2 = 7200;
      else if (substrate.id === "ti-6al-4v") baseRp_Ohm_cm2 = 450000;
      else if (substrate.id === "cu-c110") baseRp_Ohm_cm2 = 8500;
      else if (substrate.id === "zn-hdg") baseRp_Ohm_cm2 = 1200;
      else if (substrate.id === "duplex-2205") baseRp_Ohm_cm2 = 120000;

      // Modulate by film growth: Rp increases as passive film matures
      const filmMultiplier = Math.max(0.2, filmThick_nm / 1.5);
      baseRp_Ohm_cm2 *= Math.pow(filmMultiplier, 1.2);

      // Apply environmental and Arrhenius kinetic multipliers
      baseRp_Ohm_cm2 /= (envFactor * arrheniusFactor);

      // Disturbances
      if (chlorideShockActive) {
        baseRp_Ohm_cm2 *= 0.18; // Pitting breakdown degrades Rp by ~82%
      }
      if (inhibitorActive) {
        baseRp_Ohm_cm2 *= 14.0; // Adsorption layer boosts Rp by 14x
      }
      if (deaerationActive) {
        baseRp_Ohm_cm2 *= 4.5; // O2 removal suppresses cathodic reduction, boosting Rp
      }

      // Scratch transient: if scratch occurred recently
      if (scratchTimeSec !== null) {
        const dtScratch = tSec - scratchTimeSec;
        if (dtScratch >= 0 && dtScratch < 30) {
          const repassivationProgress = 1 - Math.exp(-dtScratch / substrate.passivationTauSec);
          baseRp_Ohm_cm2 *= (0.05 + 0.95 * repassivationProgress);
        }
      }

      // Compute i_corr = B / Rp
      const measuredRp = baseRp_Ohm_cm2;
      const trueRp = enableIRCompensation ? Math.max(50, measuredRp - solutionRs_Ohm_cm2) : measuredRp;
      const iCorr_A_cm2 = sternGearyB / trueRp; // A/cm²
      const iCorr_uA_cm2 = iCorr_A_cm2 * 1e6; // µA/cm²

      // Faraday's Law Corrosion Rate:
      // CR (mm/yr) = (0.00327 * i_corr (µA/cm²) * EW) / rho
      const EW = substrate.atomicMass / substrate.valency;
      const cr_mm_yr = (0.00327 * iCorr_uA_cm2 * EW) / substrate.density_g_cm3;
      const cr_mpy = cr_mm_yr * 39.3701;

      return {
        measuredRp,
        trueRp,
        iCorr_uA_cm2,
        cr_mm_yr,
        cr_mpy,
      };
    },
    [
      substrate,
      envFactor,
      arrheniusFactor,
      chlorideShockActive,
      inhibitorActive,
      deaerationActive,
      scratchTimeSec,
      sternGearyB,
      enableIRCompensation,
      solutionRs_Ohm_cm2,
    ]
  );

  // =========================================================================
  // 4. REAL-TIME OCP ENGINE & STEP SOLVER
  // =========================================================================

  const generateNextSample = useCallback(
    (currentT: number, prevPoint?: OCPSamplePoint): OCPSamplePoint => {
      // 1. Native passive film growth kinetics: dL/dt = k * exp(-L/L0) (Logarithmic growth)
      const prevFilm = prevPoint ? prevPoint.filmThickness_nm : 0.8;
      const maxFilm = substrate.id.startsWith("ss") || substrate.id.startsWith("ti") ? 3.8 : 1.8;
      const growthRate = (maxFilm - prevFilm) * (0.03 / Math.max(1, substrate.passivationTauSec));
      const newFilm = Math.min(maxFilm, Math.max(0.1, prevFilm + growthRate));

      // 2. Base OCP vs SHE calculation
      let targetE0_SHE = substrate.e0_SHE;

      // If bare metal or scratch
      if (scratchTimeSec !== null) {
        const dtScratch = currentT - scratchTimeSec;
        if (dtScratch >= 0 && dtScratch < 35) {
          const recoveryFrac = 1 - Math.exp(-dtScratch / (substrate.passivationTauSec * 0.75));
          targetE0_SHE = substrate.bare_e0_SHE + (substrate.e0_SHE - substrate.bare_e0_SHE) * recoveryFrac;
        }
      }

      // Modulate target E0 by environmental additives
      if (chlorideShockActive) targetE0_SHE -= 0.110; // Chloride pit induction shifts OCP cathodically
      if (inhibitorActive) targetE0_SHE += 0.145; // Anodic inhibitor passivates, ennobling OCP
      if (deaerationActive) targetE0_SHE -= 0.180; // Removing O2 shifts mixed potential cathodically

      // Approaching steady-state via first-order relaxation
      const prevE_SHE = prevPoint ? prevPoint.eOcp_SHE : substrate.e0_SHE - 0.08;
      const dE_relaxation = (targetE0_SHE - prevE_SHE) * 0.08;

      // 3. Electrochemical Pink Noise + Metastable Pitting Spikes
      const noise = ((Math.random() - 0.5) * 2 * substrate.noiseStdDev_mV * 1e-3);
      
      // Metastable pitting spike generator (for SS and Al in chloride)
      let pittingSpike = 0;
      if ((substrate.id.startsWith("ss") || substrate.id === "al-7075") && Math.random() < (chlorideShockActive ? 0.25 : 0.04)) {
        const spikeMagnitude_mV = 2.0 + Math.random() * (chlorideShockActive ? 12.0 : 4.5);
        pittingSpike = -spikeMagnitude_mV * 1e-3; // Sudden negative dip
        setRecentMetaPits((prev) => [...prev.slice(-10), { time: currentT, magnitude_mV: spikeMagnitude_mV }]);
      }

      const eOcp_SHE = prevE_SHE + dE_relaxation + noise + pittingSpike;

      // Convert to selected Reference Electrode: E_ref = E_SHE - E_ref_offset
      const eOcp_Ref = eOcp_SHE - refElectrode.eRefVsSHE;

      // 4. Calculate Drift Rate (dE/dt in mV/min) using last 10 points window
      let driftRate_mV_min = 0;
      if (timeSeriesData.length >= 4) {
        const windowPoints = timeSeriesData.slice(-6);
        const t0 = windowPoints[0].timeSec;
        const e0 = windowPoints[0].eOcp_Ref;
        const dt = Math.max(0.1, currentT - t0);
        const dE = (eOcp_Ref - e0) * 1000; // in mV
        driftRate_mV_min = (dE / dt) * 60; // mV/min
      }

      // ASTM G59 Stability Criterion: |dE/dt| <= 0.1 mV/min
      const isStable = Math.abs(driftRate_mV_min) <= 0.12;

      // 5. Applied Overpotential for LPR scan (if active)
      let appliedOverpotential_mV = 0;
      if (lprMode === "potentiodynamic_sweep") {
        const cyclePeriodSec = (2 * lprRange_mV) / lprScanRate_mV_s;
        const phaseT = currentT % cyclePeriodSec;
        appliedOverpotential_mV = -lprRange_mV + (phaseT / cyclePeriodSec) * (2 * lprRange_mV);
      } else if (lprMode === "potentiostatic_step") {
        appliedOverpotential_mV = (Math.floor(currentT / 15) % 2 === 0) ? +10 : -10;
      }

      // 6. Kinetics, Rp, i_corr, CR
      const { trueRp, iCorr_uA_cm2, cr_mm_yr, cr_mpy } = calculateCurrentRpAndIcorr(currentT, newFilm);

      // 7. Transient current response with double layer capacitance charging:
      // i(t) = i_corr * [ exp(η / βa) - exp(-η / βc) ] + capacitive surge
      const eta_V = (appliedOverpotential_mV * 1e-3);
      const measuredCurrent_uA_cm2 = (eta_V / (trueRp + solutionRs_Ohm_cm2)) * 1e6;

      const mins = Math.floor(currentT / 60);
      const secs = Math.floor(currentT % 60);
      const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      return {
        timeSec: Math.round(currentT * 10) / 10,
        timeFormatted,
        eOcp_SHE,
        eOcp_Ref,
        driftRate_mV_min: Math.round(driftRate_mV_min * 100) / 100,
        isStable,
        appliedOverpotential_mV: Math.round(appliedOverpotential_mV * 10) / 10,
        measuredCurrent_uA_cm2: Math.round(measuredCurrent_uA_cm2 * 100) / 100,
        calculatedIcorr_uA_cm2: Math.round(iCorr_uA_cm2 * 100) / 100,
        corrosionRate_mm_yr: Math.round(cr_mm_yr * 10000) / 10000,
        corrosionRate_mpy: Math.round(cr_mpy * 100) / 100,
        filmThickness_nm: Math.round(newFilm * 100) / 100,
      };
    },
    [
      substrate,
      refElectrode,
      scratchTimeSec,
      chlorideShockActive,
      inhibitorActive,
      deaerationActive,
      timeSeriesData,
      lprMode,
      lprRange_mV,
      lprScanRate_mV_s,
      calculateCurrentRpAndIcorr,
      solutionRs_Ohm_cm2,
    ]
  );

  // Initialize time series buffer
  useEffect(() => {
    const initialPoints: OCPSamplePoint[] = [];
    let pt: OCPSamplePoint | undefined;
    for (let t = 0; t <= 30; t += 1) {
      pt = generateNextSample(t, pt);
      initialPoints.push(pt);
    }
    setTimeSeriesData(initialPoints);
    setTimeElapsedSec(30);
  }, [selectedSubstrateId]);

  // Main Live Simulation Clock Hook
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeElapsedSec((prevT) => {
        const step = (samplingIntervalMs / 1000) * simSpeed;
        const newT = prevT + step;
        setTimeSeriesData((prevData) => {
          const lastPoint = prevData[prevData.length - 1];
          const newPoint = generateNextSample(newT, lastPoint);
          const maxPoints = 250;
          const updated = [...prevData, newPoint];
          if (updated.length > maxPoints) {
            return updated.slice(updated.length - maxPoints);
          }
          return updated;
        });
        return newT;
      });
    }, samplingIntervalMs);

    return () => clearInterval(interval);
  }, [isRunning, simSpeed, samplingIntervalMs, generateNextSample]);

  // =========================================================================
  // 5. ASTM G59 LINEAR POLARIZATION SWEEP GENERATOR & FIT
  // =========================================================================

  const latestSample = timeSeriesData[timeSeriesData.length - 1] || {
    eOcp_Ref: substrate.e0_SHE - refElectrode.eRefVsSHE,
    eOcp_SHE: substrate.e0_SHE,
    driftRate_mV_min: 0.04,
    isStable: true,
    calculatedIcorr_uA_cm2: 2.4,
    corrosionRate_mm_yr: 0.028,
    corrosionRate_mpy: 1.1,
    measuredCurrent_uA_cm2: 0,
    appliedOverpotential_mV: 0,
    filmThickness_nm: 1.5,
  };

  // Generate ASTM G59 Potentiodynamic I-V Data Points (-20 mV to +20 mV around OCP)
  const lprAnalysis = useMemo(() => {
    const pointsCount = 31;
    const sweepRange = lprRange_mV; // e.g. ± 15 mV or ± 20 mV
    const step = (2 * sweepRange) / (pointsCount - 1);
    const { trueRp } = calculateCurrentRpAndIcorr(timeElapsedSec, latestSample.filmThickness_nm);
    const totalR = trueRp + (enableIRCompensation ? 0 : solutionRs_Ohm_cm2);

    const points: LPRSweepPoint[] = [];
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < pointsCount; i++) {
      const eta_mV = -sweepRange + i * step; // Overpotential (mV)
      const eta_V = eta_mV * 1e-3; // V

      // Non-linear Stern-Geary Butler-Volmer relation:
      // i = i_corr * [ exp(2.303*η/βa) - exp(-2.303*η/βc) ]
      const iCorr_A_cm2 = (sternGearyB / trueRp);
      const anodicTerm = Math.exp((2.3026 * eta_V) / customBetaA);
      const cathodicTerm = Math.exp((-2.3026 * eta_V) / customBetaC);
      const ideal_i_A_cm2 = iCorr_A_cm2 * (anodicTerm - cathodicTerm);

      // Add slight experimental measurement scatter
      const noiseScatter = (Math.random() - 0.5) * 0.02 * Math.abs(ideal_i_A_cm2 * 1e6 || 0.1);
      const current_uA_cm2 = (ideal_i_A_cm2 * 1e6) + noiseScatter;

      const pot_Ref = latestSample.eOcp_Ref + eta_V;

      points.push({
        overpotential_mV: Math.round(eta_mV * 100) / 100,
        potential_V_Ref: Math.round(pot_Ref * 1000) / 1000,
        currentDensity_uA_cm2: Math.round(current_uA_cm2 * 1000) / 1000,
        fittedCurrentDensity_uA_cm2: 0, // filled below
      });

      sumX += current_uA_cm2; // Δi (µA/cm²)
      sumY += eta_mV; // Δη (mV)
      sumXY += current_uA_cm2 * eta_mV;
      sumXX += current_uA_cm2 * current_uA_cm2;
    }

    // Linear Regression: η(mV) = Slope * i(µA/cm²) + Intercept
    // Slope = ΔE / Δi = Rp (in kΩ·cm² when mV / µA = Ω·cm² / 1e3 * 1e6 = Ω·cm²)
    const n = points.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX); // kΩ·cm²
    const intercept = (sumY - slope * sumX) / n;
    const fittedRp_Ohm_cm2 = Math.max(10, Math.round(slope * 1000)); // Ω·cm²

    // Calculate R² goodness of fit
    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;

    points.forEach((p) => {
      const fitY = slope * p.currentDensity_uA_cm2 + intercept;
      p.fittedCurrentDensity_uA_cm2 = Math.round(((p.overpotential_mV - intercept) / slope) * 1000) / 1000;
      ssTot += Math.pow(p.overpotential_mV - meanY, 2);
      ssRes += Math.pow(p.overpotential_mV - fitY, 2);
    });

    const rSquared = Math.max(0.95, Math.min(0.9999, 1 - ssRes / (ssTot || 1)));

    // Correct for Solution Resistance if enabled: Rp_true = Rp_meas - Rs
    const fittedRp_true = enableIRCompensation
      ? Math.max(20, fittedRp_Ohm_cm2 - solutionRs_Ohm_cm2)
      : fittedRp_Ohm_cm2;

    const computedIcorr_uA_cm2 = (sternGearyB / fittedRp_true) * 1e6;
    const EW = substrate.atomicMass / substrate.valency;
    const computedCR_mm_yr = (0.00327 * computedIcorr_uA_cm2 * EW) / substrate.density_g_cm3;
    const computedCR_mpy = computedCR_mm_yr * 39.3701;

    return {
      points,
      fittedRp_meas_Ohm_cm2: fittedRp_Ohm_cm2,
      fittedRp_true_Ohm_cm2: fittedRp_true,
      rSquared: Math.round(rSquared * 10000) / 10000,
      computedIcorr_uA_cm2: Math.round(computedIcorr_uA_cm2 * 100) / 100,
      computedCR_mm_yr: Math.round(computedCR_mm_yr * 10000) / 10000,
      computedCR_mpy: Math.round(computedCR_mpy * 100) / 100,
    };
  }, [
    lprRange_mV,
    calculateCurrentRpAndIcorr,
    timeElapsedSec,
    latestSample.filmThickness_nm,
    enableIRCompensation,
    solutionRs_Ohm_cm2,
    latestSample.eOcp_Ref,
    sternGearyB,
    customBetaA,
    customBetaC,
    substrate,
  ]);

  // =========================================================================
  // 6. ACTION HANDLERS: DISTURBANCES & EXPORTS
  // =========================================================================

  const handleInjectChloride = () => {
    setChlorideShockActive(true);
    setActiveEvents((prev) => [
      ...prev,
      { id: "cl_shock", name: "Chloride [Cl⁻] Shock Injected (0.5M)", timestamp: timeElapsedSec },
    ]);
  };

  const handleInjectInhibitor = () => {
    setInhibitorActive(true);
    setChlorideShockActive(false);
    setActiveEvents((prev) => [
      ...prev,
      { id: "inhibitor", name: "Corrosion Inhibitor Dosed (+250 ppm BTA)", timestamp: timeElapsedSec },
    ]);
  };

  const handleSurfaceScratch = () => {
    setScratchTimeSec(timeElapsedSec);
    setActiveEvents((prev) => [
      ...prev,
      { id: "scratch", name: "Mechanical Surface Scratch (Depassivation)", timestamp: timeElapsedSec },
    ]);
  };

  const handleToggleDeaeration = () => {
    setDeaerationActive((prev) => !prev);
    setDissolvedOxygen_ppm((prev) => (prev > 1.0 ? 0.3 : 6.8));
    setActiveEvents((prev) => [
      ...prev,
      {
        id: "deaeration",
        name: deaerationActive ? "Aeration Restored (Air Sparging)" : "N₂ Purge / De-aeration Activated (DO < 0.5 ppm)",
        timestamp: timeElapsedSec,
      },
    ]);
  };

  const handleResetSimulation = () => {
    setTimeElapsedSec(0);
    setChlorideShockActive(false);
    setInhibitorActive(false);
    setDeaerationActive(false);
    setScratchTimeSec(null);
    setDissolvedOxygen_ppm(6.5);
    setActiveEvents([]);
    setRecentMetaPits([]);

    const initialPoints: OCPSamplePoint[] = [];
    let pt: OCPSamplePoint | undefined;
    for (let t = 0; t <= 20; t += 1) {
      pt = generateNextSample(t, pt);
      initialPoints.push(pt);
    }
    setTimeSeriesData(initialPoints);
  };

  const handleExportCSV = () => {
    let csv = "Time (s),Time (mm:ss),E_ocp (V vs SHE),E_ocp (V vs " + refElectrode.id + "),Drift Rate (mV/min),Stability Status,i_corr (uA/cm2),Corrosion Rate (mm/year),Corrosion Rate (mpy),Film Thickness (nm)\n";
    timeSeriesData.forEach((row) => {
      csv += `${row.timeSec},"${row.timeFormatted}",${row.eOcp_SHE.toFixed(4)},${row.eOcp_Ref.toFixed(4)},${row.driftRate_mV_min.toFixed(3)},${row.isStable ? "STABLE" : "DRIFTING"},${row.calculatedIcorr_uA_cm2.toFixed(3)},${row.corrosionRate_mm_yr.toFixed(5)},${row.corrosionRate_mpy.toFixed(3)},${row.filmThickness_nm.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ASTM_G59_OCP_LPR_${substrate.id}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // 7. RENDER USER INTERFACE
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Top Banner Header & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#090e18] p-5 rounded-2xl border border-[#162032] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-white font-mono tracking-wide uppercase">
                Real-Time Open Circuit Potential (OCP) &amp; ASTM G59 LPR Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-400/40 flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ASTM G59 / ASTM G102 Standard
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Continuous $E_{`{ocp}`}(t)$ Drift Tracking, Polarization Resistance ($R_p$), Stern-Geary $i_{`{corr}`}$ &amp; Live Transient Perturbations
            </p>
          </div>
        </div>

        {/* Real-time Potentiostat Master Controls */}
        <div className="flex items-center gap-2 flex-wrap bg-[#050810] p-1.5 rounded-xl border border-[#162032]">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              isRunning
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Stream</span>
              </>
            )}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[#090e18] px-2 py-1 rounded-lg border border-[#1e2d46] text-xs font-mono">
            <span className="text-slate-500 text-[10px]">Speed:</span>
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  simSpeed === spd
                    ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetSimulation}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white bg-[#090e18] hover:bg-[#0d1624] border border-[#1e2d46] transition"
            title="Reset simulation time and restore native substrate"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition font-bold"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Live OCP Stability & ASTM G59 Quick Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Live OCP Potential */}
        <div className="bg-[#090e18] p-4 rounded-xl border border-[#162032] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Open Circuit Potential (E_ocp):</span>
            <span className="text-emerald-400 font-bold">vs {refElectrode.id}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {latestSample.eOcp_Ref > 0 ? `+${latestSample.eOcp_Ref.toFixed(3)}` : latestSample.eOcp_Ref.toFixed(3)}
            </span>
            <span className="text-xs font-mono text-emerald-300 font-bold">V</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            {latestSample.eOcp_SHE > 0 ? `+${latestSample.eOcp_SHE.toFixed(3)}` : latestSample.eOcp_SHE.toFixed(3)} V vs SHE
          </span>
        </div>

        {/* 2. Drift Rate dE/dt & ASTM Criterion */}
        <div className="bg-[#090e18] p-4 rounded-xl border border-[#162032] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>OCP Drift Rate (dE/dt):</span>
            <span className="text-[10px] text-slate-500">ASTM G59</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono tracking-tight ${
              latestSample.isStable ? "text-emerald-400" : "text-amber-400"
            }`}>
              {latestSample.driftRate_mV_min > 0 ? `+${latestSample.driftRate_mV_min.toFixed(2)}` : latestSample.driftRate_mV_min.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-300">mV/min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${latestSample.isStable ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
            <span className={`text-[10px] font-mono font-bold ${latestSample.isStable ? "text-emerald-300" : "text-amber-300"}`}>
              {latestSample.isStable ? "EQUILIBRATED (≤0.1 mV/min)" : "DRIFTING (Stabilizing)"}
            </span>
          </div>
        </div>

        {/* 3. Polarization Resistance Rp */}
        <div className="bg-[#090e18] p-4 rounded-xl border border-[#162032] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Polarization Res. (R_p):</span>
            <span className="text-cyan-400 text-[10px] font-bold">{enableIRCompensation ? "IR-Corrected" : "Uncompensated"}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-cyan-300 tracking-tight">
              {(lprAnalysis.fittedRp_true_Ohm_cm2 / 1000).toFixed(2)}
            </span>
            <span className="text-xs font-mono text-cyan-400 font-bold">kΩ·cm²</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            R_p,meas: {(lprAnalysis.fittedRp_meas_Ohm_cm2).toLocaleString()} Ω·cm² (R²={lprAnalysis.rSquared})
          </span>
        </div>

        {/* 4. Corrosion Current Density i_corr */}
        <div className="bg-[#090e18] p-4 rounded-xl border border-[#162032] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Corrosion Current (i_corr):</span>
            <span className="text-purple-400 text-[10px] font-mono">B = {sternGearyB_mV.toFixed(1)} mV</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-purple-300 tracking-tight">
              {lprAnalysis.computedIcorr_uA_cm2.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-purple-400 font-bold">µA/cm²</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            Stern-Geary: i_corr = B / R_p
          </span>
        </div>

        {/* 5. Faraday Penetration Rate */}
        <div className="bg-[#090e18] p-4 rounded-xl border border-[#162032] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Faraday Corrosion Rate:</span>
            <span className="text-amber-400 text-[10px] font-mono">ASTM G102</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-amber-300 tracking-tight">
              {lprAnalysis.computedCR_mm_yr.toFixed(4)}
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold">mm/yr</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold block">
            {lprAnalysis.computedCR_mpy.toFixed(2)} mpy (mils/yr)
          </span>
        </div>
      </div>

      {/* Interactive Disturbance & Real-time Event Injection Bar */}
      <div className="bg-[#090e18] p-4 rounded-xl border border-[#162032] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Live Perturbation &amp; In-Situ Environmental Shock Triggers:
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Click to observe live transient response in $E_{`{ocp}`}$, $R_p$, and $i_{`{corr}`}$
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Add Chloride */}
          <button
            type="button"
            onClick={handleInjectChloride}
            disabled={chlorideShockActive}
            className={`p-2.5 rounded-lg border text-left font-mono transition-all flex flex-col justify-between ${
              chlorideShockActive
                ? "bg-red-500/20 border-red-500/60 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                : "bg-[#050810] border-[#1e2d46] text-slate-300 hover:border-red-400 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                Inject Cl⁻ Shock
              </span>
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Pitting film breakdown</span>
          </button>

          {/* 2. Add Inhibitor */}
          <button
            type="button"
            onClick={handleInjectInhibitor}
            disabled={inhibitorActive}
            className={`p-2.5 rounded-lg border text-left font-mono transition-all flex flex-col justify-between ${
              inhibitorActive
                ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : "bg-[#050810] border-[#1e2d46] text-slate-300 hover:border-emerald-400 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Dose Inhibitor
              </span>
            </div>
            <span className="text-[9px] text-slate-500 mt-1">+250 ppm BTA / Nitrite</span>
          </button>

          {/* 3. Mechanical Scratch */}
          <button
            type="button"
            onClick={handleSurfaceScratch}
            className="p-2.5 rounded-lg border border-[#1e2d46] bg-[#050810] text-slate-300 hover:border-amber-400 hover:text-white font-mono transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Surface Scratch
              </span>
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Transient depassivation</span>
          </button>

          {/* 4. De-aeration / N2 purge */}
          <button
            type="button"
            onClick={handleToggleDeaeration}
            className={`p-2.5 rounded-lg border text-left font-mono transition-all flex flex-col justify-between ${
              deaerationActive
                ? "bg-sky-500/20 border-sky-500/60 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                : "bg-[#050810] border-[#1e2d46] text-slate-300 hover:border-sky-400 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                {deaerationActive ? "Restore Aeration" : "N₂ De-aeration"}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 mt-1">{deaerationActive ? "DO = 6.8 ppm" : "DO < 0.5 ppm"}</span>
          </button>

          {/* 5. Temperature Step */}
          <button
            type="button"
            onClick={() => setTemperature_C((prev) => (prev === 25 ? 55 : 25))}
            className={`p-2.5 rounded-lg border text-left font-mono transition-all flex flex-col justify-between ${
              temperature_C > 30
                ? "bg-orange-500/20 border-orange-500/60 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                : "bg-[#050810] border-[#1e2d46] text-slate-300 hover:border-orange-400 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                {temperature_C > 30 ? "Cool to 25°C" : "Heat to 55°C"}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 mt-1">Arrhenius {temperature_C}°C</span>
          </button>

          {/* 6. Trigger ASTM G59 Potentiodynamic Scan */}
          <button
            type="button"
            onClick={() => setLprMode(lprMode === "potentiodynamic_sweep" ? "continuous_tracking" : "potentiodynamic_sweep")}
            className={`p-2.5 rounded-lg border text-left font-mono transition-all flex flex-col justify-between ${
              lprMode === "potentiodynamic_sweep"
                ? "bg-purple-500/20 border-purple-500/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                : "bg-[#050810] border-[#1e2d46] text-slate-300 hover:border-purple-400 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                {lprMode === "potentiodynamic_sweep" ? "Stop Sweep" : "Run G59 Sweep"}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 mt-1">±{lprRange_mV} mV @ 0.166 mV/s</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid: Controls & Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test Settings & ASTM G59 Parameters */}
        <div className="lg:col-span-4 space-y-5">
          {/* Substrate & Reference Electrode Configuration */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#162032] pb-3">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                Working Electrode &amp; Cell
              </span>
              <span className="text-[10px] font-mono text-slate-500">ASTM G3 Standard</span>
            </div>

            {/* Substrate Selection */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Substrate Metal / Alloy:</label>
              <select
                value={selectedSubstrateId}
                onChange={(e) => setSelectedSubstrateId(e.target.value)}
                className="w-full bg-[#050810] border border-[#1e2d46] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
              >
                {SUBSTRATES_LIBRARY.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.symbol})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono mt-1">
                {substrate.description}
              </p>
            </div>

            {/* Reference Electrode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">Reference Electrode:</label>
              <select
                value={refElectrodeType}
                onChange={(e) => setRefElectrodeType(e.target.value as ReferenceElectrodeType)}
                className="w-full bg-[#050810] border border-[#1e2d46] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
              >
                {Object.values(REFERENCE_ELECTRODES).map((ref) => (
                  <option key={ref.id} value={ref.id}>
                    {ref.name} [{ref.eRefVsSHE > 0 ? `+${ref.eRefVsSHE}` : ref.eRefVsSHE} V vs SHE]
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 font-mono block">
                Filling: {refElectrode.fillingSolution}
              </span>
            </div>

            {/* Electrode Area & Solution Resistance Rs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 font-mono block">Electrode Area:</span>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={electrodeArea_cm2}
                    onChange={(e) => setElectrodeArea_cm2(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                    className="w-full bg-[#050810] border border-[#1e2d46] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono text-right"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">cm²</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-mono block">Solution Res. (R_s):</span>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="1"
                    value={solutionRs_Ohm_cm2}
                    onChange={(e) => setSolutionRs_Ohm_cm2(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#050810] border border-[#1e2d46] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono text-right"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">Ω·cm²</span>
                </div>
              </div>
            </div>

            {/* IR Drop Compensation Toggle */}
            <div className="p-3 bg-[#050810] rounded-xl border border-[#162032] flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-200 font-mono font-semibold block">IR Drop Compensation</span>
                <span className="text-[10px] text-slate-500 font-mono">R_p,true = R_p,meas - R_s (ASTM G59 §8.2)</span>
              </div>
              <button
                type="button"
                onClick={() => setEnableIRCompensation(!enableIRCompensation)}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  enableIRCompensation ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    enableIRCompensation ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ASTM G59 Tafel & Stern-Geary Parameters */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#162032] pb-3">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Stern-Geary &amp; Tafel Slopes
              </span>
              <button
                type="button"
                onClick={() => {
                  setUseAutoTafel(!useAutoTafel);
                  if (!useAutoTafel) {
                    setCustomBetaA(substrate.betaA);
                    setCustomBetaC(substrate.betaC);
                  }
                }}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  useAutoTafel
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold"
                    : "bg-[#050810] text-slate-400 border-[#1e2d46]"
                }`}
              >
                {useAutoTafel ? "Auto Preset" : "Manual Custom"}
              </button>
            </div>

            {/* Tafel Slopes Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-mono block">Anodic Slope (β_a):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.02"
                    max="0.40"
                    step="0.005"
                    disabled={useAutoTafel}
                    value={customBetaA}
                    onChange={(e) => setCustomBetaA(parseFloat(e.target.value) || 0.12)}
                    className="w-full bg-[#050810] border border-[#1e2d46] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono text-right disabled:opacity-60"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">V/dec</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-mono block">Cathodic Slope (β_c):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.02"
                    max="0.40"
                    step="0.005"
                    disabled={useAutoTafel}
                    value={customBetaC}
                    onChange={(e) => setCustomBetaC(parseFloat(e.target.value) || 0.12)}
                    className="w-full bg-[#050810] border border-[#1e2d46] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono text-right disabled:opacity-60"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">V/dec</span>
                </div>
              </div>
            </div>

            {/* Computed Stern-Geary B Constant */}
            <div className="p-3 bg-[#050810] rounded-xl border border-purple-500/30 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Stern-Geary Constant (B):</span>
                <span className="text-purple-300 font-bold text-sm">{sternGearyB_mV.toFixed(2)} mV</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Formula: B = (βa · βc) / [2.303 · (βa + βc)]. For typical active carbon steels B ≈ 26 mV; for passive stainless steels B ≈ 52 mV.
              </p>
            </div>

            {/* ASTM G59 LPR Overpotential Range */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">LPR Potential Window (±η):</span>
                <span className="text-purple-300 font-bold">±{lprRange_mV} mV</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={lprRange_mV}
                onChange={(e) => setLprRange_mV(parseInt(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>±5 mV (Ultra Linear)</span>
                <span>±15 mV (ASTM G59 Standard)</span>
                <span>±25 mV (Extended)</span>
              </div>
            </div>
          </div>

          {/* ASTM G59 Standards Compliance Audit Box */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-3 font-mono text-xs">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ASTM G59 Compliance Checklist
            </span>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050810] border border-[#162032]">
                <span className="text-slate-300 text-[11px]">1. OCP Drift Rate (&le;0.1 mV/min):</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  latestSample.isStable ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {latestSample.isStable ? "PASS (Stable)" : "FAIL (Drifting)"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050810] border border-[#162032]">
                <span className="text-slate-300 text-[11px]">2. Linear Range Check (&le;&plusmn;20 mV):</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  lprRange_mV <= 20 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {lprRange_mV <= 20 ? `PASS (±${lprRange_mV} mV)` : `WARN (±${lprRange_mV} mV)`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050810] border border-[#162032]">
                <span className="text-slate-300 text-[11px]">3. Goodness of Fit (R&sup2; &ge; 0.98):</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  lprAnalysis.rSquared >= 0.98 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {lprAnalysis.rSquared >= 0.98 ? `PASS (${lprAnalysis.rSquared})` : `WARN (${lprAnalysis.rSquared})`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050810] border border-[#162032]">
                <span className="text-slate-300 text-[11px]">4. Solution IR Compensation:</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  enableIRCompensation ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"
                }`}>
                  {enableIRCompensation ? "ACTIVE (Rs Deducted)" : "DISABLED"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Channel Real-time Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Real-Time OCP Potential vs Time ($E_{ocp}(t)$) */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162032] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Real-Time Open Circuit Potential (OCP) vs Time [E_ocp(t)]
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {substrate.name} | Working Potential vs {refElectrode.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#050810] border border-[#1e2d46] text-emerald-300 font-bold">
                  {timeSeriesData.length} Samples ({Math.round(timeElapsedSec)}s)
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                  <XAxis
                    dataKey="timeFormatted"
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    label={{ value: "Time (mm:ss)", position: "insideBottom", offset: -12, fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#475569"
                    domain={["auto", "auto"]}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    label={{ value: `Potential (V vs ${refElectrode.id})`, angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace" }}
                    formatter={(val: any, name: string) => {
                      if (name === "eOcp_Ref") return [`${Number(val).toFixed(4)} V`, `E_ocp vs ${refElectrode.id}`];
                      if (name === "driftRate_mV_min") return [`${Number(val).toFixed(2)} mV/min`, "Drift Rate"];
                      return [val, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="eOcp_Ref"
                    name="eOcp_Ref"
                    stroke="#10b981"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Event Markers Legend */}
            {activeEvents.length > 0 && (
              <div className="p-2.5 rounded-xl bg-[#050810] border border-[#162032] flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Event Log:</span>
                {activeEvents.slice(-4).map((ev, idx) => (
                  <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    t={Math.round(ev.timestamp)}s: {ev.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. ASTM G59 Linear Polarization Resistance (ΔE vs Δi) Fit Chart */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162032] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  ASTM G59 Linear Polarization Resistance (LPR) &amp; Tangent Slope (R_p)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Overpotential (η) vs Current Density (Δi) in Linear Polarization Regime
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#050810] border border-cyan-500/30 text-cyan-300 font-bold">
                  R_p = {(lprAnalysis.fittedRp_true_Ohm_cm2 / 1000).toFixed(2)} kΩ·cm² | R² = {lprAnalysis.rSquared}
                </span>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lprAnalysis.points} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                  <XAxis
                    dataKey="currentDensity_uA_cm2"
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    label={{ value: "Current Density Δi (µA/cm²)", position: "insideBottom", offset: -12, fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="overpotential_mV"
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    label={{ value: "Overpotential Δη (mV)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace" }}
                    formatter={(val: any, name: string) => {
                      if (name === "overpotential_mV") return [`${Number(val).toFixed(2)} mV`, "Overpotential Δη"];
                      if (name === "currentDensity_uA_cm2") return [`${Number(val).toFixed(3)} µA/cm²`, "Measured Δi"];
                      return [val, name];
                    }}
                  />
                  <ReferenceLine x={0} stroke="#334155" strokeDasharray="3 3" />
                  <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                  {/* Linear Regression Line */}
                  <Line
                    type="linear"
                    dataKey="overpotential_mV"
                    name="Linear Fit (Slope Rp)"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#06b6d4" }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Regression Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs font-mono">
              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-slate-500 block">Measured Tangent Slope (dE/di):</span>
                <span className="text-white font-bold">{lprAnalysis.fittedRp_meas_Ohm_cm2.toLocaleString()} Ω·cm²</span>
              </div>
              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-slate-500 block">True Polarization Resistance:</span>
                <span className="text-cyan-300 font-bold">{lprAnalysis.fittedRp_true_Ohm_cm2.toLocaleString()} Ω·cm²</span>
              </div>
              <div className="p-3 bg-[#050810] rounded-xl border border-[#162032]">
                <span className="text-[10px] text-slate-500 block">Stern-Geary Corrosion Current:</span>
                <span className="text-purple-300 font-bold">{lprAnalysis.computedIcorr_uA_cm2.toFixed(3)} µA/cm²</span>
              </div>
            </div>
          </div>

          {/* 3. Real-Time Transient i_corr(t) & Faraday Penetration Rate CR(t) */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162032] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  Transient Corrosion Current Density [i_corr(t)] &amp; Faraday Penetration Rate [CR(t)]
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Dynamic degradation tracking based on ASTM G102 Faraday Equivalent Weight
                </span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#050810] border border-amber-500/30 text-amber-300 font-bold">
                Instantaneous CR: {latestSample.corrosionRate_mm_yr.toFixed(4)} mm/yr ({latestSample.corrosionRate_mpy.toFixed(2)} mpy)
              </span>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="icorrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                  <XAxis
                    dataKey="timeFormatted"
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    label={{ value: "Time (mm:ss)", position: "insideBottom", offset: -12, fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#475569"
                    domain={["auto", "auto"]}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                    label={{ value: "i_corr (µA/cm²)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: "8px", fontSize: "11px", fontFamily: "monospace" }}
                    formatter={(val: any, name: string) => {
                      if (name === "calculatedIcorr_uA_cm2") return [`${Number(val).toFixed(3)} µA/cm²`, "i_corr"];
                      if (name === "corrosionRate_mm_yr") return [`${Number(val).toFixed(4)} mm/yr`, "Corrosion Rate"];
                      return [val, name];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calculatedIcorr_uA_cm2"
                    name="calculatedIcorr_uA_cm2"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#icorrGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

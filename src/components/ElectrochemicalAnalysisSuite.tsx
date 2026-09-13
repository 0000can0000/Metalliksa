import { ResponsiveContainer } from './VisibleResponsiveContainer';
import React, { useState, useMemo } from "react";
import {
  Zap,
  Battery,
  BatteryCharging,
  ShieldAlert,
  Droplets,
  Activity,
  Layers,
  Thermometer,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  TrendingDown,
  RefreshCw,
  Compass,
  ArrowRight,
  Gauge,
  Cpu,
  Atom,
  Clock,
  Sparkles,
  Download,
  Info,
  ShieldCheck,
  FileText,
  Boxes,
  BookOpen,
  RadioTower,
  Upload,
  FileCode,
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
import { BatteryEngineeringLab } from "./BatteryEngineeringLab";
import { CorrosionEngineeringLab } from "./CorrosionEngineeringLab";
import { TafelPolarizationLab } from "./TafelPolarizationLab";
import { PythonAnnualCorrosionRateModule } from "./PythonAnnualCorrosionRateModule";
import { MultiMaterialInterfaceLab } from "./MultiMaterialInterfaceLab";
import { EquivalentCircuitBuilder, STANDARD_CIRCUIT_PRESETS } from "./EquivalentCircuitBuilder";
import { PresetCircuitLibraryPanel } from "./PresetCircuitLibraryPanel";
import { CNLSFittingStudio } from "./CNLSFittingStudio";
import { OCPAndASTMG59Studio } from "./OCPAndASTMG59Studio";
import { DynamicPourbaixStudio } from "./DynamicPourbaixStudio";
import { PhysicalValidationStudio } from "./PhysicalValidationStudio";
import { TransmissionLineStudio } from "./TransmissionLineStudio";
import { SyntheticNoiseStressStudio } from "./SyntheticNoiseStressStudio";
import { EISUploadInsightsStudio } from "./EISUploadInsightsStudio";
import { PythonBatteryCorrosionUploadStudio } from "./PythonBatteryCorrosionUploadStudio";
import { BatchEISDegradationTracker } from "./BatchEISDegradationTracker";
import { EISLabDataUploader } from "./EISLabDataUploader";
import { ExperimentalEISDataset } from "../types/eisData";

// ==========================================
// 1. DATA STRUCTURES & PRESETS
// ==========================================

export type ElectrochemicalDomain =
  | "battery"
  | "corrosion"
  | "circuit-builder"
  | "preset-library"
  | "cnls-fitter"
  | "eis-upload-insights"
  | "batch-degradation"
  | "physical-validation"
  | "ocp-g59"
  | "pourbaix-studio"
  | "multi-material"
  | "transmission-line"
  | "synthetic-noise"
  | "dual-overview"
  | "python-data-upload";

export type BatteryTechMode =
  | "eis-impedance"
  | "circuit-builder"
  | "dq-dv-spectrogram"
  | "cv-kinetics"
  | "li-plating-safety"
  | "full-chemistry-lab"
  | "python-upload";

export type CorrosionTechMode =
  | "tafel-polarization"
  | "annual-corrosion-rate"
  | "pourbaix-e-ph"
  | "circuit-builder"
  | "galvanic-mixed"
  | "coating-eis"
  | "ocp-astm-g59"
  | "full-corrosion-lab"
  | "python-upload";

// Battery Chemistries
export interface BatteryChemPreset {
  id: string;
  name: string;
  formula: string;
  nominalVoltage: number;
  theoreticalCap_mAh_g: number;
  practicalCap_mAh_g: number;
  dLi_cm2_s: number; // Solid-state diffusion coefficient
  r0_ohm: number; // Ohmic bulk resistance
  rSei_ohm: number; // SEI resistance
  rCt_ohm: number; // Charge transfer resistance
  cSei_uF: number; // SEI capacitance
  cDl_uF: number; // Double layer capacitance
  warburgSigma: number; // Warburg coefficient
  dQdV_peaks: { voltage: number; phaseName: string; height: number; description: string }[];
  cv_redox: { eOx: number; eRed: number; standardE0: number };
  platoVolts: number;
}

export const BATTERY_PRESETS: BatteryChemPreset[] = [
  {
    id: "nmc811",
    name: "NMC811 (LiNi0.8Mn0.1Co0.1O2)",
    formula: "LiNi₀.₈Mn₀.₁Co₀.₁O₂ / Si-Gr",
    nominalVoltage: 3.7,
    theoreticalCap_mAh_g: 275,
    practicalCap_mAh_g: 210,
    dLi_cm2_s: 3.5e-11,
    r0_ohm: 0.12,
    rSei_ohm: 0.35,
    rCt_ohm: 0.85,
    cSei_uF: 12.0,
    cDl_uF: 45.0,
    warburgSigma: 4.8,
    dQdV_peaks: [
      { voltage: 3.65, phaseName: "H1 → M (Hexagonal to Monoclinic)", height: 85, description: "Initial lithium extraction ordering" },
      { voltage: 3.92, phaseName: "M → H2 Transition", height: 120, description: "Core Ni²⁺/Ni³⁺ and Ni³⁺/Ni⁴⁺ oxidation" },
      { voltage: 4.18, phaseName: "H2 → H3 Lattice Contraction", height: 165, description: "Abrupt c-axis lattice shrinkage inducing microcracking" },
    ],
    cv_redox: { eOx: 3.95, eRed: 3.68, standardE0: 3.82 },
    platoVolts: 3.8,
  },
  {
    id: "lfp",
    name: "LFP (Lithium Iron Phosphate)",
    formula: "LiFePO₄ / Graphite",
    nominalVoltage: 3.2,
    theoreticalCap_mAh_g: 170,
    practicalCap_mAh_g: 155,
    dLi_cm2_s: 1.8e-13,
    r0_ohm: 0.18,
    rSei_ohm: 0.42,
    rCt_ohm: 1.45,
    cSei_uF: 8.5,
    cDl_uF: 32.0,
    warburgSigma: 8.2,
    dQdV_peaks: [
      { voltage: 3.42, phaseName: "Two-Phase FePO4 ↔ LiFePO4 Plateau", height: 280, description: "Core flat miscibility gap phase transition" },
    ],
    cv_redox: { eOx: 3.52, eRed: 3.32, standardE0: 3.42 },
    platoVolts: 3.42,
  },
  {
    id: "solid-state-nmc",
    name: "Solid-State Li-Metal / LLZO-NMC",
    formula: "Li-Metal | Li₇La₃Zr₂O₁₂ | Single-Crystal NMC811",
    nominalVoltage: 3.85,
    theoreticalCap_mAh_g: 275,
    practicalCap_mAh_g: 230,
    dLi_cm2_s: 8.2e-10,
    r0_ohm: 0.45,
    rSei_ohm: 1.10, // Interfacial solid-solid impedance
    rCt_ohm: 1.80,
    cSei_uF: 4.2,
    cDl_uF: 18.0,
    warburgSigma: 6.5,
    dQdV_peaks: [
      { voltage: 3.68, phaseName: "H1 → M Transition", height: 90, description: "Solid-electrolyte interphase kinetics" },
      { voltage: 3.96, phaseName: "M → H2 Peak", height: 135, description: "Single-crystal uniform delithiation" },
      { voltage: 4.22, phaseName: "H2 → H3 High Voltage", height: 110, description: "Stabilized by LiNbO3 buffer coating" },
    ],
    cv_redox: { eOx: 4.02, eRed: 3.75, standardE0: 3.88 },
    platoVolts: 3.85,
  },
  {
    id: "sodium-ion",
    name: "Sodium-Ion (Na3V2(PO4)3 / Hard Carbon)",
    formula: "Na₃V₂(PO₄)₃ / Hard Carbon",
    nominalVoltage: 3.1,
    theoreticalCap_mAh_g: 130,
    practicalCap_mAh_g: 115,
    dLi_cm2_s: 5.5e-12,
    r0_ohm: 0.22,
    rSei_ohm: 0.58,
    rCt_ohm: 1.95,
    cSei_uF: 15.0,
    cDl_uF: 28.0,
    warburgSigma: 9.5,
    dQdV_peaks: [
      { voltage: 3.38, phaseName: "V³⁺/V⁴⁺ Redox Plateau", height: 210, description: "NASICON 3D open framework sodium extraction" },
    ],
    cv_redox: { eOx: 3.48, eRed: 3.28, standardE0: 3.38 },
    platoVolts: 3.35,
  },
];

// Corrosion Metals
export interface CorrosionMetalPreset {
  id: string;
  name: string;
  symbol: string;
  standardE0_V: number; // vs SHE
  valency: number;
  density_g_cm3: number;
  atomicMass_g_mol: number;
  betaA_V_dec: number; // Anodic Tafel slope
  betaC_V_dec: number; // Cathodic Tafel slope
  i0_corr_uA_cm2: number; // Baseline corrosion current density in aerated seawater
  ePit_V: number; // Pitting breakdown potential
  pren: number; // Pitting Resistance Equivalent Number
  pourbaixElement: "Fe" | "Al" | "Ti" | "Ni" | "Cu" | "Zn" | "Mg";
  coatingSuitability: string;
}

export const CORROSION_PRESETS: CorrosionMetalPreset[] = [
  {
    id: "al-7075",
    name: "Aerospace Aluminum (AA7075-T651)",
    symbol: "Al-Zn-Mg-Cu",
    standardE0_V: -0.79, // in 3.5% NaCl vs SHE
    valency: 3,
    density_g_cm3: 2.81,
    atomicMass_g_mol: 26.98,
    betaA_V_dec: 0.085,
    betaC_V_dec: 0.160,
    i0_corr_uA_cm2: 4.2,
    ePit_V: -0.68,
    pren: 0,
    pourbaixElement: "Al",
    coatingSuitability: "Tartaric-Sulfuric Anodizing (TSA) + Sol-Gel Inhibited Primer",
  },
  {
    id: "steel-316l",
    name: "Austenitic Stainless Steel (316L)",
    symbol: "Fe-18Cr-12Ni-2.5Mo",
    standardE0_V: +0.08,
    valency: 2.4,
    density_g_cm3: 8.00,
    atomicMass_g_mol: 55.5,
    betaA_V_dec: 0.120,
    betaC_V_dec: 0.110,
    i0_corr_uA_cm2: 0.18,
    ePit_V: +0.42,
    pren: 25.5,
    pourbaixElement: "Fe",
    coatingSuitability: "Passivation (ASTM A967 Citric/Nitric) + Electropolish",
  },
  {
    id: "ti-6al-4v",
    name: "Titanium Grade 5 (Ti-6Al-4V)",
    symbol: "Ti-6Al-4V",
    standardE0_V: +0.22,
    valency: 4,
    density_g_cm3: 4.43,
    atomicMass_g_mol: 47.87,
    betaA_V_dec: 0.150,
    betaC_V_dec: 0.120,
    i0_corr_uA_cm2: 0.025,
    ePit_V: +1.80, // Extremely noble passive TiO2 breakdown
    pren: 48.0,
    pourbaixElement: "Ti",
    coatingSuitability: "Thermal Oxidation / PVD TiN / Dielectric Isolation",
  },
  {
    id: "carbon-steel-1018",
    name: "Structural Carbon Steel (AISI 1018)",
    symbol: "Fe-0.18C",
    standardE0_V: -0.44,
    valency: 2,
    density_g_cm3: 7.87,
    atomicMass_g_mol: 55.85,
    betaA_V_dec: 0.090,
    betaC_V_dec: 0.130,
    i0_corr_uA_cm2: 18.5,
    ePit_V: -0.32,
    pren: 0,
    pourbaixElement: "Fe",
    coatingSuitability: "Zinc-Rich Epoxy Primer (HDG / Thermal Spray Zn-Al)",
  },
  {
    id: "inconel-718",
    name: "Inconel 718 Superalloy",
    symbol: "Ni-Cr-Fe-Nb-Mo",
    standardE0_V: +0.18,
    valency: 3,
    density_g_cm3: 8.19,
    atomicMass_g_mol: 58.0,
    betaA_V_dec: 0.110,
    betaC_V_dec: 0.105,
    i0_corr_uA_cm2: 0.012,
    ePit_V: +0.95,
    pren: 45.0,
    pourbaixElement: "Ni",
    coatingSuitability: "Thermal Barrier Coating (YSZ) / Aluminide Diffusion",
  },
  {
    id: "magnesium-az31",
    name: "Magnesium Alloy (AZ31B)",
    symbol: "Mg-3Al-1Zn",
    standardE0_V: -1.65,
    valency: 2,
    density_g_cm3: 1.74,
    atomicMass_g_mol: 24.31,
    betaA_V_dec: 0.065,
    betaC_V_dec: 0.210,
    i0_corr_uA_cm2: 45.0,
    ePit_V: -1.45,
    pren: 0,
    pourbaixElement: "Mg",
    coatingSuitability: "Plasma Electrolytic Oxidation (PEO / Keronite)",
  },
  {
    id: "cfrp-graphite",
    name: "Carbon Fiber Composite (CFRP Cathode)",
    symbol: "C (Graphite Fiber)",
    standardE0_V: +1.20,
    valency: 2,
    density_g_cm3: 1.80,
    atomicMass_g_mol: 12.01,
    betaA_V_dec: 0.200,
    betaC_V_dec: 0.080,
    i0_corr_uA_cm2: 0.005,
    ePit_V: +2.00,
    pren: 0,
    pourbaixElement: "Cu", // placeholder
    coatingSuitability: "Glass-Fiber Isolation Ply (GFRP Scrim) + Sealant",
  },
];

export function ElectrochemicalAnalysisSuite() {
  const [domain, setDomain] = useState<ElectrochemicalDomain>("battery");

  // Sub-modes
  const [batteryTech, setBatteryTech] = useState<BatteryTechMode>("eis-impedance");
  const [corrosionTech, setCorrosionTech] = useState<CorrosionTechMode>("tafel-polarization");

  // Selected Presets
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>("nmc811");
  const [selectedCorrosionId, setSelectedCorrosionId] = useState<string>("al-7075");
  const [selectedCathodeId, setSelectedCathodeId] = useState<string>("cfrp-graphite"); // For galvanic coupling

  // Common Environmental & Test State
  const [testTemperature_C, setTestTemperature_C] = useState<number>(25);
  const [electrolyteType, setElectrolyteType] = useState<"3.5_nacl" | "acid_rain" | "hot_marine" | "industrial_so2">("3.5_nacl");

  // Lab EIS Ingestion & Display States (Battery & Corrosion)
  const [batteryUploadedLabData, setBatteryUploadedLabData] = useState<ExperimentalEISDataset | null>(null);
  const [corrosionUploadedLabData, setCorrosionUploadedLabData] = useState<ExperimentalEISDataset | null>(null);
  const [batteryEisDisplayMode, setBatteryEisDisplayMode] = useState<"overlay" | "lab-only" | "model-only">("overlay");
  const [batteryEisPlotType, setBatteryEisPlotType] = useState<"nyquist" | "bode">("nyquist");
  const [corrosionEisDisplayMode, setCorrosionEisDisplayMode] = useState<"overlay" | "lab-only" | "model-only">("overlay");
  const [corrosionEisPlotType, setCorrosionEisPlotType] = useState<"nyquist" | "bode">("nyquist");

  // =========================================================================
  // 🔋 A. BATTERY ELECTROCHEMICAL SIMULATION STATE & COMPUTATIONS
  // =========================================================================
  const [batterySOC, setBatterySOC] = useState<number>(50); // % State of Charge
  const [batteryCycles, setBatteryCycles] = useState<number>(250); // Aging cycles
  const [cRate, setCRate] = useState<number>(1.0); // C-Rate
  const [cvScanRate_mVs, setCvScanRate_mVs] = useState<number>(0.5); // mV/s

  const batteryPreset = useMemo(
    () => BATTERY_PRESETS.find((b) => b.id === selectedBatteryId) || BATTERY_PRESETS[0],
    [selectedBatteryId]
  );

  // Aging multipliers: R_sei & R_ct grow, D_Li drops with sqrt(cycles)
  const agingFactor = useMemo(() => {
    const cycleGrowth = 1.0 + 0.85 * Math.sqrt(batteryCycles / 1000);
    const tempFactor = Math.exp((25 - testTemperature_C) / 35); // cold increases impedance
    return {
      rSei: cycleGrowth * tempFactor,
      rCt: (1.0 + 1.1 * Math.sqrt(batteryCycles / 1000)) * tempFactor,
      r0: (1.0 + 0.25 * (batteryCycles / 1000)) * tempFactor,
      dLi: Math.max(0.1, 1.0 - 0.45 * Math.sqrt(batteryCycles / 1000)) * Math.exp((testTemperature_C - 25) / 45),
    };
  }, [batteryCycles, testTemperature_C]);

  // 1. EIS (Nyquist & Bode) Calculation for Battery
  // Equivalent Circuit: R0 + Rsei / (1 + j w Rsei Csei) + Rct / (1 + j w Rct Cdl) + Zw
  const batteryEISData = useMemo(() => {
    const data = [];
    const r0 = batteryPreset.r0_ohm * agingFactor.r0;
    const rSei = batteryPreset.rSei_ohm * agingFactor.rSei;
    const rCt = batteryPreset.rCt_ohm * agingFactor.rCt;
    const cSei = batteryPreset.cSei_uF * 1e-6;
    const cDl = batteryPreset.cDl_uF * 1e-6;
    const sigmaW = batteryPreset.warburgSigma * (1 / agingFactor.dLi);

    // Frequency sweep from 100 kHz down to 10 mHz (7 decades)
    for (let logF = 5; logF >= -2; logF -= 0.1) {
      const f = Math.pow(10, logF);
      const omega = 2 * Math.PI * f;

      // SEI Semicircle: Z_sei = R_sei / (1 + (omega * R_sei * C_sei)^2) - j * (omega * R_sei^2 * C_sei) / (1 + ...)
      const denomSei = 1 + Math.pow(omega * rSei * cSei, 2);
      const zSeiReal = rSei / denomSei;
      const zSeiImag = -(omega * Math.pow(rSei, 2) * cSei) / denomSei;

      // Charge Transfer Semicircle:
      const denomCt = 1 + Math.pow(omega * rCt * cDl, 2);
      const zCtReal = rCt / denomCt;
      const zCtImag = -(omega * Math.pow(rCt, 2) * cDl) / denomCt;

      // Warburg Diffusion (low freq tail, omega < 10 Hz)
      let zWReal = 0;
      let zWImag = 0;
      if (f < 5) {
        const warburgAtten = Math.min(1.0, 5.0 / (f + 0.1));
        zWReal = (sigmaW / Math.sqrt(omega)) * warburgAtten;
        zWImag = -(sigmaW / Math.sqrt(omega)) * warburgAtten;
      }

      const zReal = r0 + zSeiReal + zCtReal + zWReal;
      const zImag = zSeiImag + zCtImag + zWImag; // negative in convention
      const minusZImag = -zImag; // Nyquist shows -Z''

      const magnitudeZ = Math.sqrt(zReal * zReal + zImag * zImag);
      const phaseDeg = (Math.atan2(zImag, zReal) * 180) / Math.PI;

      data.push({
        freq: f,
        logF: parseFloat(logF.toFixed(1)),
        zReal: parseFloat(zReal.toFixed(3)),
        minusZImag: parseFloat(minusZImag.toFixed(3)),
        magnitudeZ: parseFloat(magnitudeZ.toFixed(3)),
        phaseDeg: parseFloat(phaseDeg.toFixed(2)),
      });
    }
    return data;
  }, [batteryPreset, agingFactor]);

  // Derived solid-state Li+ diffusion coefficient via Warburg slope
  const calculatedDLi = useMemo(() => {
    const effectiveD = batteryPreset.dLi_cm2_s * agingFactor.dLi;
    return effectiveD.toExponential(2);
  }, [batteryPreset, agingFactor]);

  // 2. Differential Capacity (dQ/dV vs V) Spectrogram
  const dQdVData = useMemo(() => {
    const data = [];
    const minV = batteryPreset.id === "lfp" ? 3.0 : 3.2;
    const maxV = batteryPreset.id === "lfp" ? 3.65 : 4.35;
    const step = 0.01;

    // Peak shift due to internal IR drop and degradation
    const irDropShift = (cRate * (batteryPreset.r0_ohm + batteryPreset.rCt_ohm) * 0.08);
    const capacityFadeMultiplier = Math.max(0.4, 1.0 - (batteryCycles / 1500) * 0.4);

    for (let v = minV; v <= maxV; v += step) {
      let dQdV = 5.0; // baseline capacitance
      batteryPreset.dQdV_peaks.forEach((peak) => {
        const shiftedPeakV = peak.voltage + irDropShift;
        const width = batteryPreset.id === "lfp" ? 0.025 : 0.045;
        const gaussian = peak.height * Math.exp(-Math.pow(v - shiftedPeakV, 2) / (2 * width * width));
        dQdV += gaussian * capacityFadeMultiplier;
      });

      // Raw charge voltage profile
      const socFraction = Math.min(100, Math.max(0, ((v - minV) / (maxV - minV)) * 100));

      data.push({
        voltage: parseFloat(v.toFixed(3)),
        dQdV: parseFloat(dQdV.toFixed(1)),
        soc: parseFloat(socFraction.toFixed(1)),
      });
    }
    return data;
  }, [batteryPreset, cRate, batteryCycles]);

  // 3. Cyclic Voltammetry (CV) & Randles-Sevcik Simulation
  const cvData = useMemo(() => {
    const data = [];
    const { eOx, eRed, standardE0 } = batteryPreset.cv_redox;
    const scanRateFactor = Math.sqrt(cvScanRate_mVs / 0.5);
    const peakSeparation = 0.06 + 0.05 * Math.log10(cvScanRate_mVs / 0.1) + (batteryCycles / 2000) * 0.04;

    const actualEpa = standardE0 + peakSeparation / 2;
    const actualEpc = standardE0 - peakSeparation / 2;
    const peakCurrent = 15.0 * scanRateFactor * Math.max(0.5, 1.0 - (batteryCycles / 2000) * 0.35);

    const minE = standardE0 - 0.6;
    const maxE = standardE0 + 0.6;

    // Forward anodic sweep (oxidation)
    for (let e = minE; e <= maxE; e += 0.02) {
      const gaussOx = peakCurrent * Math.exp(-Math.pow(e - actualEpa, 2) / 0.015);
      const capCurrent = 1.2 * cvScanRate_mVs;
      data.push({
        voltage: parseFloat(e.toFixed(3)),
        currentAnodic: parseFloat((gaussOx + capCurrent).toFixed(2)),
        currentCathodic: null,
      });
    }
    // Reverse cathodic sweep (reduction)
    for (let e = maxE; e >= minE; e -= 0.02) {
      const gaussRed = -peakCurrent * Math.exp(-Math.pow(e - actualEpc, 2) / 0.015);
      const capCurrent = -1.2 * cvScanRate_mVs;
      data.push({
        voltage: parseFloat(e.toFixed(3)),
        currentAnodic: null,
        currentCathodic: parseFloat((gaussRed + capCurrent).toFixed(2)),
      });
    }
    return {
      points: data,
      actualEpa: parseFloat(actualEpa.toFixed(3)),
      actualEpc: parseFloat(actualEpc.toFixed(3)),
      deltaEp_mV: Math.round((actualEpa - actualEpc) * 1000),
      ip_mA: parseFloat(peakCurrent.toFixed(2)),
    };
  }, [batteryPreset, cvScanRate_mVs, batteryCycles]);

  // 4. Lithium Plating Risk Overpotential
  const platingSafety = useMemo(() => {
    // Overpotential at graphite/anode: eta_anode = E_eq - I * R_ct_anode - eta_diff
    const rAnode = (batteryPreset.rCt_ohm * 0.5) * agingFactor.rCt;
    const eta_overpotential = -(cRate * 1.5 * rAnode) - (testTemperature_C < 10 ? (10 - testTemperature_C) * 0.015 : 0);
    const anodePotentialVsLi = 0.08 + eta_overpotential;
    const isPlatingRisk = anodePotentialVsLi <= 0.0;

    return {
      anodePotentialVsLi: parseFloat(anodePotentialVsLi.toFixed(3)),
      isPlatingRisk,
      maxSafeCRate: Math.max(0.2, (0.08 / (1.5 * rAnode + 0.001))).toFixed(2),
    };
  }, [batteryPreset, cRate, agingFactor, testTemperature_C]);

  // =========================================================================
  // 🛡️ B. CORROSION ELECTROCHEMICAL SIMULATION STATE & COMPUTATIONS
  // =========================================================================
  const [anodeArea_cm2, setAnodeArea_cm2] = useState<number>(10);
  const [cathodeArea_cm2, setCathodeArea_cm2] = useState<number>(100);
  const [solutionPH, setSolutionPH] = useState<number>(7.0);

  const corrosionPreset = useMemo(
    () => CORROSION_PRESETS.find((m) => m.id === selectedCorrosionId) || CORROSION_PRESETS[0],
    [selectedCorrosionId]
  );
  const cathodePreset = useMemo(
    () => CORROSION_PRESETS.find((m) => m.id === selectedCathodeId) || CORROSION_PRESETS[6],
    [selectedCathodeId]
  );

  // Environmental Aggressiveness Multiplier
  const envMultiplier = useMemo(() => {
    switch (electrolyteType) {
      case "hot_marine": return 2.8;
      case "acid_rain": return 3.4;
      case "industrial_so2": return 2.1;
      case "3.5_nacl": return 1.0;
    }
  }, [electrolyteType]);

  // 1. Tafel Extrapolation & Stern-Geary Kinetics
  const tafelKinetics = useMemo(() => {
    const iCorr_uA_cm2 = corrosionPreset.i0_corr_uA_cm2 * envMultiplier * Math.exp((testTemperature_C - 25) / 40);
    const eCorr_V = corrosionPreset.standardE0_V + (7.0 - solutionPH) * 0.025;
    const betaA = corrosionPreset.betaA_V_dec;
    const betaC = corrosionPreset.betaC_V_dec;

    // Stern-Geary Polarization Resistance: Rp = (betaA * betaC) / (2.303 * iCorr * (betaA + betaC))
    // Note: iCorr in A/cm2 for Rp in Ohm*cm2
    const iCorr_A_cm2 = iCorr_uA_cm2 * 1e-6;
    const rp_Ohm_cm2 = (betaA * betaC) / (2.303 * iCorr_A_cm2 * (betaA + betaC));

    // Faraday's Law Corrosion Rate (ASTM G102):
    // CR (mm/year) = (0.00327 * iCorr (uA/cm2) * EW) / rho
    const EW = corrosionPreset.atomicMass_g_mol / corrosionPreset.valency;
    const cr_mm_yr = (0.00327 * iCorr_uA_cm2 * EW) / corrosionPreset.density_g_cm3;
    const cr_mpy = cr_mm_yr * 39.37; // mils per year
    const massLoss_g_m2_day = (iCorr_A_cm2 * EW * 86400 * 10000) / 96485;

    // Generate Tafel Plot Data: Log(i) vs Potential (E)
    const curvePoints = [];
    for (let eta = -0.35; eta <= 0.35; eta += 0.01) {
      const e = eCorr_V + eta;
      // Butler-Volmer / Tafel approximation
      let i_anodic = iCorr_uA_cm2 * Math.pow(10, eta / betaA);
      let i_cathodic = iCorr_uA_cm2 * Math.pow(10, -eta / betaC);

      // Passivity & Pitting if E > Epit
      if (corrosionPreset.pren > 0 && e > corrosionPreset.ePit_V) {
        i_anodic = i_anodic * Math.pow(10, (e - corrosionPreset.ePit_V) / 0.03); // Rapid pitting surge
      } else if (corrosionPreset.pren > 0 && eta > 0.05 && e < corrosionPreset.ePit_V) {
        i_anodic = Math.min(i_anodic, iCorr_uA_cm2 * 1.5); // Passive plateau
      }

      const netCurrent_uA = Math.abs(i_anodic - i_cathodic);
      const logI = Math.log10(Math.max(1e-4, netCurrent_uA));

      curvePoints.push({
        potential: parseFloat(e.toFixed(3)),
        logI: parseFloat(logI.toFixed(3)),
        current_uA: parseFloat(netCurrent_uA.toFixed(2)),
      });
    }

    return {
      eCorr_V: parseFloat(eCorr_V.toFixed(3)),
      iCorr_uA_cm2: parseFloat(iCorr_uA_cm2.toFixed(3)),
      rp_Ohm_cm2: Math.round(rp_Ohm_cm2),
      cr_mm_yr: parseFloat(cr_mm_yr.toFixed(4)),
      cr_mpy: parseFloat(cr_mpy.toFixed(2)),
      massLoss_g_m2_day: parseFloat(massLoss_g_m2_day.toFixed(2)),
      curvePoints,
    };
  }, [corrosionPreset, envMultiplier, testTemperature_C, solutionPH]);

  // 2. Galvanic Mixed Potential & Area Ratio Coupling
  const galvanicCoupling = useMemo(() => {
    const eAnode = corrosionPreset.standardE0_V;
    const eCathode = cathodePreset.standardE0_V;
    const deltaE = Math.abs(eCathode - eAnode);
    const areaRatio = cathodeArea_cm2 / Math.max(0.1, anodeArea_cm2);

    // Wagner-Traud Mixed Potential approximation
    // i_galvanic = i_corr_anode * (Area_cath / Area_anode)^0.75 * (deltaE / 0.5)
    const galvanicMultiplier = Math.pow(areaRatio, 0.75) * Math.max(0.2, deltaE / 0.4) * envMultiplier;
    const coupledIcorr_uA = corrosionPreset.i0_corr_uA_cm2 * galvanicMultiplier;

    const EW = corrosionPreset.atomicMass_g_mol / corrosionPreset.valency;
    const coupledCR_mm_yr = (0.00327 * coupledIcorr_uA * EW) / corrosionPreset.density_g_cm3;
    const accelerationFactor = coupledCR_mm_yr / Math.max(1e-5, tafelKinetics.cr_mm_yr);

    const isSevereCoupling = deltaE >= 0.25 && areaRatio >= 2.0;

    return {
      deltaE_V: parseFloat(deltaE.toFixed(3)),
      areaRatio: parseFloat(areaRatio.toFixed(1)),
      coupledIcorr_uA: parseFloat(coupledIcorr_uA.toFixed(2)),
      coupledCR_mm_yr: parseFloat(coupledCR_mm_yr.toFixed(3)),
      accelerationFactor: parseFloat(accelerationFactor.toFixed(1)),
      isSevereCoupling,
    };
  }, [corrosionPreset, cathodePreset, anodeArea_cm2, cathodeArea_cm2, envMultiplier, tafelKinetics]);

  // 3. Pourbaix (E-pH) Thermodynamics Diagram Evaluation
  const pourbaixState = useMemo(() => {
    // Evaluate thermodynamic zone at (solutionPH, tafelKinetics.eCorr_V)
    const ph = solutionPH;
    const e = tafelKinetics.eCorr_V;
    const elem = corrosionPreset.pourbaixElement;

    let zone: "Immunity" | "Corrosion (Active Dissolution)" | "Passivity (Protective Film)" | "Transpassive / Pitting" = "Corrosion (Active Dissolution)";
    let reaction = "";

    if (elem === "Fe") {
      if (e < -0.62 - 0.059 * ph) {
        zone = "Immunity";
        reaction = "Fe(s) is thermodynamically immune from oxidation.";
      } else if (ph >= 9.0 && ph <= 13.0 && e > -0.5) {
        zone = "Passivity (Protective Film)";
        reaction = "Fe₂O₃ / Fe₃O₄ protective passive barrier layer forms.";
      } else if (e > 1.2 - 0.059 * ph) {
        zone = "Transpassive / Pitting";
        reaction = "Transpassive dissolution to soluble FeO₄²⁻ ferryl ions.";
      } else {
        zone = "Corrosion (Active Dissolution)";
        reaction = "Active dissolution: Fe → Fe²⁺ + 2e⁻ (aggressive rust formation).";
      }
    } else if (elem === "Al") {
      if (e < -1.8 - 0.059 * ph) {
        zone = "Immunity";
        reaction = "Al(s) immune state.";
      } else if (ph >= 4.0 && ph <= 8.5) {
        zone = "Passivity (Protective Film)";
        reaction = "Dense Al₂O₃·3H₂O (Bayerite) self-healing protective ceramic barrier.";
      } else if (ph < 4.0) {
        zone = "Corrosion (Active Dissolution)";
        reaction = "Acidic dissolution: Al → Al³⁺ + 3e⁻.";
      } else {
        zone = "Corrosion (Active Dissolution)";
        reaction = "Alkaline caustic etching: Al + 4OH⁻ → AlO₂⁻ + 2H₂O + 3e⁻.";
      }
    } else if (elem === "Ti") {
      if (ph >= 1.0 && ph <= 13.0) {
        zone = "Passivity (Protective Film)";
        reaction = "Ultra-dense TiO₂ (Rutile/Anatase) barrier with 100% seawater immunity.";
      } else {
        zone = "Corrosion (Active Dissolution)";
        reaction = "Dissolution in concentrated non-oxidizing acids.";
      }
    } else {
      zone = e < -0.8 ? "Immunity" : ph > 7 ? "Passivity (Protective Film)" : "Corrosion (Active Dissolution)";
      reaction = `${corrosionPreset.name} standard electrochemical phase behavior.`;
    }

    return { zone, reaction };
  }, [solutionPH, tafelKinetics.eCorr_V, corrosionPreset]);

  // 4. Corrosion & Coating EIS Calculation (Nyquist & Bode)
  const corrosionEISData = useMemo(() => {
    const data = [];
    const rs = electrolyteType === "hot_marine" ? 8.5 : electrolyteType === "3.5_nacl" ? 14.2 : electrolyteType === "acid_rain" ? 38.0 : 26.5;
    const bA = corrosionPreset.betaA_V_dec;
    const bC = corrosionPreset.betaC_V_dec;
    const bVal = (bA * bC) / (2.303 * (bA + bC));
    const iCorr_A = (corrosionPreset.i0_corr_uA_cm2 * 1e-6) * (electrolyteType === "hot_marine" ? 2.5 : 1.0);
    const rp = Math.min(1e7, bVal / iCorr_A);
    const cDl = 35e-6; // F/cm2
    
    // Coating parameters (e.g. epoxy or anodized film)
    const isCoated = corrosionTech === "coating-eis";
    const rPore = isCoated ? 4.8e5 : 0;
    const cCoating = isCoated ? 0.35e-9 : 0;

    for (let logF = 5; logF >= -2; logF -= 0.1) {
      const f = Math.pow(10, logF);
      const omega = 2 * Math.PI * f;

      let zReal = rs;
      let zImag = 0;

      if (isCoated && rPore > 0) {
        const denomCc = 1 + Math.pow(omega * rPore * cCoating, 2);
        const zPoreReal = rPore / denomCc;
        const zPoreImag = -(omega * Math.pow(rPore, 2) * cCoating) / denomCc;
        
        const denomDl = 1 + Math.pow(omega * rp * cDl, 2);
        const zCtReal = rp / denomDl;
        const zCtImag = -(omega * Math.pow(rp, 2) * cDl) / denomDl;

        zReal += zPoreReal + zCtReal;
        zImag += zPoreImag + zCtImag;
      } else {
        const denomDl = 1 + Math.pow(omega * rp * cDl, 2);
        const zCtReal = rp / denomDl;
        const zCtImag = -(omega * Math.pow(rp, 2) * cDl) / denomDl;
        zReal += zCtReal;
        zImag += zCtImag;
      }

      const minusZImag = -zImag;
      const magnitudeZ = Math.sqrt(zReal * zReal + zImag * zImag);
      const phaseDeg = (Math.atan2(zImag, zReal) * 180) / Math.PI;

      data.push({
        freq: f,
        logF: parseFloat(logF.toFixed(1)),
        zReal: parseFloat(zReal.toFixed(2)),
        minusZImag: parseFloat(minusZImag.toFixed(2)),
        magnitudeZ: parseFloat(magnitudeZ.toFixed(2)),
        phaseDeg: parseFloat(phaseDeg.toFixed(2)),
      });
    }
    return data;
  }, [corrosionPreset, electrolyteType, corrosionTech]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Flagship Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#09101c] to-[#060b13] p-6 lg:p-8 border border-sky-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.25)]">
                <Zap className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white tracking-wide font-mono flex items-center gap-2.5">
                  Electrochemical Analysis Suite
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-400/30">
                    Battery & Corrosion Physics
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ASTM G102 / ASTM G59 / EIS Nyquist & Bode / dQ-dV / CV Kinetics / Pourbaix E-pH / Galvanic Mixed Potential
                </p>
              </div>
            </div>
          </div>

          {/* Top Domain Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#060b14] rounded-xl border border-[#1b283d] self-stretch sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setDomain("battery")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "battery"
                  ? "bg-gradient-to-r from-sky-500/20 to-blue-600/20 text-sky-300 border border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BatteryCharging className="w-4 h-4 text-sky-400" />
              <span>1. Battery Engineering</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("corrosion")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "corrosion"
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-600/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>2. Corrosion Science</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("circuit-builder")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "circuit-builder"
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>3. Circuit Studio (ECM)</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("preset-library")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "preset-library"
                  ? "bg-gradient-to-r from-purple-500/20 to-sky-600/20 text-purple-300 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>4. Preset Circuit Library</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("cnls-fitter")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "cnls-fitter"
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-600/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>5. CNLS Data Fitter</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("eis-upload-insights")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "eis-upload-insights"
                  ? "bg-gradient-to-r from-sky-500/20 to-teal-600/20 text-sky-300 border border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>6. Upload EIS &amp; Insights</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/30 text-sky-200 border border-sky-400/40 font-bold">
                NEW
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("batch-degradation")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "batch-degradation"
                  ? "bg-gradient-to-r from-sky-500/20 to-indigo-600/20 text-sky-300 border border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span>7. Batch EIS &amp; Degradation Tracker</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/30 text-sky-200 border border-sky-400/40 font-bold">
                3D WATERFALL
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("physical-validation")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "physical-validation"
                  ? "bg-gradient-to-r from-sky-500/20 to-blue-600/20 text-sky-300 border border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>7. Lin-KK &amp; Physical Validation</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("ocp-g59")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "ocp-g59"
                  ? "bg-gradient-to-r from-teal-500/20 to-emerald-600/20 text-teal-300 border border-teal-400/50 shadow-[0_0_12px_rgba(20,184,166,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>8. Real-Time OCP &amp; ASTM G59</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("pourbaix-studio")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "pourbaix-studio"
                  ? "bg-gradient-to-r from-sky-500/20 to-indigo-600/20 text-sky-300 border border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>9. Dynamic Pourbaix (E-pH-T)</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("multi-material")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "multi-material"
                  ? "bg-gradient-to-r from-purple-500/20 to-indigo-600/20 text-purple-300 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Boxes className="w-4 h-4 text-purple-400" />
              <span>10. Multi-Material Interface</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("transmission-line")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "transmission-line"
                  ? "bg-gradient-to-r from-indigo-500/20 to-blue-600/20 text-indigo-300 border border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>11. Porous &amp; Transmission Line (TLM)</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("synthetic-noise")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "synthetic-noise"
                  ? "bg-gradient-to-r from-amber-500/20 to-rose-600/20 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <RadioTower className="w-4 h-4 text-amber-400" />
              <span>12. Synthetic Noise &amp; Error Simulator</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("dual-overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "dual-overview"
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>13. Dual Synthesis Hub</span>
            </button>

            <button
              type="button"
              onClick={() => setDomain("python-data-upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                domain === "python-data-upload"
                  ? "bg-gradient-to-r from-amber-500/20 to-sky-600/20 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>14. Python Data Upload &amp; Lab</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold">
                Python 3.10
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: BATTERY ELECTROCHEMICAL SUITE
         ========================================================================= */}
      {domain === "battery" && (
        <div className="space-y-6">
          {/* Sub-Technique Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {[
              { id: "eis-impedance", label: "EIS Impedance (Nyquist/Bode)", sub: "R0, R_sei, R_ct, Warburg D_Li+", icon: Activity },
              { id: "circuit-builder", label: "Circuit Builder (ECM)", sub: "Interactive R, C, CPE, W Builder", icon: Cpu },
              { id: "dq-dv-spectrogram", label: "Differential Capacity (dQ/dV)", sub: "Phase Transitions & LLI/LAM", icon: Layers },
              { id: "cv-kinetics", label: "Cyclic Voltammetry (CV)", sub: "Randles-Sevcik & Peak Redox", icon: RefreshCw },
              { id: "li-plating-safety", label: "Li Plating Overpotential", sub: "Fast-Charge Anode Safety (<0V)", icon: AlertTriangle },
              { id: "full-chemistry-lab", label: "Battery Metallurgy & SOH Lab", sub: "Cell Catalog, Expansion, Solid-State", icon: Boxes },
              { id: "python-upload", label: "Upload Data with Python", sub: "Python 3.10+ Script & Data Ingest", icon: FileCode },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = batteryTech === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBatteryTech(t.id as BatteryTechMode)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? "bg-sky-500/10 border-sky-400/60 shadow-[0_0_14px_rgba(56,189,248,0.2)]"
                      : "bg-[#090e18] border-[#162032] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-500"}`} />
                    <span className={`text-xs font-bold font-mono ${isActive ? "text-sky-200" : "text-slate-300"}`}>
                      {t.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 font-mono">{t.sub}</span>
                </button>
              );
            })}
          </div>

          {/* If Battery Metallurgy Full Lab Selected */}
          {batteryTech === "full-chemistry-lab" ? (
            <div className="pt-2">
              <BatteryEngineeringLab />
            </div>
          ) : batteryTech === "circuit-builder" ? (
            <div className="pt-2">
              <EquivalentCircuitBuilder />
            </div>
          ) : batteryTech === "python-upload" ? (
            <div className="pt-2">
              <PythonBatteryCorrosionUploadStudio
                initialDomain="battery"
                onSendToBatteryEIS={(ds) => {
                  setBatteryUploadedLabData(ds);
                  setBatteryTech("eis-impedance");
                }}
                onSendToCorrosionEIS={(ds) => {
                  setCorrosionUploadedLabData(ds);
                  setDomain("corrosion");
                  setCorrosionTech("coating-eis");
                }}
                onSendToCNLS={() => {
                  setDomain("cnls-fitter");
                }}
                onSendToEISInsights={() => {
                  setDomain("eis-upload-insights");
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Battery Controls */}
            <div className="lg:col-span-4 bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  Battery Test Controls
                </span>
                <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-400/30">
                  {batteryPreset.id.toUpperCase()}
                </span>
              </div>

              {/* Chemistry Selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold block">Cathode & System Chemistry:</label>
                <select
                  value={selectedBatteryId}
                  onChange={(e) => setSelectedBatteryId(e.target.value)}
                  className="w-full bg-[#050810] border border-[#1e2d46] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-400"
                >
                  {BATTERY_PRESETS.map((chem) => (
                    <option key={chem.id} value={chem.id}>
                      {chem.name} ({chem.nominalVoltage}V)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-mono block">Formula: {batteryPreset.formula}</span>
              </div>

              {/* State of Charge Slider */}
              <div className="space-y-1.5 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">State of Charge (SOC):</span>
                  <span className="text-sky-400 font-bold">{batterySOC}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={batterySOC}
                  onChange={(e) => setBatterySOC(parseInt(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Aging Cycles Slider */}
              <div className="space-y-1.5 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Aging Degradation Cycles:</span>
                  <span className="text-amber-400 font-bold">{batteryCycles} cycles</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={batteryCycles}
                  onChange={(e) => setBatteryCycles(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block font-mono">
                  R_sei Growth: ×{agingFactor.rSei.toFixed(2)} | R_ct Growth: ×{agingFactor.rCt.toFixed(2)}
                </span>
              </div>

              {/* C-Rate or Scan Rate */}
              {batteryTech === "cv-kinetics" ? (
                <div className="space-y-1.5 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">CV Scan Rate (ν):</span>
                    <span className="text-cyan-400 font-bold">{cvScanRate_mVs} mV/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={cvScanRate_mVs}
                    onChange={(e) => setCvScanRate_mVs(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block font-mono">
                    Randles-Sevcik: Ip ∝ ν^(0.5) for diffusion control
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Charge / Discharge C-Rate:</span>
                    <span className="text-cyan-400 font-bold">{cRate} C</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={cRate}
                    onChange={(e) => setCRate(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}

              {/* Temperature Slider */}
              <div className="space-y-1.5 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Cell Temperature:</span>
                  <span className={`${testTemperature_C < 10 ? "text-blue-400 font-bold" : "text-slate-200 font-bold"}`}>
                    {testTemperature_C}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="60"
                  step="5"
                  value={testTemperature_C}
                  onChange={(e) => setTestTemperature_C(parseInt(e.target.value))}
                  className="w-full accent-blue-400 cursor-pointer"
                />
                {testTemperature_C < 0 && (
                  <span className="text-[10px] text-rose-400 font-bold font-mono block">
                    ⚠️ Sub-zero sluggish kinetics: High lithium plating risk!
                  </span>
                )}
              </div>

              {/* Real-Time Parameter Telemetry */}
              <div className="p-3.5 rounded-xl bg-[#060b13] border border-[#162032] space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                  Extracted Kinetic Constants:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-2 bg-[#0a0f1d] rounded border border-[#162032]">
                    <span className="text-slate-500 block">D_Li+ (Solid Diff):</span>
                    <span className="text-sky-300 font-bold">{calculatedDLi} cm²/s</span>
                  </div>
                  <div className="p-2 bg-[#0a0f1d] rounded border border-[#162032]">
                    <span className="text-slate-500 block">R_ct (Charge Trans):</span>
                    <span className="text-emerald-300 font-bold">{(batteryPreset.rCt_ohm * agingFactor.rCt).toFixed(2)} Ω</span>
                  </div>
                  <div className="p-2 bg-[#0a0f1d] rounded border border-[#162032]">
                    <span className="text-slate-500 block">R_sei (Film Growth):</span>
                    <span className="text-amber-300 font-bold">{(batteryPreset.rSei_ohm * agingFactor.rSei).toFixed(2)} Ω</span>
                  </div>
                  <div className="p-2 bg-[#0a0f1d] rounded border border-[#162032]">
                    <span className="text-slate-500 block">R_0 (Ohmic Bulk):</span>
                    <span className="text-purple-300 font-bold">{(batteryPreset.r0_ohm * agingFactor.r0).toFixed(2)} Ω</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Electrochemical Visualizer */}
            <div className="lg:col-span-8 bg-[#090e18] rounded-2xl border border-[#162032] p-5 flex flex-col justify-between space-y-5">
              {/* Header for Active Chart */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    {batteryTech === "eis-impedance" && "Battery EIS Impedance Spectrum & Lab Ingestion"}
                    {batteryTech === "dq-dv-spectrogram" && "Differential Capacity Spectrogram (dQ/dV vs Voltage)"}
                    {batteryTech === "cv-kinetics" && "Cyclic Voltammogram (I vs E) & Randles-Sevcik Kinetics"}
                    {batteryTech === "li-plating-safety" && "Anode Overpotential vs Li/Li+ & Plating Boundary"}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {batteryPreset.name} | T={testTemperature_C}°C | Cycles={batteryCycles}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#060b13] border border-[#1a263c] text-sky-300 font-semibold">
                    ASTM / FreedomCAR
                  </span>
                </div>
              </div>

              {/* Lab EIS Ingestion Panel (shown for Battery EIS) */}
              {batteryTech === "eis-impedance" && (
                <EISLabDataUploader
                  domain="battery"
                  uploadedDataset={batteryUploadedLabData}
                  onDatasetLoaded={(ds) => setBatteryUploadedLabData(ds)}
                  onClearDataset={() => setBatteryUploadedLabData(null)}
                  displayMode={batteryEisDisplayMode}
                  onDisplayModeChange={setBatteryEisDisplayMode}
                  plotType={batteryEisPlotType}
                  onPlotTypeChange={setBatteryEisPlotType}
                  onSendToCNLS={() => setDomain("cnls-fitter")}
                  onSendToEISInsights={() => setDomain("eis-upload-insights")}
                  onNavigateToPythonUpload={() => setBatteryTech("python-upload")}
                />
              )}

              {/* Chart Rendering Area */}
              <div className="h-[360px] w-full bg-[#050810] rounded-xl border border-[#162032] p-3 relative">
                {batteryTech === "eis-impedance" && batteryEisPlotType === "nyquist" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        type="number"
                        dataKey="zReal"
                        name="Z' (Real)"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Real Impedance Z' (Ω)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="minusZImag"
                        name="-Z'' (Imag)"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "-Imaginary -Z'' (Ω)", angle: -90, position: "left", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                        formatter={(val: any, name: any) => [`${typeof val === 'number' ? val.toFixed(3) : val} Ω`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                      {(batteryEisDisplayMode === "overlay" || batteryEisDisplayMode === "model-only") && (
                        <Scatter
                          name="Simulated ECM Model"
                          data={batteryEISData}
                          line={{ stroke: "#38bdf8", strokeWidth: 2.5 }}
                          fill="#38bdf8"
                          shape="circle"
                          legendType="line"
                        />
                      )}
                      {batteryUploadedLabData && (batteryEisDisplayMode === "overlay" || batteryEisDisplayMode === "lab-only") && (
                        <Scatter
                          name={`Lab Data: ${batteryUploadedLabData.name}`}
                          data={batteryUploadedLabData.points}
                          fill="#f59e0b"
                          shape="circle"
                          legendType="circle"
                        />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                )}

                {batteryTech === "eis-impedance" && batteryEisPlotType === "bode" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={batteryEISData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        dataKey="logF"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "log₁₀(Frequency / Hz)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#38bdf8"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "|Z| Magnitude (Ω)", angle: -90, position: "left", offset: 0, fill: "#38bdf8", fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#34d399"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Phase (deg)", angle: 90, position: "right", offset: 0, fill: "#34d399", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                      <Line yAxisId="left" type="monotone" dataKey="magnitudeZ" name="Model |Z| (Ω)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="phaseDeg" name="Model Phase (°)" stroke="#34d399" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {batteryTech === "dq-dv-spectrogram" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dQdVData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="dqdvGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        dataKey="voltage"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Cell Voltage (V)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "dQ/dV (Ah/V)", angle: -90, position: "left", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                        formatter={(val: any) => [`${val} Ah/V`, "Differential Capacity"]}
                        labelFormatter={(label) => `Voltage: ${label} V`}
                      />
                      <Area
                        type="monotone"
                        dataKey="dQdV"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#dqdvGrad)"
                      />
                      {batteryPreset.dQdV_peaks.map((peak, idx) => (
                        <ReferenceLine
                          key={idx}
                          x={peak.voltage}
                          stroke="#f59e0b"
                          strokeDasharray="3 3"
                          label={{ value: peak.phaseName.split(" ")[0], fill: "#f59e0b", fontSize: 9, position: "top" }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {batteryTech === "cv-kinetics" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cvData.points} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        dataKey="voltage"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Potential (V vs Li/Li+)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Current (mA)", angle: -90, position: "left", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                      />
                      <ReferenceLine y={0} stroke="#334155" />
                      <Line
                        type="monotone"
                        dataKey="currentAnodic"
                        name="Anodic Sweep (Oxidation)"
                        stroke="#34d399"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="currentCathodic"
                        name="Cathodic Sweep (Reduction)"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {batteryTech === "li-plating-safety" && (
                  <div className="h-full flex flex-col justify-between p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          Graphite Anode Potential vs Li/Li⁺ Threshold:
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-2xl font-extrabold font-mono ${
                              platingSafety.isPlatingRisk ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {platingSafety.anodePotentialVsLi} V
                          </span>
                          <span className="text-xs text-slate-400 font-mono">(Threshold: 0.000 V)</span>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-2 ${
                          platingSafety.isPlatingRisk
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        }`}
                      >
                        {platingSafety.isPlatingRisk ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        {platingSafety.isPlatingRisk ? "METALLIC LI PLATING HAZARD" : "SAFE INTERCALATION REGIME"}
                      </div>
                    </div>

                    <div className="bg-[#0c1322] p-4 rounded-xl border border-[#162032] space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Calculated Maximum Safe Fast-Charge Rate:</span>
                        <span className="text-sky-400 font-bold">{platingSafety.maxSafeCRate} C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Anode Charge Transfer Resistance:</span>
                        <span className="text-slate-200">{(batteryPreset.rCt_ohm * 0.5 * agingFactor.rCt).toFixed(3)} Ω</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Temperature Overpotential Penalty:</span>
                        <span className="text-slate-200">
                          {testTemperature_C < 10 ? `-${((10 - testTemperature_C) * 15).toFixed(1)} mV` : "0.0 mV (Normative)"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 leading-relaxed font-mono bg-[#090e18] p-3 rounded-lg border border-[#1e2d46]">
                      💡 <strong>Physical Mechanism:</strong> When graphite intercalation kinetics are outpaced by high
                      charging current at low temperatures, anode polarization drops below 0.0V vs Li/Li⁺. Thermodynamically,
                      metallic lithium plates on the graphite surface, forming sharp dendrites that puncture the separator.
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Insight Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#060b13] rounded-xl border border-[#162032]">
                  <span className="text-slate-500 block text-[10px]">Solid-State Diffusion D_Li+:</span>
                  <span className="text-sky-300 font-bold">{calculatedDLi} cm²/s</span>
                </div>
                <div className="p-3 bg-[#060b13] rounded-xl border border-[#162032]">
                  <span className="text-slate-500 block text-[10px]">Peak Voltage Separation (ΔEp):</span>
                  <span className="text-emerald-300 font-bold">{cvData.deltaEp_mV} mV</span>
                </div>
                <div className="p-3 bg-[#060b13] rounded-xl border border-[#162032]">
                  <span className="text-slate-500 block text-[10px]">Estimated SOH Capacity:</span>
                  <span className="text-amber-300 font-bold">{Math.max(60, 100 - batteryCycles * 0.02).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: CORROSION ELECTROCHEMICAL SUITE
         ========================================================================= */}
      {domain === "corrosion" && (
        <div className="space-y-6">
          {/* Sub-Technique Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-3">
            {[
              { id: "tafel-polarization", label: "Tafel Polarization (E vs log i)", sub: "Ecorr, icorr, Rp, Faraday CR", icon: Activity },
              { id: "annual-corrosion-rate", label: "Annual Corrosion Rate (mm/yr)", sub: "Python 3.10 ASTM G102 from Icorr", icon: Zap },
              { id: "pourbaix-e-ph", label: "Pourbaix (E-pH) Thermodynamics", sub: "Immunity, Passivity, Corrosion", icon: Compass },
              { id: "circuit-builder", label: "Circuit Builder (ECM)", sub: "ASTM G106 Coating R_po & C_c", icon: Cpu },
              { id: "galvanic-mixed", label: "Galvanic Coupling & Area Ratio", sub: "Mixed Potential Theory (ZRA)", icon: Layers },
              { id: "coating-eis", label: "Coating EIS & Water Uptake", sub: "Brasher-Kingsbury & Pore Res", icon: Droplets },
              { id: "ocp-astm-g59", label: "Real-Time OCP & ASTM G59", sub: "Live E_ocp drift, Rp & i_corr transients", icon: ShieldCheck },
              { id: "full-corrosion-lab", label: "Galvanic Matrix & PREN Lab", sub: "ASTM G102 Series, Mass Loss, Coatings", icon: ShieldAlert },
              { id: "python-upload", label: "Upload Data with Python", sub: "Python 3.10+ Tafel & OCP Ingest", icon: FileCode },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = corrosionTech === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCorrosionTech(t.id as CorrosionTechMode)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? "bg-emerald-500/10 border-emerald-400/60 shadow-[0_0_14px_rgba(52,211,153,0.2)]"
                      : "bg-[#090e18] border-[#162032] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                    <span className={`text-xs font-bold font-mono ${isActive ? "text-emerald-200" : "text-slate-300"}`}>
                      {t.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1 font-mono">{t.sub}</span>
                </button>
              );
            })}
          </div>

          {/* If Full Corrosion Engineering Lab Selected */}
          {corrosionTech === "full-corrosion-lab" ? (
            <div className="pt-2">
              <CorrosionEngineeringLab />
            </div>
          ) : corrosionTech === "circuit-builder" ? (
            <div className="pt-2">
              <EquivalentCircuitBuilder />
            </div>
          ) : corrosionTech === "ocp-astm-g59" ? (
            <div className="pt-2">
              <OCPAndASTMG59Studio />
            </div>
          ) : corrosionTech === "pourbaix-e-ph" ? (
            <div className="pt-2">
              <DynamicPourbaixStudio />
            </div>
          ) : corrosionTech === "python-upload" ? (
            <div className="pt-2">
              <PythonBatteryCorrosionUploadStudio
                initialDomain="corrosion"
                onSendToBatteryEIS={(ds) => {
                  setBatteryUploadedLabData(ds);
                  setDomain("battery");
                  setBatteryTech("eis-impedance");
                }}
                onSendToCorrosionEIS={(ds) => {
                  setCorrosionUploadedLabData(ds);
                  setCorrosionTech("coating-eis");
                }}
                onSendToCNLS={() => {
                  setDomain("cnls-fitter");
                }}
                onSendToEISInsights={() => {
                  setDomain("eis-upload-insights");
                }}
              />
            </div>
          ) : corrosionTech === "tafel-polarization" ? (
            <div className="pt-2">
              <TafelPolarizationLab />
            </div>
          ) : corrosionTech === "annual-corrosion-rate" ? (
            <div className="pt-2">
              <PythonAnnualCorrosionRateModule
                onNavigateToTafel={() => setCorrosionTech("tafel-polarization")}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Corrosion Inputs */}
            <div className="lg:col-span-4 bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  Corrosion Parameters
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-400/30">
                  ASTM G102 / G59
                </span>
              </div>

              {/* Working Electrode (Metal Anode) */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-semibold block">Working Electrode (Substrate):</label>
                <select
                  value={selectedCorrosionId}
                  onChange={(e) => setSelectedCorrosionId(e.target.value)}
                  className="w-full bg-[#050810] border border-[#1e2d46] rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
                >
                  {CORROSION_PRESETS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.symbol})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-mono block">
                  E° = {corrosionPreset.standardE0_V} V vs SHE | PREN = {corrosionPreset.pren}
                </span>
              </div>

              {/* Electrolyte Environment */}
              <div className="space-y-1.5 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                <label className="text-xs text-slate-300 font-semibold block">Electrolyte Medium:</label>
                <select
                  value={electrolyteType}
                  onChange={(e) => setElectrolyteType(e.target.value as any)}
                  className="w-full bg-[#090e18] border border-[#1e2d46] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
                >
                  <option value="3.5_nacl">Aerated 3.5 wt% NaCl (Seawater Standard)</option>
                  <option value="hot_marine">Tropical Splash Zone (High Cl⁻ + 45°C)</option>
                  <option value="acid_rain">Acidic Industrial Atmospheric (pH 3.5)</option>
                  <option value="industrial_so2">Industrial SO₂ Marine Atmosphere</option>
                </select>
              </div>

              {/* Solution pH Slider */}
              <div className="space-y-1.5 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Solution pH Level:</span>
                  <span className="text-emerald-400 font-bold">pH {solutionPH}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="14.0"
                  step="0.5"
                  value={solutionPH}
                  onChange={(e) => setSolutionPH(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Galvanic Coupled Cathode (if in Galvanic Mode) */}
              {corrosionTech === "galvanic-mixed" && (
                <div className="space-y-3 bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-semibold block">Coupled Cathodic Metal:</label>
                    <select
                      value={selectedCathodeId}
                      onChange={(e) => setSelectedCathodeId(e.target.value)}
                      className="w-full bg-[#090e18] border border-[#1e2d46] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
                    >
                      {CORROSION_PRESETS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.standardE0_V} V)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block">Anode Area:</span>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={anodeArea_cm2}
                        onChange={(e) => setAnodeArea_cm2(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-full bg-[#090e18] border border-[#1e2d46] rounded px-2 py-1 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block">Cathode Area:</span>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={cathodeArea_cm2}
                        onChange={(e) => setCathodeArea_cm2(Math.max(1, parseFloat(e.target.value) || 1))}
                        className="w-full bg-[#090e18] border border-[#1e2d46] rounded px-2 py-1 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono block">
                    Area Ratio (Ac/Aa) = {galvanicCoupling.areaRatio}:1
                  </span>
                </div>
              )}

              {/* Calculated Kinetic Metrics */}
              <div className="p-3.5 rounded-xl bg-[#060b13] border border-[#162032] space-y-2 font-mono text-xs">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Electrochemical Kinetic Summary:
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Corrosion Potential (E_corr):</span>
                    <span className="text-emerald-300 font-bold">{tafelKinetics.eCorr_V} V vs SHE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Corrosion Current (i_corr):</span>
                    <span className="text-sky-300 font-bold">{tafelKinetics.iCorr_uA_cm2} µA/cm²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Polarization Resistance (Rp):</span>
                    <span className="text-purple-300 font-bold">{tafelKinetics.rp_Ohm_cm2.toLocaleString()} Ω·cm²</span>
                  </div>
                  <div className="flex justify-between border-t border-[#162032] pt-1 mt-1">
                    <span className="text-slate-300 font-semibold">Faraday Penetration Rate:</span>
                    <span className="text-amber-400 font-bold">
                      {tafelKinetics.cr_mm_yr} mm/yr ({tafelKinetics.cr_mpy} mpy)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Corrosion Charts & Pourbaix */}
            <div className="lg:col-span-8 bg-[#090e18] rounded-2xl border border-[#162032] p-5 flex flex-col justify-between space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    {corrosionTech === "tafel-polarization" && "Tafel Polarization Evans Diagram (E vs Log i)"}
                    {corrosionTech === "pourbaix-e-ph" && "Pourbaix (E-pH) Thermodynamic Phase Stability Diagram"}
                    {corrosionTech === "galvanic-mixed" && "Galvanic Mixed Potential Coupling & Acceleration Factor"}
                    {corrosionTech === "coating-eis" && "Coating Impedance & Water Absorption (Brasher-Kingsbury)"}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {corrosionPreset.name} | pH = {solutionPH} | CR = {tafelKinetics.cr_mm_yr} mm/year
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#060b13] border border-[#1a263c] text-emerald-300 font-semibold">
                    ASTM G5 / G102
                  </span>
                </div>
              </div>

              {/* Lab EIS Ingestion Panel (shown for Corrosion EIS) */}
              {corrosionTech === "coating-eis" && (
                <EISLabDataUploader
                  domain="corrosion"
                  uploadedDataset={corrosionUploadedLabData}
                  onDatasetLoaded={(ds) => setCorrosionUploadedLabData(ds)}
                  onClearDataset={() => setCorrosionUploadedLabData(null)}
                  displayMode={corrosionEisDisplayMode}
                  onDisplayModeChange={setCorrosionEisDisplayMode}
                  plotType={corrosionEisPlotType}
                  onPlotTypeChange={setCorrosionEisPlotType}
                  onSendToCNLS={() => setDomain("cnls-fitter")}
                  onSendToEISInsights={() => setDomain("eis-upload-insights")}
                  onNavigateToPythonUpload={() => setCorrosionTech("python-upload")}
                />
              )}

              {/* Active Corrosion Visualization */}
              <div className="h-[360px] w-full bg-[#050810] rounded-xl border border-[#162032] p-3 relative">
                {corrosionTech === "tafel-polarization" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tafelKinetics.curvePoints} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        dataKey="logI"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Log Current Density log(i, µA/cm²)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="potential"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Potential E (V vs SHE)", angle: -90, position: "left", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                        formatter={(val: any, name: any) => [`${val} V`, "Potential"]}
                        labelFormatter={(label) => `log(i) = ${label}`}
                      />
                      <ReferenceLine y={tafelKinetics.eCorr_V} stroke="#34d399" strokeDasharray="3 3" label={{ value: `Ecorr = ${tafelKinetics.eCorr_V}V`, fill: "#34d399", fontSize: 10, position: "right" }} />
                      {corrosionPreset.pren > 0 && (
                        <ReferenceLine y={corrosionPreset.ePit_V} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: `Epit = ${corrosionPreset.ePit_V}V`, fill: "#f43f5e", fontSize: 10, position: "right" }} />
                      )}
                      <Line
                        type="monotone"
                        dataKey="potential"
                        stroke="#34d399"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {corrosionTech === "pourbaix-e-ph" && (
                  <div className="h-full flex flex-col justify-between p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0c1322] rounded-xl border border-[#1e2d46] space-y-2">
                        <span className="text-xs text-slate-400 font-mono block">Thermodynamic Stability Phase:</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-bold font-mono ${
                              pourbaixState.zone.includes("Passivity")
                                ? "text-emerald-400"
                                : pourbaixState.zone.includes("Immunity")
                                ? "text-sky-400"
                                : "text-rose-400"
                            }`}
                          >
                            {pourbaixState.zone}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-mono leading-relaxed mt-1">
                          {pourbaixState.reaction}
                        </p>
                      </div>

                      <div className="p-4 bg-[#0c1322] rounded-xl border border-[#1e2d46] space-y-2 font-mono text-xs">
                        <span className="text-slate-400 block">Active Operating Coordinates:</span>
                        <div className="space-y-1 text-slate-200">
                          <div>pH: <strong className="text-emerald-300">{solutionPH}</strong></div>
                          <div>Potential E: <strong className="text-sky-300">{tafelKinetics.eCorr_V} V vs SHE</strong></div>
                          <div>Cathodic Target for Full Immunity: <strong className="text-purple-300">&lt; -0.85 V vs CSE</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#080d16] rounded-xl border border-[#162032] space-y-2 text-xs font-mono">
                      <span className="text-slate-400 block font-bold">Standard Thermodynamic Phase Boundaries ({corrosionPreset.pourbaixElement}-H₂O):</span>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded text-sky-300">
                          <strong>Immunity Zone</strong>
                          <span className="block text-slate-400 mt-0.5">E &lt; E_eq (Cathodically Safe)</span>
                        </div>
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-300">
                          <strong>Passivity Zone</strong>
                          <span className="block text-slate-400 mt-0.5">Dense Oxide Film Barrier</span>
                        </div>
                        <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300">
                          <strong>Corrosion Zone</strong>
                          <span className="block text-slate-400 mt-0.5">Soluble Metal Ions Dissolve</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {corrosionTech === "galvanic-mixed" && (
                  <div className="h-full flex flex-col justify-between p-4 space-y-4 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-400 block">Galvanic Acceleration Factor:</span>
                        <span
                          className={`text-3xl font-extrabold ${
                            galvanicCoupling.accelerationFactor > 3.0 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          ×{galvanicCoupling.accelerationFactor} Higher Penetration
                        </span>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                          galvanicCoupling.isSevereCoupling
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        }`}
                      >
                        {galvanicCoupling.isSevereCoupling ? "CRITICAL GALVANIC CORROSION" : "ACCEPTABLE COUPLING"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-[#0c1322] p-3.5 rounded-xl border border-[#1e2d46]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Anode Substrate:</span>
                        <span className="text-slate-200 font-bold">{corrosionPreset.name}</span>
                        <span className="text-slate-500 block text-[10px]">E° = {corrosionPreset.standardE0_V} V</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Coupled Cathode:</span>
                        <span className="text-slate-200 font-bold">{cathodePreset.name}</span>
                        <span className="text-slate-500 block text-[10px]">E° = {cathodePreset.standardE0_V} V</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Coupled Corrosion Rate:</span>
                        <span className="text-rose-300 font-bold">{galvanicCoupling.coupledCR_mm_yr} mm/yr</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Galvanic Potential Driving Force:</span>
                        <span className="text-amber-300 font-bold">ΔE = {galvanicCoupling.deltaE_V} V</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 leading-relaxed bg-[#090e18] p-3 rounded-lg border border-[#1e2d46]">
                      ⚠️ <strong>Aerospace Galvanic Rule:</strong> In aircraft structures, never couple carbon fiber
                      composites (CFRP) or copper directly to Aluminum 7075 or steel without a dielectric isolation ply
                      (e.g., fiberglass scrim cloth) and polysulfide sealant.
                    </div>
                  </div>
                )}

                {corrosionTech === "coating-eis" && corrosionEisPlotType === "nyquist" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        type="number"
                        dataKey="zReal"
                        name="Z' (Real)"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Real Impedance Z' (Ω)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="minusZImag"
                        name="-Z'' (Imag)"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "-Imaginary -Z'' (Ω)", angle: -90, position: "left", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                        formatter={(val: any, name: any) => [`${typeof val === 'number' ? val.toLocaleString() : val} Ω`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                      {(corrosionEisDisplayMode === "overlay" || corrosionEisDisplayMode === "model-only") && (
                        <Scatter
                          name="Coating / Substrate Model"
                          data={corrosionEISData}
                          line={{ stroke: "#10b981", strokeWidth: 2.5 }}
                          fill="#10b981"
                          shape="circle"
                          legendType="line"
                        />
                      )}
                      {corrosionUploadedLabData && (corrosionEisDisplayMode === "overlay" || corrosionEisDisplayMode === "lab-only") && (
                        <Scatter
                          name={`Lab Data: ${corrosionUploadedLabData.name}`}
                          data={corrosionUploadedLabData.points}
                          fill="#f59e0b"
                          shape="circle"
                          legendType="circle"
                        />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                )}

                {corrosionTech === "coating-eis" && corrosionEisPlotType === "bode" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={corrosionEISData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        dataKey="logF"
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "log₁₀(Frequency / Hz)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#10b981"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "|Z| Magnitude (Ω)", angle: -90, position: "left", offset: 0, fill: "#10b981", fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#a855f7"
                        tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                        label={{ value: "Phase (deg)", angle: 90, position: "right", offset: 0, fill: "#a855f7", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                      <Line yAxisId="left" type="monotone" dataKey="magnitudeZ" name="Model |Z| (Ω)" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="phaseDeg" name="Model Phase (°)" stroke="#a855f7" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bottom Telemetry & Diagnostics Summary */}
              {corrosionTech === "coating-eis" ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0c1322] p-3 rounded-xl border border-[#1e2d46]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Coating Pore R_pore:</span>
                      <span className="text-sky-300 font-bold">1.5 × 10⁸ Ω·cm²</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Coating Capacitance:</span>
                      <span className="text-purple-300 font-bold">0.35 nF/cm²</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Water Uptake Φ:</span>
                      <span className="text-emerald-300 font-bold">&lt; 1.2% vol</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Delamination Life:</span>
                      <span className="text-amber-300 font-bold">&gt; 15 Yrs (C5-M)</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#1e2d46] text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Recommended Coating System: <strong className="text-emerald-300">{corrosionPreset.coatingSuitability}</strong></span>
                    <span className="text-slate-500">ISO 12944-6 / ASTM D7805</span>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#060b13] rounded-xl border border-[#162032]">
                  <span className="text-slate-500 block text-[10px]">Penetration Rate:</span>
                  <span className="text-emerald-300 font-bold">{tafelKinetics.cr_mm_yr} mm/year</span>
                </div>
                <div className="p-3 bg-[#060b13] rounded-xl border border-[#162032]">
                  <span className="text-slate-500 block text-[10px]">Mass Loss Density:</span>
                  <span className="text-sky-300 font-bold">{tafelKinetics.massLoss_g_m2_day} g/m²·day</span>
                </div>
                <div className="p-3 bg-[#060b13] rounded-xl border border-[#162032]">
                  <span className="text-slate-500 block text-[10px]">Pitting Resistance PREN:</span>
                  <span className="text-amber-300 font-bold">{corrosionPreset.pren}</span>
                </div>
              </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 3: EQUIVALENT CIRCUIT STUDIO (ECM BUILDER)
         ========================================================================= */}
      {domain === "circuit-builder" && (
        <div className="space-y-4">
          <EquivalentCircuitBuilder />
        </div>
      )}

      {/* =========================================================================
          SECTION 4: PRESET CIRCUIT LIBRARY PANEL
         ========================================================================= */}
      {domain === "preset-library" && (
        <div className="space-y-4">
          <PresetCircuitLibraryPanel
            onLoadTopology={(topo) => {
              setDomain("circuit-builder");
            }}
            onRunAutoFit={(topo) => {
              setDomain("circuit-builder");
            }}
          />
        </div>
      )}

      {/* =========================================================================
          SECTION 4: CNLS EXPERIMENTAL DATA FITTER & IMPORTER
         ========================================================================= */}
      {domain === "cnls-fitter" && (
        <div className="space-y-4 rounded-2xl border border-[#162032] overflow-hidden min-h-[850px] flex flex-col">
          <CNLSFittingStudio
            currentTopology={STANDARD_CIRCUIT_PRESETS[0]}
            onApplyTopology={(fittedTopo) => {
              setDomain("circuit-builder");
            }}
          />
        </div>
      )}

      {/* =========================================================================
          SECTION 4B: EIS DATA UPLOAD & DEEP INSIGHTS STUDIO
         ========================================================================= */}
      {domain === "eis-upload-insights" && (
        <div className="space-y-4">
          <EISUploadInsightsStudio
            onNavigateToCNLS={() => {
              setDomain("cnls-fitter");
            }}
            onNavigateToBatteryLab={(dataset) => {
              if (dataset) setBatteryUploadedLabData(dataset);
              setDomain("battery");
              setBatteryTech("eis-impedance");
            }}
            onNavigateToCorrosionLab={(dataset) => {
              if (dataset) setCorrosionUploadedLabData(dataset);
              setDomain("corrosion");
              setCorrosionTech("coating-eis");
            }}
            onNavigateToPythonUpload={() => {
              setDomain("python-data-upload");
            }}
          />
        </div>
      )}

      {/* =========================================================================
          SECTION 4C: BATCH EIS & DEGRADATION TRACKER (3D WATERFALL & EOL)
         ========================================================================= */}
      {domain === "batch-degradation" && (
        <div className="space-y-4">
          <BatchEISDegradationTracker
            onSendToCNLS={(ds) => {
              setDomain("cnls-fitter");
            }}
            onSendToSingleEIS={(ds, dom) => {
              if (dom === "battery") {
                setBatteryUploadedLabData(ds);
                setDomain("battery");
                setBatteryTech("eis-impedance");
              } else {
                setCorrosionUploadedLabData(ds);
                setDomain("corrosion");
                setCorrosionTech("coating-eis");
              }
            }}
          />
        </div>
      )}

      {/* =========================================================================
          SECTION 5: EIS PHYSICAL VALIDATION & LIN-KK STUDIO
         ========================================================================= */}
      {domain === "physical-validation" && (
        <div className="space-y-4">
          <PhysicalValidationStudio />
        </div>
      )}

      {/* =========================================================================
          SECTION 6: REAL-TIME OCP & ASTM G59 LPR TRANSIENT STUDIO
         ========================================================================= */}
      {domain === "ocp-g59" && (
        <div className="space-y-4">
          <OCPAndASTMG59Studio />
        </div>
      )}

      {/* =========================================================================
          SECTION 6: DYNAMIC POURBAIX (E-pH-T-SALINITY) PHASE DIAGRAM GENERATOR
         ========================================================================= */}
      {domain === "pourbaix-studio" && (
        <div className="space-y-4">
          <DynamicPourbaixStudio />
        </div>
      )}

      {/* =========================================================================
          SECTION 6: MULTI-MATERIAL INTERFACE & DEGRADATION LAB
         ========================================================================= */}
      {domain === "multi-material" && (
        <div className="space-y-4">
          <MultiMaterialInterfaceLab />
        </div>
      )}

      {/* =========================================================================
          SECTION 7: TRANSMISSION LINE & POROUS TOPOLOGIES STUDIO
         ========================================================================= */}
      {domain === "transmission-line" && (
        <div className="space-y-4">
          <TransmissionLineStudio
            onExportToCNLS={(presetId, modelName, data) => {
              setDomain("cnls-fitter");
            }}
          />
        </div>
      )}

      {/* =========================================================================
          SECTION 8: SYNTHETIC NOISE & SENSOR ARTIFACT STRESS BENCHMARK
         ========================================================================= */}
      {domain === "synthetic-noise" && (
        <div className="space-y-4">
          <SyntheticNoiseStressStudio
            onExportToCNLS={(dataset, topo) => {
              setDomain("cnls-fitter");
            }}
          />
        </div>
      )}

      {/* =========================================================================
          SECTION 4: DUAL SYNTHESIS & CERTIFICATION REPORT HUB
         ========================================================================= */}
      {domain === "dual-overview" && (
        <div className="space-y-6">
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#162032] pb-4">
              <div>
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Dual Electrochemical Certification & Comparative Analysis
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Cross-Domain Interface comparing Solid-State Interfacial Transport vs Aqueous Faradaic Corrosion
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  ISO 14577 / ASTM G102 / USABC
                </span>
              </div>
            </div>

            {/* Side-by-Side Dual Analysis Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Battery Electrochemical Summary Card */}
              <div className="p-5 rounded-xl bg-[#050810] border border-sky-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider flex items-center gap-2">
                    <BatteryCharging className="w-4 h-4" />
                    Battery Intercalation Physics
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{batteryPreset.name}</span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">Nominal Cell Voltage:</span>
                    <span className="font-bold text-white">{batteryPreset.nominalVoltage} V</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">Solid Li⁺ Diffusivity (D_Li):</span>
                    <span className="font-bold text-sky-300">{calculatedDLi} cm²/s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">Charge Transfer Resistance (R_ct):</span>
                    <span className="font-bold text-emerald-300">{(batteryPreset.rCt_ohm * agingFactor.rCt).toFixed(2)} Ω</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">SEI Interfacial Resistance (R_sei):</span>
                    <span className="font-bold text-amber-300">{(batteryPreset.rSei_ohm * agingFactor.rSei).toFixed(2)} Ω</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Fast-Charge Safety Status:</span>
                    <span className={`font-bold ${platingSafety.isPlatingRisk ? "text-rose-400" : "text-emerald-400"}`}>
                      {platingSafety.isPlatingRisk ? "PLATING DANGER" : "SAFE INTERCALATION"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Corrosion Faradaic Summary Card */}
              <div className="p-5 rounded-xl bg-[#050810] border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Corrosion Degradation Kinetics
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{corrosionPreset.name}</span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">Corrosion Potential (E_corr):</span>
                    <span className="font-bold text-white">{tafelKinetics.eCorr_V} V vs SHE</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">Corrosion Current Density (i_corr):</span>
                    <span className="font-bold text-sky-300">{tafelKinetics.iCorr_uA_cm2} µA/cm²</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">Polarization Resistance (R_p):</span>
                    <span className="font-bold text-emerald-300">{tafelKinetics.rp_Ohm_cm2.toLocaleString()} Ω·cm²</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#162032]">
                    <span className="text-slate-500">Faraday Penetration Rate:</span>
                    <span className="font-bold text-amber-300">{tafelKinetics.cr_mm_yr} mm/year</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Pourbaix Phase Status:</span>
                    <span className="font-bold text-emerald-400">{pourbaixState.zone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Standard Notice & Scientific Basis */}
            <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2 text-xs font-mono">
              <span className="text-slate-300 font-bold block">
                🔬 Unified Theoretical Foundations:
              </span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Both battery intercalation and aqueous corrosion share the same foundational Butler-Volmer electrochemical
                kinetics: η = β·log(i / i₀). In battery systems, low charge-transfer resistance R_ct and high
                diffusion coefficient D_Li⁺ maximize energy efficiency. In corrosion protection, high polarization
                resistance R_p and dense passive oxide barriers (e.g. Al₂O₃, TiO₂, Cr₂O₃)
                minimize parasitic Faradaic current.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 14: PYTHON DATA INGESTION & SCRIPT STUDIO
         ========================================================================= */}
      {domain === "python-data-upload" && (
        <div className="space-y-4">
          <PythonBatteryCorrosionUploadStudio
            onSendToBatteryEIS={(ds) => {
              setBatteryUploadedLabData(ds);
              setDomain("battery");
              setBatteryTech("eis-impedance");
            }}
            onSendToCorrosionEIS={(ds) => {
              setCorrosionUploadedLabData(ds);
              setDomain("corrosion");
              setCorrosionTech("coating-eis");
            }}
            onSendToCNLS={(d) => {
              setDomain("cnls-fitter");
            }}
            onSendToEISInsights={(d) => {
              setDomain("eis-upload-insights");
            }}
          />
        </div>
      )}
    </div>
  );
}

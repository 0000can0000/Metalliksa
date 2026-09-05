import React, { useState, useMemo } from "react";
import {
  Layers,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  Info,
  Download,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
  BarChart3,
  Waves,
  Gauge,
  Compass,
  Flame,
  ShieldCheck,
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
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";

// ==========================================
// 1. TYPES & PRESETS
// ==========================================

export type TLMModelType =
  | "bisquert-open"
  | "bisquert-short"
  | "dual-rail-tlm"
  | "finite-warburg-ws"
  | "finite-warburg-wo"
  | "gerischer"
  | "havriliak-negami";

export interface TLMMaterialPreset {
  id: string;
  name: string;
  category: "Battery" | "Supercapacitor" | "DSSC" | "Solid-State" | "SOFC";
  modelType: TLMModelType;
  description: string;
  thickness_um: number;
  porosity: number;
  tortuosity: number;
  rs: number;
  rion: number;
  rct: number;
  qd: number;
  alpha: number;
  re?: number;
  tau?: number;
  beta?: number;
  rg?: number;
}

export const TLM_MATERIAL_PRESETS: TLMMaterialPreset[] = [
  {
    id: "nmc-thick-cathode",
    name: "NMC811 High-Loading Battery Cathode (4.2 mAh/cm²)",
    category: "Battery",
    modelType: "bisquert-open",
    description: "Thick calendered composite porous cathode with tortuous electrolyte pores and blocking current collector substrate.",
    thickness_um: 75,
    porosity: 0.30,
    tortuosity: 2.8,
    rs: 1.2,
    rion: 85.0,
    rct: 320.0,
    qd: 180e-6,
    alpha: 0.92,
    re: 2.5,
  },
  {
    id: "lfp-nanoporous",
    name: "LFP / Carbon Composite Nanoporous Electrode",
    category: "Battery",
    modelType: "bisquert-open",
    description: "High rate LiFePO4 electrode with fine pore distribution and conductive carbon black network.",
    thickness_um: 45,
    porosity: 0.38,
    tortuosity: 2.1,
    rs: 0.8,
    rion: 42.0,
    rct: 140.0,
    qd: 350e-6,
    alpha: 0.94,
    re: 1.0,
  },
  {
    id: "activated-carbon-edlc",
    name: "Activated Carbon EDLC Supercapacitor (Organic Electrolyte)",
    category: "Supercapacitor",
    modelType: "bisquert-open",
    description: "High surface area (>1800 m²/g) electric double-layer capacitor with negligible Faradaic reaction (Rct → ∞).",
    thickness_um: 110,
    porosity: 0.62,
    tortuosity: 1.9,
    rs: 0.45,
    rion: 24.0,
    rct: 150000.0,
    qd: 1800e-6,
    alpha: 0.96,
    re: 0.5,
  },
  {
    id: "dssc-tio2-solar",
    name: "Mesoporous TiO2 Dye-Sensitized Solar Cell (DSSC)",
    category: "DSSC",
    modelType: "bisquert-short",
    description: "Transparent conductive glass (FTO) transmissive boundary with electron transport in nanoparticle network and triiodide recombination.",
    thickness_um: 14,
    porosity: 0.50,
    tortuosity: 1.6,
    rs: 12.0,
    rion: 48.0, // R_transport
    rct: 240.0, // R_recombination
    qd: 450e-6, // C_chemical
    alpha: 0.95,
  },
  {
    id: "thin-film-lico2",
    name: "Thin-Film LiCoO2 Micro-Battery (Finite Reflective Warburg)",
    category: "Battery",
    modelType: "finite-warburg-ws",
    description: "Vacuum-deposited thin film cathode with bounded Li+ intercalation diffusion and impermeable substrate.",
    thickness_um: 3.5,
    porosity: 0.05,
    tortuosity: 1.1,
    rs: 4.5,
    rion: 150.0, // Rd
    rct: 65.0,
    qd: 25e-6,
    alpha: 0.90,
    tau: 1.8, // tau_d
  },
  {
    id: "sofc-lscf-cathode",
    name: "LSCF SOFC Cathode (750°C Mixed Ionic-Electronic Conductor)",
    category: "SOFC",
    modelType: "gerischer",
    description: "Coupled surface oxygen dissociation reaction with oxygen vacancy chemical diffusion in solid lattice.",
    thickness_um: 30,
    porosity: 0.35,
    tortuosity: 2.2,
    rs: 0.65,
    rion: 0,
    rct: 0,
    qd: 0,
    alpha: 0.98,
    rg: 2.4,
    tau: 0.015,
  },
  {
    id: "solid-peo-litfsi",
    name: "Solid PEO-LiTFSI Polymer Electrolyte (Havriliak-Negami)",
    category: "Solid-State",
    modelType: "havriliak-negami",
    description: "Dipolar and segmental chain relaxation in dry solid polymer electrolyte with asymmetric dielectric loss distribution.",
    thickness_um: 50,
    porosity: 0.0,
    tortuosity: 1.0,
    rs: 2.0,
    rion: 4800.0, // R0
    rct: 120.0,
    qd: 8e-6,
    alpha: 0.85,
    tau: 0.0002,
    beta: 0.74,
  },
];

// Complex math helpers
interface Complex {
  re: number;
  im: number;
}

function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

function cMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function cDiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) return { re: 1e12, im: 0 };
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
}

function cSqrt(a: Complex): Complex {
  const r = Math.sqrt(a.re * a.re + a.im * a.im);
  const theta = Math.atan2(a.im, a.re);
  const sqrtR = Math.sqrt(r);
  return {
    re: sqrtR * Math.cos(theta / 2),
    im: sqrtR * Math.sin(theta / 2),
  };
}

function cTanh(a: Complex): Complex {
  const denom = Math.cosh(2 * a.re) + Math.cos(2 * a.im);
  if (denom === 0) return { re: 1.0, im: 0.0 };
  return {
    re: Math.sinh(2 * a.re) / denom,
    im: Math.sin(2 * a.im) / denom,
  };
}

function cCoth(a: Complex): Complex {
  const th = cTanh(a);
  return cDiv({ re: 1, im: 0 }, th);
}

function cPow(a: Complex, p: number): Complex {
  const r = Math.sqrt(a.re * a.re + a.im * a.im);
  if (r === 0) return { re: 0, im: 0 };
  const theta = Math.atan2(a.im, a.re);
  const rPow = Math.pow(r, p);
  return {
    re: rPow * Math.cos(p * theta),
    im: rPow * Math.sin(p * theta),
  };
}

// ==========================================
// 2. TRANSMISSION LINE STUDIO COMPONENT
// ==========================================

export interface TransmissionLineStudioProps {
  onExportToCNLS?: (presetId: string, modelName: string, data: any[]) => void;
}

export const TransmissionLineStudio: React.FC<TransmissionLineStudioProps> = ({
  onExportToCNLS,
}) => {
  // Selected Model Type & Preset
  const [selectedModel, setSelectedModel] = useState<TLMModelType>("bisquert-open");
  const [activePresetId, setActivePresetId] = useState<string>("nmc-thick-cathode");

  // Physical Parameters
  const [rs, setRs] = useState<number>(1.2);
  const [rion, setRion] = useState<number>(85.0);
  const [rct, setRct] = useState<number>(320.0);
  const [qd, setQd] = useState<number>(180e-6);
  const [alpha, setAlpha] = useState<number>(0.92);
  const [reSolid, setReSolid] = useState<number>(0.0); // Electronic matrix rail
  const [enableDualRail, setEnableDualRail] = useState<boolean>(false);

  // Additional element parameters
  const [tau, setTau] = useState<number>(1.5);
  const [beta, setBeta] = useState<number>(0.74);
  const [rg, setRg] = useState<number>(2.5);

  // Electrode Microstructure Dimensions
  const [thicknessUm, setThicknessUm] = useState<number>(75);
  const [porosity, setPorosity] = useState<number>(0.30);
  const [electrodeAreaCm2, setElectrodeAreaCm2] = useState<number>(1.5);

  // Spatial Visualizer Frequency
  const [spatialLogFreq, setSpatialLogFreq] = useState<number>(2.0); // 10^2 = 100 Hz
  const spatialFreq = Math.pow(10, spatialLogFreq);

  // Active View Tab
  const [activeChartTab, setActiveChartTab] = useState<"nyquist" | "bode-mag" | "bode-phase" | "spatial-pore" | "dielectric">("nyquist");

  // Apply Material Preset
  const applyPreset = (preset: TLMMaterialPreset) => {
    setActivePresetId(preset.id);
    setSelectedModel(preset.modelType);
    setThicknessUm(preset.thickness_um);
    setPorosity(preset.porosity);
    setRs(preset.rs);
    setRion(preset.rion);
    setRct(preset.rct);
    setQd(preset.qd);
    setAlpha(preset.alpha);
    if (preset.re !== undefined) {
      setReSolid(preset.re);
      setEnableDualRail(preset.re > 0);
    } else {
      setEnableDualRail(false);
    }
    if (preset.tau !== undefined) setTau(preset.tau);
    if (preset.beta !== undefined) setBeta(preset.beta);
    if (preset.rg !== undefined) setRg(preset.rg);
  };

  // -------------------------------------------------------------
  // Calculate Impedance Frequency Spectrum (1 mHz to 1 MHz)
  // -------------------------------------------------------------
  const frequencyPoints = useMemo(() => {
    const points: Array<{
      freq: number;
      logFreq: number;
      omega: number;
      zReal: number;
      zImag: number;
      minusZImag: number;
      zMag: number;
      phaseDeg: number;
      epsImag: number; // Dielectric loss
    }> = [];

    // 7 decades: 10^-3 to 10^5 Hz, 10 points per decade
    const numPoints = 81;
    const fMinLog = -3.0;
    const fMaxLog = 5.0;

    for (let i = 0; i < numPoints; i++) {
      const logF = fMinLog + (i / (numPoints - 1)) * (fMaxLog - fMinLog);
      const freq = Math.pow(10, logF);
      const omega = 2 * Math.PI * freq;
      const w = Math.max(1e-9, omega);

      let zModel: Complex = { re: 0, im: 0 };

      // Evaluate according to selectedModel
      if (selectedModel === "bisquert-open") {
        // Interfacial admittance y_int = 1/Rct + Qd*(jw)^alpha
        const phi = (alpha * Math.PI) / 2;
        const qwn = qd * Math.pow(w, alpha);
        const yInt: Complex = {
          re: (rct > 0 ? 1 / rct : 0) + qwn * Math.cos(phi),
          im: qwn * Math.sin(phi),
        };
        const zeta = cDiv({ re: 1, im: 0 }, yInt);

        if (enableDualRail && reSolid > 0) {
          // Dual rail transmission line with finite electronic rail Re
          const rSum = rion + reSolid;
          const gamma = cSqrt(cDiv({ re: rSum, im: 0 }, zeta));
          const term1 = (rion * reSolid) / rSum;
          const cothG = cCoth(gamma);
          const sinhG = cDiv({ re: 1, im: 0 }, cTanh(gamma)); // approx
          const term2 = cMul(
            { re: (rion * rion + reSolid * reSolid) / rSum, im: 0 },
            cDiv(cothG, gamma)
          );
          zModel = cAdd({ re: term1, im: 0 }, term2);
        } else {
          // Single rail Bisquert Open: Z = sqrt(Rion * zeta) * coth(sqrt(Rion / zeta))
          const gamma = cSqrt(cDiv({ re: rion, im: 0 }, zeta));
          const zChar = cSqrt(cMul({ re: rion, im: 0 }, zeta));
          if (Math.abs(gamma.re) < 1e-8 && Math.abs(gamma.im) < 1e-8) {
            zModel = { re: rion / 3 + zeta.re, im: zeta.im };
          } else {
            const cothG = cCoth(gamma);
            zModel = cMul(zChar, cothG);
          }
        }
      } else if (selectedModel === "bisquert-short") {
        // Bisquert Short: Z = sqrt(Rion * zeta) * tanh(sqrt(Rion / zeta))
        const phi = (alpha * Math.PI) / 2;
        const qwn = qd * Math.pow(w, alpha);
        const yInt: Complex = {
          re: (rct > 0 ? 1 / rct : 0) + qwn * Math.cos(phi),
          im: qwn * Math.sin(phi),
        };
        const zeta = cDiv({ re: 1, im: 0 }, yInt);
        const gamma = cSqrt(cDiv({ re: rion, im: 0 }, zeta));
        const zChar = cSqrt(cMul({ re: rion, im: 0 }, zeta));

        if (Math.abs(gamma.re) < 1e-8 && Math.abs(gamma.im) < 1e-8) {
          zModel = zeta;
        } else {
          const tanhG = cTanh(gamma);
          zModel = cMul(zChar, tanhG);
        }
      } else if (selectedModel === "finite-warburg-ws") {
        // Reflective Warburg: Z = Rd * coth(sqrt(jw tau)) / sqrt(jw tau)
        const jwTau: Complex = { re: 0, im: w * tau };
        const arg = cSqrt(jwTau);
        if (Math.abs(arg.re) < 1e-8 && Math.abs(arg.im) < 1e-8) {
          zModel = { re: rion / 3, im: -1 / (w * (tau / rion) + 1e-30) };
        } else {
          const cothArg = cCoth(arg);
          const divArg = cDiv(cothArg, arg);
          zModel = { re: rion * divArg.re, im: rion * divArg.im };
        }
        // Parallel with Rct and CPE_dl
        const zFaradaic = cAdd({ re: rct, im: 0 }, zModel);
        const phi = (alpha * Math.PI) / 2;
        const qwn = qd * Math.pow(w, alpha);
        const zCpe = cDiv({ re: 1, im: 0 }, { re: qwn * Math.cos(phi), im: qwn * Math.sin(phi) });
        zModel = cDiv(cMul(zFaradaic, zCpe), cAdd(zFaradaic, zCpe));
      } else if (selectedModel === "finite-warburg-wo") {
        // Transmissive Warburg: Z = Rd * tanh(sqrt(jw tau)) / sqrt(jw tau)
        const jwTau: Complex = { re: 0, im: w * tau };
        const arg = cSqrt(jwTau);
        if (Math.abs(arg.re) < 1e-8 && Math.abs(arg.im) < 1e-8) {
          zModel = { re: rion, im: 0 };
        } else {
          const tanhArg = cTanh(arg);
          const divArg = cDiv(tanhArg, arg);
          zModel = { re: rion * divArg.re, im: rion * divArg.im };
        }
        const zFaradaic = cAdd({ re: rct, im: 0 }, zModel);
        const phi = (alpha * Math.PI) / 2;
        const qwn = qd * Math.pow(w, alpha);
        const zCpe = cDiv({ re: 1, im: 0 }, { re: qwn * Math.cos(phi), im: qwn * Math.sin(phi) });
        zModel = cDiv(cMul(zFaradaic, zCpe), cAdd(zFaradaic, zCpe));
      } else if (selectedModel === "gerischer") {
        // Gerischer: Z = Rg / (1 + (jw tau)^alpha)^0.5
        const jwTau: Complex = { re: 0, im: w * tau };
        const jwPow = cPow(jwTau, alpha);
        const onePlus = cAdd({ re: 1, im: 0 }, jwPow);
        const sqrtTerm = cSqrt(onePlus);
        zModel = cDiv({ re: rg, im: 0 }, sqrtTerm);
      } else if (selectedModel === "havriliak-negami") {
        // HN: Z = R0 / ((1 + (jw tau)^alpha)^beta)
        const jwTau: Complex = { re: 0, im: w * tau };
        const inner = cAdd({ re: 1, im: 0 }, cPow(jwTau, alpha));
        const denom = cPow(inner, beta);
        const zHn = cDiv({ re: rion, im: 0 }, denom);
        // Add interfacial loop
        const zInt = cDiv(
          { re: rct, im: 0 },
          cAdd({ re: 1, im: 0 }, { re: 0, im: w * rct * qd })
        );
        zModel = cAdd(zHn, zInt);
      }

      const zTotal = cAdd({ re: rs, im: 0 }, zModel);
      const mag = Math.sqrt(zTotal.re * zTotal.re + zTotal.im * zTotal.im);
      const phase = (Math.atan2(zTotal.im, zTotal.re) * 180) / Math.PI;
      const eps0 = 8.854e-14; // F/cm
      const epsImag = Math.max(1e-4, Math.abs(zTotal.im) / (w * eps0 * (electrodeAreaCm2 / (thicknessUm * 1e-4))));

      points.push({
        freq: +freq.toExponential(2),
        logFreq: +logF.toFixed(2),
        omega: +omega.toFixed(1),
        zReal: +zTotal.re.toFixed(3),
        zImag: +zTotal.im.toFixed(3),
        minusZImag: +(-zTotal.im).toFixed(3),
        zMag: +mag.toFixed(3),
        phaseDeg: +phase.toFixed(2),
        epsImag: +epsImag.toFixed(2),
      });
    }

    return points;
  }, [
    selectedModel,
    rs,
    rion,
    rct,
    qd,
    alpha,
    reSolid,
    enableDualRail,
    tau,
    beta,
    rg,
    electrodeAreaCm2,
    thicknessUm,
  ]);

  // -------------------------------------------------------------
  // Calculate Spatial Potential & Current Distribution along Pore (x/L)
  // -------------------------------------------------------------
  const spatialPoreProfile = useMemo(() => {
    const w = 2 * Math.PI * spatialFreq;
    const phi = (alpha * Math.PI) / 2;
    const qwn = qd * Math.pow(w, alpha);
    const yInt: Complex = {
      re: (rct > 0 ? 1 / rct : 0) + qwn * Math.cos(phi),
      im: qwn * Math.sin(phi),
    };
    const zeta = cDiv({ re: 1, im: 0 }, yInt);
    const gammaL = cSqrt(cDiv({ re: rion, im: 0 }, zeta));

    // AC penetration depth: lambda / L = 1 / |gammaL|
    const gammaMag = Math.sqrt(gammaL.re * gammaL.re + gammaL.im * gammaL.im);
    const lambdaNormalized = gammaMag > 1e-6 ? 1.0 / gammaMag : 1.0;
    const lambdaUm = Math.min(thicknessUm, lambdaNormalized * thicknessUm);

    const profile: Array<{
      xNormalized: number;
      depthUm: number;
      potentialRatio: number; // |Phi(x) / Phi_0|
      ionicCurrentRatio: number; // |I_ion(x) / I_0|
      faradaicDensityRatio: number; // |j_f(x) / j_0|
    }> = [];

    const numSlices = 21;
    for (let i = 0; i < numSlices; i++) {
      const xNorm = i / (numSlices - 1); // 0 = pore mouth, 1 = current collector
      const depthUm = xNorm * thicknessUm;

      let phiRatio = 1.0;
      let iRatio = 1.0 - xNorm;
      let jRatio = 1.0;

      if (selectedModel === "bisquert-open") {
        // Phi(x) / Phi_0 = cosh( (1 - x)*gammaL ) / cosh( gammaL )
        const argX: Complex = { re: (1 - xNorm) * gammaL.re, im: (1 - xNorm) * gammaL.im };
        const coshX: Complex = {
          re: Math.cosh(argX.re) * Math.cos(argX.im),
          im: Math.sinh(argX.re) * Math.sin(argX.im),
        };
        const coshL: Complex = {
          re: Math.cosh(gammaL.re) * Math.cos(gammaL.im),
          im: Math.sinh(gammaL.re) * Math.sin(gammaL.im),
        };
        const pot = cDiv(coshX, coshL);
        phiRatio = Math.sqrt(pot.re * pot.re + pot.im * pot.im);

        // I_ion(x) / I_0 = sinh( (1 - x)*gammaL ) / sinh( gammaL )
        const sinhX: Complex = {
          re: Math.sinh(argX.re) * Math.cos(argX.im),
          im: Math.cosh(argX.re) * Math.sin(argX.im),
        };
        const sinhL: Complex = {
          re: Math.sinh(gammaL.re) * Math.cos(gammaL.im),
          im: Math.cosh(gammaL.re) * Math.sin(gammaL.im),
        };
        const cur = cDiv(sinhX, sinhL);
        iRatio = Math.sqrt(cur.re * cur.re + cur.im * cur.im);
        jRatio = phiRatio; // local current density is proportional to local overpotential
      } else {
        // Short / Transmissive: Phi(x)/Phi_0 = sinh((1-x)*gammaL) / sinh(gammaL)
        const argX: Complex = { re: (1 - xNorm) * gammaL.re, im: (1 - xNorm) * gammaL.im };
        const sinhX: Complex = {
          re: Math.sinh(argX.re) * Math.cos(argX.im),
          im: Math.cosh(argX.re) * Math.sin(argX.im),
        };
        const sinhL: Complex = {
          re: Math.sinh(gammaL.re) * Math.cos(gammaL.im),
          im: Math.cosh(gammaL.re) * Math.sin(gammaL.im),
        };
        const pot = cDiv(sinhX, sinhL);
        phiRatio = Math.sqrt(pot.re * pot.re + pot.im * pot.im);
        iRatio = phiRatio;
        jRatio = phiRatio;
      }

      profile.push({
        xNormalized: +xNorm.toFixed(2),
        depthUm: +depthUm.toFixed(1),
        potentialRatio: +Math.max(0, Math.min(1.0, phiRatio)).toFixed(3),
        ionicCurrentRatio: +Math.max(0, Math.min(1.0, iRatio)).toFixed(3),
        faradaicDensityRatio: +Math.max(0, Math.min(1.0, jRatio)).toFixed(3),
      });
    }

    return {
      profile,
      lambdaUm: +lambdaUm.toFixed(2),
      lambdaNormalized: +lambdaNormalized.toFixed(3),
      gammaMag: +gammaMag.toFixed(3),
    };
  }, [spatialFreq, selectedModel, rion, rct, qd, alpha, thicknessUm]);

  // -------------------------------------------------------------
  // Physical Metrics & Diagnostics Extraction
  // -------------------------------------------------------------
  const physicalMetrics = useMemo(() => {
    const lCm = thicknessUm * 1e-4;
    const aCm2 = electrodeAreaCm2;

    // Effective pore ionic conductivity: kappa_eff = L / (A * R_ion)
    const kappaEff_mS_cm = rion > 0 ? (lCm / (aCm2 * rion)) * 1000 : 0;

    // Estimated bulk liquid electrolyte conductivity: kappa_0 = kappa_eff * (tortuosity / porosity)
    const tortuosity = porosity > 0 ? Math.pow(porosity, -0.5) : 2.5;
    const macMullin = porosity > 0 ? tortuosity / porosity : 10.0;
    const kappa0_mS_cm = kappaEff_mS_cm * macMullin;

    // High frequency 45° knee frequency: f_knee = 1 / (2 * pi * R_ion * C_d)
    const fKneeHz = rion > 0 && qd > 0 ? 1 / (2 * Math.PI * rion * qd) : 0;

    // Low-frequency real-axis intercept: R_intercept = R_s + R_ion / 3
    const rLowFreqIntercept = rs + rion / 3;

    // Specific areal capacitance: C_areal = Qd / A (µF/cm²)
    const cAreal_uF_cm2 = qd > 0 && aCm2 > 0 ? (qd / aCm2) * 1e6 : 0;

    return {
      kappaEff_mS_cm: +kappaEff_mS_cm.toFixed(3),
      kappa0_mS_cm: +kappa0_mS_cm.toFixed(2),
      macMullin: +macMullin.toFixed(2),
      tortuosity: +tortuosity.toFixed(2),
      fKneeHz: +fKneeHz.toFixed(1),
      rLowFreqIntercept: +rLowFreqIntercept.toFixed(2),
      cAreal_uF_cm2: +cAreal_uF_cm2.toFixed(1),
    };
  }, [thicknessUm, electrodeAreaCm2, rion, porosity, qd, rs]);

  // -------------------------------------------------------------
  // Export Synthetic Dataset to CNLS Fitting Studio or CSV
  // -------------------------------------------------------------
  const handleExportCSV = () => {
    let csv = "Frequency (Hz),Z_Real (Ohm),-Z_Imag (Ohm),Z_Mag (Ohm),Phase (deg)\n";
    frequencyPoints.forEach((pt) => {
      csv += `${pt.freq},${pt.zReal},${pt.minusZImag},${pt.zMag},${pt.phaseDeg}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TLM_${selectedModel}_spectrum.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToCNLS = () => {
    if (onExportToCNLS) {
      const dataForFit = frequencyPoints.map((p) => ({
        frequency: p.freq,
        zReal: p.zReal,
        zImag: p.zImag,
        minusZImag: p.minusZImag,
        zMag: p.zMag,
        phaseDeg: p.phaseDeg,
      }));
      onExportToCNLS(activePresetId, `TransmissionLine_${selectedModel}`, dataForFit);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              Specialized Electrochemical Topologies
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Transmission Line & Porous Electrode Studio
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Bisquert de Levie transmission line models, finite-length transmissive/reflective diffusion, Gerischer reaction-coupled kinetics, and non-Debye Havriliak–Negami dielectric relaxations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Export Spectrum (CSV)
            </button>
            {onExportToCNLS && (
              <button
                onClick={handleSendToCNLS}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition"
              >
                <Sparkles className="w-4 h-4" />
                Transfer to CNLS Fitter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Model Archetype Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Select Topology Archetype
          </div>
          <span className="text-xs text-slate-400">
            Current: <strong className="text-indigo-300 uppercase">{selectedModel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {[
            { id: "bisquert-open", label: "Bisquert Open", desc: "Porous Cathode / Supercapacitor (Blocking)", badge: "TLMo" },
            { id: "bisquert-short", label: "Bisquert Short", desc: "DSSC / Fuel Cell Membrane (Transmissive)", badge: "TLMs" },
            { id: "finite-warburg-ws", label: "Reflective Ws", desc: "Thin-Film Intercalation (coth)", badge: "Ws" },
            { id: "finite-warburg-wo", label: "Open Nernst Wo", desc: "Transmissive Diffusion (tanh)", badge: "Wo" },
            { id: "gerischer", label: "Gerischer (G)", desc: "ORR Reaction + Solid Diffusion", badge: "G" },
            { id: "havriliak-negami", label: "Havriliak-Negami", desc: "Solid Polymer & Ceramic Dielectric", badge: "HN" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id as TLMModelType)}
              className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                selectedModel === m.id
                  ? "bg-indigo-950/50 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{m.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-indigo-400 border border-slate-700">
                    {m.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Material Presets Carousel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3 text-sm font-bold text-white">
          <Waves className="w-4 h-4 text-emerald-400" />
          Pre-Configured Physical Material Systems
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TLM_MATERIAL_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`p-3.5 rounded-xl text-left border transition ${
                activePresetId === p.id
                  ? "bg-emerald-950/40 border-emerald-500 text-white shadow-sm"
                  : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-100">{p.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {p.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">{p.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                <span>L: {p.thickness_um} µm</span>
                <span>ε: {p.porosity}</span>
                <span>R_ion: {p.rion} Ω</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Grid: Parameters & Interactive Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Sliders & Electrode Physics (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Physical Model Parameters
              </div>
              <span className="text-xs font-mono text-indigo-400">Live Solved</span>
            </div>

            {/* Parameter Sliders */}
            <div className="space-y-4 text-xs">
              {/* Ohmic Rs */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Bulk Solution Ohmic R_s</span>
                  <span className="font-mono text-indigo-300 font-semibold">{rs.toFixed(2)} Ω</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={25.0}
                  step={0.05}
                  value={rs}
                  onChange={(e) => setRs(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* R_ion / Transport Resistance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Pore Ionic Resistance (R_ion / R_tr)</span>
                  <span className="font-mono text-indigo-300 font-semibold">{rion.toFixed(1)} Ω</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={500.0}
                  step={1.0}
                  value={rion}
                  onChange={(e) => setRion(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Interfacial Faradaic Rct */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Charge Transfer R_ct (Pore Walls)</span>
                  <span className="font-mono text-indigo-300 font-semibold">{rct >= 10000 ? "∞ (EDLC)" : `${rct.toFixed(1)} Ω`}</span>
                </div>
                <input
                  type="range"
                  min={10.0}
                  max={2500.0}
                  step={10.0}
                  value={rct > 2500 ? 2500 : rct}
                  onChange={(e) => setRct(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Interfacial Capacitance Qd */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Interfacial Double Layer (Q_d)</span>
                  <span className="font-mono text-indigo-300 font-semibold">{(qd * 1e6).toFixed(1)} µS·sⁿ</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={1500}
                  step={10}
                  value={qd * 1e6}
                  onChange={(e) => setQd(parseFloat(e.target.value) * 1e-6)}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Dispersion Exponent alpha */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Pore Wall CPE Exponent (α)</span>
                  <span className="font-mono text-indigo-300 font-semibold">{alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.0}
                  step={0.01}
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Dual Rail Electronic Conduction Toggle */}
              {selectedModel === "bisquert-open" && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Dual-Rail Electronic Conduction (R_e)</span>
                    <button
                      type="button"
                      onClick={() => setEnableDualRail(!enableDualRail)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                        enableDualRail ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {enableDualRail ? "ACTIVE" : "OFF"}
                    </button>
                  </div>
                  {enableDualRail && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Solid Electronic Matrix R_e</span>
                        <span className="font-mono text-indigo-300">{reSolid.toFixed(1)} Ω</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={20.0}
                        step={0.1}
                        value={reSolid}
                        onChange={(e) => setReSolid(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Finite Warburg Tau */}
              {(selectedModel === "finite-warburg-ws" || selectedModel === "finite-warburg-wo" || selectedModel === "gerischer") && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Diffusion / Reaction Time Constant (τ)</span>
                    <span className="font-mono text-indigo-300 font-semibold">{tau.toFixed(3)} s</span>
                  </div>
                  <input
                    type="range"
                    min={0.005}
                    max={10.0}
                    step={0.005}
                    value={tau}
                    onChange={(e) => setTau(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Havriliak-Negami Beta */}
              {selectedModel === "havriliak-negami" && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Asymmetry Skewness Factor (β)</span>
                    <span className="font-mono text-indigo-300 font-semibold">{beta.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={1.0}
                    step={0.02}
                    value={beta}
                    onChange={(e) => setBeta(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Electrode Geometry Microstructure Controls */}
            <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
              <span className="font-semibold text-slate-300 block">Electrode Microstructure Inputs</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Thickness (L, µm)</label>
                  <input
                    type="number"
                    value={thicknessUm}
                    onChange={(e) => setThicknessUm(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Porosity (ε_p)</label>
                  <input
                    type="number"
                    step={0.05}
                    min={0.05}
                    max={0.95}
                    value={porosity}
                    onChange={(e) => setPorosity(Math.max(0.01, Math.min(0.99, parseFloat(e.target.value) || 0.3)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Physical Parameter Extraction Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Extracted Physical Properties
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Effective Pore Cond. (κ_eff)</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{physicalMetrics.kappaEff_mS_cm} mS/cm</span>
              </div>
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Liquid Bulk Cond. (κ_0)</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{physicalMetrics.kappa0_mS_cm} mS/cm</span>
              </div>
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">MacMullin Number (N_M)</span>
                <span className="text-sm font-bold font-mono text-indigo-300">{physicalMetrics.macMullin}</span>
              </div>
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">45° Knee Frequency</span>
                <span className="text-sm font-bold font-mono text-indigo-300">{physicalMetrics.fKneeHz} Hz</span>
              </div>
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Low-Freq Real Intercept</span>
                <span className="text-sm font-bold font-mono text-amber-300">{physicalMetrics.rLowFreqIntercept} Ω</span>
              </div>
              <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Specific Areal Cap.</span>
                <span className="text-sm font-bold font-mono text-cyan-300">{physicalMetrics.cAreal_uF_cm2} µF/cm²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Graphs & De Levie Spatial Pore Depth Visualizer (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart Header & Navigation Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {[
                  { id: "nyquist", label: "Nyquist (-Z'' vs Z')" },
                  { id: "bode-mag", label: "Bode Magnitude" },
                  { id: "bode-phase", label: "Bode Phase" },
                  { id: "spatial-pore", label: "Pore Depth Visualizer" },
                  { id: "dielectric", label: "Dielectric Loss (ε'')" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChartTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeChartTab === tab.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Solved: 1 mHz - 100 kHz (81 points)
              </div>
            </div>

            {/* View 1: Nyquist Plot */}
            {activeChartTab === "nyquist" && (
              <div className="space-y-3">
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={frequencyPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="zReal"
                        name="Z' (Ω)"
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "Real Impedance Z' (Ω)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                      />
                      <YAxis
                        dataKey="minusZImag"
                        name="-Z'' (Ω)"
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "-Imaginary Impedance -Z'' (Ω)", angle: -90, position: "left", fill: "#94a3b8", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                        formatter={(val: any, name: string) => [`${val} Ω`, name === "minusZImag" ? "-Z''" : name]}
                        labelFormatter={(label) => `Z' = ${label} Ω`}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ color: "#cbd5e1", fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="minusZImag"
                        name={`${selectedModel.toUpperCase()} Response`}
                        stroke="#818cf8"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: "#818cf8" }}
                        activeDot={{ r: 6, fill: "#c7d2fe" }}
                      />
                      <ReferenceLine x={rs} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Rs Intercept", fill: "#f43f5e", fontSize: 10 }} />
                      <ReferenceLine x={physicalMetrics.rLowFreqIntercept} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Rs + Rion/3", fill: "#10b981", fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>
                    💡 <strong>De Levie Signature:</strong> At high frequencies, a 45° line appears where |Z&apos;| ≈ |-Z&apos;&apos;| ≈ √(R_ion / (2·ω·C_d)).
                  </span>
                  <span className="font-mono text-indigo-400">f_knee = {physicalMetrics.fKneeHz} Hz</span>
                </div>
              </div>
            )}

            {/* View 2: Bode Magnitude */}
            {activeChartTab === "bode-mag" && (
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={frequencyPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="logFreq"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "log10( Frequency / Hz )", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="zMag"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "|Z| (Ω)", angle: -90, position: "left", fill: "#94a3b8", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                      formatter={(val: any) => [`${val} Ω`, "|Z| Magnitude"]}
                      labelFormatter={(label) => `10^${label} Hz`}
                    />
                    <Line type="monotone" dataKey="zMag" name="|Z| vs Frequency" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* View 3: Bode Phase */}
            {activeChartTab === "bode-phase" && (
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={frequencyPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="logFreq"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "log10( Frequency / Hz )", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="phaseDeg"
                      stroke="#94a3b8"
                      domain={[-95, 10]}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "Phase Angle θ (°)", angle: -90, position: "left", fill: "#94a3b8", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                      formatter={(val: any) => [`${val}°`, "Phase Angle"]}
                      labelFormatter={(label) => `10^${label} Hz`}
                    />
                    <ReferenceLine y={-45} stroke="#eab308" strokeDasharray="3 3" label={{ value: "-45° TLM Phase", fill: "#eab308", fontSize: 10 }} />
                    <ReferenceLine y={-90} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "-90° Ideal Cap", fill: "#f43f5e", fontSize: 10 }} />
                    <Line type="monotone" dataKey="phaseDeg" name="Phase Angle" stroke="#a855f7" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* View 4: De Levie Spatial Pore Depth Profile */}
            {activeChartTab === "spatial-pore" && (
              <div className="space-y-4">
                {/* Frequency Slider for Spatial Penetration */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-400" />
                      AC Penetration Frequency
                    </span>
                    <span className="text-xs text-slate-400 block font-mono">
                      Current: <strong>{spatialFreq >= 1000 ? `${(spatialFreq / 1000).toFixed(1)} kHz` : `${spatialFreq.toFixed(1)} Hz`}</strong>
                    </span>
                  </div>

                  <div className="flex-1 max-w-xs space-y-1">
                    <input
                      type="range"
                      min={-2.0}
                      max={5.0}
                      step={0.1}
                      value={spatialLogFreq}
                      onChange={(e) => setSpatialLogFreq(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.01 Hz</span>
                      <span>100 Hz</span>
                      <span>100 kHz</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-indigo-950/50 border border-indigo-500/30 rounded-lg text-right">
                    <span className="text-[10px] text-indigo-300 block">AC Penetration Depth (λ)</span>
                    <span className="text-sm font-bold font-mono text-white">{spatialPoreProfile.lambdaUm} µm</span>
                  </div>
                </div>

                {/* Spatial Distribution Curves (x / L) */}
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spatialPoreProfile.profile} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="depthUm"
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "Pore Depth x (µm) [0 = Pore Mouth, End = Current Collector]", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 1.05]}
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "Normalized Amplitude (0 to 1)", angle: -90, position: "left", fill: "#94a3b8", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                        formatter={(val: any, name: string) => [`${(val * 100).toFixed(1)}%`, name]}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ color: "#cbd5e1", fontSize: "12px" }} />
                      <Area
                        type="monotone"
                        dataKey="potentialRatio"
                        name="Local Potential Drop |ΔΦ(x) / ΔΦ_0|"
                        stroke="#818cf8"
                        fill="#818cf8"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="ionicCurrentRatio"
                        name="Ionic Current Fraction |I_ion(x) / I_0|"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 2D Cutaway Pore Schematic Animation */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <span>De Levie Cylindrical Pore Microstructure Cutaway</span>
                    <span className="text-[11px] text-indigo-400 font-mono">λ / L = {(spatialPoreProfile.lambdaNormalized * 100).toFixed(0)}% Utilized</span>
                  </div>

                  {/* Visual Bar representation of pore depth */}
                  <div className="relative h-12 w-full bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex items-center">
                    {/* Active penetration gradient */}
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-blue-500/80 to-transparent transition-all duration-300"
                      style={{ width: `${Math.min(100, spatialPoreProfile.lambdaNormalized * 100)}%` }}
                    />
                    {/* Markers */}
                    <div className="absolute left-3 text-[10px] font-bold text-white uppercase tracking-wider drop-shadow">
                      Pore Mouth (Bulk Electrolyte)
                    </div>
                    <div className="absolute right-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Current Collector Substrate
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    At high frequencies, the AC current cannot penetrate to the bottom of the pore due to the high pore electrolyte resistance (skin effect in porous electrodes). At low frequencies, the signal penetrates the full depth $L$.
                  </p>
                </div>
              </div>
            )}

            {/* View 5: Dielectric Loss */}
            {activeChartTab === "dielectric" && (
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={frequencyPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="logFreq"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "log10( Frequency / Hz )", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="epsImag"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "Dielectric Loss ε''", angle: -90, position: "left", fill: "#94a3b8", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                      formatter={(val: any) => [`${val}`, "Dielectric Loss ε''"]}
                      labelFormatter={(label) => `10^${label} Hz`}
                    />
                    <Line type="monotone" dataKey="epsImag" name="Dielectric Loss ε''" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

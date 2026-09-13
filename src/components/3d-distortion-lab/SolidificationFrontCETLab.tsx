import { ResponsiveContainer } from '../VisibleResponsiveContainer';
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Flame,
  Activity,
  Sliders,
  Sparkles,
  Download,
  RotateCcw,
  Layers,
  ThermometerSnowflake,
  ShieldCheck,
  ChevronRight,
  Info,
  Maximize2,
  FileSpreadsheet,
  FileText,
  Compass,
  Zap,
  ArrowRight,
  Eye,
  Crosshair,
  TrendingUp,
  Grid,
  Play,
  Pause,
  RefreshCw,
  Check,
  Copy,
  Terminal,
  FileCode,
  BarChart3,
  Waves,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  GitFork,
  Radio,
  Share2,
  Box,
} from "lucide-react";
import { SolidificationMeltPool3DWebGL } from "./SolidificationMeltPool3DWebGL";
import { EmbeddedPythonLPBFSimulator } from "./EmbeddedPythonLPBFSimulator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

/* =========================================================================
   TYPES & ALLOY SOLIDIFICATION DATABASE
========================================================================= */

export type ScanStrategyType = "meander" | "unidirectional" | "rotate90" | "rotate67";
export type VisualizationMode = "cet-map" | "cooling-rate-gxr" | "thermal-gradient-g" | "solidification-rate-r" | "grain-growth-angle" | "microstructure-synthetic";

export interface AlloySolidificationData {
  id: string;
  name: string;
  alloyFamily: "Nickel Superalloy" | "Titanium Alloy" | "Austenitic Stainless" | "Aluminum Alloy" | "Refractory / High Entropy";
  // Thermal & physical properties
  density_kg_m3: number;
  specificHeat_J_kgK: number;
  thermalConductivity_W_mK: number;
  liquidusTemp_C: number;
  solidusTemp_C: number;
  absorptivity: number;
  // Solidification & CET parameters
  freezingRange_K: number; // T_L - T_S
  solutePartitionCoeff_k0: number; // Partition coefficient k0
  liquidusSlope_mL: number; // K/wt%
  nominalSolute_C0_wt: number; // wt%
  liquidDiffusivity_DL_m2s: number; // m^2/s
  // Hunt CET criteria parameters: G^n / R >= K_col (Columnar) vs G^n / R <= K_eq (Equiaxed)
  huntExponent_n: number; // Typically 3.4 or 2.0-3.5
  huntConstant_aCET: number; // K^n * s / m^(n+1)
  critEquiaxedFraction_pct: number; // Standard 49% for full equiaxed, 0.66% for full columnar
  nucleationSiteDensity_N0_m3: number; // Default heterogeneous nuclei density (m^-3)
  nucleationUndercooling_dTN_K: number; // Undercooling for heterogeneous nucleation (K)
  // Microstructure scaling
  sdasConstant_A0: number; // Secondary dendrite arm spacing pre-factor
  sdasExponent_n: number; // SDAS cooling rate exponent (typically 0.33 - 0.40)
  primaryDendriteConstant_A1: number; // PDAS prefactor
  description: string;
  inoculationCapable: boolean;
}

export const SOLIDIFICATION_ALLOY_DB: Record<string, AlloySolidificationData> = {
  "Inconel 718": {
    id: "in718",
    name: "Inconel 718",
    alloyFamily: "Nickel Superalloy",
    density_kg_m3: 8190,
    specificHeat_J_kgK: 435,
    thermalConductivity_W_mK: 11.4,
    liquidusTemp_C: 1336,
    solidusTemp_C: 1260,
    absorptivity: 0.52,
    freezingRange_K: 76,
    solutePartitionCoeff_k0: 0.48, // Nb segregation
    liquidusSlope_mL: -12.5,
    nominalSolute_C0_wt: 5.1, // 5.1 wt% Nb
    liquidDiffusivity_DL_m2s: 3.0e-9,
    huntExponent_n: 3.4,
    huntConstant_aCET: 1.25e12,
    critEquiaxedFraction_pct: 49,
    nucleationSiteDensity_N0_m3: 2.0e11,
    nucleationUndercooling_dTN_K: 3.5,
    sdasConstant_A0: 48.0,
    sdasExponent_n: 0.35,
    primaryDendriteConstant_A1: 85.0,
    description: "Low thermal conductivity produces steep thermal gradients (G > 10^6 K/m), resulting in strongly textured columnar dendrites growing epitaxially along the build direction.",
    inoculationCapable: true,
  },
  "Ti-6Al-4V Grade 5": {
    id: "ti64",
    name: "Ti-6Al-4V Grade 5",
    alloyFamily: "Titanium Alloy",
    density_kg_m3: 4430,
    specificHeat_J_kgK: 526,
    thermalConductivity_W_mK: 6.7,
    liquidusTemp_C: 1655,
    solidusTemp_C: 1605,
    absorptivity: 0.42,
    freezingRange_K: 50,
    solutePartitionCoeff_k0: 0.85,
    liquidusSlope_mL: -8.0,
    nominalSolute_C0_wt: 6.0, // Al/V
    liquidDiffusivity_DL_m2s: 2.5e-9,
    huntExponent_n: 3.2,
    huntConstant_aCET: 8.5e11,
    critEquiaxedFraction_pct: 49,
    nucleationSiteDensity_N0_m3: 1.5e11,
    nucleationUndercooling_dTN_K: 2.8,
    sdasConstant_A0: 42.0,
    sdasExponent_n: 0.38,
    primaryDendriteConstant_A1: 72.0,
    description: "Ultra-low thermal conductivity yields extreme vertical thermal gradients; prior-beta grains form massive columnar grain trunks spanning dozens of printed layers.",
    inoculationCapable: true,
  },
  "316L Stainless Steel": {
    id: "316l",
    name: "316L Stainless Steel",
    alloyFamily: "Austenitic Stainless",
    density_kg_m3: 7990,
    specificHeat_J_kgK: 500,
    thermalConductivity_W_mK: 16.2,
    liquidusTemp_C: 1400,
    solidusTemp_C: 1375,
    absorptivity: 0.54,
    freezingRange_K: 25,
    solutePartitionCoeff_k0: 0.72, // Cr, Mo, Ni
    liquidusSlope_mL: -5.5,
    nominalSolute_C0_wt: 2.2, // Mo wt%
    liquidDiffusivity_DL_m2s: 4.0e-9,
    huntExponent_n: 3.4,
    huntConstant_aCET: 2.1e12,
    critEquiaxedFraction_pct: 49,
    nucleationSiteDensity_N0_m3: 5.0e11,
    nucleationUndercooling_dTN_K: 2.0,
    sdasConstant_A0: 38.0,
    sdasExponent_n: 0.33,
    primaryDendriteConstant_A1: 65.0,
    description: "Narrow solidification freezing range leads to fine cellular-dendritic sub-micron networks with intense elemental segregation of Mo and Cr at cell walls.",
    inoculationCapable: true,
  },
  "AlSi10Mg": {
    id: "alsi10mg",
    name: "AlSi10Mg",
    alloyFamily: "Aluminum Alloy",
    density_kg_m3: 2680,
    specificHeat_J_kgK: 915,
    thermalConductivity_W_mK: 130.0,
    liquidusTemp_C: 594,
    solidusTemp_C: 557,
    absorptivity: 0.28,
    freezingRange_K: 37,
    solutePartitionCoeff_k0: 0.13, // Si in Al
    liquidusSlope_mL: -6.6,
    nominalSolute_C0_wt: 10.0, // 10 wt% Si
    liquidDiffusivity_DL_m2s: 5.5e-9,
    huntExponent_n: 2.8,
    huntConstant_aCET: 4.5e10,
    critEquiaxedFraction_pct: 49,
    nucleationSiteDensity_N0_m3: 8.0e12,
    nucleationUndercooling_dTN_K: 1.5,
    sdasConstant_A0: 22.0,
    sdasExponent_n: 0.33,
    primaryDendriteConstant_A1: 45.0,
    description: "High thermal conductivity flattens thermal gradients and accelerates front velocity, creating ultra-fine cellular alpha-Al surrounded by a continuous nano-eutectic Si shell.",
    inoculationCapable: true,
  },
  "Scalmalloy (Al-Mg-Sc-Zr) [Grain Refined]": {
    id: "scalmalloy",
    name: "Scalmalloy (Al-Mg-Sc-Zr) [Grain Refined]",
    alloyFamily: "Aluminum Alloy",
    density_kg_m3: 2670,
    specificHeat_J_kgK: 900,
    thermalConductivity_W_mK: 110.0,
    liquidusTemp_C: 645,
    solidusTemp_C: 580,
    absorptivity: 0.32,
    freezingRange_K: 65,
    solutePartitionCoeff_k0: 0.25,
    liquidusSlope_mL: -4.8,
    nominalSolute_C0_wt: 4.5,
    liquidDiffusivity_DL_m2s: 4.8e-9,
    huntExponent_n: 2.6,
    huntConstant_aCET: 8.0e9, // Low threshold -> equiaxed favored!
    critEquiaxedFraction_pct: 49,
    nucleationSiteDensity_N0_m3: 5.0e15, // Ultra-high nanoparticle nucleation density
    nucleationUndercooling_dTN_K: 0.6,
    sdasConstant_A0: 16.0,
    sdasExponent_n: 0.32,
    primaryDendriteConstant_A1: 30.0,
    description: "Inoculated with primary Al3(Sc,Zr) nano-nucleants triggering full Columnar-to-Equiaxed Transition (CET) across melt pool boundaries, completely eliminating solidification cracking.",
    inoculationCapable: true,
  },
  "CMSX-4 (Single Crystal Superalloy)": {
    id: "cmsx4",
    name: "CMSX-4 (Single Crystal Superalloy)",
    alloyFamily: "Nickel Superalloy",
    density_kg_m3: 8700,
    specificHeat_J_kgK: 410,
    thermalConductivity_W_mK: 12.5,
    liquidusTemp_C: 1390,
    solidusTemp_C: 1335,
    absorptivity: 0.50,
    freezingRange_K: 55,
    solutePartitionCoeff_k0: 0.60,
    liquidusSlope_mL: -10.0,
    nominalSolute_C0_wt: 3.0,
    liquidDiffusivity_DL_m2s: 3.2e-9,
    huntExponent_n: 3.4,
    huntConstant_aCET: 3.5e12,
    critEquiaxedFraction_pct: 49,
    nucleationSiteDensity_N0_m3: 5.0e10, // Very low nucleation density -> columnar single crystal
    nucleationUndercooling_dTN_K: 4.5,
    sdasConstant_A0: 52.0,
    sdasExponent_n: 0.36,
    primaryDendriteConstant_A1: 95.0,
    description: "High-temperature creep-resistant nickel base superalloy engineered to suppress equiaxed grain nucleation and preserve epitaxial columnar single-crystal orientation.",
    inoculationCapable: false,
  },
};

export interface SolidificationCETLabProps {
  currentPower_W?: number;
  currentSpeed_mms?: number;
  currentHatch_um?: number;
  currentBeamDiameter_um?: number;
  currentPreheat_C?: number;
  currentLayer_um?: number;
  currentMaterial?: string;
  onApplyParameters?: (params: {
    power_W: number;
    speed_mms: number;
    hatch_um: number;
    preheat_C: number;
  }) => void;
}

export const SolidificationFrontCETLab: React.FC<SolidificationCETLabProps> = ({
  currentPower_W = 285,
  currentSpeed_mms = 960,
  currentHatch_um = 110,
  currentBeamDiameter_um = 80,
  currentPreheat_C = 80,
  currentLayer_um = 40,
  currentMaterial = "Inconel 718",
  onApplyParameters,
}) => {
  // --- Selected Alloy ---
  const [selectedAlloyKey, setSelectedAlloyKey] = useState<string>(
    SOLIDIFICATION_ALLOY_DB[currentMaterial] ? currentMaterial : "Inconel 718"
  );
  const alloy = SOLIDIFICATION_ALLOY_DB[selectedAlloyKey] || SOLIDIFICATION_ALLOY_DB["Inconel 718"];

  // --- Process Parameters ---
  const [laserPower_W, setLaserPower_W] = useState<number>(currentPower_W);
  const [scanSpeed_mms, setScanSpeed_mms] = useState<number>(currentSpeed_mms);
  const [hatchSpacing_um, setHatchSpacing_um] = useState<number>(currentHatch_um);
  const [beamDiameter_um, setBeamDiameter_um] = useState<number>(currentBeamDiameter_um);
  const [bedPreheat_C, setBedPreheat_C] = useState<number>(currentPreheat_C);
  const [layerThickness_um, setLayerThickness_um] = useState<number>(currentLayer_um);

  // --- Multi-Track Scan Strategy & Inoculant Tuning ---
  const [scanStrategy, setScanStrategy] = useState<ScanStrategyType>("meander");
  const [numberOfTracks, setNumberOfTracks] = useState<number>(4);
  const [inoculantBoost_logN0, setInoculantBoost_logN0] = useState<number>(
    Math.round(Math.log10(alloy.nucleationSiteDensity_N0_m3))
  );
  const [activeVisualization, setActiveVisualization] = useState<VisualizationMode>("cet-map");
  const [probePosition_pct, setProbePosition_pct] = useState<number>(50); // 0 (bottom) to 100 (top trailing tail)
  const [isCopiedPython, setIsCopiedPython] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "3d-webgl-overlay" | "multi-track-map" | "cet-diagram" | "cooling-anisotropy" | "embedded-python-simulator"
  >("3d-webgl-overlay");

  // Keep state synced when props change
  useEffect(() => {
    if (SOLIDIFICATION_ALLOY_DB[currentMaterial]) {
      setSelectedAlloyKey(currentMaterial);
      setInoculantBoost_logN0(Math.round(Math.log10(SOLIDIFICATION_ALLOY_DB[currentMaterial].nucleationSiteDensity_N0_m3)));
    }
    setLaserPower_W(currentPower_W);
    setScanSpeed_mms(currentSpeed_mms);
    setHatchSpacing_um(currentHatch_um);
    setBeamDiameter_um(currentBeamDiameter_um);
    setBedPreheat_C(currentPreheat_C);
    setLayerThickness_um(currentLayer_um);
  }, [currentMaterial, currentPower_W, currentSpeed_mms, currentHatch_um, currentBeamDiameter_um, currentPreheat_C, currentLayer_um]);

  // Update nucleation site density when alloy changes
  const effectiveN0_m3 = useMemo(() => {
    return Math.pow(10, inoculantBoost_logN0);
  }, [inoculantBoost_logN0]);

  // --- Analytical 3D Multi-Track Thermal & Solidification Front Physics ---
  const simulationResults = useMemo(() => {
    const P = laserPower_W;
    const v = scanSpeed_mms * 1e-3; // m/s
    const eta = alloy.absorptivity;
    const k = alloy.thermalConductivity_W_mK;
    const rho = alloy.density_kg_m3;
    const cp = alloy.specificHeat_J_kgK;
    const alpha = k / (rho * cp); // Thermal diffusivity (m^2/s)
    const T0 = bedPreheat_C;
    const TL = alloy.liquidusTemp_C;
    const TS = alloy.solidusTemp_C;
    const r0 = (beamDiameter_um / 2) * 1e-6; // m

    // Dimensionless 3D Rosenthal melt pool geometry estimation
    const deltaTL = Math.max(10, TL - T0);
    const P_star = (eta * P) / (2 * Math.PI * k * r0 * deltaTL); // Normalized power
    const Pe = (v * r0) / (2 * alpha); // Peclet number

    // Melt pool dimensions (m)
    const poolWidth_m = 2 * r0 * Math.sqrt(Math.max(0.1, P_star / (1 + 0.5 * Pe)));
    const poolDepth_m = poolWidth_m * 0.52 * (1 + 0.15 * Math.min(2.0, P_star / Math.sqrt(Math.max(0.1, Pe))));
    const poolLength_m = poolWidth_m * (1 + 1.2 * Pe);

    const poolWidth_um = poolWidth_m * 1e6;
    const poolDepth_um = poolDepth_m * 1e6;
    const poolLength_um = poolLength_m * 1e6;

    // Overlap remelt fraction
    const remeltFraction = Math.max(0, Math.min(0.95, (poolWidth_um - hatchSpacing_um) / poolWidth_um));

    // Solidification Front Angular Discretization (from bottom theta=90° to tail theta=0°)
    const numPoints = 60;
    const frontPoints: Array<{
      fraction: number; // 0 (bottom) to 1 (surface trailing tail)
      theta_deg: number; // Angle between normal and scan direction
      x_um: number; // Longitudinal position relative to laser beam center
      y_um: number; // Lateral position
      z_um: number; // Depth position (-depth to 0)
      G_K_m: number; // Thermal gradient magnitude |nabla T| (K/m)
      Gx_K_m: number; // G_x
      Gy_K_m: number; // G_y
      Gz_K_m: number; // G_z
      R_m_s: number; // Solidification front velocity v*cos(theta) (m/s)
      coolingRate_K_s: number; // G * R (K/s)
      G_over_R_K_s_m2: number; // G / R
      tiltAngle_deg: number; // Grain growth vector tilt angle relative to build Z
      huntValue: number; // G^n / R
      cetRatio: number; // (G^n / R) / K_col
      cetMorphology: "Columnar" | "Mixed CET" | "Equiaxed";
      sdas_um: number;
      pdas_um: number;
      cellSpacing_um: number;
    }> = [];

    const n = alloy.huntExponent_n;
    const aCET = alloy.huntConstant_aCET;
    // Critical Hunt boundaries scaled with nucleation site density
    const N0_ref = 1.0e11;
    const N0_factor = Math.pow(effectiveN0_m3 / N0_ref, n / 3.0);
    const K_col = aCET * N0_factor; // Threshold for 100% columnar
    const K_eq = K_col * 0.08; // Threshold for 100% equiaxed

    for (let i = 0; i <= numPoints; i++) {
      const frac = i / numPoints; // 0 = bottom, 1 = top tail
      // Angle theta in radians from 90° (at bottom) down to ~0° (at tail)
      const theta_rad = (Math.PI / 2) * (1 - Math.pow(frac, 0.75));
      const theta_deg = (theta_rad * 180) / Math.PI;

      // Coordinate along the 3D parabolic melt boundary
      const x_m = -poolLength_m * (1 - Math.cos(theta_rad));
      const z_m = -poolDepth_m * Math.sin(theta_rad);
      const y_m = (poolWidth_m / 2) * Math.sin(theta_rad) * Math.sin(frac * Math.PI);

      // 3D Rosenthal gradient calculation: T(x,y,z) - T0 = (eta*P)/(2*pi*k*R_dist) * exp(-v*(x+R_dist)/(2*alpha))
      const R_dist = Math.max(1e-7, Math.sqrt(x_m * x_m + y_m * y_m + z_m * z_m));
      // Base thermal gradient magnitude (K/m)
      const G_base = ((TL - T0) / R_dist) * (1 + (v * R_dist) / (2 * alpha));
      // Decompose into directional components based on normal vector
      const nx = -Math.cos(theta_rad);
      const nz = Math.sin(theta_rad);
      const ny = (y_m / Math.max(1e-6, poolWidth_m / 2)) * 0.3;

      const G_K_m = Math.max(1e4, G_base * (1.8 - 0.9 * frac)); // Gradient is steepest at base/front, flatter at tail
      const Gx_K_m = G_K_m * Math.abs(nx);
      const Gz_K_m = G_K_m * Math.abs(nz);
      const Gy_K_m = G_K_m * Math.abs(ny);

      // Solidification growth rate R = v * cos(theta)
      const R_m_s = Math.max(1e-5, v * Math.cos(theta_rad));
      const coolingRate_K_s = G_K_m * R_m_s; // G x R
      const G_over_R_K_s_m2 = G_K_m / R_m_s;

      // Grain growth vector tilt angle psi = arctan(Gx / Gz)
      const tiltAngle_deg = (Math.atan2(Gx_K_m, Math.max(10, Gz_K_m)) * 180) / Math.PI;

      // Hunt CET criterion evaluation
      const huntVal = Math.pow(G_K_m, n) / R_m_s;
      let cetMorphology: "Columnar" | "Mixed CET" | "Equiaxed" = "Columnar";
      if (huntVal < K_eq) {
        cetMorphology = "Equiaxed";
      } else if (huntVal < K_col) {
        cetMorphology = "Mixed CET";
      } else {
        cetMorphology = "Columnar";
      }

      // Microstructural spacings
      const sdas_um = Math.max(0.1, alloy.sdasConstant_A0 * Math.pow(Math.max(100, coolingRate_K_s), -alloy.sdasExponent_n));
      const pdas_um = Math.max(0.3, alloy.primaryDendriteConstant_A1 * Math.pow(Math.max(1e4, G_K_m), -0.5) * Math.pow(Math.max(1e-4, R_m_s), -0.25));
      const cellSpacing_um = sdas_um * 0.45;

      frontPoints.push({
        fraction: frac,
        theta_deg,
        x_um: x_m * 1e6,
        y_um: y_m * 1e6,
        z_um: z_m * 1e6,
        G_K_m,
        Gx_K_m,
        Gy_K_m,
        Gz_K_m,
        R_m_s,
        coolingRate_K_s,
        G_over_R_K_s_m2,
        tiltAngle_deg,
        huntValue: huntVal,
        cetRatio: huntVal / K_col,
        cetMorphology,
        sdas_um,
        pdas_um,
        cellSpacing_um,
      });
    }

    // Cooling rate anisotropy calculations
    const minCoolingRate = Math.min(...frontPoints.map((p) => p.coolingRate_K_s));
    const maxCoolingRate = Math.max(...frontPoints.map((p) => p.coolingRate_K_s));
    const avgCoolingRate = frontPoints.reduce((acc, p) => acc + p.coolingRate_K_s, 0) / frontPoints.length;
    const coolingRateAnisotropyRatio = maxCoolingRate / Math.max(1, minCoolingRate);

    const minGradient = Math.min(...frontPoints.map((p) => p.G_K_m));
    const maxGradient = Math.max(...frontPoints.map((p) => p.G_K_m));

    const minVelocity = Math.min(...frontPoints.map((p) => p.R_m_s));
    const maxVelocity = Math.max(...frontPoints.map((p) => p.R_m_s));

    // Multi-track spatial domain grid calculation (Y-Z cross-section across hatch tracks)
    const domainWidth_um = (numberOfTracks + 0.8) * hatchSpacing_um;
    const domainDepth_um = poolDepth_um * 1.8;
    const gridResolutionY = 90;
    const gridResolutionZ = 60;

    const hatchTracks = [];
    for (let t = 0; t < numberOfTracks; t++) {
      const centerY_um = (t + 0.9) * hatchSpacing_um;
      const isReverse = scanStrategy === "meander" && t % 2 === 1;
      hatchTracks.push({
        index: t + 1,
        centerY_um,
        isReverse,
        power_W: P,
      });
    }

    // Compute active probe point stats
    const probeIndex = Math.min(frontPoints.length - 1, Math.max(0, Math.round((probePosition_pct / 100) * (frontPoints.length - 1))));
    const activeProbe = frontPoints[probeIndex] || frontPoints[0];

    // Summary CET Fractions
    const columnarCount = frontPoints.filter((p) => p.cetMorphology === "Columnar").length;
    const mixedCount = frontPoints.filter((p) => p.cetMorphology === "Mixed CET").length;
    const equiaxedCount = frontPoints.filter((p) => p.cetMorphology === "Equiaxed").length;

    const columnarFraction_pct = Math.round((columnarCount / frontPoints.length) * 100);
    const mixedFraction_pct = Math.round((mixedCount / frontPoints.length) * 100);
    const equiaxedFraction_pct = Math.round((equiaxedCount / frontPoints.length) * 100);

    return {
      poolWidth_um,
      poolDepth_um,
      poolLength_um,
      remeltFraction,
      frontPoints,
      activeProbe,
      minCoolingRate,
      maxCoolingRate,
      avgCoolingRate,
      coolingRateAnisotropyRatio,
      minGradient,
      maxGradient,
      minVelocity,
      maxVelocity,
      columnarFraction_pct,
      mixedFraction_pct,
      equiaxedFraction_pct,
      K_col,
      K_eq,
      hatchTracks,
      domainWidth_um,
      domainDepth_um,
      gridResolutionY,
      gridResolutionZ,
    };
  }, [
    laserPower_W,
    scanSpeed_mms,
    hatchSpacing_um,
    beamDiameter_um,
    bedPreheat_C,
    layerThickness_um,
    alloy,
    effectiveN0_m3,
    scanStrategy,
    numberOfTracks,
    probePosition_pct,
  ]);

  // --- Multi-Track Canvas Rendering ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawMultiTrackCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#060913";
    ctx.fillRect(0, 0, width, height);

    const {
      domainWidth_um,
      domainDepth_um,
      poolWidth_um,
      poolDepth_um,
      hatchTracks,
      remeltFraction,
      frontPoints,
    } = simulationResults;

    const margin = { top: 35, bottom: 45, left: 55, right: 35 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const scaleX = (y_um: number) => margin.left + (y_um / domainWidth_um) * plotWidth;
    const scaleZ = (z_um: number) => margin.top + (Math.abs(z_um) / domainDepth_um) * plotHeight;

    // 1. Draw Grid Lines & Coordinates
    ctx.strokeStyle = "#162032";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    const numGridX = 8;
    for (let i = 0; i <= numGridX; i++) {
      const y_um = (domainWidth_um / numGridX) * i;
      const px = scaleX(y_um);
      ctx.beginPath();
      ctx.moveTo(px, margin.top);
      ctx.lineTo(px, height - margin.bottom);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(y_um)} µm`, px, height - margin.bottom + 15);
    }

    const numGridZ = 5;
    for (let j = 0; j <= numGridZ; j++) {
      const z_um = (domainDepth_um / numGridZ) * j;
      const pz = scaleZ(-z_um);
      ctx.beginPath();
      ctx.moveTo(margin.left, pz);
      ctx.lineTo(width - margin.right, pz);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`-${Math.round(z_um)} µm`, margin.left - 8, pz + 3);
    }
    ctx.setLineDash([]);

    // 2. Draw Substrate Base
    ctx.fillStyle = "#0c1524";
    ctx.fillRect(margin.left, scaleZ(0), plotWidth, plotHeight);

    // 3. Draw Hatch Tracks & Melt Pool Boundaries
    hatchTracks.forEach((track, tIdx) => {
      const centerX = scaleX(track.centerY_um);
      const halfW_px = ((poolWidth_um / 2) / domainWidth_um) * plotWidth;
      const depth_px = (poolDepth_um / domainDepth_um) * plotHeight;
      const topZ_px = scaleZ(0);

      // Melt Pool Shape Path (Parabolic Cross-Section)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX - halfW_px, topZ_px);
      ctx.quadraticCurveTo(centerX, topZ_px + depth_px * 1.3, centerX + halfW_px, topZ_px);
      ctx.closePath();

      // Color coding based on Active Visualization Mode
      if (activeVisualization === "cet-map") {
        // Multi-zone CET gradient
        const grad = ctx.createRadialGradient(
          centerX, topZ_px + depth_px * 0.2, 5,
          centerX, topZ_px + depth_px * 0.7, halfW_px * 1.1
        );
        // If alloy is inoculated or equiaxed fraction is high
        if (simulationResults.equiaxedFraction_pct > 60) {
          grad.addColorStop(0, "rgba(52, 211, 153, 0.75)"); // Equiaxed green center
          grad.addColorStop(0.5, "rgba(96, 165, 250, 0.65)"); // Mixed blue
          grad.addColorStop(1, "rgba(168, 85, 247, 0.55)"); // Columnar purple boundary
        } else if (simulationResults.equiaxedFraction_pct > 20) {
          grad.addColorStop(0, "rgba(52, 211, 153, 0.7)");
          grad.addColorStop(0.35, "rgba(96, 165, 250, 0.65)");
          grad.addColorStop(1, "rgba(244, 63, 94, 0.6)"); // Columnar red
        } else {
          grad.addColorStop(0, "rgba(251, 146, 60, 0.7)"); // Columnar orange center
          grad.addColorStop(0.6, "rgba(239, 68, 68, 0.65)"); // Columnar red
          grad.addColorStop(1, "rgba(147, 51, 234, 0.55)"); // Columnar purple base
        }
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (activeVisualization === "cooling-rate-gxr") {
        // High GxR (yellow-cyan) at pool tail/sides, lower at bottom
        const grad = ctx.createLinearGradient(centerX, topZ_px, centerX, topZ_px + depth_px);
        grad.addColorStop(0, "rgba(6, 182, 212, 0.85)"); // Cyan high GxR
        grad.addColorStop(0.6, "rgba(234, 179, 8, 0.7)"); // Yellow
        grad.addColorStop(1, "rgba(239, 68, 68, 0.5)"); // Red base
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (activeVisualization === "thermal-gradient-g") {
        // Thermal Gradient G: Highest at bottom boundary
        const grad = ctx.createLinearGradient(centerX, topZ_px + depth_px, centerX, topZ_px);
        grad.addColorStop(0, "rgba(239, 68, 68, 0.85)"); // Steepest at bottom
        grad.addColorStop(0.6, "rgba(249, 115, 22, 0.7)");
        grad.addColorStop(1, "rgba(59, 130, 246, 0.5)");
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (activeVisualization === "solidification-rate-r") {
        // Solidification Rate R: Zero at bottom, maximum at surface
        const grad = ctx.createLinearGradient(centerX, topZ_px, centerX, topZ_px + depth_px);
        grad.addColorStop(0, "rgba(34, 197, 94, 0.85)"); // Highest at surface
        grad.addColorStop(0.5, "rgba(14, 165, 233, 0.65)");
        grad.addColorStop(1, "rgba(15, 23, 42, 0.5)"); // Zero at bottom
        ctx.fillStyle = grad;
        ctx.fill();
      } else if (activeVisualization === "grain-growth-angle") {
        // Growth tilt angle psi: ~0° vertical at bottom to ~70° tilted at surface
        const grad = ctx.createLinearGradient(centerX, topZ_px, centerX, topZ_px + depth_px);
        grad.addColorStop(0, "rgba(236, 72, 153, 0.8)"); // High tilt
        grad.addColorStop(0.5, "rgba(168, 85, 247, 0.65)");
        grad.addColorStop(1, "rgba(99, 102, 241, 0.5)"); // Vertical 0°
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        // Microstructure synthetic (Voronoi & Columnar Dendrite Traces)
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fill();
      }

      // Track outline
      ctx.strokeStyle = tIdx === hatchTracks.length - 1 ? "#38bdf8" : "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 4. Draw Columnar Dendrite Traces / Grain Growth Streamlines
      if (activeVisualization === "microstructure-synthetic" || activeVisualization === "cet-map") {
        ctx.save();
        const numDendrites = 14;
        for (let d = 0; d <= numDendrites; d++) {
          const frac = d / numDendrites;
          const startX = centerX - halfW_px * 0.9 + frac * (halfW_px * 1.8);
          const startZ = topZ_px + depth_px * Math.sin(frac * Math.PI) * 0.95;

          // Target is perpendicular to isotherm growing towards centerline
          const midX = startX + (centerX - startX) * 0.65;
          const midZ = topZ_px + depth_px * 0.35;
          const endX = centerX + (startX - centerX) * 0.15;
          const endZ = topZ_px + 2;

          ctx.strokeStyle =
            simulationResults.equiaxedFraction_pct > 50 && frac > 0.3 && frac < 0.7
              ? "rgba(52, 211, 153, 0.65)"
              : "rgba(244, 114, 182, 0.55)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(startX, startZ);
          ctx.quadraticCurveTo(midX, midZ, endX, endZ);
          ctx.stroke();

          // Draw small dendritic side arms
          if (activeVisualization === "microstructure-synthetic") {
            ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(midX - 4, midZ - 2);
            ctx.lineTo(midX + 4, midZ + 2);
            ctx.stroke();
          }
        }

        // Draw Equiaxed Nuclei in the center if present
        if (simulationResults.equiaxedFraction_pct > 15) {
          const numEquiaxed = Math.round(simulationResults.equiaxedFraction_pct * 0.35);
          for (let eq = 0; eq < numEquiaxed; eq++) {
            const rx = centerX + (Math.sin(eq * 2.3) * halfW_px * 0.35);
            const rz = topZ_px + (Math.cos(eq * 3.7) * depth_px * 0.25) + depth_px * 0.15;
            ctx.fillStyle = "rgba(52, 211, 153, 0.85)";
            ctx.beginPath();
            ctx.arc(rx, rz, 2.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "rgba(16, 185, 129, 0.9)";
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Track Label & Scan Direction Arrow
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Track ${track.index}`, centerX, topZ_px - 14);

      // Scan Direction indicator
      ctx.fillStyle = track.isReverse ? "#f43f5e" : "#06b6d4";
      ctx.font = "9px monospace";
      ctx.fillText(track.isReverse ? "◀ Reverse" : "▶ Forward", centerX, topZ_px - 4);
    });

    // 5. Draw Overlap Remelt Boundaries
    for (let t = 0; t < hatchTracks.length - 1; t++) {
      const c1 = scaleX(hatchTracks[t].centerY_um);
      const c2 = scaleX(hatchTracks[t + 1].centerY_um);
      const overlapMid = (c1 + c2) / 2;
      const topZ_px = scaleZ(0);

      ctx.strokeStyle = "rgba(250, 204, 21, 0.6)";
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(overlapMid, topZ_px);
      ctx.lineTo(overlapMid, topZ_px + (poolDepth_um / domainDepth_um) * plotHeight * 0.9);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Draw Layer Thickness Baseline
    const layerZ_px = scaleZ(-layerThickness_um);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, layerZ_px);
    ctx.lineTo(width - margin.right, layerZ_px);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Layer Thickness (${layerThickness_um} µm)`, margin.left + 8, layerZ_px - 4);

    // 7. Title & Legend in Canvas Header
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Multi-Track Cross-Section (Y-Z Plane) — ${hatchTracks.length} Hatch Tracks (h = ${hatchSpacing_um} µm)`, margin.left, 20);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`Remelt Overlap: ${Math.round(remeltFraction * 100)}% | W = ${Math.round(poolWidth_um)} µm, D = ${Math.round(poolDepth_um)} µm`, width - margin.right, 20);
  }, [simulationResults, activeVisualization, layerThickness_um, hatchSpacing_um]);

  useEffect(() => {
    drawMultiTrackCanvas();
  }, [drawMultiTrackCanvas]);

  // --- Python ICME Script Generator ---
  const pythonScript = useMemo(() => {
    return `# ==============================================================================
# LPBF SOLIDIFICATION FRONT COOLING RATE ANISOTROPY (G x R) & CET GRAIN MAPPER
# ICME Microstructure Simulation Script (Gaumann-Trivedi-Kurz & Hunt CET Criteria)
# ==============================================================================
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import root_scalar

# ------------------------------------------------------------------------------
# 1. ALLOY THERMAL & SOLIDIFICATION KINETICS PARAMETERS
# ------------------------------------------------------------------------------
alloy_name = "${alloy.name}"
rho = ${alloy.density_kg_m3}          # Density [kg/m^3]
cp = ${alloy.specificHeat_J_kgK}          # Specific Heat [J/(kg*K)]
k_th = ${alloy.thermalConductivity_W_mK}       # Thermal Conductivity [W/(m*K)]
alpha = k_th / (rho * cp)  # Thermal Diffusivity [m^2/s]
T_liq = ${alloy.liquidusTemp_C}        # Liquidus Temperature [C]
T_sol = ${alloy.solidusTemp_C}        # Solidus Temperature [C]
absorptivity = ${alloy.absorptivity} # Laser absorptivity

# Hunt & GTK CET Model Constants
hunt_n = ${alloy.huntExponent_n}          # Hunt Exponent (typically 3.4)
a_CET = ${alloy.huntConstant_aCET}      # Base Hunt Constant
N_0 = ${effectiveN0_m3.toExponential(2)}           # Heterogeneous Nucleation Site Density [m^-3]
dT_N = ${alloy.nucleationUndercooling_dTN_K}          # Nucleation Undercooling [K]
k_col = a_CET * (N_0 / 1e11)**(hunt_n / 3.0) # Columnar threshold
k_eq = k_col * 0.08      # Equiaxed threshold

# ------------------------------------------------------------------------------
# 2. LPBF PROCESS PARAMETERS
# ------------------------------------------------------------------------------
laser_power_W = ${laserPower_W}      # Laser Power [W]
scan_speed_mms = ${scanSpeed_mms}     # Scan Speed [mm/s]
v_scan = scan_speed_mms * 1e-3 # Scan Speed [m/s]
beam_diameter_um = ${beamDiameter_um} # Spot Diameter [um]
r0 = (beam_diameter_um / 2) * 1e-6 # Spot Radius [m]
hatch_spacing_um = ${hatchSpacing_um} # Hatch Spacing [um]
T_preheat = ${bedPreheat_C}          # Bed Preheat [C]

# ------------------------------------------------------------------------------
# 3. 3D ANALYTICAL ROSENTHAL THERMAL FIELD & SOLIDIFICATION FRONT EXTRACTION
# ------------------------------------------------------------------------------
def rosenthal_3d(x, y, z):
    """Computes steady-state 3D temperature T(x,y,z) in moving laser frame."""
    R = np.sqrt(x**2 + y**2 + z**2)
    R = np.maximum(R, 1e-7)
    term1 = (absorptivity * laser_power_W) / (2 * np.pi * k_th * R)
    term2 = np.exp(-v_scan * (x + R) / (2 * alpha))
    return T_preheat + term1 * term2

# Discretize solidification boundary (theta from 90 deg bottom to 0 deg tail)
num_pts = 100
thetas = np.linspace(np.pi / 2, 0.01, num_pts)
solidification_data = []

pool_width_m = ${simulationResults.poolWidth_um} * 1e-6
pool_depth_m = ${simulationResults.poolDepth_um} * 1e-6
pool_length_m = ${simulationResults.poolLength_um} * 1e-6

print(f"=== {alloy_name} LPBF SOLIDIFICATION FRONT ANALYSIS ===")
print(f"Melt Pool Width : {pool_width_m*1e6:.1f} um | Depth: {pool_depth_m*1e6:.1f} um | Length: {pool_length_m*1e6:.1f} um")

for theta in thetas:
    # Parametric position on the 3D boundary
    x = -pool_length_m * (1 - np.cos(theta))
    z = -pool_depth_m * np.sin(theta)
    y = (pool_width_m / 2) * np.sin(theta)
    
    # Thermal gradient magnitude G = |nabla T| (K/m)
    R_dist = np.sqrt(x**2 + y**2 + z**2)
    G_mag = ((T_liq - T_preheat) / R_dist) * (1.0 + (v_scan * R_dist) / (2 * alpha))
    
    # Directional gradient components
    Gx = G_mag * np.cos(theta)
    Gz = G_mag * np.sin(theta)
    
    # Solidification front normal velocity R = v * cos(theta) [m/s]
    R_growth = v_scan * np.cos(theta)
    
    # Cooling Rate G x R [K/s]
    cooling_rate = G_mag * R_growth
    
    # Grain Growth Tilt Angle psi = arctan(Gx / Gz) [deg]
    psi_deg = np.degrees(np.arctan2(Gx, max(1e-3, Gz)))
    
    # Hunt CET Criterion
    hunt_val = (G_mag**hunt_n) / R_growth
    if hunt_val >= k_col:
        morphology = "Columnar"
    elif hunt_val <= k_eq:
        morphology = "Equiaxed"
    else:
        morphology = "Mixed CET"
        
    solidification_data.append({
        'theta_deg': np.degrees(theta),
        'G_K_m': G_mag,
        'R_m_s': R_growth,
        'cooling_rate_K_s': cooling_rate,
        'tilt_deg': psi_deg,
        'hunt_val': hunt_val,
        'morphology': morphology
    })

# ------------------------------------------------------------------------------
# 4. PLOTTING PUBLICATION-READY SOLIDIFICATION & CET MAP
# ------------------------------------------------------------------------------
theta_arr = [d['theta_deg'] for d in solidification_data]
G_arr = [d['G_K_m'] for d in solidification_data]
R_arr = [d['R_m_s'] for d in solidification_data]
cooling_arr = [d['cooling_rate_K_s'] for d in solidification_data]
tilt_arr = [d['tilt_deg'] for d in solidification_data]

fig, axs = plt.subplots(2, 2, figsize=(12, 10))
plt.style.use('dark_background')

# Plot 1: G and R along solidification front
ax1 = axs[0, 0]
ax1_twin = ax1.twinx()
ax1.plot(theta_arr, [g * 1e-6 for g in G_arr], 'r-', lw=2, label='Thermal Gradient G [10^6 K/m]')
ax1_twin.plot(theta_arr, R_arr, 'c--', lw=2, label='Solidification Velocity R [m/s]')
ax1.set_xlabel('Front Angle θ [deg] (90° = Base, 0° = Tail)')
ax1.set_ylabel('Gradient G [10^6 K/m]', color='r')
ax1_twin.set_ylabel('Velocity R [m/s]', color='c')
ax1.set_title('Solidification Velocity R vs. Thermal Gradient G')
ax1.grid(True, alpha=0.3)

# Plot 2: Cooling Rate Anisotropy (G x R)
ax2 = axs[0, 1]
ax2.semilogy(theta_arr, cooling_arr, 'y-', lw=2.5)
ax2.set_xlabel('Front Angle θ [deg]')
ax2.set_ylabel('Cooling Rate $\dot{T} = G \cdot R$ [K/s]')
ax2.set_title(f'Cooling Rate Anisotropy: {max(cooling_arr)/min(cooling_arr):.1f}x Variation')
ax2.grid(True, alpha=0.3)

# Plot 3: CET Solidification Morphology Map (log G vs log R)
ax3 = axs[1, 0]
R_mesh = np.logspace(-4, np.log10(v_scan * 1.5), 100)
G_col_line = (k_col * R_mesh)**(1.0 / hunt_n)
G_eq_line = (k_eq * R_mesh)**(1.0 / hunt_n)

ax3.loglog(R_mesh, G_col_line, 'm--', lw=1.5, label='Columnar Boundary (Φ_eq < 0.66%)')
ax3.loglog(R_mesh, G_eq_line, 'g--', lw=1.5, label='Equiaxed Boundary (Φ_eq > 49%)')
ax3.scatter(R_arr, G_arr, c=cooling_arr, cmap='plasma', s=35, zorder=5, label='Melt Pool Solidification Path')
ax3.set_xlabel('Solidification Velocity R [m/s]')
ax3.set_ylabel('Thermal Gradient G [K/m]')
ax3.set_title('Hunt Columnar-to-Equiaxed (CET) Map')
ax3.legend(loc='upper left', fontsize=9)
ax3.grid(True, alpha=0.3, which='both')

# Plot 4: Grain Growth Vector Tilt Angle ψ
ax4 = axs[1, 1]
ax4.plot(theta_arr, tilt_arr, 'm-', lw=2)
ax4.set_xlabel('Front Angle θ [deg]')
ax4.set_ylabel('Epitaxial Growth Tilt Angle ψ [deg]')
ax4.set_title('Crystallographic Grain Growth Tilt (vs. Build Z)')
ax4.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('lpbf_solidification_cet_analysis.png', dpi=300)
print("Solidification & CET analysis plots successfully saved to 'lpbf_solidification_cet_analysis.png'.")
plt.show()
`;
  }, [alloy, effectiveN0_m3, laserPower_W, scanSpeed_mms, beamDiameter_um, hatchSpacing_um, bedPreheat_C, simulationResults]);

  const handleCopyPython = () => {
    navigator.clipboard.writeText(pythonScript);
    setIsCopiedPython(true);
    setTimeout(() => setIsCopiedPython(false), 2000);
  };

  // --- Solidification Morphology Map (Log G vs Log R) Data for Recharts ---
  const cetDiagramData = useMemo(() => {
    const { frontPoints, K_col, K_eq } = simulationResults;
    const n = alloy.huntExponent_n;

    return frontPoints.map((p) => {
      const R = p.R_m_s;
      const G_col = Math.pow(K_col * R, 1 / n);
      const G_eq = Math.pow(K_eq * R, 1 / n);

      return {
        theta_deg: Math.round(p.theta_deg),
        R_mms: parseFloat((p.R_m_s * 1000).toFixed(2)),
        G_K_mm: parseFloat((p.G_K_m * 1e-3).toFixed(1)),
        G_col_K_mm: parseFloat((G_col * 1e-3).toFixed(1)),
        G_eq_K_mm: parseFloat((G_eq * 1e-3).toFixed(1)),
        coolingRate_1e5K_s: parseFloat((p.coolingRate_K_s * 1e-5).toFixed(2)),
        tiltAngle_deg: parseFloat(p.tiltAngle_deg.toFixed(1)),
        morphology: p.cetMorphology,
      };
    });
  }, [simulationResults, alloy]);

  // --- Radar Chart Data for Anisotropy Profile ---
  const radarAnisotropyData = useMemo(() => {
    const { frontPoints, maxCoolingRate, maxGradient, maxVelocity } = simulationResults;
    const samples = [0, 10, 20, 30, 40, 50, 59];
    return samples.map((idx) => {
      const pt = frontPoints[idx] || frontPoints[0];
      return {
        angle: `${Math.round(pt.theta_deg)}° (${idx === 0 ? "Bottom" : idx === 59 ? "Tail" : "Side"})`,
        coolingRateNorm: Math.round((pt.coolingRate_K_s / maxCoolingRate) * 100),
        gradientNorm: Math.round((pt.G_K_m / maxGradient) * 100),
        velocityNorm: Math.round((pt.R_m_s / maxVelocity) * 100),
        tiltAngleNorm: Math.round((pt.tiltAngle_deg / 90) * 100),
      };
    });
  }, [simulationResults]);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
                <GitFork className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Solidification Front Anisotropy (G × R) &amp; CET Grain Mapper
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Hunt &amp; GTK Microstructure Model
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Multi-Track Thermal Gradient
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Calculates local solidification front velocity <span className="font-mono text-cyan-300 font-bold">R(θ) = v·cos(θ)</span>, 3D thermal gradient vector <span className="font-mono text-cyan-300 font-bold">G = |∇T|</span>, and cooling rate anisotropy <span className="font-mono text-cyan-300 font-bold">Ṫ = G × R</span> across multi-track hatch passes. Predicts columnar-to-equiaxed grain transitions (CET) and epitaxial dendrite growth tilt angles.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (onApplyParameters) {
                  onApplyParameters({
                    power_W: laserPower_W,
                    speed_mms: scanSpeed_mms,
                    hatch_um: hatchSpacing_um,
                    preheat_C: bedPreheat_C,
                  });
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Apply Parameters</span>
            </button>
          </div>
        </div>

        {/* STATS QUICK BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-[#0d1526]/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Cooling Rate (G×R)</span>
            </div>
            <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
              {(simulationResults.avgCoolingRate * 1e-6).toFixed(2)} × 10⁶ K/s
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Peak: {(simulationResults.maxCoolingRate * 1e-6).toFixed(2)}M
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0d1526]/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Compass className="w-3 h-3 text-pink-400" />
              <span>Anisotropy Ratio (ξ)</span>
            </div>
            <div className="text-sm font-bold font-mono text-pink-300 mt-0.5">
              {simulationResults.coolingRateAnisotropyRatio.toFixed(1)}×
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Tail vs. Bottom Front
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0d1526]/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              <span>Grain Structure CET</span>
            </div>
            <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">
              {simulationResults.columnarFraction_pct}% Col / {simulationResults.equiaxedFraction_pct}% Eq
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Hunt Criterion (n={alloy.huntExponent_n})
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0d1526]/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span>Grain Growth Tilt (ψ)</span>
            </div>
            <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
              {simulationResults.activeProbe.tiltAngle_deg.toFixed(1)}°
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Relative to Build Z-Axis
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0d1526]/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Dendrite Arm Spacing</span>
            </div>
            <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">
              λ₂ ≈ {simulationResults.activeProbe.sdas_um.toFixed(2)} µm
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Cell: {simulationResults.activeProbe.cellSpacing_um.toFixed(2)} µm
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0d1526]/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Waves className="w-3 h-3 text-sky-400" />
              <span>Hatch Overlap Remelt</span>
            </div>
            <div className="text-sm font-bold font-mono text-sky-300 mt-0.5">
              {Math.round(simulationResults.remeltFraction * 100)}% Remelt
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              W={Math.round(simulationResults.poolWidth_um)}µm / h={hatchSpacing_um}µm
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS & SIDEBAR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: PARAMETER SLIDERS & ALLOY SELECTION */}
        <div className="lg:col-span-1 space-y-4">
          {/* Alloy Selector Card */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Alloy &amp; Solidification Kinetics
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{alloy.alloyFamily}</span>
            </div>

            <select
              value={selectedAlloyKey}
              onChange={(e) => {
                const newKey = e.target.value;
                setSelectedAlloyKey(newKey);
                if (SOLIDIFICATION_ALLOY_DB[newKey]) {
                  setInoculantBoost_logN0(
                    Math.round(Math.log10(SOLIDIFICATION_ALLOY_DB[newKey].nucleationSiteDensity_N0_m3))
                  );
                }
              }}
              className="w-full bg-[#050810] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            >
              {Object.keys(SOLIDIFICATION_ALLOY_DB).map((key) => (
                <option key={key} value={key}>
                  {key} ({SOLIDIFICATION_ALLOY_DB[key].alloyFamily})
                </option>
              ))}
            </select>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-[#050810] p-2.5 rounded-xl border border-slate-800">
              {alloy.description}
            </p>

            {/* Heterogeneous Nucleation / Inoculation Density Slider */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nuclei Density (N₀)</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  10^{inoculantBoost_logN0} m⁻³
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="16"
                step="1"
                value={inoculantBoost_logN0}
                onChange={(e) => setInoculantBoost_logN0(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>10¹⁰ (Base Columnar)</span>
                <span>10¹³</span>
                <span>10¹⁶ (Inoculated Equiaxed)</span>
              </div>
            </div>
          </div>

          {/* LPBF Process Controls */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Process Parameters
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLaserPower_W(285);
                  setScanSpeed_mms(960);
                  setHatchSpacing_um(110);
                  setBeamDiameter_um(80);
                  setBedPreheat_C(80);
                  setInoculantBoost_logN0(Math.round(Math.log10(alloy.nucleationSiteDensity_N0_m3)));
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Laser Power */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Laser Power (P)</span>
                <span className="text-cyan-300 font-bold">{laserPower_W} W</span>
              </div>
              <input
                type="range"
                min="100"
                max="500"
                step="5"
                value={laserPower_W}
                onChange={(e) => setLaserPower_W(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Scan Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Scan Speed (v)</span>
                <span className="text-cyan-300 font-bold">{scanSpeed_mms} mm/s</span>
              </div>
              <input
                type="range"
                min="300"
                max="2500"
                step="20"
                value={scanSpeed_mms}
                onChange={(e) => setScanSpeed_mms(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Hatch Spacing */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Hatch Spacing (h)</span>
                <span className="text-amber-300 font-bold">{hatchSpacing_um} µm</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="5"
                value={hatchSpacing_um}
                onChange={(e) => setHatchSpacing_um(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Beam Spot Diameter */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Beam Diameter (2r₀)</span>
                <span className="text-purple-300 font-bold">{beamDiameter_um} µm</span>
              </div>
              <input
                type="range"
                min="40"
                max="150"
                step="5"
                value={beamDiameter_um}
                onChange={(e) => setBeamDiameter_um(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Bed Preheat */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Baseplate Preheat (T₀)</span>
                <span className="text-rose-300 font-bold">{bedPreheat_C} °C</span>
              </div>
              <input
                type="range"
                min="25"
                max="600"
                step="25"
                value={bedPreheat_C}
                onChange={(e) => setBedPreheat_C(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Multi-Track Hatch Strategy */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300">Scan Strategy</span>
                <span className="text-sky-300 font-bold">{scanStrategy.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(["meander", "unidirectional", "rotate90", "rotate67"] as ScanStrategyType[]).map((strat) => (
                  <button
                    key={strat}
                    type="button"
                    onClick={() => setScanStrategy(strat)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition ${
                      scanStrategy === strat
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                        : "bg-[#050810] text-slate-400 border border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {strat === "meander"
                      ? "⇄ Meander"
                      : strat === "unidirectional"
                      ? "⇉ Unidirect"
                      : strat === "rotate90"
                      ? "⤹ 90° Rotate"
                      : "⤸ 67° Rotate"}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Hatch Tracks */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Hatch Tracks in View</span>
                <span className="text-slate-200 font-bold">{numberOfTracks} Tracks</span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={numberOfTracks}
                onChange={(e) => setNumberOfTracks(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>

          {/* Solidification Front Probe Slider */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-pink-400" />
                <h4 className="text-xs font-bold text-white">Solidification Probe</h4>
              </div>
              <span className="text-[10px] font-mono text-pink-300 font-bold">
                θ = {simulationResults.activeProbe.theta_deg.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={probePosition_pct}
              onChange={(e) => setProbePosition_pct(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>Bottom (θ=90°)</span>
              <span>Side Wall (θ=45°)</span>
              <span>Tail (θ=0°)</span>
            </div>

            <div className="bg-[#050810] p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Velocity R:</span>
                <span className="text-cyan-300 font-bold">{(simulationResults.activeProbe.R_m_s * 1000).toFixed(1)} mm/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gradient G:</span>
                <span className="text-rose-300 font-bold">{(simulationResults.activeProbe.G_K_m * 1e-6).toFixed(2)} × 10⁶ K/m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cooling Rate G×R:</span>
                <span className="text-yellow-300 font-bold">{(simulationResults.activeProbe.coolingRate_K_s * 1e-5).toFixed(2)} × 10⁵ K/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Growth Tilt ψ:</span>
                <span className="text-purple-300 font-bold">{simulationResults.activeProbe.tiltAngle_deg.toFixed(1)}° (vs Z)</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Predicted Microstructure:</span>
                <span className={`font-bold ${
                  simulationResults.activeProbe.cetMorphology === "Columnar"
                    ? "text-rose-400"
                    : simulationResults.activeProbe.cetMorphology === "Mixed CET"
                    ? "text-blue-400"
                    : "text-emerald-400"
                }`}>
                  {simulationResults.activeProbe.cetMorphology}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 3 COLUMNS: INTERACTIVE CANVAS, CHARTS & SCIENTIFIC TABS */}
        <div className="lg:col-span-3 space-y-4">
          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("3d-webgl-overlay")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                activeTab === "3d-webgl-overlay"
                  ? "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1424]"
              }`}
            >
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D WebGL Melt Pool &amp; Porosity</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                3D WebGL
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("multi-track-map")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                activeTab === "multi-track-map"
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1424]"
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Track Hatch CET Map (Y-Z)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cet-diagram")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                activeTab === "cet-diagram"
                  ? "bg-purple-500/20 text-purple-200 border border-purple-400/50 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1424]"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Hunt CET Diagram (G vs R)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cooling-anisotropy")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                activeTab === "cooling-anisotropy"
                  ? "bg-pink-500/20 text-pink-200 border border-pink-400/50 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1424]"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-pink-400" />
              <span>G × R Anisotropy Radar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("embedded-python-simulator")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                activeTab === "embedded-python-simulator"
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/50 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1424]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Python Simulation Engine</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Py 3.10
              </span>
            </button>
          </div>

          {/* TAB CONTENT: 0. 3D WEBGL MELT POOL & SOLIDIFICATION POROSITY OVERLAY */}
          {activeTab === "3d-webgl-overlay" && (
            <div className="space-y-4">
              <SolidificationMeltPool3DWebGL
                alloy={alloy}
                laserPower_W={laserPower_W}
                scanSpeed_mms={scanSpeed_mms}
                beamDiameter_um={beamDiameter_um}
                bedPreheat_C={bedPreheat_C}
                layerThickness_um={layerThickness_um}
                hatchSpacing_um={hatchSpacing_um}
                effectiveN0_m3={effectiveN0_m3}
              />
            </div>
          )}

          {/* TAB CONTENT: 1. MULTI-TRACK MAP */}
          {activeTab === "multi-track-map" && (
            <div className="space-y-4">
              {/* Visualization Mode Selector */}
              <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-3 shadow-lg flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Display Field Mode:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "cet-map", label: "CET Grain Morphology", color: "text-purple-300" },
                    { id: "cooling-rate-gxr", label: "Cooling Rate (G × R)", color: "text-yellow-300" },
                    { id: "thermal-gradient-g", label: "Thermal Gradient (G)", color: "text-rose-300" },
                    { id: "solidification-rate-r", label: "Solidification Rate (R)", color: "text-emerald-300" },
                    { id: "grain-growth-angle", label: "Growth Tilt Angle (ψ)", color: "text-pink-300" },
                    { id: "microstructure-synthetic", label: "Synthetic Dendrites", color: "text-cyan-300" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setActiveVisualization(mode.id as VisualizationMode)}
                      className={`py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold transition ${
                        activeVisualization === mode.id
                          ? "bg-cyan-500/20 text-white border border-cyan-400/50 shadow-sm"
                          : "bg-[#050810] text-slate-400 border border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas Container */}
              <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white">
                      Transverse Multi-Track Solidification Cross-Section (Y-Z Plane)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span className="text-slate-400">Columnar</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      <span className="text-slate-400">Mixed CET</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-slate-400">Equiaxed</span>
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <canvas
                    ref={canvasRef}
                    width={780}
                    height={380}
                    className="w-full h-auto rounded-xl border border-slate-800/80 bg-[#060913] shadow-inner"
                  />
                </div>

                {/* Physics Explanation Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] font-mono">
                  <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800/80 text-slate-300 space-y-1">
                    <div className="text-cyan-400 font-bold flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5" />
                      <span>Epitaxial Growth Vector</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[10px]">
                      Dendrites grow along <span className="text-cyan-300">-∇T</span>. Near the base, growth is nearly vertical (<span className="text-cyan-300">ψ ≈ 0°</span>); near the pool center/top, the vector tilts forward by <span className="text-cyan-300">ψ ≈ 45°-65°</span>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800/80 text-slate-300 space-y-1">
                    <div className="text-amber-400 font-bold flex items-center gap-1">
                      <Waves className="w-3.5 h-3.5" />
                      <span>Hatch Overlap &amp; Texture Reorientation</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[10px]">
                      Adjacent scan passes remelt <span className="text-amber-300">{Math.round(simulationResults.remeltFraction * 100)}%</span> of the prior track width, truncating side grains and restarting competitive epitaxial growth from the remelt boundary.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800/80 text-slate-300 space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>CET Transition Zone</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[10px]">
                      Under high constitutional undercooling or inoculant density (<span className="text-emerald-300">N₀ = 10^{inoculantBoost_logN0}</span>), equiaxed grains block advancing columnar dendrites, promoting isotropic grain refinement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 2. CET DIAGRAM (G vs R) */}
          {activeTab === "cet-diagram" && (
            <div className="space-y-4">
              <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">
                        Hunt Columnar-to-Equiaxed Transition (CET) Diagram (G vs. R)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Plots the solidifying melt pool trajectory from bottom boundary (left/top: high G, low R) to top trailing tail (right/bottom: lower G, high R).
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    n = {alloy.huntExponent_n} | a_CET = {alloy.huntConstant_aCET.toExponential(1)}
                  </span>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={cetDiagramData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="R_mms"
                        type="number"
                        stroke="#64748b"
                        domain={["auto", "auto"]}
                        label={{
                          value: "Solidification Velocity R (mm/s)",
                          position: "insideBottom",
                          offset: -15,
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        stroke="#64748b"
                        label={{
                          value: "Thermal Gradient G (10³ K/mm)",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#94a3b8",
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#050810",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          fontSize: "11px",
                          color: "#f8fafc",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Line
                        type="monotone"
                        dataKey="G_K_mm"
                        name="Solidification Path G(R)"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#06b6d4" }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="G_col_K_mm"
                        name="Columnar Threshold (Φ_eq < 0.66%)"
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                        strokeWidth={1.8}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="G_eq_K_mm"
                        name="Equiaxed Threshold (Φ_eq > 49%)"
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        strokeWidth={1.8}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#050810] border border-slate-800 space-y-1">
                    <span className="text-cyan-400 font-bold">Hunt Solidification Criterion:</span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      <span className="text-rose-400 font-bold">Gⁿ / R ≥ K_col</span>: Fully Columnar Grain Growth.<br />
                      <span className="text-blue-400 font-bold">K_eq &lt; Gⁿ / R &lt; K_col</span>: Mixed CET Zone.<br />
                      <span className="text-emerald-400 font-bold">Gⁿ / R ≤ K_eq</span>: Fully Equiaxed Grain Nucleation.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050810] border border-slate-800 space-y-1">
                    <span className="text-purple-400 font-bold">Inoculation Effect (Grain Refinement):</span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Increasing heterogeneous nucleation site density <span className="text-emerald-300">N₀</span> shifts the critical boundary downwards, allowing equiaxed nucleation at higher thermal gradients without reducing productivity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 3. COOLING RATE ANISOTROPY RADAR */}
          {activeTab === "cooling-anisotropy" && (
            <div className="space-y-4">
              <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-pink-400" />
                      <h3 className="text-sm font-bold text-white">
                        Directional Solidification Cooling Rate &amp; Gradient Anisotropy
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Polar representation of thermal gradient magnitude, front velocity, cooling rate (G × R), and crystallographic tilt angle.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-pink-300 px-3 py-1 rounded-xl bg-pink-500/10 border border-pink-500/30">
                    Anisotropy: {simulationResults.coolingRateAnisotropyRatio.toFixed(1)}x
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarAnisotropyData}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="angle" stroke="#94a3b8" fontSize={10} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                        <Radar
                          name="Cooling Rate (G×R)"
                          dataKey="coolingRateNorm"
                          stroke="#eab308"
                          fill="#eab308"
                          fillOpacity={0.4}
                        />
                        <Radar
                          name="Thermal Gradient (G)"
                          dataKey="gradientNorm"
                          stroke="#f43f5e"
                          fill="#f43f5e"
                          fillOpacity={0.25}
                        />
                        <Radar
                          name="Solidification Velocity (R)"
                          dataKey="velocityNorm"
                          stroke="#06b6d4"
                          fill="#06b6d4"
                          fillOpacity={0.25}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-[#050810] border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-cyan-400 font-bold">
                        <span>Bottom Boundary (θ = 90°)</span>
                        <span>Base Solidification</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        • Gradient G: <span className="text-rose-400">Max ({(simulationResults.maxGradient * 1e-6).toFixed(2)} × 10⁶ K/m)</span><br />
                        • Velocity R: <span className="text-cyan-400">Min (~0 mm/s)</span><br />
                        • Growth Direction: <span className="text-purple-300">Vertical (ψ ≈ 0° along Z)</span>
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#050810] border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-yellow-400 font-bold">
                        <span>Melt Pool Centerline / Tail (θ = 0°)</span>
                        <span>Trailing Surface</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        • Gradient G: <span className="text-rose-400">Flatter ({(simulationResults.minGradient * 1e-6).toFixed(2)} × 10⁶ K/m)</span><br />
                        • Velocity R: <span className="text-cyan-400">Max ({scanSpeed_mms} mm/s = v_scan)</span><br />
                        • Cooling Rate Ṫ: <span className="text-yellow-300">Peak ({(simulationResults.maxCoolingRate * 1e-6).toFixed(2)} × 10⁶ K/s)</span><br />
                        • Growth Direction: <span className="text-purple-300">Tilted Forward (ψ ≈ 60°-70°)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 4. EMBEDDED PYTHON SIMULATION ENGINE */}
          {activeTab === "embedded-python-simulator" && (
            <div className="space-y-4">
              <EmbeddedPythonLPBFSimulator
                alloy={alloy}
                laserPower_W={laserPower_W}
                scanSpeed_mms={scanSpeed_mms}
                beamDiameter_um={beamDiameter_um}
                bedPreheat_C={bedPreheat_C}
                layerThickness_um={layerThickness_um}
                hatchSpacing_um={hatchSpacing_um}
                effectiveN0_m3={effectiveN0_m3}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

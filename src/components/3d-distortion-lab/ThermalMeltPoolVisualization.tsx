import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useMaterialSpecimenStore } from "../../store/useMaterialSpecimenStore";
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
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";

export interface AlloyThermalProfile {
  id: string;
  name: string;
  category: string;
  thermalConductivity_k: number; // W/(m*K)
  density_rho: number; // kg/m3
  specificHeat_cp: number; // J/(kg*K)
  liquidusTemp_Tl: number; // °C
  solidusTemp_Ts: number; // °C
  boilingTemp_Tb: number; // °C
  laserAbsorptivity_A: number; // 0..1
  sdasConstant_A0: number; // empirical constant for SDAS
  sdasExponent_n: number; // exponent for SDAS
  defaultPower_W: number;
  defaultSpeed_mms: number;
  defaultSpot_um: number;
  description: string;
}

export const THERMAL_ALLOYS: AlloyThermalProfile[] = [
  {
    id: "in718",
    name: "Inconel 718 (Nickel Superalloy)",
    category: "Nickel-Base",
    thermalConductivity_k: 11.4,
    density_rho: 8190,
    specificHeat_cp: 435,
    liquidusTemp_Tl: 1336,
    solidusTemp_Ts: 1260,
    boilingTemp_Tb: 2913,
    laserAbsorptivity_A: 0.55,
    sdasConstant_A0: 50.0,
    sdasExponent_n: 0.35,
    defaultPower_W: 285,
    defaultSpeed_mms: 960,
    defaultSpot_um: 80,
    description: "Low thermal conductivity yields steep thermal gradients and fine Nb-segregated interdendritic Laves phases.",
  },
  {
    id: "ti64",
    name: "Ti-6Al-4V Grade 23 ELI",
    category: "Titanium",
    thermalConductivity_k: 6.7,
    density_rho: 4430,
    specificHeat_cp: 526,
    liquidusTemp_Tl: 1660,
    solidusTemp_Ts: 1604,
    boilingTemp_Tb: 3287,
    laserAbsorptivity_A: 0.68,
    sdasConstant_A0: 42.0,
    sdasExponent_n: 0.38,
    defaultPower_W: 250,
    defaultSpeed_mms: 1200,
    defaultSpot_um: 70,
    description: "Ultra-low thermal conductivity causes high local heat accumulation, rapid martensitic α' transformation.",
  },
  {
    id: "alsi10mg",
    name: "AlSi10Mg (High Conductivity)",
    category: "Aluminum",
    thermalConductivity_k: 130.0,
    density_rho: 2680,
    specificHeat_cp: 910,
    liquidusTemp_Tl: 590,
    solidusTemp_Ts: 550,
    boilingTemp_Tb: 2470,
    laserAbsorptivity_A: 0.22,
    sdasConstant_A0: 39.0,
    sdasExponent_n: 0.32,
    defaultPower_W: 370,
    defaultSpeed_mms: 1400,
    defaultSpot_um: 90,
    description: "High thermal conductivity and reflectivity require high energy input; produces ultrafine cellular Si network.",
  },
  {
    id: "ss316l",
    name: "SS 316L (Austenitic)",
    category: "Stainless Steel",
    thermalConductivity_k: 16.3,
    density_rho: 7990,
    specificHeat_cp: 500,
    liquidusTemp_Tl: 1440,
    solidusTemp_Ts: 1375,
    boilingTemp_Tb: 2810,
    laserAbsorptivity_A: 0.50,
    sdasConstant_A0: 45.0,
    sdasExponent_n: 0.33,
    defaultPower_W: 200,
    defaultSpeed_mms: 800,
    defaultSpot_um: 75,
    description: "Moderate conductivity with excellent melt stability; cellular sub-grain boundaries enriched in Cr and Mo.",
  },
  {
    id: "scalmalloy",
    name: "Scalmalloy (Al-Mg-Sc-Zr)",
    category: "Aluminum-Scandium",
    thermalConductivity_k: 110.0,
    density_rho: 2770,
    specificHeat_cp: 890,
    liquidusTemp_Tl: 650,
    solidusTemp_Ts: 610,
    boilingTemp_Tb: 2490,
    laserAbsorptivity_A: 0.26,
    sdasConstant_A0: 30.0,
    sdasExponent_n: 0.36,
    defaultPower_W: 380,
    defaultSpeed_mms: 1500,
    defaultSpot_um: 85,
    description: "Al3(Sc,Zr) primary precipitates act as heterogeneous nucleants, promoting fine equiaxed grain zone along melt boundary.",
  },
  {
    id: "haynes282",
    name: "Haynes 282 (Gamma-Prime Superalloy)",
    category: "Nickel-Base",
    thermalConductivity_k: 11.1,
    density_rho: 8270,
    specificHeat_cp: 430,
    liquidusTemp_Tl: 1370,
    solidusTemp_Ts: 1290,
    boilingTemp_Tb: 2950,
    laserAbsorptivity_A: 0.54,
    sdasConstant_A0: 48.0,
    sdasExponent_n: 0.35,
    defaultPower_W: 275,
    defaultSpeed_mms: 900,
    defaultSpot_um: 80,
    description: "Gamma-prime strengthened alloy with low strain-age cracking propensity; requires tight melt pool cooling control.",
  },
];

export type ViewPlane = "xy-longitudinal" | "xz-side" | "yz-transverse";
export type HeatmapColorMode = "cooling-rate" | "temperature" | "gradient" | "solidification-velocity" | "hunt-microstructure";

export interface SolidificationProbeData {
  x_um: number;
  y_um: number;
  temperature_C: number;
  coolingRate_Ks: number;
  gradient_G_Kmm: number;
  velocity_R_mms: number;
  sdas_um: number;
  phase: "Superheated Liquid" | "Mushy Zone (Solidification Front)" | "Solidified Matrix" | "Base Powder/Substrate";
  microstructure: "Fine Cellular" | "Columnar Dendritic" | "Equiaxed Dendritic" | "Planar Stable";
  cetRatio_G35_R: number; // Hunt CET parameter: G^3.5 / R
}

export const ThermalMeltPoolVisualization: React.FC = () => {
  // Universal Specimen State from single reactive Zustand store
  const activeSpecimen = useMaterialSpecimenStore((s) => s.activeSpecimen);
  const [selectedAlloyId, setSelectedAlloyId] = useState<string>("active-universal-specimen");

  const activeUniversalThermalAlloy = useMemo<AlloyThermalProfile>(() => {
    return {
      id: "active-universal-specimen",
      name: activeSpecimen.name,
      category: activeSpecimen.category,
      thermalConductivity_k: activeSpecimen.lpbf.thermalConductivity_k_WmK,
      density_rho: activeSpecimen.lpbf.density_rho_kgm3,
      specificHeat_cp: activeSpecimen.lpbf.specificHeat_Cp_JkgK,
      liquidusTemp_Tl: activeSpecimen.liquidus_C,
      solidusTemp_Ts: activeSpecimen.solidus_C,
      boilingTemp_Tb: Math.round(activeSpecimen.liquidus_C * 1.85 + 200),
      laserAbsorptivity_A: activeSpecimen.lpbf.laserAbsorptivity,
      sdasConstant_A0: 48.0,
      sdasExponent_n: 0.35,
      defaultPower_W: activeSpecimen.lpbf.recommendedLaserPower_W,
      defaultSpeed_mms: activeSpecimen.lpbf.recommendedScanSpeed_mms,
      defaultSpot_um: 80,
      description: `Universal Specimen Thread (${activeSpecimen.chemicalFormula}) synced live from ${activeSpecimen.sourceTab}.`,
    };
  }, [activeSpecimen]);

  const lpbfJob = useMaterialSpecimenStore((s) => s.activeSpecimen.lpbf);
  const updateLpbfProcess = useMaterialSpecimenStore((s) => s.updateLpbfProcess);

  // Primary Laser & Process Parameters — Build Job store
  const laserPower_W = lpbfJob.laserPower_W;
  const scanSpeed_mms = lpbfJob.scanSpeed_mms;
  const beamSpotRadius_um = lpbfJob.beamDiameter_um / 2;
  const preheatTemp_C = lpbfJob.preheatTemp_C;
  const beamProfile = lpbfJob.beamProfile === "flat-top" ? "top-hat" : "gaussian";
  const setLaserPower_W = (v: number) => updateLpbfProcess({ laserPower_W: v });
  const setScanSpeed_mms = (v: number) => updateLpbfProcess({ scanSpeed_mms: v });
  const setBeamSpotRadius_um = (v: number) => updateLpbfProcess({ beamDiameter_um: Math.round(v * 2) });
  const setPreheatTemp_C = (v: number) => updateLpbfProcess({ preheatTemp_C: v });
  const setBeamProfile = (v: "gaussian" | "top-hat") =>
    updateLpbfProcess({ beamProfile: v === "top-hat" ? "flat-top" : "gaussian" });

  // Visualization Modes & Toggles
  const [viewPlane, setViewPlane] = useState<ViewPlane>("xy-longitudinal");
  const [colorMode, setColorMode] = useState<HeatmapColorMode>("cooling-rate");
  const [showIsotherms, setShowIsotherms] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showMushyZone, setShowMushyZone] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showMicrostructureOverlay, setShowMicrostructureOverlay] = useState<boolean>(false);
  const [probePos, setProbePos] = useState<{ x_um: number; y_um: number } | null>({ x_um: -120, y_um: 20 });

  // Grid Resolution for Heatmap (X x Y cells)
  const gridResX = 48;
  const gridResY = 32;

  const alloy = useMemo(() => {
    if (selectedAlloyId === "active-universal-specimen") {
      return activeUniversalThermalAlloy;
    }
    return THERMAL_ALLOYS.find((a) => a.id === selectedAlloyId) || activeUniversalThermalAlloy;
  }, [selectedAlloyId, activeUniversalThermalAlloy]);

  const handleSelectAlloy = (aId: string) => {
    setSelectedAlloyId(aId);
  };

  // Process vector lives in useMaterialSpecimenStore.lpbf — do not reset on composition ticks.

  // -------------------------------------------------------------
  // ANALYTICAL 3D ROSENTHAL / MODIFIED EAGAR-TSAI THERMAL SOLVER
  // -------------------------------------------------------------
  // Coordinate frame attached to beam center (x=0, y=0, z=0):
  // Laser moves in +x direction, so trailing melt pool is at x < 0.
  // Physical bounds:
  // X: from -350 µm (tail) to +150 µm (ahead of beam)
  // Y: from -160 µm to +160 µm (transverse width)
  // Z: from 0 (surface) to 180 µm (depth)
  const xMin_um = -360;
  const xMax_um = 140;
  const yMin_um = -150;
  const yMax_um = 150;

  // Thermal diffusivity: alpha = k / (rho * Cp) [m^2/s]
  const alpha = useMemo(() => {
    return alloy.thermalConductivity_k / (alloy.density_rho * alloy.specificHeat_cp);
  }, [alloy]);

  // Rosenthal 3D Temperature Function T(x, y, z) in °C
  const calculateTemperature = useCallback(
    (x_um: number, y_um: number, z_um: number = 0): number => {
      const x_m = x_um * 1e-6;
      const y_m = y_um * 1e-6;
      const z_m = z_um * 1e-6;
      const v_m_s = scanSpeed_mms * 1e-3;
      const r0_m = beamSpotRadius_um * 1e-6;
      const profileEfficiency = beamProfile === "gaussian" ? 1.0 : 0.88;
      const P_eff = laserPower_W * alloy.laserAbsorptivity_A * profileEfficiency;

      // Regularized distance from heat source core: R = sqrt(x^2 + y^2 + z^2 + r0^2)
      const R_m = Math.sqrt(x_m * x_m + y_m * y_m + z_m * z_m + r0_m * r0_m);
      if (R_m <= 0) return preheatTemp_C;

      // Rosenthal analytical steady-state term:
      // T - T0 = (P_eff / (2 * pi * k * R)) * exp( - (v / (2 * alpha)) * (R + x) )
      const expArg = -(v_m_s / (2 * alpha)) * (R_m + x_m);
      // Clamp exp argument to prevent underflow/overflow
      const clampedExpArg = Math.max(-50, Math.min(0, expArg));
      const deltaT = (P_eff / (2 * Math.PI * alloy.thermalConductivity_k * R_m)) * Math.exp(clampedExpArg);

      const calculatedT = preheatTemp_C + deltaT;
      return Math.min(alloy.boilingTemp_Tb + 300, calculatedT);
    },
    [alloy, laserPower_W, scanSpeed_mms, beamSpotRadius_um, preheatTemp_C, beamProfile, alpha]
  );

  // Compute Thermal Gradient Vector [Gx, Gy], Magnitude G (K/m or K/mm), Solidification Velocity R (mm/s), Cooling Rate (K/s)
  const computePointPhysics = useCallback(
    (x_um: number, y_um: number, z_um: number = 0): SolidificationProbeData => {
      const h_um = 1.0; // small delta for numerical differentiation
      const T_center = calculateTemperature(x_um, y_um, z_um);
      const T_xPlus = calculateTemperature(x_um + h_um, y_um, z_um);
      const T_xMinus = calculateTemperature(x_um - h_um, y_um, z_um);
      const T_yPlus = calculateTemperature(x_um, y_um + h_um, z_um);
      const T_yMinus = calculateTemperature(x_um, y_um - h_um, z_um);

      // Temperature spatial derivatives: dT/dx, dT/dy (K/m)
      const dTx_Km = ((T_xPlus - T_xMinus) / (2 * h_um * 1e-6));
      const dTy_Km = ((T_yPlus - T_yMinus) / (2 * h_um * 1e-6));

      // Gradient magnitude G = sqrt(dTx^2 + dTy^2)
      const G_Km = Math.sqrt(dTx_Km * dTx_Km + dTy_Km * dTy_Km);
      const G_Kmm = G_Km * 1e-3; // K/mm

      // Normal vector pointing along dendrite growth direction (into liquid, opposite to thermal gradient)
      // Solidification growth velocity R = v * cos(theta) = v * (-dTx / G)
      const v_m_s = scanSpeed_mms * 1e-3;
      let cosTheta = G_Km > 1e-3 ? -dTx_Km / G_Km : 0;
      cosTheta = Math.max(0, Math.min(1, cosTheta)); // forward solidification growth
      const R_ms = v_m_s * cosTheta;
      const R_mms = R_ms * 1e3; // mm/s

      // Cooling rate T_dot = G * R = v * |dT/dx| (K/s)
      const coolingRate_Ks = Math.max(10, Math.abs(dTx_Km * v_m_s));

      // Secondary Dendrite Arm Spacing (SDAS) lambda_2 = A0 * (dT/dt)^(-n) (µm)
      const sdas_um = parseFloat(
        (alloy.sdasConstant_A0 * Math.pow(Math.max(100, coolingRate_Ks), -alloy.sdasExponent_n)).toFixed(2)
      );

      // Phase identification
      let phase: SolidificationProbeData["phase"] = "Solidified Matrix";
      if (T_center >= alloy.liquidusTemp_Tl) {
        phase = "Superheated Liquid";
      } else if (T_center >= alloy.solidusTemp_Ts) {
        phase = "Mushy Zone (Solidification Front)";
      } else if (T_center > preheatTemp_C + 50) {
        phase = "Solidified Matrix";
      } else {
        phase = "Base Powder/Substrate";
      }

      // Hunt CET morphology criterion: G^3.5 / R
      // Higher ratio favors Columnar grains; Lower ratio triggers Columnar-to-Equiaxed Transition (CET)
      const cetRatio_G35_R = R_ms > 1e-6 ? Math.pow(G_Km, 3.5) / R_ms : 1e15;
      let microstructure: SolidificationProbeData["microstructure"] = "Columnar Dendritic";
      if (phase === "Superheated Liquid") {
        microstructure = "Planar Stable";
      } else if (coolingRate_Ks > 2e6) {
        microstructure = "Fine Cellular";
      } else if (cetRatio_G35_R < 1e12 || cosTheta < 0.25) {
        microstructure = "Equiaxed Dendritic";
      } else {
        microstructure = "Columnar Dendritic";
      }

      return {
        x_um: Math.round(x_um),
        y_um: Math.round(y_um),
        temperature_C: Math.round(T_center),
        coolingRate_Ks: Math.round(coolingRate_Ks),
        gradient_G_Kmm: Math.round(G_Kmm),
        velocity_R_mms: parseFloat(R_mms.toFixed(1)),
        sdas_um,
        phase,
        microstructure,
        cetRatio_G35_R,
      };
    },
    [calculateTemperature, scanSpeed_mms, alloy, preheatTemp_C]
  );

  // -------------------------------------------------------------
  // GENERATE 2D DISCRETIZED HEATMAP CELLS
  // -------------------------------------------------------------
  const heatmapCells = useMemo(() => {
    const cells = [];
    const stepX = (xMax_um - xMin_um) / gridResX;
    const stepY = (yMax_um - yMin_um) / gridResY;

    for (let i = 0; i < gridResX; i++) {
      const x_um = xMin_um + (i + 0.5) * stepX;
      for (let j = 0; j < gridResY; j++) {
        const y_um = yMin_um + (j + 0.5) * stepY;

        let z_coord = 0;
        let evalX = x_um;
        let evalY = y_um;

        if (viewPlane === "xz-side") {
          // X is longitudinal, Y-axis represents Depth Z (from 0 to 180 µm)
          evalX = x_um;
          evalY = 0;
          z_coord = Math.max(0, (y_um - yMin_um) * 0.6);
        } else if (viewPlane === "yz-transverse") {
          // X-axis represents Y (transverse), Y-axis represents Depth Z
          evalX = 0;
          evalY = x_um * 0.7;
          z_coord = Math.max(0, (y_um - yMin_um) * 0.6);
        }

        const pointData = computePointPhysics(evalX, evalY, z_coord);

        cells.push({
          i,
          j,
          x_um: Math.round(x_um),
          y_um: Math.round(y_um),
          width: stepX,
          height: stepY,
          ...pointData,
        });
      }
    }
    return cells;
  }, [xMin_um, xMax_um, yMin_um, yMax_um, gridResX, gridResY, viewPlane, computePointPhysics]);

  // -------------------------------------------------------------
  // SOLIDIFICATION FRONT ISOTHERM CONTOUR GENERATION
  // -------------------------------------------------------------
  const { liquidusPath, solidusPath, meltPoolLength_um, meltPoolWidth_um, meltPoolDepth_um } = useMemo(() => {
    // Generate polygonal contours for T = T_liquidus and T = T_solidus in SVG coordinate space
    const topPointsLiq: { x: number; y: number }[] = [];
    const botPointsLiq: { x: number; y: number }[] = [];
    const topPointsSol: { x: number; y: number }[] = [];
    const botPointsSol: { x: number; y: number }[] = [];

    const numSamples = 60;
    const xStep = (xMax_um - xMin_um) / numSamples;
    let minX_liq = 999;
    let maxX_liq = -999;
    let maxY_liq = 0;

    for (let s = 0; s <= numSamples; s++) {
      const testX = xMin_um + s * xStep;

      // Binary search for Y where T(x, y, 0) == T_liquidus
      let lowY = 0;
      let highY = yMax_um;
      let foundY_liq: number | null = null;
      let foundY_sol: number | null = null;

      // Check if centerline temperature exceeds liquidus
      const tCenter = calculateTemperature(testX, 0, 0);
      if (tCenter >= alloy.liquidusTemp_Tl) {
        if (testX < minX_liq) minX_liq = testX;
        if (testX > maxX_liq) maxX_liq = testX;

        // Binary search for liquidus
        for (let iter = 0; iter < 12; iter++) {
          const midY = (lowY + highY) / 2;
          const tMid = calculateTemperature(testX, midY, 0);
          if (tMid > alloy.liquidusTemp_Tl) {
            lowY = midY;
          } else {
            highY = midY;
          }
        }
        foundY_liq = (lowY + highY) / 2;
        if (foundY_liq > maxY_liq) maxY_liq = foundY_liq;
      }

      // Binary search for solidus
      if (tCenter >= alloy.solidusTemp_Ts) {
        lowY = 0;
        highY = yMax_um;
        for (let iter = 0; iter < 12; iter++) {
          const midY = (lowY + highY) / 2;
          const tMid = calculateTemperature(testX, midY, 0);
          if (tMid > alloy.solidusTemp_Ts) {
            lowY = midY;
          } else {
            highY = midY;
          }
        }
        foundY_sol = (lowY + highY) / 2;
      }

      if (foundY_liq !== null && foundY_liq > 0.5) {
        topPointsLiq.push({ x: testX, y: foundY_liq });
        botPointsLiq.unshift({ x: testX, y: -foundY_liq });
      }

      if (foundY_sol !== null && foundY_sol > 0.5) {
        topPointsSol.push({ x: testX, y: foundY_sol });
        botPointsSol.unshift({ x: testX, y: -foundY_sol });
      }
    }

    const formatSvgPath = (topPts: { x: number; y: number }[], botPts: { x: number; y: number }[]) => {
      const allPts = [...topPts, ...botPts];
      if (allPts.length < 3) return "";
      return allPts.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ") + " Z";
    };

    const liqPath = formatSvgPath(topPointsLiq, botPointsLiq);
    const solPath = formatSvgPath(topPointsSol, botPointsSol);

    const length_um = maxX_liq > minX_liq ? Math.round(maxX_liq - minX_liq) : 0;
    const width_um = Math.round(maxY_liq * 2);

    // Calculate approximate depth along Z at x=0
    let depth_um = 0;
    for (let z = 0; z < 250; z += 2) {
      if (calculateTemperature(0, 0, z) >= alloy.liquidusTemp_Tl) {
        depth_um = z;
      } else {
        break;
      }
    }

    return {
      liquidusPath: liqPath,
      solidusPath: solPath,
      meltPoolLength_um: length_um,
      meltPoolWidth_um: width_um,
      meltPoolDepth_um: depth_um,
    };
  }, [xMin_um, xMax_um, yMax_um, calculateTemperature, alloy]);

  // -------------------------------------------------------------
  // SOLIDIFICATION GROWTH VECTORS (DENDRITE ORIENTATIONS)
  // -------------------------------------------------------------
  const solidificationVectors = useMemo(() => {
    // Generate normal arrows pointing from solid into liquid along the trailing solidification front
    const vectors = [];
    const sampleAngles = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

    for (const angleDeg of sampleAngles) {
      const rad = (angleDeg * Math.PI) / 180;
      // Search along ray for solidus front
      for (let r = 20; r < 300; r += 8) {
        const x = -r * Math.cos(rad * 0.6) - 30;
        const y = r * Math.sin(rad);
        if (x < xMin_um || x > xMax_um || y < yMin_um || y > yMax_um) continue;

        const temp = calculateTemperature(x, y, 0);
        if (Math.abs(temp - alloy.solidusTemp_Ts) < 45) {
          const phys = computePointPhysics(x, y, 0);
          // Vector direction opposite to thermal gradient
          const length = Math.min(24, Math.max(8, phys.velocity_R_mms * 0.02));
          vectors.push({
            x,
            y,
            R_mms: phys.velocity_R_mms,
            G_Kmm: phys.gradient_G_Kmm,
            coolingRate: phys.coolingRate_Ks,
            dx: -Math.cos(rad * 0.6) * length,
            dy: -Math.sin(rad) * length,
          });
          break;
        }
      }
    }
    return vectors;
  }, [calculateTemperature, computePointPhysics, alloy, xMin_um, xMax_um, yMin_um, yMax_um]);

  // -------------------------------------------------------------
  // 1D CENTERLINE & TRANSVERSE PROFILES FOR RECHARTS
  // -------------------------------------------------------------
  const centerlineChartData = useMemo(() => {
    const data = [];
    const steps = 40;
    const stepX = (xMax_um - xMin_um) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(xMin_um + i * stepX);
      const phys = computePointPhysics(x, 0, 0);
      data.push({
        x_um: x,
        temperature: phys.temperature_C,
        coolingRate_log: Math.max(2, parseFloat(Math.log10(Math.max(10, phys.coolingRate_Ks)).toFixed(2))),
        coolingRate_actual: phys.coolingRate_Ks,
        gradient: phys.gradient_G_Kmm,
        velocity: phys.velocity_R_mms,
        sdas: phys.sdas_um,
      });
    }
    return data;
  }, [xMin_um, xMax_um, computePointPhysics]);

  const transverseChartData = useMemo(() => {
    const data = [];
    const steps = 30;
    const stepY = (yMax_um - yMin_um) / steps;
    const evalX = -meltPoolLength_um * 0.4; // sample across the middle of the tail
    for (let i = 0; i <= steps; i++) {
      const y = Math.round(yMin_um + i * stepY);
      const phys = computePointPhysics(evalX, y, 0);
      data.push({
        y_um: y,
        temperature: phys.temperature_C,
        coolingRate_actual: phys.coolingRate_Ks,
        gradient: phys.gradient_G_Kmm,
        velocity: phys.velocity_R_mms,
      });
    }
    return data;
  }, [yMin_um, yMax_um, meltPoolLength_um, computePointPhysics]);

  // -------------------------------------------------------------
  // COLOR SCALE MAPPING HELPERS
  // -------------------------------------------------------------
  const getCellColor = useCallback(
    (cell: any): string => {
      if (colorMode === "cooling-rate") {
        // Logarithmic scale: 10^3 (blue) -> 10^5 (cyan) -> 10^6 (yellow) -> 10^7 (red/white)
        const logRate = Math.log10(Math.max(100, cell.coolingRate_Ks));
        if (logRate <= 3.5) return "#1e3a8a"; // dark blue
        if (logRate <= 4.5) return "#0284c7"; // sky blue
        if (logRate <= 5.3) return "#06b6d4"; // cyan
        if (logRate <= 5.8) return "#10b981"; // emerald
        if (logRate <= 6.3) return "#eab308"; // yellow
        if (logRate <= 6.8) return "#f97316"; // orange
        return "#ef4444"; // high red
      } else if (colorMode === "temperature") {
        // Temperature scale: preheat (dark slate) -> solidus (cyan/green) -> liquidus (yellow) -> superheat (red/white)
        const t = cell.temperature_C;
        if (t < alloy.solidusTemp_Ts * 0.6) return "#0f172a";
        if (t < alloy.solidusTemp_Ts) return "#0369a1";
        if (t < alloy.liquidusTemp_Tl) return "#10b981"; // Mushy
        if (t < alloy.liquidusTemp_Tl + 400) return "#f59e0b"; // Molten
        return "#ef4444"; // Superheated
      } else if (colorMode === "gradient") {
        // Thermal Gradient G (K/mm)
        const g = cell.gradient_G_Kmm;
        if (g < 500) return "#1e293b";
        if (g < 1500) return "#0284c7";
        if (g < 4000) return "#8b5cf6";
        if (g < 8000) return "#ec4899";
        return "#f43f5e";
      } else if (colorMode === "solidification-velocity") {
        // Solidification growth rate R (mm/s)
        const r = cell.velocity_R_mms;
        if (r < 100) return "#1e293b";
        if (r < 400) return "#3b82f6";
        if (r < 800) return "#10b981";
        if (r < 1200) return "#f59e0b";
        return "#ef4444";
      } else {
        // Hunt CET Microstructure
        if (cell.phase === "Superheated Liquid") return "#f59e0b";
        if (cell.microstructure === "Fine Cellular") return "#06b6d4";
        if (cell.microstructure === "Columnar Dendritic") return "#8b5cf6";
        if (cell.microstructure === "Equiaxed Dendritic") return "#10b981";
        return "#334155";
      }
    },
    [colorMode, alloy]
  );

  // SVG Coordinate Conversion
  const svgWidth = 620;
  const svgHeight = 360;
  const mapX = useCallback(
    (x_um: number) => {
      return ((x_um - xMin_um) / (xMax_um - xMin_um)) * svgWidth;
    },
    [xMin_um, xMax_um, svgWidth]
  );

  const mapY = useCallback(
    (y_um: number) => {
      return ((y_um - yMin_um) / (yMax_um - yMin_um)) * svgHeight;
    },
    [yMin_um, yMax_um, svgHeight]
  );

  const unmapX = useCallback(
    (svgX: number) => {
      return xMin_um + (svgX / svgWidth) * (xMax_um - xMin_um);
    },
    [xMin_um, xMax_um, svgWidth]
  );

  const unmapY = useCallback(
    (svgY: number) => {
      return yMin_um + (svgY / svgHeight) * (yMax_um - yMin_um);
    },
    [yMin_um, yMax_um, svgHeight]
  );

  // Active Probe Data
  const currentProbe = useMemo(() => {
    if (!probePos) return null;
    return computePointPhysics(probePos.x_um, probePos.y_um, 0);
  }, [probePos, computePointPhysics]);

  // Handle SVG Click to set probe
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const scaledX = (clickX / rect.width) * svgWidth;
    const scaledY = (clickY / rect.height) * svgHeight;
    setProbePos({
      x_um: Math.round(unmapX(scaledX)),
      y_um: Math.round(unmapY(scaledY)),
    });
  };

  // Export CSV Data of Solidification Front
  const handleExportCsv = () => {
    let csv = "X_um,Y_um,Temperature_C,CoolingRate_Ks,Gradient_G_Kmm,SolidificationVelocity_R_mms,SDAS_um,Phase,Microstructure\n";
    heatmapCells.forEach((c) => {
      csv += `${c.x_um},${c.y_um},${c.temperature_C},${c.coolingRate_Ks},${c.gradient_G_Kmm},${c.velocity_R_mms},${c.sdas_um},"${c.phase}","${c.microstructure}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LPBF_Thermal_MeltPool_${alloy.id}_${laserPower_W}W_${scanSpeed_mms}mms.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#090e18] border border-[#1e2d46] rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-400/40 rounded-xl">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Thermal Melt Pool & Solidification Front Lab</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 font-mono">
                  2D Rosenthal Heatmap
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Analytical cooling rate field ($\dot&#123;T&#125; = G \cdot R$), liquidus/solidus mushy boundary & dendritic orientation
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1627] hover:bg-[#16233b] border border-[#1e2d46] hover:border-cyan-500/50 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition shadow"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV Grid</span>
          </button>
        </div>
      </div>

      {/* TOP CONTROL GRID: ALLOY PRESETS & PROCESS PARAMS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT 4 COLS: ALLOY SELECTION & MATERIAL THERMAL PROPERTIES */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Alloy Thermal Specification</span>
            </h3>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {/* Universal Reactive Specimen Card */}
              <button
                type="button"
                onClick={() => handleSelectAlloy("active-universal-specimen")}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between ${
                  selectedAlloyId === "active-universal-specimen"
                    ? "bg-sky-500/20 text-sky-200 border-sky-400 font-semibold shadow-[0_0_14px_rgba(56,189,248,0.25)] ring-1 ring-sky-400"
                    : "bg-sky-950/20 text-sky-300 hover:text-white hover:bg-sky-950/35 border-sky-800/40"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-white">{activeSpecimen.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200 font-mono">UNIVERSAL</span>
                  </div>
                  <span className="text-[10px] text-sky-300 block font-mono">
                    {activeSpecimen.chemicalFormula} • k = {activeUniversalThermalAlloy.thermalConductivity_k} W/m·K
                  </span>
                </div>
                {selectedAlloyId === "active-universal-specimen" && <ChevronRight className="w-4 h-4 text-sky-400" />}
              </button>

              {THERMAL_ALLOYS.map((item) => {
                const isSel = item.id === selectedAlloyId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAlloy(item.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between ${
                      isSel
                        ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/60 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        : "bg-[#050810] text-slate-400 hover:text-slate-200 hover:bg-[#0d1627] border-[#162032]"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        k = {item.thermalConductivity_k} W/m·K • T_l = {item.liquidusTemp_Tl}°C
                      </span>
                    </div>
                    {isSel && <ChevronRight className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Alloy Physical Summary Banner */}
            <div className="p-3 bg-[#050810] border border-[#1e2d46] rounded-xl text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Thermal Conductivity (k):</span>
                <span className="font-mono font-bold text-cyan-300">{alloy.thermalConductivity_k} W/(m·K)</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Liquidus / Solidus (Tl / Ts):</span>
                <span className="font-mono font-bold text-amber-300">
                  {alloy.liquidusTemp_Tl}°C / {alloy.solidusTemp_Ts}°C
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Laser Absorptivity (A):</span>
                <span className="font-mono font-bold text-emerald-300">{alloy.laserAbsorptivity_A * 100}%</span>
              </div>
              <p className="text-[10px] text-slate-500 italic border-t border-[#162032] pt-1.5">
                {alloy.description}
              </p>
            </div>
          </div>

          {/* PROCESS CONTROLS PANEL */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Laser & Scan Controls</span>
            </h3>

            {/* Laser Power Slider */}
            <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Laser Power (P):</span>
                <span className="font-bold text-amber-400 font-mono">{laserPower_W} W</span>
              </div>
              <input
                type="range"
                min="80"
                max="600"
                step="5"
                value={laserPower_W}
                onChange={(e) => setLaserPower_W(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Scan Speed Slider */}
            <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Scan Velocity (v):</span>
                <span className="font-bold text-cyan-400 font-mono">{scanSpeed_mms} mm/s</span>
              </div>
              <input
                type="range"
                min="200"
                max="2500"
                step="25"
                value={scanSpeed_mms}
                onChange={(e) => setScanSpeed_mms(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Spot Radius & Preheat */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <span className="text-slate-400 text-[10px] block">Beam Radius (r0):</span>
                <span className="font-bold text-purple-300 font-mono">{beamSpotRadius_um} µm</span>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="5"
                  value={beamSpotRadius_um}
                  onChange={(e) => setBeamSpotRadius_um(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <span className="text-slate-400 text-[10px] block">Preheat Temp (T0):</span>
                <span className="font-bold text-rose-300 font-mono">{preheatTemp_C} °C</span>
                <input
                  type="range"
                  min="25"
                  max="400"
                  step="25"
                  value={preheatTemp_C}
                  onChange={(e) => setPreheatTemp_C(parseFloat(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Beam Profile Mode */}
            <div className="flex items-center justify-between p-2 bg-[#050810] rounded-xl border border-[#1e2d46] text-xs">
              <span className="text-slate-400 text-[11px]">Beam Intensity Profile:</span>
              <div className="flex gap-1">
                {(["gaussian", "top-hat"] as const).map((prof) => (
                  <button
                    key={prof}
                    type="button"
                    onClick={() => setBeamProfile(prof)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono capitalize transition ${
                      beamProfile === prof
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold"
                        : "bg-[#090e18] text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {prof}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 8 COLS: 2D COOLING RATE HEATMAP & SVG SOLIDIFICATION FRONT */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
            {/* VIEWPORT CONTROLS & HEATMAP SWITCHERS */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#162032] pb-3">
              {/* Color Mode Switcher */}
              <div className="flex items-center gap-1 bg-[#050810] p-1 rounded-xl border border-[#1e2d46]">
                {[
                  { id: "cooling-rate", label: "Cooling Rate (Ṫ)" },
                  { id: "temperature", label: "Temperature (T)" },
                  { id: "gradient", label: "Gradient (G)" },
                  { id: "solidification-velocity", label: "Velocity (R)" },
                  { id: "hunt-microstructure", label: "Hunt Microstructure" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setColorMode(mode.id as HeatmapColorMode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                      colorMode === mode.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowIsotherms(!showIsotherms)}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                    showIsotherms
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/50 font-bold"
                      : "bg-[#050810] text-slate-500 border-[#162032]"
                  }`}
                >
                  Isotherms (Tl/Ts)
                </button>
                <button
                  type="button"
                  onClick={() => setShowVectors(!showVectors)}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                    showVectors
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 font-bold"
                      : "bg-[#050810] text-slate-500 border-[#162032]"
                  }`}
                >
                  Vectors (n, R)
                </button>
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                    showGrid
                      ? "bg-purple-500/20 text-purple-300 border-purple-400/50 font-bold"
                      : "bg-[#050810] text-slate-500 border-[#162032]"
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>

            {/* 2D SVG CANVAS HEATMAP */}
            <div className="relative w-full bg-[#04060d] border border-[#162032] rounded-xl overflow-hidden shadow-inner">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto cursor-crosshair select-none block"
                onClick={handleSvgClick}
              >
                <defs>
                  {/* Marker for Solidification Normal Growth Vectors */}
                  <marker
                    id="growth-arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
                  </marker>
                </defs>

                {/* Background Discretized Heatmap Rectangles */}
                {heatmapCells.map((cell) => {
                  const svgX = mapX(cell.x_um - cell.width / 2);
                  const svgY = mapY(cell.y_um - cell.height / 2);
                  const svgW = mapX(cell.x_um + cell.width / 2) - svgX;
                  const svgH = mapY(cell.y_um + cell.height / 2) - svgY;
                  const fillColor = getCellColor(cell);

                  return (
                    <rect
                      key={`${cell.i}-${cell.j}`}
                      x={svgX}
                      y={svgY}
                      width={Math.max(0.5, svgW)}
                      height={Math.max(0.5, svgH)}
                      fill={fillColor}
                      opacity={0.88}
                    />
                  );
                })}

                {/* Coordinate Grid Lines */}
                {showGrid && (
                  <g opacity="0.18" stroke="#94a3b8" strokeDasharray="3 3">
                    {/* Horizontal Centerline (y=0) */}
                    <line x1="0" y1={mapY(0)} x2={svgWidth} y2={mapY(0)} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="none" />
                    {/* Vertical Laser Centerline (x=0) */}
                    <line x1={mapX(0)} y1="0" x2={mapX(0)} y2={svgHeight} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="none" />

                    {/* Additional grid intervals at -300, -200, -100, 100 um */}
                    {[-300, -200, -100, 100].map((gx) => (
                      <line key={`gx-${gx}`} x1={mapX(gx)} y1="0" x2={mapX(gx)} y2={svgHeight} />
                    ))}
                    {[-100, -50, 50, 100].map((gy) => (
                      <line key={`gy-${gy}`} x1="0" y1={mapY(gy)} x2={svgWidth} y2={mapY(gy)} />
                    ))}
                  </g>
                )}

                {/* Mushy Zone & Isotherms */}
                {showMushyZone && solidusPath && (
                  <path
                    d={solidusPath}
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="rgba(16, 185, 129, 0.7)"
                    strokeWidth="1.8"
                    strokeDasharray="4 2"
                  />
                )}

                {showIsotherms && liquidusPath && (
                  <path
                    d={liquidusPath}
                    fill="rgba(245, 158, 11, 0.25)"
                    stroke="#f59e0b"
                    strokeWidth="2.2"
                  />
                )}

                {/* Laser Spot Gaussian Radius Circle at (0,0) */}
                <circle
                  cx={mapX(0)}
                  cy={mapY(0)}
                  r={((beamSpotRadius_um) / (xMax_um - xMin_um)) * svgWidth}
                  fill="rgba(239, 68, 68, 0.35)"
                  stroke="#ef4444"
                  strokeWidth="2"
                  className="animate-pulse"
                />

                {/* Laser Motion Arrow (Scan Direction -> +X) */}
                <g transform={`translate(${mapX(40)}, ${mapY(-90)})`}>
                  <line x1="0" y1="0" x2="35" y2="0" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#growth-arrow)" />
                  <text x="42" y="4" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    v_scan ({scanSpeed_mms} mm/s)
                  </text>
                </g>

                {/* Solidification Normal Growth Vectors (Dendrite orientations) */}
                {showVectors &&
                  solidificationVectors.map((vec, idx) => {
                    const startX = mapX(vec.x);
                    const startY = mapY(vec.y);
                    const endX = mapX(vec.x + vec.dx);
                    const endY = mapY(vec.y + vec.dy);

                    return (
                      <g key={`vec-${idx}`}>
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke="#38bdf8"
                          strokeWidth="1.6"
                          markerEnd="url(#growth-arrow)"
                        />
                        <circle cx={startX} cy={startY} r="2" fill="#38bdf8" />
                      </g>
                    );
                  })}

                {/* Active Probe Crosshair Marker */}
                {probePos && (
                  <g transform={`translate(${mapX(probePos.x_um)}, ${mapY(probePos.y_um)})`}>
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#ffffff" strokeWidth="1.5" />
                    <line x1="0" y1="-12" x2="0" y2="12" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="5" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
                  </g>
                )}

                {/* SVG Coordinate Labels & Axis Markings */}
                <text x="8" y="18" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  X (Longitudinal Scan Axis) [µm]
                </text>
                <text x="8" y="32" fill="#64748b" fontSize="9" fontFamily="monospace">
                  Trailing Melt Tail (x &lt; 0) ← Laser Beam (x=0) → Ahead of Track (x &gt; 0)
                </text>

                {/* Scale Indicators */}
                <text x={mapX(-300)} y={svgHeight - 8} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  -300 µm
                </text>
                <text x={mapX(-150)} y={svgHeight - 8} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  -150 µm
                </text>
                <text x={mapX(0)} y={svgHeight - 8} fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  0 µm (Laser)
                </text>
                <text x={mapX(100)} y={svgHeight - 8} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  +100 µm
                </text>
              </svg>

              {/* OVERLAY COLORBAR LEGEND */}
              <div className="absolute top-3 right-3 bg-[#090e18]/90 backdrop-blur border border-[#1e2d46] p-2.5 rounded-xl text-[10px] space-y-1.5 pointer-events-none shadow-xl">
                <span className="font-bold block text-cyan-300 uppercase tracking-wider font-mono">
                  {colorMode === "cooling-rate" && "Cooling Rate (K/s)"}
                  {colorMode === "temperature" && "Temperature (°C)"}
                  {colorMode === "gradient" && "Thermal Gradient (K/mm)"}
                  {colorMode === "solidification-velocity" && "Growth Velocity R (mm/s)"}
                  {colorMode === "hunt-microstructure" && "Microstructure Zone"}
                </span>

                {colorMode === "cooling-rate" && (
                  <>
                    <div className="w-32 h-2.5 rounded-full bg-gradient-to-r from-blue-700 via-cyan-500 via-emerald-400 via-yellow-400 to-red-500 border border-white/20" />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>10³ K/s</span>
                      <span>10⁵</span>
                      <span>5×10⁶+</span>
                    </div>
                  </>
                )}

                {colorMode === "temperature" && (
                  <>
                    <div className="w-32 h-2.5 rounded-full bg-gradient-to-r from-slate-900 via-blue-600 via-emerald-500 via-amber-400 to-red-600 border border-white/20" />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>{preheatTemp_C}°C</span>
                      <span>Ts:{alloy.solidusTemp_Ts}°</span>
                      <span>&gt;{alloy.liquidusTemp_Tl}°</span>
                    </div>
                  </>
                )}

                {colorMode === "hunt-microstructure" && (
                  <div className="space-y-1 text-[9px] font-mono">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Liquid Core</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Cellular Grain</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Columnar Dendritic</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Equiaxed CET</div>
                  </div>
                )}
              </div>

              {/* OVERLAY HINT */}
              <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 pointer-events-none bg-[#050810]/80 px-2 py-1 rounded-md border border-[#162032]">
                <Crosshair className="w-3 h-3 text-cyan-400" />
                <span>Click anywhere on SVG to place probe</span>
              </div>
            </div>

            {/* DERIVED MELT POOL GEOMETRY METRICS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Melt Pool Length (L):</span>
                <span className="text-base font-bold text-amber-400 font-mono">{meltPoolLength_um} µm</span>
                <span className="text-[9px] text-slate-500">Liquidus isotherm extent</span>
              </div>

              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Melt Pool Width (W):</span>
                <span className="text-base font-bold text-cyan-400 font-mono">{meltPoolWidth_um} µm</span>
                <span className="text-[9px] text-slate-500">Transverse 2*Y_max</span>
              </div>

              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Penetration Depth (D):</span>
                <span className="text-base font-bold text-purple-400 font-mono">{meltPoolDepth_um} µm</span>
                <span className="text-[9px] text-slate-500">Z-axis fusion depth</span>
              </div>

              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-0.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Aspect Ratio (L/W):</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {meltPoolWidth_um > 0 ? (meltPoolLength_um / meltPoolWidth_um).toFixed(2) : "1.00"}
                </span>
                <span className="text-[9px] text-slate-500">Teardrop elongation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROBE INSPECTOR & REAL-TIME SOLIDIFICATION DIAGNOSTICS */}
      {currentProbe && (
        <div className="bg-[#090e18] border border-cyan-500/40 rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162032] pb-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Solidification Front Probe Telemetry at ({currentProbe.x_um} µm, {currentProbe.y_um} µm)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                currentProbe.phase === "Superheated Liquid"
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                  : currentProbe.phase === "Mushy Zone (Solidification Front)"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                  : "bg-blue-500/20 text-blue-300 border-blue-400/40"
              }`}>
                {currentProbe.phase}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 font-mono font-bold">
                {currentProbe.microstructure}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Local Temperature:</span>
              <span className="text-lg font-bold text-amber-400 font-mono block">
                {currentProbe.temperature_C} <span className="text-xs text-slate-400">°C</span>
              </span>
              <span className="text-[10px] text-slate-500">Tl: {alloy.liquidusTemp_Tl}°C</span>
            </div>

            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Cooling Rate (Ṫ):</span>
              <span className="text-lg font-bold text-cyan-400 font-mono block">
                {(currentProbe.coolingRate_Ks / 1e3).toFixed(1)}k <span className="text-xs text-slate-400">K/s</span>
              </span>
              <span className="text-[10px] text-slate-500">G · R = v · |dT/dx|</span>
            </div>

            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Thermal Gradient (G):</span>
              <span className="text-lg font-bold text-purple-400 font-mono block">
                {currentProbe.gradient_G_Kmm} <span className="text-xs text-slate-400">K/mm</span>
              </span>
              <span className="text-[10px] text-slate-500">||∇T|| vector magnitude</span>
            </div>

            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Growth Velocity (R):</span>
              <span className="text-lg font-bold text-emerald-400 font-mono block">
                {currentProbe.velocity_R_mms} <span className="text-xs text-slate-400">mm/s</span>
              </span>
              <span className="text-[10px] text-slate-500">v · cos(θ_normal)</span>
            </div>

            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Dendrite Spacing (λ2):</span>
              <span className="text-lg font-bold text-rose-400 font-mono block">
                {currentProbe.sdas_um} <span className="text-xs text-slate-400">µm</span>
              </span>
              <span className="text-[10px] text-slate-500">A0 · (Ṫ)^(-n) SDAS</span>
            </div>

            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Hunt CET Parameter:</span>
              <span className="text-lg font-bold text-blue-400 font-mono block">
                {currentProbe.cetRatio_G35_R > 1e15 ? ">10¹⁵" : currentProbe.cetRatio_G35_R.toExponential(2)}
              </span>
              <span className="text-[10px] text-slate-500">G^3.5 / R ratio</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG / RECHARTS 1D PROFILES ACROSS MELT POOL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CHART 1: LONGITUDINAL CENTERLINE PROFILE T(x) & COOLING RATE Ṫ(x) */}
        <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#162032] pb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Centerline Temperature T(x) & Cooling Rate (y=0)</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Recharts 1D Scan Axis</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={centerlineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="coolGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="x_um"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => `${val}µm`}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#f59e0b"
                  fontSize={10}
                  tickFormatter={(val) => `${val}°C`}
                  domain={[0, "auto"]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#06b6d4"
                  fontSize={10}
                  tickFormatter={(val) => `10^${val}`}
                  domain={[2, 7]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#050810",
                    borderColor: "#1e2d46",
                    borderRadius: "0.75rem",
                    fontSize: "11px",
                    color: "#f8fafc",
                  }}
                  formatter={(val: any, name: any) => {
                    if (name === "Temperature (°C)") return [`${val} °C`, name];
                    if (name === "Cooling Rate log10(K/s)") return [`10^${val} K/s`, name];
                    return [val, name];
                  }}
                  labelFormatter={(val) => `Scan Coordinate X = ${val} µm`}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine
                  y={alloy.liquidusTemp_Tl}
                  yAxisId="left"
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: `Tl: ${alloy.liquidusTemp_Tl}°C`, fill: "#ef4444", fontSize: 9 }}
                />
                <ReferenceLine
                  y={alloy.solidusTemp_Ts}
                  yAxisId="left"
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  label={{ value: `Ts: ${alloy.solidusTemp_Ts}°C`, fill: "#10b981", fontSize: 9 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#tempGrad)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="coolingRate_log"
                  name="Cooling Rate log10(K/s)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: TRANSVERSE GRADIENT G(y) & SOLIDIFICATION VELOCITY R(y) */}
        <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#162032] pb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Transverse Thermal Gradient G(y) & Growth Velocity R(y)</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Melt Tail Cross-Section</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transverseChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="y_um"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => `${val}µm`}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#a855f7"
                  fontSize={10}
                  tickFormatter={(val) => `${val}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={10}
                  tickFormatter={(val) => `${val}mm/s`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#050810",
                    borderColor: "#1e2d46",
                    borderRadius: "0.75rem",
                    fontSize: "11px",
                    color: "#f8fafc",
                  }}
                  labelFormatter={(val) => `Transverse Coordinate Y = ${val} µm`}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="gradient"
                  name="Thermal Gradient G (K/mm)"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="velocity"
                  name="Solidification Velocity R (mm/s)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

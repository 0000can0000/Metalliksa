import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Layers,
  Flame,
  Activity,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Cpu,
  BarChart3,
  Waves,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Maximize2,
  Clock,
  Compass,
  FileCode,
  Copy,
  Check,
  Terminal,
  Grid,
  Download,
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
} from "recharts";

export type ScanStrategyType = "meander" | "unidirectional" | "chessboard" | "stripes";

export interface AlloyThermalProps {
  name: string;
  density: number; // kg/m^3
  specificHeat: number; // J/(kg K)
  thermalConductivity: number; // W/(m K)
  solidusTemp: number; // K
  liquidusTemp: number; // K
  absorptivity: number;
}

export const AM_ALLOYS: Record<string, AlloyThermalProps> = {
  "Inconel 718": {
    name: "Inconel 718",
    density: 8190,
    specificHeat: 435,
    thermalConductivity: 11.4,
    solidusTemp: 1533, // 1260 C
    liquidusTemp: 1609, // 1336 C
    absorptivity: 0.48,
  },
  "Ti-6Al-4V Grade 5": {
    name: "Ti-6Al-4V Grade 5",
    density: 4430,
    specificHeat: 526,
    thermalConductivity: 6.7,
    solidusTemp: 1878, // 1605 C
    liquidusTemp: 1928, // 1655 C
    absorptivity: 0.42,
  },
  "316L Stainless Steel": {
    name: "316L Stainless Steel",
    density: 7990,
    specificHeat: 500,
    thermalConductivity: 16.2,
    solidusTemp: 1648, // 1375 C
    liquidusTemp: 1673, // 1400 C
    absorptivity: 0.52,
  },
  "AlSi10Mg": {
    name: "AlSi10Mg",
    density: 2680,
    specificHeat: 915,
    thermalConductivity: 130.0,
    solidusTemp: 830, // 557 C
    liquidusTemp: 867, // 594 C
    absorptivity: 0.28,
  },
};

export interface MultiTrackLabProps {
  currentPower_W?: number;
  currentSpeed_mms?: number;
  currentHatch_um?: number;
  currentPreheat_C?: number;
  currentMaterial?: string;
  onApplyStrategy?: (strategy: {
    scanStrategy: ScanStrategyType;
    interPassDwell_us: number;
    skyWritingEnabled: boolean;
    layerRotation_deg: number;
  }) => void;
}

export const MultiTrackThermalAccumulationLab: React.FC<MultiTrackLabProps> = ({
  currentPower_W = 285,
  currentSpeed_mms = 960,
  currentHatch_um = 110,
  currentPreheat_C = 80,
  currentMaterial = "Inconel 718",
  onApplyStrategy,
}) => {
  // Strategy & Process Parameters
  const [selectedAlloyKey, setSelectedAlloyKey] = useState<string>(
    AM_ALLOYS[currentMaterial] ? currentMaterial : "Inconel 718"
  );
  const alloy = AM_ALLOYS[selectedAlloyKey] || AM_ALLOYS["Inconel 718"];

  const [laserPower_W, setLaserPower_W] = useState<number>(currentPower_W);
  const [scanSpeed_mms, setScanSpeed_mms] = useState<number>(currentSpeed_mms);
  const [hatchSpacing_um, setHatchSpacing_um] = useState<number>(currentHatch_um);
  const [preheatTemp_C, setPreheatTemp_C] = useState<number>(currentPreheat_C);

  useEffect(() => {
    if (currentPower_W != null) setLaserPower_W(currentPower_W);
    if (currentSpeed_mms != null) setScanSpeed_mms(currentSpeed_mms);
    if (currentHatch_um != null) setHatchSpacing_um(currentHatch_um);
    if (currentPreheat_C != null) setPreheatTemp_C(currentPreheat_C);
  }, [currentPower_W, currentSpeed_mms, currentHatch_um, currentPreheat_C]);

  // Advanced Scan Strategy Controls
  const [scanStrategy, setScanStrategy] = useState<ScanStrategyType>("meander");
  const [numTracks, setNumTracks] = useState<number>(14); // 6 to 24 tracks
  const [trackLength_mm, setTrackLength_mm] = useState<number>(4.0); // 1.5 to 8.0 mm
  const [layerRotation_deg, setLayerRotation_deg] = useState<number>(67); // 0, 45, 67, 90 deg
  const [interPassDwell_us, setInterPassDwell_us] = useState<number>(80); // 0 to 500 us jump/delay
  const [skyWritingEnabled, setSkyWritingEnabled] = useState<boolean>(true); // Turnaround laser attenuation
  const [recoaterDwellTime_s, setRecoaterDwellTime_s] = useState<number>(8.5); // Recoater blade time
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(12); // Layer 1 to 50 for Z-accumulation

  // Goldak Double-Ellipsoid Heat Source Geometric Parameters
  const [goldak_a_f_um, setGoldak_a_f_um] = useState<number>(45); // Front semi-axis (length)
  const [goldak_a_r_um, setGoldak_a_r_um] = useState<number>(110); // Rear semi-axis (length)
  const [goldak_b_um, setGoldak_b_um] = useState<number>(55); // Semi-width
  const [goldak_c_um, setGoldak_c_um] = useState<number>(75); // Semi-depth

  // Live Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animProgress, setAnimProgress] = useState<number>(0.35); // 0.0 to 1.0 (over all tracks)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [activeViewMode, setActiveViewMode] = useState<"temperature" | "goldak-flux" | "melt-depth" | "cooling-rate">("temperature");
  const [activeMainTab, setActiveMainTab] = useState<"canvas-heatmap" | "time-resolved-curves" | "python-goldak-script">("canvas-heatmap");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedPython, setCopiedPython] = useState<boolean>(false);

  // Time-stepping animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 25;
    const step = (0.005 * playbackRate * (scanSpeed_mms / 1000)) / (numTracks * 0.15);
    const timer = setInterval(() => {
      setAnimProgress((prev) => (prev + step) % 1.0);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackRate, scanSpeed_mms, numTracks]);

  // PHYSICS SIMULATION ENGINE: Multi-Track Goldak Double-Ellipsoid & Thermal Superposition
  const simulationResults = useMemo(() => {
    const P_eff = laserPower_W * alloy.absorptivity;
    const v_mps = scanSpeed_mms * 1e-3;
    const rho = alloy.density;
    const Cp = alloy.specificHeat;
    const k = alloy.thermalConductivity;
    const alpha = k / (rho * Cp); // thermal diffusivity [m^2/s]
    const T_ambient = preheatTemp_C + 273.15; // K

    // Goldak Energy Partitioning factors (f_f + f_r = 2)
    const a_f = goldak_a_f_um * 1e-6;
    const a_r = goldak_a_r_um * 1e-6;
    const b = goldak_b_um * 1e-6;
    const c = goldak_c_um * 1e-6;
    const f_f = (2 * a_f) / (a_f + a_r); // ~0.58
    const f_r = (2 * a_r) / (a_f + a_r); // ~1.42

    // Volumetric peak power density: q_0 = (6 * sqrt(3) * P_eff * f) / (pi * sqrt(pi) * a * b * c)
    const q_peak_front = (6 * Math.sqrt(3) * P_eff * f_f) / (Math.PI * Math.sqrt(Math.PI) * a_f * b * c); // W/m^3
    const q_peak_rear = (6 * Math.sqrt(3) * P_eff * f_r) / (Math.PI * Math.sqrt(Math.PI) * a_r * b * c);

    // Layer-level thermal resistance accumulation
    // As build height (Z) increases, heat flow to base plate decreases: R_th = Z / (k * A)
    const currentZ_height_mm = activeLayerIndex * 0.04;
    const layerPreheatBoost_K = (activeLayerIndex * 2.8 * (P_eff / 120)) * (1.0 / (k / 15));
    const effectiveBaseTemp_K = T_ambient + layerPreheatBoost_K;

    // Track-by-track calculation
    const trackData: Array<{
      trackIdx: number;
      localPreheat_C: number;
      peakTemp_C: number;
      meltWidth_um: number;
      meltDepth_um: number;
      coolingRate_K_s: number;
      isKeyholeRegime: boolean;
      overheatingRisk: number; // 0 to 100%
      dwellCooldown_C: number;
    }> = [];

    // Base Single-Track Nominal Dimensions from Goldak
    const singleTrackWidth_um = Math.round(b * 2 * 1e6 * 1.08);
    const singleTrackDepth_um = Math.round(c * 1e6 * 0.95);

    let currentResidualBoost_K = 0;
    const trackTransitTime_s = (trackLength_mm * 1e-3) / v_mps;
    const interTrackDelay_s = (interPassDwell_us * 1e-6);
    const totalCyclePerTrack_s = trackTransitTime_s + interTrackDelay_s;

    // Fourier 2D diffusion decay across hatch distance: tau = h^2 / (4 * alpha)
    const h_m = hatchSpacing_um * 1e-6;
    const diffusionDecay = Math.exp(-totalCyclePerTrack_s * (4 * alpha) / (h_m * h_m + 1e-10));

    // Time-resolved temperature history samples for Recharts
    const timeResolvedCurve: Array<{
      time_ms: number;
      trackLabel: string;
      T_peak_C: number;
      T_preheat_C: number;
      T_liquidus: number;
      solidus_C: number;
    }> = [];

    let accumulatedTime_ms = 0;

    for (let i = 0; i < numTracks; i++) {
      let strategyFactor = 1.0;
      if (scanStrategy === "unidirectional") {
        strategyFactor = 0.65;
      } else if (scanStrategy === "chessboard") {
        strategyFactor = 0.42;
      } else if (scanStrategy === "stripes") {
        strategyFactor = 0.85;
      } else {
        // Meander
        strategyFactor = skyWritingEnabled ? 1.05 : 1.38;
      }

      // Add incremental heat from Goldak heat flux
      const heatInputPerTrack_K = (P_eff / (rho * Cp * Math.max(1e-9, singleTrackWidth_um * 1e-6 * singleTrackDepth_um * 1e-6 * trackLength_mm * 1e-3))) * 0.00045 * strategyFactor;
      currentResidualBoost_K = (currentResidualBoost_K * diffusionDecay) + heatInputPerTrack_K;

      const localPreheat_K = effectiveBaseTemp_K + currentResidualBoost_K;
      const localPreheat_C = Math.round(localPreheat_K - 273.15);

      // Peak Temperature calculation with Goldak volumetric flux scaling
      const peakTemp_K = localPreheat_K + (P_eff / (Math.PI * k * (singleTrackWidth_um * 1e-6 * 0.5))) * 0.72;
      const peakTemp_C = Math.round(peakTemp_K - 273.15);

      // Melt Pool expansion due to accumulated local preheat
      const deltaT = Math.max(100, alloy.liquidusTemp - localPreheat_K);
      const meltWidth_um = Math.round(singleTrackWidth_um * Math.sqrt((alloy.liquidusTemp - effectiveBaseTemp_K) / deltaT));
      const meltDepth_um = Math.round(singleTrackDepth_um * Math.pow((alloy.liquidusTemp - effectiveBaseTemp_K) / deltaT, 0.75));

      // Cooling rate: dT/dt = -2 * pi * k * (T - T_0)^2 / (P_eff / v)
      const coolingRate_K_s = Math.round(
        (2 * Math.PI * k * Math.pow(alloy.liquidusTemp - localPreheat_K, 2)) / (P_eff / v_mps)
      );

      // Keyhole threshold
      const isKeyholeRegime = (meltDepth_um / meltWidth_um) > 0.78 || peakTemp_C > 2850;
      const overheatingRisk = Math.min(
        100,
        Math.max(0, Math.round(((localPreheat_C - preheatTemp_C) / 450) * 100 + (isKeyholeRegime ? 35 : 0)))
      );

      const dwellCooldown_C = Math.round((localPreheat_K - effectiveBaseTemp_K) * (1 - diffusionDecay));

      trackData.push({
        trackIdx: i + 1,
        localPreheat_C,
        peakTemp_C,
        meltWidth_um,
        meltDepth_um,
        coolingRate_K_s,
        isKeyholeRegime,
        overheatingRisk,
        dwellCooldown_C,
      });

      // Time chart data points
      accumulatedTime_ms += trackTransitTime_s * 1000;
      timeResolvedCurve.push({
        time_ms: parseFloat(accumulatedTime_ms.toFixed(2)),
        trackLabel: `Track #${i + 1} Peak`,
        T_peak_C: peakTemp_C,
        T_preheat_C: localPreheat_C,
        T_liquidus: Math.round(alloy.liquidusTemp - 273.15),
        solidus_C: Math.round(alloy.solidusTemp - 273.15),
      });

      accumulatedTime_ms += interTrackDelay_s * 1000;
      timeResolvedCurve.push({
        time_ms: parseFloat(accumulatedTime_ms.toFixed(2)),
        trackLabel: `Track #${i + 1} Dwell`,
        T_peak_C: localPreheat_C + 150,
        T_preheat_C: localPreheat_C,
        T_liquidus: Math.round(alloy.liquidusTemp - 273.15),
        solidus_C: Math.round(alloy.solidusTemp - 273.15),
      });
    }

    const firstTrack = trackData[0];
    const lastTrack = trackData[numTracks - 1];
    const maxAccumulatedPreheat_C = Math.max(...trackData.map((t) => t.localPreheat_C));
    const widthGrowth_pct = Math.round(((lastTrack.meltWidth_um - firstTrack.meltWidth_um) / firstTrack.meltWidth_um) * 100);
    const depthGrowth_pct = Math.round(((lastTrack.meltDepth_um - firstTrack.meltDepth_um) / firstTrack.meltDepth_um) * 100);
    const coolingRateDrop_pct = Math.round(((firstTrack.coolingRate_K_s - lastTrack.coolingRate_K_s) / firstTrack.coolingRate_K_s) * 100);

    return {
      trackData,
      firstTrack,
      lastTrack,
      maxAccumulatedPreheat_C,
      widthGrowth_pct,
      depthGrowth_pct,
      coolingRateDrop_pct,
      currentZ_height_mm: parseFloat(currentZ_height_mm.toFixed(2)),
      effectiveBaseTemp_C: Math.round(effectiveBaseTemp_K - 273.15),
      q_peak_front_GW_m3: parseFloat((q_peak_front / 1e9).toFixed(2)),
      q_peak_rear_GW_m3: parseFloat((q_peak_rear / 1e9).toFixed(2)),
      f_f: parseFloat(f_f.toFixed(2)),
      f_r: parseFloat(f_r.toFixed(2)),
      timeResolvedCurve,
      totalCyclePerTrack_s: parseFloat((totalCyclePerTrack_s * 1000).toFixed(2)),
    };
  }, [
    laserPower_W,
    scanSpeed_mms,
    hatchSpacing_um,
    preheatTemp_C,
    alloy,
    scanStrategy,
    numTracks,
    trackLength_mm,
    interPassDwell_us,
    skyWritingEnabled,
    activeLayerIndex,
    goldak_a_f_um,
    goldak_a_r_um,
    goldak_b_um,
    goldak_c_um,
  ]);

  // REAL-TIME CANVAS RENDERING: Multi-Track Thermal Field & Goldak Heat Source
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background Canvas
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, width, height);

    // Padding & Coordinate System
    const padX = 60;
    const padY = 45;
    const fieldWidth = width - padX * 2;
    const fieldHeight = height - padY * 2;

    // Grid spacing per track
    const trackGap = fieldHeight / Math.max(1, numTracks - 1);

    // 1. Draw Inactive Substrate Bed Grid
    ctx.strokeStyle = "#162032";
    ctx.lineWidth = 1;
    for (let i = 0; i < numTracks; i++) {
      const y = padY + i * trackGap;
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(padX, y);
      ctx.lineTo(padX + fieldWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Track Index Label
      ctx.fillStyle = "#475569";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`H#${i + 1}`, padX - 8, y + 3);
    }

    // 2. Compute Active Laser Beam Position along Current Track
    const totalTracks = numTracks;
    const currentTrackIdx = Math.min(totalTracks - 1, Math.floor(animProgress * totalTracks));
    const trackProgress = (animProgress * totalTracks) - currentTrackIdx; // 0.0 to 1.0 within track

    // Scan direction depends on strategy
    let isForward = true;
    if (scanStrategy === "meander") {
      isForward = currentTrackIdx % 2 === 0;
    }

    const currentX = isForward
      ? padX + trackProgress * fieldWidth
      : padX + (1 - trackProgress) * fieldWidth;
    const currentY = padY + currentTrackIdx * trackGap;

    // 3. Draw Completed Tracks & Thermal Trails
    for (let i = 0; i <= currentTrackIdx; i++) {
      const y = padY + i * trackGap;
      const tData = simulationResults.trackData[i] || simulationResults.trackData[0];
      const isPast = i < currentTrackIdx;
      const lengthFraction = isPast ? 1.0 : trackProgress;

      const trackForward = scanStrategy === "meander" ? i % 2 === 0 : true;
      const startX = trackForward ? padX : padX + fieldWidth;
      const endX = trackForward
        ? padX + lengthFraction * fieldWidth
        : padX + fieldWidth - lengthFraction * fieldWidth;

      // Color based on active view mode
      let strokeColor = "rgba(245, 158, 11, 0.4)";
      if (activeViewMode === "temperature") {
        const heatNorm = Math.min(1.0, (tData.localPreheat_C - preheatTemp_C) / 350);
        strokeColor = `rgba(${Math.round(230 + 25 * heatNorm)}, ${Math.round(140 - 80 * heatNorm)}, ${Math.round(40 - 20 * heatNorm)}, 0.65)`;
      } else if (activeViewMode === "goldak-flux") {
        strokeColor = "rgba(56, 189, 248, 0.6)";
      } else if (activeViewMode === "melt-depth") {
        strokeColor = tData.isKeyholeRegime ? "rgba(244, 63, 94, 0.7)" : "rgba(168, 85, 247, 0.6)";
      } else {
        strokeColor = "rgba(16, 185, 129, 0.6)";
      }

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(3, (tData.meltWidth_um / 18));
      ctx.lineCap = "round";
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();

      // Draw Turnaround Overheat Indicator for Meander
      if (scanStrategy === "meander" && isPast && !skyWritingEnabled && (i % 2 === 1)) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        ctx.beginPath();
        ctx.arc(padX, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Draw Goldak Double-Ellipsoid Heat Source Isotherms around Active Laser
    const activeTrackData = simulationResults.trackData[currentTrackIdx] || simulationResults.trackData[0];
    const grad = ctx.createRadialGradient(currentX, currentY, 2, currentX, currentY, 48);

    if (activeViewMode === "goldak-flux") {
      grad.addColorStop(0, "rgba(56, 189, 248, 0.95)");
      grad.addColorStop(0.3, "rgba(59, 130, 246, 0.6)");
      grad.addColorStop(0.7, "rgba(99, 102, 241, 0.2)");
      grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    } else {
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.15, "rgba(251, 191, 36, 0.85)");
      grad.addColorStop(0.45, "rgba(239, 68, 68, 0.5)");
      grad.addColorStop(0.8, "rgba(168, 85, 247, 0.2)");
      grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    }

    ctx.fillStyle = grad;
    ctx.beginPath();

    // Goldak asymmetric elongation along travel direction
    const rx = isForward ? (goldak_a_r_um / 2) : (goldak_a_f_um / 2);
    const ry = (goldak_b_um / 1.5);
    ctx.ellipse(currentX, currentY, Math.max(25, rx), Math.max(16, ry), 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Active Laser Spot Pointer
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(currentX, currentY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 6. HUD Labels on Canvas
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Aktif Hat: ${currentTrackIdx + 1}/${numTracks} | v = ${scanSpeed_mms} mm/s | h = ${hatchSpacing_um} μm`, padX + 12, height - 20);

    ctx.fillStyle = activeTrackData.isKeyholeRegime ? "#f87171" : "#38bdf8";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      `T_peak: ${activeTrackData.peakTemp_C}°C | W: ${activeTrackData.meltWidth_um}μm | D: ${activeTrackData.meltDepth_um}μm`,
      padX + fieldWidth - 260,
      height - 20
    );
  }, [
    animProgress,
    numTracks,
    scanStrategy,
    hatchSpacing_um,
    scanSpeed_mms,
    simulationResults,
    activeViewMode,
    skyWritingEnabled,
    goldak_a_f_um,
    goldak_a_r_um,
    goldak_b_um,
  ]);

  // Generate Executable Python Goldak Multi-Track Thermal Model
  const generatedPythonScript = useMemo(() => {
    return `# ==============================================================================
# METALLIX ICME: GOLDAK DOUBLE-ELLIPSOID MULTI-TRACK THERMAL ACCUMULATION
# Material: ${alloy.name} | Strategy: ${scanStrategy.toUpperCase()}
# Models: Goldak Double-Ellipsoid Heat Source + Fourier 2D Superposition
# ==============================================================================

import numpy as np
import matplotlib.pyplot as plt

def goldak_power_density(x, y, z, P_laser, eta, v_scan, a_f, a_r, b, c):
    """
    Goldak double-ellipsoid volumetric heat flux formulation.
    f_f: front heat partition factor, f_r: rear heat partition factor
    """
    f_f = (2.0 * a_f) / (a_f + a_r)
    f_r = (2.0 * a_r) / (a_f + a_r)
    P_eff = P_laser * eta
    
    # Front quadrant (x >= 0)
    q_f = ((6.0 * np.sqrt(3.0) * P_eff * f_f) / (np.pi * np.sqrt(np.pi) * a_f * b * c)) * \\
          np.exp(-3.0 * (x**2 / a_f**2 + y**2 / b**2 + z**2 / c**2))
    
    # Rear quadrant (x < 0)
    q_r = ((6.0 * np.sqrt(3.0) * P_eff * f_r) / (np.pi * np.sqrt(np.pi) * a_r * b * c)) * \\
          np.exp(-3.0 * (x**2 / a_r**2 + y**2 / b**2 + z**2 / c**2))
    
    return np.where(x >= 0, q_f, q_r)

# --- Process & Material Parameters ---
alloy_name = "${alloy.name}"
P_laser = ${laserPower_W}            # Laser Power [W]
v_scan = ${scanSpeed_mms} * 1e-3         # Scan Velocity [m/s]
hatch = ${hatchSpacing_um} * 1e-6          # Hatch Spacing [m]
T_preheat = ${preheatTemp_C} + 273.15      # Base Preheat [K]
num_tracks = ${numTracks}
track_length = ${trackLength_mm} * 1e-3    # Vector Length [m]
dwell_time = ${interPassDwell_us} * 1e-6   # Inter-track delay [s]

# Goldak Ellipsoid Semi-Axes [m]
a_f = ${goldak_a_f_um} * 1e-6
a_r = ${goldak_a_r_um} * 1e-6
b = ${goldak_b_um} * 1e-6
c = ${goldak_c_um} * 1e-6

# Thermal Constants
k_th = ${alloy.thermalConductivity}        # Thermal conductivity [W/(m*K)]
rho = ${alloy.density}                    # Density [kg/m^3]
Cp = ${alloy.specificHeat}                # Specific heat [J/(kg*K)]
alpha = k_th / (rho * Cp)                # Thermal diffusivity [m^2/s]
eta = ${alloy.absorptivity}               # Laser absorptivity
T_liquidus = ${alloy.liquidusTemp}         # Liquidus Temperature [K]

# --- Inter-Track & Layer Thermal Accumulation Loop ---
time_array = []
temperature_history = []
local_preheat_array = []
melt_widths = []
melt_depths = []

current_preheat_boost = 0.0
total_time = 0.0

print(f"=== METALLIX GOLDAK THERMAL SIMULATION REPORT ===")
print(f"Alloy: {alloy_name} | Scan Strategy: {${JSON.stringify(scanStrategy)}}")
print(f"Peak Front Heat Density: {${simulationResults.q_peak_front_GW_m3}} GW/m^3")
print(f"Peak Rear Heat Density:  {${simulationResults.q_peak_rear_GW_m3}} GW/m^3")

for track_i in range(num_tracks):
    t_pass = track_length / v_scan
    total_cycle = t_pass + dwell_time
    
    # 2D Fourier diffusion decay across hatch spacing
    decay = np.exp(-total_cycle * (4 * alpha) / (hatch**2))
    
    # Volumetric heat injection from Goldak source
    heat_input = (P_laser * eta / (rho * Cp * (b * 2) * c * track_length)) * 0.00045 * (${skyWritingEnabled ? 1.05 : 1.38})
    current_preheat_boost = (current_preheat_boost * decay) + heat_input
    
    local_T0 = T_preheat + current_preheat_boost
    peak_T = local_T0 + (P_laser * eta / (np.pi * k_th * b)) * 0.72
    
    deltaT = max(100.0, T_liquidus - local_T0)
    w_um = (b * 2 * 1e6) * np.sqrt((T_liquidus - T_preheat) / deltaT)
    d_um = (c * 1e6) * ((T_liquidus - T_preheat) / deltaT) ** 0.75
    
    total_time += t_pass
    time_array.append(total_time * 1e3)
    temperature_history.append(peak_T - 273.15)
    local_preheat_array.append(local_T0 - 273.15)
    melt_widths.append(w_um)
    melt_depths.append(d_um)
    
    total_time += dwell_time
    time_array.append(total_time * 1e3)
    temperature_history.append(local_T0 - 273.15 + 150)
    local_preheat_array.append(local_T0 - 273.15)

print(f"Track 1  -> Peak T: {temperature_history[0]:.1f} °C, Width: {melt_widths[0]:.1f} μm, Depth: {melt_depths[0]:.1f} μm")
print(f"Track {num_tracks} -> Peak T: {temperature_history[-2]:.1f} °C, Width: {melt_widths[-1]:.1f} μm, Depth: {melt_depths[-1]:.1f} μm")
print(f"Pool Width Growth: {((melt_widths[-1]-melt_widths[0])/melt_widths[0])*100:.1f} %")

# --- Plotting Results ---
plt.figure(figsize=(10, 4.8))

# Subplot 1: Time-Resolved Temperature History
plt.subplot(1, 2, 1)
plt.plot(time_array, temperature_history, 'r-o', markersize=3, label="Peak Goldak Temperature (°C)")
plt.plot(time_array, local_preheat_array, 'm--', label="Accumulated Local Preheat (°C)")
plt.axhline(T_liquidus - 273.15, color='orange', linestyle=':', label="Liquidus Temp (T_liq)")
plt.title(f"Time-Resolved Thermal Cycles ({alloy_name})")
plt.xlabel("Time (ms)")
plt.ylabel("Temperature (°C)")
plt.grid(True, alpha=0.3)
plt.legend(fontsize=8)

# Subplot 2: Melt Pool Dimension Evolution
plt.subplot(1, 2, 2)
tracks = range(1, num_tracks + 1)
plt.plot(tracks, melt_widths, 'b-s', label="Melt Width W (μm)")
plt.plot(tracks, melt_depths, 'g-^', label="Melt Depth D (μm)")
plt.title("Melt Pool Growth from Inter-Track Accumulation")
plt.xlabel("Track Index")
plt.ylabel("Dimension (μm)")
plt.grid(True, alpha=0.3)
plt.legend(fontsize=8)

plt.tight_layout()
plt.show()
`;
  }, [
    alloy,
    laserPower_W,
    scanSpeed_mms,
    hatchSpacing_um,
    preheatTemp_C,
    numTracks,
    trackLength_mm,
    interPassDwell_us,
    skyWritingEnabled,
    scanStrategy,
    goldak_a_f_um,
    goldak_a_r_um,
    goldak_b_um,
    goldak_c_um,
    simulationResults,
  ]);

  const handleCopyPython = () => {
    navigator.clipboard.writeText(generatedPythonScript);
    setCopiedPython(true);
    setTimeout(() => setCopiedPython(false), 2000);
  };

  // Apply Strategy to Engine
  const handleApplyToEngine = () => {
    if (onApplyStrategy) {
      onApplyStrategy({
        scanStrategy,
        interPassDwell_us,
        skyWritingEnabled,
        layerRotation_deg,
      });
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* HEADER SECTION */}
      <div className="p-4 rounded-2xl bg-[#090e18] border border-[#1e2d46] space-y-3 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)] border border-amber-400/40">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Goldak Multi-Track Thermal Accumulation &amp; Python ICME Workbench
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-400" />
                  Goldak Double-Ellipsoid + Python
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Simulate inter-track delay, layer thermal accumulation, and local peak temperature evolution using the Goldak double-ellipsoid heat flux model.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPython}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {copiedPython ? <Check className="w-3.5 h-3.5 text-white" /> : <Terminal className="w-3.5 h-3.5 text-white" />}
              <span>{copiedPython ? "Python Script Copied!" : "Get Python Script (.py)"}</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToEngine}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Apply Strategy ({scanStrategy.toUpperCase()})</span>
            </button>
          </div>
        </div>

        {/* Strategy Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-[10px] text-slate-400">Scan Strategy Pattern:</span>
          {(
            [
              { id: "meander", label: "Meander (Bidirectional / Zig-zag)", icon: Waves },
              { id: "unidirectional", label: "Unidirectional", icon: ArrowRight },
              { id: "chessboard", label: "Chessboard / Island (5x5mm)", icon: Layers },
              { id: "stripes", label: "Stripe Scanning", icon: TrendingUp },
            ] as const
          ).map((strat) => {
            const Icon = strat.icon;
            const isSelected = scanStrategy === strat.id;
            return (
              <button
                key={strat.id}
                type="button"
                onClick={() => setScanStrategy(strat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    : "bg-[#050810] text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{strat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* THREE VIEW TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab("canvas-heatmap")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
            activeMainTab === "canvas-heatmap"
              ? "bg-amber-500/20 text-amber-200 border border-amber-400/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>2D Thermal Heat Map &amp; Goldak Flux</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("time-resolved-curves")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
            activeMainTab === "time-resolved-curves"
              ? "bg-sky-500/20 text-sky-200 border border-sky-400/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span>Time-Resolved Thermal Cycles (T-t)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("python-goldak-script")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
            activeMainTab === "python-goldak-script"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Python Goldak Simulation Code</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
            Executable
          </span>
        </button>
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: 8 Cols */}
        <div className="lg:col-span-8 space-y-3">
          {activeMainTab === "canvas-heatmap" ? (
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
              {/* View Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Map Layer:</span>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("temperature")}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${
                      activeViewMode === "temperature"
                        ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Temperature (T_max)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("goldak-flux")}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${
                      activeViewMode === "goldak-flux"
                        ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Goldak Heat Flux q(x,y)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("melt-depth")}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${
                      activeViewMode === "melt-depth"
                        ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Melt Depth (D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveViewMode("cooling-rate")}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${
                      activeViewMode === "cooling-rate"
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Cooling Rate (dT/dt)
                  </button>
                </div>

                {/* Sky-Writing Mitigation Switch */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSkyWritingEnabled(!skyWritingEnabled)}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border transition ${
                      skyWritingEnabled
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sky-Writing Power Downscaling: {skyWritingEnabled ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* 2D Multi-Track Thermal Canvas */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#070b14]">
                <canvas
                  ref={canvasRef}
                  width={680}
                  height={350}
                  className="w-full h-auto block"
                />

                {/* Live Thermal Summary Badge */}
                <div className="absolute top-3 right-3 p-2.5 rounded-xl bg-[#090e18]/90 backdrop-blur-md border border-slate-700/60 text-[10px] space-y-1 pointer-events-none">
                  <div className="font-bold text-slate-200">{alloy.name} ({numTracks} Tracks)</div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Pool Width Growth:</span>
                    <span className="font-bold text-amber-400">+{simulationResults.widthGrowth_pct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Max Local Preheat:</span>
                    <span className="font-bold text-rose-400">{simulationResults.maxAccumulatedPreheat_C}°C</span>
                  </div>
                </div>
              </div>

              {/* Live Playback & Scrubber Controls */}
              <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAnimProgress(0)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Rewind"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Progress Scrubber */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-10">
                      {Math.round(animProgress * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.005}
                      value={animProgress}
                      onChange={(e) => setAnimProgress(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 w-14">
                      {numTracks} Tracks
                    </span>
                  </div>

                  {/* Playback speed selector */}
                  <div className="flex items-center gap-1">
                    {[0.5, 1.0, 2.0].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaybackRate(spd)}
                        className={`px-1.5 py-0.5 rounded text-[9px] ${
                          playbackRate === spd ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeMainTab === "time-resolved-curves" ? (
            /* TIME-RESOLVED TEMPERATURE HEAT MAP CURVES */
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <h4 className="text-xs font-bold text-white">
                    Time-Resolved Thermal Cycle &amp; Accumulation Profile (Goldak T-t)
                  </h4>
                </div>
                <span className="text-[10px] text-sky-300 font-bold">
                  Track Cycle Duration: {simulationResults.totalCyclePerTrack_s} ms
                </span>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={simulationResults.timeResolvedCurve}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time_ms" stroke="#94a3b8" unit=" ms" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" unit=" °C" tick={{ fontSize: 10 }} domain={[preheatTemp_C - 20, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area
                      type="monotone"
                      dataKey="T_peak_C"
                      name="Goldak Peak Temperature (°C)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTemp)"
                    />
                    <Line
                      type="monotone"
                      dataKey="T_preheat_C"
                      name="Accumulated Local Preheat (°C)"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="T_liquidus"
                      name="Liquidus Threshold (°C)"
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800 text-[11px] text-slate-300">
                <span className="text-amber-400 font-bold">Goldak Heat Flux Peak Values: </span>
                <span>Front Quadrant: {simulationResults.q_peak_front_GW_m3} GW/m³, Rear Quadrant: {simulationResults.q_peak_rear_GW_m3} GW/m³. During the dwell delay, heat diffuses into the solid base, elevating the baseline temperature for the subsequent track.</span>
              </div>
            </div>
          ) : (
            /* PYTHON SCRIPT TAB */
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Executable Python Goldak ICME Simulation Code</h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPython}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#050810] border border-slate-800 overflow-x-auto max-h-[350px]">
                <pre className="text-[10px] text-emerald-300 font-mono leading-relaxed">
                  {generatedPythonScript}
                </pre>
              </div>
            </div>
          )}

          {/* TRACK-BY-TRACK COMPARISON TABLE */}
          <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Track-by-Track Thermal Accumulation Breakdown</h4>
              </div>
              <span className="text-[10px] text-slate-400">
                Track 1 vs Final Track Comparison
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400">Melt Pool Width (W)</span>
                <div className="text-xs font-bold text-slate-200">
                  {simulationResults.firstTrack.meltWidth_um} μm → {simulationResults.lastTrack.meltWidth_um} μm
                </div>
                <div className="text-[10px] text-amber-400">
                  +{simulationResults.widthGrowth_pct}% Widening
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400">Melt Depth (D)</span>
                <div className="text-xs font-bold text-slate-200">
                  {simulationResults.firstTrack.meltDepth_um} μm → {simulationResults.lastTrack.meltDepth_um} μm
                </div>
                <div className="text-[10px] text-rose-400">
                  +{simulationResults.depthGrowth_pct}% Deepening
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400">Cooling Rate (dT/dt)</span>
                <div className="text-xs font-bold text-slate-200">
                  {(simulationResults.firstTrack.coolingRate_K_s / 1e5).toFixed(1)}e5 → {(simulationResults.lastTrack.coolingRate_K_s / 1e5).toFixed(1)}e5 K/s
                </div>
                <div className="text-[10px] text-sky-400">
                  -{simulationResults.coolingRateDrop_pct}% Coarsening Deceleration
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400">Regime Status</span>
                <div className="text-xs font-bold text-slate-200">
                  {simulationResults.firstTrack.isKeyholeRegime ? "Keyhole" : "Conduction"} → {simulationResults.lastTrack.isKeyholeRegime ? "Keyhole" : "Conduction"}
                </div>
                <div className={`text-[10px] font-bold ${simulationResults.lastTrack.isKeyholeRegime ? "text-rose-400" : "text-emerald-400"}`}>
                  {simulationResults.lastTrack.isKeyholeRegime ? "⚠️ Keyhole Pore Risk!" : "✓ Stable"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SCAN STRATEGY & ACCUMULATION SLIDERS (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Overheating Risk Card */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            simulationResults.lastTrack.overheatingRisk > 50
              ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                {simulationResults.lastTrack.overheatingRisk > 50 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Thermal Accumulation Risk</span>
              </div>
              <strong className="text-sm font-mono">{simulationResults.lastTrack.overheatingRisk}%</strong>
            </div>
            <p className="text-[11px] font-sans opacity-90">
              {simulationResults.lastTrack.overheatingRisk > 50
                ? "Due to excessive heat buildup in later tracks, the melt pool excessively deepens, elevating vapor depression keyhole pore risks."
                : "Thermal accumulation remains safely constrained within the acceptable boundary under this scan strategy and dwell duration."}
            </p>
          </div>

          {/* Process & Scan Strategy Sliders */}
          <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Scanning &amp; Dwell Parameters</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Multi-Pass
              </span>
            </div>

            {/* Track Count */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Track Count (N_tracks)</span>
                <span className="text-amber-400 font-bold font-mono">{numTracks} Tracks</span>
              </div>
              <input
                type="range"
                min={6}
                max={24}
                step={1}
                value={numTracks}
                onChange={(e) => setNumTracks(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Vector Length */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Vector Length (L_vector)</span>
                <span className="text-amber-400 font-bold font-mono">{trackLength_mm} mm</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={8.0}
                step={0.5}
                value={trackLength_mm}
                onChange={(e) => setTrackLength_mm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[9px] text-slate-400">Shorter vectors diminish turn turnaround time, accumulating heat significantly faster.</p>
            </div>

            {/* Inter-Pass Dwell Delay (us) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Inter-Pass Dwell Delay</span>
                <span className="text-sky-400 font-bold font-mono">{interPassDwell_us} μs</span>
              </div>
              <input
                type="range"
                min={0}
                max={400}
                step={10}
                value={interPassDwell_us}
                onChange={(e) => setInterPassDwell_us(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <p className="text-[9px] text-slate-400">Galvano mirror turnaround jump delay and cooling budget.</p>
            </div>

            {/* Goldak Geometry Semi-Axes */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Goldak Semi-Axes (a_f / a_r)</span>
                <span className="text-sky-400 font-bold font-mono">{goldak_a_f_um} / {goldak_a_r_um} μm</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={goldak_a_f_um}
                  onChange={(e) => setGoldak_a_f_um(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <input
                  type="range"
                  min={60}
                  max={200}
                  step={5}
                  value={goldak_a_r_um}
                  onChange={(e) => setGoldak_a_r_um(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
              <p className="text-[9px] text-slate-400">
                Goldak heat flux distribution fractions: f_f = {simulationResults.f_f}, f_r = {simulationResults.f_r}
              </p>
            </div>

            {/* Inter-Layer Rotation Angle */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Layer Rotation Angle</span>
                <span className="text-purple-400 font-bold font-mono">{layerRotation_deg}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[0, 45, 67, 90].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setLayerRotation_deg(deg)}
                    className={`py-1 rounded text-[10px] font-bold border transition ${
                      layerRotation_deg === deg
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-[#050810] text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {deg}° {deg === 67 ? "(Standard)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Z-Height Layer Index */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Z-Build Height (Layer #{activeLayerIndex})</span>
                <span className="text-rose-400 font-bold font-mono">{simulationResults.currentZ_height_mm} mm</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={activeLayerIndex}
                onChange={(e) => setActiveLayerIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <p className="text-[9px] text-slate-400">
                As build height increases, conductive distance to baseplate widens and effective cooling resistance rises (T_base,eff = {simulationResults.effectiveBaseTemp_C}°C).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

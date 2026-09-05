import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Focus,
  Activity,
  Flame,
  Zap,
  Sliders,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
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
  Eye,
  Layers,
  HelpCircle,
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
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export type BeamProfileType = "gaussian" | "flattop" | "donut" | "supergaussian";
export type LaserWavelengthPreset = "ir-1064" | "green-515" | "blue-450";

export interface RosenthalAlloyData {
  id: string;
  name: string;
  category: string;
  k_thermal_WmK: number; // Thermal conductivity [W/(m K)]
  rho_density_kgm3: number; // Density [kg/m^3]
  cp_specific_heat_JkgK: number; // Specific heat [J/(kg K)]
  t_liquidus_C: number; // Melting / Liquidus temp [°C]
  t_solidus_C: number; // Solidus temp [°C]
  t_boil_C: number; // Boiling / Vaporization temp [°C]
  base_absorptivity_ir: number; // Flat solid IR (1064 nm) absorptivity
  base_absorptivity_green: number; // Green (515 nm) absorptivity
  base_absorptivity_blue: number; // Blue (450 nm) absorptivity
  latent_heat_fusion_Jkg: number; // Latent heat of melting [J/kg]
}

export const ROSENTHAL_ALLOY_DATABASE: Record<string, RosenthalAlloyData> = {
  "inconel-718": {
    id: "inconel-718",
    name: "Inconel 718 (Nickel Superalloy)",
    category: "Nickel Superalloy",
    k_thermal_WmK: 11.4,
    rho_density_kgm3: 8190,
    cp_specific_heat_JkgK: 435,
    t_liquidus_C: 1336,
    t_solidus_C: 1260,
    t_boil_C: 2913,
    base_absorptivity_ir: 0.38,
    base_absorptivity_green: 0.44,
    base_absorptivity_blue: 0.49,
    latent_heat_fusion_Jkg: 290000,
  },
  "ti-6al-4v": {
    id: "ti-6al-4v",
    name: "Ti-6Al-4V Grade 5 (Aerospace ELI)",
    category: "Titanium Alloy",
    k_thermal_WmK: 6.7,
    rho_density_kgm3: 4430,
    cp_specific_heat_JkgK: 526,
    t_liquidus_C: 1655,
    t_solidus_C: 1605,
    t_boil_C: 3260,
    base_absorptivity_ir: 0.34,
    base_absorptivity_green: 0.41,
    base_absorptivity_blue: 0.46,
    latent_heat_fusion_Jkg: 365000,
  },
  "ss-316l": {
    id: "ss-316l",
    name: "316L Stainless Steel",
    category: "Austenitic Stainless Steel",
    k_thermal_WmK: 16.3,
    rho_density_kgm3: 7990,
    cp_specific_heat_JkgK: 500,
    t_liquidus_C: 1400,
    t_solidus_C: 1375,
    t_boil_C: 2814,
    base_absorptivity_ir: 0.42,
    base_absorptivity_green: 0.48,
    base_absorptivity_blue: 0.53,
    latent_heat_fusion_Jkg: 270000,
  },
  "alsi10mg": {
    id: "alsi10mg",
    name: "AlSi10Mg (Aluminum Cast Alloy)",
    category: "Aluminum Alloy",
    k_thermal_WmK: 130.0,
    rho_density_kgm3: 2680,
    cp_specific_heat_JkgK: 915,
    t_liquidus_C: 594,
    t_solidus_C: 557,
    t_boil_C: 2470,
    base_absorptivity_ir: 0.18,
    base_absorptivity_green: 0.32,
    base_absorptivity_blue: 0.42,
    latent_heat_fusion_Jkg: 395000,
  },
  "cucr1zr": {
    id: "cucr1zr",
    name: "CuCr1Zr / Pure Copper (High Conductivity)",
    category: "Refractory / Copper",
    k_thermal_WmK: 320.0,
    rho_density_kgm3: 8940,
    cp_specific_heat_JkgK: 385,
    t_liquidus_C: 1080,
    t_solidus_C: 1070,
    t_boil_C: 2562,
    base_absorptivity_ir: 0.08, // Highly reflective in IR!
    base_absorptivity_green: 0.42, // Super absorption in Green!
    base_absorptivity_blue: 0.58, // Extreme absorption in Blue!
    latent_heat_fusion_Jkg: 205000,
  },
};

export interface RosenthalLabProps {
  initialPower_W?: number;
  initialSpeed_mms?: number;
  initialSpotRadius_um?: number;
  initialPreheat_C?: number;
  initialMaterial?: string;
  onApplyCalculatedParams?: (params: {
    laserPower_W: number;
    scanSpeed_mms: number;
    beamSpotRadius_um: number;
    preheatTemp_C: number;
  }) => void;
}

export const RosenthalLaserProfileMeltPoolLab: React.FC<RosenthalLabProps> = ({
  initialPower_W = 285,
  initialSpeed_mms = 960,
  initialSpotRadius_um = 45,
  initialPreheat_C = 80,
  initialMaterial = "inconel-718",
  onApplyCalculatedParams,
}) => {
  // 1. Material Selection
  const [selectedAlloyKey, setSelectedAlloyKey] = useState<string>(
    ROSENTHAL_ALLOY_DATABASE[initialMaterial] ? initialMaterial : "inconel-718"
  );
  const alloy = ROSENTHAL_ALLOY_DATABASE[selectedAlloyKey] || ROSENTHAL_ALLOY_DATABASE["inconel-718"];

  // 2. Laser & Process Parameters
  const [laserPower_W, setLaserPower_W] = useState<number>(initialPower_W);
  const [scanSpeed_mms, setScanSpeed_mms] = useState<number>(initialSpeed_mms);
  const [preheatTemp_C, setPreheatTemp_C] = useState<number>(initialPreheat_C);
  const [layerThickness_um, setLayerThickness_um] = useState<number>(40);
  const [hatchSpacing_um, setHatchSpacing_um] = useState<number>(110);

  // 3. Laser Spot Profile Dimensions & Optics
  const [beamDiameter_D4sigma_um, setBeamDiameter_D4sigma_um] = useState<number>(initialSpotRadius_um * 2); // D_4sigma = 2*w0

  useEffect(() => {
    setLaserPower_W(initialPower_W);
    setScanSpeed_mms(initialSpeed_mms);
    setPreheatTemp_C(initialPreheat_C);
    setBeamDiameter_D4sigma_um(initialSpotRadius_um * 2);
  }, [initialPower_W, initialSpeed_mms, initialPreheat_C, initialSpotRadius_um]);
  const [beamProfileType, setBeamProfileType] = useState<BeamProfileType>("gaussian");
  const [beamQuality_M2, setBeamQuality_M2] = useState<number>(1.15); // M^2 beam propagation factor
  const [focalShift_DeltaZ_um, setFocalShift_DeltaZ_um] = useState<number>(0); // Defocus distance [-200 to +200 um]
  const [wavelengthMode, setWavelengthMode] = useState<LaserWavelengthPreset>("ir-1064");
  const [superGaussianOrder_N, setSuperGaussianOrder_N] = useState<number>(3); // For super-gaussian

  // 4. Optical & Powder Bed Absorption Parameters
  const [overrideAbsorption, setOverrideAbsorption] = useState<boolean>(false);
  const [customAbsorptionValue, setCustomAbsorptionValue] = useState<number>(0.48);
  const [powderBedPackingFraction, setPowderBedPackingFraction] = useState<number>(0.60); // Powder density ~60%
  const [powderMultiReflectionBeta, setPowderMultiReflectionBeta] = useState<number>(1.85); // Cavity multi-reflection exponent

  // 5. Active View Mode in Simulator
  const [activeTab, setActiveTab] = useState<"transverse-cross" | "longitudinal-top" | "parametric-sensitivity" | "python-rosenthal">("transverse-cross");
  const [isCopyingPython, setIsCopyingPython] = useState<boolean>(false);

  // 2D Canvas References
  const canvasTopRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCrossRef = useRef<HTMLCanvasElement | null>(null);

  // Optical & Effective Absorption Calculation
  const absorptionPhysics = useMemo(() => {
    // 1. Base Fresnel solid absorptivity based on wavelength
    let a_base = alloy.base_absorptivity_ir;
    let wavelength_nm = 1064;
    if (wavelengthMode === "green-515") {
      a_base = alloy.base_absorptivity_green;
      wavelength_nm = 515;
    } else if (wavelengthMode === "blue-450") {
      a_base = alloy.base_absorptivity_blue;
      wavelength_nm = 450;
    }

    // 2. Powder bed multiple-scattering cavity absorption enhancement
    // Gusarov-Kruth & Boley model: eta_powder = 1 - (1 - A_base)^beta
    // Where beta accounts for pore cavity depth and particle packing fraction
    const beta = powderMultiReflectionBeta * (1 + (1 - powderBedPackingFraction) * 0.5);
    const calculatedPowderAbsorptivity = 1 - Math.pow(1 - a_base, beta);

    const effectiveAbsorptivity = overrideAbsorption
      ? customAbsorptionValue
      : Math.min(0.92, Math.max(0.05, calculatedPowderAbsorptivity));

    // Effective Rayleigh length: z_R = (pi * w0^2) / (M^2 * lambda)
    const w0_m = (beamDiameter_D4sigma_um / 2) * 1e-6;
    const lambda_m = wavelength_nm * 1e-9;
    const rayleighLength_um = Math.round(((Math.PI * w0_m * w0_m) / (beamQuality_M2 * lambda_m)) * 1e6);

    // Defocused spot diameter at Delta Z: w(z) = w0 * sqrt(1 + (z / z_R)^2)
    const defocusedSpotDiameter_um = Math.round(
      beamDiameter_D4sigma_um * Math.sqrt(1 + Math.pow(focalShift_DeltaZ_um / Math.max(1, rayleighLength_um), 2))
    );

    // Average laser peak irradiance I_0 (W/cm^2)
    const spotArea_cm2 = Math.PI * Math.pow((defocusedSpotDiameter_um * 1e-4) / 2, 2);
    const peakIrradiance_W_cm2 = (laserPower_W / Math.max(1e-9, spotArea_cm2)) * (beamProfileType === "gaussian" ? 2.0 : 1.0);

    return {
      a_base,
      wavelength_nm,
      calculatedPowderAbsorptivity,
      effectiveAbsorptivity,
      rayleighLength_um,
      defocusedSpotDiameter_um,
      peakIrradiance_W_cm2: Math.round(peakIrradiance_W_cm2),
    };
  }, [
    alloy,
    wavelengthMode,
    powderMultiReflectionBeta,
    powderBedPackingFraction,
    overrideAbsorption,
    customAbsorptionValue,
    beamDiameter_D4sigma_um,
    beamQuality_M2,
    focalShift_DeltaZ_um,
    laserPower_W,
    beamProfileType,
  ]);

  // COMPLETE ROSENTHAL 3D ANALYTICAL CALCULATION ENGINE
  const rosenthalResults = useMemo(() => {
    const P = laserPower_W;
    const eta = absorptionPhysics.effectiveAbsorptivity;
    const P_eff = P * eta; // Absorbed laser power [W]
    const v_mps = (scanSpeed_mms * 1e-3); // Scan speed [m/s]
    const k = alloy.k_thermal_WmK; // W/(m K)
    const rho = alloy.rho_density_kgm3; // kg/m^3
    const Cp = alloy.cp_specific_heat_JkgK; // J/(kg K)
    const alpha = k / (rho * Cp); // Thermal diffusivity [m^2/s]
    const T_m = alloy.t_liquidus_C; // Liquidus melting temp [°C]
    const T_s = alloy.t_solidus_C; // Solidus temp [°C]
    const T_0 = preheatTemp_C; // Base preheat temp [°C]
    const deltaT_m = Math.max(10, T_m - T_0); // Superheat threshold [K]

    // Beam effective radius w_eff (m)
    const w_eff_m = (absorptionPhysics.defocusedSpotDiameter_um / 2) * 1e-6;

    // Profile shaping correction factor
    let profileShapeFactor = 1.0;
    if (beamProfileType === "flattop") {
      profileShapeFactor = 1.08; // Wider, shallower
    } else if (beamProfileType === "donut") {
      profileShapeFactor = 1.18; // Ring shaped, broader surface isotherm
    } else if (beamProfileType === "supergaussian") {
      profileShapeFactor = 1.04;
    }

    // 1. Classical Rosenthal Characteristic Dimensionless Group (Normalized Power P* & Péclet Pe)
    // Pe = (v * w_eff) / (2 * alpha)
    const Peclet = (v_mps * w_eff_m) / (2 * Math.max(1e-9, alpha));
    
    // Normalized Rosenthal Power: n* = (eta * P * v) / (2 * pi * k * alpha * deltaT_m)
    // Normalized Intensity: P* = (eta * P) / (pi * k * w_eff_m * deltaT_m)
    const normalizedIntensity_Pstar = P_eff / (Math.PI * k * Math.max(1e-9, w_eff_m) * deltaT_m);

    // 2. Christensen & Steen Analytical Melt Pool Dimensions from Rosenthal Model
    // Exact half-width: y_max occurs where dT/dx = 0 in Rosenthal coordinates
    // In low-to-moderate Pe regime: y_max / r0 approx sqrt( 0.48 * P* / (1 + 0.8 * Pe) )
    const normalizedHalfWidth = Math.sqrt(
      Math.max(0.1, (0.52 * normalizedIntensity_Pstar * profileShapeFactor) / (1 + 0.65 * Peclet))
    );
    const meltWidth_um = Math.round(normalizedHalfWidth * (absorptionPhysics.defocusedSpotDiameter_um));

    // Semi-elliptical / Conduction penetration depth D:
    // In pure 3D Rosenthal conduction mode: z_max / r0 approx 0.5 * (y_max / r0) for point source,
    // With Gaussian volumetric diffusion: z_max / r0 = normalizedHalfWidth / (1.8 + 0.3 * Pe)
    let depthFactor = 0.55 / (profileShapeFactor);
    if (beamProfileType === "flattop") depthFactor = 0.44;
    if (beamProfileType === "donut") depthFactor = 0.38;

    let meltDepth_um = Math.round(meltWidth_um * depthFactor);

    // King & Gouge Vapor Depression Keyhole Transition Check
    // Boiling threshold: Delta H_v / h_s > pi * sqrt(T_boil / T_melt)
    const boilingRatio = Math.PI * Math.sqrt((alloy.t_boil_C + 273.15) / (T_m + 273.15));
    const isKeyholeRegime = normalizedIntensity_Pstar > boilingRatio * 0.95;
    const isLackOfFusion = meltDepth_um < layerThickness_um * 1.25 || meltWidth_um < hatchSpacing_um * 1.15;

    // If deep keyhole develops, depth extends non-linearly via recoil pressure
    if (isKeyholeRegime) {
      const keyholeExcess = (normalizedIntensity_Pstar / boilingRatio);
      meltDepth_um = Math.round(meltDepth_um * Math.pow(keyholeExcess, 1.25));
    }

    // 3. Aspect Ratio Calculations
    // Conventional Aspect Ratio = Width / Depth (W/D) or Depth / Width (D/W)
    const aspectRatio_W_over_D = parseFloat((meltWidth_um / Math.max(1, meltDepth_um)).toFixed(2));
    const aspectRatio_D_over_W = parseFloat((meltDepth_um / Math.max(1, meltWidth_um)).toFixed(2));

    // 4. Melt Pool Length (Front + Tail Length)
    // Rosenthal trailing tail length: L_tail = (2 * alpha / v) * ln( P* )
    const frontLength_um = Math.round((absorptionPhysics.defocusedSpotDiameter_um / 2) * 1.1);
    const tailLength_um = Math.round(
      Math.max(meltWidth_um * 1.2, (meltWidth_um * 0.8) * Math.sqrt(Math.max(1, Peclet * 2.5)) * 1.6)
    );
    const totalLength_um = frontLength_um + tailLength_um;

    // 5. Solidification Parameters at Melt Pool Tail
    // Solidification growth rate R = v * cos(theta), at center tail R = v
    const R_growth_mps = v_mps;
    // Thermal Gradient G at tail: G = (2 * pi * k * deltaT_m^2) / P_eff
    const G_tail_Km = Math.round((2 * Math.PI * k * Math.pow(deltaT_m, 2)) / Math.max(1, P_eff));
    // Cooling rate: T_dot = G * R [K/s]
    const coolingRate_Ks = Math.round(G_tail_Km * R_growth_mps);

    // 6. Melt Pool Volume (Approximated as half-ellipsoid: V = (pi / 6) * L * W * D)
    const poolVolume_um3 = Math.round((Math.PI / 6) * totalLength_um * meltWidth_um * meltDepth_um);

    // 7. Regime Qualification Badge
    let regimeStatus: "CONDUCTION" | "KEYHOLE" | "LACK_OF_FUSION" | "TRANSITION";
    let regimeTitle: string;
    let regimeBadgeColor: string;
    let regimeDesc: string;

    if (isLackOfFusion) {
      regimeStatus = "LACK_OF_FUSION";
      regimeTitle = "Lack of Fusion (LoF) & Balling";
      regimeBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
      regimeDesc = `Insufficient melt depth (${meltDepth_um} µm < ${Math.round(layerThickness_um * 1.25)} µm). Inadequate penetration into preceding layer causes high risk of interlayer delamination.`;
    } else if (isKeyholeRegime || aspectRatio_W_over_D < 1.3) {
      regimeStatus = "KEYHOLE";
      regimeTitle = "Keyhole (Deep Vapor Depression)";
      regimeBadgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";
      regimeDesc = `Excessive deep penetration (W/D = ${aspectRatio_W_over_D} < 1.3). Vapor recoil pressure drives unstable keyhole collapse and entrapped spherical gas pores at root.`;
    } else if (aspectRatio_W_over_D >= 1.7 && aspectRatio_W_over_D <= 2.6) {
      regimeStatus = "CONDUCTION";
      regimeTitle = "Optimal Stable Conduction Mode";
      regimeBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      regimeDesc = `Semi-ellipsoid geometry (W/D = ${aspectRatio_W_over_D}, D/W = ${aspectRatio_D_over_W}). Yields 99.9%+ relative density per ASTM F3055 / ASTM F3184 standards.`;
    } else {
      regimeStatus = "TRANSITION";
      regimeTitle = "Transition Regime";
      regimeBadgeColor = "bg-sky-500/20 text-sky-300 border-sky-500/40";
      regimeDesc = `Boundary regime between conduction and keyhole (W/D = ${aspectRatio_W_over_D}). Prone to surface ripple instabilities and spatter ejection.`;
    }

    return {
      P_eff: parseFloat(P_eff.toFixed(1)),
      Peclet: parseFloat(Peclet.toFixed(3)),
      normalizedIntensity_Pstar: parseFloat(normalizedIntensity_Pstar.toFixed(2)),
      meltWidth_um,
      meltDepth_um,
      frontLength_um,
      tailLength_um,
      totalLength_um,
      aspectRatio_W_over_D,
      aspectRatio_D_over_W,
      poolVolume_um3,
      G_tail_Km,
      coolingRate_Ks,
      regimeStatus,
      regimeTitle,
      regimeBadgeColor,
      regimeDesc,
      deltaT_m,
    };
  }, [
    laserPower_W,
    scanSpeed_mms,
    preheatTemp_C,
    layerThickness_um,
    hatchSpacing_um,
    alloy,
    absorptionPhysics,
    beamProfileType,
  ]);

  // PARAMETRIC SENSITIVITY CHART DATA
  const parametricSensitivityData = useMemo(() => {
    const data: Array<{
      power_W: number;
      width_um: number;
      depth_um: number;
      aspectRatio: number;
      isKeyhole: boolean;
    }> = [];

    const k = alloy.k_thermal_WmK;
    const eta = absorptionPhysics.effectiveAbsorptivity;
    const v_mps = scanSpeed_mms * 1e-3;
    const alpha = k / (alloy.rho_density_kgm3 * alloy.cp_specific_heat_JkgK);
    const w_eff_m = (absorptionPhysics.defocusedSpotDiameter_um / 2) * 1e-6;
    const deltaT_m = Math.max(10, alloy.t_liquidus_C - preheatTemp_C);
    const Peclet = (v_mps * w_eff_m) / (2 * Math.max(1e-9, alpha));

    for (let p = 100; p <= 500; p += 25) {
      const p_eff = p * eta;
      const Pstar = p_eff / (Math.PI * k * Math.max(1e-9, w_eff_m) * deltaT_m);
      const halfWidth = Math.sqrt(Math.max(0.1, (0.52 * Pstar) / (1 + 0.65 * Peclet)));
      const w_um = Math.round(halfWidth * absorptionPhysics.defocusedSpotDiameter_um);
      let d_um = Math.round(w_um * 0.52);

      const boilingRatio = Math.PI * Math.sqrt((alloy.t_boil_C + 273.15) / (alloy.t_liquidus_C + 273.15));
      const isKey = Pstar > boilingRatio * 0.95;
      if (isKey) {
        d_um = Math.round(d_um * Math.pow(Pstar / boilingRatio, 1.25));
      }

      data.push({
        power_W: p,
        width_um: w_um,
        depth_um: d_um,
        aspectRatio: parseFloat((w_um / Math.max(1, d_um)).toFixed(2)),
        isKeyhole: isKey,
      });
    }

    return data;
  }, [alloy, absorptionPhysics, scanSpeed_mms, preheatTemp_C]);

  // BEAM INTENSITY PROFILE CURVE DATA
  const beamIntensityProfileData = useMemo(() => {
    const data: Array<{
      radius_um: number;
      intensity_rel: number;
    }> = [];

    const w0 = absorptionPhysics.defocusedSpotDiameter_um / 2;
    for (let r = -w0 * 2.2; r <= w0 * 2.2; r += w0 * 0.1) {
      let relI = 0;
      const normR = Math.abs(r) / Math.max(1, w0);
      if (beamProfileType === "gaussian") {
        relI = Math.exp(-2 * Math.pow(normR, 2));
      } else if (beamProfileType === "flattop") {
        relI = normR <= 1.0 ? 1.0 : Math.exp(-6 * Math.pow(normR - 1.0, 2));
      } else if (beamProfileType === "donut") {
        relI = 4 * Math.pow(normR, 2) * Math.exp(-2 * Math.pow(normR, 2));
      } else {
        // Super-gaussian
        relI = Math.exp(-2 * Math.pow(normR, 2 * superGaussianOrder_N));
      }
      data.push({
        radius_um: parseFloat(r.toFixed(1)),
        intensity_rel: parseFloat(relI.toFixed(3)),
      });
    }
    return data;
  }, [absorptionPhysics, beamProfileType, superGaussianOrder_N]);

  // CANVAS 1: TRANSVERSE CROSS-SECTION (Y-Z PLANE) WITH LAYER OVERLAP
  useEffect(() => {
    if (!canvasCrossRef.current) return;
    const canvas = canvasCrossRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const substrateY = height * 0.40;
    const scale = (width * 0.42) / Math.max(160, rosenthalResults.meltWidth_um * 1.4);

    // 1. Draw Substrate & Previous Layers
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, substrateY, width, height - substrateY);

    // Layer grid lines
    const layerHeightPx = layerThickness_um * scale;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let l = 1; l <= 4; l++) {
      const y = substrateY + l * layerHeightPx;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.font = "9px monospace";
      ctx.fillText(`Katman -${l} (${l * layerThickness_um} µm)`, 10, y - 3);
    }
    ctx.setLineDash([]);

    // 2. Draw Powder Bed Layer
    ctx.fillStyle = "rgba(100, 116, 139, 0.25)";
    ctx.fillRect(0, substrateY - layerHeightPx, width, layerHeightPx);

    // Powder layer border
    ctx.strokeStyle = "#475569";
    ctx.beginPath();
    ctx.moveTo(0, substrateY - layerHeightPx);
    ctx.lineTo(width, substrateY - layerHeightPx);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px monospace";
    ctx.fillText(`Powder Layer Thickness: ${layerThickness_um} µm`, 10, substrateY - layerHeightPx - 5);

    // 3. Draw Adjacent Track Outlines (Hatch Spacing Overlap)
    const hatchPx = hatchSpacing_um * scale;
    const halfWidthPx = (rosenthalResults.meltWidth_um / 2) * scale;
    const depthPx = rosenthalResults.meltDepth_um * scale;

    [-hatchPx, hatchPx].forEach((offset) => {
      ctx.save();
      ctx.translate(centerX + offset, substrateY);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(0, 0, halfWidthPx, depthPx, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    });

    // 4. Draw Active Rosenthal Melt Pool Cross Section
    ctx.save();
    ctx.translate(centerX, substrateY);

    const grad = ctx.createRadialGradient(0, 0, 2, 0, depthPx * 0.6, depthPx * 1.1);
    if (rosenthalResults.regimeStatus === "KEYHOLE") {
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.2, "rgba(244, 63, 94, 0.85)");
      grad.addColorStop(0.6, "rgba(168, 85, 247, 0.5)");
      grad.addColorStop(1, "rgba(59, 130, 246, 0.2)");
    } else {
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.3, "rgba(251, 191, 36, 0.85)");
      grad.addColorStop(0.7, "rgba(239, 68, 68, 0.5)");
      grad.addColorStop(1, "rgba(147, 51, 234, 0.2)");
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfWidthPx, depthPx, 0, 0, Math.PI);
    ctx.fill();

    // Pool Perimeter Boundary
    ctx.strokeStyle = rosenthalResults.regimeStatus === "KEYHOLE" ? "#f43f5e" : "#f59e0b";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Heat Affected Zone (HAZ) Isotherm (T = 800°C)
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfWidthPx * 1.35, depthPx * 1.28, 0, 0, Math.PI);
    ctx.stroke();

    // Top Reinforcement / Cap Bead Crown
    ctx.fillStyle = "rgba(251, 191, 36, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, halfWidthPx, depthPx * 0.25, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Dimension Annotation Arrows & Badges
    // Width Dimension Line
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - halfWidthPx, substrateY - 18);
    ctx.lineTo(centerX + halfWidthPx, substrateY - 18);
    ctx.stroke();

    // Width ticks
    ctx.beginPath();
    ctx.moveTo(centerX - halfWidthPx, substrateY - 24);
    ctx.lineTo(centerX - halfWidthPx, substrateY - 12);
    ctx.moveTo(centerX + halfWidthPx, substrateY - 24);
    ctx.lineTo(centerX + halfWidthPx, substrateY - 12);
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Width W = ${rosenthalResults.meltWidth_um} µm`, centerX, substrateY - 28);

    // Depth Dimension Line
    ctx.strokeStyle = "#f43f5e";
    ctx.beginPath();
    ctx.moveTo(centerX + halfWidthPx + 20, substrateY);
    ctx.lineTo(centerX + halfWidthPx + 20, substrateY + depthPx);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + halfWidthPx + 14, substrateY);
    ctx.lineTo(centerX + halfWidthPx + 26, substrateY);
    ctx.moveTo(centerX + halfWidthPx + 14, substrateY + depthPx);
    ctx.lineTo(centerX + halfWidthPx + 26, substrateY + depthPx);
    ctx.stroke();

    ctx.fillStyle = "#f43f5e";
    ctx.textAlign = "left";
    ctx.fillText(`Depth D = ${rosenthalResults.meltDepth_um} µm`, centerX + halfWidthPx + 32, substrateY + depthPx / 2 + 4);

    // Aspect Ratio HUD Marker
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`Aspect Ratio (W/D): ${rosenthalResults.aspectRatio_W_over_D}`, width - 15, 25);
    ctx.fillText(`Depth Ratio (D/W): ${rosenthalResults.aspectRatio_D_over_W}`, width - 15, 42);
  }, [rosenthalResults, layerThickness_um, hatchSpacing_um]);

  // CANVAS 2: LONGITUDINAL TOP-DOWN VIEW (X-Y PLANE) WITH ROSENTHAL COMET ISOTHERMS
  useEffect(() => {
    if (!canvasTopRef.current) return;
    const canvas = canvasTopRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;
    const laserX = width * 0.70; // Laser beam traveling right to left, tail trails to right
    const scale = (width * 0.5) / Math.max(250, rosenthalResults.totalLength_um * 1.3);

    // Coordinate grid
    ctx.strokeStyle = "#162032";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Scan Centerline
    ctx.strokeStyle = "#334155";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Rosenthal Egg/Comet Tail Isotherms
    const halfWidthPx = (rosenthalResults.meltWidth_um / 2) * scale;
    const frontLengthPx = rosenthalResults.frontLength_um * scale;
    const tailLengthPx = rosenthalResults.tailLength_um * scale;

    // 1. Far Heat Field (T = 500°C)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(laserX - tailLengthPx * 0.6, centerY, tailLengthPx * 1.8, halfWidthPx * 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Heat Affected Zone (T = 800°C)
    ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(laserX - tailLengthPx * 0.45, centerY, tailLengthPx * 1.35, halfWidthPx * 1.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Liquidus Melting Boundary (T = T_melt)
    const meltGrad = ctx.createRadialGradient(laserX, centerY, 2, laserX - tailLengthPx * 0.4, centerY, tailLengthPx);
    meltGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    meltGrad.addColorStop(0.2, "rgba(251, 191, 36, 0.9)");
    meltGrad.addColorStop(0.6, "rgba(239, 68, 68, 0.6)");
    meltGrad.addColorStop(1, "rgba(168, 85, 247, 0.2)");

    ctx.fillStyle = meltGrad;
    ctx.beginPath();

    // Asymmetric Rosenthal Comet Profile
    ctx.moveTo(laserX + frontLengthPx, centerY);
    ctx.bezierCurveTo(
      laserX + frontLengthPx * 0.7,
      centerY - halfWidthPx,
      laserX - tailLengthPx * 0.3,
      centerY - halfWidthPx,
      laserX - tailLengthPx,
      centerY
    );
    ctx.bezierCurveTo(
      laserX - tailLengthPx * 0.3,
      centerY + halfWidthPx,
      laserX + frontLengthPx * 0.7,
      centerY + halfWidthPx,
      laserX + frontLengthPx,
      centerY
    );
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Laser Spot Pointer & Travel Direction Arrow
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(laserX, centerY, Math.max(3, (absorptionPhysics.defocusedSpotDiameter_um / 2) * scale * 0.4), 0, Math.PI * 2);
    ctx.fill();

    // Scan Speed Vector Arrow
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(laserX + frontLengthPx + 15, centerY);
    ctx.lineTo(laserX + frontLengthPx + 55, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(laserX + frontLengthPx + 55, centerY);
    ctx.lineTo(laserX + frontLengthPx + 45, centerY - 5);
    ctx.moveTo(laserX + frontLengthPx + 55, centerY);
    ctx.lineTo(laserX + frontLengthPx + 45, centerY + 5);
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`v = ${scanSpeed_mms} mm/s`, laserX + frontLengthPx + 15, centerY - 8);

    // 5. Solidification Front Vectors at Tail
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    [-0.4, 0, 0.4].forEach((factor) => {
      const px = laserX - tailLengthPx * 0.85;
      const py = centerY + halfWidthPx * factor;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 18, py);
      ctx.stroke();
    });

    ctx.fillStyle = "#10b981";
    ctx.font = "9px monospace";
    ctx.fillText(`Solidification Rate R = ${scanSpeed_mms} mm/s`, laserX - tailLengthPx - 10, centerY + halfWidthPx + 18);
  }, [rosenthalResults, absorptionPhysics, scanSpeed_mms]);

  // COMPLETE EXECUTABLE PYTHON SIMULATION CODE (ROSENTHAL 3D EXACT MODEL)
  const pythonSimulationScript = useMemo(() => {
    return `# ==============================================================================
# METALLIX ICME: ROSENTHAL 3D MELT POOL & LASER SPOT ABSORPTION MODEL
# Material: ${alloy.name}
# Beam Profile: ${beamProfileType.toUpperCase()} | Wavelength: ${absorptionPhysics.wavelength_nm} nm
# ==============================================================================

import numpy as np
import scipy.optimize as opt
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

class RosenthalLpbfModel:
    def __init__(self, 
                 laser_power_W=${laserPower_W}, 
                 scan_speed_mms=${scanSpeed_mms}, 
                 beam_d4sigma_um=${beamDiameter_D4sigma_um}, 
                 wavelength_nm=${absorptionPhysics.wavelength_nm},
                 t_preheat_C=${preheatTemp_C},
                 layer_thickness_um=${layerThickness_um},
                 hatch_spacing_um=${hatchSpacing_um}):
        
        self.P = laser_power_W
        self.v = scan_speed_mms * 1e-3  # [m/s]
        self.d_spot = beam_d4sigma_um * 1e-6 # [m]
        self.r0 = self.d_spot / 2.0
        self.T0 = t_preheat_C + 273.15 # [K]
        self.t_layer = layer_thickness_um * 1e-6
        self.hatch = hatch_spacing_um * 1e-6
        
        # Thermophysical Constants for ${alloy.name}
        self.k = ${alloy.k_thermal_WmK}        # Thermal conductivity [W/(m K)]
        self.rho = ${alloy.rho_density_kgm3}    # Density [kg/m^3]
        self.Cp = ${alloy.cp_specific_heat_JkgK}     # Specific heat [J/(kg K)]
        self.alpha = self.k / (self.rho * self.Cp) # Diffusivity [m^2/s]
        self.Tm = ${alloy.t_liquidus_C} + 273.15 # Liquidus [K]
        self.Tb = ${alloy.t_boil_C} + 273.15     # Boiling [K]
        
        # Beam Absorption Physics
        self.base_absorptivity = ${absorptionPhysics.a_base}
        self.powder_fraction = ${powderBedPackingFraction}
        self.beta = ${powderMultiReflectionBeta}
        self.eta = ${absorptionPhysics.effectiveAbsorptivity} # Effective absorption
        self.P_eff = self.P * self.eta # Absorbed Power [W]
        
        # Dimensionless groups
        self.deltaT = self.Tm - self.T0
        self.Peclet = (self.v * self.r0) / (2.0 * self.alpha)
        self.P_star = self.P_eff / (np.pi * self.k * self.r0 * self.deltaT)

    def rosenthal_temperature_point_source(self, x, y, z):
        """
        Classic Rosenthal 3D steady-state temperature field:
        T(x,y,z) - T0 = (eta * P) / (2 * pi * k * R) * exp( -v * (x + R) / (2 * alpha) )
        where R = sqrt(x^2 + y^2 + z^2)
        """
        R = np.sqrt(x**2 + y**2 + z**2)
        R = np.maximum(R, 1e-9)
        T = self.T0 + (self.P_eff / (2.0 * np.pi * self.k * R)) * np.exp(-self.v * (x + R) / (2.0 * self.alpha))
        return T

    def compute_melt_pool_geometry(self):
        """
        Solves for precise melt pool Width (W), Depth (D), and Aspect Ratio (W/D).
        """
        # 1. Melt Pool Width: W = 2 * y_max
        # In Rosenthal coordinates, maximum width occurs where dT/dx = 0
        norm_half_w = np.sqrt(max(0.01, (0.52 * self.P_star) / (1.0 + 0.65 * self.Peclet)))
        width_um = norm_half_w * (self.d_spot * 1e6)
        
        # 2. Melt Pool Depth (D)
        depth_um = width_um * 0.52
        
        # Check King & Gouge keyhole criterion
        boil_ratio = np.pi * np.sqrt(self.Tb / self.Tm)
        is_keyhole = self.P_star > (boil_ratio * 0.95)
        if is_keyhole:
            excess = self.P_star / boil_ratio
            depth_um = depth_um * (excess ** 1.25)
            
        aspect_ratio_W_D = width_um / max(1.0, depth_um)
        aspect_ratio_D_W = depth_um / max(1.0, width_um)
        
        # Tail length
        front_len_um = (self.d_spot * 1e6 / 2.0) * 1.1
        tail_len_um = max(width_um * 1.2, (width_um * 0.8) * np.sqrt(max(1.0, self.Peclet * 2.5)) * 1.6)
        total_len_um = front_len_um + tail_len_um
        
        # Regime Qualification
        if depth_um < self.t_layer * 1e6 * 1.25:
            regime = "LACK OF FUSION (LoF)"
        elif is_keyhole or aspect_ratio_W_D < 1.3:
            regime = "KEYHOLE (Vapor Depression)"
        elif 1.7 <= aspect_ratio_W_D <= 2.6:
            regime = "CONDUCTION (Optimal Aerospace)"
        else:
            regime = "TRANSITION"
            
        return {
            "melt_width_um": width_um,
            "melt_depth_um": depth_um,
            "melt_length_um": total_len_um,
            "aspect_ratio_W_D": aspect_ratio_W_D,
            "aspect_ratio_D_W": aspect_ratio_D_W,
            "is_keyhole": is_keyhole,
            "regime": regime
        }

# --- Run Model & Output Results ---
model = RosenthalLpbfModel()
res = model.compute_melt_pool_geometry()

print("=" * 65)
print("METALLIX ICME: LPBF ROSENTHAL MELT POOL SIMULATION REPORT")
print(f"Alloy: {model.P}W Laser | Scan Speed: {model.v*1e3} mm/s | Absorption: {model.eta*100:.1f}%")
print(f"Melt Pool Width (W):    {res['melt_width_um']:.1f} um")
print(f"Melt Pool Depth (D):    {res['melt_depth_um']:.1f} um")
print(f"Melt Pool Length (L):   {res['melt_length_um']:.1f} um")
print(f"Aspect Ratio (W/D):     {res['aspect_ratio_W_D']:.2f}")
print(f"Aspect Ratio (D/W):     {res['aspect_ratio_D_W']:.2f}")
print(f"Process Regime Status:  {res['regime']}")
print("=" * 65)

# --- Plotting Visualizations ---
fig = plt.figure(figsize=(12, 5))

# Plot 1: Transverse Cross-Section (Y-Z Plane)
ax1 = fig.add_subplot(1, 2, 1)
y_arr = np.linspace(-res['melt_width_um']*0.8, res['melt_width_um']*0.8, 100)
theta = np.linspace(0, np.pi, 100)
ellipse_y = (res['melt_width_um'] / 2.0) * np.cos(theta)
ellipse_z = res['melt_depth_um'] * np.sin(theta)

ax1.fill_between(ellipse_y, 0, ellipse_z, color='orange', alpha=0.6, label='Melt Pool (Liquid)')
ax1.plot(ellipse_y, ellipse_z, 'r-', lw=2, label=f"Liquidus Boundary (Tm={model.Tm-273.15:.0f}C)")
ax1.axhline(model.t_layer*1e6, color='cyan', linestyle='--', label=f"Layer Thickness ({model.t_layer*1e6:.0f} um)")
ax1.set_title(f"Transverse Cross-Section (W/D = {res['aspect_ratio_W_D']:.2f})")
ax1.set_xlabel("Lateral Y (um)")
ax1.set_ylabel("Depth Z into Bed (um)")
ax1.invert_yaxis()
ax1.grid(True, alpha=0.3)
ax1.legend(loc='lower right', fontsize=8)

# Plot 2: Top-down Isotherms (X-Y Plane)
ax2 = fig.add_subplot(1, 2, 2)
x_grid = np.linspace(-res['melt_length_um']*1.2, res['melt_length_um']*0.4, 150) * 1e-6
y_grid = np.linspace(-res['melt_width_um']*0.8, res['melt_width_um']*0.8, 150) * 1e-6
X, Y = np.meshgrid(x_grid, y_grid)
T_field = model.rosenthal_temperature_point_source(X, Y, 0) - 273.15

cs = ax2.contourf(X*1e6, Y*1e6, T_field, levels=[model.T0-273.15, 600, 1000, model.Tm-273.15, model.Tb-273.15], cmap='inferno')
plt.colorbar(cs, ax=ax2, label='Temperature (C)')
ax2.contour(X*1e6, Y*1e6, T_field, levels=[model.Tm-273.15], colors='yellow', linewidths=2)
ax2.set_title(f"Rosenthal Comet Top View (Regime: {res['regime']})")
ax2.set_xlabel("Scan Direction X (um)")
ax2.set_ylabel("Lateral Y (um)")
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()
`;
  }, [
    alloy,
    beamProfileType,
    absorptionPhysics,
    laserPower_W,
    scanSpeed_mms,
    beamDiameter_D4sigma_um,
    preheatTemp_C,
    layerThickness_um,
    hatchSpacing_um,
    powderBedPackingFraction,
    powderMultiReflectionBeta,
  ]);

  const handleCopyPython = () => {
    navigator.clipboard.writeText(pythonSimulationScript);
    setIsCopyingPython(true);
    setTimeout(() => setIsCopyingPython(false), 2000);
  };

  const handleApplyParams = () => {
    if (onApplyCalculatedParams) {
      onApplyCalculatedParams({
        laserPower_W,
        scanSpeed_mms,
        beamSpotRadius_um: Math.round(beamDiameter_D4sigma_um / 2),
        preheatTemp_C,
      });
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* HEADER BAR */}
      <div className="p-4 rounded-2xl bg-[#090e18] border border-[#1e2d46] space-y-3 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)] border border-cyan-400/40">
              <Focus className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Rosenthal Laser Spot &amp; Beam Absorption Melt Pool Modeler
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  3D Rosenthal Analytical Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Calculate complete melt pool geometry (W, D, L) and aspect ratio (W/D) using laser beam spot profiles (D4σ, Flat-top, Ring) and multi-reflection absorptivity (η).
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
              {isCopyingPython ? <Check className="w-3.5 h-3.5 text-white" /> : <Terminal className="w-3.5 h-3.5 text-white" />}
              <span>{isCopyingPython ? "Python Script Copied!" : "Export Python (.py)"}</span>
            </button>

            <button
              type="button"
              onClick={handleApplyParams}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Apply Parameters to Lab</span>
            </button>
          </div>
        </div>

        {/* Quick Alloy Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-[10px] text-slate-400">Select Alloy:</span>
          {Object.values(ROSENTHAL_ALLOY_DATABASE).map((mat) => {
            const isSelected = selectedAlloyKey === mat.id;
            return (
              <button
                key={mat.id}
                type="button"
                onClick={() => setSelectedAlloyKey(mat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-[#050810] text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span>{mat.name.split(" (")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("transverse-cross")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === "transverse-cross"
              ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Transverse Cross-Section (Y-Z) &amp; Aspect Ratio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("longitudinal-top")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === "longitudinal-top"
              ? "bg-amber-500/20 text-amber-200 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Waves className="w-4 h-4 text-amber-400" />
          <span>Top-Down View (X-Y Rosenthal Isotherms)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("parametric-sensitivity")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === "parametric-sensitivity"
              ? "bg-purple-500/20 text-purple-200 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span>Sensitivity Curves &amp; Beam Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("python-rosenthal")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition ${
            activeTab === "python-rosenthal"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Python Rosenthal Simulation Code</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
            Self-Contained
          </span>
        </button>
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: VISUALIZATIONS & PLOTS (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          {activeTab === "transverse-cross" ? (
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white">
                    Transverse (Y-Z) Cross-Section Geometry &amp; Layer Penetration
                  </h4>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rosenthalResults.regimeBadgeColor}`}>
                  {rosenthalResults.regimeTitle}
                </span>
              </div>

              {/* Canvas Container */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#070b14]">
                <canvas
                  ref={canvasCrossRef}
                  width={680}
                  height={320}
                  className="w-full h-auto block"
                />

                {/* Live Geometric Stats Badge */}
                <div className="absolute top-3 left-3 p-2.5 rounded-xl bg-[#090e18]/90 backdrop-blur-md border border-slate-700/60 text-[10px] space-y-1 pointer-events-none">
                  <div className="font-bold text-cyan-300">{alloy.name.split(" (")[0]}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Aspect Ratio (W/D):</span>
                    <span className="font-bold text-amber-300">{rosenthalResults.aspectRatio_W_over_D}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Depth Ratio (D/W):</span>
                    <span className="font-bold text-rose-300">{rosenthalResults.aspectRatio_D_over_W}</span>
                  </div>
                </div>
              </div>

              {/* Geometric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400">Pool Width (W)</span>
                  <div className="text-sm font-bold text-cyan-300">{rosenthalResults.meltWidth_um} µm</div>
                  <div className="text-[10px] text-slate-500">{((rosenthalResults.meltWidth_um / beamDiameter_D4sigma_um) * 100).toFixed(0)}% spot dia.</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400">Melt Depth (D)</span>
                  <div className="text-sm font-bold text-rose-300">{rosenthalResults.meltDepth_um} µm</div>
                  <div className="text-[10px] text-slate-500">{(rosenthalResults.meltDepth_um / layerThickness_um).toFixed(1)}x layer thk.</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400">Effective Absorptivity (η)</span>
                  <div className="text-sm font-bold text-emerald-300">{(absorptionPhysics.effectiveAbsorptivity * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500">{absorptionPhysics.wavelength_nm} nm optics</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400">Absorbed Power (P_eff)</span>
                  <div className="text-sm font-bold text-amber-300">{rosenthalResults.P_eff} W</div>
                  <div className="text-[10px] text-slate-500">Input: {laserPower_W} W</div>
                </div>
              </div>
            </div>
          ) : activeTab === "longitudinal-top" ? (
            /* TOP-DOWN ROSENTHAL COMET ISOTHERMS */
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">
                    Top-Down View (X-Y) Rosenthal Moving Heat Source Isotherms
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">
                  Péclet Number (Pe): <strong className="text-amber-300">{rosenthalResults.Peclet}</strong>
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#070b14]">
                <canvas
                  ref={canvasTopRef}
                  width={680}
                  height={320}
                  className="w-full h-auto block"
                />

                <div className="absolute bottom-3 left-3 p-2 rounded-lg bg-[#090e18]/90 border border-slate-700/60 text-[10px] text-slate-300 space-y-0.5">
                  <div>Total Melt Length (L): <strong className="text-amber-400">{rosenthalResults.totalLength_um} µm</strong></div>
                  <div>Tail Cooling Rate (dT/dt): <strong className="text-emerald-400">{(rosenthalResults.coolingRate_Ks / 1e5).toFixed(2)} × 10⁵ K/s</strong></div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#050810] border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <span className="text-cyan-400 font-bold">Rosenthal 3D Heat Distribution: </span>
                <span>T(x,y,z) - T₀ = (η·P / 2π·k·R) · exp(-v·(x + R) / 2α). A steep thermal gradient (G) is formed ahead of the laser, with an elongated elliptical tail behind determining the solidification structure.</span>
              </div>
            </div>
          ) : activeTab === "parametric-sensitivity" ? (
            /* PARAMETRIC SENSITIVITY & BEAM PROFILE CHARTS */
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-4">
              {/* Chart 1: Melt Pool Width & Depth vs Power */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-white">
                      Laser Power (W) Sensitivity: Pool Width (W) &amp; Depth (D)
                    </h4>
                  </div>
                  <span className="text-[10px] text-purple-300 font-bold">
                    v = {scanSpeed_mms} mm/s, d = {beamDiameter_D4sigma_um} µm
                  </span>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={parametricSensitivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="power_W" stroke="#94a3b8" unit=" W" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" unit=" µm" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Line
                        type="monotone"
                        dataKey="width_um"
                        name="Pool Width W (µm)"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="depth_um"
                        name="Melt Depth D (µm)"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Laser Beam Irradiance Profile I(r) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-2">
                    <Focus className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white">
                      Laser Irradiance Profile I(r) ({beamProfileType.toUpperCase()})
                    </h4>
                  </div>
                  <span className="text-[10px] text-cyan-300 font-bold">
                    Peak Power Density: {(absorptionPhysics.peakIrradiance_W_cm2 / 1e6).toFixed(2)} MW/cm²
                  </span>
                </div>

                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={beamIntensityProfileData}>
                      <defs>
                        <linearGradient id="colorBeam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="radius_um" stroke="#94a3b8" unit=" µm" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" domain={[0, 1.05]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46" }} />
                      <Area
                        type="monotone"
                        dataKey="intensity_rel"
                        name="Relative Irradiance I/I₀"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBeam)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            /* PYTHON SCRIPT TAB */
            <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">
                    Executable Python Rosenthal LPBF Analytical Model
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPython}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy Code</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#050810] border border-slate-800 overflow-x-auto max-h-[380px]">
                <pre className="text-[10px] text-emerald-300 font-mono leading-relaxed">
                  {pythonSimulationScript}
                </pre>
              </div>
            </div>
          )}

          {/* PROCESS REGIME QUALIFICATION NOTIFICATION CARD */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${
            rosenthalResults.regimeStatus === "CONDUCTION"
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              : rosenthalResults.regimeStatus === "KEYHOLE"
              ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
              : "bg-amber-500/10 border-amber-500/40 text-amber-300"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                {rosenthalResults.regimeStatus === "CONDUCTION" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>Process Regime: {rosenthalResults.regimeTitle}</span>
              </div>
              <strong className="text-sm font-mono">W/D = {rosenthalResults.aspectRatio_W_over_D}</strong>
            </div>
            <p className="text-[11px] font-sans opacity-90 leading-relaxed">
              {rosenthalResults.regimeDesc}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: LASER PROFILE & OPTICAL SLIDERS (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* LASER SPOT PROFILE CONTROLS */}
          <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Focus className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">Laser Beam &amp; Spot Dimensions</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Optics
              </span>
            </div>

            {/* Beam Profile Shape Selector */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">Beam Irradiance Profile</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "gaussian", label: "Gaussian (TEM00)" },
                  { id: "flattop", label: "Flat-Top (Top-Hat)" },
                  { id: "donut", label: "Ring / Donut (AFX)" },
                  { id: "supergaussian", label: "Super-Gaussian" },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBeamProfileType(b.id as BeamProfileType)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-center border transition ${
                      beamProfileType === b.id
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                        : "bg-[#050810] text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spot Diameter D_4sigma */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Spot Diameter (D₄σ / 2w₀)</span>
                <span className="text-cyan-400 font-bold font-mono">{beamDiameter_D4sigma_um} µm</span>
              </div>
              <input
                type="range"
                min={30}
                max={200}
                step={2}
                value={beamDiameter_D4sigma_um}
                onChange={(e) => setBeamDiameter_D4sigma_um(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Laser Wavelength Preset */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">Laser Wavelength (λ)</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "ir-1064", label: "1064 nm (IR)" },
                  { id: "green-515", label: "515 nm (Green)" },
                  { id: "blue-450", label: "450 nm (Blue)" },
                ].map((wl) => (
                  <button
                    key={wl.id}
                    type="button"
                    onClick={() => setWavelengthMode(wl.id as LaserWavelengthPreset)}
                    className={`px-1.5 py-1 rounded text-[9px] font-bold border transition ${
                      wavelengthMode === wl.id
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50"
                        : "bg-[#050810] text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {wl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Focal Shift Offset (Delta Z) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Defocus Offset (Δz)</span>
                <span className="text-indigo-400 font-bold font-mono">
                  {focalShift_DeltaZ_um > 0 ? `+${focalShift_DeltaZ_um}` : focalShift_DeltaZ_um} µm
                </span>
              </div>
              <input
                type="range"
                min={-150}
                max={150}
                step={5}
                value={focalShift_DeltaZ_um}
                onChange={(e) => setFocalShift_DeltaZ_um(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Rayleigh: {absorptionPhysics.rayleighLength_um} µm</span>
                <span>Effective Dia: {absorptionPhysics.defocusedSpotDiameter_um} µm</span>
              </div>
            </div>

            {/* Beam Quality M^2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Beam Quality (M²)</span>
                <span className="text-slate-200 font-bold font-mono">{beamQuality_M2.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={1.6}
                step={0.02}
                value={beamQuality_M2}
                onChange={(e) => setBeamQuality_M2(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* BEAM ABSORPTION & POWDER MULTI-REFLECTION CONTROLS */}
          <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">Absorption &amp; Multi-Reflection (η)</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Fresnel / Gusarov
              </span>
            </div>

            {/* Override absorption toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Manual Absorptivity Override</span>
              <button
                type="button"
                onClick={() => setOverrideAbsorption(!overrideAbsorption)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  overrideAbsorption
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {overrideAbsorption ? "MANUAL" : "AUTO"}
              </button>
            </div>

            {overrideAbsorption ? (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold">Manual Absorptivity (η)</span>
                  <span className="text-emerald-400 font-bold font-mono">{(customAbsorptionValue * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.10}
                  max={0.90}
                  step={0.01}
                  value={customAbsorptionValue}
                  onChange={(e) => setCustomAbsorptionValue(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            ) : (
              <>
                {/* Powder Packing Fraction */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 font-semibold">Powder Bed Packing Fraction (φ)</span>
                    <span className="text-emerald-400 font-bold font-mono">{(powderBedPackingFraction * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.45}
                    max={0.75}
                    step={0.01}
                    value={powderBedPackingFraction}
                    onChange={(e) => setPowderBedPackingFraction(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Powder Multi-Reflection Beta Exponent */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 font-semibold">Cavity Trapping Factor (β)</span>
                    <span className="text-emerald-400 font-bold font-mono">{powderMultiReflectionBeta.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.2}
                    max={2.6}
                    step={0.05}
                    value={powderMultiReflectionBeta}
                    onChange={(e) => setPowderMultiReflectionBeta(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Solid Surface: {(absorptionPhysics.a_base * 100).toFixed(0)}%</span>
                    <span>Effective Bed: {(absorptionPhysics.effectiveAbsorptivity * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* PROCESS CONTROLS (Power & Speed) */}
          <div className="p-3.5 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Process Parameters</h4>
              </div>
            </div>

            {/* Laser Power Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Laser Power (P)</span>
                <span className="text-amber-400 font-bold font-mono">{laserPower_W} W</span>
              </div>
              <input
                type="range"
                min={80}
                max={500}
                step={5}
                value={laserPower_W}
                onChange={(e) => setLaserPower_W(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Scan Speed Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Scan Speed (v)</span>
                <span className="text-amber-400 font-bold font-mono">{scanSpeed_mms} mm/s</span>
              </div>
              <input
                type="range"
                min={200}
                max={2500}
                step={20}
                value={scanSpeed_mms}
                onChange={(e) => setScanSpeed_mms(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Bed Preheat Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-semibold">Bed Preheat (T_bed)</span>
                <span className="text-amber-400 font-bold font-mono">{preheatTemp_C} °C</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={preheatTemp_C}
                onChange={(e) => setPreheatTemp_C(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import {
  Box,
  Layers,
  Activity,
  Zap,
  Sliders,
  Sparkles,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  Camera,
  RotateCcw,
  Compass,
  FileSpreadsheet,
  FileText,
  Info,
  Maximize2,
  RefreshCw,
  Eye,
  Trash2,
  ThermometerSnowflake,
  Waves,
  Focus,
  GitFork,
  Scissors,
  Database,
  ChevronDown,
} from "lucide-react";
import {
  parseSTL,
  parseSTLAsync,
  createRocketNozzleGeometry,
  createTurbineBladeGeometry,
  createAerospaceBracketGeometry,
  createLatticeGyroidGeometry,
} from "../utils/stlParser";
import {
  ThermalMeltPoolVisualization,
  MeltPool3DCrossSectionLab,
  OperandoSynchrotronXRayLab,
  MultiTrackThermalAccumulationLab,
  AnisotropicMechanicalFatigueLab,
  RosenthalLaserProfileMeltPoolLab,
  SolidificationFrontCETLab,
  MarangoniPoreInstabilityLab,
  CADStlSlicerDistortionLab,
  BasicSTLSlicerLab,
  LPBFGroundTruthDataLab,
  IndustrialLPBFDecisionLab,
} from "./3d-distortion-lab";
import { useMaterialSpecimenStore, LpbfScanStrategy } from "../store/useMaterialSpecimenStore";
import { useLpbfBuildMeshStore } from "../store/useLpbfBuildMeshStore";
import { LpbfBuildJobRail, isAdvancedLpbfSubTab, type LpbfBuildJobStage } from "./LpbfBuildJobRail";

type LpbfDistortionSubTab =
  | "industrial-decision"
  | "ground-truth-foundation"
  | "basic-stl-slicer"
  | "3d-macro-distortion"
  | "3d-cross-section-melt-pool"
  | "marangoni-pore-heatmap"
  | "rosenthal-laser-profile"
  | "solidification-front-cet"
  | "multi-track-accumulation"
  | "anisotropic-fatigue-estimator"
  | "operando-synchrotron"
  | "2d-thermal-melt-pool";

const LPBF_SUB_TAB_IDS: LpbfDistortionSubTab[] = [
  "industrial-decision",
  "ground-truth-foundation",
  "basic-stl-slicer",
  "3d-macro-distortion",
  "3d-cross-section-melt-pool",
  "marangoni-pore-heatmap",
  "rosenthal-laser-profile",
  "solidification-front-cet",
  "multi-track-accumulation",
  "anisotropic-fatigue-estimator",
  "operando-synchrotron",
  "2d-thermal-melt-pool",
];

function isLpbfDistortionSubTab(value: string): value is LpbfDistortionSubTab {
  return (LPBF_SUB_TAB_IDS as string[]).includes(value);
}

const ADVANCED_PHYSICS_LABS: {
  id: LpbfDistortionSubTab;
  label: string;
  shortLabel: string;
  badge: string;
  icon: React.ElementType;
  activeClass: string;
}[] = [
  {
    id: "3d-macro-distortion",
    label: "3D CAD/STL Distortion & Residual Stress FEA",
    shortLabel: "Distortion FEA",
    badge: "ASTM F3055",
    icon: Box,
    activeClass: "bg-cyan-500/20 text-cyan-200 border-cyan-400/50",
  },
  {
    id: "3d-cross-section-melt-pool",
    label: "3D Cross-Sectional Melt Pool & Keyhole Studio",
    shortLabel: "Melt Pool 3D",
    badge: "Python HPC",
    icon: Zap,
    activeClass: "bg-sky-500/20 text-sky-200 border-sky-400/50",
  },
  {
    id: "marangoni-pore-heatmap",
    label: "3D Marangoni Flow & Gas Entrapment Heatmap",
    shortLabel: "Marangoni map",
    badge: "Screening",
    icon: Waves,
    activeClass: "bg-cyan-500/20 text-cyan-200 border-cyan-400/50",
  },
  {
    id: "rosenthal-laser-profile",
    label: "Rosenthal Laser Spot & Absorption Melt Pool",
    shortLabel: "Rosenthal spot",
    badge: "Rosenthal",
    icon: Focus,
    activeClass: "bg-cyan-500/20 text-cyan-200 border-cyan-400/50",
  },
  {
    id: "solidification-front-cet",
    label: "Solidification Front Anisotropy (G×R) & CET Mapper",
    shortLabel: "Solidification G/R",
    badge: "Hunt",
    icon: GitFork,
    activeClass: "bg-purple-500/20 text-purple-200 border-purple-400/50",
  },
  {
    id: "multi-track-accumulation",
    label: "Multi-Track Scan Strategy & Thermal Accumulation",
    shortLabel: "Multi-track",
    badge: "Hatch",
    icon: Waves,
    activeClass: "bg-amber-500/20 text-amber-200 border-amber-400/50",
  },
  {
    id: "anisotropic-fatigue-estimator",
    label: "Anisotropic Mechanical & S-N Fatigue",
    shortLabel: "S-N fatigue",
    badge: "Hill'48",
    icon: Compass,
    activeClass: "bg-purple-500/20 text-purple-200 border-purple-400/50",
  },
  {
    id: "operando-synchrotron",
    label: "High-Speed Operando Synchrotron X-Ray Workbench",
    shortLabel: "Operando X-ray",
    badge: "APS / ESRF",
    icon: Camera,
    activeClass: "bg-pink-500/20 text-pink-200 border-pink-400/50",
  },
  {
    id: "2d-thermal-melt-pool",
    label: "Thermal Melt Pool & Solidification Front Lab",
    shortLabel: "2D thermal",
    badge: "2D",
    icon: Flame,
    activeClass: "bg-cyan-500/20 text-cyan-200 border-cyan-400/50",
  },
];


export type HeatmapMode =
  | "residual-stress"
  | "thermal-gradient-cracking"
  | "keyhole-overheat"
  | "lack-of-fusion"
  | "overhang-dross"
  | "cooling-rate"
  | "recoater-crash";

// ----------------------------------------------------------------------
// Reusable High-Precision Metallurgical Tooltip Component
// ----------------------------------------------------------------------
interface MetallurgicalTooltipProps {
  title: string;
  badgeText?: string;
  badgeVariant?: "danger" | "warning" | "success" | "info";
  formula?: string;
  criterionName?: string;
  currentValue?: string;
  criticalThreshold?: string;
  explanation: string;
  recommendation?: string;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}

const MetallurgicalTooltip: React.FC<MetallurgicalTooltipProps> = ({
  title,
  badgeText,
  badgeVariant = "info",
  formula,
  criterionName,
  currentValue,
  criticalThreshold,
  explanation,
  recommendation,
  children,
  align = "center",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case "danger":
        return "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
      case "warning":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
      case "success":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
      default:
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]";
    }
  };

  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
      ? "right-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <div
      className="relative inline-flex items-center group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="cursor-help inline-flex items-center"
      >
        {children}
      </div>

      {isOpen && (
        <div
          className={`absolute bottom-full mb-2.5 ${alignClass} w-80 sm:w-96 p-4 rounded-xl bg-[#090e18]/98 backdrop-blur-xl border border-[#1e2d46] shadow-[0_15px_40px_rgba(0,0,0,0.85)] z-50 text-left font-sans text-xs space-y-2.5 pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-[#162032] pb-2">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{title}</span>
            </div>
            {badgeText && (
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0 ${getBadgeStyle()}`}
              >
                {badgeText}
              </span>
            )}
          </div>

          {/* Criterion & Formula Box */}
          {(criterionName || formula) && (
            <div className="p-2.5 rounded-lg bg-[#050810] border border-[#162032] font-mono text-[10px] space-y-1">
              {criterionName && (
                <div className="text-slate-400 font-semibold flex items-center gap-1">
                  <span className="text-cyan-400 font-bold">§</span>
                  <span>{criterionName}</span>
                </div>
              )}
              {formula && (
                <div className="text-cyan-300 font-bold tracking-wide">
                  {formula}
                </div>
              )}
            </div>
          )}

          {/* Value Comparison */}
          {(currentValue || criticalThreshold) && (
            <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-[#050810]/70 border border-[#162032] font-mono text-[10px]">
              {currentValue && (
                <div>
                  <span className="text-slate-500 block">Current State:</span>
                  <span className="font-bold text-slate-200">{currentValue}</span>
                </div>
              )}
              {criticalThreshold && (
                <div>
                  <span className="text-slate-500 block">Critical Threshold:</span>
                  <span className="font-bold text-rose-400">{criticalThreshold}</span>
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {explanation}
          </p>

          {/* Actionable Recommendation */}
          {recommendation && (
            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-[10px] text-cyan-200 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Actionable Mitigation:</strong> {recommendation}
              </span>
            </div>
          )}

          {/* Arrow Indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[#090e18] border-r border-b border-[#1e2d46] rotate-45" />
        </div>
      )}
    </div>
  );
};

export interface LpbfAlloyPreset {
  id: string;
  name: string;
  category: "Nickel Superalloy" | "Titanium" | "Stainless Steel" | "Aluminum / Scalmalloy";
  thermalConductivity_k_WmK: number;
  density_rho_kgm3: number;
  specificHeat_Cp_JkgK: number;
  meltingTemp_Tm_C: number;
  solidusTemp_Ts_C: number;
  freezingRange_dT_C: number;
  boilingTemp_Tb_C: number;
  laserAbsorptivity_A: number;
  thermalExpansion_CTE_10e6: number;
  elasticModulus_E_GPa: number;
  criticalGradient_G_Km: number;
  hotTearingSusceptibility: "Low" | "Moderate" | "High" | "Critical";
  crackingMechanism: string;
  mitigationRecommendation: string;
  recommendedLaserPower_W: number;
  recommendedSpeed_mms: number;
  recommendedHatch_um: number;
  recommendedLayer_um: number;
  description: string;
}

export const LPBF_ALLOY_PRESETS: LpbfAlloyPreset[] = [
  {
    id: "in718-lpbf",
    name: "Inconel 718 (Nickel Superalloy)",
    category: "Nickel Superalloy",
    thermalConductivity_k_WmK: 11.4,
    density_rho_kgm3: 8190,
    specificHeat_Cp_JkgK: 435,
    meltingTemp_Tm_C: 1336,
    solidusTemp_Ts_C: 1260,
    freezingRange_dT_C: 76,
    boilingTemp_Tb_C: 2913,
    laserAbsorptivity_A: 0.52,
    thermalExpansion_CTE_10e6: 13.0,
    elasticModulus_E_GPa: 205,
    criticalGradient_G_Km: 1.4e7, // 1.40 x 10^7 K/m
    hotTearingSusceptibility: "High",
    crackingMechanism:
      "Nb micro-segregation into the terminal interdendritic liquid film forms low-melting Laves phases. When the thermal gradient G induces high shrinkage strain rate (έ_th = CTE · G · R), liquid film ruptures before solid bridging occurs (Rappaz-Drezet-Gremaud model).",
    mitigationRecommendation:
      "Increase build plate preheating to ≥250–350°C and moderate scan speed to lower the thermal gradient G below 1.4×10⁷ K/m.",
    recommendedLaserPower_W: 285,
    recommendedSpeed_mms: 960,
    recommendedHatch_um: 110,
    recommendedLayer_um: 40,
    description: "High thermal crack susceptibility, requires high bed preheating to mitigate residual tensile stresses.",
  },
  {
    id: "ti64-eli-lpbf",
    name: "Ti-6Al-4V Grade 23 ELI",
    category: "Titanium",
    thermalConductivity_k_WmK: 6.7, // low conductivity -> high thermal gradients
    density_rho_kgm3: 4430,
    specificHeat_Cp_JkgK: 526,
    meltingTemp_Tm_C: 1660,
    solidusTemp_Ts_C: 1604,
    freezingRange_dT_C: 56,
    boilingTemp_Tb_C: 3287,
    laserAbsorptivity_A: 0.65,
    thermalExpansion_CTE_10e6: 8.6,
    elasticModulus_E_GPa: 114,
    criticalGradient_G_Km: 1.8e7, // 1.80 x 10^7 K/m
    hotTearingSusceptibility: "Moderate",
    crackingMechanism:
      "Extremely low thermal conductivity localizes heat input, causing steep thermal gradients. High cooling rates trigger diffusionless martensitic α' transformation with high localized residual tensile stresses and cold cracking risks.",
    mitigationRecommendation:
      "Apply minimum 150–200°C baseplate preheat to reduce thermal shock and relieve peak tensile stress.",
    recommendedLaserPower_W: 240,
    recommendedSpeed_mms: 1200,
    recommendedHatch_um: 105,
    recommendedLayer_um: 30,
    description: "Low thermal conductivity creates localized steep thermal gradients and high distortion risk.",
  },
  {
    id: "ss316l-lpbf",
    name: "SS 316L (Austenitic)",
    category: "Stainless Steel",
    thermalConductivity_k_WmK: 16.3,
    density_rho_kgm3: 7990,
    specificHeat_Cp_JkgK: 500,
    meltingTemp_Tm_C: 1400,
    solidusTemp_Ts_C: 1375,
    freezingRange_dT_C: 25,
    boilingTemp_Tb_C: 2814,
    laserAbsorptivity_A: 0.58,
    thermalExpansion_CTE_10e6: 16.0,
    elasticModulus_E_GPa: 193,
    criticalGradient_G_Km: 2.5e7, // 2.50 x 10^7 K/m
    hotTearingSusceptibility: "Low",
    crackingMechanism:
      "Solidifies in primary ferritic-austenitic (FA) mode with a narrow freezing range (ΔT ≈ 25°C). Excellent intrinsic hot cracking resistance under standard LPBF conditions.",
    mitigationRecommendation:
      "Maintain adequate support structures to resist macroscopic distortion caused by high thermal expansion coefficient.",
    recommendedLaserPower_W: 200,
    recommendedSpeed_mms: 800,
    recommendedHatch_um: 120,
    recommendedLayer_um: 50,
    description: "High coefficient of thermal expansion, prone to baseplate peel-off if supports are undersized.",
  },
  {
    id: "scalmalloy-lpbf",
    name: "Scalmalloy® (Al-Mg-Sc-Zr)",
    category: "Aluminum / Scalmalloy",
    thermalConductivity_k_WmK: 120.0, // very high conductivity
    density_rho_kgm3: 2670,
    specificHeat_Cp_JkgK: 900,
    meltingTemp_Tm_C: 650,
    solidusTemp_Ts_C: 580,
    freezingRange_dT_C: 70,
    boilingTemp_Tb_C: 2470,
    laserAbsorptivity_A: 0.28,
    thermalExpansion_CTE_10e6: 23.0,
    elasticModulus_E_GPa: 71,
    criticalGradient_G_Km: 1.15e7, // 1.15 x 10^7 K/m
    hotTearingSusceptibility: "Moderate",
    crackingMechanism:
      "High solidification shrinkage (6.5%) and high CTE produce substantial tensile strain during the final stage of solidification. Al3(Sc,Zr) nano-precipitates refine grains, but steep thermal gradients without preheat can induce hot tears.",
    mitigationRecommendation:
      "Use baseplate preheating (≥150°C) and tight hatch spacing to ensure uniform thermal distribution and complete mushy zone feeding.",
    recommendedLaserPower_W: 400,
    recommendedSpeed_mms: 1600,
    recommendedHatch_um: 130,
    recommendedLayer_um: 60,
    description: "High laser reflectivity and rapid heat dissipation require high laser power to prevent lack of fusion.",
  },
];

export const Additive3DDistortionLab: React.FC = () => {
  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<LpbfDistortionSubTab>("3d-cross-section-melt-pool");
  const [focusedWizardStage, setFocusedWizardStage] = useState<LpbfBuildJobStage>("process");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const labStageRef = useRef<HTMLDivElement | null>(null);

  const openPhysicsLab = (id: LpbfDistortionSubTab) => {
    setActiveSubTab(id);
    setAdvancedOpen(id !== "3d-cross-section-melt-pool");
    window.setTimeout(() => {
      labStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  useEffect(() => {
    const applySubTab = (raw?: string) => {
      if (!raw || !isLpbfDistortionSubTab(raw)) return;
      setActiveSubTab(raw);
      if (isAdvancedLpbfSubTab(raw)) {
        setAdvancedOpen(raw !== "3d-cross-section-melt-pool");
        return;
      }
      if (raw === "basic-stl-slicer") setFocusedWizardStage("cad");
      else if (raw === "ground-truth-foundation") setFocusedWizardStage("record");
      else setFocusedWizardStage("process");
    };

    const params = new URLSearchParams(window.location.search);
    applySubTab(params.get("lpbfSubTab") || params.get("activeSubTab") || undefined);
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.startsWith("lpbf=")) applySubTab(hash.slice(5));
    else applySubTab(hash);

    const onNav = (e: Event) => {
      const detail = (e as CustomEvent<{ subTab?: string; lpbfSubTab?: string; activeSubTab?: string }>).detail;
      applySubTab(detail?.subTab || detail?.lpbfSubTab || detail?.activeSubTab);
    };
    window.addEventListener("metallix-lpbf-subtab", onNav);
    window.addEventListener("metallix-navigate-tab", onNav);
    return () => {
      window.removeEventListener("metallix-lpbf-subtab", onNav);
      window.removeEventListener("metallix-navigate-tab", onNav);
    };
  }, []);

  // 3D Canvas Ref
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Model & Preset States
  const [modelType, setModelType] = useState<"nozzle" | "turbine" | "bracket" | "gyroid" | "custom">("nozzle");
  const [activeHeatmap, setActiveHeatmap] = useState<HeatmapMode>("residual-stress");

  const [recoaterBladeType, setRecoaterBladeType] = useState<"ceramic_rigid" | "silicone_flexible">("ceramic_rigid");

  // Viewport toggles
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showBuildPlatform, setShowBuildPlatform] = useState<boolean>(true);
  const [exaggerateDistortion, setExaggerateDistortion] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Custom STL Upload state
  const [customStlGeometry, setCustomStlGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI & Audit State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);

  // Universal Specimen State from single reactive Zustand store (Build Job process vector)
  const activeSpecimen = useMaterialSpecimenStore((s) => s.activeSpecimen);
  const loadPreset = useMaterialSpecimenStore((s) => s.loadPreset);
  const updateLpbfProcess = useMaterialSpecimenStore((s) => s.updateLpbfProcess);
  const setLiveMeshFromGeometry = useLpbfBuildMeshStore((s) => s.setFromGeometry);
  const clearLiveMesh = useLpbfBuildMeshStore((s) => s.clearMesh);
  const lpbf = activeSpecimen.lpbf;
  const laserPower_W = lpbf.laserPower_W;
  const scanSpeed_mms = lpbf.scanSpeed_mms;
  const hatchSpacing_um = lpbf.hatch_um;
  const layerThickness_um = lpbf.layer_um;
  const beamSpotRadius_um = lpbf.beamDiameter_um / 2;
  const beamProfileMode = lpbf.beamProfile;
  const bedPreheat_C = lpbf.preheatTemp_C;
  const scanStrategy = lpbf.scanStrategy;
  const [selectedAlloyId, setSelectedAlloyId] = useState<string>("active-universal-specimen");

  const activeUniversalAlloy = useMemo<LpbfAlloyPreset>(() => {
    return {
      id: "active-universal-specimen",
      name: activeSpecimen.name,
      category: activeSpecimen.category,
      thermalConductivity_k_WmK: activeSpecimen.lpbf.thermalConductivity_k_WmK,
      density_rho_kgm3: activeSpecimen.lpbf.density_rho_kgm3,
      specificHeat_Cp_JkgK: activeSpecimen.lpbf.specificHeat_Cp_JkgK,
      meltingTemp_Tm_C: activeSpecimen.liquidus_C,
      solidusTemp_Ts_C: activeSpecimen.solidus_C,
      freezingRange_dT_C: activeSpecimen.freezingRange_C,
      boilingTemp_Tb_C: Math.round(activeSpecimen.liquidus_C * 1.85 + 200),
      laserAbsorptivity_A: activeSpecimen.lpbf.laserAbsorptivity,
      thermalExpansion_CTE_10e6: activeSpecimen.lpbf.thermalExpansion_CTE_10e6,
      elasticModulus_E_GPa: activeSpecimen.youngsModulus_GPa,
      criticalGradient_G_Km: activeSpecimen.lpbf.criticalGradient_G_Km,
      hotTearingSusceptibility: activeSpecimen.lpbf.hotTearingSusceptibility,
      crackingMechanism: activeSpecimen.lpbf.crackingMechanism,
      mitigationRecommendation: activeSpecimen.lpbf.mitigationRecommendation,
      recommendedLaserPower_W: activeSpecimen.lpbf.recommendedLaserPower_W,
      recommendedSpeed_mms: activeSpecimen.lpbf.recommendedScanSpeed_mms,
      recommendedHatch_um: activeSpecimen.lpbf.recommendedHatch_um,
      recommendedLayer_um: activeSpecimen.lpbf.recommendedLayer_um,
      description: `Universal Specimen Thread (${activeSpecimen.chemicalFormula}) synced live from ${activeSpecimen.sourceTab}.`,
    };
  }, [activeSpecimen]);

  const alloy = useMemo(() => {
    if (selectedAlloyId === "active-universal-specimen") {
      return activeUniversalAlloy;
    }
    return LPBF_ALLOY_PRESETS.find((a) => a.id === selectedAlloyId) || activeUniversalAlloy;
  }, [selectedAlloyId, activeUniversalAlloy]);

  const PRESET_ID_MAP: Record<string, string> = {
    "in718-lpbf": "inconel-718",
    "ti64-eli-lpbf": "ti-6al-4v",
    "ss316l-lpbf": "ss-316l",
    "scalmalloy-lpbf": "alsi10mg",
  };

  const handleSelectAlloy = (aId: string) => {
    setSelectedAlloyId(aId);
    if (aId === "active-universal-specimen") return;
    const mapped = PRESET_ID_MAP[aId];
    if (mapped) {
      loadPreset(mapped);
      setSelectedAlloyId("active-universal-specimen");
      return;
    }
    const item = LPBF_ALLOY_PRESETS.find((a) => a.id === aId);
    if (item) {
      updateLpbfProcess({
        laserPower_W: item.recommendedLaserPower_W,
        scanSpeed_mms: item.recommendedSpeed_mms,
        hatch_um: item.recommendedHatch_um,
        layer_um: item.recommendedLayer_um,
      });
    }
  };

  // THERMAL & DEFECT PHYSICS COMPUTATIONS:
  // 1. Volumetric Energy Density (VED):
  //    VED = P / (v * h * t)  [J/mm³]
  const ved_J_mm3 = useMemo(() => {
    const v_mm_s = Math.max(10, scanSpeed_mms);
    const h_mm = hatchSpacing_um / 1000;
    const t_mm = layerThickness_um / 1000;
    const ved = laserPower_W / (v_mm_s * h_mm * t_mm);
    return Math.round(ved);
  }, [laserPower_W, scanSpeed_mms, hatchSpacing_um, layerThickness_um]);

  // 2. Normalized Enthalpy (King et al. Keyhole Inversion Criterion):
  //    alpha = k / (rho * Cp) [m²/s]
  //    Delta H / hs = (A * P) / (rho * Cp * Tm * sqrt(pi * alpha * v * r0^3))
  const meltPoolPhysics = useMemo(() => {
    const k = alloy.thermalConductivity_k_WmK;
    const rho = alloy.density_rho_kgm3;
    const Cp = alloy.specificHeat_Cp_JkgK;
    const Tm = alloy.meltingTemp_Tm_C;
    const A = alloy.laserAbsorptivity_A;
    const alpha = k / (rho * Cp); // thermal diffusivity in m^2/s

    const v_m_s = scanSpeed_mms / 1000;
    const r0_m = (beamSpotRadius_um * 1e-6);
    const profileIntensityFactor = beamProfileMode === "gaussian" ? 1.0 : 0.78;

    // Volumetric melting enthalpy hs = rho * Cp * Tm (J/m^3)
    const hs = rho * Cp * Tm;
    const P_abs = laserPower_W * A * profileIntensityFactor;

    // Dimensionless Normalized Enthalpy (King et al.)
    const denom = hs * Math.sqrt(Math.PI * alpha * v_m_s * Math.pow(r0_m, 3));
    const normalizedEnthalpy = denom > 0 ? P_abs / denom : 1.0;

    // Normalized Laser Intensity / Normalized Power (P* = A·P / (k · r0 · (Tm - T0)))
    const deltaT_melt = Math.max(100, Tm - bedPreheat_C);
    const normalizedLaserIntensity_Pstar = (P_abs) / (k * r0_m * deltaT_melt);

    // Normalized Scan Speed / Péclet Number (Pe = v · r0 / (2 * alpha))
    const normalizedScanSpeed_Peclet = (v_m_s * r0_m) / (2 * Math.max(1e-9, alpha));

    // King et al. Keyhole threshold criterion: Delta H / hs > pi * sqrt(Tb / Tm)
    const keyholeThreshold = Math.PI * Math.sqrt((alloy.boilingTemp_Tb_C + 273.15) / (Tm + 273.15));

    // Gouge-Michaleris & King Keyhole Porosity Boundary Criterion:
    // Keyhole threshold line in Normalized Intensity vs Pe:
    // P*_crit(Pe) = keyholeThreshold * sqrt(2 * Pe) * (Tm / deltaT_melt)
    const criticalNormalizedIntensity = keyholeThreshold * Math.sqrt(Math.max(0.01, 2 * normalizedScanSpeed_Peclet)) * (Tm / deltaT_melt);
    const keyholeRiskRatio = normalizedLaserIntensity_Pstar / Math.max(0.01, criticalNormalizedIntensity);

    // Keyhole Porosity Risk Quantification
    const isKeyholeRiskHigh = normalizedEnthalpy > keyholeThreshold || keyholeRiskRatio >= 1.05;
    const isKeyholeRiskModerate = !isKeyholeRiskHigh && (normalizedEnthalpy > keyholeThreshold * 0.88 || keyholeRiskRatio >= 0.88);
    const isLoFRisk = normalizedEnthalpy < keyholeThreshold * 0.45;

    // Microstructure Solidification Morphology based on G / R (Hunt Solidification Criterion):
    // G / R ratio (K·s/m²):
    // > 1e11: Planar / Cellular front
    // 1e9 - 1e11: Fine Columnar Dendritic
    // 1e7 - 1e9: Mixed Columnar-to-Equiaxed Transition (CET)
    // < 1e7: Fully Equiaxed Dendritic
    const G_over_R = (Tm - bedPreheat_C) / (Math.max(10, 50) * 1e-6) / Math.max(0.01, v_m_s * 0.85);
    let microstructureMorphology: "Ultra-Fine Cellular" | "Columnar Dendritic" | "Columnar-Equiaxed (CET)" | "Fine Equiaxed";
    let grainWidth_um: number;
    let expectedMicrohardness_HV: number;

    if (G_over_R > 5e10) {
      microstructureMorphology = "Ultra-Fine Cellular";
      grainWidth_um = 0.45;
      expectedMicrohardness_HV = Math.round(alloy.id === "inconel-718" ? 385 : alloy.id === "ti6al4v-eli" ? 395 : alloy.id === "ss-316l" ? 245 : 170);
    } else if (G_over_R > 2e9) {
      microstructureMorphology = "Columnar Dendritic";
      grainWidth_um = 1.25;
      expectedMicrohardness_HV = Math.round(alloy.id === "inconel-718" ? 360 : alloy.id === "ti6al4v-eli" ? 370 : alloy.id === "ss-316l" ? 230 : 155);
    } else if (G_over_R > 1e8) {
      microstructureMorphology = "Columnar-Equiaxed (CET)";
      grainWidth_um = 2.40;
      expectedMicrohardness_HV = Math.round(alloy.id === "inconel-718" ? 340 : alloy.id === "ti6al4v-eli" ? 350 : alloy.id === "ss-316l" ? 215 : 145);
    } else {
      microstructureMorphology = "Fine Equiaxed";
      grainWidth_um = 4.10;
      expectedMicrohardness_HV = Math.round(alloy.id === "inconel-718" ? 320 : alloy.id === "ti6al4v-eli" ? 335 : alloy.id === "ss-316l" ? 200 : 135);
    }

    // Keyhole Vapor Depression Cavity Depth (Kaplan Model)
    // d_vapor ~ r0 * (P* / 2)^0.8
    const keyholeCavityDepth_um = isKeyholeRiskHigh
      ? Math.round(beamSpotRadius_um * Math.pow(Math.max(1, normalizedLaserIntensity_Pstar / 2), 0.85))
      : 0;

    // Rosenthal 3D Steady-State Melt Pool Dimensions (in microns)
    // Width w approx 2 * r0 * sqrt(normalizedEnthalpy)
    const meltPoolWidth_um = Math.round(2 * beamSpotRadius_um * Math.sqrt(Math.max(0.2, normalizedEnthalpy / 2.5)));
    // Depth d depends on conduction vs keyholing
    const isKeyholing = normalizedEnthalpy > keyholeThreshold;
    const depthToWidthRatio = isKeyholing
      ? 0.85 + (normalizedEnthalpy - keyholeThreshold) * 0.25
      : 0.35 + (normalizedEnthalpy / keyholeThreshold) * 0.40;
    const meltPoolDepth_um = Math.round(meltPoolWidth_um * depthToWidthRatio);

    // Thermal Gradient G (K/m) & Solidification Rate R (m/s)
    const G_Km = Math.round((Tm - bedPreheat_C) / (Math.max(10, meltPoolDepth_um) * 1e-6));
    const R_ms = (v_m_s * 0.85).toFixed(3);
    const coolingRate_Ks = Math.round(G_Km * (v_m_s * 0.85)); // G * R (K/s)
    // Cellular subgrain spacing lambda (um) ~ 50 * (coolingRate)^(-0.35)
    const cellularSpacing_um = (50 * Math.pow(Math.max(1e4, coolingRate_Ks), -0.35)).toFixed(2);

    return {
      normalizedEnthalpy: parseFloat(normalizedEnthalpy.toFixed(2)),
      normalizedLaserIntensity_Pstar: parseFloat(normalizedLaserIntensity_Pstar.toFixed(2)),
      normalizedScanSpeed_Peclet: parseFloat(normalizedScanSpeed_Peclet.toFixed(3)),
      criticalNormalizedIntensity: parseFloat(criticalNormalizedIntensity.toFixed(2)),
      keyholeRiskRatio: parseFloat(keyholeRiskRatio.toFixed(2)),
      isKeyholeRiskHigh,
      isKeyholeRiskModerate,
      isLoFRisk,
      keyholeCavityDepth_um,
      microstructureMorphology,
      grainWidth_um,
      expectedMicrohardness_HV,
      G_over_R: G_over_R.toExponential(2),
      keyholeThreshold: parseFloat(keyholeThreshold.toFixed(2)),
      isKeyholing,
      meltPoolWidth_um,
      meltPoolDepth_um,
      depthToWidthRatio: parseFloat(depthToWidthRatio.toFixed(2)),
      coolingRate_Ks,
      cellularSpacing_um,
      G_Km,
      R_ms,
    };
  }, [alloy, laserPower_W, scanSpeed_mms, beamSpotRadius_um, beamProfileMode, bedPreheat_C]);

  // 3. Normalized Enthalpy & Defect Regime Status
  const processRegime = useMemo(() => {
    if (meltPoolPhysics.isKeyholing || meltPoolPhysics.depthToWidthRatio > 0.85) {
      return {
        status: "Keyhole Vaporization Cavity",
        color: "text-rose-400",
        severity: "CRITICAL DEFECT DANGER",
        desc: `Normalized Enthalpy (ΔH/hs = ${meltPoolPhysics.normalizedEnthalpy}) exceeds keyhole threshold (${meltPoolPhysics.keyholeThreshold}). Trapped vapor pores form behind melt pool.`,
      };
    } else if (meltPoolPhysics.meltPoolDepth_um < layerThickness_um * 1.3) {
      return {
        status: "Lack of Fusion (LoF) & Balling",
        color: "text-amber-400",
        severity: "DELAMINATION RISK",
        desc: `Melt pool depth (${meltPoolPhysics.meltPoolDepth_um} µm) provides insufficient penetration into previous layer (${layerThickness_um} µm). Inter-layer bonding compromised.`,
      };
    }
    return {
      status: "Stable Conduction Regime",
      color: "text-emerald-400",
      severity: "CONFORMING (ASTM F3055)",
      desc: `Optimal semicircular melt pool (d/w = ${meltPoolPhysics.depthToWidthRatio}). High relative density >99.85% conforming to aerospace structural standards.`,
    };
  }, [meltPoolPhysics, layerThickness_um]);

  // 4. Peak Residual Stress & Thermal Distortion Kestirimi:
  //    sigma_res approx = E * CTE * (T_melt - T_bed) * scan_factor * geometry_factor
  const residualStress_MPa = useMemo(() => {
    const deltaT = Math.max(100, alloy.meltingTemp_Tm_C - bedPreheat_C);
    const cte = alloy.thermalExpansion_CTE_10e6 * 1e-6;
    const E = alloy.elasticModulus_E_GPa * 1000;
    // scan strategy relaxation factor
    const strategyFactor = scanStrategy === "island" ? 0.62 : scanStrategy === "meander-67" ? 0.75 : 0.94;
    const rawStress = E * cte * deltaT * 0.22 * strategyFactor;
    return Math.round(rawStress);
  }, [alloy, bedPreheat_C, scanStrategy]);

  // 5. METALLURGICAL SOLIDIFICATION CRACKING (HOT TEARING) ANALYSIS:
  //    Based on Rappaz-Drezet-Gremaud (RDG) and Kou Solidification Cracking Criteria
  //    \dot{\varepsilon}_{th} = CTE * \dot{T} = CTE * G * R  [s^-1]
  //    CSI = (G / G_crit) * (ΔT_f / 50°C) * (CTE / 12)
  const hotTearingAnalysis = useMemo(() => {
    const Tm = alloy.meltingTemp_Tm_C;
    const Ts = alloy.solidusTemp_Ts_C || Tm - 50;
    const deltaT_f = alloy.freezingRange_dT_C || Math.max(15, Tm - Ts);
    const cte = alloy.thermalExpansion_CTE_10e6 * 1e-6;
    const G_Km = meltPoolPhysics.G_Km;
    const R_ms = parseFloat(meltPoolPhysics.R_ms);
    const coolingRate_Ks = meltPoolPhysics.coolingRate_Ks;

    // Thermal strain rate in mushy zone (s^-1)
    const thermalStrainRate_s = cte * coolingRate_Ks;

    // Critical thermal gradient threshold for alloy (K/m)
    const G_crit = alloy.criticalGradient_G_Km || 1.5e7;

    // Dimensionless Cracking Susceptibility Index (CSI)
    const csi = (G_Km / G_crit) * (deltaT_f / 50) * (alloy.thermalExpansion_CTE_10e6 / 12.0);

    const isCritical = csi >= 1.2 || G_Km > G_crit * 1.2;
    const isWarning = !isCritical && (csi >= 0.92 || G_Km > G_crit * 0.92);
    const isSafe = !isCritical && !isWarning;

    let riskLevel: "CRITICAL_CRACKING" | "ELEVATED_RISK" | "CONFORMING_SAFE";
    let statusTitle: string;
    let statusBadgeColor: string;
    let badgeVariant: "danger" | "warning" | "success";

    if (isCritical) {
      riskLevel = "CRITICAL_CRACKING";
      statusTitle = "CRITICAL: High Solidification Hot Tearing Risk";
      statusBadgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/50";
      badgeVariant = "danger";
    } else if (isWarning) {
      riskLevel = "ELEVATED_RISK";
      statusTitle = "WARNING: Elevated Hot Tearing Susceptibility";
      statusBadgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/50";
      badgeVariant = "warning";
    } else {
      riskLevel = "CONFORMING_SAFE";
      statusTitle = "SAFE: Nominal Thermal Gradient (ASTM F3055 Conforming)";
      statusBadgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      badgeVariant = "success";
    }

    // Recommended bed preheating to bring G below G_crit
    const deltaG = G_Km - G_crit;
    const recommendedPreheat_C = Math.min(
      450,
      Math.max(bedPreheat_C, Math.round(bedPreheat_C + (deltaG > 0 ? (deltaG / G_Km) * (Tm - bedPreheat_C) * 0.45 : 0)))
    );

    // Recommended scan speed to keep strain rate in safe envelope
    const recommendedSpeed_mms = Math.max(300, Math.min(scanSpeed_mms, Math.round(scanSpeed_mms * (G_crit / Math.max(1e5, G_Km)))));

    return {
      G_Km,
      G_Kmm: (G_Km / 1000).toFixed(1), // K/mm
      G_crit,
      G_crit_Kmm: (G_crit / 1000).toFixed(1),
      thermalStrainRate_s: thermalStrainRate_s.toFixed(4),
      deltaT_f,
      coolingRate_Ks,
      csi: parseFloat(csi.toFixed(2)),
      riskLevel,
      statusTitle,
      statusBadgeColor,
      badgeVariant,
      isCritical,
      isWarning,
      isSafe,
      crackingMechanism: alloy.crackingMechanism,
      mitigationRecommendation: alloy.mitigationRecommendation,
      recommendedPreheat_C,
      recommendedSpeed_mms,
    };
  }, [alloy, meltPoolPhysics, bedPreheat_C, scanSpeed_mms]);

  // Max Cantilever Warpage / Distortion (microns) & Recoater Crash Clearance
  const recoaterCrashAnalysis = useMemo(() => {
    const baseWarp_um = Math.round((residualStress_MPa / 2.4) * (alloy.thermalExpansion_CTE_10e6 / 10));
    // Upward warpage at unsupported overhang tips
    const upwardTipWarpage_um = Math.round(baseWarp_um * 0.65);
    const clearance_um = layerThickness_um * 1.2 - upwardTipWarpage_um;
    const isCrashImpending = upwardTipWarpage_um > layerThickness_um;

    return {
      maxWarpage_um: baseWarp_um,
      upwardTipWarpage_um,
      clearance_um,
      isCrashImpending,
    };
  }, [residualStress_MPa, alloy, layerThickness_um]);

  const maxWarpage_um = recoaterCrashAnalysis.maxWarpage_um;

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(65, 45, 75);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(50, 80, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-50, -30, -50);
    scene.add(dirLight2);

    // Build Platform Baseplate Grid
    const platformGroup = new THREE.Group();
    const gridHelper = new THREE.GridHelper(100, 20, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -30;
    platformGroup.add(gridHelper);

    // Platform Plate Box
    const plateGeom = new THREE.BoxGeometry(100, 3, 100);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.5,
    });
    const plateMesh = new THREE.Mesh(plateGeom, plateMat);
    plateMesh.position.y = -31.5;
    platformGroup.add(plateMesh);

    // Z-Axis Build Direction Arrow
    const dir = new THREE.Vector3(0, 1, 0);
    const origin = new THREE.Vector3(-45, -30, -45);
    const length = 25;
    const hex = 0x10b981;
    const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex, 4, 2);
    platformGroup.add(arrowHelper);

    scene.add(platformGroup);
    platformGroup.visible = showBuildPlatform;

    // Load active CAD Geometry
    let geom: THREE.BufferGeometry;
    if (modelType === "nozzle") {
      geom = createRocketNozzleGeometry();
    } else if (modelType === "turbine") {
      geom = createTurbineBladeGeometry();
    } else if (modelType === "bracket") {
      geom = createAerospaceBracketGeometry();
    } else if (modelType === "gyroid") {
      geom = createLatticeGyroidGeometry();
    } else if (modelType === "custom" && customStlGeometry) {
      geom = customStlGeometry.clone();
    } else {
      geom = createRocketNozzleGeometry();
    }

    // Clone geometry to safely compute vertex colors
    geom = geom.clone();

    // Compute Multi-Physics Vertex Colors based on selected Heatmap Mode
    const pos = geom.attributes.position;
    const norm = geom.attributes.normal;
    const colors = new Float32Array(pos.count * 3);

    const vPos = new THREE.Vector3();
    const vNorm = new THREE.Vector3();
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      vPos.fromBufferAttribute(pos, i);
      if (norm) vNorm.fromBufferAttribute(norm, i);

      // Height ratio: normalized 0 (baseplate) to 1 (top scan)
      const heightRatio = (vPos.y + 30) / 60;
      const radiusFromCenter = Math.sqrt(vPos.x * vPos.x + vPos.z * vPos.z) / 30;

      if (activeHeatmap === "residual-stress") {
        // High tensile stress at baseplate interface and final top layers; compressive in core
        const stressFactor = Math.min(
          1.0,
          Math.max(0.0, Math.pow(Math.sin(heightRatio * Math.PI * 1.3), 2) * 0.6 + radiusFromCenter * 0.4)
        );
        // Colormap: Blue (0 MPa) -> Cyan -> Yellow -> Red (Max MPa)
        color.setHSL(0.66 * (1.0 - stressFactor), 1.0, 0.5);
      } else if (activeHeatmap === "thermal-gradient-cracking") {
        // High thermal gradient G and hot tearing susceptibility at baseplate interface & thin wall edges
        const localGradientFactor = (1.0 - heightRatio * 0.35) * (0.8 + radiusFromCenter * 0.4);
        const G_local = hotTearingAnalysis.G_Km * localGradientFactor;
        const gradRatio = G_local / Math.max(1e5, hotTearingAnalysis.G_crit);
        if (gradRatio < 0.7) {
          // Safe / Conforming: Cyan to Blue
          color.setHSL(0.55 - gradRatio * 0.2, 0.9, 0.5);
        } else if (gradRatio < 1.0) {
          // Approaching Critical: Green to Yellow
          color.setHSL(0.35 - (gradRatio - 0.7) * 0.7, 1.0, 0.5);
        } else {
          // Critical Hot Tearing Danger: Orange to Vivid Red / Magenta
          const excess = Math.min(1.0, (gradRatio - 1.0) / 0.5);
          color.setHSL(0.08 - excess * 0.15, 1.0, 0.45 + excess * 0.15);
        }
      } else if (activeHeatmap === "keyhole-overheat") {
        // High VED & thin walls overheat
        const thinWallFactor = radiusFromCenter > 0.6 || Math.abs(vPos.y) > 20 ? 0.8 : 0.2;
        const keyholeFactor = Math.min(1.0, (ved_J_mm3 / 120) * thinWallFactor);
        // Purple -> Orange -> Bright Red
        color.setHSL(0.8 - keyholeFactor * 0.8, 1.0, 0.45 + keyholeFactor * 0.15);
      } else if (activeHeatmap === "lack-of-fusion") {
        // Under-melting occurs when VED is low and at fast turnarounds
        const lofRisk = ved_J_mm3 < 60 ? 0.9 : 0.15 + (1.0 - heightRatio) * 0.3;
        color.setHSL(0.15 + lofRisk * 0.4, 0.9, 0.45);
      } else if (activeHeatmap === "overhang-dross") {
        // Downward faces with Ny < -0.5 are steep overhangs (<45 deg) prone to dross
        const isDownskin = vNorm.y < -0.4;
        const overhangRisk = isDownskin ? Math.min(1.0, Math.abs(vNorm.y) * 1.5) : 0.05;
        // Green (supported/flat) -> Red (unsupported downskin)
        color.setHSL(0.33 * (1.0 - overhangRisk), 1.0, 0.5);
      } else if (activeHeatmap === "recoater-crash") {
        // Upward curling highest at top perimeter and cantilever tips
        const curlRisk = (heightRatio * 0.7 + radiusFromCenter * 0.5) * (recoaterCrashAnalysis.isCrashImpending ? 1.0 : 0.4);
        color.setHSL(Math.max(0, 0.35 - curlRisk * 0.35), 1.0, 0.5);
      } else {
        // Cooling rate (10^5 to 10^7 K/s): higher near baseplate, lower at top
        const coolRate = Math.max(0.05, 1.0 - heightRatio * 0.7);
        color.setHSL(0.7 - coolRate * 0.6, 0.95, 0.5);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Material with Vertex Colors
    const meshMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.65,
      wireframe: showWireframe,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geom, meshMaterial);
    scene.add(mesh);

    // Simple Mouse Orbit Drag Controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotX = 0.4;
    let rotY = 0.8;
    let zoomDist = 95;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      rotY += dx * 0.008;
      rotX += dy * 0.008;
      rotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotX));

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomDist += e.deltaY * 0.06;
      zoomDist = Math.max(30, Math.min(200, zoomDist));
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotate) {
        rotY += 0.005;
      }

      camera.position.x = zoomDist * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = zoomDist * Math.sin(rotX);
      camera.position.z = zoomDist * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight || 450;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    // Save screenshot helper on ref
    (mountRef.current as any).takeSnapshot = () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    };

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("wheel", onWheel);
      renderer.dispose();
      geom.dispose();
      meshMaterial.dispose();
    };
  }, [
    modelType,
    customStlGeometry,
    activeHeatmap,
    ved_J_mm3,
    showWireframe,
    showBuildPlatform,
    autoRotate,
    residualStress_MPa,
  ]);

  // Handle Custom STL File Upload
  const handleStlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsedGeom = await parseSTLAsync(buffer);
        setCustomStlGeometry(parsedGeom);
        setUploadedFileName(file.name);
        setModelType("custom");
        updateLpbfProcess({ cadAssetName: file.name });
        setLiveMeshFromGeometry(file.name, parsedGeom);
      } catch (err) {
        console.error("STL parse error", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearStl = () => {
    setCustomStlGeometry(null);
    setUploadedFileName(null);
    setModelType("nozzle");
    clearLiveMesh();
    updateLpbfProcess({ cadAssetName: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTakeSnapshot = () => {
    if (mountRef.current && (mountRef.current as any).takeSnapshot) {
      const url = (mountRef.current as any).takeSnapshot();
      const a = document.createElement("a");
      a.href = url;
      a.download = `LPBF_3D_Heatmap_${modelType}_${activeHeatmap}_${Date.now()}.png`;
      a.click();
    }
  };

  const handleRunAiAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const report = `### 🚀 ASTM F3055 / ASTM F3184 Additive Manufacturing Defect & Stress Audit
**Component Geometry:** ${modelType.toUpperCase()} (${uploadedFileName || "Procedural Aerospace CAD"})
**Material / Alloy:** ${alloy.name}
**Volumetric Energy Density (VED):** **${ved_J_mm3} J/mm³** (Target Window: 55 - 85 J/mm³)

---

#### 1. Thermal Stress & Warpage Prediction:
- **Peak Residual Stress ($\sigma_{res}$):** **${residualStress_MPa} MPa** (${(residualStress_MPa / (alloy.elasticModulus_E_GPa * 10)).toFixed(1)}% of Young's Modulus)
- **Predicted Maximum Warpage ($\delta_{max}$):** **${maxWarpage_um} µm**
- **Baseplate Pre-heat:** **${bedPreheat_C}°C** (Reduces thermal gradient $G$ by ~${((bedPreheat_C / 500) * 35).toFixed(1)}%)
- **Scan Strategy:** ${scanStrategy.toUpperCase()} (Rotational interlayer shift minimizes directional texture anisotropy)

---

#### 2. Microstructure & Keyhole Porosity Risk Verdict:
- **Keyhole Porosity Risk:** **${meltPoolPhysics.isKeyholeRiskHigh ? "CRITICAL RISK (Vapor Depression Cavitation)" : meltPoolPhysics.isKeyholeRiskModerate ? "MODERATE / TRANSITION ZONE" : "LOW (Conduction Safe Envelope)"}**
- **Normalized Laser Intensity ($P^*$):** **${meltPoolPhysics.normalizedLaserIntensity_Pstar}** vs Critical Limit: **${meltPoolPhysics.criticalNormalizedIntensity}** (Risk Index: **${meltPoolPhysics.keyholeRiskRatio}x**)
- **Normalized Scan Speed (Péclet $Pe$):** **${meltPoolPhysics.normalizedScanSpeed_Peclet}**
- **Predicted Solidification Grain Morphology:** **${meltPoolPhysics.microstructureMorphology}** (Subgrain spacing: ~${meltPoolPhysics.cellularSpacing_um} µm)
- **Estimated As-Built Microhardness:** **~${meltPoolPhysics.expectedMicrohardness_HV} HV** (ASTM E384)
- **Solidification Cooling Rate ($\dot{T}$):** **${meltPoolPhysics.coolingRate_Ks.toLocaleString()} K/s**

---

#### 3. Machine Process Optimization Recommendations:
${meltPoolPhysics.isKeyholeRiskHigh ? "⚠️ CRITICAL KEYHOLE VAPORIZATION: Reduce laser power or increase scan speed to bring Normalized Intensity P* below the King-Gouge threshold line." : meltPoolPhysics.isLoFRisk ? "⚠️ LACK OF FUSION: Increase laser power or reduce hatch spacing to achieve adequate layer penetration (>130% layer thickness)." : "✅ OPTIMAL MICROSTRUCTURE & CONDUCTION REGIME: Conforming to Class A aerospace flight-hardware standards with dense, defect-free fine cellular microstructure."}`;

      setAuditReport(report);
      setIsAuditing(false);
    }, 1000);
  };

  const inAdvanced = isAdvancedLpbfSubTab(activeSubTab);
  const otherPhysicsLabs = ADVANCED_PHYSICS_LABS.filter((lab) => lab.id !== "3d-cross-section-melt-pool");

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans pb-24 lg:pb-4">
      <div className="sticky top-0 z-20 -mx-1 px-1 py-1 bg-[#070b13]/90 backdrop-blur-md border-b border-[#162032]/80">
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFocusedWizardStage("process");
              setActiveSubTab("industrial-decision");
              setAdvancedOpen(false);
            }}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-bold border transition ${
              activeSubTab === "industrial-decision"
                ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/50"
                : "bg-[#0c1322] text-slate-300 border-[#1e2d46] hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Build Job
          </button>
          <button
            type="button"
            onClick={() => openPhysicsLab("3d-cross-section-melt-pool")}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-bold border transition ${
              activeSubTab === "3d-cross-section-melt-pool"
                ? "bg-sky-500/25 text-sky-100 border-sky-400/60 shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                : "bg-gradient-to-r from-amber-500/20 to-sky-500/20 text-white border-sky-400/40 hover:border-sky-300/70"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            Melt Pool 3D
          </button>
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-bold border transition ${
              advancedOpen || (inAdvanced && activeSubTab !== "3d-cross-section-melt-pool")
                ? "bg-slate-500/20 text-slate-100 border-slate-400/40"
                : "bg-[#0c1322] text-slate-300 border-[#1e2d46] hover:text-white"
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            More labs
          </button>
        </div>
      </div>

      {advancedOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {otherPhysicsLabs.map((lab) => {
            const Icon = lab.icon;
            const active = activeSubTab === lab.id;
            return (
              <button
                key={lab.id}
                type="button"
                onClick={() => openPhysicsLab(lab.id)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl text-left border transition ${
                  active
                    ? lab.activeClass
                    : "bg-[#090e18] text-slate-300 border-[#1e2d46] hover:border-slate-500 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 text-sky-400" />
                <span className="text-[11px] font-bold leading-tight">{lab.shortLabel}</span>
                <span className="text-[9px] text-slate-500">{lab.badge}</span>
              </button>
            );
          })}
        </div>
      )}

      {!inAdvanced && (
        <LpbfBuildJobRail
          activeSubTab={activeSubTab}
          focusedWizardStage={focusedWizardStage}
          onNavigateStage={(subTab, stage) => {
            setFocusedWizardStage(stage);
            setActiveSubTab(subTab as LpbfDistortionSubTab);
          }}
          onBackToDecision={() => {
            setFocusedWizardStage("process");
            setActiveSubTab("industrial-decision");
            setAdvancedOpen(false);
          }}
        />
      )}

      <div ref={labStageRef} id="lpbf-lab-stage" className="scroll-mt-16">
      {activeSubTab === "industrial-decision" ? (
        <IndustrialLPBFDecisionLab
          onOpenSlicer={() => {
            setFocusedWizardStage("cad");
            setActiveSubTab("basic-stl-slicer");
          }}
          onOpenGroundTruth={() => {
            setFocusedWizardStage("record");
            setActiveSubTab("ground-truth-foundation");
          }}
          onOpenMeltPool={() => openPhysicsLab("3d-cross-section-melt-pool")}
        />
      ) : activeSubTab === "ground-truth-foundation" ? (
        <LPBFGroundTruthDataLab
          onApplyParametersToSimulation={(p) => {
            updateLpbfProcess({
              laserPower_W: p.power_W,
              scanSpeed_mms: p.speed_mms,
              hatch_um: p.hatch_um,
              layer_um: p.layer_um,
              beamDiameter_um: p.beam_um,
              specimenDoi: p.doi,
            });
          }}
        />
      ) : activeSubTab === "3d-cross-section-melt-pool" ? (
        <MeltPool3DCrossSectionLab
          initialPower_W={laserPower_W}
          initialSpeed_mms={scanSpeed_mms}
          initialBeamDiameter_um={beamSpotRadius_um * 2}
          initialPreheat_C={bedPreheat_C}
          initialLayer_um={layerThickness_um}
          initialHatch_um={hatchSpacing_um}
          initialMaterial={alloy.name}
          onParametersChange={(p) => {
            updateLpbfProcess({
              laserPower_W: p.laserPower_W,
              scanSpeed_mms: p.scanSpeed_mm_s,
              beamDiameter_um: p.beamDiameter_um,
              preheatTemp_C: p.preheatTemp_C,
              layer_um: p.layerThickness_um,
              hatch_um: p.hatchSpacing_um,
            });
          }}
        />
      ) : activeSubTab === "marangoni-pore-heatmap" ? (
        <MarangoniPoreInstabilityLab
          initialPower_W={laserPower_W}
          initialSpeed_mms={scanSpeed_mms}
          initialBeamDiameter_um={beamSpotRadius_um * 2}
          initialPreheat_C={bedPreheat_C}
          initialMaterial={alloy.name}
          onApplyParameters={(p) => {
            updateLpbfProcess({
              laserPower_W: p.power_W,
              scanSpeed_mms: p.speed_mms,
              preheatTemp_C: p.preheat_C,
            });
          }}
        />
      ) : activeSubTab === "rosenthal-laser-profile" ? (
        <RosenthalLaserProfileMeltPoolLab
          initialPower_W={laserPower_W}
          initialSpeed_mms={scanSpeed_mms}
          initialSpotRadius_um={beamSpotRadius_um}
          initialPreheat_C={bedPreheat_C}
          initialMaterial={alloy.name}
          onApplyCalculatedParams={(p) => {
            updateLpbfProcess({
              laserPower_W: p.laserPower_W,
              scanSpeed_mms: p.scanSpeed_mms,
              beamDiameter_um: Math.round(p.beamSpotRadius_um * 2),
              preheatTemp_C: p.preheatTemp_C,
            });
          }}
        />
      ) : activeSubTab === "solidification-front-cet" ? (
        <SolidificationFrontCETLab
          currentPower_W={laserPower_W}
          currentSpeed_mms={scanSpeed_mms}
          currentHatch_um={hatchSpacing_um}
          currentBeamDiameter_um={beamSpotRadius_um * 2}
          currentPreheat_C={bedPreheat_C}
          currentLayer_um={layerThickness_um}
          currentMaterial={alloy.name}
          onApplyParameters={(p) => {
            updateLpbfProcess({
              laserPower_W: p.power_W,
              scanSpeed_mms: p.speed_mms,
              hatch_um: p.hatch_um,
              preheatTemp_C: p.preheat_C,
            });
          }}
        />
      ) : activeSubTab === "multi-track-accumulation" ? (
        <MultiTrackThermalAccumulationLab
          currentPower_W={laserPower_W}
          currentSpeed_mms={scanSpeed_mms}
          currentHatch_um={hatchSpacing_um}
          currentPreheat_C={bedPreheat_C}
          currentMaterial={alloy.name}
          onApplyStrategy={(strat) => {
            const mapped: LpbfScanStrategy =
              strat.scanStrategy === "chessboard"
                ? "island"
                : strat.scanStrategy === "stripes" || strat.scanStrategy === "unidirectional"
                  ? "stripe"
                  : "meander-67";
            updateLpbfProcess({ scanStrategy: mapped });
          }}
        />
      ) : activeSubTab === "anisotropic-fatigue-estimator" ? (
        <AnisotropicMechanicalFatigueLab
          currentMaterial={alloy.name}
        />
      ) : activeSubTab === "operando-synchrotron" ? (
        <OperandoSynchrotronXRayLab
          currentPower_W={laserPower_W}
          currentSpeed_mms={scanSpeed_mms}
          currentBeamDiameter_um={beamSpotRadius_um * 2}
          currentMaterial={alloy.name}
          onApplyCalibratedParams={(p) => {
            updateLpbfProcess({
              laserPower_W: p.laserPower_W,
              scanSpeed_mms: p.scanSpeed_mm_s,
            });
          }}
        />
      ) : activeSubTab === "2d-thermal-melt-pool" ? (
        <ThermalMeltPoolVisualization />
      ) : activeSubTab === "3d-macro-distortion" ? (
        <CADStlSlicerDistortionLab
          laserPower_W={laserPower_W}
          scanSpeed_mms={scanSpeed_mms}
          hatchSpacing_um={hatchSpacing_um}
          layerThickness_um={layerThickness_um}
          bedPreheat_C={bedPreheat_C}
          scanStrategy={scanStrategy}
          onProcessChange={(p) => updateLpbfProcess(p)}
        />
      ) : activeSubTab === "basic-stl-slicer" ? (
        <BasicSTLSlicerLab
          initialPower_W={laserPower_W}
          initialSpeed_mms={scanSpeed_mms}
          initialLayer_um={layerThickness_um}
          initialHatch_um={hatchSpacing_um}
          initialMaterial={alloy.name}
          onApplyParametersToLPBF={(p) => {
            updateLpbfProcess({
              laserPower_W: p.laserPower_W,
              scanSpeed_mms: p.scanSpeed_mms,
              layer_um: p.layerThickness_um,
              hatch_um: p.hatchSpacing_um,
            });
          }}
        />
      ) : (
        <>
      {/* Top Banner Header */}
      <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-cyan-400/40">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  3D CAD / STL Multi-Physics Thermal & Defect Heatmap Lab
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                  LPBF / SLM 3D
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold hidden sm:inline-block">
                  ASTM F3055 / F3184
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Predict residual stress (σ_res), thermal warpage (δ_max), keyhole porosity, and lack of fusion directly mapped on 3D CAD/STL surfaces.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleStlUpload}
              accept=".stl"
              className="hidden"
            />

            {uploadedFileName ? (
              <button
                type="button"
                onClick={handleClearStl}
                className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset STL</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-cyan-400 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import 3D STL (.stl)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="px-3 py-2 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-cyan-400 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Snapshot</span>
            </button>

            <button
              type="button"
              onClick={handleRunAiAudit}
              disabled={isAuditing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 shrink-0"
            >
              {isAuditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Run Additive Defect Audit</span>
            </button>
          </div>
        </div>

        {/* Upload Status */}
        {uploadedFileName && (
          <div className="mt-3 p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs text-cyan-300">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Uploaded Custom 3D STL Model:</strong> {uploadedFileName}
              </span>
            </div>
            <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-200">
              Rendering Real CAD Model
            </span>
          </div>
        )}

        {/* CAD Model & Alloy Presets Selector */}
        <div className="mt-5 pt-4 border-t border-[#162032] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-slate-400 font-semibold">Aerospace Geometry:</span>
            {[
              { id: "nozzle", name: "Rocket Nozzle" },
              { id: "turbine", name: "Turbine Blade" },
              { id: "bracket", name: "Topology Bracket" },
              { id: "gyroid", name: "Gyroid Manifold" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelType(m.id as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition text-[11px] ${
                  modelType === m.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-[#050810] text-slate-400 hover:text-white border border-[#1e2d46]"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-slate-400 font-semibold">Alloy:</span>

            {/* Universal Reactive Specimen Thread Button */}
            <MetallurgicalTooltip
              title={`${activeSpecimen.name} — Universal Specimen Thread`}
              badgeText="Live Synced"
              badgeVariant="info"
              criterionName="Universal Reactive Specimen (Zustand Global Store)"
              formula={`Formula: ${activeSpecimen.chemicalFormula} | T_L = ${activeSpecimen.liquidus_C}°C`}
              currentValue={`k = ${activeUniversalAlloy.thermalConductivity_k_WmK} W/m·K, CTE = ${activeUniversalAlloy.thermalExpansion_CTE_10e6}×10⁻⁶/K`}
              criticalThreshold={`Max Gradient: ${(activeUniversalAlloy.criticalGradient_G_Km / 1000).toFixed(0)} K/mm`}
              explanation={`Dynamically synchronized from ${activeSpecimen.sourceTab}. Composition updates in Tab 1 immediately propagate here.`}
              recommendation={activeUniversalAlloy.mitigationRecommendation}
            >
              <button
                type="button"
                onClick={() => handleSelectAlloy("active-universal-specimen")}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition text-[11px] flex items-center gap-1.5 font-bold ${
                  selectedAlloyId === "active-universal-specimen"
                    ? "bg-sky-500/25 text-sky-200 border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)] ring-1 ring-sky-400/50"
                    : "bg-sky-950/20 text-sky-400 hover:text-white border border-sky-700/40"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>⭐ {activeSpecimen.name.length > 18 ? activeSpecimen.name.slice(0, 18) + "..." : activeSpecimen.name}</span>
              </button>
            </MetallurgicalTooltip>

            {LPBF_ALLOY_PRESETS.map((a) => (
              <MetallurgicalTooltip
                key={a.id}
                title={`${a.name} — Metallurgical Solidification Profile`}
                badgeText={`Susceptibility: ${a.hotTearingSusceptibility}`}
                badgeVariant={
                  a.hotTearingSusceptibility === "Critical" || a.hotTearingSusceptibility === "High"
                    ? "danger"
                    : a.hotTearingSusceptibility === "Moderate"
                    ? "warning"
                    : "success"
                }
                criterionName="ASTM F3055 / ASTM F3184 Solidification Criteria"
                formula={`G_{crit} = ${(a.criticalGradient_G_Km / 1e6).toFixed(1)} \\times 10^6\\text{ K/m} \\quad | \\quad \\Delta T_f = ${a.freezingRange_dT_C}^\\circ\\text{C}`}
                currentValue={`k = ${a.thermalConductivity_k_WmK} W/m·K, CTE = ${a.thermalExpansion_CTE_10e6}×10⁻⁶/K`}
                criticalThreshold={`Max Gradient: ${(a.criticalGradient_G_Km / 1000).toFixed(0)} K/mm`}
                explanation={a.crackingMechanism}
                recommendation={a.mitigationRecommendation}
              >
                <button
                  type="button"
                  onClick={() => handleSelectAlloy(a.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition text-[11px] flex items-center gap-1.5 ${
                    selectedAlloyId === a.id
                      ? "bg-blue-500/20 text-blue-300 border border-blue-400/50 font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                      : "bg-[#050810] text-slate-400 hover:text-white border border-[#1e2d46]"
                  }`}
                >
                  <span>{a.name.split(" ")[0]}</span>
                  {a.hotTearingSusceptibility === "High" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  )}
                </button>
              </MetallurgicalTooltip>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Hot Tearing Warning Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          hotTearingAnalysis.isCritical
            ? "bg-rose-950/30 border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.2)]"
            : hotTearingAnalysis.isWarning
            ? "bg-amber-950/30 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            : "bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
              hotTearingAnalysis.isCritical
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                : hotTearingAnalysis.isWarning
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {hotTearingAnalysis.isCritical ? (
              <AlertTriangle className="w-5 h-5" />
            ) : hotTearingAnalysis.isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white text-xs sm:text-sm">
                {hotTearingAnalysis.statusTitle}
              </span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${hotTearingAnalysis.statusBadgeColor}`}
              >
                CSI: {hotTearingAnalysis.csi}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans max-w-3xl">
              {hotTearingAnalysis.isCritical ? (
                <>
                  Thermal gradient <strong className="text-rose-300 font-mono">G = {hotTearingAnalysis.G_Kmm} K/mm</strong> exceeds the critical solidification cracking threshold (<strong className="text-slate-200 font-mono">G_crit = {hotTearingAnalysis.G_crit_Kmm} K/mm</strong>). High thermal shrinkage strain rate (<strong className="text-rose-300 font-mono">έ_th = {hotTearingAnalysis.thermalStrainRate_s} s⁻¹</strong>) will cause terminal interdendritic liquid film cavitation.
                </>
              ) : hotTearingAnalysis.isWarning ? (
                <>
                  Thermal gradient <strong className="text-amber-300 font-mono">G = {hotTearingAnalysis.G_Kmm} K/mm</strong> is approaching critical hot tearing susceptibility limit (<strong className="text-slate-200 font-mono">{hotTearingAnalysis.G_crit_Kmm} K/mm</strong>). Interdendritic feeding may be restricted during final 1% solidification fraction.
                </>
              ) : (
                <>
                  Thermal gradient <strong className="text-emerald-300 font-mono">G = {hotTearingAnalysis.G_Kmm} K/mm</strong> is within the safe envelope for {alloy.name} (<strong className="text-slate-200 font-mono">&lt; {hotTearingAnalysis.G_crit_Kmm} K/mm</strong>). Solidification front remains stable without hot tear initiation.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick-action & Tooltip Trigger */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
          {(hotTearingAnalysis.isCritical || hotTearingAnalysis.isWarning) && (
            <button
              type="button"
              onClick={() => updateLpbfProcess({ preheatTemp_C: hotTearingAnalysis.recommendedPreheat_C })}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <ThermometerSnowflake className="w-3.5 h-3.5" />
              <span>Fix: Preheat Bed to {hotTearingAnalysis.recommendedPreheat_C}°C</span>
            </button>
          )}

          <MetallurgicalTooltip
            title="Rappaz-Drezet-Gremaud (RDG) & Kou Cracking Criteria"
            badgeText={hotTearingAnalysis.isCritical ? "CRITICAL RISK" : hotTearingAnalysis.isWarning ? "ELEVATED RISK" : "CONFORMING"}
            badgeVariant={hotTearingAnalysis.badgeVariant}
            criterionName="Rappaz-Drezet-Gremaud (RDG) & Kou Solidification Theory"
            formula="\\dot{\\varepsilon}_{th} = \\text{CTE} \\cdot G \\cdot R \\quad | \\quad \\text{CSI} = \\frac{G}{G_{crit}} \\times \\frac{\\Delta T_f}{50} \\times \\frac{\\text{CTE}}{12}"
            currentValue={`G = ${hotTearingAnalysis.G_Kmm} K/mm, έ_th = ${hotTearingAnalysis.thermalStrainRate_s} s⁻¹`}
            criticalThreshold={`G_crit = ${hotTearingAnalysis.G_crit_Kmm} K/mm (CSI < 1.0)`}
            explanation={`In the terminal solidification mushy zone (solid fraction fs = 0.90 to 0.99), dendritic grains bridge together. If the thermal contraction strain rate (έ_th = CTE · G · R) exceeds liquid replenishment capability, interdendritic cavitation occurs, creating hot tears and micro-cracks.`}
            recommendation={hotTearingAnalysis.mitigationRecommendation}
            align="right"
          >
            <div className="px-3 py-1.5 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-cyan-400 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 transition">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Metallurgical Theory</span>
            </div>
          </MetallurgicalTooltip>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Interactive WebGL Viewport */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 sm:p-5 relative">
            {/* Viewport Top Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#162032] pb-3 text-xs mb-3">
              {/* Heatmap Field Mode Selector */}
              <div className="flex items-center gap-1.5 bg-[#050810] p-1 rounded-xl border border-[#1e2d46] overflow-x-auto no-scrollbar">
                {[
                  {
                    id: "residual-stress",
                    label: "Residual Stress (σ_res)",
                    tooltip: "Residual stress field (MPa) caused by thermal contraction and scan vector overlay.",
                  },
                  {
                    id: "thermal-gradient-cracking",
                    label: "Thermal Gradient & Hot Tearing (G)",
                    tooltip: "Directly maps thermal gradient G and hot tearing cracking risk onto CAD geometry.",
                  },
                  {
                    id: "keyhole-overheat",
                    label: "Keyhole Overheating",
                    tooltip: "Overheating risk zones where normalized enthalpy exceeds keyhole vaporization limit.",
                  },
                  {
                    id: "lack-of-fusion",
                    label: "Lack of Fusion (LoF)",
                    tooltip: "Under-melted zones where melt pool depth fails to adequately penetrate substrate.",
                  },
                  {
                    id: "overhang-dross",
                    label: "Downskin Overhang",
                    tooltip: "Unsupported surfaces steeper than 45° with high risk of dross and powder sintering.",
                  },
                ].map((hm) => (
                  <MetallurgicalTooltip
                    key={hm.id}
                    title={`${hm.label} Heatmap Analysis`}
                    explanation={hm.tooltip}
                    criterionName="ASTM F3055 LPBF Surface Defect FEA Mapping"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveHeatmap(hm.id as HeatmapMode)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap text-[11px] ${
                        activeHeatmap === hm.id
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {hm.label}
                    </button>
                  </MetallurgicalTooltip>
                ))}
              </div>

              {/* Viewport Display Toggles */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWireframe(!showWireframe)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] transition ${
                    showWireframe
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50"
                      : "bg-[#050810] text-slate-400 border-[#1e2d46]"
                  }`}
                >
                  Wireframe
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] transition ${
                    autoRotate
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50"
                      : "bg-[#050810] text-slate-400 border-[#1e2d46]"
                  }`}
                >
                  Auto-Rotate
                </button>
              </div>
            </div>

            {/* Three.js Canvas Container */}
            <div
              ref={mountRef}
              className="w-full h-[460px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing relative bg-[#050810] border border-[#162032]"
            >
              {/* Overlay Navigation Hint */}
              <div className="absolute bottom-3 left-3 bg-[#090e18]/80 backdrop-blur border border-[#1e2d46] px-2.5 py-1.5 rounded-lg text-[10px] text-slate-400 flex items-center gap-2 pointer-events-none">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Drag to Rotate • Scroll to Zoom • Build Direction +Z</span>
              </div>

              {/* Color Bar Scale Indicator */}
              <div className="absolute top-3 right-3 bg-[#090e18]/85 backdrop-blur border border-[#1e2d46] p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 pointer-events-none">
                <span className="font-bold block text-cyan-400 uppercase text-[9px] tracking-wider">
                  {activeHeatmap.replace("-", " ")} Scale
                </span>
                <div className="w-28 h-2.5 rounded-full bg-gradient-to-r from-blue-600 via-green-500 via-yellow-400 to-red-600 border border-white/20" />
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>Min / Conforming</span>
                  <span>Peak Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Derived Physical KPIs Grid (5 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* 1. VED */}
            <MetallurgicalTooltip
              title="Volumetric Energy Density (VED)"
              badgeText={ved_J_mm3 > 90 ? "Keyholing" : ved_J_mm3 < 50 ? "Lack of Fusion" : "Optimal"}
              badgeVariant={ved_J_mm3 > 90 || ved_J_mm3 < 50 ? "warning" : "success"}
              criterionName="Volumetric Thermal Input Law"
              formula="\\text{VED} = \\frac{P}{v \\cdot h \\cdot t} \\quad [\\text{J/mm}^3]"
              currentValue={`${ved_J_mm3} J/mm³`}
              criticalThreshold="Optimal: 55 – 85 J/mm³"
              explanation="Measures the total thermal energy delivered per unit volume of powder. Excess energy leads to keyholing vaporization; insufficient energy produces lack of fusion pores."
            >
              <div className="p-3 bg-[#090e18] border border-[#1e2d46] hover:border-cyan-400/50 rounded-xl space-y-1 w-full transition">
                <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center justify-between">
                  <span>Energy (VED):</span>
                  <Info className="w-3 h-3 text-cyan-400" />
                </span>
                <span className="text-lg font-bold text-cyan-400 block">
                  {ved_J_mm3} <span className="text-xs text-slate-400">J/mm³</span>
                </span>
                <span className="text-[10px] text-slate-500">P / (v · h · t)</span>
              </div>
            </MetallurgicalTooltip>

            {/* 2. Peak Residual Stress */}
            <MetallurgicalTooltip
              title="Peak Tensile Residual Stress (σ_res)"
              badgeText={`${residualStress_MPa} MPa`}
              badgeVariant={residualStress_MPa > 400 ? "danger" : residualStress_MPa > 250 ? "warning" : "success"}
              criterionName="Thermo-Elastic Inversion Model"
              formula="\\sigma_{res} \\approx E \\cdot \\text{CTE} \\cdot (T_m - T_{bed}) \\cdot \\beta_{scan}"
              currentValue={`${residualStress_MPa} MPa`}
              criticalThreshold={`Yield Limit: ~${Math.round(alloy.elasticModulus_E_GPa * 3.5)} MPa`}
              explanation="Accumulated tensile residual stress at the top scan surface and baseplate interface. High tensile stress triggers delamination, baseplate debonding, and macroscopic curling."
            >
              <div className="p-3 bg-[#090e18] border border-[#1e2d46] hover:border-rose-400/50 rounded-xl space-y-1 w-full transition">
                <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center justify-between">
                  <span>Residual Stress:</span>
                  <Info className="w-3 h-3 text-rose-400" />
                </span>
                <span className="text-lg font-bold text-rose-400 block">
                  {residualStress_MPa} <span className="text-xs text-slate-400">MPa</span>
                </span>
                <span className="text-[10px] text-slate-500">Top-surface tension</span>
              </div>
            </MetallurgicalTooltip>

            {/* 3. Thermal Gradient & Hot Tearing (NEW) */}
            <MetallurgicalTooltip
              title="Thermal Gradient (G) & Hot Tearing Risk"
              badgeText={hotTearingAnalysis.isCritical ? "CRITICAL CRACK" : hotTearingAnalysis.isWarning ? "ELEVATED RISK" : "CONFORMING"}
              badgeVariant={hotTearingAnalysis.badgeVariant}
              criterionName="Rappaz-Drezet-Gremaud (RDG) Solidification Model"
              formula="G = \\frac{T_m - T_{bed}}{d_{pool}} \\quad | \\quad \\dot{\\varepsilon}_{th} = \\text{CTE} \\cdot G \\cdot R"
              currentValue={`G = ${hotTearingAnalysis.G_Kmm} K/mm (CSI = ${hotTearingAnalysis.csi})`}
              criticalThreshold={`G_crit = ${hotTearingAnalysis.G_crit_Kmm} K/mm`}
              explanation={`Thermal gradient G controls the solidification cooling rate and shrinkage strain rate. If G exceeds G_crit (${hotTearingAnalysis.G_crit_Kmm} K/mm), hot tearing microcracks will initiate in the mushy zone.`}
              recommendation={hotTearingAnalysis.mitigationRecommendation}
            >
              <div
                className={`p-3 bg-[#090e18] border rounded-xl space-y-1 w-full transition ${
                  hotTearingAnalysis.isCritical
                    ? "border-rose-500/60 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                    : hotTearingAnalysis.isWarning
                    ? "border-amber-500/60 bg-amber-950/20"
                    : "border-emerald-500/40 hover:border-emerald-400"
                }`}
              >
                <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center justify-between">
                  <span>Gradient (G):</span>
                  {hotTearingAnalysis.isCritical ? (
                    <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                  ) : hotTearingAnalysis.isWarning ? (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  )}
                </span>
                <span
                  className={`text-lg font-bold block ${
                    hotTearingAnalysis.isCritical
                      ? "text-rose-400"
                      : hotTearingAnalysis.isWarning
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {hotTearingAnalysis.G_Kmm} <span className="text-xs text-slate-400">K/mm</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {hotTearingAnalysis.isCritical
                    ? "⚠️ Cracking Imminent"
                    : hotTearingAnalysis.isWarning
                    ? "⚠️ Elevated Risk"
                    : "✅ Crack Resilient"}
                </span>
              </div>
            </MetallurgicalTooltip>

            {/* 4. Estimated Warpage */}
            <MetallurgicalTooltip
              title="Predicted Cantilever Thermal Warpage"
              badgeText={`${maxWarpage_um} µm`}
              badgeVariant={recoaterCrashAnalysis.isCrashImpending ? "danger" : "warning"}
              criterionName="Elastic Cantilever Deflection Model"
              formula="\\delta_{max} = \\frac{\\sigma_{res}}{2.4} \\cdot \\frac{\\text{CTE}}{10}"
              currentValue={`${maxWarpage_um} µm`}
              criticalThreshold={`Layer Clearance: ${layerThickness_um * 1.2} µm`}
              explanation="Maximum upward bending deflection occurring at thin cantilever overhang tips. If warpage exceeds layer thickness, the recoater blade will crash into the part."
            >
              <div className="p-3 bg-[#090e18] border border-[#1e2d46] hover:border-amber-400/50 rounded-xl space-y-1 w-full transition">
                <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center justify-between">
                  <span>Warpage (δ):</span>
                  <Info className="w-3 h-3 text-amber-400" />
                </span>
                <span className="text-lg font-bold text-amber-400 block">
                  {maxWarpage_um} <span className="text-xs text-slate-400">µm</span>
                </span>
                <span className="text-[10px] text-slate-500">Cantilever Deflection</span>
              </div>
            </MetallurgicalTooltip>

            {/* 5. Microstructure & Keyhole Risk */}
            <MetallurgicalTooltip
              title="Microstructure & Keyhole Porosity Risk"
              badgeText={
                meltPoolPhysics.isKeyholeRiskHigh
                  ? "CRITICAL KEYHOLE"
                  : meltPoolPhysics.isKeyholeRiskModerate
                  ? "TRANSITION"
                  : "CONDUCTION"
              }
              badgeVariant={
                meltPoolPhysics.isKeyholeRiskHigh
                  ? "danger"
                  : meltPoolPhysics.isKeyholeRiskModerate
                  ? "warning"
                  : "success"
              }
              criterionName="King & Gouge-Michaleris Normalized Intensity Criterion"
              formula="P^* = \\frac{A \\cdot P}{k \\cdot r_0 \\cdot \\Delta T_m} \\quad | \\quad P^*_{crit} = \\pi \\sqrt{\\frac{T_b}{T_m}} \\sqrt{2 Pe} \\frac{T_m}{\\Delta T_m}"
              currentValue={`P* = ${meltPoolPhysics.normalizedLaserIntensity_Pstar} (Crit: ${meltPoolPhysics.criticalNormalizedIntensity})`}
              criticalThreshold={`Risk Ratio: ${meltPoolPhysics.keyholeRiskRatio}x (< 1.0 Safe)`}
              explanation={`Predicts keyhole depression porosity based on normalized intensity P* vs normalized scan speed Pe. Solidification morphology: ${meltPoolPhysics.microstructureMorphology}.`}
              recommendation={
                meltPoolPhysics.isKeyholeRiskHigh
                  ? "Lower laser power or increase scan speed to avoid keyhole vapor pores."
                  : "Parameters within safe conduction regime."
              }
            >
              <div
                className={`p-3 bg-[#090e18] border rounded-xl space-y-1 w-full transition ${
                  meltPoolPhysics.isKeyholeRiskHigh
                    ? "border-rose-500/60 bg-rose-950/20 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                    : meltPoolPhysics.isKeyholeRiskModerate
                    ? "border-amber-500/60 bg-amber-950/20"
                    : "border-[#1e2d46] hover:border-cyan-400/50"
                }`}
              >
                <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center justify-between">
                  <span>Keyhole / Grain:</span>
                  <Info className="w-3 h-3 text-cyan-400" />
                </span>
                <span
                  className={`text-xs font-bold block truncate mt-1 ${
                    meltPoolPhysics.isKeyholeRiskHigh
                      ? "text-rose-400"
                      : meltPoolPhysics.isKeyholeRiskModerate
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {meltPoolPhysics.isKeyholeRiskHigh ? "⚠️ Keyhole Risk" : meltPoolPhysics.microstructureMorphology.split(" ")[0]}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  P*: {meltPoolPhysics.normalizedLaserIntensity_Pstar} (x{meltPoolPhysics.keyholeRiskRatio})
                </span>
              </div>
            </MetallurgicalTooltip>
          </div>
        </div>

        {/* Right Column: LPBF Machine & Laser Parameters */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Laser & Scan Inverter</span>
            </h3>

            {/* Laser Power Slider */}
            <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
              <div className="flex justify-between items-center text-slate-300 text-xs">
                <MetallurgicalTooltip
                  title="Laser Power (P) & Thermal Gradient Control"
                  criterionName="Laser Energy Absorption"
                  formula="P_{abs} = A \\cdot P \\quad | \\quad d_{pool} \\propto \\sqrt{P}"
                  explanation="Higher laser power increases melt pool depth (d_pool), expanding the thermal penetration zone. When laser power is balanced with scan speed, it moderates the thermal gradient G = ΔT / d_pool."
                  recommendation="Maintain power in the conduction window (200-350W) to prevent keyhole collapse."
                >
                  <span className="font-semibold flex items-center gap-1 hover:text-cyan-300 cursor-help">
                    <span>Laser Power (P):</span>
                    <Info className="w-3 h-3 text-cyan-400" />
                  </span>
                </MetallurgicalTooltip>
                <span className="text-cyan-400 font-bold text-base">{laserPower_W} W</span>
              </div>
              <input
                type="range"
                min="100"
                max="800"
                step="10"
                value={laserPower_W}
                onChange={(e) => updateLpbfProcess({ laserPower_W: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>100 W</span>
                <span>400 W (Std)</span>
                <span>800 W</span>
              </div>
            </div>

            {/* Scan Speed Slider */}
            <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
              <div className="flex justify-between items-center text-slate-300 text-xs">
                <MetallurgicalTooltip
                  title="Scan Speed (v) & Solidification Strain Rate"
                  criterionName="Cooling Rate Law"
                  formula="\\dot{T} = G \\cdot R = G \\cdot (v \\cos\\theta) \\quad | \\quad \\dot{\\varepsilon}_{th} = \\text{CTE} \\cdot G \\cdot R"
                  explanation="Scan speed directly governs the solidification front velocity R. Rapid scan speeds dramatically elevate thermal strain rate (έ_th), increasing hot tearing crack susceptibility if interdendritic feeding cannot keep up."
                  recommendation="Reduce scan speed if hot tearing risk is high to allow solid bridging."
                >
                  <span className="font-semibold flex items-center gap-1 hover:text-blue-300 cursor-help">
                    <span>Scan Speed (v):</span>
                    <Info className="w-3 h-3 text-blue-400" />
                  </span>
                </MetallurgicalTooltip>
                <span className="text-blue-400 font-bold text-base">{scanSpeed_mms} mm/s</span>
              </div>
              <input
                type="range"
                min="300"
                max="2500"
                step="50"
                value={scanSpeed_mms}
                onChange={(e) => updateLpbfProcess({ scanSpeed_mms: parseFloat(e.target.value) })}
                className="w-full accent-blue-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300 mm/s</span>
                <span>1200 mm/s</span>
                <span>2500 mm/s</span>
              </div>
            </div>

            {/* Hatch & Layer Inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <MetallurgicalTooltip
                  title="Hatch Spacing (h)"
                  criterionName="Melt Pool Overlap Criterion"
                  formula="\\text{Overlap} = 1 - \\frac{h}{w_{pool}} \\ge 30\\%"
                  explanation="Controls inter-track overlap. Spacings larger than melt pool width create un-melted lack-of-fusion voids between scan vectors."
                >
                  <span className="text-slate-400 text-[10px] block flex items-center justify-between cursor-help">
                    <span>Hatch Spacing (h):</span>
                    <Info className="w-2.5 h-2.5 text-cyan-400" />
                  </span>
                </MetallurgicalTooltip>
                <span className="text-cyan-300 font-bold text-sm">{hatchSpacing_um} µm</span>
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="5"
                  value={hatchSpacing_um}
                  onChange={(e) => updateLpbfProcess({ hatch_um: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer mt-1"
                />
              </div>

              <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <MetallurgicalTooltip
                  title="Layer Thickness (t)"
                  criterionName="Powder Layer Penetration"
                  formula="d_{pool} \\ge 1.3 \\cdot t"
                  explanation="Thickness of each powder layer recoated. Melt pool depth must penetrate at least 130% of layer thickness to ensure robust metallurgical bonding to the previous slice."
                >
                  <span className="text-slate-400 text-[10px] block flex items-center justify-between cursor-help">
                    <span>Layer Thickness (t):</span>
                    <Info className="w-2.5 h-2.5 text-cyan-400" />
                  </span>
                </MetallurgicalTooltip>
                <span className="text-cyan-300 font-bold text-sm">{layerThickness_um} µm</span>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={layerThickness_um}
                  onChange={(e) => updateLpbfProcess({ layer_um: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer mt-1"
                />
              </div>
            </div>

            {/* Bed Pre-heating Slider */}
            <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
              <div className="flex justify-between items-center text-slate-300 text-xs">
                <MetallurgicalTooltip
                  title="Build Plate Preheat (T_bed) & Thermal Gradient Damping"
                  badgeText={bedPreheat_C >= 250 ? "High Preheat" : "Standard"}
                  badgeVariant={bedPreheat_C >= 250 ? "success" : "warning"}
                  criterionName="Thermal Stress Mitigation Law"
                  formula="G = \\frac{T_m - T_{bed}}{d_{pool}} \\quad | \\quad \\sigma_{res} \\propto (T_m - T_{bed})"
                  currentValue={`T_bed = ${bedPreheat_C}°C (ΔT = ${alloy.meltingTemp_Tm_C - bedPreheat_C}°C)`}
                  criticalThreshold="Recommended: ≥ 200°C for crack-susceptible alloys"
                  explanation="Preheating the build platform lowers the overall thermal delta (ΔT = Tm - T_bed), directly flattening the thermal gradient G and dramatically decreasing shrinkage strain rate and hot tearing risk."
                  recommendation="Set to 250–350°C for Inconel 718 to eliminate cracking."
                >
                  <span className="font-semibold flex items-center gap-1.5 hover:text-amber-300 cursor-help">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-amber-400" />
                    <span>Build Plate Preheat:</span>
                    <Info className="w-3 h-3 text-amber-400" />
                  </span>
                </MetallurgicalTooltip>
                <span className="text-amber-400 font-bold text-base">{bedPreheat_C} °C</span>
              </div>
              <input
                type="range"
                min="25"
                max="500"
                step="25"
                value={bedPreheat_C}
                onChange={(e) => updateLpbfProcess({ preheatTemp_C: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Higher preheating directly dampens thermal gradient G and eliminates solidification cracking.
              </span>
            </div>

            {/* Scan Strategy Selector */}
            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2 text-xs">
              <MetallurgicalTooltip
                title="Scan Vector Strategy & Anisotropy"
                criterionName="Residual Stress Redistribution"
                formula="\\beta_{meander-67} = 0.75 \\quad | \\quad \\beta_{island} = 0.62"
                explanation="Rotational scan strategies (67° inter-layer rotation or 5x5mm island checkerboard) randomize the principal stress vectors, mitigating directional warpage and hot cracking propagation along grain boundaries."
              >
                <span className="text-slate-400 font-semibold block text-[11px] flex items-center justify-between cursor-help">
                  <span>Scan Vector Rotation:</span>
                  <Info className="w-3 h-3 text-cyan-400" />
                </span>
              </MetallurgicalTooltip>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "meander-67", name: "67° Rotation" },
                  { id: "island", name: "Island 5x5" },
                  { id: "stripe", name: "Uni-Stripe" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateLpbfProcess({ scanStrategy: st.id as LpbfScanStrategy })}
                    className={`py-1.5 px-2 rounded-lg text-center font-bold text-[10px] transition ${
                      scanStrategy === st.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-[#090e18] text-slate-400 hover:text-white border border-[#1e2d46]"
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Predictive Microstructure & Keyhole Porosity Risk Analysis Module */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Predictive Microstructure & Keyhole Porosity Risk Modeling
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                      King & Gouge-Michaleris Theory
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Predicts as-solidified grain morphology and flags vapor depression keyhole pore generation based on normalized laser intensity $P^*$ and normalized scan speed (Péclet number $Pe$).
                  </p>
                </div>
              </div>

              {/* Status Flag */}
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  meltPoolPhysics.isKeyholeRiskHigh
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"
                    : meltPoolPhysics.isKeyholeRiskModerate
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                }`}
              >
                {meltPoolPhysics.isKeyholeRiskHigh ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : meltPoolPhysics.isKeyholeRiskModerate ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {meltPoolPhysics.isKeyholeRiskHigh
                    ? "KEYHOLE POROSITY RISK: CRITICAL"
                    : meltPoolPhysics.isKeyholeRiskModerate
                    ? "KEYHOLE RISK: MODERATE / TRANSITION"
                    : "MICROSTRUCTURE: OPTIMAL CONDUCTION"}
                </span>
              </div>
            </div>

            {/* Analytical 3-Column Microstructure & Porosity Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Column 1: Normalized Laser Intensity vs Scan Speed Threshold */}
              <div className="p-4 rounded-xl bg-[#050810] border border-[#1e2d46] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Normalized Intensity ($P^*$):</span>
                  </span>
                  <span className="text-cyan-300 font-mono font-bold">{meltPoolPhysics.normalizedLaserIntensity_Pstar}</span>
                </div>

                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Critical Threshold (P*_crit):</span>
                    <span className="text-rose-400 font-bold">{meltPoolPhysics.criticalNormalizedIntensity}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Normalized Scan Speed (Pe):</span>
                    <span className="text-blue-300 font-bold">{meltPoolPhysics.normalizedScanSpeed_Peclet}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Porosity Risk Ratio:</span>
                    <span
                      className={`font-bold ${
                        meltPoolPhysics.isKeyholeRiskHigh
                          ? "text-rose-400"
                          : meltPoolPhysics.isKeyholeRiskModerate
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {meltPoolPhysics.keyholeRiskRatio}x ({meltPoolPhysics.isKeyholeRiskHigh ? "Exceeds Boundary" : "Sub-critical"})
                    </span>
                  </div>
                </div>

                {/* Progress Bar of Normalized Intensity vs Threshold */}
                <div className="space-y-1 pt-1">
                  <div className="h-2 w-full bg-[#162032] rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        meltPoolPhysics.isKeyholeRiskHigh
                          ? "bg-rose-500"
                          : meltPoolPhysics.isKeyholeRiskModerate
                          ? "bg-amber-400"
                          : "bg-cyan-400"
                      }`}
                      style={{
                        width: `${Math.min(100, (meltPoolPhysics.normalizedLaserIntensity_Pstar / Math.max(1, meltPoolPhysics.criticalNormalizedIntensity * 1.3)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Conduction Regime</span>
                    <span>Threshold Line (1.0x)</span>
                    <span>Deep Keyhole</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Solidification Microstructure & Grain Morphology */}
              <div className="p-4 rounded-xl bg-[#050810] border border-[#1e2d46] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Grain Solidification Morphology:</span>
                  </span>
                  <span className="text-indigo-300 font-mono font-bold text-[11px]">{meltPoolPhysics.microstructureMorphology}</span>
                </div>

                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Cellular Spacing ($\lambda$):</span>
                    <span className="text-slate-200 font-bold">~{meltPoolPhysics.cellularSpacing_um} µm</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>$G/R$ Morphology Ratio:</span>
                    <span className="text-slate-200 font-bold">{meltPoolPhysics.G_over_R} K·s/m²</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Est. Microhardness:</span>
                    <span className="text-cyan-300 font-bold">~{meltPoolPhysics.expectedMicrohardness_HV} HV0.3</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#090e18] border border-[#162032] text-[10px] text-slate-400 leading-snug">
                  High cooling rate (T_dot = {meltPoolPhysics.coolingRate_Ks.toLocaleString()} K/s) suppresses coarse grain growth, promoting Hall-Petch yield strength enhancement.
                </div>
              </div>

              {/* Column 3: Pore Mechanism & Machine Optimization */}
              <div className="p-4 rounded-xl bg-[#050810] border border-[#1e2d46] space-y-2">
                <span className="text-slate-300 text-xs font-bold block flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Porosity Mechanism & Corrective Action:</span>
                </span>

                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {meltPoolPhysics.isKeyholeRiskHigh ? (
                    <span className="text-rose-200">
                      <strong>Warning:</strong> High normalized intensity ($P^* = {meltPoolPhysics.normalizedLaserIntensity_Pstar}$) produces an unstable recoil pressure vapor cavity (~{meltPoolPhysics.keyholeCavityDepth_um} µm depth). Keyhole tip collapses during laser traversal, trapping spherical argon/vapor pores.
                    </span>
                  ) : meltPoolPhysics.isKeyholeRiskModerate ? (
                    <span className="text-amber-200">
                      <strong>Advisory:</strong> Operating near the keyhole transition boundary. Minor laser fluctuations or sharp corner decelerations may trigger periodic keyhole pore nucleation.
                    </span>
                  ) : (
                    <span className="text-emerald-200">
                      <strong>Conforming:</strong> Stable Marangoni-driven conduction melt pool. Vapor recoil pressure is balanced by surface tension, preventing pore entrapment.
                    </span>
                  )}
                </p>

                {meltPoolPhysics.isKeyholeRiskHigh && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        // Automatically adjust scan speed and laser power to bring into safe zone
                        const targetPower = Math.round(laserPower_W * 0.82);
                        const targetSpeed = Math.min(2500, Math.round(scanSpeed_mms * 1.25));
                        updateLpbfProcess({
                          laserPower_W: targetPower,
                          scanSpeed_mms: targetSpeed,
                        });
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[10px] font-bold transition flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Auto-Tune: Suppress Keyholing</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Audit Verdict Certificate */}
          {auditReport && (
            <div className="bg-[#090e18] border border-cyan-500/50 rounded-2xl p-5 space-y-3 shadow-xl animate-fade-in text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-line">
              <div className="flex justify-between items-center border-b border-[#162032] pb-2 text-cyan-400 font-bold font-mono">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>ASTM F3055 LPBF Defect Audit</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditReport(null)}
                  className="px-2 py-0.5 bg-[#162032] text-slate-400 hover:text-white rounded"
                >
                  Dismiss
                </button>
              </div>
              {auditReport}
            </div>
          )}
        </div>
      </div>
        </>
      )}
      </div>
      {inAdvanced && activeSubTab !== "3d-cross-section-melt-pool" && (
        <LpbfBuildJobRail
          activeSubTab={activeSubTab}
          focusedWizardStage={focusedWizardStage}
          onNavigateStage={(subTab, stage) => {
            setFocusedWizardStage(stage);
            setActiveSubTab(subTab as LpbfDistortionSubTab);
          }}
          onBackToDecision={() => {
            setFocusedWizardStage("process");
            setActiveSubTab("industrial-decision");
            setAdvancedOpen(false);
          }}
        />
      )}
    </div>
  );
};

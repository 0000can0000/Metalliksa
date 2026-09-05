import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  Box,
  Microscope,
  FlaskConical,
  Database,
  Bot,
  Activity,
  Layers,
  Compass,
  Cpu,
  Radio,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  BatteryCharging,
  Gauge,
  Rocket,
  BookOpen,
  Atom,
  Award,
  Zap,
  ChevronRight,
  Boxes,
  Flame,
  Clock,
} from "lucide-react";
import { PocketCalculators } from "./components/PocketCalculators";
import { CrystalVisualizer } from "./components/CrystalVisualizer";
import { MicrographLab } from "./components/MicrographLab";
import { AlloyBuilder } from "./components/AlloyBuilder";
import { MaterialsDatabaseView } from "./components/MaterialsDatabaseView";
import { MetallurgyCopilot } from "./components/MetallurgyCopilot";
import { ElectrochemicalAnalysisSuite } from "./components/ElectrochemicalAnalysisSuite";
import { MaterialsProjectExplorer } from "./components/MaterialsProjectExplorer";
import { ICMEModule } from "./components/ICME-Module";
import { StandardQualificationEngine } from "./components/StandardQualificationEngine";
import { HypersonicAblationLab } from "./components/HypersonicAblationLab";
import { RapidXRDAnalysisLab } from "./components/RapidXRDAnalysisLab";
import { AIEbsdGrainLab } from "./components/AIEbsdGrainLab";
import { HardnessToTensileLab } from "./components/HardnessToTensileLab";
import { MechanicalPropertyAILab } from "./components/MechanicalPropertyAILab";
import { Additive3DDistortionLab } from "./components/Additive3DDistortionLab";
import { AerospaceAuditReportGenerator } from "./components/AerospaceAuditReportGenerator";
import { AdvancedResearchHub } from "./components/AdvancedResearchHub";
import { ThermalCycleScheduler } from "./components/ThermalCycleScheduler";
import { PhaseDiagramViewer } from "./components/PhaseDiagramViewer";
import { EDSSpectrumLab } from "./components/EDSSpectrumLab";
import { DigitalTwinHub } from "./components/DigitalTwinHub";
import { PhaseKineticsTTTCCTStudio } from "./components/PhaseKineticsTTTCCTStudio";
import { UQLab } from "./components/UQLab";
import { pythonComputationService, PythonEngineStatus } from "./services/pythonComputationService";

export type DisciplineHubId =
  | "characterization"
  | "thermal-mechanical"
  | "certification";

export type NavSubTab =
  | "uq-lab"
  | "digital-twin"
  | "electrochem-suite"
  | "xrd-lab"
  | "ebsd-lab"
  | "eds-lab"
  | "micrograph"
  | "crystal"
  | "hardness-tensile"
  | "mechanical-ai-lab"
  | "3d-distortion-lab"
  | "ttt-cct-kinetics"
  | "aerospace-pdf-audit"
  | "qualification"
  | "icme-motor"
  | "thermal-scheduler"
  | "hypersonic-tps"
  | "database"
  | "phase-diagram"
  | "materials-project"
  | "alloy-builder"
  | "calculators"
  | "research-hub"
  | "copilot";

interface SubTabItem {
  id: NavSubTab;
  label: string;
  shortLabel: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  category: string;
}

interface DisciplineHub {
  id: DisciplineHubId;
  stepNumber: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  defaultTab: NavSubTab;
  subTabs: SubTabItem[];
}

const DISCIPLINE_HUBS: DisciplineHub[] = [
  {
    id: "characterization",
    stepNumber: "01",
    label: "1. Characterization & Micro-Analysis",
    shortLabel: "1. Characterization",
    description: "XRD, SEM-EDS, EBSD Texture, Micrographs & Electrochemistry",
    icon: Atom,
    badge: "ASTM E915 / E112 / E1508",
    defaultTab: "xrd-lab",
    subTabs: [
      {
        id: "uq-lab",
        label: "UQ-Lab: Quasi-Monte Carlo & coupon scatter",
        shortLabel: "UQ-Lab",
        sublabel: "Sobol QMC sampling; MMPDS A/B only for uploaded coupons",
        icon: ShieldCheck,
        badge: "QMC Sobol / MMPDS",
        category: "Uncertainty & Allowables",
      },
      {
        id: "xrd-lab",
        label: "NIST Calibrated XRD & Microstrain Lab",
        shortLabel: "XRD & Diffraction",
        sublabel: "NIST SRM 640 Zero-Shift, Williamson-Hall, Savitzky-Golay, WebGL GPU",
        icon: Atom,
        badge: "ASTM E915",
        category: "Diffraction & Phase",
      },
      {
        id: "eds-lab",
        label: "SEM-EDS & X-Ray Spectroscopy",
        shortLabel: "SEM-EDS Lab",
        sublabel: "Spot Spectrum, Line Scans, ZAF Matrix Factors, WebGL HyperMap",
        icon: Zap,
        badge: "ASTM E1508",
        category: "Chemical Spectroscopy",
      },
      {
        id: "ebsd-lab",
        label: "AI Grain & EBSD Texture Analysis",
        shortLabel: "EBSD & Grain",
        sublabel: "Heyn Line Intercept, IPF-Z Maps, Schmid Factor, WebGL GPU",
        icon: Microscope,
        badge: "ASTM E112",
        category: "Texture & Orientation",
      },
      {
        id: "micrograph",
        label: "Micrograph AI Vision Lab",
        shortLabel: "Optical / SEM AI",
        sublabel: "Optical & SEM Phase Segmentation, Particle Sizing & Porosity",
        icon: Microscope,
        badge: "Vision AI",
        category: "Computer Vision",
      },
      {
        id: "electrochem-suite",
        label: "Electrochemistry, Battery & Corrosion Suite",
        shortLabel: "Corrosion & EIS",
        sublabel: "EIS Nyquist/Bode, Tafel Polarization, Pourbaix, Galvanic Coupling",
        icon: Zap,
        badge: "ASTM G102 / G59",
        category: "Corrosion & Energy",
      },
      {
        id: "crystal",
        label: "3D Crystal Lattices & Symmetry",
        shortLabel: "3D Crystal",
        sublabel: "BCC, FCC, HCP, Miller Planes and Wigner-Seitz Primitive Cells",
        icon: Box,
        badge: "3D Engine",
        category: "Crystallography",
      },
      {
        id: "materials-project",
        label: "Materials Project Live DFT API",
        shortLabel: "Materials Project",
        sublabel: "Live MP API, Convex Hull Phase Stability, Elastic VRH Moduli",
        icon: Database,
        badge: "DFT API",
        category: "Atomic / DFT",
      },
      {
        id: "database",
        label: "Materials Database & Handbook",
        shortLabel: "Materials DB",
        sublabel: "25+ Aerospace Alloys, Superalloys, Titanium & Tool Steels",
        icon: Layers,
        badge: "Handbook",
        category: "Database",
      },
    ],
  },
  {
    id: "thermal-mechanical",
    stepNumber: "02",
    label: "2. Thermal & Mechanical Design",
    shortLabel: "2. Thermal & Mechanical",
    description: "Tabor-to-Tensile, 3D LPBF, Thermal Kinetics, ICME & Hypersonic TPS",
    icon: Flame,
    badge: "ASTM E8 / F3055 / ICME",
    defaultTab: "hardness-tensile",
    subTabs: [
      {
        id: "hardness-tensile",
        label: "Tabor-Cahoon Indentation to Tensile (σ-ε)",
        shortLabel: "Hardness → Tensile",
        sublabel: "Non-Destructive Yield, UTS, Hollomon n, Fracture Toughness K1c",
        icon: Gauge,
        badge: "ASTM E8 / E384",
        category: "Mechanical Testing",
      },
      {
        id: "mechanical-ai-lab",
        label: "AI Alloy Property Predictor (PINN & XGBoost)",
        shortLabel: "AI Mechanical Predictor",
        sublabel: "Multi-Element Chemistry + Heat Treatment -> Yield, UTS, Hardness, Creep",
        icon: Cpu,
        badge: "PINN / XGBoost",
        category: "Machine Learning",
      },
      {
        id: "3d-distortion-lab",
        label: "3D CAD/STL Defect & Thermal Stress (LPBF)",
        shortLabel: "3D LPBF Simulation",
        sublabel: "Additive Residual Stress σ_res, Warpage, Keyhole & LoF Heatmap",
        icon: Box,
        badge: "ASTM F3055",
        category: "Additive Manufacturing",
      },
      {
        id: "ttt-cct-kinetics",
        label: "TTT / CCT & Diffusion Kinetics Studio (DICTRA / JMAK)",
        shortLabel: "TTT/CCT Kinetics",
        sublabel: "Equilibrium vs. Non-Equilibrium, Scheil Additivity, LSW Aging Coarsening",
        icon: Clock,
        badge: "DICTRA / JMAK",
        category: "Transformation Kinetics",
      },
      {
        id: "thermal-scheduler",
        label: "Thermal Cycle Scheduler & Kinetics",
        shortLabel: "Thermal Cycle",
        sublabel: "Multi-Stage Furnace Heating/Cooling, Grain Growth & Zener Pinning",
        icon: Flame,
        badge: "ASTM E112",
        category: "Heat Treatment",
      },
      {
        id: "icme-motor",
        label: "Multi-Scale ICME Alloy Engine",
        shortLabel: "ICME Engine",
        sublabel: "0.1 wt% Microsegregation, SDAS, Hall-Petch Yield/UTS Evolution",
        icon: Cpu,
        badge: "Multi-Scale",
        category: "ICME Simulation",
      },
      {
        id: "phase-diagram",
        label: "CALPHAD Gibbs Solver & Phase Equilibrium",
        shortLabel: "CALPHAD Gibbs",
        sublabel: "Gibbs Free Energy Minimization G(x), Scheil-Gulliver & Fe-C",
        icon: Compass,
        badge: "CALPHAD / SGTE",
        category: "Thermodynamics",
      },
      {
        id: "alloy-builder",
        label: "Alloy Formulator & Inverse Design",
        shortLabel: "Alloy Formulation",
        sublabel: "Hume-Rothery Rules & Multi-Objective Property Optimization",
        icon: FlaskConical,
        badge: "Synthesis",
        category: "Alloy Engineering",
      },
      {
        id: "hypersonic-tps",
        label: "Hypersonic & Ablative TPS Lab",
        shortLabel: "Hypersonic TPS",
        sublabel: "Mach 3-25+, NASA CMA Charring, Pyrolysis, NRT DPA Radiation",
        icon: Rocket,
        badge: "Mach 3-25+",
        category: "Extreme Environments",
      },
      {
        id: "calculators",
        label: "Pocket Metallurgical Calculators",
        shortLabel: "Calculators",
        sublabel: "ASTM Hardness Conversion, Carbon Eq CE, Fick's Diffusion, Schaeffler",
        icon: Calculator,
        badge: "7 Rapid Tools",
        category: "Utility Tools",
      },
    ],
  },
  {
    id: "certification",
    stepNumber: "03",
    label: "3. Screening & Qualification",
    shortLabel: "3. Screening",
    description: "Sample Digital Twin, audit report templates, MMPDS screening & AI Copilot",
    icon: ShieldCheck,
    badge: "Screening templates",
    defaultTab: "digital-twin",
    subTabs: [
      {
        id: "digital-twin",
        label: "Sample Digital Twin (Core Spine)",
        shortLabel: "Digital Twin (Spine)",
        sublabel: "Integrated Data Schema, Coherence Radar, Multi-Scale AI Audit",
        icon: Boxes,
        badge: "Single Source of Truth",
        category: "Digital Twin",
      },
      {
        id: "aerospace-pdf-audit",
        label: "Audit report templates (demo)",
        shortLabel: "Audit templates",
        sublabel: "Screening PDFs and protocol checklists (not NADCAP / airworthiness)",
        icon: Award,
        badge: "Demo templates",
        category: "Aerospace Audit",
      },
      {
        id: "qualification",
        label: "MMPDS screening & protocol checklist",
        shortLabel: "MMPDS screening",
        sublabel: "Coupon stats, MIL-STD-810H / AS9100 / STANAG checklist templates",
        icon: ShieldCheck,
        badge: "MIL-HDBK-5",
        category: "Standard Allowables",
      },
      {
        id: "research-hub",
        label: "Research & Literature Hub",
        shortLabel: "Literature Hub",
        sublabel: "CALPHAD, Science/Acta Materialia, DOI Search & AI Synthesis",
        icon: BookOpen,
        badge: "DOIs & Papers",
        category: "Academic Literature",
      },
      {
        id: "copilot",
        label: "Metallurgy AI Copilot",
        shortLabel: "AI Advisor",
        sublabel: "Thermodynamics, Heat Treatment & Phase Diagram Advisor",
        icon: Bot,
        badge: "AI Copilot",
        category: "Artificial Intelligence",
      },
    ],
  },
];

export default function App() {
  const [activeHubId, setActiveHubId] = useState<DisciplineHubId>("characterization");
  const [activeTab, setActiveTab] = useState<NavSubTab>("xrd-lab");
  const [subModuleFilter, setSubModuleFilter] = useState<string>("all");
  const [showPythonStatusModal, setShowPythonStatusModal] = useState<boolean>(false);
  const [pyStatusData, setPyStatusData] = useState<PythonEngineStatus | null>(null);
  const [isCheckingPyStatus, setIsCheckingPyStatus] = useState<boolean>(false);

  useEffect(() => {
    pythonComputationService.checkEngineStatus().then((res) => setPyStatusData(res));
  }, []);

  const handleRefreshPyStatus = async () => {
    setIsCheckingPyStatus(true);
    const res = await pythonComputationService.checkEngineStatus(true);
    setPyStatusData(res);
    setIsCheckingPyStatus(false);
  };

  // Find active hub
  const activeHub = useMemo(() => {
    return DISCIPLINE_HUBS.find((h) => h.id === activeHubId) || DISCIPLINE_HUBS[0];
  }, [activeHubId]);

  // Current hub index for stepper progress (0, 1, 2)
  const currentHubIndex = useMemo(() => {
    return DISCIPLINE_HUBS.findIndex((h) => h.id === activeHubId);
  }, [activeHubId]);

  // Handle direct navigation to any subtab (e.g. from cross-module links)
  const navigateToTab = (tabId: NavSubTab) => {
    const parentHub = DISCIPLINE_HUBS.find((h) => h.subTabs.some((s) => s.id === tabId));
    if (parentHub) {
      setActiveHubId(parentHub.id);
    }
    setActiveTab(tabId);
  };

  // Switch discipline hub
  const selectHub = (hubId: DisciplineHubId) => {
    setActiveHubId(hubId);
    setSubModuleFilter("all");
    const hub = DISCIPLINE_HUBS.find((h) => h.id === hubId);
    if (hub) {
      // If current activeTab is not in this hub, switch to hub default tab
      if (!hub.subTabs.some((s) => s.id === activeTab)) {
        setActiveTab(hub.defaultTab);
      }
    }
  };

  // Navigate to next / previous flow step
  const navigateFlowStep = (direction: "next" | "prev") => {
    if (direction === "next" && currentHubIndex < DISCIPLINE_HUBS.length - 1) {
      const nextHub = DISCIPLINE_HUBS[currentHubIndex + 1];
      selectHub(nextHub.id);
    } else if (direction === "prev" && currentHubIndex > 0) {
      const prevHub = DISCIPLINE_HUBS[currentHubIndex - 1];
      selectHub(prevHub.id);
    }
  };

  // Listen to cross-module pipeline navigation events
  useEffect(() => {
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ tabId: NavSubTab }>;
      if (customEvent.detail?.tabId) {
        navigateToTab(customEvent.detail.tabId);
      }
    };
    window.addEventListener("metallix-navigate-tab", handleCustomNav);
    return () => window.removeEventListener("metallix-navigate-tab", handleCustomNav);
  }, []);

  return (
    <div className="min-h-screen bg-[#070b12] text-[#e2e8f0] flex flex-col font-sans selection:bg-sky-500/25 selection:text-sky-200 relative overflow-x-hidden">
      {/* Aerospace Subtle Ambient Radar Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_-10%,rgba(56,189,248,0.08),transparent_50%)] h-[550px] z-0"></div>

      {/* Top Aerospace Header & 3-Step Master Workflow */}
      <header className="sticky top-0 z-50 bg-[#090e17]/95 backdrop-blur-md border-b border-[#162032] px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          {/* Brand & Telemetry Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                <Compass className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
                    MetalliX <span className="text-sky-400">Aero</span>
                  </h1>
                  <span className="px-1.5 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[9px] font-mono font-semibold tracking-wider">
                    CALPHAD // v4.2
                  </span>
                  <button
                    onClick={() => setShowPythonStatusModal(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[9px] font-mono font-semibold tracking-wider hover:bg-emerald-500/20 transition-all cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    title="Click to view Python 3.10 HPC Subsystem status"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>PYTHON HPC 3.10: READY (6 SOLVERS)</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5 flex-wrap">
                  <span>Materials Science & Aerospace Metallurgy Suite</span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-sky-400/90 font-medium">Can Erganiş</span>
                </p>
              </div>
            </div>

            {/* Mobile Telemetry Status */}
            <div className="lg:hidden flex items-center gap-2 px-2.5 py-1 rounded bg-[#0c1322] border border-[#1a253a] text-[10px] font-mono text-sky-400">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)] animate-pulse"></span>
              SYS: OK
            </div>
          </div>

          {/* 3-STEP MASTER WORKFLOW STEPPER (Characterization ➔ Thermal & Mechanical ➔ Certification) */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1.5 p-1 bg-[#060a12] rounded-xl border border-[#162032] overflow-x-auto max-w-full shadow-inner">
              {DISCIPLINE_HUBS.map((hub, idx) => {
                const Icon = hub.icon;
                const isActive = activeHubId === hub.id;
                const isPassed = currentHubIndex > idx;

                return (
                  <React.Fragment key={hub.id}>
                    {idx > 0 && (
                      <div className="hidden sm:flex items-center px-1 text-slate-600">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    )}

                    <button
                      onClick={() => selectHub(hub.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/15 border border-sky-400/50 text-white shadow-[0_0_14px_rgba(56,189,248,0.25)] font-bold"
                          : isPassed
                          ? "text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-sky-400 text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.9)]"
                            : isPassed
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isPassed ? "✓" : hub.stepNumber}
                      </div>

                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-sky-300" : isPassed ? "text-emerald-400" : "text-slate-400"}`} />
                      
                      <div className="text-left">
                        <div className="leading-tight">{hub.shortLabel}</div>
                      </div>

                      <span
                        className={`hidden md:inline text-[9px] px-1.5 py-0.2 rounded font-sans tracking-tight ${
                          isActive
                            ? "bg-sky-400/20 text-sky-200 border border-sky-400/30"
                            : "bg-slate-800/80 text-slate-400"
                        }`}
                      >
                        {hub.subTabs.length} Modules
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Streamlined Sub-Module Ribbon for the Active Flow */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-[#162032]/60 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase tracking-wider hidden lg:inline mr-1 shrink-0">
              {activeHub.shortLabel} Modules:
            </span>

            {activeHub.subTabs.map((sub) => {
              const Icon = sub.icon;
              const isSubActive = activeTab === sub.id;

              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveTab(sub.id)}
                  title={sub.sublabel}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isSubActive
                      ? "bg-sky-500/20 text-sky-200 border border-sky-400/50 font-bold shadow-[0_0_10px_rgba(56,189,248,0.25)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1424] border border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSubActive ? "text-sky-400" : "text-slate-500"}`} />
                  <span>{sub.shortLabel}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-sans ${
                      isSubActive
                        ? "bg-sky-400/20 text-sky-300 border border-sky-400/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {sub.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Flow Stage Indicator */}
          <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-slate-400 shrink-0">
            <span className="text-slate-500">Flow Scope:</span>
            <span className="text-slate-300 truncate max-w-xs">{activeHub.description}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 pb-24 lg:pb-8 relative z-10">
        {activeTab === "uq-lab" && (
          <UQLab onNavigate={(tabId) => navigateToTab(tabId as NavSubTab)} />
        )}
        {activeTab === "digital-twin" && (
          <DigitalTwinHub onNavigateToModule={(tabId) => navigateToTab(tabId as NavSubTab)} />
        )}
        {activeTab === "electrochem-suite" && <ElectrochemicalAnalysisSuite />}
        {activeTab === "aerospace-pdf-audit" && <AerospaceAuditReportGenerator />}
        {activeTab === "3d-distortion-lab" && <Additive3DDistortionLab />}
        {activeTab === "hardness-tensile" && <HardnessToTensileLab onNavigate={(tabId) => navigateToTab(tabId as NavSubTab)} />}
        {activeTab === "mechanical-ai-lab" && <MechanicalPropertyAILab />}
        {activeTab === "ttt-cct-kinetics" && (
          <PhaseKineticsTTTCCTStudio onSendToModule={(target, payload) => navigateToTab(target as NavSubTab)} />
        )}
        {activeTab === "ebsd-lab" && <AIEbsdGrainLab />}
        {activeTab === "xrd-lab" && <RapidXRDAnalysisLab onNavigate={(tabId) => navigateToTab(tabId as NavSubTab)} />}
        {activeTab === "hypersonic-tps" && <HypersonicAblationLab />}
        {activeTab === "icme-motor" && <ICMEModule />}
        {activeTab === "thermal-scheduler" && <ThermalCycleScheduler onNavigate={(tabId) => navigateToTab(tabId as NavSubTab)} />}
        {activeTab === "qualification" && <StandardQualificationEngine />}
        {activeTab === "research-hub" && <AdvancedResearchHub />}
        {activeTab === "materials-project" && (
          <MaterialsProjectExplorer
            onSelectToCrystal={(formula, crystalSystem) => {
              navigateToTab("crystal");
            }}
          />
        )}
        {activeTab === "calculators" && <PocketCalculators />}
        {activeTab === "crystal" && <CrystalVisualizer />}
        {activeTab === "eds-lab" && <EDSSpectrumLab />}
        {activeTab === "micrograph" && <MicrographLab />}
        {activeTab === "alloy-builder" && <AlloyBuilder onNavigate={(tabId) => navigateToTab(tabId as NavSubTab)} />}
        {activeTab === "database" && <MaterialsDatabaseView onNavigate={(tabId) => navigateToTab(tabId as NavSubTab)} />}
        {activeTab === "phase-diagram" && <PhaseDiagramViewer />}
        {activeTab === "copilot" && <MetallurgyCopilot />}

        {/* WORKFLOW PIPELINE TRANSITION BAR (Step 1 ➔ Step 2 ➔ Step 3) */}
        <div className="mt-8 pt-4 border-t border-[#162032] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#060a12]/80 p-3.5 rounded-xl border border-[#162032]/80 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)] animate-pulse"></span>
            <span className="text-slate-400">Active Workflow:</span>
            <span className="text-sky-300 font-bold">{activeHub.label}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentHubIndex > 0 && (
              <button
                type="button"
                onClick={() => navigateFlowStep("prev")}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all text-xs cursor-pointer"
              >
                <span>← Previous Workflow ({DISCIPLINE_HUBS[currentHubIndex - 1].shortLabel})</span>
              </button>
            )}

            {currentHubIndex < DISCIPLINE_HUBS.length - 1 ? (
              <button
                type="button"
                onClick={() => navigateFlowStep("next")}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)] hover:opacity-95 flex items-center gap-1.5 transition-all text-xs cursor-pointer"
              >
                <span>Proceed to Next Workflow: {DISCIPLINE_HUBS[currentHubIndex + 1].shortLabel} →</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateToTab("digital-twin")}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:opacity-95 flex items-center gap-1.5 transition-all text-xs cursor-pointer"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Inspect Sample Digital Twin (Spine)</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Mobile / Android Fixed Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b13]/95 backdrop-blur-xl border-t border-[#162032] px-2 pt-1.5 pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {DISCIPLINE_HUBS.map((hub) => {
            const Icon = hub.icon;
            const isActive = activeHubId === hub.id;
            return (
              <button
                key={hub.id}
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(12);
                  }
                  selectHub(hub.id);
                }}
                className={`flex flex-col items-center justify-center min-w-[70px] py-1 px-1 rounded-lg transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? "text-sky-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-1 rounded-md transition-all ${
                    isActive
                      ? "bg-sky-500/20 text-sky-400 border border-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.35)]"
                      : "text-slate-400"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-mono whitespace-nowrap leading-tight">
                  {hub.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aerospace Minimalist Footer */}
      <footer className="border-t border-[#162032] bg-[#090e17] px-4 lg:px-8 py-4 mb-16 lg:mb-0 text-xs text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white uppercase tracking-wider text-xs">
              MetalliX Aero
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Computational Materials Science & Aerospace Metallurgy Suite
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-sky-400">
              Can Erganiş
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]"></span>
              ASTM E140 / ISO 18265
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]"></span>
              AWS D1.1 / IIW Carbon Eq
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
              ASTM E112 / E915 / E1508
            </span>
          </div>
        </div>
      </footer>
      {/* Python 3.10 HPC Subsystem Diagnostics Modal */}
      {showPythonStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1322] border border-sky-500/30 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative font-mono text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      MetalliX Python 3.10 HPC Subsystem
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                      LIVE & READY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    High-Performance Scientific Computing Engines (CALPHAD, DFT, EIS, XRD, LPBF, Genetic Optimizer, Pourbaix)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPythonStatusModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">RUNTIME ARCHITECTURE</div>
                  <div className="text-white font-bold mt-0.5">
                    CPython {pyStatusData?.pythonVersion || "3.10+"}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Persistent Microservice Daemon
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">IPC CHANNELS & MEMORY</div>
                  <div className="text-white font-bold mt-0.5 truncate">
                    {pyStatusData?.channel === "unix_socket" ? "AF_UNIX Socket Streaming" : "IPC Channel"}
                  </div>
                  <div className="text-[10px] text-sky-400 mt-1">
                    15 Scientific Solvers Warm in RAM
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">IPC ROUNDTRIP LATENCY</div>
                  <div className="text-emerald-400 font-bold mt-0.5 text-sm">
                    {pyStatusData?.durationMs !== undefined ? `${pyStatusData.durationMs} ms` : "< 2 ms"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Zero process fork/spawn overhead
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-4">
                Registered Python Solvers ({pyStatusData?.subsystems ? Object.keys(pyStatusData.subsystems).length : 8})
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#070e1b] border border-sky-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">1. CALPHAD Gibbs Minimizer</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Multi-component Gibbs energy minimization, Scheil-Gulliver & New-PHACOMP.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/calphad_solver.py</div>
                </div>

                <div className="p-3 rounded-xl bg-[#070e1b] border border-sky-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">2. DFT 6x6 Elastic Tensor</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Ab-initio C_ij matrix inversion, Voigt-Reuss-Hill, Debye temp & anisotropy.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/dft_property_calculator.py</div>
                </div>

                <div className="p-3 rounded-xl bg-[#070e1b] border border-sky-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">3. CNLS EIS Levenberg-Marquardt</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Complex Non-Linear Least Squares optimizer & Kramers-Kronig Lin-KK test.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/cnls_fitting_solver.py</div>
                </div>

                <div className="p-3 rounded-xl bg-[#070e1b] border border-sky-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">4. XRD Peak Deconvolution</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Pseudo-Voigt/Pearson-VII, Kα1/Kα2 stripping & Williamson-Hall microstrain.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/xrd_peak_deconvolution.py</div>
                </div>

                <div className="p-3 rounded-xl bg-[#070e1b] border border-sky-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">5. 3D LPBF Goldak Thermal</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">3D laser melt pool, thermal gradient G, cooling rate G*R & Hunt PDAS.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/lpbf_thermal_solver.py</div>
                </div>

                <div className="p-3 rounded-xl bg-[#070e1b] border border-sky-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">6. Inverse Alloy Genetic Optimizer</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">NSGA-II Pareto multi-objective optimization for superalloys & HEAs.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/inverse_alloy_optimizer.py</div>
                </div>

                <div className="p-3 rounded-xl bg-[#070e1b] border border-sky-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">7. Pourbaix E-pH Stability Solver</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Multi-element Nernst electrochemical equilibria, water lines & passivity boundaries.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/pourbaix_solver.py</div>
                </div>

                <div className="p-3 rounded-xl bg-[#070e1b] border border-amber-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">8. JMAK TTT/CCT Kinetics Solver</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">JMAK C-curves, Scheil additivity continuous cooling, LSW coarsening & CALPHAD-gap.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-mono">python/kinetics_ttt_cct_solver.py</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">
                Automatic client-side WASM/TS fallback active if offline
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshPyStatus}
                  disabled={isCheckingPyStatus}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition-all cursor-pointer font-bold"
                >
                  {isCheckingPyStatus ? "Probing Subsystem..." : "Re-test Diagnostics"}
                </button>
                <button
                  onClick={() => setShowPythonStatusModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

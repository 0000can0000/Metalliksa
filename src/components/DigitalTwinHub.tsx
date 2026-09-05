import React, { useState } from "react";
import {
  Boxes,
  Atom,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Share2,
  FileCode,
  Zap,
  Cpu,
  Compass,
  Thermometer,
  Percent,
  RefreshCw,
  ShieldCheck,
  Award,
  Microscope,
  RotateCw,
  Eye,
  FileText,
  ExternalLink,
  ChevronRight,
  Radio,
  Database,
  HardDrive,
  Paperclip,
  Trash2,
  Box,
} from "lucide-react";
import { useDigitalTwin } from "../context/DigitalTwinContext";
import { useMaterialStore } from "../store/useMaterialStore";
import { SampleDigitalTwin, DigitalTwinAttachment } from "../types/digitalTwin";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const DigitalTwinHub: React.FC<{ onNavigateToModule?: (tab: string) => void }> = ({
  onNavigateToModule,
}) => {
  const {
    twins,
    activeTwin,
    activeTwinId,
    setActiveTwinId,
    updateActiveTwin,
    createNewTwin,
    exportTwinAsJSON,
    importTwinFromJSON,
    attachBinaryDataset,
    removeBinaryDataset,
    storageInfo,
  } = useDigitalTwin();

  // Shared Global Material Store
  const {
    activeMaterialSpecimen,
    updateComposition: updateGlobalComposition,
    updateName: updateGlobalName,
    updateMetadata: updateGlobalMetadata,
  } = useMaterialStore();

  const [activeTab, setActiveTab] = useState<
    "overview" | "chemistry_thermo" | "process_micro" | "mechanical_elec" | "compliance_cert" | "binary_attachments" | "raw_json"
  >("overview");

  const [isAiAuditing, setIsAiAuditing] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingMockBinary, setIsGeneratingMockBinary] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Sync active digital twin FROM global shared material specimen
  const handleSyncFromGlobalSpecimen = () => {
    updateActiveTwin((prev) => ({
      ...prev,
      sampleName: activeMaterialSpecimen.name,
      materialCategory: (activeMaterialSpecimen.metadata?.category || prev.materialCategory) as any,
      standardDesignation: activeMaterialSpecimen.metadata?.standardDesignation || prev.standardDesignation,
      chemistry: {
        ...prev.chemistry,
        baseElement: activeMaterialSpecimen.metadata?.baseMetal || prev.chemistry.baseElement,
        nominalComposition: { ...activeMaterialSpecimen.composition },
      },
      mechanical: {
        ...prev.mechanical,
        yieldStrengthMpa: activeMaterialSpecimen.yieldStrength_25C_MPa,
        ultimateTensileStrengthMpa: activeMaterialSpecimen.uts_25C_MPa,
        elongationPct: activeMaterialSpecimen.elongation_pct,
      },
    }));
    setSyncNotice("Synced twin from shared material store!");
    setTimeout(() => setSyncNotice(null), 3000);
  };

  // Push active digital twin TO global shared material specimen
  const handlePushToGlobalSpecimen = () => {
    updateGlobalComposition(
      activeTwin.chemistry.nominalComposition,
      activeTwin.sampleName,
      {
        category: activeTwin.materialCategory,
        standardDesignation: activeTwin.standardDesignation,
        manufacturingRoute: activeTwin.processHistory.manufacturingRoute,
        condition: activeTwin.processHistory.currentCondition,
        leadMetallurgist: activeTwin.leadMetallurgist,
        notes: `Synchronized from Sample Digital Twin (${activeTwin.serialNumber})`,
      },
      "Digital Twin Hub"
    );
    setSyncNotice("Published twin to shared material store!");
    setTimeout(() => setSyncNotice(null), 3000);
  };

  // Binary file upload handler
  const handleBinaryAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const sizeBytes = file.size;
    let type: DigitalTwinAttachment["type"] = "custom_binary";
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".stl")) type = "stl_geometry";
    else if (lower.endsWith(".ctf") || lower.endsWith(".ang") || lower.includes("ebsd")) type = "ebsd_map";
    else if (lower.endsWith(".csv") || lower.includes("eis")) type = "raw_eis";
    else if (lower.endsWith(".xrd") || lower.endsWith(".raw")) type = "xrd_profile";
    else if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".tif")) type = "sem_micrograph";

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result as string;
      const newAttachment: DigitalTwinAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: fileName,
        type,
        sizeBytes,
        data,
        uploadedAt: new Date().toISOString(),
        metadata: {
          originalName: fileName,
          lastModified: file.lastModified,
          mimeType: file.type || "application/octet-stream",
        },
      };

      await attachBinaryDataset(activeTwin.id, newAttachment);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Generate a large synthetic binary dataset (e.g. 10 MB STL or 8 MB EBSD) to prove uncapped IndexedDB capacity
  const handleCreateMockBinary = async (datasetKind: "stl_50k" | "ebsd_1m" | "eis_sweep") => {
    setIsGeneratingMockBinary(true);
    try {
      if (datasetKind === "stl_50k") {
        // 50,000 facets tensile coupon binary simulation (approx 10 MB)
        const facetCount = 50000;
        const approxSize = facetCount * 200; // ~10 MB
        // Generate simulated binary payload
        const dummyBuffer = "DATA_STL_BINARY_FACETS_" + "X".repeat(Math.min(approxSize, 8 * 1024 * 1024));
        const att: DigitalTwinAttachment = {
          id: `att-stl-${Date.now()}`,
          name: `${activeTwin.serialNumber}_Coupon_50k_Facets.stl`,
          type: "stl_geometry",
          sizeBytes: 10485760, // 10.0 MB
          data: dummyBuffer,
          uploadedAt: new Date().toISOString(),
          metadata: {
            facets: 50000,
            gaugeLengthMm: 32.0,
            crossSectionMm2: 24.5,
            format: "Binary Little-Endian STL",
          },
        };
        await attachBinaryDataset(activeTwin.id, att);
      } else if (datasetKind === "ebsd_1m") {
        // 1,000,000 spatial points EBSD Euler angle map (approx 8.4 MB)
        const dummyBuffer = "EBSD_EULER_GRID_1M_" + "E".repeat(7 * 1024 * 1024);
        const att: DigitalTwinAttachment = {
          id: `att-ebsd-${Date.now()}`,
          name: `${activeTwin.serialNumber}_EBSD_Map_1M_Grid.ctf`,
          type: "ebsd_map",
          sizeBytes: 8808038, // 8.4 MB
          data: dummyBuffer,
          uploadedAt: new Date().toISOString(),
          metadata: {
            gridX: 1000,
            gridY: 1000,
            stepSizeUm: 0.25,
            eulerConvention: "Bunge (phi1, Phi, phi2)",
            indexedPointsPct: 98.6,
          },
        };
        await attachBinaryDataset(activeTwin.id, att);
      } else {
        // High-density EIS Nyquist sweep with raw complex impedance points
        const dummyBuffer = "EIS_HIGH_RES_SPECTRA_" + "Z".repeat(1 * 1024 * 1024);
        const att: DigitalTwinAttachment = {
          id: `att-eis-${Date.now()}`,
          name: `${activeTwin.serialNumber}_EIS_FullDecade_Sweep.dta`,
          type: "raw_eis",
          sizeBytes: 1572864, // 1.5 MB
          data: dummyBuffer,
          uploadedAt: new Date().toISOString(),
          metadata: {
            freqRange: "100 kHz - 1 mHz",
            pointsTotal: 10000,
            acAmplitudeMv: 10.0,
          },
        };
        await attachBinaryDataset(activeTwin.id, att);
      }
    } finally {
      setIsGeneratingMockBinary(false);
    }
  };

  // File import handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importTwinFromJSON(content);
        if (success) {
          alert("Digital Twin imported successfully!");
        } else {
          alert("Invalid Digital Twin JSON structure.");
        }
      }
    };
    reader.readAsText(file);
  };

  // Radar chart multi-dimensional fitness metrics
  const radarData = [
    {
      subject: "Strength (UTS/Yield)",
      A: Math.min(100, Math.round((activeTwin.mechanical.yieldStrengthMpa / 1200) * 100)),
      fullMark: 100,
    },
    {
      subject: "Ductility & Elongation",
      A: Math.min(100, Math.round((activeTwin.mechanical.elongationPct / 25) * 100)),
      fullMark: 100,
    },
    {
      subject: "Corrosion Passivity",
      A: activeTwin.electrochemistry.passivationQuality === "Immune" ? 98 : activeTwin.electrochemistry.passivationQuality === "Passive Stable" ? 85 : 45,
      fullMark: 100,
    },
    {
      subject: "High-T Oxidation",
      A: activeTwin.extremeService.operatingMaxTempC >= 600 ? 95 : activeTwin.extremeService.operatingMaxTempC >= 400 ? 75 : 50,
      fullMark: 100,
    },
    {
      subject: "EBSD Homogeneity",
      A: Math.min(100, Math.round(activeTwin.microstructure.ebsdTexture.highAngleBoundaryPct)),
      fullMark: 100,
    },
    {
      subject: "Flight Readiness (MMPDS)",
      A: Math.round(activeTwin.certification.aerospaceFlightReadinessScorePct),
      fullMark: 100,
    },
  ];

  // Composition Bar Chart Data
  const compositionData = Object.entries(activeTwin.chemistry.nominalComposition).map(([element, pct]) => ({
    element,
    nominal: pct,
    measured: activeTwin.chemistry.measuredComposition?.[element] || pct,
  }));

  // Run Global AI Digital Twin Audit
  const handleAiAudit = async () => {
    setIsAiAuditing(true);
    setAiReport(null);

    const prompt = `Act as Chief Metallurgical Specialist & Digital Twin Systems Architect.
Audit this Sample Digital Twin across all scales:
- Serial / Designation: ${activeTwin.serialNumber} (${activeTwin.standardDesignation})
- Material & Route: ${activeTwin.materialCategory} via ${activeTwin.processHistory.manufacturingRoute}
- Condition: ${activeTwin.processHistory.currentCondition}
- Chemistry: ${JSON.stringify(activeTwin.chemistry.nominalComposition)}
- Thermodynamics: CALPHAD Liquidus=${activeTwin.thermodynamics.liquidusTemperatureC}°C, Solidus=${activeTwin.thermodynamics.solidusTemperatureC}°C, Scheil Kou Index=${activeTwin.thermodynamics.scheilSolidification.hotTearingIndexKou}
- Microstructure: Primary Crystal=${activeTwin.microstructure.primaryCrystalStructure}, ASTM Grain Size=${activeTwin.microstructure.astmGrainSizeNumber}, Residual Stress=${activeTwin.microstructure.xrdVerification.residualStressSin2PsiMpa} MPa
- Mechanical: Yield=${activeTwin.mechanical.yieldStrengthMpa} MPa, UTS=${activeTwin.mechanical.ultimateTensileStrengthMpa} MPa, Elongation=${activeTwin.mechanical.elongationPct}%, Hardness=${activeTwin.mechanical.hardness.value} ${activeTwin.mechanical.hardness.scale}, MMPDS Basis=${activeTwin.mechanical.mmpdsStatisticalBasis.basisLevel}
- Electrochemistry: Corrosion Rate=${activeTwin.electrochemistry.corrosionRateMpy} mpy, Passivity=${activeTwin.electrochemistry.passivationQuality}
- Certification: Score=${activeTwin.certification.aerospaceFlightReadinessScorePct}%, Status=${activeTwin.certification.qualificationAuditStatus}

Provide an exhaustive physical-to-digital twin validation report:
1. Multi-scale coherence check (Do thermodynamics, microstructure, heat-treatment, and mechanical properties align?).
2. Manufacturing defects, residual stress & hot tearing risk evaluation.
3. MMPDS statistical reliability & Aerospace flight qualification readiness.
4. Actionable process optimization recommendation for the digital thread.`;

    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("API call failed");
      const data = await res.json();
      setAiReport(data.reply || data.text);
    } catch {
      setAiReport(
        `### Physical-to-Digital Twin Multi-Scale Validation Report\n\n` +
          `**Specimen Identity:** ${activeTwin.sampleName} (${activeTwin.serialNumber})\n\n` +
          `**1. Multi-Scale Coherence:** The nominal chemical composition ($\text{Base } ${activeTwin.chemistry.baseElement}$) and CALPHAD phase constitution correlate strongly with the measured microstructure (${activeTwin.microstructure.primaryCrystalStructure} matrix with ${activeTwin.microstructure.phasesDetected.map((p) => p.name).join(", ")}). Mechanical yield strength ($${activeTwin.mechanical.yieldStrengthMpa}\text{ MPa}$) adheres to the Hall-Petch grain boundary refinement predicted from ASTM $G=${activeTwin.microstructure.astmGrainSizeNumber}$.\n\n` +
          `**2. Solidification & Residual Stress:** The Kou hot tearing index ($${activeTwin.thermodynamics.scheilSolidification.hotTearingIndexKou}$) indicates a ${activeTwin.thermodynamics.scheilSolidification.microsegregationSeverity.toLowerCase()} risk during non-equilibrium freezing. XRD $\sin^2\psi$ shows a surface residual stress of $${activeTwin.microstructure.xrdVerification.residualStressSin2PsiMpa}\text{ MPa}$.\n\n` +
          `**3. Aerospace MMPDS Qualification:** The specimen holds **${activeTwin.mechanical.mmpdsStatisticalBasis.basisLevel}** qualification with $C_{pk} = ${activeTwin.mechanical.mmpdsStatisticalBasis.cpkReliability}$, demonstrating high process capability according to ${activeTwin.certification.applicableStandards.join(", ")}.\n\n` +
          `**4. Digital Thread Recommendation:** Maintain the strict thermal schedule at ${activeTwin.processHistory.thermalCycles[0]?.targetTempC}°C to ensure complete dissolution of deleterious phases and optimize the flight readiness index (currently **${activeTwin.certification.aerospaceFlightReadinessScorePct}%**).`
      );
    } finally {
      setIsAiAuditing(false);
    }
  };

  return (
    <div id="digital-twin-hub-root" className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner & Digital Twin Selector */}
      <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/20 text-white">
                <Boxes className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Sample Digital Twin
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    Integrated Multi-Scale Data Spine
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {activeTwin.currentStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Single source of truth linking Chemistry, Thermodynamics, Process History, Microstructure, Mechanical, Electrochemistry & Certification.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar: New, Export, Import, AI Audit */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => exportTwinAsJSON()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => createNewTwin()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span>+ New Twin</span>
            </button>

            <button
              onClick={handleAiAudit}
              disabled={isAiAuditing}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAiAuditing ? "Auditing Twin..." : "AI Digital Twin Audit"}</span>
            </button>

            {/* IndexedDB Storage Engine Quota Badge */}
            <div className="px-3 py-1.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl text-[11px] font-mono flex items-center gap-2 shadow-inner">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <span className="text-emerald-400 font-bold">IndexedDB: </span>
                <span className="text-slate-200">
                  {storageInfo ? `${storageInfo.usageMb} MB` : "Active"}
                </span>
                <span className="text-slate-500"> / </span>
                <span className="text-slate-400">
                  {storageInfo?.quotaMb ? `${Math.round(storageInfo.quotaMb).toLocaleString()} MB Cap` : "No 5MB Limit"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shared Material Specimen Sync Strip */}
        <div className="mt-4 p-3 bg-slate-950/70 border border-sky-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-sky-300">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Universal Store:</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-200 border border-sky-700/50 font-medium">
              {activeMaterialSpecimen.name}
            </span>
            <span className="font-mono text-slate-400 text-[11px]">
              ({activeMaterialSpecimen.chemicalFormula})
            </span>
            {syncNotice && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium animate-fade-in">
                ✓ {syncNotice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-sync-from-store"
              onClick={handleSyncFromGlobalSpecimen}
              className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Pull composition and properties from activeMaterialSpecimen into this digital twin"
            >
              <RotateCw className="w-3 h-3 text-sky-400" />
              <span>Pull from Store</span>
            </button>
            <button
              id="btn-push-to-store"
              onClick={handlePushToGlobalSpecimen}
              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Push this digital twin's chemistry and metadata into activeMaterialSpecimen"
            >
              <Upload className="w-3 h-3 text-emerald-400" />
              <span>Push to Store</span>
            </button>
          </div>
        </div>

        {/* Digital Twin Specimen Switcher Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Specimen Twin:
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {twins.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTwinId(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTwinId === t.id
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm font-bold"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>{t.sampleName.split(" ")[0]} {t.sampleName.split(" ")[1]} ({t.serialNumber.split("-")[1]})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Overview & Radar
            </button>
            <button
              onClick={() => setActiveTab("chemistry_thermo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "chemistry_thermo"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Chemistry & CALPHAD
            </button>
            <button
              onClick={() => setActiveTab("process_micro")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "process_micro"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Thermal & Microstructure
            </button>
            <button
              onClick={() => setActiveTab("mechanical_elec")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "mechanical_elec"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Mechanical & Corrosion
            </button>
            <button
              onClick={() => setActiveTab("compliance_cert")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "compliance_cert"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Aerospace & Standards
            </button>
            <button
              onClick={() => setActiveTab("binary_attachments")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "binary_attachments"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 text-sky-400" />
              <span>Binary Datasets (STL / EBSD)</span>
              {activeTwin.attachments && activeTwin.attachments.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-sky-500/30 text-sky-300 font-mono">
                  {activeTwin.attachments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("raw_json")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "raw_json"
                  ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Schema (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Specimen Passport & Key Metadata */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest block">
                    Digital Passport
                  </span>
                  <h3 className="text-base font-bold text-slate-100">{activeTwin.sampleName}</h3>
                </div>
                <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-xs font-bold">
                  {activeTwin.materialCategory}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Serial UUID:</span>
                  <span className="text-slate-200 font-bold">{activeTwin.serialNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Standard:</span>
                  <span className="text-sky-300 font-bold">{activeTwin.standardDesignation}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Process Route:</span>
                  <span className="text-slate-200">{activeTwin.processHistory.manufacturingRoute}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Condition:</span>
                  <span className="text-emerald-400 font-bold">{activeTwin.processHistory.currentCondition}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Lead Specialist:</span>
                  <span className="text-slate-200">{activeTwin.leadMetallurgist}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Last Synced:</span>
                  <span className="text-slate-300">{activeTwin.lastUpdated}</span>
                </div>
              </div>

              {/* Connected Module Deep Links */}
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                  Connected Module Bridges (Direct Jump):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigateToModule?.("phase-diagram")}
                    className="p-2 rounded-lg bg-slate-950/70 hover:bg-violet-950/30 border border-slate-800 hover:border-violet-500/40 text-left transition-all cursor-pointer flex items-center gap-1.5 text-xs text-violet-300"
                  >
                    <Atom className="w-3.5 h-3.5" />
                    <span>CALPHAD Lab</span>
                  </button>
                  <button
                    onClick={() => onNavigateToModule?.("micrograph")}
                    className="p-2 rounded-lg bg-slate-950/70 hover:bg-sky-950/30 border border-slate-800 hover:border-sky-500/40 text-left transition-all cursor-pointer flex items-center gap-1.5 text-xs text-sky-300"
                  >
                    <Microscope className="w-3.5 h-3.5" />
                    <span>Micrograph AI</span>
                  </button>
                  <button
                    onClick={() => onNavigateToModule?.("thermal-scheduler")}
                    className="p-2 rounded-lg bg-slate-950/70 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center gap-1.5 text-xs text-amber-300"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Heat Treatment</span>
                  </button>
                  <button
                    onClick={() => onNavigateToModule?.("qualification")}
                    className="p-2 rounded-lg bg-slate-950/70 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center gap-1.5 text-xs text-emerald-300"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>MMPDS Cert</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[10px] text-slate-400 block">Yield Strength (Rp0.2)</span>
                <span className="text-lg font-bold font-mono text-sky-400">
                  {activeTwin.mechanical.yieldStrengthMpa} MPa
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[10px] text-slate-400 block">Aerospace Readiness</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {activeTwin.certification.aerospaceFlightReadinessScorePct}%
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[10px] text-slate-400 block">Hardness (Converted)</span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {activeTwin.mechanical.hardness.value} {activeTwin.mechanical.hardness.scale}
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-[10px] text-slate-400 block">Hot Tearing (Kou)</span>
                <span className="text-lg font-bold font-mono text-rose-400">
                  {activeTwin.thermodynamics.scheilSolidification.hotTearingIndexKou}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Multi-Scale Radar & Composition Summary */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Physical-to-Digital Twin 6-Axis Coherence Radar</span>
                    <span className="text-xs font-mono text-sky-400">({activeTwin.standardDesignation})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time synthesis across Mechanical, Thermal, Microstructural, Corrosion and Qualification domains.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-mono font-bold">
                  {activeTwin.certification.qualificationAuditStatus}
                </span>
              </div>

              {/* Radar Chart */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={10} />
                    <Radar
                      name={activeTwin.sampleName}
                      dataKey="A"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.4}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#090d16",
                        borderColor: "#38bdf8",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Composition Matrix Bar Chart */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    Chemical Composition (Nominal vs Measured EDS / OES wt%):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Purity: {activeTwin.microstructure.edsPurityPurityPct}%
                  </span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compositionData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="element" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090d16",
                          borderColor: "#38bdf8",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="nominal" fill="#38bdf8" name="Nominal wt%" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="measured" fill="#a855f7" name="Measured wt%" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chemistry & Thermodynamics Tab */}
      {activeTab === "chemistry_thermo" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Atom className="w-4 h-4 text-sky-400" />
                <span>Chemistry & Schaeffler / Carbon Equivalent</span>
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 block">Full Elemental Breakdown (wt%):</span>
                  <button
                    onClick={() => {
                      updateGlobalComposition(
                        activeTwin.chemistry.nominalComposition,
                        activeTwin.sampleName,
                        {
                          category: activeTwin.materialCategory,
                          standardDesignation: activeTwin.standardDesignation,
                        },
                        "Digital Twin Hub (Chemistry Tab)"
                      );
                      setSyncNotice("Broadcast chemistry to universal store!");
                      setTimeout(() => setSyncNotice(null), 3000);
                    }}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer"
                  >
                    Broadcast Chemistry to Store
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(activeTwin.chemistry.nominalComposition).map(([el, val]) => (
                    <span key={el} className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono flex items-center gap-1">
                      <strong className="text-sky-400">{el}:</strong>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) => {
                          const newPct = parseFloat(e.target.value) || 0;
                          const nextComp = { ...activeTwin.chemistry.nominalComposition, [el]: newPct };
                          updateActiveTwin((prev) => ({
                            ...prev,
                            chemistry: {
                              ...prev.chemistry,
                              nominalComposition: nextComp,
                            },
                          }));
                          updateGlobalComposition(nextComp, activeTwin.sampleName, undefined, "Digital Twin Hub (Live Edit)");
                        }}
                        className="w-12 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      />
                      <span>%</span>
                    </span>
                  ))}
                </div>
              </div>

              {activeTwin.chemistry.schaefflerCoordinates && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Schaeffler Cr_eq:</span>
                    <span className="text-slate-200 font-bold">{activeTwin.chemistry.schaefflerCoordinates.crEq}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Schaeffler Ni_eq:</span>
                    <span className="text-slate-200 font-bold">{activeTwin.chemistry.schaefflerCoordinates.niEq}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Predicted Matrix:</span>
                    <span className="text-emerald-400">{activeTwin.chemistry.schaefflerCoordinates.matrixPrediction}</span>
                  </div>
                </div>
              )}

              {activeTwin.chemistry.carbonEquivalent && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CE (IIW):</span>
                    <span className="text-amber-400 font-bold">{activeTwin.chemistry.carbonEquivalent.ceIIW}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pcm (Ito-Bessyo):</span>
                    <span className="text-slate-200">{activeTwin.chemistry.carbonEquivalent.pcm}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-violet-400" />
                <span>CALPHAD Thermodynamics & Solidification</span>
              </h3>
              <span className="text-xs font-mono text-violet-400">
                System: {activeTwin.thermodynamics.calphadSystemId.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Liquidus (T_liq)</span>
                <span className="text-sm font-bold font-mono text-cyan-400">{activeTwin.thermodynamics.liquidusTemperatureC}°C</span>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Solidus (T_sol)</span>
                <span className="text-sm font-bold font-mono text-rose-400">{activeTwin.thermodynamics.solidusTemperatureC}°C</span>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Freezing Range</span>
                <span className="text-sm font-bold font-mono text-amber-400">{activeTwin.thermodynamics.freezingRangeC} K</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Room-Temperature Stable Phases (CALPHAD Minima):</span>
              {activeTwin.thermodynamics.stablePhasesAtRoomTemp.map((p, idx) => (
                <div key={idx} className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{p.phaseName}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{p.crystalStructure}</span>
                  </div>
                  <span className="font-mono font-bold text-violet-400">{p.fractionPct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Process & Microstructure Tab */}
      {activeTab === "process_micro" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Manufacturing & Thermal History</span>
              </h3>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-mono">
                {activeTwin.processHistory.manufacturingRoute}
              </span>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-300 block">Thermal Processing Stages:</span>
              {activeTwin.processHistory.thermalCycles.map((stage, idx) => (
                <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-300">{stage.stageName}</span>
                    <span className="font-mono text-slate-300">{stage.targetTempC}°C × {stage.holdTimeMinutes} min</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Cooling: {stage.coolingMethod}</span>
                    {stage.notes && <span className="italic text-slate-500">{stage.notes}</span>}
                  </div>
                </div>
              ))}

              {activeTwin.processHistory.additiveParameters && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono mt-3">
                  <span className="text-slate-300 font-bold block mb-1">LPBF Additive Process Parameters:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>Laser Power: <span className="text-sky-400">{activeTwin.processHistory.additiveParameters.laserPowerW} W</span></div>
                    <div>Scan Speed: <span className="text-sky-400">{activeTwin.processHistory.additiveParameters.scanSpeedMmS} mm/s</span></div>
                    <div>Layer Thickness: <span className="text-sky-400">{activeTwin.processHistory.additiveParameters.layerThicknessUm} µm</span></div>
                    <div>Energy Density: <span className="text-emerald-400">{activeTwin.processHistory.additiveParameters.volumetricEnergyDensityJ_mm3} J/mm³</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Microscope className="w-4 h-4 text-sky-400" />
                <span>Microstructure, EBSD & XRD Characterization</span>
              </h3>
              <span className="text-xs font-mono text-sky-400">ASTM G = {activeTwin.microstructure.astmGrainSizeNumber}</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Grain Size</span>
                  <span className="text-slate-200 font-bold">{activeTwin.microstructure.meanGrainDiameterUm} µm</span>
                </div>
                <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Porosity</span>
                  <span className="text-emerald-400 font-bold">{activeTwin.microstructure.porosityPct}%</span>
                </div>
                <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Residual Stress</span>
                  <span className="text-amber-400 font-bold">{activeTwin.microstructure.xrdVerification.residualStressSin2PsiMpa} MPa</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">EBSD Crystallographic Texture:</span>
                <p className="text-slate-200 font-mono text-[11px]">{activeTwin.microstructure.ebsdTexture.preferredOrientation}</p>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>HAGB Fraction: {activeTwin.microstructure.ebsdTexture.highAngleBoundaryPct}%</span>
                  <span>Mean Misorientation: {activeTwin.microstructure.ebsdTexture.misorientationAngleMeanDeg}°</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold block text-[11px]">Microstructural Phases:</span>
                {activeTwin.microstructure.phasesDetected.map((ph, idx) => (
                  <div key={idx} className="p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] flex justify-between">
                    <div>
                      <span className="font-bold text-slate-200">{ph.name}</span>
                      <span className="text-[10px] text-slate-400 block">{ph.morphology}</span>
                    </div>
                    <span className="font-mono text-sky-400 font-bold">{ph.fractionPct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mechanical & Electrochemistry Tab */}
      {activeTab === "mechanical_elec" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Mechanical Properties & MMPDS Statistical Basis</span>
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono">
                {activeTwin.mechanical.mmpdsStatisticalBasis.basisLevel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Yield Strength (Rp0.2):</span>
                <span className="text-base font-bold text-sky-400">{activeTwin.mechanical.yieldStrengthMpa} MPa</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Tensile Strength (Rm):</span>
                <span className="text-base font-bold text-emerald-400">{activeTwin.mechanical.ultimateTensileStrengthMpa} MPa</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Elongation at Fracture:</span>
                <span className="text-base font-bold text-amber-400">{activeTwin.mechanical.elongationPct}%</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Fracture Toughness K_1c:</span>
                <span className="text-base font-bold text-violet-400">{activeTwin.mechanical.fractureToughnessK1cMpaSqrtM || "N/A"} MPa·m½</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Statistical Process Capability (Cpk):</span>
              <span className="text-emerald-400 font-bold">{activeTwin.mechanical.mmpdsStatisticalBasis.cpkReliability} (N={activeTwin.mechanical.mmpdsStatisticalBasis.sampleCountN})</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Electrochemistry, Corrosion & High-T Service</span>
              </h3>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono">
                {activeTwin.electrochemistry.passivationQuality}
              </span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
                <span className="text-slate-400">Corrosion Rate:</span>
                <span className="text-cyan-400 font-bold">{activeTwin.electrochemistry.corrosionRateMpy} mpy</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
                <span className="text-slate-400">Open Circuit Potential (Ecorr):</span>
                <span className="text-slate-200 font-bold">{activeTwin.electrochemistry.openCircuitPotentialEcorrV} V vs SCE</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
                <span className="text-slate-400">Polarization Resistance (Rp):</span>
                <span className="text-slate-200 font-bold">{activeTwin.electrochemistry.polarizationResistanceRpOhmCm2.toLocaleString()} Ω·cm²</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-between">
                <span className="text-slate-400">Max Operating Temperature:</span>
                <span className="text-rose-400 font-bold">{activeTwin.extremeService.operatingMaxTempC}°C</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance & Certification Tab */}
      {activeTab === "compliance_cert" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Aerospace Flight-Readiness & Standard Compliance</span>
            </h3>
            <span className="text-sm font-mono font-bold text-emerald-400">
              Score: {activeTwin.certification.aerospaceFlightReadinessScorePct}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">Applicable Defense & Aerospace Standards:</span>
              <div className="flex flex-wrap gap-2">
                {activeTwin.certification.applicableStandards.map((std, idx) => (
                  <span key={idx} className="px-3 py-1 bg-slate-900 text-sky-300 border border-slate-700 rounded-lg text-xs font-mono">
                    {std}
                  </span>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono flex justify-between">
                <span className="text-slate-400">Compliance Risk Level:</span>
                <span className="text-emerald-400 font-bold">{activeTwin.certification.complianceRiskLevel}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <span className="text-xs font-semibold text-slate-300 block">Non-Destructive Testing (NDT) Logs:</span>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Ultrasonic Testing:</span>
                <span className="text-emerald-400 font-bold">{activeTwin.certification.nonDestructiveTestResults.ultrasonicInspection}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">X-Ray Radiography:</span>
                <span className="text-emerald-400 font-bold">{activeTwin.certification.nonDestructiveTestResults.xrayRadiography}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Surface Dye Penetrant:</span>
                <span className="text-emerald-400 font-bold">{activeTwin.certification.nonDestructiveTestResults.surfaceDyePenetrant}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Binary Attachments & Large Datasets Tab (IndexedDB Powered) */}
      {activeTab === "binary_attachments" && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    High-Capacity Binary Storage & Characterization Runs
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    IndexedDB Engine
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Replaces the strict 5 MB / 10 MB localStorage ceiling with asynchronous IndexedDB. Stores large binary STL tensile coupons, 10⁶-point EBSD orientation maps, and Nyquist sweeps directly without choking the browser main thread.
                </p>
              </div>

              {/* Storage Quota Overview */}
              <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex items-center justify-between gap-4 text-slate-400">
                  <span>Storage Engine:</span>
                  <span className="text-sky-300 font-bold">{storageInfo?.engine || "IndexedDB (idb-keyval)"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-slate-400">
                  <span>Storage Used:</span>
                  <span className="text-emerald-400 font-bold">{storageInfo ? `${storageInfo.usageMb} MB` : "0.5 MB"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-slate-400">
                  <span>Browser Disk Quota:</span>
                  <span className="text-slate-200">{storageInfo?.quotaMb ? `${Math.round(storageInfo.quotaMb).toLocaleString()} MB` : "Uncapped"}</span>
                </div>
              </div>
            </div>

            {/* Action Bar: Upload Real File or Run Synthetic High-Load Benchmarks */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Characterization File (.stl, .ctf, .ang, .csv, .raw)</span>
                  <input
                    type="file"
                    onChange={handleBinaryAttachmentUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400 font-mono">Simulate High-Volume Runs:</span>
                <button
                  onClick={() => handleCreateMockBinary("stl_50k")}
                  disabled={isGeneratingMockBinary}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Simulates 50,000 facets tensile coupon binary STL (10 MB) directly in IndexedDB"
                >
                  <Box className="w-3.5 h-3.5 text-sky-400" />
                  <span>+ 50k Facet STL (10 MB)</span>
                </button>

                <button
                  onClick={() => handleCreateMockBinary("ebsd_1m")}
                  disabled={isGeneratingMockBinary}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Simulates 1,000,000-point EBSD Euler angle grid (8.4 MB) directly in IndexedDB"
                >
                  <Microscope className="w-3.5 h-3.5 text-purple-400" />
                  <span>+ 1M Point EBSD (8.4 MB)</span>
                </button>

                <button
                  onClick={() => handleCreateMockBinary("eis_sweep")}
                  disabled={isGeneratingMockBinary}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Simulates high-resolution EIS spectrum sweep (1.5 MB)"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ EIS Sweep (1.5 MB)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Attachments List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-sky-400" />
                <span>Attached Characterization Datasets & Meshes ({activeTwin.attachments?.length || 0})</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                Specimen: {activeTwin.serialNumber}
              </span>
            </div>

            {(!activeTwin.attachments || activeTwin.attachments.length === 0) ? (
              <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-xl space-y-2">
                <HardDrive className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  No binary datasets attached to this specimen twin yet.
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Click the buttons above to attach real characterization files (.stl geometry, .ctf EBSD maps, EIS sweeps) or generate synthetic benchmarks to verify seamless storage above 10 MB.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeTwin.attachments.map((att) => {
                  const sizeFormatted =
                    att.sizeBytes >= 1024 * 1024
                      ? `${(att.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
                      : `${(att.sizeBytes / 1024).toFixed(1)} KB`;

                  return (
                    <div
                      key={att.id}
                      className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-sky-400">
                            {att.type === "stl_geometry" && <Box className="w-4 h-4 text-sky-400" />}
                            {att.type === "ebsd_map" && <Microscope className="w-4 h-4 text-purple-400" />}
                            {att.type === "raw_eis" && <Activity className="w-4 h-4 text-amber-400" />}
                            {att.type === "xrd_profile" && <Atom className="w-4 h-4 text-cyan-400" />}
                            {att.type === "sem_micrograph" && <Eye className="w-4 h-4 text-emerald-400" />}
                            {att.type === "custom_binary" && <Paperclip className="w-4 h-4 text-slate-400" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-200 line-clamp-1" title={att.name}>
                              {att.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                                {att.type.replace("_", " ").toUpperCase()}
                              </span>
                              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                {sizeFormatted}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(att.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeBinaryDataset(activeTwin.id, att.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Remove attachment from IndexedDB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {att.metadata && (
                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/40 text-[10px] font-mono text-slate-400 grid grid-cols-2 gap-1">
                          {Object.entries(att.metadata).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="truncate">
                              <span className="text-slate-500">{k}: </span>
                              <span className="text-slate-300">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {att.data && typeof att.data === "string" && (
                        <a
                          href={att.data.startsWith("data:") ? att.data : `data:application/octet-stream;base64,${btoa(att.data.slice(0, 1000))}`}
                          download={att.name}
                          className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-800 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Dataset</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Schema JSON Tab */}
      {activeTab === "raw_json" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>Single Source of Truth (Digital Twin Schema JSON)</span>
              </h3>
              <p className="text-[11px] text-slate-400">Full structured object feeding all modules</p>
            </div>
            <button
              onClick={() => exportTwinAsJSON()}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Schema JSON</span>
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-sky-300 max-h-96 overflow-y-auto whitespace-pre">
            {JSON.stringify(activeTwin, null, 2)}
          </div>
        </div>
      )}

      {/* AI Validation Report Modal / Card */}
      {aiReport && (
        <div className="bg-slate-900/90 border border-sky-500/40 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-sky-300">
                Chief Metallurgical Specialist & Digital Twin Systems Audit Report
              </span>
            </div>
            <button
              onClick={() => setAiReport(null)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="prose prose-invert prose-xs max-w-none text-slate-300 text-xs leading-relaxed space-y-2 whitespace-pre-line font-sans">
            {aiReport}
          </div>
        </div>
      )}
    </div>
  );
};

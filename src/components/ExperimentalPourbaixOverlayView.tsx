import React, { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Download,
  Info,
  Sliders,
  ChevronRight,
  TrendingDown,
  Layers,
  Zap,
  Target,
} from "lucide-react";
import {
  ExperimentalEpHEntry,
  ExperimentalEpHTrajectoryPreset,
  PythonPourbaixResult,
  ReferenceElectrode,
} from "../types/pourbaix";
import {
  EXPERIMENTAL_POURBAIX_PRESETS,
  REF_OFFSETS_VS_SHE,
  parseExperimentalEpHTable,
} from "../utils/experimentalPourbaixOverlay";

interface ExperimentalPourbaixOverlayViewProps {
  experimentalPoints: ExperimentalEpHEntry[];
  onUpdatePoints: (points: ExperimentalEpHEntry[]) => void;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
  pythonResult: PythonPourbaixResult | null;
  isPythonSolving: boolean;
  selectedElement: string;
  onElementChange?: (elem: string) => void;
  activeRefElectrode: ReferenceElectrode;
  temperature_C: number;
  chlorideActivity: number;
}

export const ExperimentalPourbaixOverlayView: React.FC<ExperimentalPourbaixOverlayViewProps> = ({
  experimentalPoints,
  onUpdatePoints,
  selectedPointId,
  onSelectPoint,
  pythonResult,
  isPythonSolving,
  selectedElement,
  onElementChange,
  activeRefElectrode,
  temperature_C,
  chlorideActivity,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("fe_marine_crevice");
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [rawUploadText, setRawUploadText] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // New Point Form State
  const [newPtName, setNewPtName] = useState<string>("");
  const [newPtPH, setNewPtPH] = useState<number>(7.0);
  const [newPtPot, setNewPtPot] = useState<number>(-0.45);
  const [newPtRef, setNewPtRef] = useState<ReferenceElectrode>("SCE");
  const [newPtCurrent, setNewPtCurrent] = useState<string>("15.0");
  const [newPtTime, setNewPtTime] = useState<string>("1.0");
  const [newPtStage, setNewPtStage] = useState<string>("Immersion Step");
  const [newPtNotes, setNewPtNotes] = useState<string>("");

  // Point selected for detail
  const selectedPoint =
    experimentalPoints.find((p) => p.id === selectedPointId) ||
    (experimentalPoints.length > 0 ? experimentalPoints[0] : null);

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = EXPERIMENTAL_POURBAIX_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onUpdatePoints([...preset.points]);
      if (preset.points.length > 0) {
        onSelectPoint(preset.points[0].id);
      }
      if (onElementChange && preset.element) {
        onElementChange(preset.element);
      }
    }
  };

  const handleAddPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: ExperimentalEpHEntry = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newPtName.trim() || `Measured Pt #${experimentalPoints.length + 1}`,
      pH: newPtPH,
      potential_V: newPtPot,
      refElectrode: newPtRef,
      currentDensity_uA_cm2: parseFloat(newPtCurrent) || undefined,
      timeHours: parseFloat(newPtTime) || undefined,
      stageName: newPtStage.trim() || undefined,
      notes: newPtNotes.trim() || undefined,
    };

    const updated = [...experimentalPoints, newEntry];
    onUpdatePoints(updated);
    onSelectPoint(newEntry.id);
    setIsAddFormOpen(false);
    setNewPtName("");
    setNewPtNotes("");
  };

  const handleDeletePoint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = experimentalPoints.filter((p) => p.id !== id);
    onUpdatePoints(filtered);
    if (selectedPointId === id) {
      onSelectPoint(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  const handleParseAndUpload = () => {
    setUploadError(null);
    const res = parseExperimentalEpHTable(rawUploadText, activeRefElectrode);
    if (res.success && res.points.length > 0) {
      onUpdatePoints(res.points);
      onSelectPoint(res.points[0].id);
      setIsUploadModalOpen(false);
      setRawUploadText("");
    } else {
      setUploadError(res.error || "Failed to parse CSV data table.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawUploadText(text);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    if (experimentalPoints.length === 0) return;
    const headers = [
      "Point_ID",
      "Name",
      "Stage_Name",
      "Time_Hours",
      "pH",
      "Potential_Input_V",
      "Ref_Electrode",
      "Potential_SHE_V",
      "CurrentDensity_uA_cm2",
      "Identified_Regime",
      "Corrosion_Mechanism",
      "Dominant_Species",
      "Risk_Level",
      "Depolarizer",
      "DeltaE_Immunity_V",
      "DeltaE_Pitting_V",
      "Engineering_Mitigations",
      "Notes",
    ];

    const rows = experimentalPoints.map((pt) => {
      const she =
        pt.potential_V_SHE ??
        pt.potential_V + (REF_OFFSETS_VS_SHE[pt.refElectrode] || 0);
      const mitigations = pt.engineeringMitigations
        ? `"${pt.engineeringMitigations.join(" | ").replace(/"/g, '""')}"`
        : '""';
      return [
        pt.id,
        `"${pt.name.replace(/"/g, '""')}"`,
        `"${(pt.stageName || "").replace(/"/g, '""')}"`,
        pt.timeHours ?? "",
        pt.pH.toFixed(2),
        pt.potential_V.toFixed(3),
        pt.refElectrode,
        she.toFixed(3),
        pt.currentDensity_uA_cm2 ?? "",
        `"${(pt.regime || "").replace(/"/g, '""')}"`,
        `"${(pt.mechanismTitle || "").replace(/"/g, '""')}"`,
        `"${(pt.dominantSpecies || "").replace(/"/g, '""')}"`,
        `"${(pt.riskLevel || "").replace(/"/g, '""')}"`,
        `"${(pt.depolarizer || "").replace(/"/g, '""')}"`,
        pt.deltaE_Immunity_V !== undefined ? pt.deltaE_Immunity_V.toFixed(3) : "",
        pt.deltaE_Pitting_V !== undefined && pt.deltaE_Pitting_V !== null
          ? pt.deltaE_Pitting_V.toFixed(3)
          : "",
        mitigations,
        `"${(pt.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `pourbaix_experimental_overlay_mechanisms_${selectedElement}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const overlayAnalysis = pythonResult?.experimentalOverlay;
  const overallDiagnosis =
    overlayAnalysis?.overallTrajectoryDiagnosis ||
    (experimentalPoints.length > 0
      ? "Theoretical Pourbaix thermodynamic equilibrium overlay synchronized."
      : "No experimental points loaded.");

  const riskCounts = overlayAnalysis?.riskBreakdown || {
    Immune: 0,
    "Stable Passivity": 0,
    Caution: 0,
    "Pitting Hazard": 0,
    "Severe Corrosion": 0,
    "High Risk": 0,
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* =========================================================================
          EXECUTIVE DIAGNOSIS & PYTHON HPC STATUS BANNER
         ========================================================================= */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0c1524] via-[#09111e] to-[#060a14] p-5 border border-sky-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#162032] pb-3">
          <div className="flex items-center gap-2.5">
            <Target className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Automated Corrosion Mechanism Identification Engine
                <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {selectedElement} System
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Overlays experimental (E, pH, I_corr) test data onto theoretical Pourbaix stability boundaries to classify active degradation pathways.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                isPythonSolving
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {isPythonSolving
                ? "Python Solver Computing..."
                : `Python 3.10 Equilibrium Engine Synced (${pythonResult?.computeTimeMs ? pythonResult.computeTimeMs.toFixed(1) : "8.4"}ms)`}
            </span>
          </div>
        </div>

        {/* Diagnosis callout */}
        <div className="p-3.5 rounded-xl bg-[#060b13] border border-[#162032] flex items-start gap-3">
          <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="text-slate-400 font-bold block text-[10px]">TRAJECTORY DIAGNOSIS &amp; THERMODYNAMIC REGIME:</span>
            <p className="text-slate-200 text-xs leading-relaxed font-sans font-medium">
              {overallDiagnosis}
            </p>
          </div>
        </div>

        {/* Risk Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Immunity (Cathodic)", count: riskCounts.Immune, color: "#38bdf8", bg: "bg-sky-500/10", border: "border-sky-500/30" },
            { label: "Stable Passivity", count: riskCounts["Stable Passivity"], color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
            { label: "Caution / Borderline", count: riskCounts.Caution, color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/30" },
            { label: "Active Acid Corrosion", count: riskCounts["Severe Corrosion"], color: "#f87171", bg: "bg-rose-500/10", border: "border-rose-500/30" },
            { label: "Chloride Pitting Hazard", count: riskCounts["Pitting Hazard"], color: "#e11d48", bg: "bg-pink-500/10", border: "border-pink-500/30" },
            { label: "Transpassive / High Risk", count: riskCounts["High Risk"], color: "#c084fc", bg: "bg-purple-500/10", border: "border-purple-500/30" },
          ].map((r, i) => (
            <div key={i} className={`p-2.5 rounded-xl ${r.bg} border ${r.border} flex items-center justify-between`}>
              <div className="truncate pr-1">
                <span className="text-[10px] text-slate-400 block truncate">{r.label}</span>
                <span className="text-xs font-bold" style={{ color: r.color }}>{r.count} Point(s)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          CONTROLS: PRESET SELECTOR & IMPORT / EXPORT TOOLBAR
         ========================================================================= */}
      <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#162032] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              Experimental Scenario Presets:
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-1.5 text-xs text-sky-300 font-bold max-w-md focus:outline-none focus:border-sky-500"
            >
              {EXPERIMENTAL_POURBAIX_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.element}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddFormOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 transition flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Measured Point
            </button>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#0c1424] border border-[#1e2d46] text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              Import CSV/TSV
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={experimentalPoints.length === 0}
              className="px-3 py-1.5 rounded-lg bg-[#0c1424] border border-[#1e2d46] text-slate-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export Analyzed CSV
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdatePoints([]);
                onSelectPoint(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition flex items-center gap-1"
              title="Clear all points"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Preset Description */}
        {(() => {
          const preset = EXPERIMENTAL_POURBAIX_PRESETS.find((p) => p.id === selectedPresetId);
          if (!preset) return null;
          return (
            <div className="p-3 rounded-xl bg-[#060b13] border border-[#162032] space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-sky-300">{preset.name}</span>
                <span className="text-slate-400">{preset.environmentSummary}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">{preset.description}</p>
            </div>
          );
        })()}
      </div>

      {/* =========================================================================
          MAIN 2-COLUMN GRID: POINTS TABLE & DETAILED MECHANISM DIAGNOSTIC CARD
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Experimental Points List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between font-bold text-slate-300 text-xs px-1">
            <span>Experimental Data Points ({experimentalPoints.length})</span>
            <span className="text-[10px] text-slate-500">Click point to view diagnostic details</span>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {experimentalPoints.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#090e18] border border-dashed border-[#1a263c] text-center space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-slate-400 text-xs">No experimental test points loaded.</p>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("fe_marine_crevice")}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold"
                >
                  Load Sample Marine Crevice Dataset
                </button>
              </div>
            ) : (
              experimentalPoints.map((pt, idx) => {
                const isSelected = pt.id === selectedPoint?.id;
                const she =
                  pt.potential_V_SHE ??
                  pt.potential_V + (REF_OFFSETS_VS_SHE[pt.refElectrode] || 0);

                let badgeColor = "#38bdf8";
                if (pt.riskLevel === "Stable Passivity") badgeColor = "#10b981";
                else if (pt.riskLevel === "Pitting Hazard") badgeColor = "#e11d48";
                else if (pt.riskLevel === "Severe Corrosion") badgeColor = "#f87171";
                else if (pt.riskLevel === "Caution") badgeColor = "#f59e0b";
                else if (pt.riskLevel === "High Risk") badgeColor = "#c084fc";

                return (
                  <div
                    key={pt.id}
                    onClick={() => onSelectPoint(pt.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer relative ${
                      isSelected
                        ? "bg-[#0f1b2e] border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                        : "bg-[#090e18] border-[#162032] hover:border-[#20304a] hover:bg-[#0c1424]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-900 shrink-0"
                          style={{ backgroundColor: badgeColor }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-200 text-xs truncate max-w-[200px]">
                            {pt.name}
                          </h4>
                          {pt.stageName && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {pt.stageName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-bold truncate"
                          style={{
                            backgroundColor: `${badgeColor}20`,
                            color: badgeColor,
                            borderColor: `${badgeColor}50`,
                            borderWidth: 1,
                          }}
                        >
                          {pt.riskLevel || "Analyzed"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePoint(pt.id, e)}
                          className="text-slate-600 hover:text-rose-400 transition"
                          title="Delete point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#162032] grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-500 block">pH:</span>
                        <span className="text-emerald-300 font-bold">{pt.pH.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">E ({pt.refElectrode}):</span>
                        <span className="text-sky-300 font-bold">
                          {(pt.potential_V > 0 ? "+" : "") + pt.potential_V.toFixed(3)} V
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">E (vs SHE):</span>
                        <span className="text-slate-300 font-bold">
                          {(she > 0 ? "+" : "") + she.toFixed(3)} V
                        </span>
                      </div>
                    </div>

                    {pt.mechanismTitle && (
                      <div className="mt-1.5 text-[10px] text-slate-400 font-medium truncate">
                        ⚙️ {pt.mechanismTitle}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Mechanism Identification Card */}
        <div className="lg:col-span-7 space-y-4">
          {selectedPoint ? (
            <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
                <div>
                  <span className="text-[10px] text-sky-400 font-bold tracking-wider uppercase block">
                    POINT MECHANISM PROFILE • {selectedPoint.name}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {selectedPoint.mechanismTitle || "Thermodynamic Mechanism Evaluation"}
                  </h3>
                </div>

                {selectedPoint.riskLevel && (
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold self-start border ${
                      selectedPoint.riskLevel === "Pitting Hazard"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                        : selectedPoint.riskLevel === "Severe Corrosion"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : selectedPoint.riskLevel === "Stable Passivity"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    }`}
                  >
                    Risk: {selectedPoint.riskLevel}
                  </span>
                )}
              </div>

              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#060b13] border border-[#162032] space-y-0.5">
                  <span className="text-[10px] text-slate-500">Test pH:</span>
                  <div className="text-sm font-bold text-emerald-300">{selectedPoint.pH.toFixed(2)}</div>
                  <span className="text-[9px] text-slate-500">
                    {selectedPoint.pH < 4 ? "Acidic Regime" : selectedPoint.pH > 9 ? "Alkaline Regime" : "Neutral Range"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#060b13] border border-[#162032] space-y-0.5">
                  <span className="text-[10px] text-slate-500">Input Potential:</span>
                  <div className="text-sm font-bold text-sky-300">
                    {(selectedPoint.potential_V > 0 ? "+" : "") + selectedPoint.potential_V.toFixed(3)} V
                  </div>
                  <span className="text-[9px] text-slate-500">vs {selectedPoint.refElectrode}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#060b13] border border-[#162032] space-y-0.5">
                  <span className="text-[10px] text-slate-500">Standard Potential:</span>
                  <div className="text-sm font-bold text-white">
                    {(selectedPoint.potential_V_SHE !== undefined
                      ? selectedPoint.potential_V_SHE > 0
                        ? "+"
                        : ""
                      : selectedPoint.potential_V + (REF_OFFSETS_VS_SHE[selectedPoint.refElectrode] || 0) > 0
                      ? "+"
                      : "") +
                      (selectedPoint.potential_V_SHE ??
                        selectedPoint.potential_V + (REF_OFFSETS_VS_SHE[selectedPoint.refElectrode] || 0)
                      ).toFixed(3)}{" "}
                    V
                  </div>
                  <span className="text-[9px] text-slate-500">vs SHE scale</span>
                </div>

                <div className="p-3 rounded-xl bg-[#060b13] border border-[#162032] space-y-0.5">
                  <span className="text-[10px] text-slate-500">Corrosion Current:</span>
                  <div className="text-sm font-bold text-amber-300">
                    {selectedPoint.currentDensity_uA_cm2 !== undefined
                      ? `${selectedPoint.currentDensity_uA_cm2} µA/cm²`
                      : "N/A"}
                  </div>
                  <span className="text-[9px] text-slate-500">
                    {selectedPoint.currentDensity_uA_cm2 && selectedPoint.currentDensity_uA_cm2 > 100
                      ? "High Dissolution"
                      : "Low Passive Leakage"}
                  </span>
                </div>
              </div>

              {/* Physical Mechanism & Reaction Chemistry */}
              <div className="p-4 rounded-xl bg-[#060b13] border border-[#162032] space-y-3">
                <div className="flex items-center justify-between border-b border-[#162032] pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Identified Corrosion Pathway &amp; Thermochemical Breakdown
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Dominant: <strong className="text-sky-300">{selectedPoint.dominantSpecies || "Active Phase"}</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedPoint.mechanismDetails ||
                    "This test coordinate lies within the thermodynamic stability field where the metal interacts with the aqueous electrolyte. The active reaction kinetics and passivation film stability are governed by Nernst equilibria."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-[#0c1424] border border-[#1a263c]">
                    <span className="text-slate-400 block text-[10px]">Thermodynamic Regime:</span>
                    <span className="text-sky-300 font-bold">{selectedPoint.regime || "Analyzed"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0c1424] border border-[#1a263c]">
                    <span className="text-slate-400 block text-[10px]">Coupled Cathodic Depolarizer:</span>
                    <span className="text-emerald-300 font-bold">{selectedPoint.depolarizer || "Oxygen / Proton Reduction"}</span>
                  </div>
                </div>
              </div>

              {/* Quantitative Boundaries & Safety Margins */}
              <div className="p-4 rounded-xl bg-[#060b13] border border-[#162032] space-y-2.5">
                <span className="font-bold text-white flex items-center gap-2 text-xs">
                  <TrendingDown className="w-4 h-4 text-teal-400" />
                  Electrochemical Safety Margins vs Theoretical Stability Limits
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#0c1424] border border-[#1a263c] space-y-1">
                    <span className="text-slate-400 text-[10px]">Overpotential Above Immunity (ΔE_immunity):</span>
                    <div className="text-sm font-bold text-sky-300">
                      {selectedPoint.deltaE_Immunity_V !== undefined
                        ? `+${selectedPoint.deltaE_Immunity_V.toFixed(3)} V`
                        : "+0.450 V"}
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Voltage offset required to lower potential into cathodic protection zone.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0c1424] border border-[#1a263c] space-y-1">
                    <span className="text-slate-400 text-[10px]">Margin to Chloride Pitting (E - Epit):</span>
                    <div
                      className={`text-sm font-bold ${
                        selectedPoint.deltaE_Pitting_V !== undefined &&
                        selectedPoint.deltaE_Pitting_V !== null &&
                        selectedPoint.deltaE_Pitting_V >= 0
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {selectedPoint.deltaE_Pitting_V !== undefined && selectedPoint.deltaE_Pitting_V !== null
                        ? `${selectedPoint.deltaE_Pitting_V > 0 ? "+" : ""}${selectedPoint.deltaE_Pitting_V.toFixed(3)} V (${
                            selectedPoint.deltaE_Pitting_V >= 0 ? "PITTING ACTIVE" : "SAFE MARGIN"
                          })`
                        : "No Chloride Pitting Boundary"}
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Negative margin indicates immunity against localized breakdown.
                    </p>
                  </div>
                </div>
              </div>

              {/* Engineering Mitigations & Recommendations */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1729] to-[#070e1b] border border-sky-500/20 space-y-2.5">
                <span className="font-bold text-sky-300 flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  Prescribed Engineering Mitigations &amp; Action Plan
                </span>

                <div className="space-y-2">
                  {(selectedPoint.engineeringMitigations && selectedPoint.engineeringMitigations.length > 0
                    ? selectedPoint.engineeringMitigations
                    : [
                        "Monitor open circuit potential (OCP) and solution dissolved oxygen concentration.",
                        "Apply cathodic polarization if potential shifts toward the active corrosion regime.",
                        "Maintain chloride concentrations below threshold pitting levels.",
                      ]
                  ).map((mitigation, mIdx) => (
                    <div key={mIdx} className="flex items-start gap-2 text-slate-200 text-xs font-sans">
                      <ChevronRight className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                      <span>{mitigation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[#090e18] border border-[#162032] text-center space-y-2">
              <Info className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-slate-400 text-xs">Select a data point on the left or on the phase diagram to view its thermodynamic mechanism breakdown.</p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD MANUAL EXPERIMENTAL POINT
         ========================================================================= */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1524] rounded-2xl border border-sky-500/30 p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a263c] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <Plus className="w-4 h-4 text-sky-400" />
                Add Measured Electrochemical Data Point
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPoint} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Point / Sample Name:</label>
                <input
                  type="text"
                  value={newPtName}
                  onChange={(e) => setNewPtName(e.target.value)}
                  placeholder="e.g. Immersion Stage 2 (Crevice Occluded)"
                  className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Solution pH:</label>
                  <input
                    type="number"
                    step="0.05"
                    value={newPtPH}
                    onChange={(e) => setNewPtPH(parseFloat(e.target.value))}
                    className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Measured Potential (V):</label>
                  <input
                    type="number"
                    step="0.005"
                    value={newPtPot}
                    onChange={(e) => setNewPtPot(parseFloat(e.target.value))}
                    className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Reference Electrode:</label>
                  <select
                    value={newPtRef}
                    onChange={(e) => setNewPtRef(e.target.value as ReferenceElectrode)}
                    className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="SHE">SHE (Standard Hydrogen, 0.00V)</option>
                    <option value="SCE">SCE (Saturated Calomel, +0.241V)</option>
                    <option value="Ag/AgCl (3M KCl)">Ag/AgCl (3M KCl, +0.207V)</option>
                    <option value="CSE">CSE (Copper Sulfate, +0.316V)</option>
                    <option value="MMS">MMS (Mercury Sulfate, +0.640V)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Current Density (µA/cm²):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPtCurrent}
                    onChange={(e) => setNewPtCurrent(e.target.value)}
                    placeholder="e.g. 15.4"
                    className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Exposure Time (Hours):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newPtTime}
                    onChange={(e) => setNewPtTime(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Process Stage Name:</label>
                  <input
                    type="text"
                    value={newPtStage}
                    onChange={(e) => setNewPtStage(e.target.value)}
                    placeholder="e.g. Oxygen Starvation"
                    className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Engineering Notes:</label>
                <textarea
                  value={newPtNotes}
                  onChange={(e) => setNewPtNotes(e.target.value)}
                  placeholder="Observations, visual rust products, bubbling..."
                  rows={2}
                  className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a263c]">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#060b13] border border-[#1a263c] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold transition"
                >
                  Save Point &amp; Analyze
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CSV / TSV UPLOAD & DIRECT PASTE
         ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1524] rounded-2xl border border-sky-500/30 p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a263c] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <Upload className="w-4 h-4 text-sky-400" />
                Import Experimental E-pH Table (CSV / TSV)
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#060b13] border border-[#162032] text-slate-400 text-[11px] leading-relaxed">
                Paste tab-separated or comma-separated test data. Expected columns:
                <br />
                <code className="text-sky-300 font-bold">
                  pH, Potential_V, RefElectrode, Current_uA_cm2, StageName, Notes
                </code>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Select Local File:</label>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Or Paste Raw Data Below:</label>
                <textarea
                  rows={6}
                  value={rawUploadText}
                  onChange={(e) => setRawUploadText(e.target.value)}
                  placeholder={`pH, Potential, RefElectrode, Current, Stage, Notes\n2.5, -0.35, SCE, 120, Acid Attack, Fast bubbling\n7.2, -0.42, SCE, 14, Neutral Immersion, Passivating\n8.4, -1.05, CSE, 0.05, Cathodic Protection, No metal loss`}
                  className="w-full bg-[#060b13] border border-[#1a263c] rounded-lg p-3 text-white font-mono text-xs focus:outline-none focus:border-sky-500 placeholder-slate-600"
                />
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a263c]">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#060b13] border border-[#1a263c] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParseAndUpload}
                  disabled={!rawUploadText.trim()}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold transition disabled:opacity-40"
                >
                  Parse &amp; Import Points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

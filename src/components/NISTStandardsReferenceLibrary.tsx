import { ResponsiveContainer } from './VisibleResponsiveContainer';
import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Award,
  Sparkles,
  CheckCircle2,
  Download,
  Activity,
  Layers,
  Zap,
  Filter,
  Check,
  ArrowRight,
  Sliders,
  Maximize2,
  Atom,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { STANDARD_REFERENCES, XRDStandardRef } from "../utils/xrdParser";

export interface NISTStandardsReferenceLibraryProps {
  selectedStandardId: string;
  onSelectAndApplyStandard: (standard: XRDStandardRef) => void;
  onDownloadStandardXY?: (standard: XRDStandardRef) => void;
  isOpenAsModal?: boolean;
  onCloseModal?: () => void;
}

export const NISTStandardsReferenceLibrary: React.FC<NISTStandardsReferenceLibraryProps> = ({
  selectedStandardId,
  onSelectAndApplyStandard,
  onDownloadStandardXY,
  isOpenAsModal = false,
  onCloseModal,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedCrystalSystem, setSelectedCrystalSystem] = useState<string>("ALL");
  const [activeStandardId, setActiveStandardId] = useState<string>(selectedStandardId);
  const [activeTab, setActiveTab] = useState<"overview" | "peaks" | "caglioti">("overview");
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Filtered Standards List
  const filteredStandards = useMemo(() => {
    return STANDARD_REFERENCES.filter((std) => {
      const matchesCategory =
        selectedCategory === "ALL" || std.category === selectedCategory;

      const matchesCrystal =
        selectedCrystalSystem === "ALL" || std.crystalSystem === selectedCrystalSystem;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        std.name.toLowerCase().includes(q) ||
        std.formula.toLowerCase().includes(q) ||
        (std.nistSrmCode && std.nistSrmCode.toLowerCase().includes(q)) ||
        std.spaceGroup.toLowerCase().includes(q) ||
        std.description.toLowerCase().includes(q) ||
        std.recommendedApplication.toLowerCase().includes(q);

      return matchesCategory && matchesCrystal && matchesQuery;
    });
  }, [searchQuery, selectedCategory, selectedCrystalSystem]);

  // Active Selected Standard Object
  const currentStandard = useMemo<XRDStandardRef>(() => {
    return (
      STANDARD_REFERENCES.find((s) => s.id === activeStandardId) ||
      filteredStandards[0] ||
      STANDARD_REFERENCES[0]
    );
  }, [activeStandardId, filteredStandards]);

  // Caglioti Instrumental Broadening Profile Data (FWHM vs 2Theta: 15° to 120°)
  const cagliotiCurveData = useMemo(() => {
    if (!currentStandard || !currentStandard.caglioti_UVW) return [];
    const { U, V, W } = currentStandard.caglioti_UVW;
    const points: { twoTheta: number; fwhm_deg: number; fwhm_rad_mrad: number }[] = [];

    for (let t = 15; t <= 120; t += 2.5) {
      const theta_rad = (t * Math.PI) / 360;
      const tanT = Math.tan(theta_rad);
      const fwhmSq = U * Math.pow(tanT, 2) + V * tanT + W;
      const fwhm_deg = +Math.sqrt(Math.max(0.0001, fwhmSq)).toFixed(4);
      const fwhm_rad_mrad = +(fwhm_deg * (Math.PI / 180) * 1000).toFixed(2);
      points.push({ twoTheta: t, fwhm_deg, fwhm_rad_mrad });
    }
    return points;
  }, [currentStandard]);

  // Stick Diffractogram Data for Peak Chart
  const stickDiffractogramData = useMemo(() => {
    if (!currentStandard || !currentStandard.standardPeaks) return [];
    return currentStandard.standardPeaks.map((p) => ({
      twoTheta: p.twoTheta_CuKa,
      intensity: p.relativeIntensity,
      hkl: p.hkl,
      d_spacing: p.d_spacing_A,
    }));
  }, [currentStandard]);

  // Handle Apply Standard Calibration
  const handleApplyCalibration = (std: XRDStandardRef) => {
    onSelectAndApplyStandard(std);
    setAppliedNotification(`Loaded reference profile from ${std.name}; verify instrument calibration with a measured reference scan.`);
    setTimeout(() => setAppliedNotification(null), 4000);
  };

  // Export Standard Synthetic .xy or .csv File
  const handleExportStandardFile = (std: XRDStandardRef) => {
    if (onDownloadStandardXY) {
      onDownloadStandardXY(std);
      return;
    }

    let fileContent = `# SYNTHETIC XRD reference profile: ${std.name}\n# Evidence: simulated illustration; not a measured NIST SRM certificate or instrument calibration\n`;
    fileContent += `# Formula: ${std.formula} | Space Group: ${std.spaceGroup}\n`;
    fileContent += `# Lattice: a = ${std.lattice_a_A} A${std.lattice_c_A ? `, c = ${std.lattice_c_A} A` : ""}\n`;
    fileContent += `# Caglioti: U=${std.caglioti_UVW.U}, V=${std.caglioti_UVW.V}, W=${std.caglioti_UVW.W}\n`;
    fileContent += `# 2Theta_deg, Intensity_Counts\n`;

    const step = 0.02;
    for (let t = 15; t <= 100; t += step) {
      const tRound = +t.toFixed(2);
      let intensity = 25; // baseline
      std.standardPeaks.forEach((pk) => {
        const theta_rad = (pk.twoTheta_CuKa * Math.PI) / 360;
        const tanT = Math.tan(theta_rad);
        const { U, V, W } = std.caglioti_UVW;
        const fwhm = Math.sqrt(Math.max(0.0001, U * Math.pow(tanT, 2) + V * tanT + W));
        const dist = tRound - pk.twoTheta_CuKa;
        const peakI = pk.relativeIntensity * 40 * Math.exp(-4 * Math.LN2 * Math.pow(dist / fwhm, 2));
        intensity += peakI;
      });
      fileContent += `${tRound.toFixed(2)},${Math.round(intensity)}\n`;
    }

    const blob = new Blob([fileContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${std.id}_synthetic_reference_pattern.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#090e18] border border-amber-500/30 rounded-2xl p-5 space-y-5 font-mono shadow-2xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>XRD Reference &amp; Instrumental Profile Library</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold lowercase">
                SRM Database (ASTM E915 / ISO 14704)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Preview reference reflections and assumed Caglioti broadening profiles. Generated patterns are synthetic. Instrument calibration requires a measured reference specimen and its applicable certificate.
            </p>
          </div>
        </div>

        {isOpenAsModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="px-3 py-1.5 rounded-lg bg-[#050810] border border-[#1e2d46] text-slate-300 hover:text-white text-xs font-bold transition"
          >
            Close Library
          </button>
        )}
      </div>

      {/* Applied Feedback Notice */}
      {appliedNotification && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <strong>Calibration Synced:</strong> {appliedNotification}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Instrumental baseline &amp; zero-shift updated
          </span>
        </div>
      )}

      {/* Search & Multi-Facet Filter Bar */}
      <div className="space-y-3 bg-[#050810] p-3.5 rounded-xl border border-[#1e2d46]">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search standards by NIST code (660c, 640f, 676a), formula (LaB6, Si, Al2O3), alloy or crystal system..."
              className="w-full bg-[#090e18] border border-[#1e2d46] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Crystal System Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCrystalSystem}
              onChange={(e) => setSelectedCrystalSystem(e.target.value)}
              className="bg-[#090e18] border border-[#1e2d46] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Crystal Systems</option>
              <option value="Cubic">Cubic</option>
              <option value="Hexagonal">Hexagonal</option>
              <option value="Tetragonal">Tetragonal</option>
              <option value="Rhombohedral">Rhombohedral / Trigonal</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: "ALL", label: "All Standards", count: STANDARD_REFERENCES.length },
            {
              id: "Line Position & Profile",
              label: "Line Position & Profile (SRM 660c, 640f)",
              count: STANDARD_REFERENCES.filter((s) => s.category === "Line Position & Profile").length,
            },
            {
              id: "Quantitative & Intensity",
              label: "Quantitative & Intensity (QPA / RIR)",
              count: STANDARD_REFERENCES.filter((s) => s.category === "Quantitative & Intensity").length,
            },
            {
              id: "Annealed Metallurgy",
              label: "Annealed Alloy Bases (IN718, Ti64, 316L)",
              count: STANDARD_REFERENCES.filter((s) => s.category === "Annealed Metallurgy").length,
            },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    : "bg-[#090e18] text-slate-400 border-[#162032] hover:text-slate-200"
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Layout: Standards Cards Explorer (Left) & Standard Metrology Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* =========================================================================
            LEFT COLUMN: STANDARDS LIST / SELECTION GRID
           ========================================================================= */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredStandards.length === 0 ? (
            <div className="p-8 text-center bg-[#050810] border border-[#1e2d46] rounded-xl text-slate-400 text-xs">
              No NIST standards match &quot;{searchQuery}&quot;. Try searching for &quot;LaB6&quot;, &quot;Silicon&quot;, &quot;Alumina&quot;, or &quot;Inconel&quot;.
            </div>
          ) : (
            filteredStandards.map((std) => {
              const isSelected = currentStandard.id === std.id;
              const isCurrentlyActiveInLab = selectedStandardId === std.id;

              return (
                <div
                  key={std.id}
                  onClick={() => setActiveStandardId(std.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500/15 to-[#050810] border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "bg-[#050810] border-[#1e2d46] hover:border-amber-500/30 hover:bg-[#070b14]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {std.nistSrmCode && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            {std.nistSrmCode}
                          </span>
                        )}
                        <span className="text-xs font-bold text-white tracking-wide">
                          {std.formula}
                        </span>
                        <span className="text-[10px] text-slate-400">({std.crystalSystem})</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {std.name}
                      </h4>
                    </div>

                    {isCurrentlyActiveInLab && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" />
                        Active in Lab
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5">
                    {std.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-[#162032] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      Lattice: <strong className="text-amber-300">{std.lattice_a_A} Å</strong>
                    </span>
                    <span>
                      Caglioti W: <strong className="text-sky-300">{std.caglioti_UVW.W}</strong>
                    </span>
                    <span>
                      {std.standardPeaks.length} peaks
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =========================================================================
            RIGHT COLUMN: ACTIVE STANDARD METROLOGICAL DOSSIER & PROFILE VIEWER
           ========================================================================= */}
        <div className="lg:col-span-7 bg-[#050810] border border-[#1e2d46] rounded-xl p-5 space-y-4">
          {/* Header Info of Current Standard */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#162032] pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {currentStandard.nistSrmCode && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                    {currentStandard.nistSrmCode}
                  </span>
                )}
                <h3 className="text-sm font-bold text-white">
                  {currentStandard.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {currentStandard.recommendedApplication}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleExportStandardFile(currentStandard)}
                className="px-3 py-1.5 rounded-lg bg-[#090e18] border border-[#1e2d46] hover:border-amber-500/40 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
                title="Download synthetic reference diffractogram (.csv); not calibration evidence"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Synthetic Pattern</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyCalibration(currentStandard)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Load Reference Profile</span>
              </button>
            </div>
          </div>

          {/* Standard Key Parameter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032] space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Chemical Formula:</span>
              <strong className="text-amber-300 block font-mono text-xs">{currentStandard.formula}</strong>
            </div>

            <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032] space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Space Group:</span>
              <strong className="text-sky-300 block font-mono text-xs truncate">{currentStandard.spaceGroup}</strong>
            </div>

            <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032] space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Lattice a (Å):</span>
              <strong className="text-emerald-400 block font-mono text-xs">
                {currentStandard.lattice_a_A} Å
                {currentStandard.lattice_c_A ? ` (c=${currentStandard.lattice_c_A} Å)` : ""}
              </strong>
            </div>

            <div className="p-2.5 bg-[#090e18] rounded-lg border border-[#162032] space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Caglioti (U, V, W):</span>
              <strong className="text-indigo-300 block font-mono text-xs">
                {currentStandard.caglioti_UVW.U}, {currentStandard.caglioti_UVW.V}, {currentStandard.caglioti_UVW.W}
              </strong>
            </div>
          </div>

          {/* Tabs for Overview / Diffractogram Stick Plot / Caglioti Broadening Curve / Reflection Table */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#162032] pb-2">
              {[
                { id: "overview", label: "Diffractogram Stick Pattern", icon: Activity },
                { id: "caglioti", label: "Instrument Broadening Curve FWHM(2θ)", icon: Sliders },
                { id: "peaks", label: "Reference Reflections Table", icon: FileSpreadsheet },
              ].map((tab) => {
                const isAct = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                      isAct
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-[#090e18] text-slate-400 border-transparent hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Stick Diffractogram Plot */}
            {activeTab === "overview" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Theoretical Cu-Kα Bragg Peaks (2θ vs. I/I₀)</span>
                  <span>{currentStandard.standardPeaks.length} Reference Reflections</span>
                </div>
                <div className="h-56 w-full bg-[#090e18] p-2 rounded-lg border border-[#162032]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stickDiffractogramData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        dataKey="twoTheta"
                        stroke="#64748b"
                        unit="°"
                        domain={[15, 100]}
                        type="number"
                        tickFormatter={(v) => v.toFixed(1)}
                      />
                      <YAxis stroke="#64748b" domain={[0, 105]} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#050810",
                          borderColor: "#1e2d46",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val}% (hkl: ${item.payload.hkl}, d = ${item.payload.d_spacing} Å)`,
                          "Relative Intensity",
                        ]}
                        labelFormatter={(lbl) => `2θ = ${Number(lbl).toFixed(2)}° (Cu-Kα)`}
                      />
                      <Bar dataKey="intensity" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 2: Caglioti Instrumental Broadening Curve */}
            {activeTab === "caglioti" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>
                    {"FWHM_inst²(2θ) = U·tan²(θ) + V·tan(θ) + W (Instrument Slit Broadening)"}
                  </span>
                  <span className="text-sky-300 font-mono">
                    W = {currentStandard.caglioti_UVW.W} deg²
                  </span>
                </div>
                <div className="h-56 w-full bg-[#090e18] p-2 rounded-lg border border-[#162032]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cagliotiCurveData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis
                        dataKey="twoTheta"
                        stroke="#64748b"
                        unit="°"
                        domain={[15, 120]}
                        tickFormatter={(v) => v.toFixed(0)}
                      />
                      <YAxis stroke="#64748b" unit="°" domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#050810",
                          borderColor: "#1e2d46",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                        formatter={(val: any) => [`${val}° 2θ (${(Number(val) * 17.453).toFixed(2)} mrad)`, "FWHM_inst"]}
                        labelFormatter={(lbl) => `Bragg Angle 2θ = ${lbl}°`}
                      />
                      <Line
                        type="monotone"
                        dataKey="fwhm_deg"
                        name="Instrumental FWHM_inst"
                        stroke="#38bdf8"
                        strokeWidth={2.2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 3: Certified Reflections Table */}
            {activeTab === "peaks" && (
              <div className="overflow-x-auto max-h-56 scrollbar-thin border border-[#162032] rounded-lg">
                <table className="w-full text-[11px] text-left text-slate-300">
                  <thead className="bg-[#090e18] text-slate-400 font-mono text-[10px] uppercase border-b border-[#162032] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Miller Index (hkl)</th>
                      <th className="py-2 px-3">2θ Angle (Cu-Kα)</th>
                      <th className="py-2 px-3">d-spacing (Å)</th>
                      <th className="py-2 px-3">Relative Intensity (I/I₀)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#162032] font-mono">
                    {currentStandard.standardPeaks.map((pk, idx) => (
                      <tr key={idx} className="hover:bg-[#070b14]">
                        <td className="py-1.5 px-3 font-bold text-amber-300">{pk.hkl}</td>
                        <td className="py-1.5 px-3 text-white">{pk.twoTheta_CuKa.toFixed(2)}°</td>
                        <td className="py-1.5 px-3 text-sky-300">{pk.d_spacing_A.toFixed(4)} Å</td>
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#162032] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${pk.relativeIntensity}%` }}
                              />
                            </div>
                            <span>{pk.relativeIntensity}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

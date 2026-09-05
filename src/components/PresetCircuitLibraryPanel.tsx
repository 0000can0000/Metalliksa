import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Check,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Battery,
  Droplets,
  Flame,
  Activity,
  Filter,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  Zap,
  Sliders,
  RotateCcw,
  Copy,
  RadioTower,
  Atom,
  Eye,
  Settings2,
} from "lucide-react";
import { EXTENDED_CIRCUIT_LIBRARY, CircuitModelDoc } from "../data/circuitModelLibrary";
import { CircuitTopology, CircuitElement, CircuitBranch } from "./EquivalentCircuitBuilder";

interface PresetCircuitLibraryPanelProps {
  currentTopology?: CircuitTopology;
  onLoadTopology: (topology: CircuitTopology) => void;
  onRunAutoFit?: (topology: CircuitTopology) => void;
  className?: string;
  isCompact?: boolean;
}

export function PresetCircuitLibraryPanel({
  currentTopology,
  onLoadTopology,
  onRunAutoFit,
  className = "",
  isCompact = false,
}: PresetCircuitLibraryPanelProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    EXTENDED_CIRCUIT_LIBRARY[0].id
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedCdc, setCopiedCdc] = useState<boolean>(false);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.0);

  // Active Model Document
  const activeModelDoc = useMemo(() => {
    return (
      EXTENDED_CIRCUIT_LIBRARY.find((m) => m.id === selectedModelId) ||
      EXTENDED_CIRCUIT_LIBRARY[0]
    );
  }, [selectedModelId]);

  // Working copy of topology parameters for modification before loading
  const [customParams, setCustomParams] = useState<{ [elementId: string]: { value: number; exponent?: number } }>(() => {
    const initial: { [key: string]: { value: number; exponent?: number } } = {};
    activeModelDoc.topology.branches.forEach((b) => {
      b.elements.forEach((el) => {
        initial[el.id] = {
          value: el.value,
          exponent: el.exponent,
        };
      });
    });
    return initial;
  });

  // When model selection changes, re-initialize working parameters
  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    const doc = EXTENDED_CIRCUIT_LIBRARY.find((m) => m.id === modelId);
    if (doc) {
      const initial: { [key: string]: { value: number; exponent?: number } } = {};
      doc.topology.branches.forEach((b) => {
        b.elements.forEach((el) => {
          initial[el.id] = {
            value: el.value,
            exponent: el.exponent,
          };
        });
      });
      setCustomParams(initial);
      setScaleMultiplier(1.0);
    }
  };

  // Categories list
  const categories = [
    { id: "all", label: "All Circuits", icon: Layers, count: EXTENDED_CIRCUIT_LIBRARY.length },
    { id: "battery", label: "Batteries & Intercalation", icon: Battery, count: EXTENDED_CIRCUIT_LIBRARY.filter((m) => m.category === "battery").length },
    { id: "corrosion", label: "Corrosion & Passivity", icon: ShieldCheck, count: EXTENDED_CIRCUIT_LIBRARY.filter((m) => m.category === "corrosion").length },
    { id: "coating", label: "Coatings & Barrier Pores", icon: Droplets, count: EXTENDED_CIRCUIT_LIBRARY.filter((m) => m.category === "coating").length },
    { id: "solid-state", label: "Solid-State & Ceramics", icon: Cpu, count: EXTENDED_CIRCUIT_LIBRARY.filter((m) => m.category === "solid-state").length },
    { id: "fuel-cell", label: "Fuel Cells & MEA", icon: Flame, count: EXTENDED_CIRCUIT_LIBRARY.filter((m) => m.category === "fuel-cell").length },
  ];

  // Filtered models
  const filteredModels = useMemo(() => {
    return EXTENDED_CIRCUIT_LIBRARY.filter((model) => {
      const matchesCategory = selectedCategory === "all" || model.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        model.name.toLowerCase().includes(q) ||
        model.description.toLowerCase().includes(q) ||
        model.cdcNotation.toLowerCase().includes(q) ||
        model.physicalPhenomenon.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Update a single parameter
  const handleParamChange = (elementId: string, field: "value" | "exponent", rawVal: number) => {
    setCustomParams((prev) => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        [field]: rawVal,
      },
    }));
  };

  // Apply scaling multiplier to all resistances or capacitances
  const handleApplyScale = (factor: number) => {
    setScaleMultiplier(factor);
    setCustomParams((prev) => {
      const updated = { ...prev };
      activeModelDoc.topology.branches.forEach((b) => {
        b.elements.forEach((el) => {
          if (el.type === "R" || el.type === "W" || el.type === "G") {
            updated[el.id] = {
              ...updated[el.id],
              value: el.value * factor,
            };
          } else if (el.type === "C" || el.type === "CPE") {
            updated[el.id] = {
              ...updated[el.id],
              value: el.value / factor, // higher impedance = smaller capacitance
            };
          }
        });
      });
      return updated;
    });
  };

  // Reset to default preset values
  const handleResetParams = () => {
    const initial: { [key: string]: { value: number; exponent?: number } } = {};
    activeModelDoc.topology.branches.forEach((b) => {
      b.elements.forEach((el) => {
        initial[el.id] = {
          value: el.value,
          exponent: el.exponent,
        };
      });
    });
    setCustomParams(initial);
    setScaleMultiplier(1.0);
  };

  // Construct and load topology into the canvas
  const handleLoadIntoCanvas = () => {
    const cloned: CircuitTopology = JSON.parse(JSON.stringify(activeModelDoc.topology));
    cloned.id = `circ-preset-${Date.now()}`;
    // Update with customized parameters
    cloned.branches.forEach((b) => {
      b.elements.forEach((el) => {
        if (customParams[el.id]) {
          el.value = customParams[el.id].value;
          if (customParams[el.id].exponent !== undefined) {
            el.exponent = customParams[el.id].exponent;
          }
        }
      });
    });

    onLoadTopology(cloned);
  };

  // Copy CDC notation string
  const handleCopyCDC = () => {
    navigator.clipboard.writeText(activeModelDoc.cdcNotation);
    setCopiedCdc(true);
    setTimeout(() => setCopiedCdc(false), 2000);
  };

  return (
    <div className={`bg-[#090e18] border border-[#1e2d46] rounded-2xl overflow-hidden shadow-xl ${className}`}>
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-[#162032] bg-[#050810]/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-400/30 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
                <span>Preset Circuit Library</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono border border-sky-400/30">
                {EXTENDED_CIRCUIT_LIBRARY.length} Standard Models
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Load &amp; tune peer-reviewed Equivalent Circuit Models (Randles, Warburg, SEI, Coatings, Grain Boundaries) into the interactive canvas.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleLoadIntoCanvas}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(56,189,248,0.35)] cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>⚡ Load to Interactive Canvas</span>
          </button>
          {onRunAutoFit && (
            <button
              type="button"
              onClick={() => {
                handleLoadIntoCanvas();
                const cloned: CircuitTopology = JSON.parse(JSON.stringify(activeModelDoc.topology));
                onRunAutoFit(cloned);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 hover:border-emerald-300 text-emerald-300 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Fit This Model</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Controls & Selection Bar */}
      <div className="p-4 sm:p-5 space-y-5">
        {/* 1. PRIMARY PRESET SELECTOR DROPDOWN & SEARCH BAR */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#050810] p-3.5 rounded-xl border border-[#162032]">
          {/* Categorized Dropdown Selector */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              Select Equivalent Circuit Model:
            </label>
            <div className="relative">
              <select
                value={selectedModelId}
                onChange={(e) => handleSelectModel(e.target.value)}
                className="w-full bg-[#0c1424] border border-[#1e2d46] hover:border-sky-400/50 focus:border-sky-400 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none transition-all cursor-pointer"
              >
                {categories.filter(c => c.id !== "all").map((cat) => {
                  const catModels = EXTENDED_CIRCUIT_LIBRARY.filter((m) => m.category === cat.id);
                  if (catModels.length === 0) return null;
                  return (
                    <optgroup key={cat.id} label={`── ${cat.label} (${catModels.length}) ──`}>
                      {catModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} [{m.cdcNotation}]
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Search Filter */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              Filter by Name / CDC / Element:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 'Randles', 'CPE', 'ASTM', 'SEI'..."
                className="w-full bg-[#0c1424] border border-[#1e2d46] focus:border-sky-400 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Categories Filter Pills */}
          <div className="md:col-span-2 flex md:flex-col gap-1 justify-end">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Domain:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0c1424] border border-[#1e2d46] rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-300"
            >
              <option value="all">All Domains ({EXTENDED_CIRCUIT_LIBRARY.length})</option>
              {categories.filter(c => c.id !== "all").map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. FAST 1-CLICK POPULAR MODEL PRESET CHIPS */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            Quick-Load Popular Benchmarks:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: "classic-randles", label: "Classic Randles R(C(RW))", color: "border-sky-400/40 text-sky-300" },
              { id: "modified-randles-cpe", label: "Porous CPE Randles R(Q(RW))", color: "border-purple-400/40 text-purple-300" },
              { id: "dual-sei-battery", label: "Battery SEI (2-RC Loop)", color: "border-emerald-400/40 text-emerald-300" },
              { id: "corrosion-coating-astm", label: "ASTM G106 Coating (2-RC)", color: "border-teal-400/40 text-teal-300" },
              { id: "solid-state-battery", label: "Solid-State LLZO Bulk+GB", color: "border-blue-400/40 text-blue-300" },
              { id: "bisquert-open-tlm", label: "Bisquert Open Porous TLM", color: "border-indigo-400/40 text-indigo-300" },
              { id: "battery-with-inductance", label: "Lead Inductance (L+R+2RC)", color: "border-amber-400/40 text-amber-300" },
            ].map((chip) => {
              const isActive = selectedModelId === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSelectModel(chip.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.3)] font-bold"
                      : `bg-[#050810] ${chip.color} hover:bg-[#0c1424]`
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. SELECTED MODEL OVERVIEW CARD & PHYSICAL EXPLANATION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Model Physical Synopsis, CDC Notation & Circuit Blueprint */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#050810] rounded-xl border border-[#162032] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-[#162032] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono border border-sky-400/20">
                      {activeModelDoc.categoryLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Freq: {activeModelDoc.suggestedFrequencyRange}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white font-mono mt-1">
                    {activeModelDoc.name}
                  </h4>
                </div>
              </div>

              {/* CDC Boukamp Notation Badge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c1424] border border-[#1e2d46]">
                <div className="space-y-0.5">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">Boukamp CDC Notation:</div>
                  <div className="text-xs font-mono font-bold text-amber-300">
                    {activeModelDoc.cdcNotation}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCDC}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#162238] hover:bg-[#1f3050] text-[10px] font-mono text-slate-300 transition-all cursor-pointer"
                  title="Copy CDC Notation String"
                >
                  {copiedCdc ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCdc ? "Copied" : "Copy CDC"}</span>
                </button>
              </div>

              {/* Description & Physical Phenomenon */}
              <div className="text-xs font-mono text-slate-300 space-y-2 leading-relaxed">
                <p>{activeModelDoc.description}</p>
                <div className="p-2.5 rounded-lg bg-[#0c1424]/80 border border-sky-500/20 text-[11px] text-sky-200">
                  <strong className="text-sky-400">Physical Phenomenon:</strong> {activeModelDoc.physicalPhenomenon}
                </div>
              </div>

              {/* Expected Nyquist & Bode Profiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div className="p-2 rounded-lg bg-[#0b101c] border border-[#162032] space-y-1">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-400" /> Nyquist Arc Topology:
                  </span>
                  <p className="text-slate-300 leading-normal">{activeModelDoc.nyquistShapeDesc}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#0b101c] border border-[#162032] space-y-1">
                  <span className="text-sky-400 font-bold flex items-center gap-1">
                    <RadioTower className="w-3 h-3 text-sky-400" /> Bode Characteristics:
                  </span>
                  <p className="text-slate-300 leading-normal">{activeModelDoc.bodeCharacteristics}</p>
                </div>
              </div>

              {/* Fitting Notes */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-[10px] font-mono text-amber-200/90 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Fitting Tip:</strong> {activeModelDoc.fittingNotes}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Parameter Modifier & Scale Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#050810] rounded-xl border border-[#162032] p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#162032] pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Tune &amp; Modify Model Parameters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetParams}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#0c1424] border border-[#1e2d46] hover:border-slate-500 text-[10px] font-mono text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Reset parameters to standard textbook defaults"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Scale Multiplier Controls */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c1424] border border-[#1e2d46] text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Settings2 className="w-3 h-3 text-sky-400" /> Impedance Scale:
                </span>
                <div className="flex items-center gap-1">
                  {[0.1, 1.0, 10.0, 100.0].map((factor) => (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => handleApplyScale(factor)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                        scaleMultiplier === factor
                          ? "bg-sky-500/20 border-sky-400 text-sky-300 font-bold"
                          : "bg-[#050810] border-[#1e2d46] text-slate-400 hover:text-white"
                      }`}
                    >
                      {factor === 1.0 ? "1x (Normal)" : `${factor}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Elements Parameter List */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {activeModelDoc.topology.branches.map((branch, bIdx) => (
                  <div key={branch.id} className="bg-[#0b101c] p-3 rounded-xl border border-[#18253a] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#18253a] pb-1.5">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${branch.connection === "series" ? "bg-sky-400" : "bg-purple-400"}`} />
                        Stage {bIdx + 1}: {branch.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#162032] text-slate-400 font-mono">
                        {branch.connection.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {branch.elements.map((el) => {
                        const curVal = customParams[el.id]?.value ?? el.value;
                        const curExp = customParams[el.id]?.exponent ?? el.exponent;

                        // Find reference docs for this parameter
                        const docParam = activeModelDoc.keyParameters.find(
                          (kp) => kp.symbol.toLowerCase() === el.name.toLowerCase() || kp.symbol.includes(el.name)
                        );

                        return (
                          <div key={el.id} className="bg-[#050810] p-2.5 rounded-lg border border-[#162032] space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white px-1.5 py-0.5 rounded bg-[#121c2e] text-sky-300 border border-sky-500/30">
                                  {el.name}
                                </span>
                                <span className="text-slate-300 font-medium text-[11px]">{el.label}</span>
                              </div>
                              <span className="text-amber-400 font-bold font-mono text-[11px]">
                                {curVal < 1e-3 || curVal > 1e4 ? curVal.toExponential(3) : curVal.toFixed(3)} {el.unit}
                              </span>
                            </div>

                            {/* Value input and slider */}
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-8">
                                <input
                                  type="range"
                                  min={el.value * 0.01}
                                  max={el.value * 10}
                                  step={(el.value * 10) / 200}
                                  value={curVal}
                                  onChange={(e) => handleParamChange(el.id, "value", parseFloat(e.target.value))}
                                  className="w-full accent-sky-400 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
                                />
                              </div>
                              <div className="col-span-4">
                                <input
                                  type="number"
                                  step="any"
                                  value={curVal}
                                  onChange={(e) => handleParamChange(el.id, "value", parseFloat(e.target.value) || 0)}
                                  className="w-full bg-[#0c1424] border border-[#1e2d46] rounded px-2 py-1 text-[11px] font-mono text-slate-200 text-right focus:outline-none focus:border-sky-400"
                                />
                              </div>
                            </div>

                            {/* Constant Phase Element Exponent (n) Slider */}
                            {el.type === "CPE" && curExp !== undefined && (
                              <div className="pt-1 border-t border-[#162032] space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-mono text-purple-300">
                                  <span>CPE Phase Exponent (n):</span>
                                  <span className="font-bold">{curExp.toFixed(3)}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-2 items-center">
                                  <div className="col-span-8">
                                    <input
                                      type="range"
                                      min={0.5}
                                      max={1.0}
                                      step={0.01}
                                      value={curExp}
                                      onChange={(e) => handleParamChange(el.id, "exponent", parseFloat(e.target.value))}
                                      className="w-full accent-purple-400 h-1.5 bg-[#162032] rounded-lg cursor-pointer"
                                    />
                                  </div>
                                  <div className="col-span-4">
                                    <input
                                      type="number"
                                      min={0.5}
                                      max={1.0}
                                      step={0.01}
                                      value={curExp}
                                      onChange={(e) => handleParamChange(el.id, "exponent", parseFloat(e.target.value) || 0.9)}
                                      className="w-full bg-[#0c1424] border border-[#1e2d46] rounded px-2 py-1 text-[11px] font-mono text-purple-200 text-right focus:outline-none focus:border-purple-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Parameter Physical Context Footnote */}
                            {docParam && (
                              <div className="text-[9px] font-mono text-slate-500 truncate" title={docParam.physicalMeaning}>
                                Range: {docParam.typicalRange} | {docParam.physicalMeaning}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Load into Canvas Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLoadIntoCanvas}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs shadow-[0_0_16px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Update Interactive Drag-and-Drop Canvas with this Preset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

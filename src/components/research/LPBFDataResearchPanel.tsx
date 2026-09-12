import React, { useCallback, useEffect, useMemo, useState } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import {
  FlaskConical,
  Database,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Download,
  Atom,
  BookOpen,
  Cpu,
  Layers,
  Beaker,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Save,
  Trash2,
  Archive,
} from "lucide-react";
import {
  pythonComputationService,
  LPBFResearchSchema,
  LPBFResearchResult,
  LPBFResearchProvenance,
  LPBFAuditSeverity,
} from "../../services/pythonComputationService";

const PROVENANCE_STYLES: Record<LPBFResearchProvenance, string> = {
  "DFT-Live": "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Literature: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  Derived: "bg-purple-500/15 text-purple-300 border-purple-500/40",
};

const AUDIT_STYLES: Record<LPBFAuditSeverity, { badge: string; text: string; label: string }> = {
  pass: { badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", text: "text-emerald-300", label: "PASS" },
  warn: { badge: "bg-amber-500/15 text-amber-300 border-amber-500/40", text: "text-amber-300", label: "WARN" },
  fail: { badge: "bg-rose-500/15 text-rose-300 border-rose-500/40", text: "text-rose-300", label: "FAIL" },
};

const LIBRARY_KEY = "metallix.lpbf.research.library";

function buildPythonDict(result: LPBFResearchResult): string {
  const r = result.record;
  const order = [
    "base", "liquidus_C", "solidus_C", "boiling_C",
    "density_kg_m3", "density_liquid_kg_m3",
    "thermal_conductivity_W_mK", "thermal_conductivity_liquid_W_mK",
    "specific_heat_J_kgK", "specific_heat_liquid_J_kgK",
    "latent_heat_fusion_J_kg", "latent_heat_vap_J_kg",
    "absorptivity_IR", "absorptivity_Green",
    "surface_tension_N_m", "d_gamma_dT_N_mK", "viscosity_Pa_s",
    "thermal_expansion_1_K", "youngs_modulus_GPa", "poissons_ratio",
    "pdas_A1", "sdas_B1",
  ];
  const lines = order
    .filter((k) => r[k] !== undefined)
    .map((k) => {
      const v = r[k];
      const rendered = typeof v === "string" ? `"${v}"` : String(v);
      return `        "${k}": ${rendered},`;
    });
  const cite = result.citations.filter(Boolean).join(" | ");
  return (
    `    # Source: ${cite}\n` +
    `    "${result.material}": {\n` +
    lines.join("\n") +
    `\n    },`
  );
}

export const LPBFDataResearchPanel: React.FC = () => {
  const [schema, setSchema] = useState<LPBFResearchSchema | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [loadingSchema, setLoadingSchema] = useState<boolean>(true);

  const [selected, setSelected] = useState<string | null>(null);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [result, setResult] = useState<LPBFResearchResult | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [savedRecords, setSavedRecords] = useState<LPBFResearchResult[]>([]);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  const loadSchema = useCallback(async () => {
    setLoadingSchema(true);
    setSchemaError(null);
    try {
      const s = await pythonComputationService.getLPBFResearchSchema();
      setSchema(s);
    } catch (err: any) {
      setSchemaError(err?.message || "Failed to load LPBF data schema.");
    } finally {
      setLoadingSchema(false);
    }
  }, []);

  useEffect(() => {
    loadSchema();
    idbGet<LPBFResearchResult[]>(LIBRARY_KEY)
      .then((stored) => {
        if (Array.isArray(stored)) setSavedRecords(stored);
      })
      .catch(() => {
        /* first run: no library yet */
      });
  }, [loadSchema]);

  const persistLibrary = useCallback(async (records: LPBFResearchResult[]) => {
    setSavedRecords(records);
    try {
      await idbSet(LIBRARY_KEY, records);
    } catch (err) {
      console.warn("Failed to persist LPBF research library:", err);
    }
  }, []);

  const handleSaveToLibrary = useCallback(() => {
    if (!result || result.audit.status === "fail") return;
    const others = savedRecords.filter((r) => r.material !== result.material);
    persistLibrary([...others, result]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }, [result, savedRecords, persistLibrary]);

  const handleRemoveSaved = useCallback(
    (material: string) => {
      persistLibrary(savedRecords.filter((r) => r.material !== material));
    },
    [savedRecords, persistLibrary]
  );

  const handleExportAll = useCallback(() => {
    if (savedRecords.length === 0) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      count: savedRecords.length,
      records: savedRecords.map((r) => ({
        material: r.material,
        base: r.base,
        category: r.category,
        record: r.record,
        provenance: r.provenance,
        citations: r.citations,
        audit: r.audit,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LPBF_ResearchLibrary_${savedRecords.length}alloys.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedRecords]);

  const isSaved = useMemo(
    () => !!result && savedRecords.some((r) => r.material === result.material),
    [result, savedRecords]
  );

  const runResearch = useCallback(async (material: string) => {
    setSelected(material);
    setIsResearching(true);
    setResearchError(null);
    setResult(null);
    try {
      const r = await pythonComputationService.researchLPBFThermophysical(material);
      setResult(r);
    } catch (err: any) {
      setResearchError(err?.message || "Research request failed.");
    } finally {
      setIsResearching(false);
    }
  }, []);

  const fieldLabelMap = useMemo(() => {
    const map: Record<string, { label: string; unit: string; category: string }> = {};
    schema?.requiredFields.forEach((f) => {
      map[f.key] = { label: f.label, unit: f.unit, category: f.category };
    });
    return map;
  }, [schema]);

  const researchableCount = useMemo(
    () => schema?.referenceLibrary.filter((a) => !a.alreadyInSolver).length ?? 0,
    [schema]
  );

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(buildPythonDict(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const payload = {
      material: result.material,
      base: result.base,
      category: result.category,
      applicationNote: result.applicationNote,
      record: result.record,
      provenance: result.provenance,
      citations: result.citations,
      dftEvidence: result.dftEvidence,
      densityCrossCheck: result.densityCrossCheck,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LPBF_ThermophysicalResearch_${result.material.replace(/[^a-z0-9]+/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-sky-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  LPBF Data Research &amp; Acquisition
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  LIVE DFT + LITERATURE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Research the thermophysical data required for future LPBF process stages. Curated
                peer-reviewed values are cross-validated against a live Materials Project DFT query.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#050810] px-3.5 py-2 rounded-xl border border-[#162032] text-right">
              <span className="text-[10px] text-slate-500 block uppercase">In Solver DB</span>
              <span className="text-base font-bold text-sky-400">{schema?.existingCount ?? "—"} Alloys</span>
            </div>
            <div className="bg-[#050810] px-3.5 py-2 rounded-xl border border-[#162032] text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Researchable</span>
              <span className="text-base font-bold text-emerald-400">{researchableCount} New</span>
            </div>
            <div className="bg-[#050810] px-3.5 py-2 rounded-xl border border-[#162032] text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Schema Fields</span>
              <span className="text-base font-bold text-amber-400">{schema?.fieldCount ?? "—"}</span>
            </div>
            <div className="bg-[#050810] px-3.5 py-2 rounded-xl border border-[#162032] text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Saved Library</span>
              <span className="text-base font-bold text-purple-400">{savedRecords.length}</span>
            </div>
          </div>
        </div>
      </div>

      {schemaError && (
        <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-4 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{schemaError}</span>
          <button onClick={loadSchema} className="ml-auto px-2 py-1 rounded bg-rose-500/20 text-xs">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Gap dashboard / candidate selector */}
        <div className="lg:col-span-5 space-y-4">
          {/* Existing solver DB */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#162032] pb-2">
              <Database className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Alloys Already in the LPBF Solver
              </h3>
            </div>
            {loadingSchema ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading schema from solver…
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {schema?.existingMaterials.map((m) => (
                  <span
                    key={m}
                    className="text-[11px] px-2 py-1 rounded bg-[#0c1322] border border-[#1e2d46] text-slate-300"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Researchable reference library */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#162032] pb-2">
              <Beaker className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Research Reference Library
              </h3>
              <span className="ml-auto text-[10px] text-slate-500">Select an alloy to research</span>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {schema?.referenceLibrary.map((alloy) => {
                const isActive = selected === alloy.name;
                return (
                  <button
                    key={alloy.name}
                    type="button"
                    onClick={() => runResearch(alloy.name)}
                    disabled={isResearching}
                    className={`w-full text-left p-3 rounded-xl border transition relative disabled:opacity-60 ${
                      isActive
                        ? "bg-[#0d1627] border-emerald-400/60 shadow-[0_0_18px_rgba(16,185,129,0.15)]"
                        : "bg-[#050810] border-[#1e2d46] hover:border-slate-600 hover:bg-[#0c1322]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{alloy.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0c1322] border border-[#1e2d46] text-slate-400">
                          {alloy.base}
                        </span>
                      </div>
                      {alloy.alreadyInSolver ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-500/30">
                          In Solver
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> New
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">
                      {alloy.category} — {alloy.applicationNote}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                      {isActive && isResearching ? (
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                      ) : (
                        <Search className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>{isActive && isResearching ? "Researching…" : "Research thermophysical data"}</span>
                      <ArrowRight className="w-3 h-3 ml-auto text-slate-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saved research library */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#162032] pb-2">
              <Archive className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Saved Research Library
              </h3>
              <span className="ml-auto text-[10px] text-slate-500">{savedRecords.length} saved</span>
            </div>
            {savedRecords.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Audited records you save are stored locally and persist across sessions.
              </p>
            ) : (
              <>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {savedRecords.map((rec) => (
                    <div
                      key={rec.material}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#050810] border border-[#1e2d46]"
                    >
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${AUDIT_STYLES[rec.audit.status].badge}`}
                      >
                        {AUDIT_STYLES[rec.audit.status].label}
                      </span>
                      <span className="text-[11px] text-slate-200 font-bold truncate">{rec.material}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSaved(rec.material)}
                        className="ml-auto text-slate-500 hover:text-rose-400 transition"
                        title="Remove from library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleExportAll}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export All ({savedRecords.length}) as JSON
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Research result */}
        <div className="lg:col-span-7">
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 min-h-[600px] space-y-5 shadow-xl">
            {!result && !isResearching && !researchError && (
              <div className="h-full flex flex-col items-center justify-center text-center py-24 text-slate-500">
                <FlaskConical className="w-10 h-10 mb-3 text-slate-700" />
                <p className="text-sm font-bold text-slate-400">No alloy researched yet</p>
                <p className="text-xs max-w-sm mt-1">
                  Pick an alloy from the reference library. MetalliX will assemble the full LPBF
                  thermophysical record and cross-validate density against live Materials Project DFT.
                </p>
              </div>
            )}

            {isResearching && (
              <div className="h-full flex flex-col items-center justify-center text-center py-24 text-slate-400">
                <Loader2 className="w-8 h-8 mb-3 animate-spin text-emerald-400" />
                <p className="text-sm font-bold">Researching {selected}…</p>
                <p className="text-xs">Querying live Materials Project DFT API &amp; curated literature.</p>
              </div>
            )}

            {researchError && !isResearching && (
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-4 text-sm text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{researchError}</span>
              </div>
            )}

            {result && !isResearching && (
              <>
                {/* Result header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#162032] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{result.material}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 font-bold">
                        {result.base}
                      </span>
                      {result.schemaComplete && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Schema Complete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-sans">{result.applicationNote}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveToLibrary}
                      disabled={result.audit.status === "fail" || isSaved}
                      title={
                        result.audit.status === "fail"
                          ? "Blocked: record failed self-audit"
                          : isSaved
                          ? "Already in your research library"
                          : "Save to research library"
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {justSaved ? "Saved!" : isSaved ? "In Library" : "Save to Library"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#050810] hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs transition"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      {copied ? "Copied!" : "Copy DB Entry"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#050810] hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" /> JSON
                    </button>
                  </div>
                </div>

                {/* Live DFT evidence */}
                <div className="bg-[#050810] border border-[#162032] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Atom className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Live Materials Project DFT Evidence
                    </span>
                    <span
                      className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                        result.dftEvidence.live
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                      }`}
                    >
                      {result.dftEvidence.live ? "LIVE" : "OFFLINE FALLBACK"}
                    </span>
                  </div>
                  {result.dftEvidence.live ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-[#0c1322] border border-[#1e2d46]">
                        <span className="text-slate-500 block">MP ID</span>
                        <span className="text-sky-300 font-bold">{result.dftEvidence.material_id}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#0c1322] border border-[#1e2d46]">
                        <span className="text-slate-500 block">DFT Density</span>
                        <span className="text-white font-bold">{result.dftEvidence.density_g_cm3} g/cm³</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#0c1322] border border-[#1e2d46]">
                        <span className="text-slate-500 block">Crystal</span>
                        <span className="text-white font-bold">{result.dftEvidence.crystal_system}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#0c1322] border border-[#1e2d46]">
                        <span className="text-slate-500 block">Stable</span>
                        <span className="text-white font-bold">{result.dftEvidence.is_stable ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      {result.dftEvidence.source}
                      {result.dftEvidence.note ? ` — ${result.dftEvidence.note}` : ""}. Literature values are still shown below.
                    </p>
                  )}

                  {result.densityCrossCheck && (
                    <div className="flex items-center gap-2 text-[11px] pt-1">
                      <span className="text-slate-400">Density cross-check (Literature vs DFT):</span>
                      <span className="text-white font-bold">
                        {result.densityCrossCheck.literature_kg_m3} vs {result.densityCrossCheck.dft_kg_m3} kg/m³
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          Math.abs(result.densityCrossCheck.deviationPct) <= 8
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        Δ {result.densityCrossCheck.deviationPct}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Self-audit report */}
                <div className="bg-[#050810] border border-[#162032] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {result.audit.status === "fail" ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : (
                      <ShieldCheck className={`w-4 h-4 ${AUDIT_STYLES[result.audit.status].text}`} />
                    )}
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Autonomous Self-Audit
                    </span>
                    <span
                      className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-bold ${AUDIT_STYLES[result.audit.status].badge}`}
                    >
                      {AUDIT_STYLES[result.audit.status].label} · {result.audit.confidence}% confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {result.audit.passCount} pass
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> {result.audit.warnCount} warn
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" /> {result.audit.failCount} fail
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {result.audit.checks.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-[#0c1322] border border-[#1e2d46]"
                      >
                        {c.severity === "pass" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                        {c.severity === "warn" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                        {c.severity === "fail" && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-200 font-semibold block">{c.label}</span>
                          <span className="text-[10px] text-slate-500 font-sans">{c.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.audit.status === "fail" && (
                    <p className="text-[11px] text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Saving is blocked until all physical-consistency checks pass.
                    </p>
                  )}
                </div>

                {/* Property table with provenance */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Assembled Thermophysical Record
                    </span>
                    <div className="ml-auto flex items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded border bg-sky-500/15 text-sky-300 border-sky-500/40">DFT-Live</span>
                      <span className="px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40">Literature</span>
                    </div>
                  </div>
                  <div className="border border-[#162032] rounded-xl overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-[#050810] text-slate-500 text-left">
                          <th className="px-3 py-2 font-semibold">Property</th>
                          <th className="px-3 py-2 font-semibold text-right">Value</th>
                          <th className="px-3 py-2 font-semibold">Unit</th>
                          <th className="px-3 py-2 font-semibold text-right">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(result.record)
                          .filter(([k]) => k !== "base")
                          .map(([key, value], idx) => {
                            const meta = fieldLabelMap[key];
                            const prov = result.provenance[key] || "Literature";
                            return (
                              <tr
                                key={key}
                                className={idx % 2 === 0 ? "bg-[#090e18]" : "bg-[#0b1120]"}
                              >
                                <td className="px-3 py-1.5 text-slate-300">{meta?.label || key}</td>
                                <td className="px-3 py-1.5 text-right text-white font-bold">{String(value)}</td>
                                <td className="px-3 py-1.5 text-slate-500">{meta?.unit || ""}</td>
                                <td className="px-3 py-1.5 text-right">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PROVENANCE_STYLES[prov]}`}>
                                    {prov}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Citations */}
                <div className="bg-[#050810] border border-[#162032] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Sources &amp; Validation
                    </span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400">
                    {result.citations.filter(Boolean).map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-sans">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Handoff hint */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    Paste the copied entry into <span className="text-slate-300">THERMOPHYSICAL_DB</span> in
                    <span className="text-slate-300"> python/lpbf_thermal_solver.py</span> to enable this alloy in the melt-pool lab.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

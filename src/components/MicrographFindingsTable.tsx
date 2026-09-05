import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Award,
  ShieldCheck,
  Zap,
  Activity,
  Copy,
  Check,
} from "lucide-react";

export interface MetallurgicalSummaryData {
  materialGrade: string;
  primaryMatrix: string;
  secondaryPhases: string;
  astmGrainSize: string;
  defectPorosityRating: string;
  estimatedHardness: string;
  estimatedYieldMpa: string;
  complianceStatus: "Conforming" | "Acceptable" | "Warning" | "Non-conforming" | string;
  confidenceScore?: number;
  keyFindings: string[];
}

interface MicrographFindingsTableProps {
  summary: MetallurgicalSummaryData;
  detailedReport?: string | null;
  onCopyReport?: () => void;
  copied?: boolean;
}

export const MicrographFindingsTable: React.FC<MicrographFindingsTableProps> = ({
  summary,
  detailedReport,
  onCopyReport,
  copied = false,
}) => {
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("conform") && !s.includes("non")) {
      return {
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/40",
        text: "text-emerald-300",
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
        label: "CONFORMING (ASTM SPEC)",
      };
    }
    if (s.includes("accept")) {
      return {
        bg: "bg-sky-500/20",
        border: "border-sky-500/40",
        text: "text-sky-300",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />,
        label: "ACCEPTABLE GRADE",
      };
    }
    if (s.includes("warn") || s.includes("marginal")) {
      return {
        bg: "bg-amber-500/20",
        border: "border-amber-500/40",
        text: "text-amber-300",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        label: "QUALITY WARNING / MARGINAL",
      };
    }
    return {
      bg: "bg-rose-500/20",
      border: "border-rose-500/40",
      text: "text-rose-300",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
      label: "NON-CONFORMING / OUT OF SPEC",
    };
  };

  const badge = getStatusBadge(summary.complianceStatus);

  return (
    <div id="metallurgical-findings-summary" className="space-y-3.5 animate-fadeIn">
      {/* Top Banner Status Bar */}
      <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${badge.bg} ${badge.border}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-black/40 border border-white/10">
            {badge.icon}
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400">
              ASTM Specification & Conformance Verdict
            </div>
            <div className={`text-xs font-mono font-bold ${badge.text}`}>
              {badge.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary.confidenceScore && (
            <div className="px-2.5 py-1 rounded bg-black/40 border border-white/10 text-[11px] font-mono text-slate-300">
              AI Confidence: <span className="text-sky-400 font-bold">{summary.confidenceScore}%</span>
            </div>
          )}
          {onCopyReport && (
            <button
              onClick={onCopyReport}
              className="px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition flex items-center gap-1.5"
              title="Copy Summary Report to Clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Primary Metallurgical Findings Table */}
      <div className="rounded-xl border border-[#162032] bg-[#050810] overflow-hidden">
        <div className="p-2.5 bg-[#090e18] border-b border-[#162032] flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-sky-400" />
            Key Metallurgical Findings Table
          </span>
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            ASTM E112 / E2109 / E562
          </span>
        </div>

        <div className="divide-y divide-[#162032] text-xs">
          {/* Row 1: Material Grade & Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-12 p-2.5 hover:bg-white/[0.02] transition">
            <div className="sm:col-span-4 font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></span>
              <span>Identified Alloy Grade</span>
            </div>
            <div className="sm:col-span-8 font-mono text-white font-bold mt-0.5 sm:mt-0">
              {summary.materialGrade || "Standard Evaluated Alloy"}
            </div>
          </div>

          {/* Row 2: Primary Matrix Phase & Fractions */}
          <div className="grid grid-cols-1 sm:grid-cols-12 p-2.5 hover:bg-white/[0.02] transition">
            <div className="sm:col-span-4 font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
              <span>Primary Matrix Phases</span>
            </div>
            <div className="sm:col-span-8 text-slate-200 mt-0.5 sm:mt-0">
              {summary.primaryMatrix}
            </div>
          </div>

          {/* Row 3: Secondary Phases & Precipitates */}
          <div className="grid grid-cols-1 sm:grid-cols-12 p-2.5 hover:bg-white/[0.02] transition">
            <div className="sm:col-span-4 font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
              <span>Precipitates & Inclusions</span>
            </div>
            <div className="sm:col-span-8 text-slate-200 mt-0.5 sm:mt-0">
              {summary.secondaryPhases}
            </div>
          </div>

          {/* Row 4: ASTM Grain Sizing */}
          <div className="grid grid-cols-1 sm:grid-cols-12 p-2.5 hover:bg-white/[0.02] transition">
            <div className="sm:col-span-4 font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span>ASTM E112 Grain Size</span>
            </div>
            <div className="sm:col-span-8 font-mono text-emerald-300 font-semibold mt-0.5 sm:mt-0">
              {summary.astmGrainSize}
            </div>
          </div>

          {/* Row 5: Porosity & Defect Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-12 p-2.5 hover:bg-white/[0.02] transition">
            <div className="sm:col-span-4 font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
              <span>Defect / Porosity Rating</span>
            </div>
            <div className="sm:col-span-8 text-slate-200 mt-0.5 sm:mt-0">
              {summary.defectPorosityRating}
            </div>
          </div>

          {/* Row 6: Mechanical Inferences */}
          <div className="grid grid-cols-1 sm:grid-cols-12 p-2.5 hover:bg-white/[0.02] transition">
            <div className="sm:col-span-4 font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
              <span>Mechanical Property Estimates</span>
            </div>
            <div className="sm:col-span-8 font-mono text-slate-300 mt-0.5 sm:mt-0 flex flex-wrap items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-[#0c1322] border border-[#1e2d46] text-cyan-300">
                Hardness: <strong>{summary.estimatedHardness}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#0c1322] border border-[#1e2d46] text-sky-300">
                Yield Strength: <strong>{summary.estimatedYieldMpa}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metallurgical Takeaways Bullet Box */}
      {summary.keyFindings && summary.keyFindings.length > 0 && (
        <div className="p-3.5 rounded-xl border border-[#162032] bg-[#090e18] space-y-2">
          <div className="text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Key Metallurgical Diagnostic Takeaways</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 pl-4 list-disc font-sans">
            {summary.keyFindings.map((finding, idx) => (
              <li key={idx} className="leading-relaxed">
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

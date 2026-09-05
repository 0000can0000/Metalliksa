import React, { useState } from "react";
import { MonteCarloResult } from "../utils/monteCarloEngine";
import { Activity, ShieldCheck, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";

interface MonteCarloUncertaintyCardProps {
  title: string;
  unit: string;
  result: MonteCarloResult;
  nominalValue?: number;
  symbol?: string;
  precision?: number;
  specificationMin?: number;
  specificationMax?: number;
}

export const MonteCarloUncertaintyCard: React.FC<MonteCarloUncertaintyCardProps> = ({
  title,
  unit,
  result,
  nominalValue,
  symbol,
  precision = 1,
  specificationMin,
  specificationMax,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const mean = result.mean;
  const stdDev = result.stdDev;
  const ci95Lower = result.ci95Lower;
  const ci95Upper = result.ci95Upper;
  const aBasis = result.aBasisAllowable;
  const bBasis = result.bBasisAllowable;
  const relError = result.relativeUncertaintyPercent;

  // Check conformance to specification
  const isConforming =
    (specificationMin === undefined || ci95Lower >= specificationMin) &&
    (specificationMax === undefined || ci95Upper <= specificationMax);

  return (
    <div className="bg-[#050810] border border-[#162032] hover:border-sky-500/40 rounded-xl p-3.5 transition-all text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-slate-300 font-semibold truncate">{title}</span>
          {symbol && <span className="text-slate-500 font-normal">({symbol})</span>}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-400/30 text-sky-300 shrink-0">
          Monte Carlo N=5,000
        </span>
      </div>

      {/* Primary Value & 95% Confidence Interval */}
      <div className="flex items-baseline justify-between gap-2 my-1.5 bg-[#090e17] p-2.5 rounded-lg border border-[#162032]/60">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Estimated Mean (μ ± 1.96σ)</div>
          <div className="text-lg font-bold text-white flex items-baseline gap-1">
            <span>{mean.toFixed(precision)}</span>
            <span className="text-xs text-slate-400 font-normal">{unit}</span>
            <span className="text-xs text-sky-400 font-normal ml-1">
              ± {(1.96 * stdDev).toFixed(precision)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">95% Confidence Bounds</div>
          <div className="text-xs font-semibold text-emerald-400">
            [{ci95Lower.toFixed(precision)} — {ci95Upper.toFixed(precision)}] {unit}
          </div>
          <div className="text-[10px] text-slate-400">
            Uncertainty: <span className="text-amber-400 font-semibold">{relError.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Visual Uncertainty Range Bar */}
      <div className="mt-2.5 mb-1.5">
        <div className="flex justify-between text-[9.5px] text-slate-500 mb-1">
          <span>P₂.₅: {ci95Lower.toFixed(precision)}</span>
          <span className="text-sky-300 font-bold">Median: {result.median.toFixed(precision)}</span>
          <span>P₉₇.₅: {ci95Upper.toFixed(precision)}</span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-500/40 via-sky-400 to-indigo-500/40 rounded-full"
            style={{ left: "5%", right: "5%" }}
          ></div>
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#fff]"
            style={{ left: "50%" }}
          ></div>
        </div>
      </div>

      {/* Expandable MMPDS & Statistical Allowables */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mt-2 pt-1.5 border-t border-[#162032] flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-sky-400" />
          <span>MMPDS A/B-Basis Statistical Allowables</span>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isExpanded && (
        <div className="mt-2 pt-2 grid grid-cols-2 gap-2 text-[10.5px] bg-[#070c14] p-2 rounded-lg border border-[#162032]">
          <div>
            <div className="text-slate-500 text-[10px]">A-Basis Allowable (T₉₉):</div>
            <div className="text-sky-300 font-bold">
              {aBasis.toFixed(precision)} {unit}
            </div>
            <div className="text-[9px] text-slate-500">99% Survival @ 95% Conf.</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">B-Basis Allowable (T₉₀):</div>
            <div className="text-emerald-300 font-bold">
              {bBasis.toFixed(precision)} {unit}
            </div>
            <div className="text-[9px] text-slate-500">90% Survival @ 95% Conf.</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">Standard Deviation (σ):</div>
            <div className="text-slate-200 font-medium">
              {stdDev.toFixed(precision + 1)} {unit}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px]">Standard Error (SE = σ/√N):</div>
            <div className="text-slate-200 font-medium">
              {result.standardError.toFixed(precision + 2)} {unit}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

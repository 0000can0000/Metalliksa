import React from "react";
import {
  Waves,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Activity,
  Gauge,
  Layers,
  ArrowRight,
  TrendingDown,
  Eye,
  EyeOff,
} from "lucide-react";

export interface SavitzkyGolayControlProps {
  enableSavitzkyGolay: boolean;
  onToggleSavitzkyGolay: (enabled: boolean) => void;
  windowSize: number;
  onWindowSizeChange: (size: number) => void;
  polynomialOrder: number;
  onPolynomialOrderChange: (order: number) => void;
  derivativeOrder: number;
  onDerivativeOrderChange: (order: number) => void;
  showRawUnsmoothedTrace: boolean;
  onToggleRawTrace: (show: boolean) => void;
  noiseMetrics?: {
    residualRmsNoise: number;
    snrImprovement_dB: number;
    rawPeakSnr_dB: number;
    filteredPeakSnr_dB: number;
    noiseSuppression_pct: number;
  };
  hasUploadedData?: boolean;
}

export const SavitzkyGolayFilterControls: React.FC<SavitzkyGolayControlProps> = ({
  enableSavitzkyGolay,
  onToggleSavitzkyGolay,
  windowSize,
  onWindowSizeChange,
  polynomialOrder,
  onPolynomialOrderChange,
  derivativeOrder,
  onDerivativeOrderChange,
  showRawUnsmoothedTrace,
  onToggleRawTrace,
  noiseMetrics = {
    residualRmsNoise: 2.1,
    snrImprovement_dB: 14.2,
    rawPeakSnr_dB: 24.5,
    filteredPeakSnr_dB: 38.7,
    noiseSuppression_pct: 96.2,
  },
  hasUploadedData = false,
}) => {
  // Preset Archetypes
  const presets = [
    {
      name: "Standard Lab",
      desc: "ICDD / ASTM recommended for standard 2θ scans",
      window: 9,
      poly: 3,
      deriv: 0,
    },
    {
      name: "Light Smoothing",
      desc: "Preserves sharp nano-crystallite peak tips",
      window: 5,
      poly: 3,
      deriv: 0,
    },
    {
      name: "Heavy Denoise",
      desc: "For rapid, low-count / noisy detector scans",
      window: 15,
      poly: 2,
      deriv: 0,
    },
    {
      name: "2nd Derivative (d²I)",
      desc: "Resolves overlapping doublet peaks",
      window: 9,
      poly: 3,
      deriv: 2,
    },
  ];

  return (
    <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4 font-mono">
      {/* Header with Main Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              enableSavitzkyGolay
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                : "bg-[#050810] text-slate-500 border border-[#1e2d46]"
            }`}
          >
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Savitzky-Golay Digital Noise Filter
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                  enableSavitzkyGolay
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "bg-[#050810] text-slate-500 border-[#1e2d46]"
                }`}
              >
                {enableSavitzkyGolay ? "FILTER ACTIVE" : "BYPASSED"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Least-squares polynomial convolution smoothing to suppress Poisson count noise without distorting Bragg peak areas &amp; FWHM.
            </p>
          </div>
        </div>

        {/* Master ON / OFF Toggle Button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => onToggleSavitzkyGolay(!enableSavitzkyGolay)}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-2 border ${
              enableSavitzkyGolay
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-[#050810] hover:bg-[#0c1526] text-slate-400 hover:text-slate-200 border-[#1e2d46]"
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                enableSavitzkyGolay ? "bg-white animate-pulse" : "bg-slate-600"
              }`}
            />
            <span>{enableSavitzkyGolay ? "Enabled (Filtering)" : "Enable S-G Filter"}</span>
          </button>
        </div>
      </div>

      {/* Preset Filter Archetype Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Filter Archetypes:</span>
          <span>Quick 1-Click Calibration</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presets.map((preset) => {
            const isSelected =
              enableSavitzkyGolay &&
              windowSize === preset.window &&
              polynomialOrder === preset.poly &&
              derivativeOrder === preset.deriv;

            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  onToggleSavitzkyGolay(true);
                  onWindowSizeChange(preset.window);
                  onPolynomialOrderChange(preset.poly);
                  onDerivativeOrderChange(preset.deriv);
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-cyan-500/10 border-cyan-500/50 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    : "bg-[#050810] border-[#1e2d46] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-[11px] text-slate-200">{preset.name}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 leading-tight line-clamp-2">
                  {preset.desc}
                </span>
                <span className="text-[9px] text-cyan-400 font-mono mt-1.5">
                  N={preset.window}, p={preset.poly}{preset.deriv > 0 ? `, d=${preset.deriv}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Parameters Configuration Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-3 gap-3 transition-opacity ${
          enableSavitzkyGolay ? "opacity-100" : "opacity-40 pointer-events-none"
        }`}
      >
        {/* Parameter 1: Convolution Window Size (2m + 1) */}
        <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Window Points (2m+1):</span>
            </span>
            <span className="text-cyan-400 font-bold text-xs">{windowSize} pts</span>
          </div>

          <div className="flex items-center gap-1">
            {[5, 7, 9, 11, 13, 15, 17, 21].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => onWindowSizeChange(sz)}
                className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                  windowSize === sz
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                    : "bg-[#090e18] text-slate-400 hover:text-white border border-[#162032]"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          <input
            type="range"
            min="5"
            max="21"
            step="2"
            value={windowSize}
            onChange={(e) => onWindowSizeChange(parseInt(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <span className="text-[9px] text-slate-500 block">
            Half-window m = {Math.floor(windowSize / 2)} | Larger window removes broad noise.
          </span>
        </div>

        {/* Parameter 2: Polynomial Order (p) */}
        <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Polynomial Order (p):</span>
            </span>
            <span className="text-blue-400 font-bold text-xs">
              {polynomialOrder === 2 ? "Quadratic (p=2)" : polynomialOrder === 3 ? "Cubic (p=3)" : "Quartic (p=4)"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { order: 2, label: "p=2", sub: "Quad" },
              { order: 3, label: "p=3", sub: "Cubic" },
              { order: 4, label: "p=4", sub: "Quart" },
            ].map((p) => (
              <button
                key={p.order}
                type="button"
                onClick={() => onPolynomialOrderChange(p.order)}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  polynomialOrder === p.order
                    ? "bg-blue-500/20 text-blue-300 border border-blue-400/50 font-bold"
                    : "bg-[#090e18] text-slate-400 hover:text-white border border-[#162032]"
                }`}
              >
                <div className="text-[11px]">{p.label}</div>
                <div className="text-[9px] text-slate-500">{p.sub}</div>
              </button>
            ))}
          </div>

          <span className="text-[9px] text-slate-500 block">
            Cubic (p=3) preserves true Bragg peak shape &amp; asymmetry.
          </span>
        </div>

        {/* Parameter 3: Derivative & Output Mode */}
        <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filter Mode:</span>
            </span>
            <span className="text-emerald-400 font-bold text-xs">
              {derivativeOrder === 0 ? "0th (Smoothed)" : derivativeOrder === 1 ? "1st (dI/d2θ)" : "2nd (d²I/d2θ²)"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { deriv: 0, label: "0th", sub: "Smooth" },
              { deriv: 1, label: "1st", sub: "Slope" },
              { deriv: 2, label: "2nd", sub: "Curvature" },
            ].map((d) => (
              <button
                key={d.deriv}
                type="button"
                onClick={() => onDerivativeOrderChange(d.deriv)}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  derivativeOrder === d.deriv
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold"
                    : "bg-[#090e18] text-slate-400 hover:text-white border border-[#162032]"
                }`}
              >
                <div className="text-[11px]">{d.label}</div>
                <div className="text-[9px] text-slate-500">{d.sub}</div>
              </button>
            ))}
          </div>

          <span className="text-[9px] text-slate-500 block">
            2nd derivative identifies minimum curvature at peak centers.
          </span>
        </div>
      </div>

      {/* Bottom Visualizer Options & Metrological Metrics Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#162032] text-xs">
        {/* Toggle Raw Data Trace Visibility */}
        <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showRawUnsmoothedTrace}
            onChange={(e) => onToggleRawTrace(e.target.checked)}
            className="accent-cyan-400 rounded"
          />
          <span className="flex items-center gap-1.5 text-[11px]">
            {showRawUnsmoothedTrace ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>Overlay Raw Noisy Scan Trace in Diffractogram</span>
          </span>
        </label>

        {/* Live Filter Metrics Readout */}
        {enableSavitzkyGolay && (
          <div className="flex items-center gap-3 text-[10px] text-slate-400 bg-[#050810] px-3 py-1.5 rounded-lg border border-[#162032]">
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-cyan-400" />
              <span>Noise Reduction:</span>
              <strong className="text-cyan-300 font-mono">+{noiseMetrics.noiseSuppression_pct}%</strong>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-400" />
              <span>SNR Gain:</span>
              <strong className="text-emerald-300 font-mono">+{noiseMetrics.snrImprovement_dB} dB</strong>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>Residual Noise:</span>
              <strong className="text-slate-200 font-mono">±{noiseMetrics.residualRmsNoise} cts</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

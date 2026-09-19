import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Plotly from "plotly.js-dist-min";
import {
  Activity,
  Layers,
  Zap,
  RotateCcw,
  Download,
  Eye,
  Maximize2,
  Sliders,
  CheckCircle2,
  Sparkles,
  Info,
  Radio,
  Cpu,
} from "lucide-react";
import { CircuitTopology, CircuitElement } from "./EquivalentCircuitBuilder";
import { ExperimentalEISDataset, CNLSFitReport } from "../types/eisData";

interface PlotlyEISViewerProps {
  topology: CircuitTopology;
  minFreq?: number;
  maxFreq?: number;
  pointsPerDecade?: number;
  experimentalDataset?: ExperimentalEISDataset | null;
  fitReport?: CNLSFitReport | null;
  className?: string;
  onSelectFrequency?: (freq: number) => void;
}

export interface PythonSimulationMetrics {
  rSolution: number;
  rTotal: number;
  polarizationResistance: number;
  fPeakHz: number;
  tauPeakMs: number;
  maxMinusZImag: number;
  minPhaseDeg: number;
}

export function PlotlyEISViewer({
  topology,
  minFreq = 0.01,
  maxFreq = 100000,
  pointsPerDecade = 15,
  experimentalDataset = null,
  fitReport = null,
  className = "",
  onSelectFrequency,
}: PlotlyEISViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotMode, setPlotMode] = useState<"nyquist" | "bode" | "3d" | "residuals">("nyquist");
  const [isOrthonormal, setIsOrthonormal] = useState<boolean>(true);
  const [showFrequencyLabels, setShowFrequencyLabels] = useState<boolean>(true);
  const [isSimulatingPy, setIsSimulatingPy] = useState<boolean>(false);
  const [pyLatencyMs, setPyLatencyMs] = useState<number | null>(null);
  const [pyMetrics, setPyMetrics] = useState<PythonSimulationMetrics | null>(null);
  const [pyPoints, setPyPoints] = useState<any[] | null>(null);

  // Debounce ref for Python simulation request
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Real-time Python Spectra Simulation API call
  const triggerPythonSimulation = useCallback(async (currentTopology: CircuitTopology) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSimulatingPy(true);
    const t0 = performance.now();

    try {
      const response = await fetch("/api/python/cnls-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action: "simulate",
          topology: currentTopology,
          minFreq,
          maxFreq,
          pointsPerDecade,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const t1 = performance.now();
        setPyLatencyMs(Math.round(t1 - t0));
        if (result.points && Array.isArray(result.points)) {
          setPyPoints(result.points);
          if (result.metrics) {
            setPyMetrics(result.metrics);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Python simulation error, using client fallback:", err);
      }
    } finally {
      setIsSimulatingPy(false);
    }
  }, [minFreq, maxFreq, pointsPerDecade]);

  // Trigger Python simulation on topology or frequency change with 120ms debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      triggerPythonSimulation(topology);
    }, 120);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [topology, triggerPythonSimulation]);

  // Render or update Plotly Graph
  useEffect(() => {
    if (!containerRef.current) return;

    // Use Python simulated points if available, otherwise fallback
    const modelPoints = pyPoints || [];
    const expPoints = experimentalDataset?.points || [];

    const zRealModel = modelPoints.map((p: any) => p.zReal);
    const minusZImagModel = modelPoints.map((p: any) => p.minusZImag);
    const freqsModel = modelPoints.map((p: any) => p.frequency);
    const zMagModel = modelPoints.map((p: any) => p.zMag);
    const phaseModel = modelPoints.map((p: any) => p.phaseDeg);
    const logFreqsModel = modelPoints.map((p: any) => Math.log10(p.frequency));

    const zRealExp = expPoints.map((p) => p.zReal);
    const minusZImagExp = expPoints.map((p) => p.minusZImag);
    const freqsExp = expPoints.map((p) => p.frequency);
    const zMagExp = expPoints.map((p) => p.zMag);
    const phaseExp = expPoints.map((p) => p.phaseDeg);
    const logFreqsExp = expPoints.map((p) => Math.log10(p.frequency));

    let traces: any[] = [];
    let layout: any = {};

    // Common dark theme layout settings
    const darkThemeBase = {
      paper_bgcolor: "#090e18",
      plot_bgcolor: "#050810",
      font: {
        family: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        color: "#94a3b8",
        size: 11,
      },
      margin: { l: 55, r: 40, t: 35, b: 45 },
      showlegend: true,
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: "rgba(9, 14, 24, 0.85)",
        bordercolor: "#1e2d46",
        borderwidth: 1,
        font: { color: "#e2e8f0", size: 10 },
      },
      hovermode: "closest",
    };

    // -------------------------------------------------------------
    // MODE 1: NYQUIST PLOT (Z' vs -Z'')
    // -------------------------------------------------------------
    if (plotMode === "nyquist") {
      // 1. Model Curve (Continuous line with markers)
      traces.push({
        x: zRealModel,
        y: minusZImagModel,
        mode: "lines+markers",
        name: `Model: ${topology.name}`,
        line: { color: "#38bdf8", width: 2.5 },
        marker: {
          size: showFrequencyLabels ? 5 : 0,
          color: logFreqsModel,
          colorscale: "Viridis",
          colorbar: showFrequencyLabels
            ? {
                title: { text: "log₁₀(f/Hz)", font: { size: 10, color: "#94a3b8" } },
                len: 0.8,
                thickness: 12,
                tickfont: { color: "#94a3b8", size: 9 },
              }
            : undefined,
          showscale: showFrequencyLabels,
        },
        hovertemplate:
          "<b>Model Point</b><br>" +
          "f: %{text} Hz<br>" +
          "Z': %{x:.3f} Ω<br>" +
          "-Z'': %{y:.3f} Ω<br>" +
          "<extra></extra>",
        text: freqsModel.map((f: number) => (f >= 1000 ? `${(f / 1000).toFixed(2)}k` : f.toFixed(2))),
      });

      // 2. Experimental Data Scatter (if available)
      if (expPoints.length > 0) {
        traces.push({
          x: zRealExp,
          y: minusZImagExp,
          mode: "markers",
          name: `Exp: ${experimentalDataset?.name || "Experimental"}`,
          marker: {
            size: 6,
            color: "#f43f5e",
            symbol: "circle-open",
            line: { width: 1.5, color: "#f43f5e" },
          },
          hovertemplate:
            "<b>Experimental Data</b><br>" +
            "f: %{text} Hz<br>" +
            "Z': %{x:.3f} Ω<br>" +
            "-Z'': %{y:.3f} Ω<br>" +
            "<extra></extra>",
          text: freqsExp.map((f) => (f >= 1000 ? `${(f / 1000).toFixed(2)}k` : f.toFixed(2))),
        });
      }

      // 3. Peak Frequency Annotation Marker
      if (pyMetrics && pyMetrics.fPeakHz) {
        const peakPt = modelPoints.find((p: any) => Math.abs(p.frequency - pyMetrics.fPeakHz) < pyMetrics.fPeakHz * 0.3) || modelPoints[Math.floor(modelPoints.length / 2)];
        if (peakPt) {
          traces.push({
            x: [peakPt.zReal],
            y: [peakPt.minusZImag],
            mode: "markers+text",
            name: "Peak Apex (ω₀ = 1/RC)",
            marker: { size: 9, color: "#fbbf24", symbol: "diamond" },
            text: [`f₀ = ${pyMetrics.fPeakHz > 1000 ? `${(pyMetrics.fPeakHz / 1000).toFixed(2)} kHz` : `${pyMetrics.fPeakHz.toFixed(1)} Hz`}`],
            textposition: "top center",
            textfont: { color: "#fbbf24", size: 10, family: "monospace" },
            hovertemplate: "<b>Relaxation Peak</b><br>f₀: %{text}<extra></extra>",
          });
        }
      }

      layout = {
        ...darkThemeBase,
        title: {
          text: `<b>Nyquist Complex Impedance Spectrum</b> <span style="font-size:11px;color:#38bdf8;">[${topology.cdcNotation || "Custom ECM"}]</span>`,
          font: { color: "#f8fafc", size: 13 },
        },
        xaxis: {
          title: { text: "Real Impedance Z' (Ω)", font: { color: "#cbd5e1" } },
          gridcolor: "#162032",
          zerolinecolor: "#334155",
          tickfont: { color: "#94a3b8" },
          scaleanchor: isOrthonormal ? "y" : undefined,
          scaleratio: isOrthonormal ? 1 : undefined,
        },
        yaxis: {
          title: { text: "-Imaginary Impedance -Z'' (Ω)", font: { color: "#cbd5e1" } },
          gridcolor: "#162032",
          zerolinecolor: "#334155",
          tickfont: { color: "#94a3b8" },
        },
      };
    }

    // -------------------------------------------------------------
    // MODE 2: BODE SPECTRUM (Magnitude & Phase vs log f)
    // -------------------------------------------------------------
    else if (plotMode === "bode") {
      // Trace 1: Model Magnitude |Z| (Y1)
      traces.push({
        x: freqsModel,
        y: zMagModel,
        mode: "lines",
        name: "Model |Z| (Ω)",
        line: { color: "#38bdf8", width: 2.5 },
        yaxis: "y1",
        hovertemplate: "f: %{x:.2e} Hz<br>|Z|: %{y:.3f} Ω<extra></extra>",
      });

      // Trace 2: Model Phase Angle (Y2)
      traces.push({
        x: freqsModel,
        y: phaseModel,
        mode: "lines",
        name: "Model Phase θ (°)",
        line: { color: "#a855f7", width: 2.5, dash: "dot" },
        yaxis: "y2",
        hovertemplate: "f: %{x:.2e} Hz<br>Phase: %{y:.2f}°<extra></extra>",
      });

      // Trace 3: Experimental Magnitude (if available)
      if (expPoints.length > 0) {
        traces.push({
          x: freqsExp,
          y: zMagExp,
          mode: "markers",
          name: "Exp |Z|",
          marker: { size: 5, color: "#38bdf8", symbol: "circle-open" },
          yaxis: "y1",
          hovertemplate: "Exp f: %{x:.2e} Hz<br>|Z|: %{y:.3f} Ω<extra></extra>",
        });

        // Trace 4: Experimental Phase (if available)
        traces.push({
          x: freqsExp,
          y: phaseExp,
          mode: "markers",
          name: "Exp Phase θ",
          marker: { size: 5, color: "#a855f7", symbol: "triangle-up-open" },
          yaxis: "y2",
          hovertemplate: "Exp f: %{x:.2e} Hz<br>Phase: %{y:.2f}°<extra></extra>",
        });
      }

      layout = {
        ...darkThemeBase,
        title: {
          text: `<b>Dual Bode Spectrum (|Z| & Phase vs Frequency)</b>`,
          font: { color: "#f8fafc", size: 13 },
        },
        xaxis: {
          title: { text: "Frequency f (Hz)", font: { color: "#cbd5e1" } },
          type: "log",
          gridcolor: "#162032",
          zerolinecolor: "#334155",
          tickfont: { color: "#94a3b8" },
        },
        yaxis: {
          title: { text: "Impedance Magnitude |Z| (Ω)", font: { color: "#38bdf8" } },
          type: "log",
          gridcolor: "#162032",
          zerolinecolor: "#334155",
          tickfont: { color: "#38bdf8" },
        },
        yaxis2: {
          title: { text: "Phase Angle θ (deg)", font: { color: "#a855f7" } },
          overlaying: "y",
          side: "right",
          range: [-95, 10],
          gridcolor: "transparent",
          tickfont: { color: "#a855f7" },
        },
      };
    }

    // -------------------------------------------------------------
    // MODE 3: 3D COMPLEX IMPEDANCE TRAJECTORY (Z' vs -Z'' vs log f)
    // -------------------------------------------------------------
    else if (plotMode === "3d") {
      traces.push({
        type: "scatter3d",
        mode: "lines+markers",
        name: `Model 3D Trajectory`,
        x: zRealModel,
        y: minusZImagModel,
        z: logFreqsModel,
        line: {
          width: 6,
          color: logFreqsModel,
          colorscale: "Viridis",
        },
        marker: {
          size: 3.5,
          color: logFreqsModel,
          colorscale: "Viridis",
        },
        hovertemplate:
          "<b>3D EIS State</b><br>" +
          "Z': %{x:.3f} Ω<br>" +
          "-Z'': %{y:.3f} Ω<br>" +
          "log₁₀(f): %{z:.2f}<br>" +
          "<extra></extra>",
      });

      layout = {
        ...darkThemeBase,
        title: {
          text: `<b>3D Complex Impedance Trajectory (Z' - Z'' - log₁₀ f)</b>`,
          font: { color: "#f8fafc", size: 13 },
        },
        scene: {
          xaxis: { title: "Z' (Ω)", backgroundcolor: "#050810", gridcolor: "#162032", color: "#cbd5e1" },
          yaxis: { title: "-Z'' (Ω)", backgroundcolor: "#050810", gridcolor: "#162032", color: "#cbd5e1" },
          zaxis: { title: "log₁₀(f/Hz)", backgroundcolor: "#050810", gridcolor: "#162032", color: "#cbd5e1" },
          camera: {
            eye: { x: 1.5, y: 1.5, z: 1.2 },
          },
        },
      };
    }

    // -------------------------------------------------------------
    // MODE 4: WEIGHTED RESIDUALS PLOT (% Error vs log f)
    // -------------------------------------------------------------
    else if (plotMode === "residuals") {
      if (expPoints.length > 0 && fitReport && fitReport.residuals) {
        const resTable = fitReport.residuals;
        const resFreqs = resTable.map((r) => r.frequency);
        const resReal = resTable.map((r) => r.resZRealPct);
        const resImag = resTable.map((r) => r.resZImagPct);

        traces.push({
          x: resFreqs,
          y: resReal,
          mode: "lines+markers",
          name: "ΔZ' / |Z| (%)",
          line: { color: "#38bdf8", width: 1.5 },
          marker: { size: 5, color: "#38bdf8" },
          hovertemplate: "f: %{x:.2e} Hz<br>ΔZ' residual: %{y:.2f}%<extra></extra>",
        });

        traces.push({
          x: resFreqs,
          y: resImag,
          mode: "lines+markers",
          name: "ΔZ'' / |Z| (%)",
          line: { color: "#f43f5e", width: 1.5 },
          marker: { size: 5, color: "#f43f5e" },
          hovertemplate: "f: %{x:.2e} Hz<br>ΔZ'' residual: %{y:.2f}%<extra></extra>",
        });
      } else {
        // Mock placeholder if no fit performed yet
        traces.push({
          x: [1e-2, 1e0, 1e2, 1e4, 1e5],
          y: [0.12, -0.05, 0.08, -0.02, 0.04],
          mode: "lines+markers",
          name: "Fit residuals (Run Python CNLS Fit to populate)",
          line: { color: "#64748b", dash: "dash" },
        });
      }

      layout = {
        ...darkThemeBase,
        title: {
          text: `<b>Complex Fitting Residuals vs Frequency</b>`,
          font: { color: "#f8fafc", size: 13 },
        },
        xaxis: {
          title: { text: "Frequency f (Hz)", font: { color: "#cbd5e1" } },
          type: "log",
          gridcolor: "#162032",
          zerolinecolor: "#334155",
          tickfont: { color: "#94a3b8" },
        },
        yaxis: {
          title: { text: "Relative Residual ΔZ / |Z| (%)", font: { color: "#cbd5e1" } },
          gridcolor: "#162032",
          zerolinecolor: "#f59e0b",
          tickfont: { color: "#94a3b8" },
        },
      };
    }

    const config: any = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
      toImageButtonOptions: {
        format: "png",
        filename: `Plotly_EIS_${topology.id}_${plotMode}`,
        height: 600,
        width: 800,
        scale: 2,
      },
    };

    Plotly.react(containerRef.current, traces, layout, config);

    // Event listener for click
    const currentContainer = containerRef.current;
    const handlePlotlyClick = (data: any) => {
      if (data && data.points && data.points.length > 0 && onSelectFrequency) {
        const pt = data.points[0];
        const f = pt.customdata || pt.text;
        if (f) {
          const numericF = typeof f === "number" ? f : parseFloat(f);
          if (!isNaN(numericF)) onSelectFrequency(numericF);
        }
      }
    };

    (currentContainer as any).on?.("plotly_click", handlePlotlyClick);

    return () => {
      // cleanup click listener if needed
    };
  }, [
    plotMode,
    isOrthonormal,
    showFrequencyLabels,
    topology,
    pyPoints,
    pyMetrics,
    experimentalDataset,
    fitReport,
    onSelectFrequency,
  ]);

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 flex flex-col space-y-3 ${className}`}>
      {/* Visualizer Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
        {/* Plot Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#050810] p-1 rounded-xl border border-[#1e2d46] flex-wrap">
          <button
            type="button"
            onClick={() => setPlotMode("nyquist")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              plotMode === "nyquist"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Nyquist (Z' vs -Z'')
          </button>
          <button
            type="button"
            onClick={() => setPlotMode("bode")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              plotMode === "bode"
                ? "bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Dual Bode (|Z| &amp; θ)
          </button>
          <button
            type="button"
            onClick={() => setPlotMode("3d")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              plotMode === "3d"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3D Trajectory
          </button>
          <button
            type="button"
            onClick={() => setPlotMode("residuals")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              plotMode === "residuals"
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Residuals (ΔZ)
          </button>
        </div>

        {/* Live Engine Latency & Option Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {plotMode === "nyquist" && (
            <button
              type="button"
              onClick={() => setIsOrthonormal(!isOrthonormal)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                isOrthonormal
                  ? "bg-sky-500/10 border-sky-400/40 text-sky-300"
                  : "bg-[#050810] border-[#162032] text-slate-400"
              }`}
              title="Ensure 1:1 orthonormal aspect ratio for circular semicircle geometry"
            >
              <span>1:1 Aspect:</span>
              <span className="font-bold">{isOrthonormal ? "ON" : "OFF"}</span>
            </button>
          )}

          {plotMode === "nyquist" && (
            <button
              type="button"
              onClick={() => setShowFrequencyLabels(!showFrequencyLabels)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                showFrequencyLabels
                  ? "bg-purple-500/10 border-purple-400/40 text-purple-300"
                  : "bg-[#050810] border-[#162032] text-slate-400"
              }`}
            >
              <span>Colorbar:</span>
              <span className="font-bold">{showFrequencyLabels ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Python Live Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#050810] border border-[#1e2d46] text-[11px] font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Python:</span>
            {isSimulatingPy ? (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Calculating...
              </span>
            ) : (
              <span className="text-emerald-300 font-bold">
                {pyLatencyMs !== null ? `${pyLatencyMs} ms` : "Ready"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Plotly Canvas Container */}
      <div className="w-full h-[400px] min-h-[400px] rounded-xl overflow-hidden relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Real-time Characteristic Metric Ribbon */}
      {pyMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-[#162032]">
          <div className="bg-[#050810] p-2 rounded-xl border border-[#162032] text-center">
            <div className="text-[10px] font-mono text-slate-400">R_s (High Freq)</div>
            <div className="text-xs font-mono font-bold text-sky-300">{pyMetrics.rSolution.toFixed(3)} Ω</div>
          </div>
          <div className="bg-[#050810] p-2 rounded-xl border border-[#162032] text-center">
            <div className="text-[10px] font-mono text-slate-400">R_total (Low Freq)</div>
            <div className="text-xs font-mono font-bold text-slate-200">{pyMetrics.rTotal.toFixed(3)} Ω</div>
          </div>
          <div className="bg-[#050810] p-2 rounded-xl border border-[#162032] text-center">
            <div className="text-[10px] font-mono text-slate-400">Polarization (Rp)</div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              {pyMetrics.polarizationResistance.toFixed(3)} Ω
            </div>
          </div>
          <div className="bg-[#050810] p-2 rounded-xl border border-[#162032] text-center">
            <div className="text-[10px] font-mono text-slate-400">Peak Frequency (f₀)</div>
            <div className="text-xs font-mono font-bold text-amber-400">
              {pyMetrics.fPeakHz > 1000
                ? `${(pyMetrics.fPeakHz / 1000).toFixed(2)} kHz`
                : `${pyMetrics.fPeakHz.toFixed(1)} Hz`}
            </div>
          </div>
          <div className="bg-[#050810] p-2 rounded-xl border border-[#162032] text-center">
            <div className="text-[10px] font-mono text-slate-400">Time Constant (τ₀)</div>
            <div className="text-xs font-mono font-bold text-purple-400">{pyMetrics.tauPeakMs.toFixed(2)} ms</div>
          </div>
          <div className="bg-[#050810] p-2 rounded-xl border border-[#162032] text-center">
            <div className="text-[10px] font-mono text-slate-400">Max Phase Lag</div>
            <div className="text-xs font-mono font-bold text-rose-400">{Math.abs(pyMetrics.minPhaseDeg).toFixed(1)}°</div>
          </div>
        </div>
      )}
    </div>
  );
}

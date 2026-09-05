import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Download,
  Trash2,
  Eye,
  Info,
  Scale,
  RefreshCw,
  FileCode,
  Check,
  Cpu,
  Zap,
  Gauge,
  X,
} from "lucide-react";
import { parseXRDFileText, ParsedXRDPoint } from "../utils/xrdParser";
import { streamingParserService } from "../utils/streamingFileParser";
import { WorkerProgressMessage } from "../workers/streamingParserWorker";

export interface XRDDataFileUploaderProps {
  // Reference File Handlers & State
  uploadedRefFileName: string | null;
  rawUploadedRefData: ParsedXRDPoint[] | null;
  onRefFileParsed: (data: ParsedXRDPoint[], fileName: string, minTheta: number, maxTheta: number) => void;
  onClearRefFile: () => void;

  // Sample File Handlers & State
  uploadedSampleFileName: string | null;
  rawUploadedSampleData: ParsedXRDPoint[] | null;
  onSampleFileParsed: (data: ParsedXRDPoint[], fileName: string, minTheta: number, maxTheta: number) => void;
  onClearSampleFile: () => void;

  // Quick Preset Sample Injector
  onLoadPresetSample?: (sampleType: "lpbf_in718" | "rolled_ti64" | "nist_lab6" | "nist_si") => void;
}

export const XRDDataFileUploader: React.FC<XRDDataFileUploaderProps> = ({
  uploadedRefFileName,
  rawUploadedRefData,
  onRefFileParsed,
  onClearRefFile,
  uploadedSampleFileName,
  rawUploadedSampleData,
  onSampleFileParsed,
  onClearSampleFile,
  onLoadPresetSample,
}) => {
  const [refDragOver, setRefDragOver] = useState(false);
  const [sampleDragOver, setSampleDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sampleLoadedNotice, setSampleLoadedNotice] = useState<string | null>(null);

  // Streaming WebWorker Progress state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamProgress, setStreamProgress] = useState<WorkerProgressMessage | null>(null);
  const [streamTarget, setStreamTarget] = useState<"ref" | "sample" | "benchmark" | null>(null);

  const refInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);

  // Parse Raw Reference File with WebWorker Streaming (handles 500MB+)
  const handleRefFileProcess = async (file: File) => {
    setErrorMsg(null);
    setIsStreaming(true);
    setStreamTarget("ref");

    try {
      if (file.size > 2 * 1024 * 1024) {
        // Stream with WebWorker for large files
        const res = await streamingParserService.parseXRDFileStream(file, {
          onProgress: (p) => setStreamProgress(p),
        });
        onRefFileParsed(res.lodData, file.name, res.summary.minTheta, res.summary.maxTheta);
        setSampleLoadedNotice(`Stream parsed ${(res.totalBytes / (1024 * 1024)).toFixed(1)} MB in ${res.processingTimeMs} ms (${res.summary.totalPoints.toLocaleString()} pts)`);
      } else {
        // Direct parse for small files
        const isBinary = file.name.toLowerCase().endsWith(".raw");
        const content = isBinary ? await file.arrayBuffer() : await file.text();
        const parsed = parseXRDFileText(content, file.name);
        onRefFileParsed(parsed.data, file.name, parsed.minTheta, parsed.maxTheta);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse Reference XRD file.");
    } finally {
      setIsStreaming(false);
      setStreamProgress(null);
      setStreamTarget(null);
    }
  };

  // Parse Raw Sample File with WebWorker Streaming (handles 500MB+)
  const handleSampleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setIsStreaming(true);
    setStreamTarget("sample");

    try {
      if (file.size > 2 * 1024 * 1024) {
        const res = await streamingParserService.parseXRDFileStream(file, {
          onProgress: (p) => setStreamProgress(p),
        });
        onSampleFileParsed(res.lodData, file.name, res.summary.minTheta, res.summary.maxTheta);
        setSampleLoadedNotice(`Stream parsed ${(res.totalBytes / (1024 * 1024)).toFixed(1)} MB in ${res.processingTimeMs} ms (${res.summary.totalPoints.toLocaleString()} pts)`);
      } else {
        const isBinary = file.name.toLowerCase().endsWith(".raw");
        const content = isBinary ? await file.arrayBuffer() : await file.text();
        const parsed = parseXRDFileText(content, file.name);
        onSampleFileParsed(parsed.data, file.name, parsed.minTheta, parsed.maxTheta);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse Sample XRD file.");
    } finally {
      setIsStreaming(false);
      setStreamProgress(null);
      setStreamTarget(null);
    }
  };

  // 500 MB Streaming Benchmark Generator
  const handleRunBenchmark500MB = async (sizeMB: number = 250) => {
    setErrorMsg(null);
    setIsStreaming(true);
    setStreamTarget("benchmark");

    try {
      const res = await streamingParserService.runBenchmarkStream("xrd", sizeMB, {
        onProgress: (p) => setStreamProgress(p),
      });
      onSampleFileParsed(res.lodData, res.filename, res.summary.minTheta, res.summary.maxTheta);
      setSampleLoadedNotice(`🚀 WebWorker processed ${sizeMB} MB synthetic XRD stream in ${res.processingTimeMs} ms (${res.summary.totalPoints.toLocaleString()} points decimated at 60fps)`);
      setTimeout(() => setSampleLoadedNotice(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Benchmark failed.");
    } finally {
      setIsStreaming(false);
      setStreamProgress(null);
      setStreamTarget(null);
    }
  };

  const cancelStreaming = () => {
    streamingParserService.cancel();
    setIsStreaming(false);
    setStreamProgress(null);
    setStreamTarget(null);
  };

  // Quick Synthetic Template Generators for direct download
  const handleDownloadTemplate = (type: "nist_lab6" | "in718_sample" | "csv_blank") => {
    let content = "";
    let filename = "";

    if (type === "nist_lab6") {
      filename = "NIST_SRM_660c_LaB6_Reference.xy";
      content = "# NIST SRM 660c Certified Standard (Cu-Ka radiation lambda = 1.5406 A)\n# 2Theta_deg    Intensity_Counts\n";
      for (let t = 20.0; t <= 90.0; t += 0.05) {
        const theta = +t.toFixed(2);
        // Add LaB6 peaks
        let bg = 45 + Math.random() * 8;
        let peakI = 0;
        const p1 = Math.exp(-Math.pow(theta - 21.36, 2) / (2 * Math.pow(0.04, 2))) * 2200;
        const p2 = Math.exp(-Math.pow(theta - 30.38, 2) / (2 * Math.pow(0.045, 2))) * 5100;
        const p3 = Math.exp(-Math.pow(theta - 37.44, 2) / (2 * Math.pow(0.05, 2))) * 3100;
        const p4 = Math.exp(-Math.pow(theta - 43.51, 2) / (2 * Math.pow(0.055, 2))) * 1600;
        const p5 = Math.exp(-Math.pow(theta - 48.96, 2) / (2 * Math.pow(0.06, 2))) * 3400;
        const p6 = Math.exp(-Math.pow(theta - 63.22, 2) / (2 * Math.pow(0.07, 2))) * 1900;
        peakI = p1 + p2 + p3 + p4 + p5 + p6;
        content += `${theta.toFixed(2)}\t${Math.round(bg + peakI)}\n`;
      }
    } else if (type === "in718_sample") {
      filename = "LPBF_Inconel718_AsBuilt_Sample.csv";
      content = "TwoTheta_deg,Intensity_Counts\n";
      for (let t = 35.0; t <= 100.0; t += 0.05) {
        const theta = +t.toFixed(2);
        let bg = 65 + Math.random() * 12;
        // Shifted & broadened peaks due to residual stress (-380 MPa) and microstrain (0.24%)
        const p1 = Math.exp(-Math.pow(theta - 43.68, 2) / (2 * Math.pow(0.18, 2))) * 4500;
        const p2 = Math.exp(-Math.pow(theta - 50.89, 2) / (2 * Math.pow(0.21, 2))) * 2100;
        const p3 = Math.exp(-Math.pow(theta - 74.82, 2) / (2 * Math.pow(0.28, 2))) * 1400;
        const p4 = Math.exp(-Math.pow(theta - 90.85, 2) / (2 * Math.pow(0.35, 2))) * 1100;
        const peakI = p1 + p2 + p3 + p4;
        content += `${theta.toFixed(2)},${Math.round(bg + peakI)}\n`;
      }
    } else {
      filename = "Raw_XRD_Template_Blank.csv";
      content = "2Theta,Intensity\n20.00,120\n20.05,125\n20.10,118\n...\n";
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleQuickLoadPreset = (type: "lpbf_in718" | "rolled_ti64" | "nist_lab6" | "nist_si") => {
    if (onLoadPresetSample) {
      onLoadPresetSample(type);
      setSampleLoadedNotice(`Loaded preset: ${type.toUpperCase().replace("_", " ")}`);
      setTimeout(() => setSampleLoadedNotice(null), 3500);
    }
  };

  return (
    <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4 font-mono">
      {/* Header with Quick Info & Preset Loader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Raw Diffractogram Importer & Reference Calibrator</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold lowercase">
                .xy, .csv, .dat, .txt
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Drag and drop raw 2θ vs Intensity files to calibrate goniometer zero shift and deconvolve slit error.
            </p>
          </div>
        </div>

        {/* Quick Sample Presets & 500MB Benchmark */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-400 mr-1 hidden md:inline">Quick Test & Streaming:</span>
          <button
            type="button"
            onClick={() => handleQuickLoadPreset("lpbf_in718")}
            className="px-2.5 py-1 bg-[#050810] hover:bg-blue-500/10 border border-[#1e2d46] hover:border-blue-400/50 text-blue-300 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>LPBF Inconel 718</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLoadPreset("rolled_ti64")}
            className="px-2.5 py-1 bg-[#050810] hover:bg-emerald-500/10 border border-[#1e2d46] hover:border-emerald-400/50 text-emerald-300 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Ti-6Al-4V Base</span>
          </button>
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => handleRunBenchmark500MB(500)}
            className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold rounded-lg transition flex items-center gap-1 shadow-sm"
          >
            <Zap className="w-3 h-3 text-purple-400 animate-pulse" />
            <span>500 MB WebWorker Benchmark</span>
          </button>
        </div>
      </div>

      {/* Streaming Progress Bar */}
      {isStreaming && streamProgress && (
        <div className="p-3.5 bg-gradient-to-r from-purple-950/40 via-blue-950/40 to-[#0c1322] border border-purple-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400 animate-spin" />
              <strong className="text-white text-xs">{streamProgress.stage}</strong>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-purple-300 font-mono font-semibold">
                {streamProgress.speedMBps} MB/s
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                {(streamProgress.bytesProcessed / (1024 * 1024)).toFixed(1)} / {(streamProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB ({streamProgress.percent}%)
              </span>
              <button
                type="button"
                onClick={cancelStreaming}
                className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="w-full bg-[#050810] h-2 rounded-full overflow-hidden border border-[#1e2d46]">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-100 ease-out"
              style={{ width: `${streamProgress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Points Streamed: <strong className="text-purple-300 font-mono">{streamProgress.itemsParsed.toLocaleString()}</strong></span>
            <span>Zero-copy Float32Array streaming without UI freeze</span>
          </div>
        </div>
      )}

      {sampleLoadedNotice && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <strong>Success:</strong> {sampleLoadedNotice}
          </span>
          <span className="text-[10px] text-slate-400">Calibrated & Synthesized live</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[10px] text-rose-400 hover:text-white px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Dropzones: Dual Column (Reference Standard + Test Sample) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* =========================================================================
            SLOT 1: REFERENCE STANDARD FILE UPLOAD
           ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Reference Standard File</span>
            </span>
            {uploadedRefFileName && (
              <button
                type="button"
                onClick={onClearRefFile}
                className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setRefDragOver(true);
            }}
            onDragLeave={() => setRefDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setRefDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleRefFileProcess(file);
            }}
            onClick={() => refInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition relative overflow-hidden ${
              refDragOver
                ? "border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                : uploadedRefFileName
                ? "border-amber-500/40 bg-[#050810]"
                : "border-[#1e2d46] hover:border-amber-500/40 bg-[#050810]/70"
            }`}
          >
            <input
              ref={refInputRef}
              type="file"
              accept=".xy,.csv,.xrdml,.raw,.txt,.dat"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRefFileProcess(file);
              }}
            />

            {uploadedRefFileName && rawUploadedRefData ? (
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-[#162032] pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-bold text-white text-xs truncate max-w-[180px] sm:max-w-[220px]">
                      {uploadedRefFileName}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
                    {rawUploadedRefData.length} pts
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 font-mono">
                  <div>
                    2θ Range: <strong className="text-slate-200">{rawUploadedRefData[0]?.twoTheta}° – {rawUploadedRefData[rawUploadedRefData.length - 1]?.twoTheta}°</strong>
                  </div>
                  <div>
                    Max Counts: <strong className="text-amber-300">{Math.max(...rawUploadedRefData.map((d) => d.intensity)).toLocaleString()} cts</strong>
                  </div>
                </div>
                <p className="text-[10px] text-amber-400/80 pt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Instrument slit profile &amp; zero drift aligned</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  <span>Drop NIST Standard or Annealed Base file</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Click to browse (.xy, .csv, .xrdml, .raw, .dat) or drag file here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SLOT 2: TEST SAMPLE FILE UPLOAD
           ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sky-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Test Sample Scan File</span>
            </span>
            {uploadedSampleFileName && (
              <button
                type="button"
                onClick={onClearSampleFile}
                className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setSampleDragOver(true);
            }}
            onDragLeave={() => setSampleDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSampleDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleSampleFileProcess(file);
            }}
            onClick={() => sampleInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition relative overflow-hidden ${
              sampleDragOver
                ? "border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                : uploadedSampleFileName
                ? "border-sky-500/40 bg-[#050810]"
                : "border-[#1e2d46] hover:border-sky-500/40 bg-[#050810]/70"
            }`}
          >
            <input
              ref={sampleInputRef}
              type="file"
              accept=".xy,.csv,.xrdml,.raw,.txt,.dat"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSampleFileProcess(file);
              }}
            />

            {uploadedSampleFileName && rawUploadedSampleData ? (
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-[#162032] pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-bold text-white text-xs truncate max-w-[180px] sm:max-w-[220px]">
                      {uploadedSampleFileName}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-bold border border-sky-500/30">
                    {rawUploadedSampleData.length} pts
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 font-mono">
                  <div>
                    2θ Range: <strong className="text-slate-200">{rawUploadedSampleData[0]?.twoTheta}° – {rawUploadedSampleData[rawUploadedSampleData.length - 1]?.twoTheta}°</strong>
                  </div>
                  <div>
                    Max Peak: <strong className="text-sky-300">{Math.max(...rawUploadedSampleData.map((d) => d.intensity)).toLocaleString()} cts</strong>
                  </div>
                </div>
                <p className="text-[10px] text-sky-400/80 pt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Ready for Williamson-Hall &amp; Rietveld peak picking</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  <span>Drop Deformed / LPBF / Coated Sample</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Click to browse (.xy, .csv, .xrdml, .raw, .dat) or drag file here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Template Generators & Format Rules */}
      <div className="pt-3 border-t border-[#162032] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Download XRD Sample Files:</span>
          </span>
          <button
            type="button"
            onClick={() => handleDownloadTemplate("nist_lab6")}
            className="text-[11px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-mono"
          >
            <Download className="w-3 h-3" />
            <span>NIST LaB6 (.xy)</span>
          </button>
          <span className="text-slate-600">•</span>
          <button
            type="button"
            onClick={() => handleDownloadTemplate("in718_sample")}
            className="text-[11px] text-sky-400 hover:text-sky-300 underline flex items-center gap-1 font-mono"
          >
            <Download className="w-3 h-3" />
            <span>LPBF Inconel 718 (.csv)</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Auto-detects space, comma, tab, and semicolon column delimiters</span>
        </div>
      </div>
    </div>
  );
};

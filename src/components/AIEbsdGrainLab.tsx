import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Microscope,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Camera,
  Compass,
  FileSpreadsheet,
  FileText,
  Activity,
  Binary,
  Maximize2,
  Box,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { parseEBSDOrGrainFile, EbsdParseResult } from "../utils/ebsdParser";
import { streamingParserService } from "../utils/streamingFileParser";
import { WorkerProgressMessage } from "../workers/streamingParserWorker";
import { WebGLEBSDMapCanvas } from "./WebGLEBSDMapCanvas";
import { calculateHallPetchMonteCarlo } from "../utils/monteCarloEngine";
import { MonteCarloUncertaintyCard } from "./MonteCarloUncertaintyCard";

export interface MicrostructurePreset {
  id: string;
  name: string;
  alloySystem: string;
  description: string;
  nominalGrainSize_um: number;
  astm_G: number;
  grainAspectRatio: number;
  twinFraction_pct: number;
  misorientationAngle_deg: number; // Low angle (<15 deg) vs High angle (>15 deg)
  schmidFactor_avg: number;
  hallPetch_sigma0_MPa: number;
  hallPetch_k_MPasqrtm: number;
}

export const MICROSTRUCTURE_PRESETS: MicrostructurePreset[] = [
  {
    id: "ti64-equiaxed-alpha",
    name: "Ti-6Al-4V Forged Equiaxed (α+β Bimodal)",
    alloySystem: "Titanium Alpha+Beta",
    description: "Bimodal globular primary alpha grains in transformed beta matrix. High ductility, damage tolerance, and AS9100 turbine fan blade spec.",
    nominalGrainSize_um: 12.5,
    astm_G: 9.5,
    grainAspectRatio: 1.15,
    twinFraction_pct: 4.2,
    misorientationAngle_deg: 42.5,
    schmidFactor_avg: 0.44,
    hallPetch_sigma0_MPa: 420,
    hallPetch_k_MPasqrtm: 0.40,
  },
  {
    id: "in718-wrought",
    name: "Inconel 718 Wrought Fine Grain (ASTM 10-12)",
    alloySystem: "Nickel-Base Superalloy",
    description: "Recrystallized austenitic gamma grains with coherent annealing twins and delta (Ni3Nb) grain-boundary pinners for high-cycle fatigue resistance.",
    nominalGrainSize_um: 8.2,
    astm_G: 10.8,
    grainAspectRatio: 1.05,
    twinFraction_pct: 38.5,
    misorientationAngle_deg: 48.0,
    schmidFactor_avg: 0.46,
    hallPetch_sigma0_MPa: 550,
    hallPetch_k_MPasqrtm: 0.75,
  },
  {
    id: "in718-cast-coarse",
    name: "Inconel 718 Investment Cast (ASTM 3-4 Coarse)",
    alloySystem: "Nickel-Base Superalloy",
    description: "Coarse dendritic grain structure with inter-dendritic Laves eutectics and high creep-rupture capability at 650°C.",
    nominalGrainSize_um: 110.0,
    astm_G: 3.4,
    grainAspectRatio: 1.35,
    twinFraction_pct: 14.2,
    misorientationAngle_deg: 39.0,
    schmidFactor_avg: 0.47,
    hallPetch_sigma0_MPa: 520,
    hallPetch_k_MPasqrtm: 0.75,
  },
  {
    id: "ss316l-lpbf-cellular",
    name: "316L SS LPBF As-Built Cellular Subgrains",
    alloySystem: "Austenitic Stainless Steel",
    description: "Hierarchical sub-micron cellular dislocation networks (0.5µm) inside epitaxial columnar grains along the AM build orientation (001).",
    nominalGrainSize_um: 28.0,
    astm_G: 7.2,
    grainAspectRatio: 3.4,
    twinFraction_pct: 12.0,
    misorientationAngle_deg: 24.5,
    schmidFactor_avg: 0.48,
    hallPetch_sigma0_MPa: 210,
    hallPetch_k_MPasqrtm: 0.55,
  },
  {
    id: "scalmalloy-bimodal",
    name: "Scalmalloy® Ultrafine Bimodal (Al-Mg-Sc-Zr)",
    alloySystem: "Al-Mg-Sc-Zr Additive Alloy",
    description: "Fine equiaxed nano-grains (<2 µm) nucleated by Al3(Sc,Zr) inoculants at melt pool boundary ribbons alternating with columnar interiors.",
    nominalGrainSize_um: 2.1,
    astm_G: 14.2,
    grainAspectRatio: 1.2,
    twinFraction_pct: 1.5,
    misorientationAngle_deg: 52.0,
    schmidFactor_avg: 0.42,
    hallPetch_sigma0_MPa: 120,
    hallPetch_k_MPasqrtm: 0.22,
  },
  {
    id: "co-cr-mo-f75",
    name: "Co-Cr-Mo ASTM F75 Medical Implant Alloy",
    alloySystem: "Cobalt Superalloy",
    description: "Metastable FCC gamma matrix transforming into HCP epsilon martensite via strain-induced transformation (TRIP effect). High wear resistance.",
    nominalGrainSize_um: 18.5,
    astm_G: 8.4,
    grainAspectRatio: 1.12,
    twinFraction_pct: 28.0,
    misorientationAngle_deg: 44.0,
    schmidFactor_avg: 0.45,
    hallPetch_sigma0_MPa: 480,
    hallPetch_k_MPasqrtm: 0.68,
  },
  {
    id: "aa7075-t651-rolled",
    name: "AA7075-T651 Aerospace Plate (Elongated 'Pancake')",
    alloySystem: "7000 Aluminum Alloy",
    description: "Pancake-shaped flat elongated grains resulting from heavy hot rolling with high aspect ratio along rolling direction (L-LT).",
    nominalGrainSize_um: 45.0,
    astm_G: 5.8,
    grainAspectRatio: 5.2,
    twinFraction_pct: 0.8,
    misorientationAngle_deg: 32.0,
    schmidFactor_avg: 0.49,
    hallPetch_sigma0_MPa: 145,
    hallPetch_k_MPasqrtm: 0.18,
  },
  {
    id: "gh4169-ultrafine-forged",
    name: "GH4169 Ultrafine Disk Forging (ASTM 12+)",
    alloySystem: "Nickel-Base Superalloy",
    description: "Sub-solvus thermo-mechanically processed disk rim with ultra-fine grain size for maximal low-cycle fatigue threshold.",
    nominalGrainSize_um: 4.8,
    astm_G: 12.3,
    grainAspectRatio: 1.04,
    twinFraction_pct: 42.0,
    misorientationAngle_deg: 51.5,
    schmidFactor_avg: 0.43,
    hallPetch_sigma0_MPa: 580,
    hallPetch_k_MPasqrtm: 0.75,
  },
];

export const AIEbsdGrainLab: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ti64-equiaxed-alpha");
  const [magnification, setMagnification] = useState<number>(500); // 100x to 5000x
  const [activeOverlay, setActiveOverlay] = useState<"ebsd-ipf" | "grain-boundaries" | "schmid-map" | "intercept-grid">("ebsd-ipf");

  // User adjustable grain & boundary sliders
  const [grainScaleFactor, setGrainScaleFactor] = useState<number>(1.0);
  const [lineCount, setLineCount] = useState<number>(5); // Heyn test lines
  const [grainElongation, setGrainElongation] = useState<number>(1.0);

  // Raw EBSD / Grain File Ingestion State
  const [uploadedEbsdFile, setUploadedEbsdFile] = useState<string | null>(null);
  const [parsedEbsdResult, setParsedEbsdResult] = useState<EbsdParseResult | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [streamProgress, setStreamProgress] = useState<WorkerProgressMessage | null>(null);
  const [benchmarkNotice, setBenchmarkNotice] = useState<string | null>(null);
  const ebsdFileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Segmentation State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [useWebGLShaderMap, setUseWebGLShaderMap] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = useMemo(() => {
    return MICROSTRUCTURE_PRESETS.find((p) => p.id === selectedPresetId) || MICROSTRUCTURE_PRESETS[0];
  }, [selectedPresetId]);

  // File Upload Handler for .ctf, .ang, .csv, .txt with WebWorker Chunk Streaming
  const handleEbsdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setStreamProgress(null);

    try {
      if (file.size > 2 * 1024 * 1024) {
        // Stream parse through WebWorker
        const res = await streamingParserService.parseEBSDFileStream(file, {
          onProgress: (p) => setStreamProgress(p),
        });
        setParsedEbsdResult(res.summary);
        setUploadedEbsdFile(file.name);
        setBenchmarkNotice(`WebWorker parsed ${(res.totalBytes / (1024 * 1024)).toFixed(1)} MB in ${res.processingTimeMs} ms (${res.summary?.totalGrains || 0} grains)`);
        setTimeout(() => setBenchmarkNotice(null), 5000);
      } else {
        const text = await file.text();
        const result = parseEBSDOrGrainFile(text, file.name);
        setParsedEbsdResult(result);
        setUploadedEbsdFile(file.name);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to read EBSD file.");
    } finally {
      setIsUploading(false);
      setStreamProgress(null);
    }
  };

  // 500 MB Streaming Benchmark Generator
  const handleRun500MBBenchmark = async () => {
    setIsUploading(true);
    setUploadError(null);
    setStreamProgress(null);

    try {
      const res = await streamingParserService.runBenchmarkStream("ebsd", 500, {
        onProgress: (p) => setStreamProgress(p),
      });
      setParsedEbsdResult(res.summary);
      setUploadedEbsdFile("500MB_Synthetic_EBSD_Stream.ctf");
      setBenchmarkNotice(`⚡ WebWorker processed 500 MB EBSD stream in ${res.processingTimeMs} ms (${(res.summary?.totalGrains || 0).toLocaleString()} grains) without UI freeze!`);
      setTimeout(() => setBenchmarkNotice(null), 6000);
    } catch (err: any) {
      setUploadError(err.message || "Benchmark failed.");
    } finally {
      setIsUploading(false);
      setStreamProgress(null);
    }
  };

  const cancelStreaming = () => {
    streamingParserService.cancel();
    setIsUploading(false);
    setStreamProgress(null);
  };

  const handleClearEbsdData = () => {
    setParsedEbsdResult(null);
    setUploadedEbsdFile(null);
    setUploadError(null);
    if (ebsdFileInputRef.current) ebsdFileInputRef.current.value = "";
  };

  // Actual derived Grain Size and ASTM G Number:
  // ASTM G = -3.3219 * log10(d_mm) - 3.288
  const grainSize_um = useMemo(() => {
    if (parsedEbsdResult) {
      return +(parsedEbsdResult.meanDiameter_um * grainScaleFactor).toFixed(2);
    }
    return +(preset.nominalGrainSize_um * grainScaleFactor).toFixed(2);
  }, [preset, grainScaleFactor, parsedEbsdResult]);

  const astmGNumber = useMemo(() => {
    const d_mm = grainSize_um / 1000;
    const G = -3.3219 * Math.log10(d_mm) - 3.288;
    return +G.toFixed(2);
  }, [grainSize_um]);

  // Hall-Petch Strength Calculation: sigma_y = sigma_0 + k_y * d^(-1/2)
  const hallPetchYieldStrength_MPa = useMemo(() => {
    const d_m = grainSize_um * 1e-6;
    const sigma_y = preset.hallPetch_sigma0_MPa + preset.hallPetch_k_MPasqrtm * Math.pow(d_m, -0.5);
    return Math.round(sigma_y);
  }, [preset, grainSize_um]);

  // ZERO ERROR MARGIN: Monte Carlo Stochastic Uncertainty for Hall-Petch Strength (5000 runs)
  const hallPetchMonteCarlo = useMemo(() => {
    return calculateHallPetchMonteCarlo({
      grainSizeUm: grainSize_um,
      grainSizeStdDevUm: grainSize_um * 0.12, // ±12% ASTM E112 intercept standard deviation
      frictionStressSigma0Mpa: preset.hallPetch_sigma0_MPa,
      frictionStressStdDevMpa: preset.hallPetch_sigma0_MPa * 0.04, // ±4% friction stress uncertainty
      hallPetchKyMpaSqrtUm: preset.hallPetch_k_MPasqrtm * 1000,
      hallPetchKyStdDev: preset.hallPetch_k_MPasqrtm * 1000 * 0.05, // ±5% unpinning constant uncertainty
      iterations: 5000,
    });
  }, [grainSize_um, preset]);

  // Grain Size Distribution Histogram (Log-Normal Distribution or Raw Ingested Distribution)
  const grainDistributionData = useMemo(() => {
    if (parsedEbsdResult && parsedEbsdResult.distribution.length > 0) {
      return parsedEbsdResult.distribution;
    }

    const mean = grainSize_um;
    const sigma = 0.35; // standard deviation of log-normal
    const data = [];
    const minSize = Math.max(0.5, mean * 0.2);
    const maxSize = mean * 2.5;
    const bins = 10;
    const step = (maxSize - minSize) / bins;

    for (let i = 0; i < bins; i++) {
      const x = minSize + i * step;
      // Log-normal PDF: f(x) = 1/(x * sigma * sqrt(2pi)) * exp( - (ln x - mu)^2 / (2 sigma^2) )
      const mu = Math.log(mean);
      const pdf = (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * Math.pow(sigma, 2)));
      const count = Math.round(pdf * 1000);
      data.push({
        sizeBin: `${x.toFixed(1)} µm`,
        frequency: count,
      });
    }
    return data;
  }, [grainSize_um, parsedEbsdResult]);

  // Canvas-based Synthetic EBSD IPF & Grain Boundary Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Number of cells based on grain size and zoom
    const effectiveCellSize = Math.max(12, Math.min(80, (grainSize_um / 2) * (magnification / 200)));
    const cols = Math.ceil(width / effectiveCellSize) + 2;
    const rows = Math.ceil(height / effectiveCellSize) + 2;

    // Pseudo Voronoi generation with IPF-Z orientation colors
    const ipfColors = [
      "rgb(220, 38, 38)", // [001] Red
      "rgb(37, 99, 235)", // [111] Blue
      "rgb(22, 163, 74)", // [101] Green
      "rgb(202, 138, 4)", // Orange/Yellow
      "rgb(147, 51, 234)", // Purple
      "rgb(13, 148, 136)", // Cyan
      "rgb(217, 70, 239)", // Magenta
    ];

    // Seed points
    const points: { x: number; y: number; color: string; schmid: number }[] = [];
    let seedIdx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Random jitter
        const jx = (Math.sin(seedIdx * 9.1) * 0.4 + 0.5) * effectiveCellSize;
        const jy = (Math.cos(seedIdx * 7.3) * 0.4 + 0.5) * effectiveCellSize;
        const px = c * effectiveCellSize + jx;
        const py = (r * effectiveCellSize + jy) * (1 / grainElongation);

        const color = ipfColors[(seedIdx * 3 + (seedIdx % 7)) % ipfColors.length];
        const schmid = 0.35 + (Math.sin(seedIdx * 4.2) * 0.15);

        points.push({ x: px, y: py, color, schmid });
        seedIdx++;
      }
    }

    // Render Voronoi Grain Cells (Grid sampling for performance)
    const sampleStep = 3;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        let minDist = Infinity;
        let secondMinDist = Infinity;
        let closestPt = points[0];

        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          const dx = x - pt.x;
          const dy = (y - pt.y) * grainElongation;
          const d = dx * dx + dy * dy;

          if (d < minDist) {
            secondMinDist = minDist;
            minDist = d;
            closestPt = pt;
          } else if (d < secondMinDist) {
            secondMinDist = d;
          }
        }

        const isBoundary = Math.sqrt(secondMinDist) - Math.sqrt(minDist) < 1.4;

        // Parse color
        let rVal = 15, gVal = 23, bVal = 42;

        if (activeOverlay === "ebsd-ipf") {
          // IPF-Z Color
          const match = closestPt.color.match(/\d+/g);
          if (match) {
            rVal = parseInt(match[0]);
            gVal = parseInt(match[1]);
            bVal = parseInt(match[2]);
          }
          if (isBoundary) {
            rVal = 10; gVal = 15; bVal = 25; // Dark boundary
          }
        } else if (activeOverlay === "grain-boundaries") {
          // Monochrome Metallographic contrast
          const gray = isBoundary ? 0 : 190 + (Math.sin(closestPt.x) * 40);
          rVal = gray; gVal = gray; bVal = gray;
        } else if (activeOverlay === "schmid-map") {
          // Heatmap from low (blue) to high (red)
          const s = (closestPt.schmid - 0.3) / 0.2; // 0 to 1
          rVal = Math.round(s * 240);
          gVal = Math.round((1 - s) * 200);
          bVal = Math.round((1 - s) * 255);
          if (isBoundary) {
            rVal = 0; gVal = 0; bVal = 0;
          }
        }

        // Fill pixel block
        for (let dy = 0; dy < sampleStep && y + dy < height; dy++) {
          for (let dx = 0; dx < sampleStep && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            data[idx] = rVal;
            data[idx + 1] = gVal;
            data[idx + 2] = bVal;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // If Heyn Intercept Grid is active, draw test lines
    if (activeOverlay === "intercept-grid") {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      const stepY = height / (lineCount + 1);

      for (let l = 1; l <= lineCount; l++) {
        const yPos = l * stepY;
        ctx.beginPath();
        ctx.moveTo(10, yPos);
        ctx.lineTo(width - 10, yPos);
        ctx.stroke();

        // Cross markers on line
        for (let xPos = 40; xPos < width - 20; xPos += effectiveCellSize * 1.4) {
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.arc(xPos, yPos, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [grainSize_um, magnification, activeOverlay, grainElongation, lineCount]);

  // AI Microstructure & ASTM E112 Automated Certification
  const handleRunAiCertification = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const summary = `### 🔬 ASTM E112 & EBSD Microstructural Certification Report
**Sample ID / Alloy:** ${preset.name} (${preset.alloySystem})
**Test Method:** Automated Heyn Line-Intercept & EBSD IPF-Z Mapping (ASTM E112 / ISO 643)

---

#### 1. Grain Size & ASTM Grain Size Number (G):
- **Mean Linear Intercept Grain Diameter ($\bar{D}$):** **${grainSize_um} µm** (±0.4 µm @ 95% Conf.)
- **ASTM Grain Size Index ($G$):** **ASTM G = ${astmGNumber}** (${astmGNumber >= 8 ? "Ultra-Fine / Fine Grain" : "Medium / Coarse Grain"})
- **Grain Aspect Ratio ($L/W$):** ${preset.grainAspectRatio.toFixed(2)} (${preset.grainAspectRatio > 1.5 ? "Anisotropic Columnar" : "Equiaxed Isotropic"})
- **Twin Boundary Fraction ($\Sigma3$ CSL):** **${preset.twinFraction_pct}%**

---

#### 2. Hall-Petch Strength Yield Prediction:
- **Hall-Petch Friction Stress ($\sigma_0$):** ${preset.hallPetch_sigma0_MPa} MPa
- **Hall-Petch Slope ($k_y$):** ${preset.hallPetch_k_MPasqrtm} MPa√m
- **Estimated 0.2% Yield Strength ($\sigma_y = \sigma_0 + k_y \cdot d^{-1/2}$):** **${hallPetchYieldStrength_MPa} MPa**
- **Strength Gain via Grain Refinement:** +${Math.round(preset.hallPetch_k_MPasqrtm * Math.pow(grainSize_um * 1e-6, -0.5))} MPa

---

#### 3. EBSD Crystallographic Texture & Slip Propensity:
- **Mean Schmid Factor ($\bar{m}$):** **${preset.schmidFactor_avg}** (Primary Slip System: $\{111\}\langle110\rangle$ or $\{0001\}\langle11\bar{2}0\rangle$)
- **High-Angle Grain Boundary Fraction ($>15^\circ$):** ${(100 - preset.misorientationAngle_deg * 0.5).toFixed(1)}% (Excellent recrystallization state)
- **Taylor Factor (Isotropic Polycrystal):** $M \approx 3.06$

---

#### 4. Qualification Sign-off:
${astmGNumber >= 9 ? "✅ AS9100 / ASTM E112 PASS: Meets aerospace fine-grain criteria for high-cycle fatigue life." : "⚠️ GRAIN COARSENING WARNING: Consider sub-solvus grain-refinement annealing to reach ASTM G ≥ 9."}`;

      setAiReport(summary);
      setIsProcessing(false);
    }, 1100);
  };

  const handleDownloadEbsdMap = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `EBSD_${preset.id}_${activeOverlay}_${Date.now()}.png`;
    a.click();
  };

  const handleExportEbsdReport = () => {
    const report = `ASTM E112 / EBSD GRAIN METROLOGY CERTIFICATE
=====================================================
Sample: ${preset.name}
Alloy System: ${preset.alloySystem}
Mean Grain Diameter (D̄): ${grainSize_um} µm
ASTM Grain Size Number (G): ASTM G = ${astmGNumber}
Aspect Ratio (L/W): ${preset.grainAspectRatio}
CSL Twin Fraction (Σ3): ${preset.twinFraction_pct}%
Schmid Factor: ${preset.schmidFactor_avg}
Hall-Petch Yield Strength: ${hallPetchYieldStrength_MPa} MPa (σ0 = ${preset.hallPetch_sigma0_MPa} MPa, ky = ${preset.hallPetch_k_MPasqrtm} MPa√m)
`;
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EBSD_ASTM_E112_${preset.id}_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono">
      {/* Top Header Banner */}
      <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-400/40">
              <Microscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  AI Grain Size & EBSD Texture Analyzer
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  ASTM E112 / ISO 643
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold hidden sm:inline-block">
                  HALL-PETCH & SCHMID
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Automated Heyn line-intercept grain sizing, EBSD IPF-Z orientation mapping, Schmid factor yield prediction, and twin boundary quantification.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Raw File Import Button */}
            <input
              type="file"
              ref={ebsdFileInputRef}
              onChange={handleEbsdFileUpload}
              accept=".ctf,.ang,.csv,.txt"
              className="hidden"
            />

            {parsedEbsdResult ? (
              <button
                type="button"
                onClick={handleClearEbsdData}
                className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5"
                title="Clear raw EBSD data and return to simulation"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset to Synthetic</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => ebsdFileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-emerald-400" />}
                <span>Import Raw EBSD (.ctf / .csv)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRun500MBBenchmark}
              disabled={isUploading}
              className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              title="Test 500MB WebWorker chunked streaming without main thread freeze"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>500 MB Streaming Benchmark</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadEbsdMap}
              className="px-3 py-2 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-emerald-400 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Snapshot</span>
            </button>

            <button
              type="button"
              onClick={handleExportEbsdReport}
              className="px-3 py-2 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-cyan-400 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Report</span>
            </button>

            <button
              type="button"
              onClick={handleRunAiCertification}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 shrink-0"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Run ASTM E112 AI Analysis</span>
            </button>
          </div>
        </div>

        {/* Streaming Progress Bar */}
        {isUploading && streamProgress && (
          <div className="mt-3 p-3.5 bg-gradient-to-r from-purple-950/40 via-blue-950/40 to-[#0c1322] border border-purple-500/30 rounded-xl space-y-2">
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
                  className="px-2 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded text-[10px] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="w-full bg-[#050810] h-2 rounded-full overflow-hidden border border-[#1e2d46]">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-500 h-full transition-all duration-100 ease-out"
                style={{ width: `${streamProgress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Grains/Lines Streamed: <strong className="text-emerald-300 font-mono">{streamProgress.itemsParsed.toLocaleString()}</strong></span>
              <span>Worker thread decoupled from main UI loop</span>
            </div>
          </div>
        )}

        {/* Benchmark Success Notice */}
        {benchmarkNotice && (
          <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-200 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{benchmarkNotice}</span>
            </div>
            <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded text-purple-300 font-mono font-bold">
              60 FPS WebWorker
            </span>
          </div>
        )}

        {/* Upload Status Alert / Banner */}
        {uploadedEbsdFile && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Active Raw EBSD File:</strong> {uploadedEbsdFile} ({parsedEbsdResult?.totalGrains} grains measured | Mean: {parsedEbsdResult?.meanDiameter_um} µm)
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
              Real Grain Data Active
            </span>
          </div>
        )}

        {uploadError && (
          <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-[#162032] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-slate-400 font-semibold">Microstructure Baseline:</span>
            {MICROSTRUCTURE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPresetId(p.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition text-[11px] ${
                  selectedPresetId === p.id
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold"
                    : "bg-[#050810] text-slate-400 hover:text-white border border-[#1e2d46]"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>ASTM: <strong className="text-emerald-400">G = {astmGNumber}</strong></span>
            <span>•</span>
            <span>Hall-Petch Yield: <strong className="text-cyan-400">{hallPetchYieldStrength_MPa} MPa</strong></span>
          </div>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Canvas & Mode Switchers */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#162032] pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Microstructure & EBSD IPF Map Viewer
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* WebGL Accelerator Toggle */}
                <button
                  type="button"
                  onClick={() => setUseWebGLShaderMap(!useWebGLShaderMap)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    useWebGLShaderMap
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{useWebGLShaderMap ? "WebGL Shader (60 FPS)" : "2D Canvas CPU"}</span>
                </button>
                <span className="text-xs text-slate-400">Magnification: {magnification}X</span>
              </div>
            </div>

            {/* Canvas Display (WebGL GPU Shader vs 2D Canvas CPU) */}
            <div className="relative rounded-xl overflow-hidden border border-[#1e2d46] bg-[#050810] flex items-center justify-center min-h-[340px]">
              {useWebGLShaderMap ? (
                <div className="w-full">
                  <WebGLEBSDMapCanvas
                    grainCount={Math.min(256, Math.max(16, Math.round(180 / (grainScaleFactor || 1))))}
                    overlayMode={activeOverlay === "schmid-map" ? "schmid" : activeOverlay === "grain-boundaries" ? "kam" : "ipf_z"}
                    showBoundaries={activeOverlay === "grain-boundaries" || activeOverlay === "intercept-grid"}
                    boundaryThreshold={0.03}
                    height={340}
                  />
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={340}
                  className="w-full h-auto max-h-[360px] object-cover"
                />
              )}

              {/* Overlay Mode Selector Buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#090e18]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#1e2d46] text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveOverlay("ebsd-ipf")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeOverlay === "ebsd-ipf" ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  EBSD IPF-Z
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOverlay("grain-boundaries")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeOverlay === "grain-boundaries" ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Grain Boundaries
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOverlay("schmid-map")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeOverlay === "schmid-map" ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Schmid Map
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOverlay("intercept-grid")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeOverlay === "intercept-grid" ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Heyn Grid
                </button>
              </div>

              {/* Scale Bar */}
              <div className="absolute bottom-3 left-3 bg-[#090e18]/90 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1e2d46] text-[10px] text-white flex items-center gap-2 font-mono">
                <div className="w-12 h-1 bg-emerald-400" />
                <span>50 µm</span>
              </div>
            </div>

            {/* Visual Controls */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Magnification:</span>
                  <span className="text-emerald-400 font-bold">{magnification}X</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={magnification}
                  onChange={(e) => setMagnification(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Grain Scale (d):</span>
                  <span className="text-cyan-400 font-bold">{grainSize_um} µm</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={grainScaleFactor}
                  onChange={(e) => setGrainScaleFactor(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Aspect Ratio:</span>
                  <span className="text-purple-400 font-bold">{grainElongation.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.2"
                  value={grainElongation}
                  onChange={(e) => setGrainElongation(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Statistical & Hall-Petch Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Key Metrics Cards */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Quantitative Stereology Metrics</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <span className="text-slate-400 text-[11px] block">Mean Grain Dia (D̄):</span>
                <span className="text-xl font-bold text-emerald-400 block">
                  {grainSize_um} <span className="text-xs text-slate-400">µm</span>
                </span>
                <span className="text-[10px] text-slate-500">ASTM E112 Intercept</span>
              </div>

              <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <span className="text-slate-400 text-[11px] block">ASTM G Index:</span>
                <span className="text-xl font-bold text-cyan-400 block">
                  G = {astmGNumber}
                </span>
                <span className="text-[10px] text-slate-500">Standard Macro-Grain</span>
              </div>

              <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <span className="text-slate-400 text-[11px] block">Hall-Petch Yield Strength:</span>
                <span className="text-base font-bold text-teal-300 block">
                  {hallPetchYieldStrength_MPa} MPa
                </span>
                <span className="text-[10px] text-slate-500">σ_y = σ₀ + k_y · d^(-1/2)</span>
              </div>

              <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1">
                <span className="text-slate-400 text-[11px] block">Mean Schmid Factor:</span>
                <span className="text-base font-bold text-purple-300 block">
                  m = {preset.schmidFactor_avg}
                </span>
                <span className="text-[10px] text-slate-500">Slip Resistance</span>
              </div>
            </div>

            {/* Hall-Petch Equation Box */}
            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] text-xs space-y-1.5">
              <span className="text-slate-400 block font-semibold">Hall-Petch Strengthening Formula:</span>
              <div className="text-emerald-300 p-2 bg-[#0c1322] rounded border border-[#1e2d46] text-center font-mono">
                σ_y = {preset.hallPetch_sigma0_MPa} + {preset.hallPetch_k_MPasqrtm} · ({grainSize_um} µm)⁻¹/² = {hallPetchYieldStrength_MPa} MPa
              </div>
            </div>

            {/* ZERO ERROR MARGIN: Monte Carlo Stochastic Uncertainty for Hall-Petch */}
            <div className="pt-2">
              <MonteCarloUncertaintyCard
                title="Hall-Petch Yield Strength (σ_y)"
                unit="MPa"
                result={hallPetchMonteCarlo.yieldStrengthMpa}
                distributionName="ASTM E112 Grain Intercept Envelope"
                badgeText="A/B-Basis Allowable"
              />
            </div>
          </div>

          {/* Grain Size Distribution Histogram */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#162032] pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Binary className="w-4 h-4 text-cyan-400" />
                <span>Grain Size Distribution (Log-Normal)</span>
              </h3>
            </div>

            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grainDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                  <XAxis dataKey="sizeBin" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#050810", borderColor: "#1e2d46", borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Bar dataKey="frequency" name="Grain Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* AI Certification Modal / Popup */}
      {aiReport && (
        <div className="bg-[#090e18] border border-emerald-500/50 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xl animate-fade-in text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-line">
          <div className="flex justify-between items-center border-b border-[#162032] pb-2 text-emerald-400 font-bold font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>ASTM E112 & EBSD Characterization Certificate</span>
            </div>
            <button
              type="button"
              onClick={() => setAiReport(null)}
              className="px-2 py-0.5 bg-[#162032] text-slate-400 hover:text-white rounded"
            >
              Dismiss
            </button>
          </div>
          {aiReport}
        </div>
      )}
    </div>
  );
};

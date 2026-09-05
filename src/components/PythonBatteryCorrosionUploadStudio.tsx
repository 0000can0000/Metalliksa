import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Terminal,
  Play,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  Cpu,
  Flame,
  Layers,
  AlertTriangle,
  FileCode,
  Sliders,
  CheckCircle2,
  Share2,
  RefreshCw,
  Box,
  TrendingUp,
  Upload,
  FileText,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Info,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Trash2,
  Radio,
  Eye,
  Battery,
} from "lucide-react";
import { ExperimentalEISDataset } from "../types/eisData";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ComposedChart,
  AreaChart,
  Area,
} from "recharts";
import { pythonComputationService } from "../services/pythonComputationService";

export type ScriptTemplateKey =
  | "battery-cycler-gcd"
  | "corrosion-tafel-astm"
  | "eis-impedance-fitting"
  | "ocp-passivation-drift"
  | "custom-python-pipeline";

interface ScriptTemplate {
  key: ScriptTemplateKey;
  name: string;
  domain: "battery" | "corrosion" | "eis" | "general";
  description: string;
  defaultCode: string;
}

const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    key: "battery-cycler-gcd",
    name: "Battery Cycler & dQ/dV Spectrogram",
    domain: "battery",
    description: "Ingests Galvanostatic Charge-Discharge (GCD) cycling data, computes SOH retention, and extracts dQ/dV phase peaks.",
    defaultCode: `# =========================================================================
# MetalliX Battery Cycler Ingestion Script (BioLogic / Arbin / Neware)
# Ingests cell cycling data, computes capacity retention & dQ/dV peaks
# =========================================================================
import math

# 1. Experimental cycling parameters
nominal_capacity_Ah = 5.0
cycles = [1, 25, 50, 75, 100, 150, 200, 250, 300]
capacity_retention = [100.0, 99.5, 98.7, 97.9, 96.8, 94.6, 92.5, 90.4, 88.2]
coulombic_efficiency = [99.2, 99.78, 99.85, 99.82, 99.84, 99.81, 99.79, 99.75, 99.71]

# 2. Raw Voltage (V) vs Capacity (mAh) profile for cycle #100
voltage_V = []
capacity_mAh = []
v_start, v_end = 3.0, 4.25
n_steps = 60

for i in range(n_steps):
    v = v_start + (v_end - v_start) * (i / (n_steps - 1))
    voltage_V.append(round(v, 4))
    # Simulated NMC811 charge curve with H1-M and M-H2 phase steps
    soc = (v - v_start) / (v_end - v_start)
    q = nominal_capacity_Ah * 1000.0 * (soc ** 0.85)
    capacity_mAh.append(round(q, 2))

print(f"[Python] Loaded {len(cycles)} cycle intervals for {nominal_capacity_Ah}Ah NMC811 cell.")
print(f"[Python] Cycle 300 Capacity Retention: {capacity_retention[-1]:.1f}%, Mean CE: {sum(coulombic_efficiency)/len(coulombic_efficiency):.2f}%")

# 3. Export payload to MetalliX Visualizer
output_payload = {
    "dataType": "battery_cycling",
    "nominalCapacityAh": nominal_capacity_Ah,
    "cycles": cycles,
    "capacityRetentionPct": capacity_retention,
    "coulombicEfficiencyPct": coulombic_efficiency,
    "voltage": voltage_V,
    "capacity_mAh": capacity_mAh
}
`,
  },
  {
    key: "corrosion-tafel-astm",
    name: "Corrosion Tafel Polarization (ASTM G102)",
    domain: "corrosion",
    description: "Fits anodic and cathodic Tafel slopes, finds E_corr & i_corr, and computes ASTM G102 penetration rate.",
    defaultCode: `# =========================================================================
# MetalliX Corrosion Tafel Polarization Solver (ASTM G102 & G59)
# Analyzes Potentiodynamic scan on 316L Stainless Steel in 3.5 wt% NaCl
# =========================================================================
import math

# 1. Specimen and Electrolyte Parameters
sample_material = "AISI 316L Stainless Steel"
electrode_area_cm2 = 1.0
density_g_cm3 = 8.00  # g/cm3 for 316L
equivalent_weight = 25.68  # EW for 316L alloy

# 2. Potentiodynamic Polarization Scan (E vs Current Density)
# E_corr ~ -0.280 V vs SCE
e_corr_nominal = -0.280
potential_V = []
current_uA = []

# Scan from -0.550 V to +0.150 V vs SCE (70 steps)
for i in range(71):
    e = -0.550 + i * 0.010
    potential_V.append(round(e, 4))
    overpotential = e - e_corr_nominal
    # Butler-Volmer kinetics with beta_a=0.100 V/dec, beta_c=0.120 V/dec, i0=0.08 uA/cm2
    i_anodic = 0.08 * math.exp(2.303 * overpotential / 0.100)
    i_cathodic = 0.08 * math.exp(-2.303 * overpotential / 0.120)
    net_i = abs(i_anodic - i_cathodic) + 0.002
    current_uA.append(round(net_i, 5))

print(f"[Python] Processed potentiodynamic Tafel scan for {sample_material}")
print(f"[Python] Potential range: {min(potential_V):.3f} V to {max(potential_V):.3f} V vs Ref")

# 3. Export to MetalliX Solver
output_payload = {
    "dataType": "corrosion_tafel",
    "sampleName": sample_material,
    "potential_V": potential_V,
    "current_uA": current_uA,
    "electrodeArea_cm2": electrode_area_cm2,
    "density_g_cm3": density_g_cm3,
    "equivalentWeight": equivalent_weight
}
`,
  },
  {
    key: "eis-impedance-fitting",
    name: "EIS Impedance & Randles Semicircle",
    domain: "eis",
    description: "Computes Nyquist & Bode profiles, extracts Ohmic bulk resistance R0, and fits charge-transfer Rct & Cdl.",
    defaultCode: `# =========================================================================
# MetalliX Electrochemical Impedance Spectroscopy (EIS) Ingestion
# Frequency sweep from 100 kHz to 10 mHz (Nyquist & Bode deconvolution)
# =========================================================================
import math

# 1. Equivalent circuit baseline parameters: R0 + (Rct // Cdl) + Warburg
r0_true = 0.45       # Ohmic electrolyte resistance (Ohm)
rct_true = 12.8      # Charge transfer resistance (Ohm)
cdl_true = 45.0e-6   # Double layer capacitance (F)
sigma_w = 2.4        # Warburg diffusion coefficient (Ohm*s^-0.5)

frequencies = []
z_real = []
z_imag = []

# 6 decades: 100 kHz down to 10 mHz
for log_f in range(50, -21, -1):
    f = 10.0 ** (log_f / 10.0)
    frequencies.append(round(f, 4))
    w = 2.0 * math.pi * f
    
    # Parallel Rct // Cdl
    denom = 1.0 + (w * rct_true * cdl_true) ** 2
    zr_semicircle = rct_true / denom
    zi_semicircle = -(w * (rct_true ** 2) * cdl_true) / denom
    
    # Warburg tail at low frequencies (f < 5 Hz)
    zr_w, zi_w = 0.0, 0.0
    if f < 5.0:
        atten = min(1.0, 3.0 / (f + 0.1))
        zr_w = (sigma_w / math.sqrt(w)) * atten
        zi_w = -(sigma_w / math.sqrt(w)) * atten
        
    z_real.append(round(r0_true + zr_semicircle + zr_w, 4))
    z_imag.append(round(zi_semicircle + zi_w, 4))

print(f"[Python] Generated {len(frequencies)} EIS impedance frequency points (100 kHz to 10 mHz).")
print(f"[Python] High-freq bulk R0: {z_real[0]:.3f} Ohm, Apex imaginary max: {min(z_imag):.3f} Ohm")

output_payload = {
    "dataType": "eis_impedance",
    "frequencies": frequencies,
    "z_real": z_real,
    "z_imag": z_imag
}
`,
  },
  {
    key: "ocp-passivation-drift",
    name: "Open Circuit Potential (OCP) Drift Monitor",
    domain: "corrosion",
    description: "Analyzes free corrosion rest potential stability and steady-state passivation drift rate per ASTM G69.",
    defaultCode: `# =========================================================================
# MetalliX Open Circuit Potential (OCP) Ingestion & Passivation Stability
# Monitored over 60 minutes in aerated saline solution
# =========================================================================
import math

time_s = []
potential_V = []

# 120 samples across 3600 seconds (30s interval)
for i in range(121):
    t = i * 30
    time_s.append(t)
    # Passive film growth curve: E shifts positive towards passive steady-state
    # E(t) = E_init + deltaE * (1 - exp(-t / tau)) + small noise
    e_init = -0.320
    delta_e = 0.145
    tau = 800.0  # time constant (s)
    e_val = e_init + delta_e * (1.0 - math.exp(-t / tau))
    potential_V.append(round(e_val, 4))

print(f"[Python] Monitored OCP rest potential across {time_s[-1] / 60:.1f} minutes.")
print(f"[Python] Initial E_ocp: {potential_V[0]:.3f} V, Final steady-state E_ocp: {potential_V[-1]:.3f} V vs Ref")

output_payload = {
    "dataType": "ocp_transient",
    "time_s": time_s,
    "potential_V": potential_V
}
`,
  },
  {
    key: "custom-python-pipeline",
    name: "Custom Python Ingestion Pipeline",
    domain: "general",
    description: "Write your own custom data transformations using pure Python 3.10 standard library and math shims.",
    defaultCode: `# =========================================================================
# Custom Python Data Pipeline for MetalliX
# Use this template to parse experimental CSV strings or custom arrays
# =========================================================================
import math

# Define your data arrays here:
cycles = [1, 50, 100, 150, 200]
retention = [100.0, 98.4, 96.2, 93.8, 91.5]
coulombic_eff = [99.2, 99.85, 99.82, 99.78, 99.75]

voltage_profile = [3.0, 3.2, 3.4, 3.6, 3.8, 4.0, 4.2]
capacity_profile = [0.0, 650.0, 1500.0, 2800.0, 3950.0, 4750.0, 5000.0]

print(f"[Python] Running custom user ingestion pipeline...")
print(f"[Python] Processed {len(cycles)} cycle data points.")

# The MetalliX engine inspects 'output_payload' or global variables
output_payload = {
    "dataType": "battery_cycling",
    "nominalCapacityAh": 5.0,
    "cycles": cycles,
    "capacityRetentionPct": retention,
    "coulombicEfficiencyPct": coulombic_eff,
    "voltage": voltage_profile,
    "capacity_mAh": capacity_profile
}
`,
  },
];

export interface PythonBatteryCorrosionUploadStudioProps {
  initialDomain?: "battery" | "corrosion";
  onSendToCNLS?: (data: any) => void;
  onSendToEISInsights?: (data: any) => void;
  onSendToBatteryEIS?: (dataset: ExperimentalEISDataset) => void;
  onSendToCorrosionEIS?: (dataset: ExperimentalEISDataset) => void;
}

export const PythonBatteryCorrosionUploadStudio: React.FC<PythonBatteryCorrosionUploadStudioProps> = ({
  initialDomain = "battery",
  onSendToCNLS,
  onSendToEISInsights,
  onSendToBatteryEIS,
  onSendToCorrosionEIS,
}) => {
  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState<"script-editor" | "file-upload" | "remote-api">("script-editor");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<ScriptTemplateKey>(
    initialDomain === "corrosion" ? "corrosion-tafel-astm" : "battery-cycler-gcd"
  );
  const [code, setCode] = useState<string>(
    SCRIPT_TEMPLATES.find((t) => t.key === (initialDomain === "corrosion" ? "corrosion-tafel-astm" : "battery-cycler-gcd"))?.defaultCode || ""
  );

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Drag-and-drop state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load template code when template changes
  const handleSelectTemplate = (templateKey: ScriptTemplateKey) => {
    setSelectedTemplateKey(templateKey);
    const tmpl = SCRIPT_TEMPLATES.find((t) => t.key === templateKey);
    if (tmpl) {
      setCode(tmpl.defaultCode);
    }
  };

  // Fetch recent uploads from the backend
  const refreshRecentUploads = useCallback(async () => {
    try {
      const res = await pythonComputationService.getRecentBatteryCorrosionUploads();
      if (res && res.datasets) {
        setRecentUploads(res.datasets);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshRecentUploads();
  }, [refreshRecentUploads]);

  // Execute current Python script
  const handleRunPythonScript = async () => {
    setIsRunning(true);
    setConsoleOutput([`[System] Initializing Python 3.10 Execution Environment...`]);
    try {
      const tmpl = SCRIPT_TEMPLATES.find((t) => t.key === selectedTemplateKey);
      const res = await pythonComputationService.executeBatteryCorrosionUserScript(code, {}, tmpl?.name);

      const logs: string[] = [];
      if (res.stdout) {
        logs.push(...res.stdout.split("\n").filter((l: string) => l.trim().length > 0));
      }
      if (res.stderr) {
        logs.push(`[STDERR] ${res.stderr}`);
      }
      if (res.error) {
        logs.push(`[ERROR] ${res.error}`);
      }
      logs.push(`[System] Execution completed in ${res.durationMs || res.pythonDurationMs || 0} ms. (Exit Code: ${res.success ? 0 : 1})`);
      setConsoleOutput(logs);

      if (res.analysis) {
        setAnalysisResult(res.analysis);
        setDurationMs(res.durationMs || res.pythonDurationMs || null);
      }
      refreshRecentUploads();
    } catch (err: any) {
      setConsoleOutput((prev) => [...prev, `[Fatal Error] ${err.message || err}`]);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle uploaded file (Python .py, .ipynb, .csv, .json)
  const processUploadedFile = async (file: File) => {
    setUploadedFileName(file.name);
    const text = await file.text();

    if (file.name.endsWith(".py")) {
      setCode(text);
      setActiveTab("script-editor");
      setConsoleOutput([`[System] Imported user Python script '${file.name}' (${(file.size / 1024).toFixed(1)} KB)`]);
      return;
    }

    if (file.name.endsWith(".ipynb")) {
      try {
        const nb = JSON.parse(text);
        const codeCells = nb.cells
          ?.filter((c: any) => c.cell_type === "code")
          ?.map((c: any) => (Array.isArray(c.source) ? c.source.join("") : c.source))
          ?.join("\n\n# --- Cell Divider ---\n\n");
        if (codeCells) {
          setCode(codeCells);
          setActiveTab("script-editor");
          setConsoleOutput([`[System] Extracted Python code from Jupyter Notebook '${file.name}'.`]);
          return;
        }
      } catch (e) {
        setConsoleOutput([`[Error] Failed to parse Jupyter Notebook: ${e}`]);
      }
    }

    // Direct JSON or CSV upload
    setIsRunning(true);
    setConsoleOutput([`[System] Ingesting experimental data file '${file.name}' via Python engine...`]);
    try {
      let payload: any = { title: file.name };
      if (file.name.endsWith(".json")) {
        payload = { ...payload, ...JSON.parse(text) };
      } else {
        // Simple CSV parser for (V, I) or (Freq, Zr, Zi)
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].toLowerCase().split(/[,\t;]/).map((h) => h.trim());
          const colData: { [key: string]: number[] } = {};
          headers.forEach((h) => (colData[h] = []));

          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(/[,\t;]/).map((p) => parseFloat(p.trim()));
            if (parts.length === headers.length && !parts.some(isNaN)) {
              headers.forEach((h, idx) => colData[h].push(parts[idx]));
            }
          }

          // Detect columns
          if (headers.some((h) => h.includes("freq"))) {
            payload.dataType = "eis_impedance";
            payload.frequencies = colData[headers.find((h) => h.includes("freq"))!];
            payload.zReal = colData[headers.find((h) => h.includes("zr") || h.includes("real"))!] || [];
            payload.zImag = colData[headers.find((h) => h.includes("zi") || h.includes("imag"))!] || [];
          } else if (headers.some((h) => h.includes("pot") || h.includes("volt") || h.includes("e"))) {
            if (headers.some((h) => h.includes("curr") || h.includes("i"))) {
              payload.dataType = "corrosion_tafel";
              payload.potential_V = colData[headers.find((h) => h.includes("pot") || h.includes("volt") || h.includes("e"))!];
              payload.current_uA = colData[headers.find((h) => h.includes("curr") || h.includes("i"))!];
            } else if (headers.some((h) => h.includes("cap") || h.includes("q"))) {
              payload.dataType = "battery_cycling";
              payload.voltage = colData[headers.find((h) => h.includes("volt") || h.includes("v"))!];
              payload.capacity_mAh = colData[headers.find((h) => h.includes("cap") || h.includes("q"))!];
            }
          }
        }
      }

      const res = await pythonComputationService.uploadBatteryCorrosionData(payload);
      if (res.analysis) {
        setAnalysisResult(res.analysis);
        setDurationMs(res.durationMs || res.pythonDurationMs || null);
        setConsoleOutput([
          `[System] Successfully parsed and analyzed '${file.name}' via Python 3.10.`,
          `[System] Detected domain: ${res.analysis.dataType}`,
          `[System] Engine duration: ${res.durationMs || res.pythonDurationMs || 0} ms`,
        ]);
      }
      refreshRecentUploads();
    } catch (e: any) {
      setConsoleOutput([`[Error] Ingestion failed: ${e.message || e}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([code], { type: "text/x-python;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTemplateKey}.py`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Remote snippet string
  const currentHost = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const pythonClientSnippet = `# =========================================================================
# Run this Python script from your terminal, Jupyter Notebook, or Google Colab:
# =========================================================================
import requests
import json

# 1. Prepare your experimental Battery or Corrosion dataset
payload = {
    "dataType": "${selectedTemplateKey === "corrosion-tafel-astm" ? "corrosion_tafel" : "battery_cycling"}",
    "title": "Lab Experiment #42 - Automated Python Ingest",
    # Pass your pandas dataframe / numpy arrays directly:
${
  selectedTemplateKey === "corrosion-tafel-astm"
    ? `    "potential_V": [-0.60, -0.55, -0.50, -0.45, -0.40, -0.35, -0.30, -0.25],
    "current_uA": [12.4, 2.5, 0.45, 0.08, 0.35, 2.1, 14.8, 85.0],
    "electrodeArea_cm2": 1.0,
    "density_g_cm3": 7.85`
    : `    "nominalCapacityAh": 5.0,
    "cycles": [1, 50, 100, 150, 200, 250],
    "capacityRetentionPct": [100.0, 98.2, 96.1, 93.9, 91.4, 89.0],
    "coulombicEfficiencyPct": [99.2, 99.85, 99.83, 99.80, 99.77, 99.72]`
}
}

# 2. Transmit directly to MetalliX Python Ingestion API
API_ENDPOINT = "${currentHost}/api/python/battery-corrosion-upload"
print(f"Uploading experimental data to {API_ENDPOINT}...")

response = requests.post(API_ENDPOINT, json=payload)
result = response.json()

print("Status:", "SUCCESS" if result.get("success") else "FAILED")
print("Engine Duration:", result.get("durationMs"), "ms")
if "analysis" in result:
    print("Summary Metrics:", json.dumps(result["analysis"].get("summary"), indent=2))
`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(pythonClientSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Run initial script on load if no result exists yet
  useEffect(() => {
    if (!analysisResult && !isRunning) {
      handleRunPythonScript();
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-[#09101d] via-[#0d1628] to-[#09101d] rounded-2xl border border-sky-500/30 p-5 shadow-[0_0_24px_rgba(56,189,248,0.1)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-sky-500/20 border border-sky-400/40 text-sky-400">
                <FileCode className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold font-mono text-white tracking-wide flex items-center gap-2">
                Python Data Ingestion &amp; Analytics Studio
                <span className="text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Python 3.10 Engine
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Upload raw battery cycling, Tafel polarization, EIS impedance, or OCP data directly using custom Python scripts, Jupyter notebooks, or external REST API uploads.
            </p>
          </div>

          {/* Workflow Tabs */}
          <div className="flex items-center gap-1.5 bg-[#050810] p-1.5 rounded-xl border border-[#162032] self-stretch md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("script-editor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === "script-editor"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Python Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("file-upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === "file-upload"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .py / .ipynb / Data</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("remote-api")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === "remote-api"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Remote Python Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script / Upload / Remote Input (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* TAB 1: Python Editor */}
          {activeTab === "script-editor" && (
            <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-4 space-y-3">
              {/* Template selector & controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162032] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 font-mono">Template:</span>
                  <select
                    value={selectedTemplateKey}
                    onChange={(e) => handleSelectTemplate(e.target.value as ScriptTemplateKey)}
                    className="bg-[#050810] border border-[#1e2d46] rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-400"
                  >
                    {SCRIPT_TEMPLATES.map((tmpl) => (
                      <option key={tmpl.key} value={tmpl.key}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg bg-[#050810] hover:bg-slate-800 text-slate-300 border border-[#162032] transition-colors"
                    title="Copy Python Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadScript}
                    className="p-1.5 rounded-lg bg-[#050810] hover:bg-slate-800 text-slate-300 border border-[#162032] transition-colors"
                    title="Download .py Script"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(selectedTemplateKey)}
                    className="p-1.5 rounded-lg bg-[#050810] hover:bg-slate-800 text-slate-300 border border-[#162032] transition-colors"
                    title="Reset to Default Script"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="relative rounded-xl border border-[#162032] bg-[#050810] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0f1d] border-b border-[#162032] text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />
                    <span className="ml-2 text-slate-300 font-semibold">{selectedTemplateKey}.py</span>
                  </div>
                  <span>Python 3.10</span>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={17}
                  className="w-full bg-transparent p-3 text-xs font-mono text-emerald-300 focus:outline-none resize-y selection:bg-sky-500/30 leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Action execute button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-500">
                  Uses native Python 3.10 subprocess IPC with ASTM G102 &amp; dQ/dV analytics.
                </span>
                <button
                  type="button"
                  onClick={handleRunPythonScript}
                  disabled={isRunning}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 text-white text-xs font-mono font-bold transition-all shadow-[0_0_16px_rgba(56,189,248,0.3)] disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Executing in Python...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Run with Python 3.10</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: File Upload */}
          {activeTab === "file-upload" && (
            <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-4">
              <div className="border-b border-[#162032] pb-3">
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-400" />
                  Drag &amp; Drop Python Files or Experimental Data
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Supports .py (Python Scripts), .ipynb (Jupyter Notebooks), .csv, .json, and raw potentiostat export files.
                </p>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processUploadedFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-sky-400 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                    : "border-[#1e2d46] hover:border-sky-500/50 bg-[#050810]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".py,.ipynb,.csv,.json,.txt,.mpt,.dta,.cor"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processUploadedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <FileCode className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-white block">
                      Click to choose file, or drag and drop here
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 block">
                      Python (.py, .ipynb) • BioLogic / Gamry / Neware CSV • JSON
                    </span>
                  </div>
                  {uploadedFileName && (
                    <div className="mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Loaded: {uploadedFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Files shortcuts */}
              <div className="pt-2">
                <span className="text-[11px] font-mono text-slate-400 font-semibold block mb-2">
                  Quick-load synthetic benchmark datasets:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectTemplate("battery-cycler-gcd");
                      handleRunPythonScript();
                    }}
                    className="p-2.5 rounded-xl bg-[#050810] border border-[#162032] hover:border-sky-400/50 text-left transition-all group"
                  >
                    <span className="text-xs font-mono font-bold text-sky-300 block group-hover:text-sky-200">
                      ⚡ 5.0Ah NMC811 Cycling (300 Cyc)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">BioLogic / Neware format</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSelectTemplate("corrosion-tafel-astm");
                      handleRunPythonScript();
                    }}
                    className="p-2.5 rounded-xl bg-[#050810] border border-[#162032] hover:border-amber-400/50 text-left transition-all group"
                  >
                    <span className="text-xs font-mono font-bold text-amber-300 block group-hover:text-amber-200">
                      🛡️ 316L Stainless Steel Tafel (3.5% NaCl)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">ASTM G102 &amp; G59</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Remote Python Client API Snippet */}
          {activeTab === "remote-api" && (
            <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    Upload from Python Scripts / Jupyter Notebooks
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Post data directly from your local workstation, lab PC, or automated test rig using Python requests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#050810] hover:bg-slate-800 text-slate-200 border border-[#162032] text-xs font-mono font-bold transition-all"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Code</span>
                </button>
              </div>

              <div className="rounded-xl border border-[#162032] bg-[#050810] p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-80">
                <pre>{pythonClientSnippet}</pre>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#162032]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono text-slate-300">
                    Endpoint: <code className="text-emerald-400">/api/python/battery-corrosion-upload</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={refreshRecentUploads}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-mono font-bold transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Uploads ({recentUploads.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Console / Terminal Output */}
          <div className="bg-[#050810] rounded-2xl border border-[#162032] p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-[#162032] pb-2 text-xs font-mono">
              <span className="text-slate-400 font-bold flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                Python 3.10 Subprocess Terminal
              </span>
              {durationMs !== null && (
                <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-400/20">
                  Execution: {durationMs} ms
                </span>
              )}
            </div>
            <div className="bg-[#020408] rounded-xl p-3 font-mono text-xs text-slate-300 max-h-40 overflow-y-auto space-y-1">
              {consoleOutput.length === 0 ? (
                <span className="text-slate-600 italic">No output yet. Click &quot;Run with Python 3.10&quot; to execute.</span>
              ) : (
                consoleOutput.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.includes("[ERROR]") || line.includes("[Fatal")
                        ? "text-rose-400"
                        : line.includes("[STDERR]")
                        ? "text-amber-400"
                        : line.includes("[System]")
                        ? "text-sky-400 font-semibold"
                        : "text-emerald-300"
                    }
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Visualizer & Calculated Analytics (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Engineering Metrics Deck */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#162032] pb-2.5">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Python Calculated Metrics
              </span>
              {analysisResult && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {analysisResult.dataType?.replace("_", " ")}
                </span>
              )}
            </div>

            {analysisResult?.metrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analysisResult.metrics.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#050810] border border-[#162032] space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 font-mono block truncate">{m.name}</span>
                    <span className="text-sm font-bold font-mono text-white block">{m.value}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-400/20 inline-block">
                      {m.badge}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-mono text-slate-500">
                Run a Python script or upload data to compute electrochemical metrics.
              </div>
            )}

            {/* Quick Dispatch Actions to Battery and Corrosion Modules */}
            {analysisResult && (
              <div className="pt-2 border-t border-[#162032] flex flex-wrap gap-2">
                {onSendToBatteryEIS && (
                  <button
                    type="button"
                    onClick={() => {
                      const pts = (analysisResult.chartData || []).map((pt: any) => ({
                        frequency: Number(pt.frequency || pt.f || 1.0),
                        zReal: Number(pt.zReal ?? pt.z_real ?? 0),
                        zImag: pt.minusZImag !== undefined ? -Number(pt.minusZImag) : Number(pt.zImag ?? 0),
                        minusZImag: pt.minusZImag !== undefined ? Number(pt.minusZImag) : -Number(pt.zImag ?? 0),
                        zMag: Number(pt.zMag ?? Math.sqrt(Math.pow(pt.zReal || 0, 2) + Math.pow(pt.minusZImag || 0, 2))),
                        phaseDeg: Number(pt.phaseDeg ?? 0),
                      }));
                      const ds: ExperimentalEISDataset = {
                        id: `python-battery-${Date.now()}`,
                        name: `Python_Battery_Lab_${new Date().toLocaleTimeString().replace(/:/g, '')}`,
                        source: "benchmark",
                        description: `Python 3.10 Ingested Battery Dataset (${pts.length} points)`,
                        points: pts.length > 0 ? pts : [{ frequency: 1000, zReal: 0.08, zImag: -0.05, minusZImag: 0.05, zMag: 0.094, phaseDeg: -32 }],
                      };
                      onSendToBatteryEIS(ds);
                    }}
                    className="flex-1 min-w-[140px] px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Battery className="w-3.5 h-3.5" />
                    <span>Send to Battery EIS</span>
                  </button>
                )}

                {onSendToCorrosionEIS && (
                  <button
                    type="button"
                    onClick={() => {
                      const pts = (analysisResult.chartData || []).map((pt: any) => ({
                        frequency: Number(pt.frequency || pt.f || 1.0),
                        zReal: Number(pt.zReal ?? pt.z_real ?? 0),
                        zImag: pt.minusZImag !== undefined ? -Number(pt.minusZImag) : Number(pt.zImag ?? 0),
                        minusZImag: pt.minusZImag !== undefined ? Number(pt.minusZImag) : -Number(pt.zImag ?? 0),
                        zMag: Number(pt.zMag ?? Math.sqrt(Math.pow(pt.zReal || 0, 2) + Math.pow(pt.minusZImag || 0, 2))),
                        phaseDeg: Number(pt.phaseDeg ?? 0),
                      }));
                      const ds: ExperimentalEISDataset = {
                        id: `python-corrosion-${Date.now()}`,
                        name: `Python_Corrosion_Lab_${new Date().toLocaleTimeString().replace(/:/g, '')}`,
                        source: "benchmark",
                        description: `Python 3.10 Ingested Corrosion Dataset (${pts.length} points)`,
                        points: pts.length > 0 ? pts : [{ frequency: 1000, zReal: 15.0, zImag: -25.0, minusZImag: 25.0, zMag: 29.1, phaseDeg: -59 }],
                      };
                      onSendToCorrosionEIS(ds);
                    }}
                    className="flex-1 min-w-[140px] px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Send to Corrosion EIS</span>
                  </button>
                )}

                {onSendToCNLS && (
                  <button
                    type="button"
                    onClick={() => onSendToCNLS(analysisResult)}
                    className="px-3 py-1.5 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-slate-500 text-slate-300 font-mono text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>CNLS Fitter</span>
                  </button>
                )}

                {onSendToEISInsights && (
                  <button
                    type="button"
                    onClick={() => onSendToEISInsights(analysisResult)}
                    className="px-3 py-1.5 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-slate-500 text-slate-300 font-mono text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>EIS Insights</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Graphical Visualization Area */}
          <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#162032] pb-2">
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                Experimental Curves &amp; Fits
              </span>
            </div>

            {/* Render chart according to dataType */}
            {analysisResult?.dataType === "battery_cycling" && (
              <div className="space-y-4">
                {/* 1. Capacity Retention & CE vs Cycle */}
                <div>
                  <span className="text-[11px] font-mono font-semibold text-slate-300 block mb-1">
                    Capacity Retention &amp; Coulombic Efficiency vs Cycle
                  </span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={analysisResult.cyclingTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                        <XAxis dataKey="cycle" stroke="#64748b" tick={{ fontSize: 10 }} unit=" cyc" />
                        <YAxis yAxisId="left" stroke="#38bdf8" domain={[70, 102]} tick={{ fontSize: 10 }} unit="%" />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" domain={[98, 100]} tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", fontSize: 11 }} />
                        <Line yAxisId="left" type="monotone" dataKey="retentionPct" stroke="#38bdf8" strokeWidth={2} name="Retention %" dot={{ r: 3 }} />
                        <Line yAxisId="right" type="monotone" dataKey="coulombicEffPct" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" name="CE %" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. dQ/dV Differential Capacity Spectrogram */}
                {analysisResult.dqdvSpectrogram && analysisResult.dqdvSpectrogram.length > 0 && (
                  <div>
                    <span className="text-[11px] font-mono font-semibold text-slate-300 block mb-1">
                      Differential Capacity Spectrogram (dQ/dV vs V)
                    </span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analysisResult.dqdvSpectrogram}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                          <XAxis dataKey="voltage" stroke="#64748b" tick={{ fontSize: 10 }} unit=" V" />
                          <YAxis stroke="#f59e0b" tick={{ fontSize: 10 }} unit=" mAh/V" />
                          <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", fontSize: 11 }} />
                          <Area type="monotone" dataKey="dqdv" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="dQ/dV" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {analysisResult?.dataType === "corrosion_tafel" && (
              <div>
                <span className="text-[11px] font-mono font-semibold text-slate-300 block mb-1">
                  Potentiodynamic Tafel Polarization (E vs log i)
                </span>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisResult.tafelPlot || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis dataKey="logCurrentDensity" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: "log₁₀(i / μA·cm⁻²)", position: "bottom", fill: "#64748b", fontSize: 10 }} />
                      <YAxis dataKey="potential_V" stroke="#38bdf8" tick={{ fontSize: 10 }} unit=" V" />
                      <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", fontSize: 11 }} />
                      <Line type="monotone" dataKey="potential_V" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} name="Polarization Curve" />
                      {analysisResult.summary?.eCorr_V && (
                        <ReferenceLine y={analysisResult.summary.eCorr_V} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: `E_corr: ${analysisResult.summary.eCorr_V}V`, fill: "#f43f5e", fontSize: 10 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {analysisResult?.dataType === "eis_impedance" && (
              <div>
                <span className="text-[11px] font-mono font-semibold text-slate-300 block mb-1">
                  Nyquist Impedance (Z_real vs -Z_imag)
                </span>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis dataKey="zReal" stroke="#64748b" tick={{ fontSize: 10 }} unit=" Ω" label={{ value: "Z' (Real) / Ω", position: "bottom", fill: "#64748b", fontSize: 10 }} />
                      <YAxis dataKey="minusZImag" stroke="#38bdf8" tick={{ fontSize: 10 }} unit=" Ω" label={{ value: "-Z'' (Imag) / Ω", angle: -90, position: "left", fill: "#38bdf8", fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", fontSize: 11 }} />
                      <Scatter data={analysisResult.nyquist || []} fill="#38bdf8" line />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {analysisResult?.dataType === "ocp_transient" && (
              <div>
                <span className="text-[11px] font-mono font-semibold text-slate-300 block mb-1">
                  Open Circuit Potential (OCP) vs Time
                </span>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisResult.ocpPlot || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                      <XAxis dataKey="time_s" stroke="#64748b" tick={{ fontSize: 10 }} unit=" s" />
                      <YAxis dataKey="potential_V" stroke="#10b981" tick={{ fontSize: 10 }} unit=" V" />
                      <Tooltip contentStyle={{ backgroundColor: "#090e18", borderColor: "#1e2d46", fontSize: 11 }} />
                      <Line type="monotone" dataKey="potential_V" stroke="#10b981" strokeWidth={2} dot={false} name="E_ocp (V vs Ref)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {!analysisResult && (
              <div className="h-64 flex items-center justify-center text-xs font-mono text-slate-500">
                Awaiting script execution or data upload...
              </div>
            )}
          </div>

          {/* Recent Ingested Datasets Deck */}
          {recentUploads.length > 0 && (
            <div className="bg-[#090e18] rounded-2xl border border-[#162032] p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-2">
                <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Recent Ingested Python Uploads ({recentUploads.length})
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await pythonComputationService.clearRecentBatteryCorrosionUpload();
                    refreshRecentUploads();
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-mono transition-colors"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentUploads.map((rec: any) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      if (rec.analysis) {
                        setAnalysisResult(rec.analysis);
                        setConsoleOutput([`[System] Displaying recorded dataset: ${rec.title}`]);
                      }
                    }}
                    className="p-2 rounded-xl bg-[#050810] border border-[#162032] hover:border-sky-400/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="space-y-0.5 truncate">
                      <span className="text-xs font-mono font-bold text-white block truncate">{rec.title}</span>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {rec.source} • {new Date(rec.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-400/20 uppercase whitespace-nowrap">
                      {rec.dataType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

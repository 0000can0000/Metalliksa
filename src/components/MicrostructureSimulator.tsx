import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Sparkles,
  Download,
  Maximize2,
  Minimize2,
  Info,
  Layers,
  Zap,
  Activity,
  Flame,
  Droplet,
  Eye,
  Camera,
  CheckCircle2,
} from "lucide-react";

export type MicrostructureSimulationMode =
  | "voronoi_grains"      // Grain growth & recrystallization (ASTM E112)
  | "pearlite_lamellae"   // Eutectoid lamellar colony decomposition
  | "dendrite_solidification" // Solidification dendrites & segregation
  | "martensite_laths"    // Acicular needle/lath transformation
  | "precipitate_coarsening"; // Gamma-prime Ostwald ripening (LSW)

export interface GrainSeed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  orientation: number; // degrees
  phase: "ferrite" | "austenite" | "pearlite" | "martensite";
}

export const MicrostructureSimulator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation Mode
  const [simMode, setSimMode] = useState<MicrostructureSimulationMode>("voronoi_grains");

  // Physics Control Parameters
  const [grainCount, setGrainCount] = useState<number>(36); // 12 to 120
  const [annealingTemp, setAnnealingTemp] = useState<number>(920); // °C (400 - 1200)
  const [holdTimeMin, setHoldTimeMin] = useState<number>(45); // min (1 - 240)
  const [carbonContent, setCarbonContent] = useState<number>(0.45); // wt% C
  const [lamellaeSpacing, setLamellaeSpacing] = useState<number>(4); // px spacing
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [showGrainBoundaries, setShowGrainBoundaries] = useState<boolean>(true);
  const [showOrientationColors, setShowOrientationColors] = useState<boolean>(true);
  const [etchContrast, setEtchContrast] = useState<number>(100); // 50 - 200%
  const [renderScale, setRenderScale] = useState<number>(1.0);

  // Computed ASTM grain size & diagnostics
  const astmG = Math.max(1, Math.min(14, Math.round(1 + 3.322 * Math.log2(grainCount / 4))));
  const avgGrainDiamUm = Math.round(320 / Math.sqrt(grainCount));

  // Seeds Ref
  const seedsRef = useRef<GrainSeed[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const stepRef = useRef<number>(0);

  // Initialize random seeds
  const initSeeds = () => {
    const seeds: GrainSeed[] = [];
    const colors = [
      "#cbd5e1", "#94a3b8", "#64748b", "#e2e8f0", "#f1f5f9",
      "#bfdbfe", "#93c5fd", "#dbeafe", "#fde047", "#fef08a"
    ];
    for (let i = 0; i < grainCount; i++) {
      seeds.push({
        x: 20 + Math.random() * 360,
        y: 20 + Math.random() * 360,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: colors[i % colors.length],
        orientation: Math.floor(Math.random() * 180),
        phase: i % 3 === 0 ? "pearlite" : "ferrite",
      });
    }
    seedsRef.current = seeds;
    stepRef.current = 0;
  };

  useEffect(() => {
    initSeeds();
  }, [grainCount, simMode]);

  // Main Render Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    let animationId: number;

    const render = () => {
      stepRef.current += 1;

      // Clear
      ctx.fillStyle = "#0c1322";
      ctx.fillRect(0, 0, W, H);

      if (simMode === "voronoi_grains") {
        // --- 1. Voronoi Polycrystalline Grain Growth & Boundaries ---
        const seeds = seedsRef.current;
        const imgData = ctx.createImageData(W, H);
        const data = imgData.data;

        // Slow grain drift / grain boundary migration if running
        if (isRunning && stepRef.current % 3 === 0) {
          seeds.forEach((s) => {
            s.x += s.vx * (annealingTemp / 600);
            s.y += s.vy * (annealingTemp / 600);
            if (s.x < 5 || s.x > W - 5) s.vx *= -1;
            if (s.y < 5 || s.y > H - 5) s.vy *= -1;
          });
        }

        // Fast pixel assignment using nearest seed Voronoi
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            let minD1 = 999999;
            let minD2 = 999999;
            let closestSeedIdx = 0;

            for (let i = 0; i < seeds.length; i++) {
              const dx = x - seeds[i].x;
              const dy = y - seeds[i].y;
              const d2 = dx * dx + dy * dy;
              if (d2 < minD1) {
                minD2 = minD1;
                minD1 = d2;
                closestSeedIdx = i;
              } else if (d2 < minD2) {
                minD2 = d2;
              }
            }

            const pIdx = (y * W + x) * 4;
            const seed = seeds[closestSeedIdx];
            const isBoundary = showGrainBoundaries && Math.sqrt(minD2) - Math.sqrt(minD1) < 1.8;

            if (isBoundary) {
              // Deep etched grain boundary groove
              data[pIdx] = 20;
              data[pIdx + 1] = 25;
              data[pIdx + 2] = 35;
              data[pIdx + 3] = 255;
            } else {
              // Grain interior with optical contrast & orientation shading
              if (showOrientationColors) {
                const hue = seed.orientation * 2;
                const brightness = (120 + ((x + y + seed.orientation) % 40)) * (etchContrast / 100);
                data[pIdx] = Math.min(255, 140 + Math.sin(seed.orientation) * 50);
                data[pIdx + 1] = Math.min(255, 160 + Math.cos(seed.orientation) * 40);
                data[pIdx + 2] = Math.min(255, 190 + Math.sin(seed.orientation * 2) * 45);
              } else {
                const gray = Math.min(255, (130 + (seed.orientation % 60)) * (etchContrast / 100));
                data[pIdx] = gray;
                data[pIdx + 1] = gray;
                data[pIdx + 2] = gray;
              }
              data[pIdx + 3] = 255;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);

      } else if (simMode === "pearlite_lamellae") {
        // --- 2. Pearlite / Eutectoid Alternate Ferrite-Cementite Lamellae ---
        const seeds = seedsRef.current;
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(0, 0, W, H);

        seeds.forEach((colony, idx) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(colony.x, colony.y, 65, 0, Math.PI * 2);
          ctx.clip();

          // Colony background
          ctx.fillStyle = idx % 2 === 0 ? "#94a3b8" : "#64748b";
          ctx.fillRect(colony.x - 70, colony.y - 70, 140, 140);

          // Draw alternating cementite stripes with angle
          const angleRad = (colony.orientation * Math.PI) / 180;
          ctx.translate(colony.x, colony.y);
          ctx.rotate(angleRad);

          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = Math.max(1, lamellaeSpacing * 0.4);

          for (let l = -90; l <= 90; l += lamellaeSpacing) {
            ctx.beginPath();
            ctx.moveTo(-90, l);
            ctx.lineTo(90, l);
            ctx.stroke();
          }

          ctx.restore();
        });

        // Grain boundary overlay
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3;
        seeds.forEach((s) => {
          ctx.beginPath();
          ctx.arc(s.x, s.y, 65, 0, Math.PI * 2);
          ctx.stroke();
        });

      } else if (simMode === "martensite_laths") {
        // --- 3. Acicular Martensitic Needle & Lath Microstructure ---
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, W, H);

        // Prior austenite grain boundaries (dashed)
        ctx.strokeStyle = "#475467";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        for (let i = 0; i < 6; i++) {
          const px = 50 + (i % 3) * 140;
          const py = 50 + Math.floor(i / 3) * 160;
          ctx.strokeRect(px, py, 130, 150);
        }
        ctx.setLineDash([]);

        // Martensite needles
        const timeOffset = isRunning ? stepRef.current * 0.05 : 0;
        ctx.lineWidth = 1.8;
        seedsRef.current.forEach((s, idx) => {
          for (let n = 0; n < 8; n++) {
            const angle = ((idx * 45 + n * 30 + Math.sin(timeOffset) * 5) * Math.PI) / 180;
            const len = 35 + ((idx * 7 + n * 11) % 45);
            const nx = s.x + Math.cos(angle) * len;
            const ny = s.y + Math.sin(angle) * len;

            ctx.strokeStyle = n % 2 === 0 ? "#f1f5f9" : "#94a3b8";
            ctx.beginPath();
            ctx.moveTo(s.x - Math.cos(angle) * len, s.y - Math.sin(angle) * len);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
        });

        // Retained Austenite pockets
        ctx.fillStyle = "#fef08a";
        seedsRef.current.forEach((s, i) => {
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.ellipse(s.x + 15, s.y - 15, 8, 4, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });

      } else if (simMode === "precipitate_coarsening") {
        // --- 4. Gamma-Prime / LSW Precipitate Ripening ---
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);

        // Matrix background texture
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, W, H);

        const precipCount = 180;
        const avgR = Math.max(2, Math.min(16, (holdTimeMin / 25) * (annealingTemp / 700)));

        for (let p = 0; p < precipCount; p++) {
          const px = ((p * 79 + 31) % (W - 20)) + 10;
          const py = ((p * 113 + 53) % (H - 20)) + 10;
          const r = avgR * (0.6 + ((p % 7) / 7) * 0.8);

          // Cuboidal gamma-prime or spherical precipitates
          ctx.fillStyle = p % 3 === 0 ? "#38bdf8" : "#06b6d4";
          ctx.strokeStyle = "#e0f2fe";
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.roundRect(px - r, py - r, r * 2, r * 2, r * 0.25);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Micron Scale Bar
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(W - 130, H - 25, 110, 5);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("50 µm", W - 75, H - 32);

      // Micrograph Info Banner Top Left
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(10, 10, 175, 42);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.strokeRect(10, 10, 175, 42);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`ASTM Grain Size: G=${astmG}`, 16, 26);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Avg Grain Diam: ~${avgGrainDiamUm} µm`, 16, 42);

      if (isRunning) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [
    simMode,
    grainCount,
    annealingTemp,
    holdTimeMin,
    carbonContent,
    lamellaeSpacing,
    isRunning,
    showGrainBoundaries,
    showOrientationColors,
    etchContrast,
  ]);

  // Snapshot capture handler
  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `Simulated_Microstructure_${simMode}_ASTM_G${astmG}.png`;
    a.click();
  };

  return (
    <div className="bg-[#090e18] p-5 rounded-2xl border border-[#162032] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162032] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Dynamic Microstructure & Metallography Simulator</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Simulate grain growth, pearlite colony lamellae, martensitic lath packets, and LSW precipitate coarsening.
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#050810] rounded-xl border border-[#162032] overflow-x-auto">
          {[
            { id: "voronoi_grains", label: "ASTM Grains" },
            { id: "pearlite_lamellae", label: "Pearlite Lamellae" },
            { id: "martensite_laths", label: "Martensite Laths" },
            { id: "precipitate_coarsening", label: "LSW Precipitates" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSimMode(m.id as MicrostructureSimulationMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap ${
                simMode === m.id
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace: Canvas (Left) & Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Live Canvas Viewport */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative p-1.5 bg-[#050810] rounded-2xl border border-sky-900/40 shadow-[0_0_24px_rgba(56,189,248,0.12)]">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="w-[320px] sm:w-[380px] h-[320px] sm:h-[380px] rounded-xl select-none image-pixelated cursor-crosshair"
            />
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center justify-between w-full max-w-[380px] mt-3 px-1 font-mono text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold hover:bg-sky-500/30 transition"
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? "Pause" : "Simulate"}</span>
              </button>
              <button
                type="button"
                onClick={initSeeds}
                title="Re-seed Microstructure"
                className="p-1.5 rounded-lg bg-[#0c1322] border border-[#1e2d46] text-slate-300 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCaptureSnapshot}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1322] hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snapshot</span>
            </button>
          </div>
        </div>

        {/* Physics Controls & Quantitative Metrics */}
        <div className="lg:col-span-5 space-y-4 font-mono text-xs">
          {/* Key Quantitative Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-[#050810] rounded-xl border border-sky-900/40">
              <span className="text-[10px] text-slate-400 block">ASTM E112 Number:</span>
              <span className="text-sky-400 font-extrabold text-lg">G = {astmG}</span>
              <span className="text-[9px] text-slate-500 block">
                {astmG >= 9 ? "Ultra-fine Grain" : astmG >= 6 ? "Medium Fine" : "Coarse Grain"}
              </span>
            </div>
            <div className="p-3 bg-[#050810] rounded-xl border border-sky-900/40">
              <span className="text-[10px] text-slate-400 block">Mean Grain Diameter:</span>
              <span className="text-emerald-400 font-extrabold text-lg">~{avgGrainDiamUm} µm</span>
              <span className="text-[9px] text-slate-500 block">d = (320 / √N)</span>
            </div>
          </div>

          {/* Dynamic Sliders depending on mode */}
          <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-3.5">
            <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider block border-b border-[#162032] pb-1.5">
              Thermodynamic & Metallurgical Parameters
            </span>

            {/* Grain Count / Nucleation Density */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Nucleation Density (Grains):</span>
                <span className="text-white font-bold">{grainCount} seeds</span>
              </div>
              <input
                type="range"
                min={12}
                max={100}
                step={2}
                value={grainCount}
                onChange={(e) => setGrainCount(parseInt(e.target.value))}
                className="w-full accent-sky-400 h-1 bg-[#162032] rounded"
              />
            </div>

            {/* Annealing Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Austenitizing / Heat Temp:</span>
                <span className="text-amber-400 font-bold">{annealingTemp}°C</span>
              </div>
              <input
                type="range"
                min={500}
                max={1200}
                step={25}
                value={annealingTemp}
                onChange={(e) => setAnnealingTemp(parseInt(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-[#162032] rounded"
              />
            </div>

            {/* Hold Time */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Soaking / Hold Duration:</span>
                <span className="text-white font-bold">{holdTimeMin} min</span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={holdTimeMin}
                onChange={(e) => setHoldTimeMin(parseInt(e.target.value))}
                className="w-full accent-sky-400 h-1 bg-[#162032] rounded"
              />
            </div>

            {/* Mode-Specific Parameter */}
            {simMode === "pearlite_lamellae" && (
              <div className="space-y-1 pt-1 border-t border-[#162032]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Interlamellar Spacing (λ):</span>
                  <span className="text-cyan-300 font-bold">{lamellaeSpacing * 0.15} µm</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={lamellaeSpacing}
                  onChange={(e) => setLamellaeSpacing(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-[#162032] rounded"
                />
              </div>
            )}
          </div>

          {/* Optical Microscopy Display Toggles */}
          <div className="p-3.5 bg-[#050810] rounded-xl border border-[#162032] space-y-2.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Metallographic Etching & Optics
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Etch Contrast (Nital / Kalling):</span>
              <span className="text-sky-400 font-bold">{etchContrast}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={180}
              step={5}
              value={etchContrast}
              onChange={(e) => setEtchContrast(parseInt(e.target.value))}
              className="w-full accent-sky-400 h-1 bg-[#162032] rounded"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowGrainBoundaries(!showGrainBoundaries)}
                className={`p-2 rounded-lg border text-[10px] font-bold transition ${
                  showGrainBoundaries
                    ? "bg-sky-500/20 border-sky-400/50 text-sky-300"
                    : "bg-[#0c1322] border-[#162032] text-slate-400"
                }`}
              >
                {showGrainBoundaries ? "✓ Grain Boundaries ON" : "Grain Boundaries OFF"}
              </button>

              <button
                type="button"
                onClick={() => setShowOrientationColors(!showOrientationColors)}
                className={`p-2 rounded-lg border text-[10px] font-bold transition ${
                  showOrientationColors
                    ? "bg-sky-500/20 border-sky-400/50 text-sky-300"
                    : "bg-[#0c1322] border-[#162032] text-slate-400"
                }`}
              >
                {showOrientationColors ? "✓ EBSD Orientations" : "Monochrome Etch"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

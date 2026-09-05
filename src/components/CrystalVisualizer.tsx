import React, { useEffect, useRef, useState, useMemo } from "react";
import { Layers, RotateCcw, Box, Compass, Sparkles, Info, Eye, Zap, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

type LatticeType = "BCC" | "FCC" | "HCP" | "BCT" | "Diamond" | "NaCl";
type LatticeMode = "ball-and-stick" | "hard-sphere";
type MillerPlane = "none" | "100" | "110" | "111" | "001" | "1120";

interface Atom3D {
  x: number; // -1 to 1
  y: number;
  z: number;
  radius: number;
  color: string;
  type: "host" | "interstitial" | "anion";
  label?: string;
}

interface Bond3D {
  a: number; // index of atom 1
  b: number; // index of atom 2
}

export const CrystalVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [lattice, setLattice] = useState<LatticeType>("BCC");
  const [mode, setMode] = useState<LatticeMode>("ball-and-stick");
  const [plane, setPlane] = useState<MillerPlane>("110");
  const [showInterstitials, setShowInterstitials] = useState<boolean>(true);
  const [showSlipSystems, setShowSlipSystems] = useState<boolean>(true);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1.2);

  // High performance animation loop refs (prevent React maximum update depth cycles)
  const rotXRef = useRef<number>(0.4);
  const rotYRef = useRef<number>(0.6);
  const isRotatingRef = useRef<boolean>(isRotating);
  isRotatingRef.current = isRotating;
  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;

  // Mouse drag tracking
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Generate atoms and bonds based on selected crystal lattice
  const getCrystalData = (): { atoms: Atom3D[]; bonds: Bond3D[]; info: any } => {
    let atoms: Atom3D[] = [];
    let bonds: Bond3D[] = [];
    let info = {
      apf: "0.68",
      coordination: 8,
      closePackedPlane: "{110}",
      closePackedDir: "<111>",
      latticeParams: "a = 2.866 Å (α-Fe)",
      slipSystems: "48 ({110}<111>, {112}<111>, {123}<111>)",
      description: "Body-Centered Cubic: 1 atom at each of the 8 corners + 1 in the center. Found in α-Ferrite, Chromium, Tungsten, Molybdenum.",
    };

    if (lattice === "BCC") {
      info = {
        apf: "0.68",
        coordination: 8,
        closePackedPlane: "{110}",
        closePackedDir: "<111>",
        latticeParams: "a = 2.866 Å (α-Fe)",
        slipSystems: "48 ({110}<111>, {112}<111>, {123}<111>)",
        description: "Body-Centered Cubic: 8 corners + 1 center atom. Found in α-Ferrite, Cr, W, Mo, V. Slip occurs along <111> directions.",
      };

      const rad = mode === "hard-sphere" ? 0.433 : 0.18;
      const cornerColor = "#38bdf8"; // cyan-400
      const centerColor = "#f59e0b"; // amber-500

      // 8 Corners
      for (let x of [-0.6, 0.6]) {
        for (let y of [-0.6, 0.6]) {
          for (let z of [-0.6, 0.6]) {
            atoms.push({ x, y, z, radius: rad, color: cornerColor, type: "host" });
          }
        }
      }

      // Center atom
      atoms.push({ x: 0, y: 0, z: 0, radius: rad, color: centerColor, type: "host", label: "Center" });

      // Cube edges bonds
      bonds = [
        { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 4 },
        { a: 3, b: 1 }, { a: 3, b: 2 }, { a: 3, b: 7 },
        { a: 5, b: 1 }, { a: 5, b: 4 }, { a: 5, b: 7 },
        { a: 6, b: 2 }, { a: 6, b: 4 }, { a: 6, b: 7 },
      ];

      // Body diagonal bonds to center
      for (let i = 0; i < 8; i++) {
        bonds.push({ a: i, b: 8 });
      }

      // Octahedral Interstitial sites (Face centers and edge midpoints)
      if (showInterstitials) {
        // 6 Face centers (Octahedral sites in BCC)
        const octSites = [
          { x: 0, y: 0, z: -0.6 },
          { x: 0, y: 0, z: 0.6 },
          { x: 0, y: -0.6, z: 0 },
          { x: 0, y: 0.6, z: 0 },
          { x: -0.6, y: 0, z: 0 },
          { x: 0.6, y: 0, z: 0 },
        ];
        octSites.forEach((pos) => {
          atoms.push({ ...pos, radius: rad * 0.45, color: "#ef4444", type: "interstitial", label: "Oct Site (C/N)" });
        });
      }
    } else if (lattice === "FCC") {
      info = {
        apf: "0.74 (Max close-packed)",
        coordination: 12,
        closePackedPlane: "{111}",
        closePackedDir: "<110>",
        latticeParams: "a = 3.59 Å (γ-Fe), 4.05 Å (Al), 3.61 Å (Cu)",
        slipSystems: "12 ({111}<110>)",
        description: "Face-Centered Cubic: 8 corners + 6 face centers. Found in γ-Austenite, Aluminum, Copper, Nickel, Gold. Supreme ductility due to 12 close-packed slip systems.",
      };

      const rad = mode === "hard-sphere" ? 0.353 : 0.16;
      const cornerColor = "#38bdf8";
      const faceColor = "#10b981"; // emerald-500

      // 8 Corners
      for (let x of [-0.6, 0.6]) {
        for (let y of [-0.6, 0.6]) {
          for (let z of [-0.6, 0.6]) {
            atoms.push({ x, y, z, radius: rad, color: cornerColor, type: "host" });
          }
        }
      }

      // 6 Face Centers
      const faceCenters = [
        { x: 0, y: 0, z: -0.6 },
        { x: 0, y: 0, z: 0.6 },
        { x: 0, y: -0.6, z: 0 },
        { x: 0, y: 0.6, z: 0 },
        { x: -0.6, y: 0, z: 0 },
        { x: 0.6, y: 0, z: 0 },
      ];
      faceCenters.forEach((fc) => {
        atoms.push({ ...fc, radius: rad, color: faceColor, type: "host", label: "Face" });
      });

      // Cube edges
      bonds = [
        { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 4 },
        { a: 3, b: 1 }, { a: 3, b: 2 }, { a: 3, b: 7 },
        { a: 5, b: 1 }, { a: 5, b: 4 }, { a: 5, b: 7 },
        { a: 6, b: 2 }, { a: 6, b: 4 }, { a: 6, b: 7 },
      ];

      // Octahedral interstitial site at exact center (0,0,0) in FCC
      if (showInterstitials) {
        atoms.push({ x: 0, y: 0, z: 0, radius: rad * 0.55, color: "#ef4444", type: "interstitial", label: "Large Oct Void" });
      }
    } else if (lattice === "HCP") {
      info = {
        apf: "0.74",
        coordination: 12,
        closePackedPlane: "{0001} (Basal)",
        closePackedDir: "<11-20>",
        latticeParams: "a = 2.95 Å, c = 4.68 Å, c/a = 1.587 (α-Ti)",
        slipSystems: "3 Basal ({0001}<11-20>) + Prismatic/Pyramidal",
        description: "Hexagonal Close-Packed: 12 corner atoms + 2 basal face centers + 3 internal layer atoms at z = 0. Found in α-Ti, Mg, Zn, Zr, Co.",
      };

      const rad = mode === "hard-sphere" ? 0.32 : 0.16;
      const hColor = "#a855f7"; // purple-500
      const midColor = "#f97316"; // orange-500

      // Top and bottom hexagon rings (12 atoms) + 2 centers
      const hexAngles = [0, 60, 120, 180, 240, 300].map((deg) => (deg * Math.PI) / 180);
      const hexR = 0.65;
      const cHalf = 0.65;

      // Bottom hex (z = -cHalf)
      hexAngles.forEach((ang) => {
        atoms.push({ x: hexR * Math.cos(ang), y: hexR * Math.sin(ang), z: -cHalf, radius: rad, color: hColor, type: "host" });
      });
      atoms.push({ x: 0, y: 0, z: -cHalf, radius: rad, color: hColor, type: "host" }); // bottom center (index 6)

      // Top hex (z = +cHalf)
      hexAngles.forEach((ang) => {
        atoms.push({ x: hexR * Math.cos(ang), y: hexR * Math.sin(ang), z: cHalf, radius: rad, color: hColor, type: "host" });
      });
      atoms.push({ x: 0, y: 0, z: cHalf, radius: rad, color: hColor, type: "host" }); // top center (index 13)

      // 3 Mid-plane atoms at z = 0 (B layer)
      const midAngles = [30, 150, 270].map((deg) => (deg * Math.PI) / 180);
      const midR = 0.38;
      midAngles.forEach((ang) => {
        atoms.push({ x: midR * Math.cos(ang), y: midR * Math.sin(ang), z: 0, radius: rad, color: midColor, type: "host", label: "B-Layer" });
      });

      // Hexagon rim bonds
      for (let i = 0; i < 6; i++) {
        bonds.push({ a: i, b: (i + 1) % 6 });
        bonds.push({ a: 7 + i, b: 7 + ((i + 1) % 6) });
        bonds.push({ a: i, b: 7 + i }); // vertical columns
        bonds.push({ a: i, b: 6 }); // spokes to bottom center
        bonds.push({ a: 7 + i, b: 13 }); // spokes to top center
      }
    } else if (lattice === "BCT") {
      info = {
        apf: "0.68 - 0.70",
        coordination: 8,
        closePackedPlane: "{110}",
        closePackedDir: "<111>",
        latticeParams: "a = 2.85 Å, c = 2.98 Å (c/a = 1.045)",
        slipSystems: "Limited (High internal lattice strain)",
        description: "Body-Centered Tetragonal: Diffusionless shear product of quenched Carbon Martensite. Trapped carbon atoms along z-axis stretch the c-lattice parameter, producing extreme hardness (up to 68 HRC).",
      };

      const rad = 0.17;
      const cornerColor = "#38bdf8";
      const centerColor = "#f59e0b";

      // 8 Corners with elongated Z (c/a = 1.15 for visual clarity)
      for (let x of [-0.55, 0.55]) {
        for (let y of [-0.55, 0.55]) {
          for (let z of [-0.75, 0.75]) {
            atoms.push({ x, y, z, radius: rad, color: cornerColor, type: "host" });
          }
        }
      }
      // Center atom
      atoms.push({ x: 0, y: 0, z: 0, radius: rad, color: centerColor, type: "host" });

      // Trapped Carbon Interstitial at (0, 0, 0.75) octahedral site
      atoms.push({ x: 0, y: 0, z: 0.75, radius: 0.10, color: "#ef4444", type: "interstitial", label: "Trapped C Atom" });

      bonds = [
        { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 4 },
        { a: 3, b: 1 }, { a: 3, b: 2 }, { a: 3, b: 7 },
        { a: 5, b: 1 }, { a: 5, b: 4 }, { a: 5, b: 7 },
        { a: 6, b: 2 }, { a: 6, b: 4 }, { a: 6, b: 7 },
      ];
      for (let i = 0; i < 8; i++) {
        bonds.push({ a: i, b: 8 });
      }
    } else if (lattice === "Diamond") {
      info = {
        apf: "0.34 (Open tetrahedral network)",
        coordination: 4,
        closePackedPlane: "{111}",
        closePackedDir: "<110>",
        latticeParams: "a = 3.56 Å (Diamond C), 5.43 Å (Si)",
        slipSystems: "Covalent directional bonds (Extremely hard)",
        description: "Diamond Cubic: Interpenetrating FCC sublattices with sp3 tetrahedral bonding. Found in Carbon-Diamond, Silicon, Germanium.",
      };

      const rad = 0.15;
      const cColor = "#60a5fa";

      // FCC Base
      for (let x of [-0.6, 0.6]) {
        for (let y of [-0.6, 0.6]) {
          for (let z of [-0.6, 0.6]) {
            atoms.push({ x, y, z, radius: rad, color: cColor, type: "host" });
          }
        }
      }
      const faceCenters = [
        { x: 0, y: 0, z: -0.6 },
        { x: 0, y: 0, z: 0.6 },
        { x: 0, y: -0.6, z: 0 },
        { x: 0, y: 0.6, z: 0 },
        { x: -0.6, y: 0, z: 0 },
        { x: 0.6, y: 0, z: 0 },
      ];
      faceCenters.forEach((fc) => atoms.push({ ...fc, radius: rad, color: cColor, type: "host" }));

      // 4 Internal Sublattice atoms
      const internals = [
        { x: -0.3, y: -0.3, z: -0.3 },
        { x: 0.3, y: 0.3, z: -0.3 },
        { x: -0.3, y: 0.3, z: 0.3 },
        { x: 0.3, y: -0.3, z: 0.3 },
      ];
      internals.forEach((inAt) => atoms.push({ ...inAt, radius: rad * 1.1, color: "#3b82f6", type: "host", label: "Tetrahedral" }));

      bonds = [
        { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 4 },
        { a: 3, b: 1 }, { a: 3, b: 2 }, { a: 3, b: 7 },
        { a: 5, b: 1 }, { a: 5, b: 4 }, { a: 5, b: 7 },
        { a: 6, b: 2 }, { a: 6, b: 4 }, { a: 6, b: 7 },
      ];
    } else if (lattice === "NaCl") {
      info = {
        apf: "0.67",
        coordination: 6,
        closePackedPlane: "{100} / {111}",
        closePackedDir: "<100>",
        latticeParams: "a = 4.32 Å (TiC), 4.16 Å (VC)",
        slipSystems: "{110}<1-10>",
        description: "Rock Salt / TiC Interstitial Carbide: Interpenetrating FCC sublattices of metal cations (Ti, V, Zr) and small interstitial Carbon anions in all octahedral interstitial sites.",
      };

      const radM = 0.17;
      const radC = 0.12;

      // 8 Corners Ti + 6 Face centers Ti
      for (let x of [-0.6, 0.6]) {
        for (let y of [-0.6, 0.6]) {
          for (let z of [-0.6, 0.6]) {
            atoms.push({ x, y, z, radius: radM, color: "#38bdf8", type: "host", label: "Ti Cation" });
          }
        }
      }
      const faceCenters = [
        { x: 0, y: 0, z: -0.6 },
        { x: 0, y: 0, z: 0.6 },
        { x: 0, y: -0.6, z: 0 },
        { x: 0, y: 0.6, z: 0 },
        { x: -0.6, y: 0, z: 0 },
        { x: 0.6, y: 0, z: 0 },
      ];
      faceCenters.forEach((fc) => atoms.push({ ...fc, radius: radM, color: "#38bdf8", type: "host", label: "Ti Cation" }));

      // 12 Edge midpoints + 1 Body center Carbon anions
      const edgeMids = [
        { x: 0, y: -0.6, z: -0.6 }, { x: 0, y: 0.6, z: -0.6 }, { x: -0.6, y: 0, z: -0.6 }, { x: 0.6, y: 0, z: -0.6 },
        { x: 0, y: -0.6, z: 0.6 }, { x: 0, y: 0.6, z: 0.6 }, { x: -0.6, y: 0, z: 0.6 }, { x: 0.6, y: 0, z: 0.6 },
        { x: -0.6, y: -0.6, z: 0 }, { x: 0.6, y: -0.6, z: 0 }, { x: -0.6, y: 0.6, z: 0 }, { x: 0.6, y: 0.6, z: 0 },
      ];
      edgeMids.forEach((em) => atoms.push({ ...em, radius: radC, color: "#ef4444", type: "anion", label: "C Interstitial" }));
      atoms.push({ x: 0, y: 0, z: 0, radius: radC, color: "#ef4444", type: "anion", label: "Center C" });

      bonds = [
        { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 4 },
        { a: 3, b: 1 }, { a: 3, b: 2 }, { a: 3, b: 7 },
        { a: 5, b: 1 }, { a: 5, b: 4 }, { a: 5, b: 7 },
        { a: 6, b: 2 }, { a: 6, b: 4 }, { a: 6, b: 7 },
      ];
    }

    return { atoms, bonds, info };
  };

  const { atoms, bonds, info } = useMemo(() => {
    return getCrystalData();
  }, [lattice, mode, showInterstitials, showSlipSystems]);

  // Animation & Rendering Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.38 * zoomRef.current;

      // Clear Canvas with subtle dark slate radial background
      ctx.clearRect(0, 0, width, height);

      // Radial background glow
      const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, width * 0.6);
      grad.addColorStop(0, "#1e293b");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Auto rotation if active (updates internal angle without triggering React re-renders)
      if (isRotatingRef.current && !isDragging.current) {
        rotYRef.current += 0.005;
      }

      const rotX = rotXRef.current;
      const rotY = rotYRef.current;

      // Projection Matrix (Euler Angles)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Project 3D point to 2D
      const project = (p: { x: number; y: number; z: number }) => {
        // Rotate Y
        const x1 = p.x * cosY + p.z * sinY;
        const y1 = p.y;
        const z1 = -p.x * sinY + p.z * cosY;

        // Rotate X
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Perspective projection
        const dist = 3.5;
        const fov = dist / (dist + z2);

        return {
          px: cx + x2 * scale * fov,
          py: cy + y2 * scale * fov,
          pz: z2,
          fov,
        };
      };

      // 1. Draw Miller Plane Slice (if selected)
      if (plane !== "none") {
        ctx.save();
        let planeCorners3D: { x: number; y: number; z: number }[] = [];

        if (plane === "100") {
          planeCorners3D = [
            { x: 0.6, y: -0.6, z: -0.6 },
            { x: 0.6, y: 0.6, z: -0.6 },
            { x: 0.6, y: 0.6, z: 0.6 },
            { x: 0.6, y: -0.6, z: 0.6 },
          ];
        } else if (plane === "110") {
          planeCorners3D = [
            { x: -0.6, y: 0.6, z: -0.6 },
            { x: 0.6, y: -0.6, z: -0.6 },
            { x: 0.6, y: -0.6, z: 0.6 },
            { x: -0.6, y: 0.6, z: 0.6 },
          ];
        } else if (plane === "111") {
          planeCorners3D = [
            { x: 0.6, y: -0.6, z: -0.6 },
            { x: -0.6, y: 0.6, z: -0.6 },
            { x: -0.6, y: -0.6, z: 0.6 },
          ];
        } else if (plane === "001") {
          planeCorners3D = [
            { x: -0.6, y: -0.6, z: 0.6 },
            { x: 0.6, y: -0.6, z: 0.6 },
            { x: 0.6, y: 0.6, z: 0.6 },
            { x: -0.6, y: 0.6, z: 0.6 },
          ];
        }

        if (planeCorners3D.length >= 3) {
          const projectedCorners = planeCorners3D.map(project);
          ctx.beginPath();
          ctx.moveTo(projectedCorners[0].px, projectedCorners[0].py);
          for (let i = 1; i < projectedCorners.length; i++) {
            ctx.lineTo(projectedCorners[i].px, projectedCorners[i].py);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(245, 158, 11, 0.28)"; // amber glow
          ctx.fill();
          ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Label plane
          ctx.fillStyle = "#fef08a";
          ctx.font = "bold 13px 'JetBrains Mono', monospace";
          ctx.fillText(`(${plane}) Plane`, projectedCorners[0].px + 8, projectedCorners[0].py - 8);
        }
        ctx.restore();
      }

      // 2. Draw Bonds (Unit cell frame)
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)"; // slate-400

      bonds.forEach((b) => {
        if (atoms[b.a] && atoms[b.b]) {
          const p1 = project(atoms[b.a]);
          const p2 = project(atoms[b.b]);
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }
      });

      // 3. Draw Slip System Direction Vector (e.g. <111> in BCC or <110> in FCC)
      if (showSlipSystems) {
        ctx.save();
        let start3D = { x: -0.6, y: -0.6, z: -0.6 };
        let end3D = { x: 0.6, y: 0.6, z: 0.6 };
        let dirLabel = "<111>";

        if (lattice === "FCC") {
          start3D = { x: -0.6, y: 0.6, z: -0.6 };
          end3D = { x: 0.6, y: -0.6, z: -0.6 };
          dirLabel = "<110>";
        }

        const pStart = project(start3D);
        const pEnd = project(end3D);

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(pStart.px, pStart.py);
        ctx.lineTo(pEnd.px, pEnd.py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow head
        const angle = Math.atan2(pEnd.py - pStart.py, pEnd.px - pStart.px);
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(pEnd.px, pEnd.py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        ctx.fillText(`Slip Dir ${dirLabel}`, pEnd.px + 10, pEnd.py + 4);
        ctx.restore();
      }

      // 4. Sort Atoms by Z-depth for correct Painter's 3D rendering
      const projectedAtoms = atoms.map((atom, idx) => {
        const proj = project(atom);
        return { ...atom, ...proj, originalIndex: idx };
      });

      projectedAtoms.sort((a, b) => a.pz - b.pz);

      // 5. Draw Atoms with 3D Spherical Lighting & Metallic Shading
      projectedAtoms.forEach((atom) => {
        const radius = atom.radius * scale * atom.fov;

        // Atom sphere gradient
        const atomGrad = ctx.createRadialGradient(
          atom.px - radius * 0.35,
          atom.py - radius * 0.35,
          radius * 0.1,
          atom.px,
          atom.py,
          radius
        );

        if (atom.type === "interstitial") {
          atomGrad.addColorStop(0, "#fca5a5");
          atomGrad.addColorStop(0.7, "#ef4444");
          atomGrad.addColorStop(1, "#991b1b");
        } else if (atom.color === "#38bdf8") {
          atomGrad.addColorStop(0, "#bae6fd");
          atomGrad.addColorStop(0.6, "#38bdf8");
          atomGrad.addColorStop(1, "#0369a1");
        } else if (atom.color === "#f59e0b") {
          atomGrad.addColorStop(0, "#fef08a");
          atomGrad.addColorStop(0.6, "#f59e0b");
          atomGrad.addColorStop(1, "#b45309");
        } else if (atom.color === "#10b981") {
          atomGrad.addColorStop(0, "#a7f3d0");
          atomGrad.addColorStop(0.6, "#10b981");
          atomGrad.addColorStop(1, "#047857");
        } else {
          atomGrad.addColorStop(0, "#ffffff");
          atomGrad.addColorStop(0.7, atom.color);
          atomGrad.addColorStop(1, "#0f172a");
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(atom.px, atom.py, Math.max(3, radius), 0, Math.PI * 2);
        ctx.fillStyle = atomGrad;
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Label if present
        if (atom.label && mode === "ball-and-stick") {
          ctx.fillStyle = "#f8fafc";
          ctx.font = "10px 'Plus Jakarta Sans', sans-serif";
          ctx.fillText(atom.label, atom.px + radius + 4, atom.py + 3);
        }
      });

      // 6. Draw Coordinate Axis Compass in bottom-left
      const axisLen = 35;
      const axOrigin = { x: 50, y: height - 50 };
      const xAxis = { x: cosY * axisLen, y: sinX * sinY * axisLen };
      const yAxis = { x: 0, y: -cosX * axisLen };
      const zAxis = { x: -sinY * axisLen, y: sinX * cosY * axisLen };

      ctx.lineWidth = 2.5;

      // X (a1)
      ctx.strokeStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(axOrigin.x, axOrigin.y);
      ctx.lineTo(axOrigin.x + xAxis.x, axOrigin.y + xAxis.y);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("x [100]", axOrigin.x + xAxis.x + 4, axOrigin.y + xAxis.y);

      // Y (a2)
      ctx.strokeStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(axOrigin.x, axOrigin.y);
      ctx.lineTo(axOrigin.x + yAxis.x, axOrigin.y + yAxis.y);
      ctx.stroke();
      ctx.fillStyle = "#10b981";
      ctx.fillText("y [010]", axOrigin.x + yAxis.x + 4, axOrigin.y + yAxis.y);

      // Z (c)
      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(axOrigin.x, axOrigin.y);
      ctx.lineTo(axOrigin.x + zAxis.x, axOrigin.y + zAxis.y);
      ctx.stroke();
      ctx.fillStyle = "#3b82f6";
      ctx.fillText("z [001]", axOrigin.x + zAxis.x + 4, axOrigin.y + zAxis.y);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [lattice, mode, plane, showInterstitials, showSlipSystems, atoms, bonds]);

  // Pointer & Touch Drag / Pinch Handlers (Android & Mobile Optimized)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialZoom = useRef<number>(zoom);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else if (activePointers.current.size === 2) {
      // Pinch gesture start
      isDragging.current = false;
      const pts: { x: number; y: number }[] = Array.from(activePointers.current.values());
      initialPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialZoom.current = zoomRef.current;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2 && initialPinchDist.current) {
      // Handle pinch zoom on Android
      const pts: { x: number; y: number }[] = Array.from(activePointers.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = currentDist / initialPinchDist.current;
      const newZoom = Math.max(0.6, Math.min(2.2, initialZoom.current * ratio));
      setZoom(newZoom);
      zoomRef.current = newZoom;
      return;
    }

    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    rotYRef.current += dx * 0.008;
    rotXRef.current = Math.max(-1.4, Math.min(1.4, rotXRef.current + dy * 0.008));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      isDragging.current = false;
      initialPinchDist.current = null;
    } else if (activePointers.current.size === 1) {
      // Switch back to single finger drag
      const remaining = activePointers.current.values().next().value;
      if (remaining) {
        lastMousePos.current = { x: remaining.x, y: remaining.y };
        isDragging.current = true;
      }
      initialPinchDist.current = null;
    }
  };

  const handleManualRotate = (dRotX: number, dRotY: number) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
    rotXRef.current = Math.max(-1.4, Math.min(1.4, rotXRef.current + dRotX));
    rotYRef.current += dRotY;
  };

  const handleManualZoom = (delta: number) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
    const newZoom = Math.max(0.6, Math.min(2.0, zoomRef.current + delta));
    setZoom(newZoom);
    zoomRef.current = newZoom;
  };

  return (
    <div id="crystal-structure-visualizer" className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-[#162032]">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-mono text-[10px] font-semibold uppercase tracking-widest">
            <Box className="w-3.5 h-3.5 text-sky-400" />
            3D Crystallography & Miller Indices Engine
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">Interactive Unit Cell & Lattice Inspector</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Visualize close-packed planes, slip directions, interstitial sites (C/N solute voids), and atomic packing factors (APF).
          </p>
        </div>

        {/* Quick Lattice Select Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-[#0c1322] rounded-lg border border-[#162032]">
          {(["BCC", "FCC", "HCP", "BCT", "Diamond", "NaCl"] as LatticeType[]).map((l) => (
            <button
              key={l}
              onClick={() => setLattice(l)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
                lattice === l
                  ? "bg-sky-500/20 border border-sky-400/60 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 3D Canvas Area */}
        <div className="lg:col-span-8 bg-[#090e18] rounded-xl border border-[#162032] p-3 flex flex-col relative overflow-hidden group">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#090e18]/90 backdrop-blur-md rounded text-xs font-mono font-semibold text-sky-400 border border-sky-500/30">
              {lattice} Lattice
            </span>
            <span className="px-2.5 py-0.5 bg-[#090e18]/90 backdrop-blur-md rounded text-xs font-mono text-slate-300 border border-[#162032]">
              APF: {info.apf}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#090e18]/90 backdrop-blur-md p-1 rounded-lg border border-[#162032]">
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-1.5 rounded text-xs font-medium transition ${
                isRotating ? "bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.3)]" : "text-slate-400 hover:text-white"
              }`}
              title={isRotating ? "Pause auto-rotation" : "Enable auto-rotation"}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} />
            </button>
            <button
              onClick={() => {
                rotXRef.current = 0.4;
                rotYRef.current = 0.6;
                setZoom(1.2);
                zoomRef.current = 1.2;
              }}
              className="p-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
              title="Reset View Orientation"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Canvas */}
          <div className="w-full aspect-[4/3] md:aspect-[16/10] relative cursor-grab active:cursor-grabbing select-none bg-[#060a12] rounded-lg border border-[#162032] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full rounded-lg touch-none block"
            />

            {/* Mobile / Touch On-Screen D-Pad & Zoom Controls */}
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-[#090e18]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#162032] shadow-lg">
              <div className="grid grid-cols-3 gap-1">
                <div></div>
                <button
                  type="button"
                  onClick={() => handleManualRotate(-0.15, 0)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#0c1322] hover:bg-sky-500/20 active:bg-sky-500/30 text-slate-300 active:text-sky-300 border border-[#162032] text-xs transition"
                  title="Tilt Up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div></div>
                <button
                  type="button"
                  onClick={() => handleManualRotate(0, -0.15)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#0c1322] hover:bg-sky-500/20 active:bg-sky-500/30 text-slate-300 active:text-sky-300 border border-[#162032] text-xs transition"
                  title="Rotate Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleManualRotate(0.15, 0)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#0c1322] hover:bg-sky-500/20 active:bg-sky-500/30 text-slate-300 active:text-sky-300 border border-[#162032] text-xs transition"
                  title="Tilt Down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleManualRotate(0, 0.15)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#0c1322] hover:bg-sky-500/20 active:bg-sky-500/30 text-slate-300 active:text-sky-300 border border-[#162032] text-xs transition"
                  title="Rotate Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="w-[1px] h-14 bg-[#162032] mx-0.5"></div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleManualZoom(0.15)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#0c1322] hover:bg-sky-500/20 active:bg-sky-500/30 text-slate-300 active:text-sky-300 border border-[#162032] text-xs transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleManualZoom(-0.15)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-[#0c1322] hover:bg-sky-500/20 active:bg-sky-500/30 text-slate-300 active:text-sky-300 border border-[#162032] text-xs transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Canvas Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-2.5 pt-2.5 border-t border-[#162032] text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Corner Atoms
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]"></span> Center/B-Layer
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Interstitial (C/N)
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Drag to rotate • Slider to zoom
            </div>
          </div>
        </div>

        {/* Right Parameters & Crystallography Panel */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Controls Card */}
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
            <h3 className="text-xs font-semibold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Lattice & Slicing Controls
            </h3>

            {/* Model Mode */}
            <div>
              <label className="text-[11px] text-slate-400 font-medium mb-1 block font-mono">Representation Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("ball-and-stick")}
                  className={`py-1.5 px-2.5 text-xs font-medium rounded border transition ${
                    mode === "ball-and-stick"
                      ? "bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
                      : "bg-[#0c1322] border-[#162032] text-slate-400 hover:text-white"
                  }`}
                >
                  Ball & Stick
                </button>
                <button
                  onClick={() => setMode("hard-sphere")}
                  className={`py-1.5 px-2.5 text-xs font-medium rounded border transition ${
                    mode === "hard-sphere"
                      ? "bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
                      : "bg-[#0c1322] border-[#162032] text-slate-400 hover:text-white"
                  }`}
                >
                  Hard Sphere (APF)
                </button>
              </div>
            </div>

            {/* Miller Indices Plane Selector */}
            <div>
              <label className="text-[11px] text-slate-400 font-medium mb-1 block font-mono">Miller Indices Plane Slice</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "none", label: "None" },
                  { id: "100", label: "(100)" },
                  { id: "110", label: "(110)" },
                  { id: "111", label: "(111)" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlane(p.id as MillerPlane)}
                    className={`py-1 text-xs font-mono font-semibold rounded border transition ${
                      plane === p.id
                        ? "bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.25)]"
                        : "bg-[#0c1322] border-[#162032] text-slate-400 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-1.5 pt-2 border-t border-[#162032]">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-white/[0.03]">
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  Show Interstitial Octahedral Sites
                </span>
                <input
                  type="checkbox"
                  checked={showInterstitials}
                  onChange={(e) => setShowInterstitials(e.target.checked)}
                  className="rounded border-[#1e2d46] text-sky-400 focus:ring-0 bg-[#0c1322] accent-sky-400"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-white/[0.03]">
                <span className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  Show Close-Packed Slip Direction
                </span>
                <input
                  type="checkbox"
                  checked={showSlipSystems}
                  onChange={(e) => setShowSlipSystems(e.target.checked)}
                  className="rounded border-[#1e2d46] text-sky-400 focus:ring-0 bg-[#0c1322] accent-sky-400"
                />
              </label>
            </div>

            {/* Zoom Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Lattice Scale Zoom</span>
                <span className="text-sky-400 font-bold">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.8"
                step="0.05"
                value={zoom}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setZoom(val);
                  zoomRef.current = val;
                }}
                className="w-full accent-sky-400 bg-[#0c1322] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Metallurgical Specs Card */}
          <div className="p-4 rounded-xl bg-[#090e18] border border-[#162032] space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-widest text-sky-400 font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              Lattice Crystallography Data
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#162032]">
                <span className="text-slate-400">Coordination Number (CN):</span>
                <span className="font-mono font-bold text-white">{info.coordination}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#162032]">
                <span className="text-slate-400">Atomic Packing Factor:</span>
                <span className="font-mono font-bold text-sky-400">{info.apf}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#162032]">
                <span className="text-slate-400">Close-Packed Plane:</span>
                <span className="font-mono font-bold text-cyan-400">{info.closePackedPlane}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#162032]">
                <span className="text-slate-400">Close-Packed Direction:</span>
                <span className="font-mono font-bold text-cyan-400">{info.closePackedDir}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#162032]">
                <span className="text-slate-400">Standard Lattice Constants:</span>
                <span className="font-mono text-slate-300 text-right">{info.latticeParams}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0c1322] border border-[#162032] text-[11px] text-slate-300 leading-relaxed">
              {info.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

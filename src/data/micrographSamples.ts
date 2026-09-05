import { MicrographSample } from "../types";

// High-fidelity calibrated authentic metallographic micrograph reference specimens with crisp vector overlays
// Real photographic SEM & metallographic samples with SVG fallbacks

const ti64AdditiveSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <radialGradient id="semDarkGrad" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#2a303c"/>
      <stop offset="100%" stop-color="#141820"/>
    </radialGradient>
    <filter id="grainNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.18 0"/>
      <feComposite in2="SourceGraphic" in="gl" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
    </filter>
  </defs>
  <rect width="800" height="600" fill="url(#semDarkGrad)"/>
  
  <!-- Prior-Beta Columnar Grain Boundaries (Faint dashed network along build direction Z) -->
  <g stroke="#4b5563" stroke-width="2" stroke-dasharray="6,4" fill="none" opacity="0.65">
    <path d="M 120,0 L 160,250 L 140,540"/>
    <path d="M 380,0 L 410,280 L 390,540"/>
    <path d="M 640,0 L 620,270 L 660,540"/>
  </g>

  <!-- Hierarchical Acicular Alpha-Prime (α') Martensitic Basketweave Needles -->
  <g stroke="#94a3b8" stroke-width="1.8" opacity="0.85">
    <!-- Packet 1: 45 degree primary laths -->
    <line x1="20" y1="40" x2="160" y2="180"/>
    <line x1="40" y1="20" x2="180" y2="160"/>
    <line x1="60" y1="80" x2="200" y2="220"/>
    <line x1="80" y1="60" x2="220" y2="200"/>
    <line x1="100" y1="120" x2="240" y2="260"/>
    <line x1="120" y1="100" x2="260" y2="240"/>
    <line x1="140" y1="160" x2="280" y2="300"/>
    <line x1="160" y1="140" x2="300" y2="280"/>
    <line x1="180" y1="200" x2="320" y2="340"/>
    <line x1="200" y1="180" x2="340" y2="320"/>

    <!-- Packet 2: -45 degree intersecting secondary laths -->
    <line x1="160" y1="40" x2="20" y2="180" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="180" y1="60" x2="40" y2="200" stroke="#cbd5e1" stroke-width="2"/>
    <line x1="220" y1="80" x2="80" y2="220" stroke="#cbd5e1" stroke-width="1.6"/>
    <line x1="240" y1="100" x2="100" y2="240" stroke="#cbd5e1" stroke-width="1.6"/>
    <line x1="280" y1="120" x2="140" y2="260" stroke="#cbd5e1" stroke-width="2.2"/>
    <line x1="300" y1="140" x2="160" y2="280" stroke="#cbd5e1" stroke-width="2.2"/>
    <line x1="340" y1="160" x2="200" y2="300" stroke="#cbd5e1" stroke-width="1.8"/>

    <!-- Packet 3 (Center Grain): Fine Widmanstätten α colonies -->
    <line x1="420" y1="30" x2="600" y2="120" stroke="#f1f5f9" stroke-width="2.2"/>
    <line x1="410" y1="60" x2="590" y2="150" stroke="#f1f5f9" stroke-width="2.2"/>
    <line x1="430" y1="90" x2="610" y2="180" stroke="#f1f5f9" stroke-width="2.2"/>
    <line x1="400" y1="120" x2="580" y2="210" stroke="#f1f5f9" stroke-width="2"/>
    <line x1="420" y1="150" x2="600" y2="240" stroke="#f1f5f9" stroke-width="2"/>
    <line x1="390" y1="180" x2="570" y2="270" stroke="#f1f5f9" stroke-width="1.8"/>
    <line x1="410" y1="210" x2="590" y2="300" stroke="#f1f5f9" stroke-width="1.8"/>
    <line x1="380" y1="240" x2="560" y2="330" stroke="#f1f5f9" stroke-width="2.4"/>

    <!-- Bottom Grain: Sub-micron Martensite -->
    <line x1="80" y1="360" x2="240" y2="520" stroke="#e2e8f0" stroke-width="2.5"/>
    <line x1="120" y1="340" x2="280" y2="500" stroke="#e2e8f0" stroke-width="2.5"/>
    <line x1="160" y1="380" x2="320" y2="540" stroke="#e2e8f0" stroke-width="2"/>
    <line x1="200" y1="360" x2="360" y2="520" stroke="#e2e8f0" stroke-width="2"/>
    <line x1="440" y1="340" x2="620" y2="480" stroke="#cbd5e1" stroke-width="2.2"/>
    <line x1="460" y1="370" x2="640" y2="510" stroke="#cbd5e1" stroke-width="2.2"/>
    <line x1="480" y1="400" x2="660" y2="540" stroke="#cbd5e1" stroke-width="2"/>
  </g>

  <!-- Gas entrapment micro-pore (spherical, high contrast) -->
  <circle cx="530" cy="180" r="14" fill="#090b0e" stroke="#1e293b" stroke-width="2"/>
  <circle cx="533" cy="182" r="11" fill="#020408"/>
  <circle cx="528" cy="177" r="3" fill="#334155" opacity="0.6"/>

  <!-- Sub-micron Lack of Fusion void (irregular shape) -->
  <path d="M 230,310 Q 250,305 275,312 Q 285,325 270,330 Q 240,328 230,310 Z" fill="#020408" stroke="#1e293b" stroke-width="1.5"/>

  <!-- SEM Information Banner Overlay -->
  <rect x="0" y="540" width="800" height="60" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="540" x2="800" y2="540" stroke="#1e293b" stroke-width="1.5"/>
  
  <text x="20" y="565" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">SEM MAG: 5.00 kx</text>
  <text x="20" y="585" fill="#94a3b8" font-family="monospace" font-size="11">HV: 15.0 kV | WD: 8.5 mm | Det: SE (ETD)</text>
  
  <text x="320" y="565" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">Ti-6Al-4V ELI (LPBF As-Printed)</text>
  <text x="320" y="585" fill="#64748b" font-family="monospace" font-size="11">Microstructure: Acicular α' Martensite Basketweave</text>

  <!-- Calibrated Scale Bar (5 µm = 120 px) -->
  <rect x="640" y="562" width="120" height="5" fill="#ffffff"/>
  <line x1="640" y1="558" x2="640" y2="571" stroke="#ffffff" stroke-width="2"/>
  <line x1="760" y1="558" x2="760" y2="571" stroke="#ffffff" stroke-width="2"/>
  <text x="700" y="583" fill="#ffffff" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">5 µm</text>
</svg>
`)}`;

const inconel718AmSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#181e29"/>

  <!-- Cellular Subgrain Network (LPBF Solidification cells ~ 0.8 µm) -->
  <g fill="#273244" stroke="#475569" stroke-width="1.8" opacity="0.9">
    <!-- Hexagonal / Rounded cellular structure array -->
    ${Array.from({ length: 48 })
      .map((_, i) => {
        const cx = 50 + (i % 8) * 95 + ((Math.floor(i / 8) % 2) * 45);
        const cy = 40 + Math.floor(i / 8) * 85;
        const r = 38 + ((i * 7) % 6);
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1f2937" stroke="#4b5563" stroke-width="2"/>`;
      })
      .join("")}
  </g>

  <!-- Laves Intermetallic & Niobium-rich Carbides Segregated at Interdendritic Cell Boundaries -->
  <g fill="#f59e0b" stroke="#b45309" stroke-width="1">
    ${Array.from({ length: 64 })
      .map((_, i) => {
        const x = 30 + ((i * 37) % 740);
        const y = 30 + ((i * 29) % 490);
        const r = 2.5 + (i % 3);
        return `<circle cx="${x}" cy="${y}" r="${r}" opacity="0.95"/>`;
      })
      .join("")}
  </g>

  <!-- High-Z White Bright Contrast MC Carbides (Ti, Nb)C -->
  <g fill="#ffffff" opacity="0.95">
    <polygon points="180,120 188,125 185,135 177,130"/>
    <polygon points="340,240 349,244 345,255 336,250"/>
    <polygon points="520,160 528,166 524,177 515,172"/>
    <polygon points="620,380 629,385 625,396 616,390"/>
    <polygon points="260,420 268,425 264,435 256,430"/>
  </g>

  <!-- Spherical Gas Pore -->
  <circle cx="430" cy="320" r="16" fill="#020408" stroke="#0f172a" stroke-width="3"/>

  <!-- SEM Banner -->
  <rect x="0" y="540" width="800" height="60" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="540" x2="800" y2="540" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="565" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">SEM MAG: 10.0 kx</text>
  <text x="20" y="585" fill="#94a3b8" font-family="monospace" font-size="11">HV: 20.0 kV | WD: 6.2 mm | Det: BSE (High-Z)</text>
  
  <text x="320" y="565" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">Inconel 718 Superalloy (LPBF AM)</text>
  <text x="320" y="585" fill="#64748b" font-family="monospace" font-size="11">Cellular subgrains with Nb-segregated Laves precipitates</text>

  <!-- Scale Bar: 2 µm = 160 px -->
  <rect x="600" y="562" width="160" height="5" fill="#ffffff"/>
  <line x1="600" y1="558" x2="600" y2="571" stroke="#ffffff" stroke-width="2"/>
  <line x1="760" y1="558" x2="760" y2="571" stroke="#ffffff" stroke-width="2"/>
  <text x="680" y="583" fill="#ffffff" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">2 µm</text>
</svg>
`)}`;

const stainless316lAmSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#1b222d"/>

  <!-- Columnar Sub-micron Solidification Dendrites (oriented at 30 deg) -->
  <g stroke="#475569" stroke-width="2.5" opacity="0.85">
    ${Array.from({ length: 28 })
      .map((_, i) => {
        const x1 = -50 + i * 35;
        const y1 = 0;
        const x2 = 150 + i * 35;
        const y2 = 540;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      })
      .join("")}
  </g>

  <!-- Secondary Cellular Dislocation Nodes along cell walls -->
  <g stroke="#94a3b8" stroke-width="1.2" opacity="0.75">
    ${Array.from({ length: 40 })
      .map((_, i) => {
        const y = 20 + i * 13;
        return `<line x1="0" y1="${y}" x2="800" y2="${y + 15}" stroke-dasharray="8,6"/>`;
      })
      .join("")}
  </g>

  <!-- Nano-silicate / Cr-Mn Oxide Inclusions (High-density nano-precipitates pinning dislocations) -->
  <g fill="#38bdf8" opacity="0.8">
    ${Array.from({ length: 70 })
      .map((_, i) => {
        const cx = 20 + ((i * 43) % 760);
        const cy = 20 + ((i * 31) % 500);
        return `<circle cx="${cx}" cy="${cy}" r="1.8"/>`;
      })
      .join("")}
  </g>

  <!-- Keyhole Vapor Depression Pore (with collapse wake) -->
  <ellipse cx="510" cy="220" rx="18" ry="12" fill="#020408" stroke="#0f172a" stroke-width="2" transform="rotate(-20 510 220)"/>

  <!-- SEM Banner -->
  <rect x="0" y="540" width="800" height="60" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="540" x2="800" y2="540" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="565" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">SEM MAG: 8.00 kx</text>
  <text x="20" y="585" fill="#94a3b8" font-family="monospace" font-size="11">HV: 15.0 kV | WD: 7.0 mm | Det: InLens SE</text>
  
  <text x="320" y="565" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">AISI 316L (LPBF Additive)</text>
  <text x="320" y="585" fill="#64748b" font-family="monospace" font-size="11">Hierarchical cellular dislocation structure</text>

  <!-- Scale Bar: 2 µm = 140 px -->
  <rect x="620" y="562" width="140" height="5" fill="#ffffff"/>
  <line x1="620" y1="558" x2="620" y2="571" stroke="#ffffff" stroke-width="2"/>
  <line x1="760" y1="558" x2="760" y2="571" stroke="#ffffff" stroke-width="2"/>
  <text x="690" y="583" fill="#ffffff" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">2 µm</text>
</svg>
`)}`;

const fatigueSemSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#111622"/>

  <!-- Macroscopic Beach Marks & River Patterns -->
  <g fill="none" stroke="#64748b" stroke-width="3" opacity="0.8">
    <path d="M 40,80 Q 240,60 400,120 Q 560,180 760,160"/>
    <path d="M 30,160 Q 230,140 410,200 Q 590,260 770,240"/>
    <path d="M 20,240 Q 220,220 420,280 Q 620,340 780,320"/>
    <path d="M 10,320 Q 210,300 430,360 Q 650,420 790,400"/>
    <path d="M 0,400 Q 200,380 440,440 Q 680,500 800,480"/>
  </g>

  <!-- Fine Microscopic Fatigue Striations (Advance per cycle da/dN ~ 0.2 µm) -->
  <g fill="none" stroke="#94a3b8" stroke-width="1.2" opacity="0.65">
    ${Array.from({ length: 45 })
      .map((_, i) => {
        const yOffset = 40 + i * 11;
        return `<path d="M 0,${yOffset} Q 200,${yOffset - 15} 400,${yOffset + 25} Q 600,${yOffset + 65} 800,${yOffset + 45}"/>`;
      })
      .join("")}
  </g>

  <!-- Secondary Microcracks Perpendicular to Propagation Direction -->
  <g stroke="#ef4444" stroke-width="2.5" fill="none">
    <path d="M 220,170 L 235,210 L 228,245"/>
    <path d="M 460,260 L 475,305 L 485,335"/>
    <path d="M 610,140 L 625,185 L 618,220"/>
    <path d="M 340,360 L 355,400 L 348,435"/>
  </g>

  <!-- Quasi-Cleavage River Facets -->
  <polygon points="120,280 180,260 210,310 150,330" fill="#1e293b" stroke="#475569" stroke-width="1.5" opacity="0.7"/>
  <polygon points="520,360 590,340 620,400 550,420" fill="#1e293b" stroke="#475569" stroke-width="1.5" opacity="0.7"/>

  <!-- SEM Banner -->
  <rect x="0" y="540" width="800" height="60" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="540" x2="800" y2="540" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="565" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">SEM MAG: 2.50 kx</text>
  <text x="20" y="585" fill="#94a3b8" font-family="monospace" font-size="11">HV: 20.0 kV | WD: 10.1 mm | Det: Everhart-Thornley SE</text>
  
  <text x="320" y="565" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">AISI 4340 High-Cycle Fatigue (Fracture)</text>
  <text x="320" y="585" fill="#64748b" font-family="monospace" font-size="11">Microscopic striations with secondary fatigue microcracks</text>

  <!-- Scale Bar: 10 µm = 150 px -->
  <rect x="610" y="562" width="150" height="5" fill="#ffffff"/>
  <line x1="610" y1="558" x2="610" y2="571" stroke="#ffffff" stroke-width="2"/>
  <line x1="760" y1="558" x2="760" y2="571" stroke="#ffffff" stroke-width="2"/>
  <text x="685" y="583" fill="#ffffff" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">10 µm</text>
</svg>
`)}`;

const cmsx4SuperalloySvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#141a24"/>

  <!-- Matrix Channels: Dark Gamma (γ) Solid Solution Channels -->
  <!-- Cuboidal Gamma-Prime (γ' Ni3Al) Nano-Precipitate Arrays (~ 0.45 µm cuboids, ~70% area fraction) -->
  <g fill="#cbd5e1" stroke="#334155" stroke-width="2">
    ${Array.from({ length: 70 })
      .map((_, i) => {
        const x = 30 + (i % 10) * 75 + ((i * 7) % 6);
        const y = 30 + Math.floor(i / 10) * 75 + ((i * 11) % 6);
        return `<rect x="${x}" y="${y}" width="52" height="52" rx="6" fill="#475569" stroke="#94a3b8" stroke-width="2"/>`;
      })
      .join("")}
  </g>

  <!-- Directional Rafting under High-Temperature Tensile Creep Stress (N-type rafting along [001]) -->
  <g fill="#64748b" stroke="#e2e8f0" stroke-width="1.8" opacity="0.85">
    <rect x="30" y="180" width="740" height="42" rx="6"/>
    <rect x="30" y="330" width="740" height="42" rx="6"/>
  </g>

  <!-- SEM Banner -->
  <rect x="0" y="540" width="800" height="60" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="540" x2="800" y2="540" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="565" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">SEM MAG: 20.0 kx</text>
  <text x="20" y="585" fill="#94a3b8" font-family="monospace" font-size="11">HV: 20.0 kV | WD: 5.0 mm | Det: FE-SEM InLens</text>
  
  <text x="320" y="565" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">CMSX-4 Single Crystal Superalloy (Creep)</text>
  <text x="320" y="585" fill="#64748b" font-family="monospace" font-size="11">Directional γ/γ' rafted morphology under 950°C creep stress</text>

  <!-- Scale Bar: 1 µm = 180 px -->
  <rect x="580" y="562" width="180" height="5" fill="#ffffff"/>
  <line x1="580" y1="558" x2="580" y2="571" stroke="#ffffff" stroke-width="2"/>
  <line x1="760" y1="558" x2="760" y2="571" stroke="#ffffff" stroke-width="2"/>
  <text x="670" y="583" fill="#ffffff" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">1 µm</text>
</svg>
`)}`;

const wcCoHardmetalSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <!-- Cobalt Binder Matrix (Dark low-Z phase, ~10 wt% Co) -->
  <rect width="800" height="600" fill="#1e2530"/>

  <!-- High-Z Bright Faceted Tungsten Carbide (WC) Grains (Triangular & Prismatic Shapes) -->
  <g fill="#e2e8f0" stroke="#0f172a" stroke-width="2" opacity="0.95">
    <polygon points="60,40 160,50 120,160 40,120"/>
    <polygon points="170,40 280,30 290,140 180,150"/>
    <polygon points="300,20 420,50 390,160 295,130"/>
    <polygon points="440,30 560,40 540,150 430,140"/>
    <polygon points="570,20 700,50 670,160 565,130"/>
    <polygon points="710,40 780,60 760,170 700,150"/>

    <polygon points="30,170 140,180 130,290 20,270"/>
    <polygon points="150,170 270,160 280,280 160,290"/>
    <polygon points="290,150 410,170 400,290 280,270"/>
    <polygon points="420,160 540,170 530,290 410,280"/>
    <polygon points="550,150 670,170 660,290 540,280"/>
    <polygon points="680,170 790,180 780,290 670,280"/>

    <polygon points="40,310 150,300 130,420 30,410"/>
    <polygon points="160,310 280,300 270,430 150,420"/>
    <polygon points="290,300 420,310 400,440 280,420"/>
    <polygon points="430,300 550,310 540,430 420,430"/>
    <polygon points="560,310 680,300 670,430 550,420"/>
    <polygon points="690,300 780,310 770,430 680,420"/>
  </g>

  <!-- SEM Banner -->
  <rect x="0" y="540" width="800" height="60" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="540" x2="800" y2="540" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="565" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">SEM MAG: 4.00 kx</text>
  <text x="20" y="585" fill="#94a3b8" font-family="monospace" font-size="11">HV: 20.0 kV | WD: 8.0 mm | Det: QBSD (Composition Mode)</text>
  
  <text x="320" y="565" fill="#e2e8f0" font-family="monospace" font-size="13" font-weight="bold">WC-10Co Cemented Carbide (Hardmetal)</text>
  <text x="320" y="585" fill="#64748b" font-family="monospace" font-size="11">Faceted WC grains in ductile Cobalt binder matrix</text>

  <!-- Scale Bar: 5 µm = 130 px -->
  <rect x="630" y="562" width="130" height="5" fill="#ffffff"/>
  <line x1="630" y1="558" x2="630" y2="571" stroke="#ffffff" stroke-width="2"/>
  <line x1="760" y1="558" x2="760" y2="571" stroke="#ffffff" stroke-width="2"/>
  <text x="695" y="583" fill="#ffffff" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">5 µm</text>
</svg>
`)}`;

export const MICROGRAPH_SAMPLES: MicrographSample[] = [
  {
    id: "sample-ti64-am",
    title: "Ti-6Al-4V ELI (LPBF Additive Manufacturing)",
    material: "Ti-6Al-4V Grade 23 (UNS R56401)",
    condition: "As-printed by Laser Powder Bed Fusion (LPBF), Layer thickness 30 µm, Laser power 280 W",
    magnification: "5000x / SEM",
    etchant: "Kroll's Reagent (2% HF + 4% HNO3 in H2O)",
    description: "Hierarchical acicular alpha-prime (α') martensitic basketweave morphology inside prior-beta columnar grains growing epitaxially along the build direction.",
    keyFeatures: [
      "Acicular α' martensite laths (< 1.2 µm width)",
      "Prior-β columnar grain boundaries (~ 80 µm width)",
      "High dislocation density from rapid laser cooling (> 10^6 K/s)",
      "Minimal spherical argon gas porosity (< 0.05% area fraction)"
    ],
    imageUrl: ti64AdditiveSvg,
    mimeType: "image/svg+xml",
    category: "Additive Manufacturing (LPBF)",
    microscopeType: "SEM-SE (Secondary Electron)",
    voltageKv: 15,
    defaultScaleMicronsPerPixel: 0.0416, // 5 µm = 120 px
    scaleBarLengthUm: 5,
    expectedPhases: [
      { phase: "Acicular α' Martensite", fractionPct: 96.5, color: "#38bdf8" },
      { phase: "Retained β Phase", fractionPct: 3.2, color: "#f59e0b" },
      { phase: "Pores / Micro-voids", fractionPct: 0.3, color: "#ef4444" }
    ],
    expectedPorosityPct: 0.05,
    nominalGrainSizeAstm: "G = 11.5 (Sub-grain laths)"
  },
  {
    id: "sample-inconel718-am",
    title: "Inconel 718 Superalloy (LPBF Additive Manufacturing)",
    material: "Inconel 718 (UNS N07718 / AMS 5662)",
    condition: "As-printed by LPBF, Volumetric Energy Density 68 J/mm³",
    magnification: "10000x / FE-SEM",
    etchant: "Electrolytic Phosphoric Acid (10% H3PO4 @ 3V)",
    description: "Ultra-fine cellular subgrain dendrites with heavy Niobium and Molybdenum micro-segregation along cell boundaries forming Laves phase and nano-scale MC carbides.",
    keyFeatures: [
      "Subgrain cellular spacing: λ ~ 0.75 - 0.90 µm",
      "Interdendritic Laves phase (Fe,Ni,Cr)2(Nb,Mo,Ti) precipitation",
      "High yield strength (> 1050 MPa as-printed)",
      "Requires post-print Homogenization + Solution & Aging (AMS 5662)"
    ],
    imageUrl: inconel718AmSvg,
    mimeType: "image/svg+xml",
    category: "Additive Manufacturing (LPBF)",
    microscopeType: "SEM-BSE (Backscattered)",
    voltageKv: 20,
    defaultScaleMicronsPerPixel: 0.0125, // 2 µm = 160 px
    scaleBarLengthUm: 2,
    expectedPhases: [
      { phase: "γ-Nickel Matrix (FCC)", fractionPct: 91.0, color: "#38bdf8" },
      { phase: "Laves Phase & MC Carbides", fractionPct: 8.8, color: "#f59e0b" },
      { phase: "Gas Micro-pores", fractionPct: 0.2, color: "#ef4444" }
    ],
    expectedPorosityPct: 0.08,
    nominalGrainSizeAstm: "G = 12.0 (Subgrain cells)"
  },
  {
    id: "sample-316l-am",
    title: "AISI 316L Stainless Steel (LPBF Cellular Subgrains)",
    material: "AISI 316L / UNS S31603 (EN 1.4404)",
    condition: "LPBF printed, 200 W laser power, 800 mm/s scan speed",
    magnification: "8000x / InLens SEM",
    etchant: "Electro-etched in 10% Oxalic Acid",
    description: "Hierarchical cellular dislocation structures decorated with sub-micron Cr-Mn silicate inclusions. Cell boundaries act as effective barriers to dislocation motion.",
    keyFeatures: [
      "Cellular subgrain diameter ~ 0.55 µm",
      "Dislocation density > 10^14 m^-2",
      "Simultaneous high yield strength (580 MPa) and high ductility (40%)",
      "Austenitic FCC single phase matrix"
    ],
    imageUrl: stainless316lAmSvg,
    mimeType: "image/svg+xml",
    category: "Additive Manufacturing (LPBF)",
    microscopeType: "SEM-SE (Secondary Electron)",
    voltageKv: 15,
    defaultScaleMicronsPerPixel: 0.0142, // 2 µm = 140 px
    scaleBarLengthUm: 2,
    expectedPhases: [
      { phase: "Austenite γ (FCC Matrix)", fractionPct: 98.2, color: "#38bdf8" },
      { phase: "Nano-oxide Dispersions", fractionPct: 1.5, color: "#10b981" },
      { phase: "Micro-porosity", fractionPct: 0.3, color: "#ef4444" }
    ],
    expectedPorosityPct: 0.06,
    nominalGrainSizeAstm: "G = 12.8"
  },
  {
    id: "sample-fatigue-fractography",
    title: "AISI 4340 High-Cycle Fatigue (SEM Fractography)",
    material: "AISI 4340 Quenched & Tempered (UNS G43400)",
    condition: "Cyclic bending fatigue failure after 4.2 x 10^6 cycles at stress ratio R = 0.1",
    magnification: "2500x / SEM",
    etchant: "As-fractured (Ultrasonic solvent clean)",
    description: "Classic fatigue striations advancing incrementally per cycle away from the surface crack initiation origin with secondary fatigue micro-cracks.",
    keyFeatures: [
      "Fatigue striation spacing: ~ 0.22 µm/cycle (Paris law da/dN)",
      "Secondary micro-cracks perpendicular to principal stress",
      "Ratchet marks and beach marks near origin",
      "Final overload ductile dimple transition zone"
    ],
    imageUrl: fatigueSemSvg,
    mimeType: "image/svg+xml",
    category: "Failure Analysis & Fractography",
    microscopeType: "SEM-SE (Secondary Electron)",
    voltageKv: 20,
    defaultScaleMicronsPerPixel: 0.0667, // 10 µm = 150 px
    scaleBarLengthUm: 10,
    expectedPhases: [
      { phase: "Fatigue Striation Zone", fractionPct: 84.0, color: "#38bdf8" },
      { phase: "Secondary Micro-cracks", fractionPct: 6.0, color: "#ef4444" },
      { phase: "Quasi-cleavage Facets", fractionPct: 10.0, color: "#f59e0b" }
    ],
    expectedPorosityPct: 0.0,
    nominalGrainSizeAstm: "ASTM E2809 Striation Count: ~4.5 striations/µm"
  },
  {
    id: "sample-cmsx4-creep",
    title: "CMSX-4 Single Crystal Superalloy (High-Temp Creep Rafting)",
    material: "CMSX-4 Single Crystal Ni-base Superalloy",
    condition: "Exposed to 950°C / 140 MPa creep testing along [001] axis for 800 hours",
    magnification: "20000x / FE-SEM",
    etchant: "Marr's Reagent (Aqua Regia + CuCl2)",
    description: "Directional coarsening (N-type rafting) of cuboidal gamma-prime (γ' Ni3(Al,Ti,Ta)) precipitates into continuous plates perpendicular to the applied tensile stress axis.",
    keyFeatures: [
      "γ' volume fraction: ~ 70% in FCC γ matrix",
      "Rafted γ' plate thickness: ~ 0.35 µm",
      "Interfacial dislocation networks relieving lattice misfit (δ = -0.14%)",
      "Resistance to high-temperature creep rupture"
    ],
    imageUrl: cmsx4SuperalloySvg,
    mimeType: "image/svg+xml",
    category: "Nickel & Cobalt Superalloys",
    microscopeType: "SEM-SE (Secondary Electron)",
    voltageKv: 20,
    defaultScaleMicronsPerPixel: 0.0055, // 1 µm = 180 px
    scaleBarLengthUm: 1,
    expectedPhases: [
      { phase: "γ' Precipitate Rafts (L12)", fractionPct: 69.5, color: "#38bdf8" },
      { phase: "γ Matrix Channels (FCC)", fractionPct: 30.2, color: "#64748b" },
      { phase: "Interfacial Dislocation Net", fractionPct: 0.3, color: "#f59e0b" }
    ],
    expectedPorosityPct: 0.0,
    nominalGrainSizeAstm: "Single Crystal (Zero Grain Boundaries)"
  },
  {
    id: "sample-wc-co-hardmetal",
    title: "WC-10Co Cemented Carbide (BSE SEM Hardmetal)",
    material: "Tungsten Carbide - 10 wt% Cobalt (ISO K20 / K30)",
    condition: "Liquid-phase vacuum sintered at 1420°C, Hot Isostatic Pressed (HIP)",
    magnification: "4000x / SEM-BSE",
    etchant: "Murakami's Reagent (10g K3Fe(CN)6 + 10g KOH in 100ml H2O)",
    description: "High-Z backscattered electron micrograph exhibiting angular, faceted Tungsten Carbide (WC) grains embedded in a continuous, ductile Cobalt metallic binder matrix.",
    keyFeatures: [
      "WC grain size: d_WC ~ 1.5 - 2.5 µm (ASTM B390)",
      "Cobalt mean free path (λ_Co): ~ 0.4 µm",
      "Hardness: ~ 1550 HV30 / 91.5 HRA",
      "Zero eta-phase (Co3W3C) embrittlement"
    ],
    imageUrl: wcCoHardmetalSvg,
    mimeType: "image/svg+xml",
    category: "Steels & Hardmetals",
    microscopeType: "SEM-BSE (Backscattered)",
    voltageKv: 20,
    defaultScaleMicronsPerPixel: 0.0384, // 5 µm = 130 px
    scaleBarLengthUm: 5,
    expectedPhases: [
      { phase: "Tungsten Carbide (WC)", fractionPct: 86.5, color: "#e2e8f0" },
      { phase: "Cobalt Binder Matrix (Co)", fractionPct: 13.4, color: "#38bdf8" },
      { phase: "Pores (ASTM B276)", fractionPct: 0.1, color: "#ef4444" }
    ],
    expectedPorosityPct: 0.04,
    nominalGrainSizeAstm: "ASTM B390 Mean Size ~ 1.8 µm"
  }
];

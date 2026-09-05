// Comprehensive Characteristic X-Ray Lines & Physical Constants for EDS Microanalysis
// Grounded in ASTM E1508 Standard Guide for Quantitative Analysis by Energy-Dispersive Spectroscopy

export interface XRayLine {
  element: string;
  atomicNumber: number;
  symbol: string;
  name: string;
  density: number; // g/cm^3
  atomicMass: number;
  lines: {
    kAlpha?: number; // keV
    kBeta?: number; // keV
    lAlpha?: number; // keV
    lBeta?: number; // keV
    lGamma?: number; // keV
    mAlpha?: number; // keV
  };
  defaultColor: string;
}

export const CHARACTERISTIC_XRAY_LINES: Record<string, XRayLine> = {
  C: {
    element: "Carbon",
    atomicNumber: 6,
    symbol: "C",
    name: "Carbon",
    density: 2.26,
    atomicMass: 12.011,
    lines: { kAlpha: 0.277 },
    defaultColor: "#f97316", // orange
  },
  N: {
    element: "Nitrogen",
    atomicNumber: 7,
    symbol: "N",
    name: "Nitrogen",
    density: 1.02,
    atomicMass: 14.007,
    lines: { kAlpha: 0.392 },
    defaultColor: "#06b6d4",
  },
  O: {
    element: "Oxygen",
    atomicNumber: 8,
    symbol: "O",
    name: "Oxygen",
    density: 1.429,
    atomicMass: 15.999,
    lines: { kAlpha: 0.525 },
    defaultColor: "#ef4444", // red
  },
  Al: {
    element: "Aluminum",
    atomicNumber: 13,
    symbol: "Al",
    name: "Aluminum",
    density: 2.70,
    atomicMass: 26.982,
    lines: { kAlpha: 1.486, kBeta: 1.557 },
    defaultColor: "#ec4899", // pink
  },
  Si: {
    element: "Silicon",
    atomicNumber: 14,
    symbol: "Si",
    name: "Silicon",
    density: 2.33,
    atomicMass: 28.085,
    lines: { kAlpha: 1.739, kBeta: 1.836 },
    defaultColor: "#eab308", // yellow
  },
  Ti: {
    element: "Titanium",
    atomicNumber: 22,
    symbol: "Ti",
    name: "Titanium",
    density: 4.506,
    atomicMass: 47.867,
    lines: { kAlpha: 4.510, kBeta: 4.931, lAlpha: 0.452 },
    defaultColor: "#f59e0b", // amber
  },
  V: {
    element: "Vanadium",
    atomicNumber: 23,
    symbol: "V",
    name: "Vanadium",
    density: 6.11,
    atomicMass: 50.941,
    lines: { kAlpha: 4.952, kBeta: 5.427, lAlpha: 0.511 },
    defaultColor: "#14b8a6", // teal
  },
  Cr: {
    element: "Chromium",
    atomicNumber: 24,
    symbol: "Cr",
    name: "Chromium",
    density: 7.19,
    atomicMass: 51.996,
    lines: { kAlpha: 5.414, kBeta: 5.946, lAlpha: 0.573 },
    defaultColor: "#10b981", // emerald
  },
  Mn: {
    element: "Manganese",
    atomicNumber: 25,
    symbol: "Mn",
    name: "Manganese",
    density: 7.43,
    atomicMass: 54.938,
    lines: { kAlpha: 5.898, kBeta: 6.490, lAlpha: 0.637 },
    defaultColor: "#8b5cf6", // purple
  },
  Fe: {
    element: "Iron",
    atomicNumber: 26,
    symbol: "Fe",
    name: "Iron",
    density: 7.874,
    atomicMass: 55.845,
    lines: { kAlpha: 6.403, kBeta: 7.057, lAlpha: 0.705 },
    defaultColor: "#3b82f6", // blue
  },
  Co: {
    element: "Cobalt",
    atomicNumber: 27,
    symbol: "Co",
    name: "Cobalt",
    density: 8.90,
    atomicMass: 58.933,
    lines: { kAlpha: 6.924, kBeta: 7.648, lAlpha: 0.776 },
    defaultColor: "#6366f1", // indigo
  },
  Ni: {
    element: "Nickel",
    atomicNumber: 28,
    symbol: "Ni",
    name: "Nickel",
    density: 8.908,
    atomicMass: 58.693,
    lines: { kAlpha: 7.471, kBeta: 8.264, lAlpha: 0.851 },
    defaultColor: "#06b6d4", // cyan
  },
  Cu: {
    element: "Copper",
    atomicNumber: 29,
    symbol: "Cu",
    name: "Copper",
    density: 8.96,
    atomicMass: 63.546,
    lines: { kAlpha: 8.040, kBeta: 8.904, lAlpha: 0.930 },
    defaultColor: "#fb923c",
  },
  Zr: {
    element: "Zirconium",
    atomicNumber: 40,
    symbol: "Zr",
    name: "Zirconium",
    density: 6.52,
    atomicMass: 91.224,
    lines: { kAlpha: 15.774, lAlpha: 2.042, lBeta: 2.124 },
    defaultColor: "#a855f7",
  },
  Nb: {
    element: "Niobium",
    atomicNumber: 41,
    symbol: "Nb",
    name: "Niobium",
    density: 8.57,
    atomicMass: 92.906,
    lines: { kAlpha: 16.614, lAlpha: 2.166, lBeta: 2.257, lGamma: 2.464 },
    defaultColor: "#8b5cf6", // violet
  },
  Mo: {
    element: "Molybdenum",
    atomicNumber: 42,
    symbol: "Mo",
    name: "Molybdenum",
    density: 10.28,
    atomicMass: 95.95,
    lines: { kAlpha: 17.478, lAlpha: 2.293, lBeta: 2.395 },
    defaultColor: "#0284c7",
  },
  W: {
    element: "Tungsten",
    atomicNumber: 74,
    symbol: "W",
    name: "Tungsten",
    density: 19.25,
    atomicMass: 183.84,
    lines: { lAlpha: 8.396, lBeta: 9.671, mAlpha: 1.774 },
    defaultColor: "#64748b",
  },
};

export interface EDSSpotAnalysis {
  id: string;
  name: string;
  xPct: number; // 0 to 100% position on micrograph
  yPct: number;
  color: string;
  featureDescription: string;
  predictedPhase: string;
  stoichiometryFormula: string;
  crystalStructure: string;
  elements: {
    symbol: string;
    line: string;
    kRatio: number;
    zafFactor: number;
    weightPct: number;
    weightPctError: number;
    atomicPct: number;
  }[];
  totalWeightPct: number;
  notes: string;
}

export interface EDSLineScanPoint {
  distanceUm: number;
  xPct: number;
  yPct: number;
  concentrations: Record<string, number>; // symbol -> wt%
}

export interface EDSSampleDataset {
  id: string;
  sampleName: string;
  materialClass: string;
  sampleCondition: string;
  acceleratingVoltageKv: number;
  beamCurrentNa: number;
  takeOffAngleDeg: number;
  liveTimeSec: number;
  deadTimePct: number;
  energyResolutionEv: number; // Mn K-alpha FWHM at 5.89 keV (typically 128-132 eV)
  semImageUrl: string;
  availableElements: string[];
  spots: EDSSpotAnalysis[];
  lineScan: {
    start: { xPct: number; yPct: number; label: string };
    end: { xPct: number; yPct: number; label: string };
    totalLengthUm: number;
    profile: EDSLineScanPoint[];
  };
  elementalMapUrls?: Record<string, string>;
  astmE1508Compliance: {
    standardCalibration: string;
    detectorType: "Silicon Drift Detector (SDD)" | "Si(Li)";
    deadTimeStatus: "Optimal (< 25%)" | "High";
    totalSpectrumCounts: number;
  };
}

export const EDS_SAMPLE_DATASETS: EDSSampleDataset[] = [
  {
    id: "in718-superalloy-lpbf",
    sampleName: "Inconel 718 Superalloy (LPBF As-Printed / Heat Treated)",
    materialClass: "Nickel-Iron-Chromium Superalloy (AMS 5662 / ASTM B637)",
    sampleCondition: "LPBF Printed + Direct Aged (720°C 8h + 620°C 8h)",
    acceleratingVoltageKv: 15.0,
    beamCurrentNa: 2.5,
    takeOffAngleDeg: 35.0,
    liveTimeSec: 60,
    deadTimePct: 14.8,
    energyResolutionEv: 128.5,
    semImageUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <radialGradient id="in718bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e2430"/>
      <stop offset="100%" stop-color="#0d1117"/>
    </radialGradient>
    <filter id="speckle">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0"/>
      <feComposite in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
    </filter>
  </defs>
  <rect width="800" height="600" fill="url(#in718bg)"/>
  
  <!-- Austenitic Gamma Matrix with Subgrain Boundaries -->
  <path d="M 0,220 Q 220,190 380,240 T 800,210" stroke="#334155" stroke-width="2.5" fill="none" opacity="0.7"/>
  <path d="M 280,0 Q 310,200 290,420 T 310,600" stroke="#334155" stroke-width="2.5" fill="none" opacity="0.7"/>
  <path d="M 580,0 Q 560,250 600,480 T 570,600" stroke="#334155" stroke-width="2.5" fill="none" opacity="0.7"/>

  <!-- Cellular LPBF Subgrain Solidification Network (Hexagonal / Dendritic cells) -->
  <g stroke="#475569" stroke-width="1.2" opacity="0.45" fill="none">
    <circle cx="140" cy="120" r="35"/>
    <circle cx="190" cy="110" r="32"/>
    <circle cx="160" cy="160" r="36"/>
    <circle cx="215" cy="155" r="34"/>
    <circle cx="110" cy="155" r="30"/>
    <circle cx="420" cy="130" r="40"/>
    <circle cx="470" cy="120" r="38"/>
    <circle cx="450" cy="180" r="42"/>
    <circle cx="500" cy="170" r="35"/>
    <circle cx="180" cy="380" r="45"/>
    <circle cx="240" cy="360" r="40"/>
    <circle cx="210" cy="430" r="48"/>
    <circle cx="440" cy="380" r="42"/>
    <circle cx="490" cy="360" r="38"/>
    <circle cx="460" cy="430" r="45"/>
    <circle cx="680" cy="140" r="38"/>
    <circle cx="720" cy="190" r="42"/>
    <circle cx="670" cy="390" r="45"/>
  </g>

  <!-- Laves Phase Intermetallic Eutectic Island (Bright irregular Z-contrast) -->
  <path d="M 430,225 Q 460,210 485,230 Q 495,255 470,265 Q 445,260 430,245 Z" fill="#e2e8f0" stroke="#38bdf8" stroke-width="1.5" filter="drop-shadow(0 0 6px rgba(56,189,248,0.5))"/>
  
  <!-- Fine Gamma Prime / Double Prime (γ'/γ'') coherent nanodispersoids -->
  <g fill="#cbd5e1" opacity="0.85">
    <circle cx="130" cy="115" r="3"/>
    <circle cx="155" cy="130" r="2.5"/>
    <circle cx="185" cy="105" r="3.2"/>
    <circle cx="145" cy="160" r="2.8"/>
    <circle cx="210" cy="140" r="3"/>
    <circle cx="410" cy="115" r="3.2"/>
    <circle cx="445" cy="135" r="3.5"/>
    <circle cx="485" cy="110" r="2.8"/>
    <circle cx="665" cy="135" r="3"/>
    <circle cx="710" cy="175" r="3.2"/>
    <circle cx="190" cy="370" r="3.5"/>
    <circle cx="235" cy="350" r="2.8"/>
    <circle cx="450" cy="370" r="3.5"/>
    <circle cx="480" cy="350" r="3"/>
  </g>

  <!-- Primary MC Carbide (Titanium / Niobium Carbonitride Cube - Sharp faceted) -->
  <polygon points="620,310 645,315 640,340 615,335" fill="#f59e0b" stroke="#fbbf24" stroke-width="2" filter="drop-shadow(0 0 6px rgba(245,158,11,0.6))"/>

  <!-- Gas micro-pore -->
  <circle cx="230" cy="270" r="9" fill="#020408" stroke="#1e293b" stroke-width="2"/>

  <!-- SEM Data Bar -->
  <rect x="0" y="545" width="800" height="55" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="545" x2="800" y2="545" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="568" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold">SEM-BSE | HV: 15.0 kV | Spot: 4.0 | WD: 10.0 mm</text>
  <text x="20" y="588" fill="#94a3b8" font-family="monospace" font-size="11">Inconel 718 LPBF + Aged | EDS Calibrated</text>
  <rect x="640" y="568" width="120" height="4" fill="#ffffff"/>
  <text x="670" y="588" fill="#e2e8f0" font-family="monospace" font-size="11">5.0 µm</text>
</svg>
`),
    availableElements: ["Ni", "Cr", "Fe", "Nb", "Mo", "Ti", "Al", "C"],
    spots: [
      {
        id: "spot-matrix-gamma",
        name: "Spot 1: γ-Matrix Solid Solution",
        xPct: 22,
        yPct: 22,
        color: "#06b6d4",
        featureDescription: "Austenitic FCC Gamma matrix grain interior with high Ni-Fe-Cr solid solution balance.",
        predictedPhase: "γ (FCC Austenite Matrix)",
        stoichiometryFormula: "(Ni,Fe,Cr) Solid Solution",
        crystalStructure: "FCC (a = 0.359 nm)",
        elements: [
          { symbol: "Ni", line: "Kα (7.47 keV)", kRatio: 0.518, zafFactor: 1.018, weightPct: 53.4, weightPctError: 0.8, atomicPct: 52.8 },
          { symbol: "Cr", line: "Kα (5.41 keV)", kRatio: 0.191, zafFactor: 1.012, weightPct: 19.3, weightPctError: 0.4, atomicPct: 21.5 },
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.178, zafFactor: 1.025, weightPct: 18.2, weightPctError: 0.4, atomicPct: 18.9 },
          { symbol: "Nb", line: "Lα (2.17 keV)", kRatio: 0.038, zafFactor: 0.985, weightPct: 3.7, weightPctError: 0.2, atomicPct: 2.3 },
          { symbol: "Mo", line: "Lα (2.29 keV)", kRatio: 0.031, zafFactor: 0.990, weightPct: 3.1, weightPctError: 0.2, atomicPct: 1.9 },
          { symbol: "Ti", line: "Kα (4.51 keV)", kRatio: 0.010, zafFactor: 0.960, weightPct: 0.95, weightPctError: 0.1, atomicPct: 1.2 },
          { symbol: "Al", line: "Kα (1.49 keV)", kRatio: 0.005, zafFactor: 1.080, weightPct: 0.54, weightPctError: 0.08, atomicPct: 1.2 },
          { symbol: "C", line: "Kα (0.28 keV)", kRatio: 0.0003, zafFactor: 1.250, weightPct: 0.04, weightPctError: 0.02, atomicPct: 0.2 },
        ],
        totalWeightPct: 99.23,
        notes: "Matches standard AMS 5662 chemistry for IN718 matrix; Nb & Ti partitioned into secondary phases during aging.",
      },
      {
        id: "spot-laves-eutectic",
        name: "Spot 2: Interdendritic Laves Phase",
        xPct: 57,
        yPct: 40,
        color: "#38bdf8",
        featureDescription: "Segregated high Z-contrast interdendritic eutectic island enriched in Nb and Mo.",
        predictedPhase: "Laves Phase (C14 Hexagonal Intermetallic)",
        stoichiometryFormula: "(Ni,Fe,Cr)2(Nb,Mo,Ti)",
        crystalStructure: "Hexagonal C14 (MgZn2 prototype)",
        elements: [
          { symbol: "Ni", line: "Kα (7.47 keV)", kRatio: 0.420, zafFactor: 1.025, weightPct: 43.1, weightPctError: 0.9, atomicPct: 44.5 },
          { symbol: "Nb", line: "Lα (2.17 keV)", kRatio: 0.225, zafFactor: 0.980, weightPct: 22.1, weightPctError: 0.5, atomicPct: 14.4 },
          { symbol: "Cr", line: "Kα (5.41 keV)", kRatio: 0.115, zafFactor: 1.010, weightPct: 11.6, weightPctError: 0.3, atomicPct: 13.5 },
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.108, zafFactor: 1.020, weightPct: 11.0, weightPctError: 0.3, atomicPct: 11.9 },
          { symbol: "Mo", line: "Lα (2.29 keV)", kRatio: 0.088, zafFactor: 0.995, weightPct: 8.8, weightPctError: 0.3, atomicPct: 5.6 },
          { symbol: "Ti", line: "Kα (4.51 keV)", kRatio: 0.024, zafFactor: 0.965, weightPct: 2.3, weightPctError: 0.15, atomicPct: 2.9 },
          { symbol: "Al", line: "Kα (1.49 keV)", kRatio: 0.002, zafFactor: 1.090, weightPct: 0.22, weightPctError: 0.05, atomicPct: 0.5 },
          { symbol: "C", line: "Kα (0.28 keV)", kRatio: 0.0002, zafFactor: 1.250, weightPct: 0.03, weightPctError: 0.02, atomicPct: 0.15 },
        ],
        totalWeightPct: 99.15,
        notes: "Severely enriched in Niobium (22.1 wt% vs 5.1 wt% nominal). Requires 1160°C homogenization to dissolve into γ matrix.",
      },
      {
        id: "spot-mc-carbide",
        name: "Spot 3: Primary MC Carbonitride Inclusion",
        xPct: 79,
        yPct: 54,
        color: "#f59e0b",
        featureDescription: "Sub-micron square faceted blocky carbonitride precipitate at grain boundary intersection.",
        predictedPhase: "Primary MC Carbide (Ti,Nb)C",
        stoichiometryFormula: "(Nb0.75Ti0.25)C0.95",
        crystalStructure: "FCC Rocksalt (NaCl prototype)",
        elements: [
          { symbol: "Nb", line: "Lα (2.17 keV)", kRatio: 0.590, zafFactor: 0.985, weightPct: 58.1, weightPctError: 1.1, atomicPct: 37.8 },
          { symbol: "Ti", line: "Kα (4.51 keV)", kRatio: 0.198, zafFactor: 0.960, weightPct: 19.0, weightPctError: 0.4, atomicPct: 24.0 },
          { symbol: "C", line: "Kα (0.28 keV)", kRatio: 0.082, zafFactor: 1.340, weightPct: 11.0, weightPctError: 0.6, atomicPct: 55.4 },
          { symbol: "Mo", line: "Lα (2.29 keV)", kRatio: 0.038, zafFactor: 0.990, weightPct: 3.8, weightPctError: 0.2, atomicPct: 2.4 },
          { symbol: "Ni", line: "Kα (7.47 keV)", kRatio: 0.032, zafFactor: 1.030, weightPct: 3.3, weightPctError: 0.2, atomicPct: 3.4 },
          { symbol: "Cr", line: "Kα (5.41 keV)", kRatio: 0.021, zafFactor: 1.015, weightPct: 2.1, weightPctError: 0.15, atomicPct: 2.4 },
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.016, zafFactor: 1.025, weightPct: 1.6, weightPctError: 0.12, atomicPct: 1.7 },
        ],
        totalWeightPct: 98.90,
        notes: "High thermodynamic stability (Tm > 3100°C). Acts as grain boundary pinner during elevated temperature service.",
      },
    ],
    lineScan: {
      start: { xPct: 25, yPct: 40, label: "Point A: Dendrite Core (Matrix)" },
      end: { xPct: 65, yPct: 40, label: "Point B: Interdendritic Laves Eutectic" },
      totalLengthUm: 15.0,
      profile: [
        { distanceUm: 0.0, xPct: 25, yPct: 40, concentrations: { Ni: 53.8, Cr: 19.4, Fe: 18.4, Nb: 3.4, Mo: 3.0, Ti: 0.9, Al: 0.5 } },
        { distanceUm: 1.5, xPct: 29, yPct: 40, concentrations: { Ni: 53.2, Cr: 19.1, Fe: 18.1, Nb: 3.8, Mo: 3.2, Ti: 1.0, Al: 0.5 } },
        { distanceUm: 3.0, xPct: 33, yPct: 40, concentrations: { Ni: 52.6, Cr: 18.8, Fe: 17.6, Nb: 4.5, Mo: 3.6, Ti: 1.1, Al: 0.5 } },
        { distanceUm: 4.5, xPct: 37, yPct: 40, concentrations: { Ni: 51.5, Cr: 18.2, Fe: 17.0, Nb: 5.8, Mo: 4.1, Ti: 1.3, Al: 0.5 } },
        { distanceUm: 6.0, xPct: 41, yPct: 40, concentrations: { Ni: 49.8, Cr: 17.2, Fe: 16.0, Nb: 8.2, Mo: 4.8, Ti: 1.6, Al: 0.4 } },
        { distanceUm: 7.5, xPct: 45, yPct: 40, concentrations: { Ni: 47.2, Cr: 15.6, Fe: 14.5, Nb: 12.4, Mo: 5.9, Ti: 1.9, Al: 0.4 } },
        { distanceUm: 9.0, xPct: 49, yPct: 40, concentrations: { Ni: 44.5, Cr: 13.2, Fe: 12.3, Nb: 18.2, Mo: 7.4, Ti: 2.1, Al: 0.3 } },
        { distanceUm: 10.5, xPct: 53, yPct: 40, concentrations: { Ni: 43.1, Cr: 11.6, Fe: 11.0, Nb: 22.1, Mo: 8.8, Ti: 2.3, Al: 0.2 } }, // Laves peak
        { distanceUm: 12.0, xPct: 57, yPct: 40, concentrations: { Ni: 43.8, Cr: 12.4, Fe: 11.8, Nb: 20.4, Mo: 8.1, Ti: 2.2, Al: 0.2 } },
        { distanceUm: 13.5, xPct: 61, yPct: 40, concentrations: { Ni: 48.6, Cr: 16.5, Fe: 15.2, Nb: 10.5, Mo: 5.3, Ti: 1.7, Al: 0.4 } },
        { distanceUm: 15.0, xPct: 65, yPct: 40, concentrations: { Ni: 53.0, Cr: 19.0, Fe: 18.0, Nb: 4.1, Mo: 3.3, Ti: 1.0, Al: 0.5 } },
      ],
    },
    astmE1508Compliance: {
      standardCalibration: "Pass (Certified Pure Element Calibration Standards Co, Ni, Cr, Fe, Nb)",
      detectorType: "Silicon Drift Detector (SDD)",
      deadTimeStatus: "Optimal (< 25%)",
      totalSpectrumCounts: 245000,
    },
  },
  {
    id: "ti64-aerospace-forged",
    sampleName: "Ti-6Al-4V Grade 5 (Forged Bimodal α+β Microstructure)",
    materialClass: "Titanium Alpha-Beta Aerospace Alloy (AMS 4928 / ASTM B348)",
    sampleCondition: "Alpha-Beta Forged + Annealed at 730°C for 2h (Air Cool)",
    acceleratingVoltageKv: 15.0,
    beamCurrentNa: 2.0,
    takeOffAngleDeg: 35.0,
    liveTimeSec: 60,
    deadTimePct: 11.2,
    energyResolutionEv: 127.8,
    semImageUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <radialGradient id="ti64bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#242b35"/>
      <stop offset="100%" stop-color="#0f141c"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#ti64bg)"/>

  <!-- Primary Equiaxed Alpha (αp) Globular Grains (Darker BSE contrast, Al-enriched HCP) -->
  <g fill="#334155" stroke="#475569" stroke-width="2">
    <ellipse cx="220" cy="180" rx="65" ry="50" transform="rotate(-15 220 180)"/>
    <ellipse cx="420" cy="150" rx="75" ry="58" transform="rotate(20 420 150)"/>
    <ellipse cx="620" cy="210" rx="70" ry="52" transform="rotate(-10 620 210)"/>
    <ellipse cx="180" cy="380" rx="70" ry="55" transform="rotate(25 180 380)"/>
    <ellipse cx="380" cy="390" rx="65" ry="48" transform="rotate(-20 380 390)"/>
    <ellipse cx="590" cy="400" rx="75" ry="55" transform="rotate(15 590 400)"/>
  </g>

  <!-- Transformed Beta Matrix (βtrans) with Lamellar α+β Colonies (Brighter BSE contrast, V-enriched BCC) -->
  <g stroke="#94a3b8" stroke-width="1.8" opacity="0.75">
    <line x1="280" y1="120" x2="350" y2="220"/>
    <line x1="295" y1="110" x2="365" y2="210"/>
    <line x1="310" y1="100" x2="380" y2="200"/>
    <line x1="480" y1="180" x2="560" y2="280"/>
    <line x1="495" y1="170" x2="575" y2="270"/>
    <line x1="510" y1="160" x2="590" y2="260"/>
    <line x1="240" y1="330" x2="320" y2="430"/>
    <line x1="255" y1="320" x2="335" y2="420"/>
    <line x1="440" y1="330" x2="520" y2="430"/>
    <line x1="455" y1="320" x2="535" y2="420"/>
  </g>

  <!-- Intergranular Beta (β) Phase Ribs (Bright BSE Contrast) -->
  <path d="M 285,180 Q 320,240 340,320" stroke="#f59e0b" stroke-width="3" fill="none"/>
  <path d="M 485,150 Q 520,240 540,320" stroke="#f59e0b" stroke-width="3" fill="none"/>

  <!-- SEM Data Bar -->
  <rect x="0" y="545" width="800" height="55" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="545" x2="800" y2="545" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="568" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold">SEM-BSE | HV: 15.0 kV | Spot: 3.5 | WD: 9.0 mm</text>
  <text x="20" y="588" fill="#94a3b8" font-family="monospace" font-size="11">Ti-6Al-4V Bimodal α+β | Quantitative EDS Calibrated</text>
  <rect x="640" y="568" width="120" height="4" fill="#ffffff"/>
  <text x="670" y="588" fill="#e2e8f0" font-family="monospace" font-size="11">10.0 µm</text>
</svg>
`),
    availableElements: ["Ti", "Al", "V", "Fe", "O"],
    spots: [
      {
        id: "spot-alpha-globular",
        name: "Spot 1: Primary Alpha (αp) Grain",
        xPct: 28,
        yPct: 30,
        color: "#ec4899",
        featureDescription: "Equiaxed primary alpha grain. Highly enriched in Aluminum (α-stabilizer) and depleted in Vanadium.",
        predictedPhase: "α-Ti (HCP Hexagonal Close-Packed)",
        stoichiometryFormula: "Ti-7.2Al-1.8V (Solid Solution)",
        crystalStructure: "HCP (a = 0.295 nm, c = 0.468 nm, c/a = 1.587)",
        elements: [
          { symbol: "Ti", line: "Kα (4.51 keV)", kRatio: 0.902, zafFactor: 1.008, weightPct: 90.9, weightPctError: 0.8, atomicPct: 86.8 },
          { symbol: "Al", line: "Kα (1.49 keV)", kRatio: 0.068, zafFactor: 1.055, weightPct: 7.18, weightPctError: 0.25, atomicPct: 12.2 },
          { symbol: "V", line: "Kα (4.95 keV)", kRatio: 0.017, zafFactor: 0.995, weightPct: 1.69, weightPctError: 0.12, atomicPct: 1.5 },
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.001, zafFactor: 1.020, weightPct: 0.11, weightPctError: 0.04, atomicPct: 0.09 },
          { symbol: "O", line: "Kα (0.53 keV)", kRatio: 0.001, zafFactor: 1.200, weightPct: 0.12, weightPctError: 0.05, atomicPct: 0.34 },
        ],
        totalWeightPct: 100.0,
        notes: "Al partitioning coefficient k_alpha = 1.15. High Al provides dislocation slip resistance and solid solution strength.",
      },
      {
        id: "spot-beta-intergranular",
        name: "Spot 2: Retained Beta (β) Phase Rib",
        xPct: 42,
        yPct: 48,
        color: "#f59e0b",
        featureDescription: "Intergranular Beta phase strip displaying bright BSE contrast due to heavy Vanadium partitioning.",
        predictedPhase: "β-Ti (BCC Body-Centered Cubic)",
        stoichiometryFormula: "Ti-3.5Al-12.8V (Solid Solution)",
        crystalStructure: "BCC (a = 0.332 nm)",
        elements: [
          { symbol: "Ti", line: "Kα (4.51 keV)", kRatio: 0.825, zafFactor: 1.010, weightPct: 83.3, weightPctError: 0.8, atomicPct: 80.5 },
          { symbol: "V", line: "Kα (4.95 keV)", kRatio: 0.128, zafFactor: 0.998, weightPct: 12.8, weightPctError: 0.4, atomicPct: 11.6 },
          { symbol: "Al", line: "Kα (1.49 keV)", kRatio: 0.033, zafFactor: 1.060, weightPct: 3.50, weightPctError: 0.15, atomicPct: 6.0 },
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.004, zafFactor: 1.025, weightPct: 0.41, weightPctError: 0.06, atomicPct: 0.34 },
        ],
        totalWeightPct: 100.01,
        notes: "V partitioning coefficient k_beta = 3.2. Enriched BCC beta phase enhances fracture toughness and high strain-rate ductility.",
      },
    ],
    lineScan: {
      start: { xPct: 20, yPct: 30, label: "Point A: Primary α Grain Interior" },
      end: { xPct: 45, yPct: 48, label: "Point B: Retained β Phase Grain Boundary" },
      totalLengthUm: 12.0,
      profile: [
        { distanceUm: 0.0, xPct: 20, yPct: 30, concentrations: { Ti: 91.0, Al: 7.2, V: 1.7, Fe: 0.1 } },
        { distanceUm: 2.0, xPct: 24, yPct: 33, concentrations: { Ti: 90.8, Al: 7.1, V: 1.8, Fe: 0.1 } },
        { distanceUm: 4.0, xPct: 28, yPct: 37, concentrations: { Ti: 90.5, Al: 7.0, V: 2.1, Fe: 0.1 } },
        { distanceUm: 6.0, xPct: 32, yPct: 40, concentrations: { Ti: 89.2, Al: 6.4, V: 3.8, Fe: 0.2 } },
        { distanceUm: 8.0, xPct: 36, yPct: 43, concentrations: { Ti: 87.0, Al: 5.2, V: 6.9, Fe: 0.25 } },
        { distanceUm: 10.0, xPct: 40, yPct: 46, concentrations: { Ti: 84.5, Al: 4.1, V: 10.5, Fe: 0.35 } },
        { distanceUm: 12.0, xPct: 45, yPct: 48, concentrations: { Ti: 83.3, Al: 3.5, V: 12.8, Fe: 0.41 } },
      ],
    },
    astmE1508Compliance: {
      standardCalibration: "Pass (NIST SRM 648 / ASTM E1508 Calibrated for Ti-6Al-4V)",
      detectorType: "Silicon Drift Detector (SDD)",
      deadTimeStatus: "Optimal (< 25%)",
      totalSpectrumCounts: 310000,
    },
  },
  {
    id: "ss316l-lpbf-nanosilicates",
    sampleName: "316L Stainless Steel (LPBF Cellular Solidification)",
    materialClass: "Austenitic Stainless Steel (UNS S31603 / ASTM A276)",
    sampleCondition: "LPBF As-Printed Cellular Substructure (High dislocation density)",
    acceleratingVoltageKv: 15.0,
    beamCurrentNa: 2.2,
    takeOffAngleDeg: 35.0,
    liveTimeSec: 60,
    deadTimePct: 12.5,
    energyResolutionEv: 128.0,
    semImageUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <radialGradient id="ss316bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1b232c"/>
      <stop offset="100%" stop-color="#0a0e13"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#ss316bg)"/>

  <!-- LPBF Hexagonal / Cellular Solidification Boundaries (Segregation of Cr & Mo) -->
  <g stroke="#38bdf8" stroke-width="2" fill="none" opacity="0.65">
    <polygon points="200,100 260,135 260,205 200,240 140,205 140,135"/>
    <polygon points="320,100 380,135 380,205 320,240 260,205 260,135"/>
    <polygon points="440,100 500,135 500,205 440,240 380,205 380,135"/>
    <polygon points="260,205 320,240 320,310 260,345 200,310 200,240"/>
    <polygon points="380,205 440,240 440,310 380,345 320,310 320,240"/>
    <polygon points="500,205 560,240 560,310 500,345 440,310 440,240"/>
    <polygon points="320,310 380,345 380,415 320,450 260,415 260,345"/>
    <polygon points="440,310 500,345 500,415 440,450 380,415 380,345"/>
  </g>

  <!-- Nano-oxide / Silicate inclusions (Mn-Si-O nanoinclusions along cell walls) -->
  <circle cx="260" cy="205" r="4.5" fill="#f43f5e" stroke="#fda4af" stroke-width="1.5"/>
  <circle cx="380" cy="205" r="4.2" fill="#f43f5e" stroke="#fda4af" stroke-width="1.5"/>
  <circle cx="320" cy="310" r="5.0" fill="#f43f5e" stroke="#fda4af" stroke-width="1.5"/>
  <circle cx="440" cy="310" r="4.6" fill="#f43f5e" stroke="#fda4af" stroke-width="1.5"/>

  <!-- SEM Data Bar -->
  <rect x="0" y="545" width="800" height="55" fill="#050810" opacity="0.95"/>
  <line x1="0" y1="545" x2="800" y2="545" stroke="#1e293b" stroke-width="1.5"/>
  <text x="20" y="568" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold">SEM-STEM | HV: 15.0 kV | Spot: 3.0 | WD: 8.0 mm</text>
  <text x="20" y="588" fill="#94a3b8" font-family="monospace" font-size="11">316L SS LPBF Cellular Subgrains | EDS Microanalysis</text>
  <rect x="640" y="568" width="120" height="4" fill="#ffffff"/>
  <text x="670" y="588" fill="#e2e8f0" font-family="monospace" font-size="11">1.0 µm</text>
</svg>
`),
    availableElements: ["Fe", "Cr", "Ni", "Mo", "Mn", "Si", "O", "C"],
    spots: [
      {
        id: "spot-316-matrix",
        name: "Spot 1: Austenite (γ) Cell Interior",
        xPct: 25,
        yPct: 28,
        color: "#3b82f6",
        featureDescription: "Cellular interior of austenitic FCC grain. Depleted in segregating solute elements.",
        predictedPhase: "γ (FCC Austenite Matrix)",
        stoichiometryFormula: "Fe-17.2Cr-12.1Ni-2.1Mo",
        crystalStructure: "FCC (a = 0.360 nm)",
        elements: [
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.655, zafFactor: 1.015, weightPct: 66.5, weightPctError: 0.7, atomicPct: 66.8 },
          { symbol: "Cr", line: "Kα (5.41 keV)", kRatio: 0.170, zafFactor: 1.010, weightPct: 17.2, weightPctError: 0.4, atomicPct: 18.5 },
          { symbol: "Ni", line: "Kα (7.47 keV)", kRatio: 0.118, zafFactor: 1.025, weightPct: 12.1, weightPctError: 0.3, atomicPct: 11.6 },
          { symbol: "Mo", line: "Lα (2.29 keV)", kRatio: 0.021, zafFactor: 0.990, weightPct: 2.10, weightPctError: 0.15, atomicPct: 1.2 },
          { symbol: "Mn", line: "Kα (5.90 keV)", kRatio: 0.013, zafFactor: 1.018, weightPct: 1.32, weightPctError: 0.1, atomicPct: 1.3 },
          { symbol: "Si", line: "Kα (1.74 keV)", kRatio: 0.006, zafFactor: 1.070, weightPct: 0.64, weightPctError: 0.06, atomicPct: 1.3 },
        ],
        totalWeightPct: 99.86,
        notes: "Cell core solidifies first during rapid LPBF thermal quenching, creating solute partitioning into cell boundaries.",
      },
      {
        id: "spot-316-cell-wall",
        name: "Spot 2: Cell Boundary (Cr/Mo Segregation)",
        xPct: 32,
        yPct: 34,
        color: "#10b981",
        featureDescription: "Cellular solidification boundary enriched in Chromium and Molybdenum, suppressing dislocation movement.",
        predictedPhase: "Enriched γ-Subgrain Boundary",
        stoichiometryFormula: "Fe-19.8Cr-11.2Ni-3.8Mo",
        crystalStructure: "FCC (Dislocation Wall)",
        elements: [
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.612, zafFactor: 1.015, weightPct: 62.1, weightPctError: 0.7, atomicPct: 62.6 },
          { symbol: "Cr", line: "Kα (5.41 keV)", kRatio: 0.196, zafFactor: 1.010, weightPct: 19.8, weightPctError: 0.4, atomicPct: 21.4 },
          { symbol: "Ni", line: "Kα (7.47 keV)", kRatio: 0.109, zafFactor: 1.025, weightPct: 11.2, weightPctError: 0.3, atomicPct: 10.7 },
          { symbol: "Mo", line: "Lα (2.29 keV)", kRatio: 0.038, zafFactor: 0.990, weightPct: 3.80, weightPctError: 0.2, atomicPct: 2.2 },
          { symbol: "Mn", line: "Kα (5.90 keV)", kRatio: 0.019, zafFactor: 1.018, weightPct: 1.93, weightPctError: 0.12, atomicPct: 2.0 },
          { symbol: "Si", line: "Kα (1.74 keV)", kRatio: 0.009, zafFactor: 1.070, weightPct: 0.96, weightPctError: 0.08, atomicPct: 1.9 },
        ],
        totalWeightPct: 99.79,
        notes: "Cell boundary solute segregation accounts for the anomalous high yield strength (580 MPa) of LPBF 316L without loss of ductility.",
      },
      {
        id: "spot-316-nanosilicate",
        name: "Spot 3: Mn-Si-O Nano-inclusion",
        xPct: 40,
        yPct: 34,
        color: "#f43f5e",
        featureDescription: "Spherical core-shell Mn-Si-O nano-silicate (20-80 nm) formed in-situ from residual powder oxygen during laser melting.",
        predictedPhase: "Rhodonite / Spessartine Silicate",
        stoichiometryFormula: "(Mn,Fe)SiO3",
        crystalStructure: "Triclinic / Cubic",
        elements: [
          { symbol: "O", line: "Kα (0.53 keV)", kRatio: 0.280, zafFactor: 1.250, weightPct: 35.0, weightPctError: 1.2, atomicPct: 56.5 },
          { symbol: "Si", line: "Kα (1.74 keV)", kRatio: 0.210, zafFactor: 1.070, weightPct: 22.5, weightPctError: 0.6, atomicPct: 20.7 },
          { symbol: "Mn", line: "Kα (5.90 keV)", kRatio: 0.230, zafFactor: 1.020, weightPct: 23.5, weightPctError: 0.5, atomicPct: 11.0 },
          { symbol: "Fe", line: "Kα (6.40 keV)", kRatio: 0.110, zafFactor: 1.015, weightPct: 11.2, weightPctError: 0.3, atomicPct: 5.2 },
          { symbol: "Cr", line: "Kα (5.41 keV)", kRatio: 0.076, zafFactor: 1.010, weightPct: 7.7, weightPctError: 0.25, atomicPct: 3.8 },
        ],
        totalWeightPct: 99.9,
        notes: "Nano-oxides pin subgrain boundaries during thermal relaxation, preventing coarsening up to 600°C.",
      },
    ],
    lineScan: {
      start: { xPct: 25, yPct: 28, label: "Point A: Cell Core" },
      end: { xPct: 40, yPct: 34, label: "Point B: Nano-oxide on Cell Wall" },
      totalLengthUm: 1.5,
      profile: [
        { distanceUm: 0.0, xPct: 25, yPct: 28, concentrations: { Fe: 66.5, Cr: 17.2, Ni: 12.1, Mo: 2.1, Mn: 1.3, Si: 0.6, O: 0.1 } },
        { distanceUm: 0.3, xPct: 28, yPct: 29, concentrations: { Fe: 65.8, Cr: 17.6, Ni: 12.0, Mo: 2.3, Mn: 1.4, Si: 0.7, O: 0.1 } },
        { distanceUm: 0.6, xPct: 31, yPct: 31, concentrations: { Fe: 64.2, Cr: 18.5, Ni: 11.6, Mo: 2.9, Mn: 1.6, Si: 0.8, O: 0.2 } },
        { distanceUm: 0.9, xPct: 34, yPct: 32, concentrations: { Fe: 62.1, Cr: 19.8, Ni: 11.2, Mo: 3.8, Mn: 1.9, Si: 1.0, O: 0.3 } },
        { distanceUm: 1.2, xPct: 37, yPct: 33, concentrations: { Fe: 45.0, Cr: 15.0, Ni: 7.0, Mo: 2.5, Mn: 9.5, Si: 8.5, O: 12.5 } },
        { distanceUm: 1.5, xPct: 40, yPct: 34, concentrations: { Fe: 11.2, Cr: 7.7, Ni: 0.8, Mo: 0.4, Mn: 23.5, Si: 22.5, O: 35.0 } },
      ],
    },
    astmE1508Compliance: {
      standardCalibration: "Pass (Certified Stainless Steel NIST Standard SRM 1155a)",
      detectorType: "Silicon Drift Detector (SDD)",
      deadTimeStatus: "Optimal (< 25%)",
      totalSpectrumCounts: 280000,
    },
  },
];

// Helper to calculate theoretical simulated spectrum points (keV vs Counts) for Recharts
export interface SpectrumPoint {
  energyKeV: number;
  counts: number;
  background: number;
  netCounts: number;
}

export function generateTheoreticalEDSSpectrum(
  spot: EDSSpotAnalysis,
  totalLiveTimeSec: number = 60,
  beamEnergyKv: number = 15.0,
  fwhmEv: number = 128.5
): SpectrumPoint[] {
  const points: SpectrumPoint[] = [];
  const sigmaKeV = (fwhmEv / 1000) / 2.355; // Gaussian sigma from FWHM

  // Energy range: 0.1 keV to beamEnergyKv (e.g. 15.0 keV) with 0.02 keV (20 eV) per channel
  const step = 0.02;
  const numChannels = Math.round(beamEnergyKv / step);

  for (let i = 5; i <= numChannels; i++) {
    const e = i * step;

    // Kramers / Bremsstrahlung continuum background model: I_bg ~ I_0 * (E_0 - E) / E * A_absorb
    let bg = 0;
    if (e < beamEnergyKv && e > 0.2) {
      const kramers = 350 * ((beamEnergyKv - e) / e) * (1 - Math.exp(-e / 0.8));
      bg = Math.max(0, kramers);
    }

    // Characteristic Gaussian Peaks for each element present in spot
    let peakSignal = 0;
    spot.elements.forEach((elem) => {
      const xrayData = CHARACTERISTIC_XRAY_LINES[elem.symbol];
      if (!xrayData) return;

      const wtFrac = elem.weightPct / 100;

      // K-alpha peak
      if (xrayData.lines.kAlpha && xrayData.lines.kAlpha < beamEnergyKv) {
        const peakE = xrayData.lines.kAlpha;
        const overvoltage = beamEnergyKv / peakE;
        if (overvoltage > 1.05) {
          // Fluorescence yield scaling
          const yieldFactor = Math.pow(xrayData.atomicNumber, 4) / (Math.pow(xrayData.atomicNumber, 4) + 1000000);
          const intensity = 8500 * wtFrac * (totalLiveTimeSec / 60) * Math.pow(overvoltage - 1, 1.4) * (yieldFactor + 0.1);
          const gaussian = (intensity / (sigmaKeV * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(e - peakE, 2) / (2 * Math.pow(sigmaKeV, 2)));
          peakSignal += gaussian;
        }
      }

      // K-beta peak (typically ~10-15% of K-alpha)
      if (xrayData.lines.kBeta && xrayData.lines.kBeta < beamEnergyKv) {
        const peakE = xrayData.lines.kBeta;
        const overvoltage = beamEnergyKv / peakE;
        if (overvoltage > 1.05) {
          const intensity = 1100 * wtFrac * (totalLiveTimeSec / 60) * Math.pow(overvoltage - 1, 1.4);
          const gaussian = (intensity / (sigmaKeV * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(e - peakE, 2) / (2 * Math.pow(sigmaKeV, 2)));
          peakSignal += gaussian;
        }
      }

      // L-alpha peak (for heavier elements like Nb, Mo, W)
      if (xrayData.lines.lAlpha && xrayData.lines.lAlpha < beamEnergyKv) {
        const peakE = xrayData.lines.lAlpha;
        const overvoltage = beamEnergyKv / peakE;
        if (overvoltage > 1.05) {
          const intensity = 5500 * wtFrac * (totalLiveTimeSec / 60) * Math.pow(overvoltage - 1, 1.3);
          const gaussian = (intensity / (sigmaKeV * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(e - peakE, 2) / (2 * Math.pow(sigmaKeV, 2)));
          peakSignal += gaussian;
        }
      }
    });

    const netCounts = Math.round(peakSignal);
    // Add small Poisson noise for realistic detector physics
    const totalWithNoise = Math.max(0, Math.round(bg + peakSignal + (Math.random() - 0.5) * Math.sqrt(bg + peakSignal + 1)));

    points.push({
      energyKeV: Number(e.toFixed(3)),
      counts: totalWithNoise,
      background: Math.round(bg),
      netCounts: netCounts,
    });
  }

  return points;
}

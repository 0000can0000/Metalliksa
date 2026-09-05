/**
 * XRD Raw Data Parser & Processing Utility
 * Supports Bruker / Panalytical / Rigaku raw XY, CSV, TSV, and dat text files.
 * Includes automated background subtraction and peak picking.
 */

export interface ParsedXRDPoint {
  twoTheta: number;
  intensity: number;
  background?: number;
}

export interface DetectedPeak {
  twoTheta: number;
  intensity: number;
  fwhm: number;
  d_spacing_A: number;
  matchedPhase?: string;
  hkl?: string;
  refTwoTheta?: number;
  refFwhm?: number;
  deltaTwoTheta?: number;
  latticeStrain_pct?: number;
  correctedFwhm?: number;
  stress_MPa?: number;
}

export interface XRDStandardRef {
  id: string;
  name: string;
  type: "NIST_SRM" | "ANNEALED_BASE" | "CUSTOM";
  category: "Line Position & Profile" | "Quantitative & Intensity" | "Annealed Metallurgy" | "Ceramic & Functional";
  crystalSystem: "Cubic" | "Hexagonal" | "Tetragonal" | "Rhombohedral" | "Orthorhombic";
  formula: string;
  nistSrmCode?: string;
  description: string;
  recommendedApplication: string;
  lattice_a_A: number;
  lattice_b_A?: number;
  lattice_c_A?: number;
  spaceGroup: string;
  standardPeaks: { twoTheta_CuKa: number; hkl: string; relativeIntensity: number; d_spacing_A: number }[];
  caglioti_UVW: { U: number; V: number; W: number }; // Instrumental broadening function: FWHM^2 = U*tan^2(theta) + V*tan(theta) + W
  typicalZeroShift_deg?: number;
  rirValue?: number;
}

export const STANDARD_REFERENCES: XRDStandardRef[] = [
  {
    id: "nist-lab6-660c",
    name: "NIST SRM 660c (Lanthanum Hexaboride, LaB6)",
    type: "NIST_SRM",
    category: "Line Position & Profile",
    crystalSystem: "Cubic",
    formula: "LaB6",
    nistSrmCode: "SRM 660c",
    description: "Gold Standard Line Position and Line Shape Standard certified for instrumental profile deconvolution & zero-offset calibration.",
    recommendedApplication: "Instrumental slit broadening calibration (FWHM_inst), Soller slit alignment, zero 2θ goniometer offset correction.",
    lattice_a_A: 4.15689,
    spaceGroup: "Pm-3m (221)",
    typicalZeroShift_deg: 0.000,
    rirValue: 1.00,
    caglioti_UVW: { U: 0.0035, V: -0.0018, W: 0.0042 },
    standardPeaks: [
      { twoTheta_CuKa: 21.36, hkl: "(100)", relativeIntensity: 42, d_spacing_A: 4.1569 },
      { twoTheta_CuKa: 30.38, hkl: "(110)", relativeIntensity: 100, d_spacing_A: 2.9394 },
      { twoTheta_CuKa: 37.44, hkl: "(111)", relativeIntensity: 56, d_spacing_A: 2.3999 },
      { twoTheta_CuKa: 43.51, hkl: "(200)", relativeIntensity: 28, d_spacing_A: 2.0784 },
      { twoTheta_CuKa: 48.96, hkl: "(210)", relativeIntensity: 62, d_spacing_A: 1.8590 },
      { twoTheta_CuKa: 53.99, hkl: "(211)", relativeIntensity: 48, d_spacing_A: 1.6970 },
      { twoTheta_CuKa: 63.22, hkl: "(220)", relativeIntensity: 35, d_spacing_A: 1.4697 },
      { twoTheta_CuKa: 72.03, hkl: "(310)", relativeIntensity: 30, d_spacing_A: 1.3145 },
      { twoTheta_CuKa: 80.60, hkl: "(311)", relativeIntensity: 26, d_spacing_A: 1.2533 },
      { twoTheta_CuKa: 89.06, hkl: "(222)", relativeIntensity: 18, d_spacing_A: 1.1999 },
    ],
  },
  {
    id: "nist-si-640f",
    name: "NIST SRM 640f (High-Purity Silicon Powder)",
    type: "NIST_SRM",
    category: "Line Position & Profile",
    crystalSystem: "Cubic",
    formula: "Si",
    nistSrmCode: "SRM 640f",
    description: "Certified crystallographic standard for d-spacing line position calibration (certified a = 5.43119 Å at 22.5°C).",
    recommendedApplication: "Accurate Bragg angle alignment, flat-specimen displacement error correction, high-angle lattice parameter refinement.",
    lattice_a_A: 5.43119,
    spaceGroup: "Fd-3m (227)",
    typicalZeroShift_deg: 0.000,
    rirValue: 4.70,
    caglioti_UVW: { U: 0.0028, V: -0.0012, W: 0.0038 },
    standardPeaks: [
      { twoTheta_CuKa: 28.44, hkl: "(111)", relativeIntensity: 100, d_spacing_A: 3.1355 },
      { twoTheta_CuKa: 47.30, hkl: "(220)", relativeIntensity: 55, d_spacing_A: 1.9200 },
      { twoTheta_CuKa: 56.12, hkl: "(311)", relativeIntensity: 30, d_spacing_A: 1.6375 },
      { twoTheta_CuKa: 69.13, hkl: "(400)", relativeIntensity: 6, d_spacing_A: 1.3578 },
      { twoTheta_CuKa: 76.38, hkl: "(331)", relativeIntensity: 11, d_spacing_A: 1.2459 },
      { twoTheta_CuKa: 88.03, hkl: "(422)", relativeIntensity: 12, d_spacing_A: 1.1086 },
      { twoTheta_CuKa: 94.95, hkl: "(511)", relativeIntensity: 6, d_spacing_A: 1.0452 },
    ],
  },
  {
    id: "nist-al2o3-676a",
    name: "NIST SRM 676a (Alumina Corundum, α-Al2O3)",
    type: "NIST_SRM",
    category: "Quantitative & Intensity",
    crystalSystem: "Rhombohedral",
    formula: "α-Al2O3",
    nistSrmCode: "SRM 676a",
    description: "Certified phase purity and Quantitative X-ray Powder Diffraction (QPA) Standard. Standard reference for Reference Intensity Ratio (RIR = 1.00).",
    recommendedApplication: "Quantitative phase analysis (QPA), Rietveld amorphous content spiking (internal standard), intensity calibration.",
    lattice_a_A: 4.7587,
    lattice_c_A: 12.9929,
    spaceGroup: "R-3c (167)",
    typicalZeroShift_deg: 0.000,
    rirValue: 1.00,
    caglioti_UVW: { U: 0.0032, V: -0.0015, W: 0.0040 },
    standardPeaks: [
      { twoTheta_CuKa: 25.58, hkl: "(012)", relativeIntensity: 60, d_spacing_A: 3.4797 },
      { twoTheta_CuKa: 35.15, hkl: "(104)", relativeIntensity: 95, d_spacing_A: 2.5510 },
      { twoTheta_CuKa: 37.78, hkl: "(110)", relativeIntensity: 40, d_spacing_A: 2.3794 },
      { twoTheta_CuKa: 43.35, hkl: "(113)", relativeIntensity: 100, d_spacing_A: 2.0853 },
      { twoTheta_CuKa: 52.55, hkl: "(024)", relativeIntensity: 45, d_spacing_A: 1.7402 },
      { twoTheta_CuKa: 57.50, hkl: "(116)", relativeIntensity: 80, d_spacing_A: 1.6015 },
      { twoTheta_CuKa: 66.52, hkl: "(214)", relativeIntensity: 35, d_spacing_A: 1.4045 },
      { twoTheta_CuKa: 68.21, hkl: "(300)", relativeIntensity: 45, d_spacing_A: 1.3739 },
    ],
  },
  {
    id: "nist-ceo2-674b",
    name: "NIST SRM 674b (Cerium Dioxide, CeO2 Ceria)",
    type: "NIST_SRM",
    category: "Quantitative & Intensity",
    crystalSystem: "Cubic",
    formula: "CeO2",
    nistSrmCode: "SRM 674b",
    description: "Certified relative intensity and peak profile standard. Cubic fluorite structure with large scattering factor.",
    recommendedApplication: "High-contrast line profile analysis, heavy-element absorption calibration, Rietveld profile shape testing.",
    lattice_a_A: 5.4111,
    spaceGroup: "Fm-3m (225)",
    typicalZeroShift_deg: 0.000,
    rirValue: 3.32,
    caglioti_UVW: { U: 0.0030, V: -0.0014, W: 0.0039 },
    standardPeaks: [
      { twoTheta_CuKa: 28.55, hkl: "(111)", relativeIntensity: 100, d_spacing_A: 3.1241 },
      { twoTheta_CuKa: 33.08, hkl: "(200)", relativeIntensity: 28, d_spacing_A: 2.7055 },
      { twoTheta_CuKa: 47.48, hkl: "(220)", relativeIntensity: 52, d_spacing_A: 1.9131 },
      { twoTheta_CuKa: 56.34, hkl: "(311)", relativeIntensity: 42, d_spacing_A: 1.6315 },
      { twoTheta_CuKa: 59.08, hkl: "(222)", relativeIntensity: 10, d_spacing_A: 1.5620 },
      { twoTheta_CuKa: 69.41, hkl: "(400)", relativeIntensity: 8, d_spacing_A: 1.3528 },
      { twoTheta_CuKa: 76.70, hkl: "(331)", relativeIntensity: 16, d_spacing_A: 1.2414 },
      { twoTheta_CuKa: 79.07, hkl: "(420)", relativeIntensity: 14, d_spacing_A: 1.2099 },
    ],
  },
  {
    id: "nist-zno-674b",
    name: "NIST SRM 674b (Zinc Oxide Wurtzite, ZnO)",
    type: "NIST_SRM",
    category: "Quantitative & Intensity",
    crystalSystem: "Hexagonal",
    formula: "ZnO",
    nistSrmCode: "SRM 674b",
    description: "Certified hexagonal relative intensity standard for non-cubic unit cell parameter refinement.",
    recommendedApplication: "Hexagonal cell parameter refinement, (100)/(002)/(101) triplet resolution check, anisotropic line broadening.",
    lattice_a_A: 3.2498,
    lattice_c_A: 5.2065,
    spaceGroup: "P6_3mc (186)",
    typicalZeroShift_deg: 0.000,
    rirValue: 5.30,
    caglioti_UVW: { U: 0.0036, V: -0.0017, W: 0.0044 },
    standardPeaks: [
      { twoTheta_CuKa: 31.77, hkl: "(100)", relativeIntensity: 57, d_spacing_A: 2.8143 },
      { twoTheta_CuKa: 34.42, hkl: "(002)", relativeIntensity: 44, d_spacing_A: 2.6033 },
      { twoTheta_CuKa: 36.25, hkl: "(101)", relativeIntensity: 100, d_spacing_A: 2.4759 },
      { twoTheta_CuKa: 47.54, hkl: "(102)", relativeIntensity: 23, d_spacing_A: 1.9110 },
      { twoTheta_CuKa: 56.60, hkl: "(110)", relativeIntensity: 32, d_spacing_A: 1.6247 },
      { twoTheta_CuKa: 62.86, hkl: "(103)", relativeIntensity: 29, d_spacing_A: 1.4771 },
      { twoTheta_CuKa: 67.96, hkl: "(112)", relativeIntensity: 23, d_spacing_A: 1.3781 },
      { twoTheta_CuKa: 69.10, hkl: "(201)", relativeIntensity: 11, d_spacing_A: 1.3582 },
    ],
  },
  {
    id: "nist-tio2-674b",
    name: "NIST SRM 674b (Titanium Dioxide Rutile, TiO2)",
    type: "NIST_SRM",
    category: "Quantitative & Intensity",
    crystalSystem: "Tetragonal",
    formula: "TiO2",
    nistSrmCode: "SRM 674b",
    description: "Certified tetragonal standard for high-angle line profile symmetry and tetragonal cell refinement.",
    recommendedApplication: "Tetragonal lattice distortion metrology, line shape asymmetry testing, quantitative oxide mixture analysis.",
    lattice_a_A: 4.5937,
    lattice_c_A: 2.9587,
    spaceGroup: "P4_2/mnm (136)",
    typicalZeroShift_deg: 0.000,
    rirValue: 3.40,
    caglioti_UVW: { U: 0.0034, V: -0.0016, W: 0.0041 },
    standardPeaks: [
      { twoTheta_CuKa: 27.44, hkl: "(110)", relativeIntensity: 100, d_spacing_A: 3.2482 },
      { twoTheta_CuKa: 36.08, hkl: "(101)", relativeIntensity: 50, d_spacing_A: 2.4872 },
      { twoTheta_CuKa: 39.18, hkl: "(200)", relativeIntensity: 8, d_spacing_A: 2.2968 },
      { twoTheta_CuKa: 41.22, hkl: "(111)", relativeIntensity: 25, d_spacing_A: 2.1874 },
      { twoTheta_CuKa: 54.32, hkl: "(211)", relativeIntensity: 60, d_spacing_A: 1.6873 },
      { twoTheta_CuKa: 56.64, hkl: "(220)", relativeIntensity: 20, d_spacing_A: 1.6241 },
      { twoTheta_CuKa: 69.01, hkl: "(301)", relativeIntensity: 22, d_spacing_A: 1.3598 },
    ],
  },
  {
    id: "nist-sintered-1976c",
    name: "NIST SRM 1976c (Sintered Polycrystalline Alumina Disc)",
    type: "NIST_SRM",
    category: "Line Position & Profile",
    crystalSystem: "Rhombohedral",
    formula: "Al2O3 Disc",
    nistSrmCode: "SRM 1976c",
    description: "Certified Solid Disc Standard for diffractometer sensitivity, peak area repeatability, and sample-height alignment.",
    recommendedApplication: "Instrument operational qualification (OQ/PQ), flat-plate height alignment, X-ray tube aging decay monitoring.",
    lattice_a_A: 4.7589,
    lattice_c_A: 12.9935,
    spaceGroup: "R-3c (167)",
    typicalZeroShift_deg: 0.000,
    rirValue: 1.00,
    caglioti_UVW: { U: 0.0031, V: -0.0014, W: 0.0039 },
    standardPeaks: [
      { twoTheta_CuKa: 25.58, hkl: "(012)", relativeIntensity: 62, d_spacing_A: 3.4795 },
      { twoTheta_CuKa: 35.15, hkl: "(104)", relativeIntensity: 96, d_spacing_A: 2.5511 },
      { twoTheta_CuKa: 43.35, hkl: "(113)", relativeIntensity: 100, d_spacing_A: 2.0854 },
      { twoTheta_CuKa: 57.50, hkl: "(116)", relativeIntensity: 82, d_spacing_A: 1.6014 },
    ],
  },
  {
    id: "annealed-in718-base",
    name: "Annealed Inconel 718 Reference Base (FCC γ Matrix)",
    type: "ANNEALED_BASE",
    category: "Annealed Metallurgy",
    crystalSystem: "Cubic",
    formula: "Ni-19Cr-18Fe-5Nb",
    description: "Stress-relieved, fully solution-annealed (1065°C / 2h WQ) baseline nickel superalloy without residual strain.",
    recommendedApplication: "LPBF additive manufacturing residual stress baseline, Williamson-Hall microstrain deconvolution for Ni-base superalloys.",
    lattice_a_A: 3.598,
    spaceGroup: "Fm-3m (225)",
    typicalZeroShift_deg: 0.000,
    caglioti_UVW: { U: 0.0040, V: -0.0020, W: 0.0050 },
    standardPeaks: [
      { twoTheta_CuKa: 43.55, hkl: "(111)", relativeIntensity: 100, d_spacing_A: 2.077 },
      { twoTheta_CuKa: 50.72, hkl: "(200)", relativeIntensity: 45, d_spacing_A: 1.799 },
      { twoTheta_CuKa: 74.58, hkl: "(220)", relativeIntensity: 30, d_spacing_A: 1.272 },
      { twoTheta_CuKa: 90.52, hkl: "(311)", relativeIntensity: 25, d_spacing_A: 1.085 },
      { twoTheta_CuKa: 95.82, hkl: "(222)", relativeIntensity: 15, d_spacing_A: 1.039 },
    ],
  },
  {
    id: "annealed-ti64-base",
    name: "Annealed Ti-6Al-4V Grade 5 (HCP α + BCC β)",
    type: "ANNEALED_BASE",
    category: "Annealed Metallurgy",
    crystalSystem: "Hexagonal",
    formula: "Ti-6Al-4V",
    description: "Equiaxed alpha+beta mill-annealed bar standard (730°C / 2h AC) for cold work & residual stress deconvolution.",
    recommendedApplication: "Titanium alloy DED / LPBF print residual stress extraction, sin²ψ interplanar strain calibration.",
    lattice_a_A: 2.952,
    lattice_c_A: 4.686,
    spaceGroup: "P6_3/mmc (194)",
    typicalZeroShift_deg: 0.000,
    caglioti_UVW: { U: 0.0038, V: -0.0019, W: 0.0048 },
    standardPeaks: [
      { twoTheta_CuKa: 35.15, hkl: "(100)", relativeIntensity: 35, d_spacing_A: 2.551 },
      { twoTheta_CuKa: 38.42, hkl: "(002)", relativeIntensity: 40, d_spacing_A: 2.341 },
      { twoTheta_CuKa: 40.22, hkl: "(101)", relativeIntensity: 100, d_spacing_A: 2.240 },
      { twoTheta_CuKa: 53.05, hkl: "(102)", relativeIntensity: 25, d_spacing_A: 1.725 },
      { twoTheta_CuKa: 70.68, hkl: "(103)", relativeIntensity: 30, d_spacing_A: 1.331 },
    ],
  },
  {
    id: "annealed-ss316l-base",
    name: "Annealed AISI 316L Stainless Steel (FCC Austenite)",
    type: "ANNEALED_BASE",
    category: "Annealed Metallurgy",
    crystalSystem: "Cubic",
    formula: "Fe-17Cr-12Ni-2.5Mo",
    description: "Certified strain-free solution annealed (1080°C / 1h WQ) austenitic stainless steel standard.",
    recommendedApplication: "Austenite/Ferrite phase ratio calibration, deformation-induced martensite quantification, LPBF print residual stress.",
    lattice_a_A: 3.595,
    spaceGroup: "Fm-3m (225)",
    typicalZeroShift_deg: 0.000,
    caglioti_UVW: { U: 0.0039, V: -0.0019, W: 0.0049 },
    standardPeaks: [
      { twoTheta_CuKa: 43.60, hkl: "(111)", relativeIntensity: 100, d_spacing_A: 2.076 },
      { twoTheta_CuKa: 50.80, hkl: "(200)", relativeIntensity: 45, d_spacing_A: 1.798 },
      { twoTheta_CuKa: 74.70, hkl: "(220)", relativeIntensity: 30, d_spacing_A: 1.271 },
      { twoTheta_CuKa: 90.70, hkl: "(311)", relativeIntensity: 24, d_spacing_A: 1.084 },
    ],
  },
  {
    id: "annealed-pure-fe",
    name: "Annealed Pure Iron (α-Fe Ferrite SRM Standard)",
    type: "ANNEALED_BASE",
    category: "Annealed Metallurgy",
    crystalSystem: "Cubic",
    formula: "α-Fe (BCC)",
    description: "High-purity (99.99%) vacuum annealed electrolytic iron standard for ferritic/martensitic steel stress analysis.",
    recommendedApplication: "Ferritic weld residual stress calibration, martensite c/a tetragonality baseline, cold-drawn wire texture analysis.",
    lattice_a_A: 2.8665,
    spaceGroup: "Im-3m (229)",
    typicalZeroShift_deg: 0.000,
    caglioti_UVW: { U: 0.0033, V: -0.0016, W: 0.0041 },
    standardPeaks: [
      { twoTheta_CuKa: 44.67, hkl: "(110)", relativeIntensity: 100, d_spacing_A: 2.0268 },
      { twoTheta_CuKa: 65.02, hkl: "(200)", relativeIntensity: 19, d_spacing_A: 1.4332 },
      { twoTheta_CuKa: 82.33, hkl: "(211)", relativeIntensity: 30, d_spacing_A: 1.1702 },
      { twoTheta_CuKa: 98.94, hkl: "(220)", relativeIntensity: 10, d_spacing_A: 1.0134 },
    ],
  },
  {
    id: "annealed-pure-cu",
    name: "Annealed Pure Copper (OFHC Cu Foil Standard)",
    type: "ANNEALED_BASE",
    category: "Annealed Metallurgy",
    crystalSystem: "Cubic",
    formula: "Cu (FCC)",
    description: "Certified Oxygen-Free High Conductivity (OFHC) pure copper standard annealed in hydrogen atmosphere.",
    recommendedApplication: "Copper additive manufacturing, Electrical contact residual stress, Bragg-Brentano slit divergence check.",
    lattice_a_A: 3.6149,
    spaceGroup: "Fm-3m (225)",
    typicalZeroShift_deg: 0.000,
    caglioti_UVW: { U: 0.0034, V: -0.0017, W: 0.0043 },
    standardPeaks: [
      { twoTheta_CuKa: 43.30, hkl: "(111)", relativeIntensity: 100, d_spacing_A: 2.0871 },
      { twoTheta_CuKa: 50.43, hkl: "(200)", relativeIntensity: 46, d_spacing_A: 1.8075 },
      { twoTheta_CuKa: 74.13, hkl: "(220)", relativeIntensity: 20, d_spacing_A: 1.2780 },
      { twoTheta_CuKa: 89.93, hkl: "(311)", relativeIntensity: 17, d_spacing_A: 1.0900 },
      { twoTheta_CuKa: 95.14, hkl: "(222)", relativeIntensity: 5, d_spacing_A: 1.0435 },
    ],
  },
];

/**
 * Parses Malvern Panalytical .xrdml (XML) diffractometer files.
 * Extracts 2Theta scan coordinates, step counts, intensity series, and X-ray wavelength.
 */
export function parsePanalyticalXRDML(xmlContent: string): { data: ParsedXRDPoint[]; wavelength_A?: number } {
  let wavelength_A = 1.540598; // Default Cu K-alpha

  // Extract wavelength if present
  const wlMatch = xmlContent.match(/<wavelength[^>]*>([\d.]+)<\/wavelength>/i) ||
                  xmlContent.match(/<kAlpha1[^>]*>([\d.]+)<\/kAlpha1>/i);
  if (wlMatch && !isNaN(parseFloat(wlMatch[1]))) {
    wavelength_A = parseFloat(wlMatch[1]);
  }

  // Extract intensities
  const intensitiesMatch = xmlContent.match(/<intensities[^>]*>([\s\S]*?)<\/intensities>/i) ||
                           xmlContent.match(/<counts[^>]*>([\s\S]*?)<\/counts>/i);
  if (!intensitiesMatch) {
    throw new Error("XRDML file missing <intensities> or <counts> block.");
  }

  const rawIntensities = intensitiesMatch[1].trim().split(/[\s,]+/).map((v) => parseFloat(v)).filter((v) => !isNaN(v));
  if (rawIntensities.length === 0) {
    throw new Error("No numeric intensity values found inside XRDML intensities element.");
  }

  // Check for startPosition and endPosition
  const startPosMatch = xmlContent.match(/<startPosition[^>]*>([\d.+-]+)<\/startPosition>/i);
  const endPosMatch = xmlContent.match(/<endPosition[^>]*>([\d.+-]+)<\/endPosition>/i);

  // Check for explicit listPositions
  const listPosMatch = xmlContent.match(/<listPositions[^>]*>([\s\S]*?)<\/listPositions>/i);

  const data: ParsedXRDPoint[] = [];

  if (listPosMatch) {
    const rawThetas = listPosMatch[1].trim().split(/[\s,]+/).map((v) => parseFloat(v)).filter((v) => !isNaN(v));
    const count = Math.min(rawThetas.length, rawIntensities.length);
    for (let i = 0; i < count; i++) {
      data.push({
        twoTheta: +rawThetas[i].toFixed(3),
        intensity: Math.round(rawIntensities[i]),
      });
    }
  } else if (startPosMatch && endPosMatch) {
    const start2Th = parseFloat(startPosMatch[1]);
    const end2Th = parseFloat(endPosMatch[1]);
    const nPoints = rawIntensities.length;
    const step = nPoints > 1 ? (end2Th - start2Th) / (nPoints - 1) : 0.02;

    for (let i = 0; i < nPoints; i++) {
      const theta = start2Th + i * step;
      data.push({
        twoTheta: +theta.toFixed(3),
        intensity: Math.round(rawIntensities[i]),
      });
    }
  } else {
    // Fallback if neither exists: infer 2Theta based on typical scan start at 10 deg, 0.02 step
    for (let i = 0; i < rawIntensities.length; i++) {
      data.push({
        twoTheta: +(10.0 + i * 0.02).toFixed(3),
        intensity: Math.round(rawIntensities[i]),
      });
    }
  }

  return { data, wavelength_A };
}

/**
 * Parses Bruker AXS / Siemens .raw binary files (RAW1-RAW4) or ASCII UXD format.
 */
export function parseBrukerRaw(input: ArrayBuffer | string): { data: ParsedXRDPoint[]; wavelength_A?: number } {
  if (typeof input === "string") {
    // Check if ASCII UXD or Bruker ASCII RAW
    return parseBrukerRawAscii(input);
  }

  const buffer = input;
  if (buffer.byteLength < 80) {
    throw new Error("Bruker RAW file buffer too small.");
  }

  // Check header magic (e.g. 'RAW ', 'RAW1', 'RAW2', 'RAW3', 'RAW4')
  const headerBytes = new Uint8Array(buffer, 0, 8);
  const magic = String.fromCharCode(...headerBytes);
  const isBrukerBinary = magic.startsWith("RAW");

  if (!isBrukerBinary) {
    // If not standard binary magic, try decoding as ASCII UXD
    const text = new TextDecoder("latin1").decode(buffer);
    return parseBrukerRawAscii(text);
  }

  const view = new DataView(buffer);
  let data: ParsedXRDPoint[] = [];
  let wavelength_A = 1.540598;

  // Search for the scan range block (Bruker RAW2/RAW3/RAW4 store range record)
  // Scan ranges usually contain start angle (float64 or float32, typically 5-40 deg),
  // step size (float64 or float32, 0.005-0.1 deg), and step count N (int32, 500-15000)
  let foundRange = false;
  let startAngle = 10.0;
  let stepSize = 0.02;
  let numSteps = 0;
  let intensityOffset = -1;
  let intensityType: "float32" | "int32" | "uint16" = "float32";

  // Scan header offsets for range metadata
  for (let offset = 64; offset < Math.min(buffer.byteLength - 64, 4096); offset += 4) {
    // Check for float64 start and step
    if (offset + 24 <= buffer.byteLength) {
      const f64_start = view.getFloat64(offset, true);
      const f64_step = view.getFloat64(offset + 8, true);
      const steps = view.getUint32(offset + 16, true);

      if (
        f64_start >= 0 &&
        f64_start < 120 &&
        f64_step > 0.001 &&
        f64_step < 0.25 &&
        steps >= 100 &&
        steps < 100000 &&
        offset + 20 + steps * 4 <= buffer.byteLength + 1024
      ) {
        startAngle = f64_start;
        stepSize = f64_step;
        numSteps = steps;
        intensityOffset = offset + 24;
        foundRange = true;
        break;
      }
    }

    // Check for float32 start and step
    if (!foundRange && offset + 16 <= buffer.byteLength) {
      const f32_start = view.getFloat32(offset, true);
      const f32_step = view.getFloat32(offset + 4, true);
      const steps = view.getUint32(offset + 8, true);

      if (
        f32_start >= 0 &&
        f32_start < 120 &&
        f32_step > 0.001 &&
        f32_step < 0.25 &&
        steps >= 100 &&
        steps < 100000
      ) {
        startAngle = f32_start;
        stepSize = f32_step;
        numSteps = steps;
        intensityOffset = offset + 12;
        foundRange = true;
        break;
      }
    }
  }

  if (foundRange && numSteps > 0 && intensityOffset > 0) {
    const bytesRemaining = buffer.byteLength - intensityOffset;
    if (bytesRemaining >= numSteps * 4) {
      intensityType = "float32";
    } else if (bytesRemaining >= numSteps * 2) {
      intensityType = "uint16";
    }

    for (let i = 0; i < numSteps; i++) {
      let intensity = 0;
      if (intensityType === "float32") {
        intensity = view.getFloat32(intensityOffset + i * 4, true);
      } else {
        intensity = view.getUint16(intensityOffset + i * 2, true);
      }
      if (isNaN(intensity) || intensity < 0) intensity = 0;
      data.push({
        twoTheta: +(startAngle + i * stepSize).toFixed(3),
        intensity: Math.round(intensity),
      });
    }
  } else {
    // Fallback: search for continuous block of Float32 counts
    const floatArray = new Float32Array(buffer, Math.min(256, buffer.byteLength - 4));
    let validCount = 0;
    for (let i = 0; i < Math.min(floatArray.length, 5000); i++) {
      if (floatArray[i] >= 0 && floatArray[i] < 1e7 && !isNaN(floatArray[i])) {
        validCount++;
      }
    }
    if (validCount > 100) {
      for (let i = 0; i < floatArray.length; i++) {
        if (floatArray[i] >= 0 && floatArray[i] < 1e7 && !isNaN(floatArray[i])) {
          data.push({
            twoTheta: +(10.0 + i * 0.02).toFixed(3),
            intensity: Math.round(floatArray[i]),
          });
        }
      }
    }
  }

  if (data.length === 0) {
    throw new Error("Unable to parse Bruker RAW binary format.");
  }

  return { data, wavelength_A };
}

function parseBrukerRawAscii(text: string): { data: ParsedXRDPoint[]; wavelength_A?: number } {
  const lines = text.split(/\r?\n/);
  let startAngle = 10.0;
  let stepSize = 0.02;
  let wavelength_A = 1.540598;
  const data: ParsedXRDPoint[] = [];

  let inData = false;
  let pointIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Bruker UXD / ASCII tags
    if (line.includes("_START") || line.includes("START =")) {
      const val = parseFloat(line.split("=")[1]);
      if (!isNaN(val)) startAngle = val;
    } else if (line.includes("_STEPSIZE") || line.includes("STEPSIZE =")) {
      const val = parseFloat(line.split("=")[1]);
      if (!isNaN(val)) stepSize = val;
    } else if (line.includes("_WL1") || line.includes("WAVELENGTH =")) {
      const val = parseFloat(line.split("=")[1]);
      if (!isNaN(val)) wavelength_A = val;
    } else if (line.startsWith("[Scan") || line.startsWith("[Data") || line.startsWith(";Data")) {
      inData = true;
      continue;
    }

    if (inData || /^\d/.test(line)) {
      const tokens = line.split(/[\s,;\t]+/).filter(Boolean);
      if (tokens.length >= 2) {
        const t = parseFloat(tokens[0]);
        const intens = parseFloat(tokens[1]);
        if (!isNaN(t) && !isNaN(intens)) {
          data.push({ twoTheta: +t.toFixed(3), intensity: Math.round(intens) });
        }
      } else if (tokens.length === 1) {
        const intens = parseFloat(tokens[0]);
        if (!isNaN(intens)) {
          data.push({
            twoTheta: +(startAngle + pointIndex * stepSize).toFixed(3),
            intensity: Math.round(intens),
          });
          pointIndex++;
        }
      }
    }
  }

  if (data.length === 0) {
    throw new Error("No data points found in Bruker ASCII/UXD RAW file.");
  }

  return { data, wavelength_A };
}

/**
 * Robust delimited parser for .xy, .csv, and .dat XRD files.
 * Supports arbitrary comments, header rows, comma/semicolon/tab/space delimiters, and European numbers.
 */
export function parseDelimitedXRD(content: string): ParsedXRDPoint[] {
  const lines = content.split(/\r?\n/);
  const data: ParsedXRDPoint[] = [];

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i].trim();
    if (
      !rawLine ||
      rawLine.startsWith("#") ||
      rawLine.startsWith("//") ||
      rawLine.startsWith("*") ||
      rawLine.startsWith(";") ||
      rawLine.startsWith("[") ||
      rawLine.toLowerCase().startsWith("angle") ||
      rawLine.toLowerCase().startsWith("2theta") ||
      rawLine.toLowerCase().startsWith("theta") ||
      rawLine.toLowerCase().startsWith("two_theta")
    ) {
      continue;
    }

    // Replace European comma decimal if tab or semicolon delimited
    if (rawLine.includes("\t") || rawLine.includes(";")) {
      rawLine = rawLine.replace(/(\d),(\d)/g, "$1.$2");
    }

    // Split by comma, tab, space, or semicolon
    const parts = rawLine.split(/[\s,;\t]+/).filter(Boolean);
    if (parts.length >= 2) {
      const theta = parseFloat(parts[0]);
      const intensity = parseFloat(parts[1]);

      if (!isNaN(theta) && !isNaN(intensity) && theta > 0 && theta < 180 && intensity >= 0) {
        data.push({
          twoTheta: +theta.toFixed(3),
          intensity: Math.round(intensity),
        });
      }
    }
  }

  return data;
}

/**
 * Universal XRD parser supporting:
 * - Panalytical XML (.xrdml)
 * - Bruker AXS Binary / ASCII (.raw)
 * - XY 2-column format (.xy)
 * - Delimited spreadsheets (.csv, .tsv, .dat, .txt)
 */
export function parseXRDFileText(
  content: string | ArrayBuffer,
  filename: string
): { data: ParsedXRDPoint[]; minTheta: number; maxTheta: number; wavelength_A?: number } {
  let data: ParsedXRDPoint[] = [];
  let wavelength_A: number | undefined;

  const ext = filename.toLowerCase().split(".").pop();

  if (typeof content !== "string") {
    // ArrayBuffer input (e.g. binary .raw)
    const res = parseBrukerRaw(content);
    data = res.data;
    wavelength_A = res.wavelength_A;
  } else {
    // Text input
    if (ext === "xrdml" || content.includes("<xrdMeasurements") || content.includes("<intensities") || content.includes("<dataPoints")) {
      const res = parsePanalyticalXRDML(content);
      data = res.data;
      wavelength_A = res.wavelength_A;
    } else if (ext === "raw" || content.startsWith("RAW") || content.includes("_START") || content.includes("[Scan 1]")) {
      const res = parseBrukerRaw(content);
      data = res.data;
      wavelength_A = res.wavelength_A;
    } else {
      data = parseDelimitedXRD(content);
    }
  }

  // Sort ascending by twoTheta
  data.sort((a, b) => a.twoTheta - b.twoTheta);

  if (data.length === 0) {
    throw new Error(
      `Failed to parse valid 2θ and Intensity data from "${filename}". Supported formats: .xy, .csv, .xrdml (Panalytical), .raw (Bruker).`
    );
  }

  // Rolling minimum background subtraction approximation
  const windowSize = Math.max(5, Math.floor(data.length / 40));
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(data.length - 1, i + windowSize);
    let minVal = data[i].intensity;
    for (let j = start; j <= end; j++) {
      if (data[j].intensity < minVal) minVal = data[j].intensity;
    }
    data[i].background = Math.round(minVal * 0.95);
  }

  const minTheta = Math.floor(data[0].twoTheta);
  const maxTheta = Math.ceil(data[data.length - 1].twoTheta);

  return { data, minTheta, maxTheta, wavelength_A };
}

/**
 * Basic automated peak picker based on local maxima exceeding threshold
 */
export function findProminentPeaks(
  data: ParsedXRDPoint[],
  wavelength_A: number,
  thresholdFactor: number = 2.5
): DetectedPeak[] {
  if (data.length < 5) return [];

  const maxI = Math.max(...data.map((d) => d.intensity));
  const avgBkg = data.reduce((acc, d) => acc + (d.background || 0), 0) / data.length;
  const threshold = avgBkg + (maxI - avgBkg) * 0.08;

  const peaks: DetectedPeak[] = [];

  for (let i = 2; i < data.length - 2; i++) {
    const cur = data[i].intensity;
    if (
      cur > threshold &&
      cur > data[i - 1].intensity &&
      cur > data[i - 2].intensity &&
      cur >= data[i + 1].intensity &&
      cur > data[i + 2].intensity
    ) {
      // Approximate FWHM
      const halfMax = (cur + (data[i].background || avgBkg)) / 2;
      let leftIdx = i;
      let rightIdx = i;
      while (leftIdx > 0 && data[leftIdx].intensity > halfMax) leftIdx--;
      while (rightIdx < data.length - 1 && data[rightIdx].intensity > halfMax) rightIdx++;
      const fwhm = Math.max(0.12, +(data[rightIdx].twoTheta - data[leftIdx].twoTheta).toFixed(3));

      // Bragg's Law: d = lambda / (2 * sin(theta))
      const theta_rad = (data[i].twoTheta * Math.PI) / 360;
      const d_spacing = +(wavelength_A / (2 * Math.sin(theta_rad))).toFixed(4);

      peaks.push({
        twoTheta: data[i].twoTheta,
        intensity: cur,
        fwhm,
        d_spacing_A: d_spacing,
      });

      // Skip neighborhood
      i += 3;
    }
  }

  return peaks.sort((a, b) => b.intensity - a.intensity).slice(0, 15);
}

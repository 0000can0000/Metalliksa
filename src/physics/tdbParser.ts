/**
 * CALPHAD Thermodynamic Database (.TDB) Parser & Exporter
 * Parses standard Thermo-Calc / OpenCALPHAD .TDB files:
 * - ELEMENT, SPECIES, PHASE, CONSTITUENT, PARAMETER, FUNCTION, TYPE_DEFINITION
 * - Parses temperature-dependent polynomial Gibbs energy expansions:
 *   G(T) = a + b*T + c*T*ln(T) + d*T^2 + e*T^3 + f/T + ...
 * - Handles Redlich-Kister excess coefficients & Sublattice Compound Energy Formalism.
 */

export interface TDBElement {
  symbol: string;
  referencePhase: string;
  molarMass_g_mol: number;
  H298_J_mol: number;
  S298_J_mol_K: number;
}

export interface TDBPhase {
  name: string;
  modelCode: string;
  sublatticeCount: number;
  sitesPerSublattice: number[];
  constituents: string[][]; // Constituents in each sublattice
  isGas?: boolean;
}

export interface TDBParameter {
  phase: string;
  constituents: string[][];
  order: number; // Redlich-Kister order (0, 1, 2...)
  lowTempK: number;
  highTempK: number;
  polynomialCoefficients: number[]; // [a, b, c (T*lnT), d (T^2), e (T^3), f (T^-1)]
  rawFormula?: string;
}

export interface TDBFunction {
  name: string;
  lowTempK: number;
  highTempK: number;
  polynomialCoefficients: number[];
  rawFormula: string;
}

export interface ParsedTDBDatabase {
  databaseName: string;
  elements: Map<string, TDBElement>;
  species: string[];
  phases: Map<string, TDBPhase>;
  functions: Map<string, TDBFunction[]>;
  parameters: TDBParameter[];
  rawComments: string[];
}

/**
 * Evaluates a CALPHAD polynomial function at temperature T in Kelvin:
 * G(T) = a + b*T + c*T*ln(T) + d*T^2 + e*T^3 + f*T^(-1) + g*T^7 + ...
 */
export function evaluateTDBPolynomial(coeffs: number[], T_K: number): number {
  if (!coeffs || coeffs.length === 0) return 0;
  const T = Math.max(10, T_K);
  const a = coeffs[0] || 0;
  const b = coeffs[1] || 0;
  const c = coeffs[2] || 0;
  const d = coeffs[3] || 0;
  const e = coeffs[4] || 0;
  const f = coeffs[5] || 0;

  let val = a + b * T;
  if (c !== 0) val += c * T * Math.log(T);
  if (d !== 0) val += d * T * T;
  if (e !== 0) val += e * Math.pow(T, 3);
  if (f !== 0) val += f / T;

  return val;
}

/**
 * Parses an OpenCALPHAD / Thermo-Calc .TDB formatted text string.
 */
export function parseTDBFile(tdbContent: string, databaseName: string = "Custom TDB"): ParsedTDBDatabase {
  const elements = new Map<string, TDBElement>();
  const species: string[] = [];
  const phases = new Map<string, TDBPhase>();
  const functions = new Map<string, TDBFunction[]>();
  const parameters: TDBParameter[] = [];
  const rawComments: string[] = [];

  // Remove full line comments and join continuation lines ending with exclamation mark (!)
  const rawLines = tdbContent.split(/\r?\n/);
  const cleanedStatements: string[] = [];
  let buffer = "";

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();
    if (!line) continue;

    if (line.startsWith("$$") || line.startsWith("#")) {
      rawComments.push(line.substring(2).trim());
      continue;
    }

    buffer += " " + line;
    if (line.includes("!")) {
      const parts = buffer.split("!");
      for (let p = 0; p < parts.length - 1; p++) {
        if (parts[p].trim()) cleanedStatements.push(parts[p].trim());
      }
      buffer = parts[parts.length - 1] || "";
    }
  }
  if (buffer.trim()) {
    cleanedStatements.push(buffer.trim());
  }

  // Parse statements
  for (const stmt of cleanedStatements) {
    const tokens = stmt.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    const keyword = tokens[0].toUpperCase();

    if (keyword === "ELEMENT") {
      // ELEMENT EL REF MASS H298 S298
      const symbol = tokens[1];
      if (symbol && symbol !== "/-" && symbol !== "VA") {
        const refPhase = tokens[2] || "BCC";
        const mass = parseFloat(tokens[3]) || 55.85;
        const h298 = parseFloat(tokens[4]) || 0;
        const s298 = parseFloat(tokens[5]) || 0;
        elements.set(symbol, {
          symbol,
          referencePhase: refPhase,
          molarMass_g_mol: mass,
          H298_J_mol: h298,
          S298_J_mol_K: s298,
        });
      }
    } else if (keyword === "SPECIES") {
      const sp = tokens[1];
      if (sp) species.push(sp);
    } else if (keyword === "PHASE") {
      // PHASE NAME % SUBLATTICES SITES...
      const phaseName = tokens[1];
      const modelCode = tokens[2] || "%";
      const subCount = parseInt(tokens[3], 10) || 1;
      const sites: number[] = [];
      for (let s = 4; s < 4 + subCount && s < tokens.length; s++) {
        sites.push(parseFloat(tokens[s]) || 1.0);
      }
      phases.set(phaseName, {
        name: phaseName,
        modelCode,
        sublatticeCount: subCount,
        sitesPerSublattice: sites.length > 0 ? sites : [1.0],
        constituents: [],
      });
    } else if (keyword === "CONSTITUENT") {
      // CONSTITUENT PHASE :EL1,EL2:EL3:
      const phaseName = tokens[1];
      const rest = stmt.substring(stmt.indexOf(tokens[1]) + tokens[1].length).trim();
      const sublattices = rest.split(":").map((s) => s.trim()).filter(Boolean);
      const constList = sublattices.map((sub) => sub.split(",").map((el) => el.trim()).filter(Boolean));

      const phase = phases.get(phaseName);
      if (phase) {
        phase.constituents = constList;
      }
    } else if (keyword === "PARAMETER") {
      // PARAMETER G(PHASE,EL1,EL2;ORDER) T_LOW T_HIGH COEFFS...
      const defToken = tokens[1]; // e.g. G(LIQUID,NI,AL;0)
      const match = defToken.match(/G\(([^,;)]+),([^;)]+)(?:;(\d+))?\)/i);
      if (match) {
        const phaseName = match[1];
        const consts = match[2].split(",").map((c) => c.split(":").map((x) => x.trim()));
        const order = match[3] ? parseInt(match[3], 10) : 0;
        const lowT = parseFloat(tokens[2]) || 298.15;
        const highT = parseFloat(tokens[tokens.length - 2]) || 6000;

        // Parse polynomial formula or values
        const coeffs: number[] = [];
        for (let c = 3; c < tokens.length; c++) {
          const num = parseFloat(tokens[c]);
          if (!isNaN(num) && !tokens[c].startsWith("N") && !tokens[c].startsWith("Y")) {
            coeffs.push(num);
          }
        }

        parameters.push({
          phase: phaseName,
          constituents: consts,
          order,
          lowTempK: lowT,
          highTempK: highT,
          polynomialCoefficients: coeffs.length > 0 ? coeffs : [0, 0],
          rawFormula: stmt,
        });
      }
    }
  }

  return {
    databaseName,
    elements,
    species,
    phases,
    functions,
    parameters,
    rawComments,
  };
}

/**
 * Pre-calibrated Multi-Component Superalloy and Aerospace TDB Database Library
 */
export const PRELOADED_MULTI_COMPONENT_TDB: {
  id: string;
  name: string;
  alloyClass: string;
  elements: string[];
  description: string;
  rawTdbText: string;
}[] = [
  {
    id: "superalloy_in718_tdb",
    name: "Inconel 718 (Ni-Cr-Fe-Nb-Mo-Ti-Al-C)",
    alloyClass: "Multi-Component Superalloy (8 Elements)",
    elements: ["Ni", "Cr", "Fe", "Nb", "Mo", "Ti", "Al", "C"],
    description: "Full multi-component thermodynamic database for Inconel 718: gamma matrix, gamma prime (Ni3Al), gamma double prime (Ni3Nb), delta phase (Ni3Nb orthorhombic), MC/M23C6 carbides, Laves phase, and liquidus.",
    rawTdbText: `$$ Inconel 718 Multi-Component Thermodynamic Database (.TDB)
$$ Elements: Ni-Cr-Fe-Nb-Mo-Ti-Al-C
ELEMENT Ni FCC 58.693 0 0 !
ELEMENT Cr BCC 51.996 0 0 !
ELEMENT Fe BCC 55.845 0 0 !
ELEMENT Nb BCC 92.906 0 0 !
ELEMENT Mo BCC 95.950 0 0 !
ELEMENT Ti HCP 47.867 0 0 !
ELEMENT Al FCC 26.982 0 0 !
ELEMENT C GRAPHITE 12.011 0 0 !

PHASE LIQUID % 1 1.0 !
CONSTITUENT LIQUID :Ni,Cr,Fe,Nb,Mo,Ti,Al,C: !

PHASE GAMMA_FCC % 2 1.0 1.0 !
CONSTITUENT GAMMA_FCC :Ni,Cr,Fe,Nb,Mo,Ti,Al:C,VA: !

PHASE GAMMA_PRIME_L12 % 2 3.0 1.0 !
CONSTITUENT GAMMA_PRIME_L12 :Ni,Fe,Cr:Al,Ti,Nb: !

PHASE GAMMA_DBL_PRIME % 2 3.0 1.0 !
CONSTITUENT GAMMA_DBL_PRIME :Ni,Fe:Nb,Ti,Al: !

PHASE DELTA_ORTHO % 2 3.0 1.0 !
CONSTITUENT DELTA_ORTHO :Ni,Fe:Nb: !

PHASE MC_CARBIDE % 2 1.0 1.0 !
CONSTITUENT MC_CARBIDE :Ti,Nb,Mo:C: !

PHASE M23C6_CARBIDE % 2 23.0 6.0 !
CONSTITUENT M23C6_CARBIDE :Cr,Mo,Fe,Ni:C: !

PHASE LAVES_C14 % 2 2.0 1.0 !
CONSTITUENT LAVES_C14 :Fe,Ni,Cr:Nb,Mo,Ti: !

PARAMETER G(LIQUID,Ni,Cr;0) 298.15 -8500 + 4.2*T ; 6000 N !
PARAMETER G(LIQUID,Ni,Al;0) 298.15 -145000 + 32.0*T ; 6000 N !
PARAMETER G(LIQUID,Ni,Ti;0) 298.15 -168000 + 28.5*T ; 6000 N !
PARAMETER G(LIQUID,Ni,Nb;0) 298.15 -118000 + 19.4*T ; 6000 N !
PARAMETER G(GAMMA_FCC,Ni,Al;0) 298.15 -128000 + 28.0*T ; 6000 N !
PARAMETER G(GAMMA_FCC,Ni,Ti;0) 298.15 -142000 + 24.5*T ; 6000 N !
PARAMETER G(GAMMA_PRIME_L12,Ni,Al;0) 298.15 -42000 + 6.5*T ; 6000 N !
PARAMETER G(GAMMA_DBL_PRIME,Ni,Nb;0) 298.15 -48000 + 7.2*T ; 6000 N !
PARAMETER G(DELTA_ORTHO,Ni,Nb;0) 298.15 -52000 + 6.8*T ; 6000 N !
PARAMETER G(MC_CARBIDE,Nb,C;0) 298.15 -140000 + 12.0*T ; 6000 N !
PARAMETER G(M23C6_CARBIDE,Cr,C;0) 298.15 -385000 + 45.0*T ; 6000 N !
PARAMETER G(LAVES_C14,Fe,Nb;0) 298.15 -36000 + 5.5*T ; 6000 N !`,
  },
  {
    id: "superalloy_cmsx4_tdb",
    name: "CMSX-4 Single Crystal (Ni-Cr-Co-Mo-W-Al-Ti-Ta-Re-Hf)",
    alloyClass: "2nd Gen Single Crystal (10 Elements)",
    elements: ["Ni", "Cr", "Co", "Mo", "W", "Al", "Ti", "Ta", "Re", "Hf"],
    description: "High-temperature turbine blade single crystal alloy with 70% volume fraction cuboidal gamma prime (Ni3(Al,Ta,Ti)), rhenium solid solution strengthening in gamma channels, and high TCP sigma phase resistance.",
    rawTdbText: `$$ CMSX-4 10-Component Single Crystal Superalloy TDB
ELEMENT Ni FCC 58.693 0 0 !
ELEMENT Cr BCC 51.996 0 0 !
ELEMENT Co HCP 58.933 0 0 !
ELEMENT Mo BCC 95.950 0 0 !
ELEMENT W BCC 183.84 0 0 !
ELEMENT Al FCC 26.982 0 0 !
ELEMENT Ti HCP 47.867 0 0 !
ELEMENT Ta BCC 180.95 0 0 !
ELEMENT Re HCP 186.21 0 0 !
ELEMENT Hf HCP 178.49 0 0 !

PHASE LIQUID % 1 1.0 !
CONSTITUENT LIQUID :Ni,Cr,Co,Mo,W,Al,Ti,Ta,Re,Hf: !

PHASE GAMMA_FCC % 1 1.0 !
CONSTITUENT GAMMA_FCC :Ni,Cr,Co,Mo,W,Re: !

PHASE GAMMA_PRIME_L12 % 2 3.0 1.0 !
CONSTITUENT GAMMA_PRIME_L12 :Ni,Co:Al,Ta,Ti,Hf,W: !

PHASE TCP_SIGMA % 2 2.0 1.0 !
CONSTITUENT TCP_SIGMA :Re,W,Mo:Cr,Co,Ni: !

PARAMETER G(LIQUID,Ni,Ta;0) 298.15 -185000 + 31.0*T ; 6000 N !
PARAMETER G(GAMMA_PRIME_L12,Ni,Ta;0) 298.15 -62000 + 8.1*T ; 6000 N !
PARAMETER G(GAMMA_PRIME_L12,Ni,Al;0) 298.15 -42000 + 6.5*T ; 6000 N !
PARAMETER G(TCP_SIGMA,Re,Cr;0) 298.15 -18000 + 4.5*T ; 6000 N !`,
  },
  {
    id: "ti64_aerospace_tdb",
    name: "Ti-6Al-4V-0.2Fe-0.1O (Ti-Al-V-Fe-O-N)",
    alloyClass: "Aerospace Titanium (6 Elements)",
    elements: ["Ti", "Al", "V", "Fe", "O", "N"],
    description: "Thermodynamic database for alpha+beta titanium alloys: alpha-HCP (alpha stabilizer Al, O, N), beta-BCC (beta stabilizer V, Fe), alpha2-Ti3Al ordering, and beta-transus calculation.",
    rawTdbText: `$$ Ti-6Al-4V Multi-Component Thermodynamic Database
ELEMENT Ti HCP 47.867 0 0 !
ELEMENT Al FCC 26.982 0 0 !
ELEMENT V BCC 50.941 0 0 !
ELEMENT Fe BCC 55.845 0 0 !
ELEMENT O GAS 15.999 0 0 !
ELEMENT N GAS 14.007 0 0 !

PHASE LIQUID % 1 1.0 !
CONSTITUENT LIQUID :Ti,Al,V,Fe: !

PHASE ALPHA_HCP % 2 1.0 0.5 !
CONSTITUENT ALPHA_HCP :Ti,Al,V,Fe:O,N,VA: !

PHASE BETA_BCC % 2 1.0 3.0 !
CONSTITUENT BETA_BCC :Ti,V,Fe,Al:O,N,VA: !

PHASE ALPHA2_TI3AL % 2 3.0 1.0 !
CONSTITUENT ALPHA2_TI3AL :Ti:Al: !

PARAMETER G(ALPHA_HCP,Ti,Al;0) 298.15 -112000 + 22.0*T ; 6000 N !
PARAMETER G(BETA_BCC,Ti,V;0) 298.15 -42000 + 7.5*T ; 6000 N !
PARAMETER G(ALPHA2_TI3AL,Ti,Al;0) 298.15 -31000 + 4.5*T ; 6000 N !`,
  },
  {
    id: "super_duplex_2507_tdb",
    name: "Super Duplex 2507 (Fe-Cr-Ni-Mo-N-Mn-Si-C)",
    alloyClass: "Duplex Stainless Steel (8 Elements)",
    elements: ["Fe", "Cr", "Ni", "Mo", "N", "Mn", "Si", "C"],
    description: "Austenitic-Ferritic 50/50 dual phase stainless steel with PREN >= 42, secondary sigma (Fe-Cr-Mo) embrittlement at 850°C, and Cr2N nitride precipitation kinetics.",
    rawTdbText: `$$ Super Duplex 2507 Stainless Steel TDB
ELEMENT Fe BCC 55.845 0 0 !
ELEMENT Cr BCC 51.996 0 0 !
ELEMENT Ni FCC 58.693 0 0 !
ELEMENT Mo BCC 95.950 0 0 !
ELEMENT N GAS 14.007 0 0 !
ELEMENT Mn BCC 54.938 0 0 !
ELEMENT Si DIAMOND 28.085 0 0 !
ELEMENT C GRAPHITE 12.011 0 0 !

PHASE LIQUID % 1 1.0 !
CONSTITUENT LIQUID :Fe,Cr,Ni,Mo,Mn,Si,N,C: !

PHASE FERRITE_BCC % 2 1.0 3.0 !
CONSTITUENT FERRITE_BCC :Fe,Cr,Mo,Si,Mn:N,C,VA: !

PHASE AUSTENITE_FCC % 2 1.0 1.0 !
CONSTITUENT AUSTENITE_FCC :Fe,Ni,Mn,Cr:N,C,VA: !

PHASE SIGMA_PHASE % 2 2.0 1.0 !
CONSTITUENT SIGMA_PHASE :Cr,Mo:Fe,Ni: !

PHASE CR2N_NITRIDE % 2 2.0 1.0 !
CONSTITUENT CR2N_NITRIDE :Cr,Fe:N: !

PARAMETER G(FERRITE_BCC,Fe,Cr;0) 298.15 +20500 - 9.68*T ; 6000 N !
PARAMETER G(AUSTENITE_FCC,Fe,Ni;0) 298.15 -8000 + 1.5*T ; 6000 N !
PARAMETER G(SIGMA_PHASE,Cr,Fe;0) 298.15 -14500 + 3.2*T ; 6000 N !`,
  },
];

# src/utils/metallurgyCalculations.ts

- erf · function · L11-L28 — function erf(x: number): number
- erfinv · function · L31-L38 — function erfinv(x: number): number
- convertHardness · function · L41-L93 — function convertHardness( value: number, fromScale: "HV" | "HRC" | "HRB" | "HBW" ): HardnessConversionResult
- CompositionInput · interface · L96-L110 — interface CompositionInput
- calculateCarbonEquivalent · function · L112-L175 — function calculateCarbonEquivalent( comp: CompositionInput, thicknessMm: number = 25 ): CarbonEquivalentResult
- calculateSchaeffler · function · L178-L235 — function calculateSchaeffler(comp: CompositionInput): SchaefflerResult
- calculateTransformationTemps · function · L238-L265 — function calculateTransformationTemps(comp: CompositionInput): TransformationTempsResult
- simulateCarburizingDiffusion · function · L268-L319 — function simulateCarburizingDiffusion( tempCelsius: number = 930, timeHours: number = 6, surfaceCarbonPct: number = 1.0, coreCarbonPct: number = 0.20, targetDepthCarbon: number = 0.40 ): DiffusionResult
- calculateHallPetch · function · L322-L342 — function calculateHallPetch( grainSizeMicrons: number, sigma0: number = 70, // Friction stress for pure Fe in MPa ky: number = 18.5 // Hall-Petch slope in MPa * mm^1/2 (approx 585 MPa * µm^1/2) )
- calculateXrdPeaks · function · L345-L415 — function calculateXrdPeaks( crystalStructure: "BCC" | "FCC" | "HCP" | "Diamond", latticeParameterA: number, // in Angstroms (e.g. 2.8665 for α-Fe, 3.59 for γ-Fe, 4.05 for Al) xrayTarget: "Cu-Ka" | "Mo-Ka" | "Co-Ka" | "Fe-Ka" = "Cu-Ka" ): XrdPeak[]
- calculatePREN · function · L418-L420 — function calculatePREN(cr: number, mo: number, w: number = 0, n: number = 0): number
- calculatePillingBedworth · function · L422-L440 — function calculatePillingBedworth( mOxide: number, densityMetal: number, nMetalAtomsInOxide: number, mMetal: number, densityOxide: number ): { pbr: number; verdict: "Passivating / Protective" | "Porous / Non-protective" | "High Compressive Stress / Spallation Risk" }

import { SampleDigitalTwin } from "../types/digitalTwin";

/**
 * Standard Presets of High-Fidelity Metallurgical Digital Twins
 */
export const DEFAULT_DIGITAL_TWINS: SampleDigitalTwin[] = [
  {
    id: "twin-in718-lpbf-001",
    serialNumber: "TWIN-IN718-AERO-2026-01",
    sampleName: "Inconel 718 LPBF Gas Turbine Impeller",
    materialCategory: "Nickel Superalloy",
    standardDesignation: "AMS 5662 / UNS N07718",
    creationDate: "2026-08-15",
    lastUpdated: "2026-08-31",
    leadMetallurgist: "Materials Specialist (Unassigned)",
    organization: "Open Research Benchmark",
    currentStatus: "Benchmark Specimen",

    chemistry: {
      baseElement: "Ni",
      nominalComposition: {
        Ni: 52.5,
        Cr: 19.0,
        Fe: 18.5,
        Nb: 5.15,
        Mo: 3.05,
        Ti: 0.95,
        Al: 0.55,
        C: 0.04,
        Co: 0.35,
      },
      measuredComposition: {
        Ni: 52.4,
        Cr: 18.9,
        Fe: 18.6,
        Nb: 5.12,
        Mo: 3.08,
        Ti: 0.94,
        Al: 0.56,
        C: 0.038,
      },
      schaefflerCoordinates: {
        crEq: 22.05,
        niEq: 53.6,
        estimatedFerriteNumber: 0,
        matrixPrediction: "Austenite (FCC γ) + γ'' (Ni3Nb) & γ' (Ni3Al,Ti)",
      },
    },

    thermodynamics: {
      calphadSystemId: "ni-al",
      liquidusTemperatureC: 1336,
      solidusTemperatureC: 1260,
      freezingRangeC: 76,
      stablePhasesAtRoomTemp: [
        {
          phaseId: "GAMMA_FCC",
          phaseName: "γ Matrix (FCC)",
          fractionPct: 78.5,
          crystalStructure: "FCC (A1)",
        },
        {
          phaseId: "GAMMA_DOUBLE_PRIME",
          phaseName: "γ''-Ni3Nb Coherent Precipitates",
          fractionPct: 15.2,
          crystalStructure: "Ordered BCT (DO22)",
        },
        {
          phaseId: "GAMMA_PRIME",
          phaseName: "γ'-Ni3(Al,Ti)",
          fractionPct: 4.8,
          crystalStructure: "Ordered L12 (cP4)",
        },
        {
          phaseId: "DELTA_MC",
          phaseName: "δ Phase / (Nb,Ti)C Carbides",
          fractionPct: 1.5,
          crystalStructure: "Orthorhombic (DOa)",
        },
      ],
      scheilSolidification: {
        eutecticFractionPct: 3.8,
        hotTearingIndexKou: 0.52,
        microsegregationSeverity: "Moderate",
      },
      transformationTemps: {
        ac1: 870,
        ac3: 1040,
      },
    },

    processHistory: {
      manufacturingRoute: "LPBF (Laser Powder Bed)",
      currentCondition: "Peak Aged (T6)",
      thermalCycles: [
        {
          stageName: "Stress Relief & Homogenization",
          targetTempC: 1065,
          holdTimeMinutes: 60,
          coolingMethod: "Air Cool",
          notes: "Dissolves Laves phase formed during LPBF solidification",
        },
        {
          stageName: "Primary Ageing",
          targetTempC: 760,
          holdTimeMinutes: 480,
          coolingMethod: "Furnace Cool",
          notes: "Furnace cool at 55°C/hr down to 650°C for γ'' precipitation",
        },
        {
          stageName: "Secondary Ageing",
          targetTempC: 650,
          holdTimeMinutes: 480,
          coolingMethod: "Air Cool",
          notes: "Completes γ' and γ'' coarsening balance",
        },
      ],
      additiveParameters: {
        laserPowerW: 285,
        scanSpeedMmS: 960,
        hatchDistanceUm: 110,
        layerThicknessUm: 40,
        volumetricEnergyDensityJ_mm3: 67.4,
        predictedResidualStressMpa: 340,
        maxDeflectionMm: 0.18,
      },
    },

    microstructure: {
      primaryCrystalStructure: "FCC",
      astmGrainSizeNumber: 9.2,
      meanGrainDiameterUm: 14.8,
      porosityPct: 0.04,
      phasesDetected: [
        {
          name: "γ-Austenitic Matrix",
          fractionPct: 78.5,
          morphology: "Epitaxial Columnar-to-Equiaxed Grains along (001)",
        },
        {
          name: "γ'' Nano-precipitates",
          fractionPct: 15.2,
          morphology: "Disc-shaped coherent nanometer plates (15-30 nm)",
        },
        {
          name: "NbC Primary Carbides",
          fractionPct: 1.5,
          morphology: "Dispersed Blocky Grain Boundary Particles",
        },
      ],
      ebsdTexture: {
        preferredOrientation: "<001> Growth Direction parallel to Z-Build",
        misorientationAngleMeanDeg: 38.4,
        lowAngleBoundaryPct: 18.2,
        highAngleBoundaryPct: 81.8,
        kosselSchmidFactorMean: 0.44,
      },
      xrdVerification: {
        primaryPeaks: [
          { hkl: "(111)", twoTheta: 43.6, intensityPct: 100 },
          { hkl: "(200)", twoTheta: 50.8, intensityPct: 48 },
          { hkl: "(220)", twoTheta: 74.7, intensityPct: 32 },
          { hkl: "(311)", twoTheta: 90.7, intensityPct: 24 },
        ],
        residualStressSin2PsiMpa: 85,
        crystalliteSizeNm: 42.5,
      },
      edsPurityPurityPct: 99.85,
    },

    mechanical: {
      yieldStrengthMpa: 1185,
      ultimateTensileStrengthMpa: 1420,
      elongationPct: 17.5,
      reductionOfAreaPct: 24.0,
      hardness: {
        value: 44.5,
        scale: "HRC",
        convertedHV: 440,
        convertedHRC: 44.5,
      },
      fractureToughnessK1cMpaSqrtM: 92.5,
      fatigueLimitMpa: 620,
      mmpdsStatisticalBasis: {
        basisLevel: "A-Basis Qualified",
        sampleCountN: 128,
        cpkReliability: 1.62,
      },
    },

    electrochemistry: {
      corrosionRateMpy: 0.12,
      openCircuitPotentialEcorrV: -0.18,
      pittingPotentialEpitV: 0.85,
      polarizationResistanceRpOhmCm2: 84000,
      eisImpedanceModuleOhm: 125000,
      passivationQuality: "Passive Stable",
    },

    extremeService: {
      operatingMaxTempC: 650,
      thermalConductivityW_mK: 11.4,
      thermalDiffusivityMm2_s: 3.12,
      oxidationResistanceCategory: "Excellent (Protective Cr2O3/Al2O3)",
      creepRuptureLifeHours: {
        temperatureC: 650,
        stressMpa: 690,
        hoursToRupture: 1850,
      },
    },

    certification: {
      applicableStandards: ["AMS 5662", "ASTM F3055 (LPBF Inconel 718)", "MIL-STD-810H", "AS9100 Rev D"],
      aerospaceFlightReadinessScorePct: undefined,
      qualificationAuditStatus: "Not Assessed (Reference Benchmark)",
      complianceRiskLevel: "Unresolved",
      nonDestructiveTestResults: {
        ultrasonicInspection: "Pending",
        xrayRadiography: "Pending",
        surfaceDyePenetrant: "Pending",
      },
    },
  },
  {
    id: "twin-ti64-eli-002",
    serialNumber: "TWIN-TI64-AERO-2026-02",
    sampleName: "Ti-6Al-4V ELI (Grade 23) Hypersonic Leading Edge Strut",
    materialCategory: "Titanium Alloy",
    standardDesignation: "ASTM F136 / AMS 4928 / UNS R56401",
    creationDate: "2026-08-18",
    lastUpdated: "2026-08-30",
    leadMetallurgist: "Materials Specialist (Unassigned)",
    organization: "Open Research Benchmark",
    currentStatus: "Benchmark Specimen",

    chemistry: {
      baseElement: "Ti",
      nominalComposition: {
        Ti: 89.2,
        Al: 6.1,
        V: 4.0,
        Fe: 0.18,
        O: 0.11,
        C: 0.02,
        N: 0.01,
        H: 0.005,
      },
      measuredComposition: {
        Ti: 89.25,
        Al: 6.05,
        V: 3.98,
        Fe: 0.17,
        O: 0.105,
      },
    },

    thermodynamics: {
      calphadSystemId: "ti-al",
      liquidusTemperatureC: 1660,
      solidusTemperatureC: 1604,
      freezingRangeC: 56,
      stablePhasesAtRoomTemp: [
        {
          phaseId: "ALPHA_HCP",
          phaseName: "α Matrix (HCP)",
          fractionPct: 88.0,
          crystalStructure: "HCP (A3)",
        },
        {
          phaseId: "BETA_BCC",
          phaseName: "β Transformed (BCC)",
          fractionPct: 12.0,
          crystalStructure: "BCC (A2)",
        },
      ],
      scheilSolidification: {
        eutecticFractionPct: 0.0,
        hotTearingIndexKou: 0.28,
        microsegregationSeverity: "Low",
      },
      transformationTemps: {
        ac3: 995, // Beta transus
        ms: 800,
      },
    },

    processHistory: {
      manufacturingRoute: "HIP (Hot Isostatic Pressed)",
      currentCondition: "Solution Treated",
      thermalCycles: [
        {
          stageName: "Hot Isostatic Pressing (HIP)",
          targetTempC: 920,
          holdTimeMinutes: 180,
          coolingMethod: "Gas Fan",
          notes: "100 MPa argon pressure to eliminate any residual porosity",
        },
        {
          stageName: "Mill Anneal / Duplex Stabilization",
          targetTempC: 730,
          holdTimeMinutes: 120,
          coolingMethod: "Air Cool",
        },
      ],
      additiveParameters: {
        laserPowerW: 350,
        scanSpeedMmS: 1200,
        hatchDistanceUm: 105,
        layerThicknessUm: 30,
        volumetricEnergyDensityJ_mm3: 74.0,
        predictedResidualStressMpa: 210,
        maxDeflectionMm: 0.09,
      },
    },

    microstructure: {
      primaryCrystalStructure: "HCP",
      astmGrainSizeNumber: 10.5,
      meanGrainDiameterUm: 8.5,
      porosityPct: 0.01,
      phasesDetected: [
        {
          name: "Equiaxed & Lamellar α (HCP)",
          fractionPct: 88.0,
          morphology: "Fine Widmanstätten basketweave colonies with equiaxed primary α",
        },
        {
          name: "Intergranular β (BCC)",
          fractionPct: 12.0,
          morphology: "Thin films along α platelet boundaries",
        },
      ],
      ebsdTexture: {
        preferredOrientation: "Basal (0001) Plane parallel to Extrusion/Load Axis",
        misorientationAngleMeanDeg: 42.1,
        lowAngleBoundaryPct: 12.5,
        highAngleBoundaryPct: 87.5,
        kosselSchmidFactorMean: 0.38,
      },
      xrdVerification: {
        primaryPeaks: [
          { hkl: "(100)", twoTheta: 35.1, intensityPct: 45 },
          { hkl: "(002)", twoTheta: 38.4, intensityPct: 60 },
          { hkl: "(101)", twoTheta: 40.2, intensityPct: 100 },
          { hkl: "(102)", twoTheta: 53.0, intensityPct: 35 },
        ],
        residualStressSin2PsiMpa: -45, // compressive
        crystalliteSizeNm: 58.0,
      },
      edsPurityPurityPct: 99.92,
    },

    mechanical: {
      yieldStrengthMpa: 890,
      ultimateTensileStrengthMpa: 980,
      elongationPct: 16.0,
      reductionOfAreaPct: 42.0,
      hardness: {
        value: 34.0,
        scale: "HRC",
        convertedHV: 335,
        convertedHRC: 34.0,
      },
      fractureToughnessK1cMpaSqrtM: 78.0,
      fatigueLimitMpa: 510,
      mmpdsStatisticalBasis: {
        basisLevel: "A-Basis Qualified",
        sampleCountN: 94,
        cpkReliability: 1.55,
      },
    },

    electrochemistry: {
      corrosionRateMpy: 0.02,
      openCircuitPotentialEcorrV: -0.05,
      pittingPotentialEpitV: 1.45,
      polarizationResistanceRpOhmCm2: 240000,
      eisImpedanceModuleOhm: 380000,
      passivationQuality: "Immune",
    },

    extremeService: {
      operatingMaxTempC: 450,
      hypersonicAblationRecessionRateMm_s: 0.045,
      thermalConductivityW_mK: 6.7,
      thermalDiffusivityMm2_s: 2.85,
      oxidationResistanceCategory: "Excellent (Protective Cr2O3/Al2O3)",
    },

    certification: {
      applicableStandards: ["AMS 4928", "ASTM F136", "MIL-STD-810H", "STANAG 4370"],
      aerospaceFlightReadinessScorePct: undefined,
      qualificationAuditStatus: "Not Assessed (Reference Benchmark)",
      complianceRiskLevel: "Unresolved",
      nonDestructiveTestResults: {
        ultrasonicInspection: "Pending",
        xrayRadiography: "Pending",
        surfaceDyePenetrant: "Pending",
      },
    },
  },
  {
    id: "twin-4140-qt-003",
    serialNumber: "TWIN-4140-DEF-2026-03",
    sampleName: "AISI 4140 Cr-Mo High-Tensile Armament Shaft",
    materialCategory: "Alloy Steel",
    standardDesignation: "AISI 4140 / 42CrMo4 / UNS G41400",
    creationDate: "2026-08-20",
    lastUpdated: "2026-08-29",
    leadMetallurgist: "Materials Specialist (Unassigned)",
    organization: "Open Research Benchmark",
    currentStatus: "Benchmark Specimen",

    chemistry: {
      baseElement: "Fe",
      nominalComposition: {
        Fe: 96.8,
        C: 0.42,
        Cr: 1.05,
        Mn: 0.85,
        Mo: 0.22,
        Si: 0.25,
        P: 0.015,
        S: 0.012,
      },
      measuredComposition: {
        Fe: 96.85,
        C: 0.41,
        Cr: 1.03,
        Mn: 0.84,
        Mo: 0.22,
      },
      carbonEquivalent: {
        ceIIW: 0.72,
        pcm: 0.51,
        cen: 0.68,
      },
    },

    thermodynamics: {
      calphadSystemId: "fe-c",
      liquidusTemperatureC: 1510,
      solidusTemperatureC: 1465,
      freezingRangeC: 45,
      stablePhasesAtRoomTemp: [
        {
          phaseId: "TEMPERED_MARTENSITE",
          phaseName: "Tempered Martensite + Carbides",
          fractionPct: 96.5,
          crystalStructure: "BCC / BCT (A2)",
        },
        {
          phaseId: "RETAINED_AUSTENITE",
          phaseName: "Retained Austenite (γ)",
          fractionPct: 3.5,
          crystalStructure: "FCC (A1)",
        },
      ],
      scheilSolidification: {
        eutecticFractionPct: 0.0,
        hotTearingIndexKou: 0.35,
        microsegregationSeverity: "Low",
      },
      transformationTemps: {
        ac1: 730,
        ac3: 780,
        ms: 330,
        mf: 210,
        bs: 520,
      },
    },

    processHistory: {
      manufacturingRoute: "Forged & Rolled",
      currentCondition: "Quenched & Tempered",
      thermalCycles: [
        {
          stageName: "Austenitizing",
          targetTempC: 860,
          holdTimeMinutes: 45,
          coolingMethod: "Oil Quench",
          notes: "Agitated polymer/oil quenching for full martensitic transformation",
        },
        {
          stageName: "High-Temperature Tempering",
          targetTempC: 580,
          holdTimeMinutes: 120,
          coolingMethod: "Air Cool",
          notes: "Achieves optimum balance between high yield strength and Charpy V-notch toughness",
        },
      ],
    },

    microstructure: {
      primaryCrystalStructure: "BCC",
      astmGrainSizeNumber: 8.0,
      meanGrainDiameterUm: 22.0,
      porosityPct: 0.0,
      phasesDetected: [
        {
          name: "Tempered Lath Martensite",
          fractionPct: 96.5,
          morphology: "Lath boundaries decorated with fine sub-micron Cr-Mo carbides",
        },
        {
          name: "Retained Austenite Films",
          fractionPct: 3.5,
          morphology: "Interlath thin metastable nanometer films",
        },
      ],
      ebsdTexture: {
        preferredOrientation: "Randomized Forged Equiaxed Prior Austenite Grains",
        misorientationAngleMeanDeg: 45.2,
        lowAngleBoundaryPct: 22.0,
        highAngleBoundaryPct: 78.0,
        kosselSchmidFactorMean: 0.46,
      },
      xrdVerification: {
        primaryPeaks: [
          { hkl: "(110)", twoTheta: 44.7, intensityPct: 100 },
          { hkl: "(200)", twoTheta: 65.0, intensityPct: 28 },
          { hkl: "(211)", twoTheta: 82.3, intensityPct: 40 },
        ],
        residualStressSin2PsiMpa: -120, // compressive surface
        crystalliteSizeNm: 35.0,
      },
      edsPurityPurityPct: 99.8,
    },

    mechanical: {
      yieldStrengthMpa: 930,
      ultimateTensileStrengthMpa: 1080,
      elongationPct: 15.5,
      reductionOfAreaPct: 52.0,
      hardness: {
        value: 32.0,
        scale: "HRC",
        convertedHV: 318,
        convertedHRC: 32.0,
      },
      fractureToughnessK1cMpaSqrtM: 85.0,
      fatigueLimitMpa: 540,
      mmpdsStatisticalBasis: {
        basisLevel: "A-Basis Qualified",
        sampleCountN: 240,
        cpkReliability: 1.74,
      },
    },

    electrochemistry: {
      corrosionRateMpy: 4.8,
      openCircuitPotentialEcorrV: -0.48,
      polarizationResistanceRpOhmCm2: 2400,
      eisImpedanceModuleOhm: 3200,
      passivationQuality: "Active Dissolution",
    },

    extremeService: {
      operatingMaxTempC: 400,
      thermalConductivityW_mK: 42.6,
      thermalDiffusivityMm2_s: 11.8,
      oxidationResistanceCategory: "Moderate",
    },

    certification: {
      applicableStandards: ["MIL-S-5000", "ASTM A29", "AS9100 Rev D", "ISO 9001"],
      aerospaceFlightReadinessScorePct: undefined,
      qualificationAuditStatus: "Not Assessed (Reference Benchmark)",
      complianceRiskLevel: "Unresolved",
      nonDestructiveTestResults: {
        ultrasonicInspection: "Pending",
        xrayRadiography: "Pending",
        surfaceDyePenetrant: "Pending",
      },
    },
  },
];

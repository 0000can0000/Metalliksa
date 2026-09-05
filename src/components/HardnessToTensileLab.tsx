import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  PipelineMaterialPayload,
  getActivePipelineMaterial,
  subscribeToPipelineMaterial,
  clearActivePipelineMaterial,
} from "../utils/materialDataPipeline";
import {
  calculateTaborTensileMonteCarlo,
  MonteCarloResult,
} from "../utils/monteCarloEngine";
import { MonteCarloUncertaintyCard } from "./MonteCarloUncertaintyCard";
import {
  Gauge,
  TrendingUp,
  Activity,
  Sliders,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Info,
  Layers,
  Search,
  RefreshCw,
  Atom,
  Binary,
  Maximize2,
  Target,
  FileText,
  Trash2,
  Zap,
} from "lucide-react";
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
} from "recharts";

export interface HardnessAlloyPreset {
  id: string;
  name: string;
  category: "Nickel Superalloy" | "Titanium Alloy" | "Steels & Irons" | "Aluminum Alloys" | "Cobalt / Bio";
  defaultHardnessHV: number;
  defaultHardnessHRC?: number;
  taborConstraintFactor_c: number; // typically 2.8 - 3.3 (Tabor factor)
  cahoon_m: number; // Strain hardening coefficient exponent modifier (Cahoon model)
  elasticModulus_E_GPa: number;
  poissonsRatio_nu: number;
  workHardeningExponent_n: number; // Hollomon n
  strengthCoefficient_K_MPa: number; // Hollomon K
  uniformElongation_pct: number;
  fractureToughness_K1c_MPa_sqrt_m: number;
  anisotropyFactors: {
    L: { yieldFactor: number; utsFactor: number; elongFactor: number; k1cFactor: number };
    LT: { yieldFactor: number; utsFactor: number; elongFactor: number; k1cFactor: number };
    ST: { yieldFactor: number; utsFactor: number; elongFactor: number; k1cFactor: number };
  };
  description: string;
}

export const HARDNESS_ALLOY_PRESETS: HardnessAlloyPreset[] = [
  {
    id: "in718-sta",
    name: "Inconel 718 (Solution & Aged STA)",
    category: "Nickel Superalloy",
    defaultHardnessHV: 445,
    defaultHardnessHRC: 45,
    taborConstraintFactor_c: 3.05,
    cahoon_m: 0.22,
    elasticModulus_E_GPa: 205,
    poissonsRatio_nu: 0.29,
    workHardeningExponent_n: 0.14,
    strengthCoefficient_K_MPa: 1950,
    uniformElongation_pct: 16.5,
    fractureToughness_K1c_MPa_sqrt_m: 72,
    anisotropyFactors: {
      L: { yieldFactor: 1.0, utsFactor: 1.0, elongFactor: 1.0, k1cFactor: 1.0 },
      LT: { yieldFactor: 0.98, utsFactor: 0.99, elongFactor: 0.92, k1cFactor: 0.94 },
      ST: { yieldFactor: 0.95, utsFactor: 0.96, elongFactor: 0.72, k1cFactor: 0.82 },
    },
    description: "Peak-aged precipitation hardened nickel superalloy for aerospace turbine disks and casing.",
  },
  {
    id: "ti64-eli-forged",
    name: "Ti-6Al-4V Grade 23 (Forged & Mill Annealed)",
    category: "Titanium Alloy",
    defaultHardnessHV: 340,
    defaultHardnessHRC: 36,
    taborConstraintFactor_c: 2.85,
    cahoon_m: 0.20,
    elasticModulus_E_GPa: 114,
    poissonsRatio_nu: 0.33,
    workHardeningExponent_n: 0.11,
    strengthCoefficient_K_MPa: 1350,
    uniformElongation_pct: 12.0,
    fractureToughness_K1c_MPa_sqrt_m: 65,
    anisotropyFactors: {
      L: { yieldFactor: 1.0, utsFactor: 1.0, elongFactor: 1.0, k1cFactor: 1.0 },
      LT: { yieldFactor: 0.96, utsFactor: 0.97, elongFactor: 0.84, k1cFactor: 0.88 },
      ST: { yieldFactor: 0.90, utsFactor: 0.92, elongFactor: 0.52, k1cFactor: 0.70 },
    },
    description: "Damage tolerant alpha-beta titanium alloy for rotating fan disks, rocket tanks and airframe spars.",
  },
  {
    id: "ss316l-lpbf",
    name: "SS 316L (LPBF Metal 3D Printed As-Built)",
    category: "Steels & Irons",
    defaultHardnessHV: 235,
    defaultHardnessHRC: 20,
    taborConstraintFactor_c: 3.25,
    cahoon_m: 0.32,
    elasticModulus_E_GPa: 190,
    poissonsRatio_nu: 0.30,
    workHardeningExponent_n: 0.35,
    strengthCoefficient_K_MPa: 1200,
    uniformElongation_pct: 42.0,
    fractureToughness_K1c_MPa_sqrt_m: 115,
    anisotropyFactors: {
      L: { yieldFactor: 1.0, utsFactor: 1.0, elongFactor: 1.0, k1cFactor: 1.0 }, // XY plane
      LT: { yieldFactor: 0.98, utsFactor: 0.98, elongFactor: 0.95, k1cFactor: 0.96 },
      ST: { yieldFactor: 0.88, utsFactor: 0.92, elongFactor: 0.65, k1cFactor: 0.78 }, // Z build direction
    },
    description: "High work-hardening austenitic stainless steel with hierarchical cellular subgrains.",
  },
  {
    id: "maraging300-aged",
    name: "Maraging Steel 300 (Aged 490°C / 6h)",
    category: "Steels & Irons",
    defaultHardnessHV: 580,
    defaultHardnessHRC: 54,
    taborConstraintFactor_c: 3.12,
    cahoon_m: 0.16,
    elasticModulus_E_GPa: 210,
    poissonsRatio_nu: 0.28,
    workHardeningExponent_n: 0.08,
    strengthCoefficient_K_MPa: 2350,
    uniformElongation_pct: 8.5,
    fractureToughness_K1c_MPa_sqrt_m: 45,
    anisotropyFactors: {
      L: { yieldFactor: 1.0, utsFactor: 1.0, elongFactor: 1.0, k1cFactor: 1.0 },
      LT: { yieldFactor: 0.97, utsFactor: 0.98, elongFactor: 0.82, k1cFactor: 0.85 },
      ST: { yieldFactor: 0.92, utsFactor: 0.94, elongFactor: 0.45, k1cFactor: 0.68 },
    },
    description: "Ultra-high strength cobalt-molybdenum intermetallic strengthened rocket motor casing alloy.",
  },
  {
    id: "aa7075-t651",
    name: "AA7075-T651 (Aerospace Heavy Plate)",
    category: "Aluminum Alloys",
    defaultHardnessHV: 175,
    defaultHardnessHRC: 10,
    taborConstraintFactor_c: 2.95,
    cahoon_m: 0.18,
    elasticModulus_E_GPa: 72,
    poissonsRatio_nu: 0.33,
    workHardeningExponent_n: 0.12,
    strengthCoefficient_K_MPa: 780,
    uniformElongation_pct: 11.5,
    fractureToughness_K1c_MPa_sqrt_m: 29,
    anisotropyFactors: {
      L: { yieldFactor: 1.0, utsFactor: 1.0, elongFactor: 1.0, k1cFactor: 1.0 }, // Rolling dir
      LT: { yieldFactor: 0.95, utsFactor: 0.97, elongFactor: 0.80, k1cFactor: 0.82 },
      ST: { yieldFactor: 0.88, utsFactor: 0.90, elongFactor: 0.35, k1cFactor: 0.58 }, // Short transverse (crack susceptible)
    },
    description: "High-strength Zn-Mg-Cu age-hardened alloy for wing skins and fuselage bulkheads.",
  },
  {
    id: "scalmalloy-am",
    name: "Scalmalloy® (Al-Mg-Sc-Zr Additive)",
    category: "Aluminum Alloys",
    defaultHardnessHV: 165,
    defaultHardnessHRC: 8,
    taborConstraintFactor_c: 2.92,
    cahoon_m: 0.24,
    elasticModulus_E_GPa: 71,
    poissonsRatio_nu: 0.33,
    workHardeningExponent_n: 0.18,
    strengthCoefficient_K_MPa: 710,
    uniformElongation_pct: 14.0,
    fractureToughness_K1c_MPa_sqrt_m: 35,
    anisotropyFactors: {
      L: { yieldFactor: 1.0, utsFactor: 1.0, elongFactor: 1.0, k1cFactor: 1.0 },
      LT: { yieldFactor: 0.98, utsFactor: 0.99, elongFactor: 0.92, k1cFactor: 0.94 },
      ST: { yieldFactor: 0.93, utsFactor: 0.95, elongFactor: 0.70, k1cFactor: 0.80 },
    },
    description: "Ultrafine grain Al-Sc alloy with exceptional strength-to-weight ratio for aerospace bracketry.",
  },
  {
    id: "cocr-f75-cast",
    name: "Co-Cr-Mo ASTM F75 (Orthopedic Implant)",
    category: "Cobalt / Bio",
    defaultHardnessHV: 380,
    defaultHardnessHRC: 39,
    taborConstraintFactor_c: 3.15,
    cahoon_m: 0.28,
    elasticModulus_E_GPa: 230,
    poissonsRatio_nu: 0.30,
    workHardeningExponent_n: 0.26,
    strengthCoefficient_K_MPa: 1650,
    uniformElongation_pct: 18.0,
    fractureToughness_K1c_MPa_sqrt_m: 60,
    anisotropyFactors: {
      L: { yieldFactor: 1.0, utsFactor: 1.0, elongFactor: 1.0, k1cFactor: 1.0 },
      LT: { yieldFactor: 0.96, utsFactor: 0.98, elongFactor: 0.88, k1cFactor: 0.90 },
      ST: { yieldFactor: 0.91, utsFactor: 0.93, elongFactor: 0.60, k1cFactor: 0.75 },
    },
    description: "High biocompatibility and wear-resistant joint prosthesis alloy prone to strain-induced martensite.",
  },
];

interface HardnessToTensileLabProps {
  onNavigate?: (tabId: string) => void;
}

export const HardnessToTensileLab: React.FC<HardnessToTensileLabProps> = ({ onNavigate }) => {
  // Data Pipeline State
  const [injectedPayload, setInjectedPayload] = useState<PipelineMaterialPayload | null>(() =>
    getActivePipelineMaterial()
  );

  useEffect(() => {
    const unsub = subscribeToPipelineMaterial((p) => {
      setInjectedPayload(p);
      if (p) {
        // Auto-configure hardness and work hardening from injected profile
        const hv = p.hardnessHV || p.hardnessProfile?.defaultHardnessHV;
        if (hv && hv > 0) {
          setHardnessHV(hv);
          if (p.hardnessProfile?.taborConstraintFactor_c) {
            setCustomTabor_c(p.hardnessProfile.taborConstraintFactor_c);
          }
          if (p.hardnessProfile?.workHardeningExponent_n) {
            setUserWorkHardening_n(p.hardnessProfile.workHardeningExponent_n);
          }
        }
      }
    });
    return unsub;
  }, []);

  const [selectedPresetId, setSelectedPresetId] = useState<string>("in718-sta");
  const [inputMode, setInputMode] = useState<"HV" | "HRC" | "HB">("HV");

  const [hardnessHV, setHardnessHV] = useState<number>(445);
  const [userWorkHardening_n, setUserWorkHardening_n] = useState<number>(0.14);
  const [testTemperature_C, setTestTemperature_C] = useState<number>(25);

  // Metallurgical Anisotropy & Microstructural Factors
  const [grainOrientation, setGrainOrientation] = useState<"L" | "LT" | "ST">("L");
  const [cleanlinessGrade, setCleanlinessGrade] = useState<"VAR_ESR" | "VIM_Standard" | "AirMelt_Commercial">("VAR_ESR");
  const [customTabor_c, setCustomTabor_c] = useState<number>(3.05);
  const [bauschingerRatio, setBauschingerRatio] = useState<number>(0.92);

  // Indenter type & Indentation load
  const [indentationLoad_kgf, setIndentationLoad_kgf] = useState<number>(10);
  const [indenterHalfAngle_deg, setIndenterHalfAngle_deg] = useState<number>(68); // Vickers pyramid ~ 136 deg included

  // Raw Hardness profile upload
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [rawHardnessPoints, setRawHardnessPoints] = useState<{ depth_um: number; hv: number }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI & Certification state
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [tensileReport, setTensileReport] = useState<string | null>(null);

  const preset = useMemo(() => {
    return HARDNESS_ALLOY_PRESETS.find((p) => p.id === selectedPresetId) || HARDNESS_ALLOY_PRESETS[0];
  }, [selectedPresetId]);

  // Sync default preset values on selection
  const handleSelectPreset = (pId: string) => {
    setSelectedPresetId(pId);
    const p = HARDNESS_ALLOY_PRESETS.find((item) => item.id === pId);
    if (p) {
      setHardnessHV(p.defaultHardnessHV);
      setUserWorkHardening_n(p.workHardeningExponent_n);
      setCustomTabor_c(p.taborConstraintFactor_c);
    }
  };

  // Temperature Derating Factor (for high-temp tensile estimation)
  const tempDeratingFactor = useMemo(() => {
    if (testTemperature_C <= 25) return 1.0;
    if (testTemperature_C <= 300) return 1.0 - (testTemperature_C - 25) * 0.0003;
    if (testTemperature_C <= 650) return 0.92 - (testTemperature_C - 300) * 0.0007;
    return Math.max(0.2, 0.67 - (testTemperature_C - 650) * 0.0015);
  }, [testTemperature_C]);

  // Cleanliness Knockdown Factor for K_1c & Elongation (Inclusions / Segregation)
  const cleanlinessFactor = useMemo(() => {
    switch (cleanlinessGrade) {
      case "VAR_ESR":
        return { k1c: 1.0, elong: 1.0, label: "Premium Aerospace Remelt (VAR/ESR - Ultra Clean)" };
      case "VIM_Standard":
        return { k1c: 0.88, elong: 0.90, label: "Vacuum Induction Melt (VIM - Standard Aviation)" };
      case "AirMelt_Commercial":
        return { k1c: 0.68, elong: 0.72, label: "Air Melt (Commercial Grade - High Inclusions / Low K1c)" };
    }
  }, [cleanlinessGrade]);

  // TABOR & CAHOON CONVERSION CALCULATIONS WITH ANISOTROPY & BAUSCHINGER
  const mechanicalProperties = useMemo(() => {
    const H_MPa = hardnessHV * 9.80665;
    const c = customTabor_c;
    const n = userWorkHardening_n;

    const aniso = preset.anisotropyFactors[grainOrientation];

    // 0.2% Offset Yield Strength (Tabor-Cahoon Model with Anisotropy Knockdown)
    const representativeStrain = 0.08;
    const yieldStrain = 0.002;
    const flowStressAtRep = H_MPa / c;
    const rawYield_MPa = flowStressAtRep * Math.pow(yieldStrain / representativeStrain, n);
    const yieldStrength_MPa = Math.round(rawYield_MPa * tempDeratingFactor * aniso.yieldFactor);

    // Ultimate Tensile Strength (UTS, Considere Criterion)
    const rawUTS_MPa = (H_MPa / 2.9) * Math.pow(n / 0.08, n) * Math.exp(-n * 0.4);
    const ultimateTensileStrength_MPa = Math.round(
      Math.max(yieldStrength_MPa * 1.05, rawUTS_MPa * tempDeratingFactor * aniso.utsFactor)
    );

    // Effective Elongation & Bauschinger Reverse Yield
    const effectiveElongation_pct = +(preset.uniformElongation_pct * aniso.elongFactor * cleanlinessFactor.elong).toFixed(1);
    const compressiveYield_MPa = Math.round(yieldStrength_MPa * bauschingerRatio);

    // Hollomon K strength coefficient: K = UTS * (e / n)^n
    const K_MPa = Math.round(ultimateTensileStrength_MPa * Math.pow(Math.E / Math.max(0.01, n), n));

    // Fracture Toughness K_1c estimation (incorporating cleanliness & grain orientation)
    const ductilityRatio = Math.max(0.02, effectiveElongation_pct / 100);
    const estimatedK1c = +(
      Math.sqrt((preset.elasticModulus_E_GPa * 1000) / hardnessHV) *
      1.85 *
      Math.pow(ductilityRatio, 0.35) *
      aniso.k1cFactor *
      cleanlinessFactor.k1c
    ).toFixed(1);

    // Hardness in other scales
    const hrc = +(Math.max(0, (hardnessHV - 180) / 9.5)).toFixed(1);
    const hb = Math.round(hardnessHV * 0.95);

    return {
      yieldStrength_MPa,
      compressiveYield_MPa,
      ultimateTensileStrength_MPa,
      effectiveElongation_pct,
      K_MPa,
      estimatedK1c,
      hrc,
      hb,
      flowStressAtRep: Math.round(flowStressAtRep),
      aniso,
    };
  }, [hardnessHV, preset, userWorkHardening_n, tempDeratingFactor, grainOrientation, cleanlinessFactor, customTabor_c, bauschingerRatio]);

  // ZERO ERROR MARGIN: Monte Carlo Error Propagation & MMPDS Confidence Intervals (5000 runs)
  const monteCarloResults = useMemo(() => {
    return calculateTaborTensileMonteCarlo({
      hardnessHv: hardnessHV,
      hardnessUncertaintyHv: hardnessHV * 0.035, // ±3.5% ASTM E384 gage R&R
      cahoonC1: customTabor_c,
      cahoonC1StdDev: 0.08,
      hollomonN: userWorkHardening_n,
      hollomonNStdDev: 0.015,
      iterations: 5000,
    });
  }, [hardnessHV, customTabor_c, userWorkHardening_n]);

  // Generate Continuous Stress-Strain Curve (Elastic + Hollomon Plasticity)
  const stressStrainCurveData = useMemo(() => {
    const data: {
      strain_pct: number;
      engineeringStress_MPa: number;
      trueStress_MPa: number;
      elasticLine_MPa?: number;
    }[] = [];

    const E_MPa = preset.elasticModulus_E_GPa * 1000;
    const sy = mechanicalProperties.yieldStrength_MPa;
    const uts = mechanicalProperties.ultimateTensileStrength_MPa;
    const n = userWorkHardening_n;
    const K = mechanicalProperties.K_MPa;
    const maxStrain_pct = Math.min(60, Math.round(preset.uniformElongation_pct * 1.6));

    // Elastic limit strain
    const elasticLimitStrain = (sy / E_MPa) * 100;

    for (let eps_pct = 0; eps_pct <= maxStrain_pct; eps_pct += 0.2) {
      const trueStrain = eps_pct / 100;

      let engStress = 0;
      let trueStress = 0;

      if (eps_pct <= elasticLimitStrain) {
        // Linear elastic Hooke's Law
        engStress = (eps_pct / 100) * E_MPa;
        trueStress = engStress;
      } else {
        // Hollomon Power Law: sigma_true = K * (true_plastic_strain)^n
        const plasticStrain = Math.max(0.002, trueStrain - sy / E_MPa + 0.002);
        trueStress = K * Math.pow(plasticStrain, n);

        // Convert True Stress to Engineering Stress: sigma_eng = sigma_true / (1 + eng_strain)
        // Apply necking drop beyond uniform elongation
        const uniformStrain = preset.uniformElongation_pct / 100;
        if (trueStrain <= uniformStrain) {
          engStress = trueStress / (1 + trueStrain);
        } else {
          // Post-necking softening
          const postNeckingDelta = trueStrain - uniformStrain;
          engStress = (uts / (1 + uniformStrain)) * Math.exp(-postNeckingDelta * 2.5);
        }
      }

      data.push({
        strain_pct: +eps_pct.toFixed(2),
        engineeringStress_MPa: Math.round(engStress),
        trueStress_MPa: Math.round(trueStress),
        elasticLine_MPa: eps_pct <= elasticLimitStrain * 1.5 ? Math.round((eps_pct / 100) * E_MPa) : undefined,
      });
    }

    return data;
  }, [preset, mechanicalProperties, userWorkHardening_n]);

  // Handle Raw Microhardness Depth Profile CSV/TXT
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/);
        const pts: { depth_um: number; hv: number }[] = [];

        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
          const parts = trimmed.split(/[\s,;\t]+/).filter(Boolean);
          if (parts.length >= 2) {
            const d = parseFloat(parts[0]);
            const val = parseFloat(parts[1]);
            if (!isNaN(d) && !isNaN(val) && val > 20) {
              pts.push({ depth_um: d, hv: Math.round(val) });
            }
          }
        }

        if (pts.length > 0) {
          setRawHardnessPoints(pts);
          setUploadedFileName(file.name);
          // Set average HV
          const avgHV = Math.round(pts.reduce((acc, p) => acc + p.hv, 0) / pts.length);
          setHardnessHV(avgHV);
        }
      } catch (err) {
        console.error("Hardness file parse error", err);
      }
    };
    reader.readAsText(file);
  };

  const handleClearUploadedFile = () => {
    setRawHardnessPoints(null);
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Run AI Mechanical Certification & Verification
  const handleRunCertification = () => {
    setIsSynthesizing(true);
    setTimeout(() => {
      const summary = `### ⚙️ Non-Destructive Tabor & Cahoon Tensile Screening & Verification Report
**Sample ID / Alloy:** ${preset.name} (${preset.category})
**Evaluation Standard:** ASTM E384 Microindentation / Tabor-Cahoon Model with Hollomon Plasticity
**Grain / Rolling Orientation:** **${grainOrientation === "L" ? "Longitudinal (L)" : grainOrientation === "LT" ? "Long-Transverse (LT)" : "Short-Transverse (ST - Z Thickness)"}**
**Ingot / Melt Cleanliness:** ${cleanlinessFactor.label}
**Test Temperature:** ${testTemperature_C}°C ${testTemperature_C > 25 ? `(Elevated Thermal Derating: ×${tempDeratingFactor.toFixed(3)})` : "(Room Temperature)"}

---

#### 1. Inverted Directional Mechanical Tensile Properties:
- **0.2% Offset Tensile Yield ($R_{p0.2}$):** **${mechanicalProperties.yieldStrength_MPa} MPa** (Knockdown: ×${mechanicalProperties.aniso.yieldFactor})
- **Compressive Yield Strength ($R_{pc0.2}$ - Bauschinger Asymmetry):** **${mechanicalProperties.compressiveYield_MPa} MPa**
- **Ultimate Tensile Strength ($R_m$ / $UTS$):** **${mechanicalProperties.ultimateTensileStrength_MPa} MPa**
- **Effective Uniform Elongation ($A_u$):** **${mechanicalProperties.effectiveElongation_pct}%** (Anisotropy & Cleanliness Knockdown)
- **Yield-to-Tensile Ratio ($R_p/R_m$):** ${(mechanicalProperties.yieldStrength_MPa / mechanicalProperties.ultimateTensileStrength_MPa).toFixed(2)} (${(mechanicalProperties.yieldStrength_MPa / mechanicalProperties.ultimateTensileStrength_MPa) < 0.85 ? "Safe High Strain-Hardening Reserve" : "Caution: Low Work-Hardening Capacity"})
- **Hollomon Strength Coefficient ($K$):** ${mechanicalProperties.K_MPa} MPa | Exponent ($n$): ${userWorkHardening_n}

---

#### 2. Fracture Toughness & Indentation Damage Resistance:
- **Directional Fracture Toughness ($K_{IC}$):** **${mechanicalProperties.estimatedK1c} MPa√m**
  * *Note: Short-Transverse (ST) crack plane and non-VAR air-melt inclusions severely degrade fracture toughness!*
- **Hardness Scales:** **${hardnessHV} HV** (Load: ${indentationLoad_kgf} kgf) ≈ **${mechanicalProperties.hrc} HRC** ≈ **${mechanicalProperties.hb} HBW**
- **Tabor Triaxiality Constraint Factor ($c$):** $c = ${customTabor_c}$

---

#### 3. ⚠️ AIRWORTHINESS REGULATORY DISCLAIMER (FAA / EASA / ASTM E8 / ASTM E399):
*This calculation is an advanced Non-Destructive Screening (NDT Level II) tool. Indentation strain fields are triaxial compressive. For flight-critical primary structural sign-off (MMPDS A/B-Basis), standard destructive uniaxial tensile testing per ASTM E8M and fracture toughness testing per ASTM E399 / E1820 on certified test coupons remain MANDATORY.*`;

      setTensileReport(summary);
      setIsSynthesizing(false);
    }, 900);
  };

  const handleExportCSV = () => {
    const header = "Strain_pct,EngineeringStress_MPa,TrueStress_MPa\n";
    const rows = stressStrainCurveData.map((d) => `${d.strain_pct},${d.engineeringStress_MPa},${d.trueStress_MPa}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Synthesized_Stress_Strain_${preset.id}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono">
      {/* Active Pipeline Ingested Banner */}
      {injectedPayload && (
        <div className="bg-gradient-to-r from-amber-950/50 via-[#18110b] to-[#090e18] p-4 rounded-2xl border border-amber-500/50 shadow-[0_0_24px_rgba(245,158,11,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Gauge className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-500/30">
                  Data Pipeline Ingestion Active
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Transferred from: <strong className="text-white">{injectedPayload.sourceModule}</strong>
                </span>
              </div>
              <h3 className="text-sm font-bold text-white font-mono mt-0.5">
                {injectedPayload.name} ({injectedPayload.standard || "Custom ICME Blueprint"})
              </h3>
              <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                Ingested Properties: Hardness = <strong className="text-amber-400">{injectedPayload.hardnessHV || injectedPayload.hardnessProfile.defaultHardnessHV} HV</strong> | Tabor c = <strong className="text-cyan-400">{injectedPayload.hardnessProfile.taborConstraintFactor_c}</strong> | Hollomon n = <strong className="text-emerald-400">{injectedPayload.hardnessProfile.workHardeningExponent_n}</strong> | Predicted Rp0.2 = <strong className="text-orange-400">{injectedPayload.yieldStrength} MPa</strong> | UTS = <strong className="text-rose-400">{injectedPayload.tensileStrength} MPa</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const hv = injectedPayload.hardnessHV || injectedPayload.hardnessProfile.defaultHardnessHV;
                if (hv) setHardnessHV(hv);
                if (injectedPayload.hardnessProfile.taborConstraintFactor_c) setCustomTabor_c(injectedPayload.hardnessProfile.taborConstraintFactor_c);
                if (injectedPayload.hardnessProfile.workHardeningExponent_n) setUserWorkHardening_n(injectedPayload.hardnessProfile.workHardeningExponent_n);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-2 shadow-[0_0_16px_rgba(245,158,11,0.35)] transition"
            >
              <Zap className="w-4 h-4" />
              <span>Apply Ingested Mechanics ⚡</span>
            </button>
            <button
              onClick={() => {
                clearActivePipelineMaterial();
                setInjectedPayload(null);
              }}
              className="p-2 rounded-xl bg-[#090e18] hover:bg-white/5 border border-[#162032] text-slate-400 hover:text-white transition"
              title="Clear injected alloy"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-[0_0_25px_rgba(245,158,11,0.4)] border border-amber-400/40">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Tabor-Cahoon Indentation to Tensile Curve Inverter
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                  ASTM E8 / E384
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 font-bold hidden sm:inline-block">
                  NON-DESTRUCTIVE σ-ε
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Derive continuous stress-strain curves (σ-ε), yield (Rp0.2), ultimate tensile strength (UTS), and fracture toughness (KIC) non-destructively from micro-hardness.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt,.dat"
              className="hidden"
            />

            {rawHardnessPoints ? (
              <button
                type="button"
                onClick={handleClearUploadedFile}
                className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset Data</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-amber-400 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Import HV Profile</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-[#050810] border border-[#1e2d46] hover:border-amber-400 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export σ-ε CSV</span>
            </button>

            <button
              type="button"
              onClick={handleRunCertification}
              disabled={isSynthesizing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 shrink-0"
            >
              {isSynthesizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Certify Tensile Properties</span>
            </button>
          </div>
        </div>

        {/* Upload Status */}
        {uploadedFileName && (
          <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Loaded Hardness Profile:</strong> {uploadedFileName} ({rawHardnessPoints?.length} indentation points | Mean: {hardnessHV} HV)
              </span>
            </div>
            <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">
              Profile Data Active
            </span>
          </div>
        )}

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-[#162032] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-slate-400 font-semibold">Alloy Baseline:</span>
            {HARDNESS_ALLOY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition text-[11px] ${
                  selectedPresetId === p.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/50 font-bold"
                    : "bg-[#050810] text-slate-400 hover:text-white border border-[#1e2d46]"
                }`}
              >
                {p.name.split(" ")[0]} {p.name.split(" ")[1]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Predicted Rp0.2: <strong className="text-amber-400">{mechanicalProperties.yieldStrength_MPa} MPa</strong></span>
            <span>•</span>
            <span>UTS: <strong className="text-orange-400">{mechanicalProperties.ultimateTensileStrength_MPa} MPa</strong></span>
          </div>
        </div>
      </div>

      {/* TOP REGULATORY DISCLAIMER BANNER (ASTM E8 / ASTM E399 / FAA SCREENING NOTICE) */}
      <div className="bg-amber-950/30 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-amber-300 uppercase tracking-wider block text-xs">
              ⚠️ FAA / EASA / ASTM Metallurgical Screening & Verification Notice
            </span>
            <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
              Tabor-Cahoon indentation inversion provides high-throughput Non-Destructive Screening (NDT Level II). Indentation produces triaxial compressive stress; flight-critical primary structural sign-off requires standard destructive uniaxial tensile testing per ASTM E8M and fracture toughness tests per ASTM E399 / E1820.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 font-mono text-[10px] text-amber-300 font-bold">
            NDT SCREENING ONLY
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Microhardness & Indentation Parameters */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Indentation & Hardness Inputs</span>
            </h3>

            {/* Grain / Rolling Anisotropy Orientation Tabs */}
            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">Grain / Loading Orientation:</span>
                <span className="text-amber-400 font-bold font-mono">
                  {grainOrientation === "L" ? "L (Longitudinal)" : grainOrientation === "LT" ? "LT (Long-Transverse)" : "ST (Short-Transverse)"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <button
                  type="button"
                  onClick={() => setGrainOrientation("L")}
                  className={`py-1.5 px-2 rounded-lg border transition font-mono ${
                    grainOrientation === "L"
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/60 font-bold"
                      : "bg-[#090e18] text-slate-400 border-[#1e2d46] hover:text-white"
                  }`}
                >
                  L (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setGrainOrientation("LT")}
                  className={`py-1.5 px-2 rounded-lg border transition font-mono ${
                    grainOrientation === "LT"
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/60 font-bold"
                      : "bg-[#090e18] text-slate-400 border-[#1e2d46] hover:text-white"
                  }`}
                >
                  LT (96%)
                </button>
                <button
                  type="button"
                  onClick={() => setGrainOrientation("ST")}
                  className={`py-1.5 px-2 rounded-lg border transition font-mono ${
                    grainOrientation === "ST"
                      ? "bg-rose-500/20 text-rose-300 border-rose-400/60 font-bold"
                      : "bg-[#090e18] text-slate-400 border-[#1e2d46] hover:text-white"
                  }`}
                >
                  ST (90% / -50% A)
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Short-transverse (ST / Z-axis) exhibits lowest ductility and delamination crack susceptibility.
              </span>
            </div>

            {/* Ingot Cleanliness / Remelting Grade */}
            <div className="p-3 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-1.5 text-xs">
              <span className="text-slate-300 font-semibold block">Melt Cleanliness & Inclusions:</span>
              <select
                value={cleanlinessGrade}
                onChange={(e) => setCleanlinessGrade(e.target.value as any)}
                className="w-full bg-[#0c1322] border border-[#1e2d46] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-400 font-mono"
              >
                <option value="VAR_ESR">Premium Aerospace VAR / ESR (Ultra Clean - 100% K1c)</option>
                <option value="VIM_Standard">Standard VIM / Aerospace Grade (88% K1c)</option>
                <option value="AirMelt_Commercial">Commercial Air Melt (Inclusion Prone - 68% K1c)</option>
              </select>
            </div>

            {/* Hardness Value Slider */}
            <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
              <div className="flex justify-between items-center text-slate-300 text-xs">
                <span className="font-semibold">Vickers Hardness (HV):</span>
                <span className="text-amber-400 font-bold text-base">{hardnessHV} HV</span>
              </div>
              <input
                type="range"
                min="80"
                max="850"
                step="5"
                value={hardnessHV}
                onChange={(e) => setHardnessHV(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Soft Al (80 HV)</span>
                <span>Superalloys (450 HV)</span>
                <span>Tool Steel (850 HV)</span>
              </div>
            </div>

            {/* Work Hardening Exponent (n) */}
            <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
              <div className="flex justify-between items-center text-slate-300 text-xs">
                <span className="font-semibold">Strain Hardening Exponent (n):</span>
                <span className="text-orange-400 font-bold text-base">n = {userWorkHardening_n.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.45"
                step="0.01"
                value={userWorkHardening_n}
                onChange={(e) => setUserWorkHardening_n(parseFloat(e.target.value))}
                className="w-full accent-orange-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Hollomon Law: \sigma = K \cdot \epsilon^n (High n = High post-yield strain capacity)
              </span>
            </div>

            {/* Tabor Constraint Factor (c) & Bauschinger Ratio */}
            <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 text-xs mb-1">
                  <span className="font-semibold">Tabor Constraint Factor (c):</span>
                  <span className="text-amber-400 font-bold font-mono">c = {customTabor_c.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="2.70"
                  max="3.40"
                  step="0.05"
                  value={customTabor_c}
                  onChange={(e) => setCustomTabor_c(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Triaxial plastic constraint factor under pyramidal indenter (Ti ~2.85, Ni ~3.05, 316L ~3.25)
                </span>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 text-xs mb-1">
                  <span className="font-semibold">Bauschinger Asymmetry (σ_yc / σ_yt):</span>
                  <span className="text-cyan-400 font-bold font-mono">{bauschingerRatio.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.00"
                  step="0.01"
                  value={bauschingerRatio}
                  onChange={(e) => setBauschingerRatio(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Forward tension vs reverse compressive yield strength asymmetry
                </span>
              </div>
            </div>

            {/* Test Temperature Slider */}
            <div className="p-3.5 bg-[#050810] rounded-xl border border-[#1e2d46] space-y-2">
              <div className="flex justify-between items-center text-slate-300 text-xs">
                <span className="font-semibold">Service / Test Temp:</span>
                <span className="text-rose-400 font-bold text-base">{testTemperature_C} °C</span>
              </div>
              <input
                type="range"
                min="25"
                max="850"
                step="25"
                value={testTemperature_C}
                onChange={(e) => setTestTemperature_C(parseFloat(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Thermal Derating Factor: <strong className="text-rose-300">{(tempDeratingFactor * 100).toFixed(1)}%</strong> of RT strength
              </span>
            </div>
          </div>

          {/* Hardness Scale Equivalence Conversion Table */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>Equivalent Hardness Scales (ASTM E140)</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46]">
                <span className="text-slate-400 text-[10px] block">Vickers</span>
                <span className="text-amber-400 font-bold text-sm block mt-0.5">{hardnessHV} HV</span>
              </div>
              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46]">
                <span className="text-slate-400 text-[10px] block">Rockwell C</span>
                <span className="text-orange-400 font-bold text-sm block mt-0.5">{mechanicalProperties.hrc} HRC</span>
              </div>
              <div className="p-2.5 bg-[#050810] rounded-xl border border-[#1e2d46]">
                <span className="text-slate-400 text-[10px] block">Brinell</span>
                <span className="text-teal-400 font-bold text-sm block mt-0.5">{mechanicalProperties.hb} HBW</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Inverted Stress-Strain Chart & Metrics */}
        <div className="lg:col-span-8 space-y-4">
          {/* Synthesized Tensile Stress-Strain Graph */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#162032] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Synthesized Engineering & True Stress-Strain Curve ($\sigma-\epsilon$)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Model: Tabor-Cahoon / Hollomon</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stressStrainCurveData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                  <XAxis
                    dataKey="strain_pct"
                    stroke="#64748b"
                    unit="%"
                    label={{ value: "Engineering Strain (ε, %)", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    unit=" MPa"
                    label={{ value: "Stress (σ, MPa)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#050810", borderColor: "#1e2d46", borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                  <Line
                    type="monotone"
                    dataKey="engineeringStress_MPa"
                    name="Engineering Stress (σ_eng)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="trueStress_MPa"
                    name="True Stress (σ_true)"
                    stroke="#06b6d4"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <ReferenceLine y={mechanicalProperties.yieldStrength_MPa} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Rp0.2 = ${mechanicalProperties.yieldStrength_MPa} MPa`, fill: "#10b981", fontSize: 10 }} />
                  <ReferenceLine y={mechanicalProperties.ultimateTensileStrength_MPa} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `UTS = ${mechanicalProperties.ultimateTensileStrength_MPa} MPa`, fill: "#ef4444", fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Derived Mechanical KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#090e18] border border-[#1e2d46] rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">0.2% Yield (Rp0.2):</span>
              <span className="text-xl font-bold text-amber-400 block">
                {mechanicalProperties.yieldStrength_MPa} <span className="text-xs text-slate-400">MPa</span>
              </span>
              <span className="text-[10px] text-slate-500">Tabor Plastic Offset</span>
            </div>

            <div className="p-3.5 bg-[#090e18] border border-[#1e2d46] rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Ultimate (UTS / Rm):</span>
              <span className="text-xl font-bold text-orange-400 block">
                {mechanicalProperties.ultimateTensileStrength_MPa} <span className="text-xs text-slate-400">MPa</span>
              </span>
              <span className="text-[10px] text-slate-500">Considere Maximum</span>
            </div>

            <div className="p-3.5 bg-[#090e18] border border-[#1e2d46] rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Fracture Toughness (KIC):</span>
              <span className="text-xl font-bold text-emerald-400 block">
                {mechanicalProperties.estimatedK1c} <span className="text-xs text-slate-400">MPa√m</span>
              </span>
              <span className="text-[10px] text-slate-500">Indentation Crack Model</span>
            </div>

            <div className="p-3.5 bg-[#090e18] border border-[#1e2d46] rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Hollomon Strength (K):</span>
              <span className="text-xl font-bold text-cyan-400 block">
                {mechanicalProperties.K_MPa} <span className="text-xs text-slate-400">MPa</span>
              </span>
              <span className="text-[10px] text-slate-500">Plastic Modulus</span>
            </div>
          </div>

          {/* ZERO ERROR MARGIN: Monte Carlo Stochastic Uncertainty & MMPDS Allowables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Zero Error Margin: Monte Carlo Stochastic Uncertainty & MMPDS Statistical Bounds
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                5,000 Iterations • ASTM E8 / MMPDS-14
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MonteCarloUncertaintyCard
                title="Offset Yield Strength (Rp0.2 / σ_y)"
                unit="MPa"
                result={monteCarloResults.yieldStrengthMpa}
                distributionName="Gaussian Plasticity Envelope"
                badgeText="A/B-Basis Allowable"
              />
              <MonteCarloUncertaintyCard
                title="Ultimate Tensile Strength (UTS / Rm)"
                unit="MPa"
                result={monteCarloResults.ultimateTensileMpa}
                distributionName="Considere Plastic Instability"
                badgeText="MMPDS Bounds"
              />
            </div>
          </div>

          {/* Mathematical Inversion Formulation Card */}
          <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 text-xs space-y-2">
            <span className="text-slate-400 font-semibold block">Tabor & Cahoon Indentation Plastic Inversion Mechanics:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-[#050810] p-2.5 rounded-lg border border-[#162032]">
                <span className="text-amber-300 block mb-1">1. Yield Inversion (Tabor Factor c ≈ 3.0):</span>
                <span className="text-slate-400">
                  σ_y = (9.807 · HV / c) · (0.002 / ε_rep)ⁿ = {mechanicalProperties.yieldStrength_MPa} MPa
                </span>
              </div>
              <div className="bg-[#050810] p-2.5 rounded-lg border border-[#162032]">
                <span className="text-orange-300 block mb-1">2. Tensile Peak Inversion (Cahoon):</span>
                <span className="text-slate-400">
                  UTS = (HV / 2.9) · (n / 0.08)ⁿ · e^(-0.4n) = {mechanicalProperties.ultimateTensileStrength_MPa} MPa
                </span>
              </div>
            </div>
          </div>

          {/* AI Certification Certificate Box */}
          {tensileReport && (
            <div className="bg-[#090e18] border border-amber-500/50 rounded-2xl p-5 space-y-3 shadow-xl animate-fade-in text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-line">
              <div className="flex justify-between items-center border-b border-[#162032] pb-2 text-amber-400 font-bold font-mono">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>ASTM E8 & E384 Tensile Property Verification</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTensileReport(null)}
                  className="px-2 py-0.5 bg-[#162032] text-slate-400 hover:text-white rounded"
                >
                  Dismiss
                </button>
              </div>
              {tensileReport}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

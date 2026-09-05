import React, { useState, useMemo } from "react";
import {
  BatteryCharging,
  Battery,
  Zap,
  Activity,
  Layers,
  Flame,
  Thermometer,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Cpu,
  Shield,
  Clock,
  Gauge,
  Wind,
  Droplets,
  Atom,
} from "lucide-react";
import { BatteryEISDegradationStudio } from "./BatteryEISDegradationStudio";
import { AdvancedBatteryPhysicsStudio } from "./AdvancedBatteryPhysicsStudio";

interface BatteryChemistryDetail {
  id: string;
  name: string;
  abbreviation: string;
  category: "Commercial Li-Ion" | "Next-Gen Solid State" | "Sodium-Ion" | "High-Voltage Layered" | "Metal-Air";
  anode: string;
  anodeCapacity: number; // mAh/g
  anodeVolumeExpansion: number; // % volume change upon full lithiation/oxidation
  cathode: string;
  cathodeFormula: string;
  cathodeCapacity: number; // mAh/g
  cathodeVolumeExpansion: number; // %
  electrolyte: string;
  separator: string;
  nominalVoltage: number; // Volts
  cutoffVoltageUpper: number; // Volts
  cutoffVoltageLower: number; // Volts
  theoreticalEnergyDensity: number; // Wh/kg active material
  practicalEnergyDensity: number; // Wh/kg pack level
  cycleLifeNominal: number; // cycles to 80% SOH at 1C / 25°C
  thermalRunawayTemp: number; // °C
  diffusionCoefficientLi: string; // cm²/s or ionic transport
  crystalSpaceGroup: string;
  diffPathways: string;
  seiComponents: string[];
  degradationPhenomena: string[];
  optimalTempRange: string;
  // Specific for Metal-Air & Advanced Systems
  metalAirSpecs?: {
    orrCatalyst: string;
    oerCatalyst: string;
    reactionDischarge: string;
    reactionCharge?: string;
    oxygenSource: string;
    electrolyteType: "Aqueous Alkaline" | "Aqueous Acidic" | "Aprotic Non-Aqueous" | "Solid Ionic";
    overpotentialEta: number; // Volts (round-trip overpotential penalty)
    carbonationRisk: string; // CO2 scrubbing & K2CO3 precipitation
    waterLossOrFlooding: string;
    dendriteShape: string;
  };
}

const BATTERY_CHEMISTRIES: BatteryChemistryDetail[] = [
  {
    id: "zn-air",
    name: "Zinc-Air Battery (Aqueous Alkaline)",
    abbreviation: "Zn-Air (Metal-Air)",
    category: "Metal-Air",
    anode: "Porous Zinc Gel / Sponge (Pure Zn)",
    anodeCapacity: 820,
    anodeVolumeExpansion: 60, // Zn to ZnO molar volume expansion
    cathode: "Porous Carbon Gas Diffusion Electrode (GDE) + ORR/OER Catalyst",
    cathodeFormula: "O₂ (Ambient Air Cathode) / Co₃O₄-NiFe-LDH",
    cathodeCapacity: 1200, // Apparent catalytic capacity (unlimited air reactant)
    cathodeVolumeExpansion: 0,
    electrolyte: "6.0 M - 9.0 M KOH in H₂O (Aqueous Alkaline) + 25g/L ZnO additive",
    separator: "Hydrophilic Microporous Polypropylene (Celgard 3501 / PVA-matrix)",
    nominalVoltage: 1.25,
    cutoffVoltageUpper: 2.05, // Recharge charging voltage (high OER overpotential)
    cutoffVoltageLower: 0.9,
    theoreticalEnergyDensity: 1086,
    practicalEnergyDensity: 460,
    cycleLifeNominal: 650, // Electrically rechargeable (mechanical refuel can exceed 3000)
    thermalRunawayTemp: 320, // Intrinsically safe non-flammable aqueous electrolyte
    diffusionCoefficientLi: "1.8 × 10⁻⁵ (OH⁻ / Zn(OH)₄²⁻ mobility)",
    crystalSpaceGroup: "Hexagonal P6₃/mmc (Zn metal) → Wurtzite P6₃mc (ZnO)",
    diffPathways: "3D liquid convection & GDE triple-phase boundary (TPB: Gas-Electrolyte-Solid)",
    seiComponents: ["ZnO passivation shell", "Zn(OH)₂ passive film", "K₂CO₃ carbonate crust"],
    degradationPhenomena: [
      "Zinc dendritic growth during electrodeposition causing internal short circuits",
      "Hydrogen Evolution Reaction (HER) parasitic corrosion: Zn + 2H₂O → Zn(OH)₂ + H₂↑",
      "Electrolyte carbonation via atmospheric CO₂: 2KOH + CO₂ → K₂CO₃↓ + H₂O (pore clogging)",
      "Cathode carbon corrosion during high-voltage OER charging (>1.8V vs Zn)",
      "Electrolyte dry-out / evaporation in low humidity vs moisture flooding in high humidity",
      "Zinc shape change & redistribution on the current collector during cycling",
    ],
    optimalTempRange: "10°C to 45°C",
    metalAirSpecs: {
      orrCatalyst: "Pt/C or Fe-N-C Single-Atom Catalysts or MnO₂ Nanorods",
      oerCatalyst: "NiFe-LDH (Layered Double Hydroxide) or RuO₂ / IrO₂ or Co₃O₄",
      reactionDischarge: "Anode: Zn + 4OH⁻ → Zn(OH)₄²⁻ + 2e⁻ (→ ZnO + H₂O) | Cathode: O₂ + 2H₂O + 4e⁻ → 4OH⁻ (E° = 1.65V)",
      reactionCharge: "Cathode (OER): 4OH⁻ → O₂ + 2H₂O + 4e⁻ | Anode: ZnO + H₂O + 2e⁻ → Zn + 2OH⁻",
      oxygenSource: "Atmospheric Ambient O₂ (requires hydrophobic breathable gas-diffusion membrane)",
      electrolyteType: "Aqueous Alkaline",
      overpotentialEta: 0.78, // High round-trip overpotential (Discharge ~1.2V, Charge ~2.0V)
      carbonationRisk: "Critical: Atmospheric CO₂ reacts with KOH to form insoluble K₂CO₃ crystals, choking gas diffusion pores.",
      waterLossOrFlooding: "Open-cell dynamics require humidity-balanced gas diffusion layers to prevent evaporation or drowning.",
      dendriteShape: "Needle-like and mossy hyper-branched hexagonal zinc crystallites.",
    },
  },
  {
    id: "li-air",
    name: "Lithium-Air / Lithium-Oxygen (Aprotic)",
    abbreviation: "Li-Air (Metal-Air)",
    category: "Metal-Air",
    anode: "Protected Ultra-Thin Lithium Metal",
    anodeCapacity: 3860,
    anodeVolumeExpansion: 100, // hostless
    cathode: "Porous Carbon Nanotube / Graphene Gas Diffusion Mesh",
    cathodeFormula: "Li₂O₂ (Solid Peroxide Product) / O₂",
    cathodeCapacity: 1168, // Stoichiometric Li2O2 capacity
    cathodeVolumeExpansion: 85,
    electrolyte: "1.0 M LiTFSI in TEGDME (Tetraglyme) / DMSO with Redox Mediators",
    separator: "LATP / NASICON Solid Ceramic Buffer + Polyolefin",
    nominalVoltage: 2.96,
    cutoffVoltageUpper: 4.2,
    cutoffVoltageLower: 2.2,
    theoreticalEnergyDensity: 3458, // Highest theoretical battery chemistry
    practicalEnergyDensity: 680,
    cycleLifeNominal: 250,
    thermalRunawayTemp: 210,
    diffusionCoefficientLi: "3.2 × 10⁻⁸",
    crystalSpaceGroup: "Hexagonal P6₃/mmc (Li₂O₂ toroidal crystals)",
    diffPathways: "3D aprotic solvent diffusion + dissolved O₂ transport",
    seiComponents: ["Li₂CO₃", "LiF", "LiOH", "Polymeric ethers"],
    degradationPhenomena: [
      "Insulating Li₂O₂ toroidal toroid passivation of cathode pores (sudden capacity choking)",
      "Singlet oxygen (¹O₂) parasitic attack decomposing ether electrolytes and carbon cathode",
      "Li metal corrosion by ambient H₂O and CO₂ crossover from open atmosphere",
      "Extremely large charge overpotential (>1.3V) due to slow decomposition of solid Li₂O₂",
    ],
    optimalTempRange: "20°C to 40°C (requires pure O₂ or selective gas membranes)",
    metalAirSpecs: {
      orrCatalyst: "RuO₂ nanoparticles / Co₃O₄ / Nitrogen-doped Graphene / Pt nanoparticles",
      oerCatalyst: "Redox Mediators (TEMPO, DMPZ, Lil, RuO₂)",
      reactionDischarge: "Anode: 2Li → 2Li⁺ + 2e⁻ | Cathode: 2Li⁺ + O₂ + 2e⁻ → Li₂O₂ (E° = 2.96V)",
      reactionCharge: "Cathode: Li₂O₂ → 2Li⁺ + O₂ + 2e⁻ (Facilitated by Redox Mediators at 3.6-4.0V)",
      oxygenSource: "Pure Oxygen Tank or Selective Polymeric Oxygen-Permeable Membrane",
      electrolyteType: "Aprotic Non-Aqueous",
      overpotentialEta: 1.15,
      carbonationRisk: "Severe: Reacts with ambient CO₂ to form thermodynamically stubborn Li₂CO₃ (>4.3V to decompose).",
      waterLossOrFlooding: "Trace moisture (>10 ppm) triggers immediate H₂ evolution and vigorous LiOH corrosion.",
      dendriteShape: "Whiskers and tree-like lithium dendrites penetrating separator.",
    },
  },
  {
    id: "al-air",
    name: "Aluminum-Air (Primary High-Density)",
    abbreviation: "Al-Air (Metal-Air)",
    category: "Metal-Air",
    anode: "High-Purity Aluminum Alloy (Al-Ga-In or Al 99.99%)",
    anodeCapacity: 2980,
    anodeVolumeExpansion: 120,
    cathode: "Porous Carbon Gas Diffusion Cathode (Ag/MnO₂ catalyst)",
    cathodeFormula: "O₂ (Ambient Air) / Al(OH)₃",
    cathodeCapacity: 1400,
    cathodeVolumeExpansion: 0,
    electrolyte: "4.0 M KOH / NaOH or 15% NaCl Saline (Aqueous)",
    separator: "Non-woven Polypropylene / Hydrophobic GDE",
    nominalVoltage: 1.35,
    cutoffVoltageUpper: 1.75,
    cutoffVoltageLower: 0.85,
    theoreticalEnergyDensity: 2790,
    practicalEnergyDensity: 520,
    cycleLifeNominal: 120, // Primarily mechanical refuel (solid Al anode replacement)
    thermalRunawayTemp: 350,
    diffusionCoefficientLi: "2.1 × 10⁻⁵ (Al(OH)₄⁻ diffusion)",
    crystalSpaceGroup: "Cubic Fm-3m (Al) → Monoclinic P2₁/n (Bayerite Al(OH)₃)",
    diffPathways: "Aqueous bulk convection + GDE gas diffusion",
    seiComponents: ["Al₂O₃ passivating film", "Al(OH)₃ precipitation gel"],
    degradationPhenomena: [
      "Severe self-discharge via parasitic hydrogen corrosion: 2Al + 6H₂O → 2Al(OH)₃ + 3H₂↑",
      "Al(OH)₃ gel precipitation blocking electrolyte flow channels",
      "Passivation layer high overvoltage under open-circuit standby",
      "Non-electrically rechargeable in aqueous systems (requires mechanical anode cartridge swap)",
    ],
    optimalTempRange: "15°C to 50°C",
    metalAirSpecs: {
      orrCatalyst: "Silver (Ag/C) or Manganese Dioxide (MnO₂) or Cobalt Phthalocyanine",
      oerCatalyst: "N/A (Primarily mechanically replaceable / consumable metal cassette)",
      reactionDischarge: "Anode: Al + 4OH⁻ → Al(OH)₄⁻ + 3e⁻ (→ Al(OH)₃ + OH⁻) | Cathode: O₂ + 2H₂O + 4e⁻ → 4OH⁻ (E° = 2.71V theoretical)",
      oxygenSource: "Atmospheric Ambient O₂ with forced draft airflow",
      electrolyteType: "Aqueous Alkaline",
      overpotentialEta: 1.36, // Large difference between theoretical 2.71V and operating 1.35V
      carbonationRisk: "Moderate: Requires periodic KOH purging and Al(OH)₃ sludge filtration.",
      waterLossOrFlooding: "Water consumed during discharge: 2Al + 3/2 O₂ + 3H₂O → 2Al(OH)₃.",
      dendriteShape: "Porous dissolution pitting, no plating dendrites in primary mode.",
    },
  },
  {
    id: "lfp",
    name: "Lithium Iron Phosphate",
    abbreviation: "LFP",
    category: "Commercial Li-Ion",
    anode: "Synthetic Graphite (C₆)",
    anodeCapacity: 372,
    anodeVolumeExpansion: 10,
    cathode: "Lithium Iron Phosphate",
    cathodeFormula: "LiFePO₄",
    cathodeCapacity: 170,
    cathodeVolumeExpansion: 6.8, // two-phase LiFePO4 <-> FePO4
    electrolyte: "1.0 M LiPF₆ in EC/EMC (3:7 wt%) + 2% VC",
    separator: "Polypropylene (Celgard 2500) 25 µm",
    nominalVoltage: 3.2,
    cutoffVoltageUpper: 3.65,
    cutoffVoltageLower: 2.5,
    theoreticalEnergyDensity: 580,
    practicalEnergyDensity: 170,
    cycleLifeNominal: 4500,
    thermalRunawayTemp: 270,
    diffusionCoefficientLi: "10⁻¹⁴ to 10⁻¹²",
    crystalSpaceGroup: "Orthorhombic Pnma (Olivine)",
    diffPathways: "1D zig-zag channels parallel to [010] b-axis",
    seiComponents: ["LiF", "Li₂CO₃", "ROCO₂Li (Lithium alkyl carbonates)", "Li₂O"],
    degradationPhenomena: [
      "Iron dissolution (Fe²⁺/Fe³⁺ leaching) and deposition on anode SEI",
      "Graphite exfoliation from solvent co-intercalation",
      "Loss of lithium inventory (LLI) via continuous SEI thickening",
      "Antisite defects (Fe on Li sites) blocking 1D diffusion channels",
    ],
    optimalTempRange: "15°C to 35°C",
  },
  {
    id: "nmc811",
    name: "High-Nickel NMC (8:1:1)",
    abbreviation: "NMC811",
    category: "High-Voltage Layered",
    anode: "Silicon-Graphite Composite (10 wt% SiOx + 90 wt% Graphite)",
    anodeCapacity: 550,
    anodeVolumeExpansion: 38,
    cathode: "Nickel Manganese Cobalt Oxide (8:1:1)",
    cathodeFormula: "LiNi₀.₈Mn₀.₁Co₀.₁O₂",
    cathodeCapacity: 220,
    cathodeVolumeExpansion: 7.5,
    electrolyte: "1.2 M LiPF₆ in EC/EMC/DMC + 5% FEC (Fluoroethylene Carbonate)",
    separator: "Ceramic-coated Polyethylene (Al₂O₃ on PE) 16 µm",
    nominalVoltage: 3.7,
    cutoffVoltageUpper: 4.25,
    cutoffVoltageLower: 2.8,
    theoreticalEnergyDensity: 820,
    practicalEnergyDensity: 295,
    cycleLifeNominal: 1600,
    thermalRunawayTemp: 195,
    diffusionCoefficientLi: "10⁻¹¹ to 10⁻¹⁰",
    crystalSpaceGroup: "Trigonal R-3m (α-NaFeO₂ Layered Rock-Salt)",
    diffPathways: "2D Li⁺ planar diffusion between MO₂ octahedral slabs",
    seiComponents: ["LiF (dense from FEC)", "Li₂CO₃", "Poly-VC oligomers", "Polyfluorophosphates"],
    degradationPhenomena: [
      "H2 → H3 phase transition sudden lattice contraction at >4.15V causing microcracking",
      "Ni⁴⁺ surface catalytic oxidation of carbonate solvents with O₂ gas evolution",
      "Cation mixing (Ni²⁺ occupying Li⁺ 3b sites due to similar ionic radius 0.69 Å)",
      "Intergranular to intragranular particle fracture under anisotropic breathing strain",
      "Transition metal dissolution (Mn/Ni) migrating across separator to poison anode",
    ],
    optimalTempRange: "20°C to 35°C",
  },
  {
    id: "lco",
    name: "Lithium Cobalt Oxide",
    abbreviation: "LCO",
    category: "Commercial Li-Ion",
    anode: "Mesocarbon Microbeads (MCMB)",
    anodeCapacity: 350,
    anodeVolumeExpansion: 9,
    cathode: "Lithium Cobalt Oxide",
    cathodeFormula: "LiCoO₂",
    cathodeCapacity: 160,
    cathodeVolumeExpansion: 4.2,
    electrolyte: "1.0 M LiPF₆ in EC/DEC",
    separator: "Trilayer PP/PE/PP (Celgard 2325) 25 µm",
    nominalVoltage: 3.85,
    cutoffVoltageUpper: 4.45,
    cutoffVoltageLower: 3.0,
    theoreticalEnergyDensity: 650,
    practicalEnergyDensity: 245,
    cycleLifeNominal: 1000,
    thermalRunawayTemp: 160,
    diffusionCoefficientLi: "10⁻¹² to 10⁻¹¹",
    crystalSpaceGroup: "Trigonal R-3m (Layered)",
    diffPathways: "2D planar diffusion",
    seiComponents: ["Li₂CO₃", "LiF", "ROCO₂Li"],
    degradationPhenomena: [
      "Structural degradation upon removing >50% Li (above 4.2V triggering hexagonal to monoclinic phase)",
      "Severe oxygen release and thermal runaway exotherm at lower thresholds",
      "Cobalt dissolution in presence of trace HF from electrolyte moisture",
    ],
    optimalTempRange: "15°C to 30°C",
  },
  {
    id: "ssb-llzo",
    name: "All-Solid-State Lithium Metal (Garnet LLZO)",
    abbreviation: "Solid-State SSB",
    category: "Next-Gen Solid State",
    anode: "Ultra-thin Pure Lithium Metal (20 µm)",
    anodeCapacity: 3860,
    anodeVolumeExpansion: 100, // infinite relative to host-free
    cathode: "Single-Crystal High-Ni NMC coated with LiNbO₃ buffer",
    cathodeFormula: "LiNbO₃-coated LiNi₀.₈₅Mn₀.₀₇₅Co₀.₀₇₅O₂",
    cathodeCapacity: 225,
    cathodeVolumeExpansion: 5.2,
    electrolyte: "Li₇La₃Zr₂O₁₂ (LLZO Garnet Solid Ceramic) + Ionic Conductor Interlayer",
    separator: "Integrated Solid Electrolyte Separator (40 µm)",
    nominalVoltage: 3.85,
    cutoffVoltageUpper: 4.35,
    cutoffVoltageLower: 2.8,
    theoreticalEnergyDensity: 1100,
    practicalEnergyDensity: 420,
    cycleLifeNominal: 2200,
    thermalRunawayTemp: 380,
    diffusionCoefficientLi: "10⁻⁸ (bulk solid electrolyte)",
    crystalSpaceGroup: "Cubic Ia-3d (Cubic Garnet)",
    diffPathways: "3D isotropic interconnected interstitial Li pathways",
    seiComponents: ["Self-passivating Li₂O / Li₂CO₃ / Li₃N interfacial film"],
    degradationPhenomena: [
      "Lithium dendrite growth through ceramic grain boundaries under high current density (above CCD)",
      "Chemo-mechanical voiding at Li/electrolyte interface during fast stripping",
      "Interfacial space-charge layer high impedance requiring 2-5 MPa external stack pressure",
    ],
    optimalTempRange: "25°C to 60°C",
  },
  {
    id: "na-ion",
    name: "Sodium-Ion Battery (NASICON / NFPP)",
    abbreviation: "Na-Ion",
    category: "Sodium-Ion",
    anode: "Hard Carbon (Bio-derived Pyrolyzed Matrix)",
    anodeCapacity: 300,
    anodeVolumeExpansion: 14,
    cathode: "Sodium Vanadium / Iron Fluorophosphate",
    cathodeFormula: "Na₃V₂(PO₄)₂F₃ / Na₄Fe₃(PO₄)₂(P₂O₇)",
    cathodeCapacity: 135,
    cathodeVolumeExpansion: 3.5,
    electrolyte: "1.0 M NaPF₆ in PC/EC (Propylene Carbonate non-flammable)",
    separator: "Cellulose / Glass Microfiber Matrix",
    nominalVoltage: 3.1,
    cutoffVoltageUpper: 3.9,
    cutoffVoltageLower: 1.8,
    theoreticalEnergyDensity: 480,
    practicalEnergyDensity: 155,
    cycleLifeNominal: 4000,
    thermalRunawayTemp: 290,
    diffusionCoefficientLi: "10⁻¹² (Na⁺ diffusion)",
    crystalSpaceGroup: "Tetragonal P4₂/mnm (3D NASICON Framework)",
    diffPathways: "3D open tunnels accommodating larger Na⁺ ionic radius (1.02 Å)",
    seiComponents: ["Na₂CO₃", "NaF", "Sodium alkyl carbonates"],
    degradationPhenomena: [
      "Lower Initial Coulombic Efficiency (ICE ~82%) due to large first-cycle hard carbon SEI",
      "Hard carbon pore plugging by high-order decomposition species",
      "Vanadium dissolution in extreme overcharge regimes",
    ],
    optimalTempRange: "-20°C to 45°C (Superior Cold Performance)",
  },
];

export function BatteryEngineeringLab() {
  const [selectedId, setSelectedId] = useState<string>("zn-air");
  const [activeTab, setActiveTab] = useState<"diagnostics" | "metal-air-engine" | "soh-aging" | "p2d-physics" | "eis-degradation" | "thermal">("p2d-physics");

  // Simulation Parameters
  const [cycles, setCycles] = useState<number>(180);
  const [cRate, setCRate] = useState<number>(0.8); // C-rate
  const [temp, setTemp] = useState<number>(25); // °C
  const [depthOfDischarge, setDepthOfDischarge] = useState<number>(80); // 80% DOD
  const [cellCapacityAh, setCellCapacityAh] = useState<number>(85); // 85 Ah cell

  // Metal-Air specific interactive parameters
  const [relativeHumidity, setRelativeHumidity] = useState<number>(50); // % RH
  const [co2ScrubberEfficiency, setCo2ScrubberEfficiency] = useState<number>(95); // % CO2 filtered
  const [airFlowRateLpm, setAirFlowRateLpm] = useState<number>(2.5); // L/min

  const chem = useMemo(
    () => BATTERY_CHEMISTRIES.find((b) => b.id === selectedId) || BATTERY_CHEMISTRIES[0],
    [selectedId]
  );

  const isMetalAir = chem.category === "Metal-Air";

  // Degradation Model: SOH Calculation based on Arrhenius Kinetics + SEI/Corrosion Growth + Mechanical Fatigue
  const { soh, capacityLossPercent, resistanceGrowthRatio, lithiumPlatingRisk, metalAirSpecificLoss } = useMemo(() => {
    // Temperature Arrhenius Factor
    const tempStressSEI = Math.exp((temp - 25) / 24);
    // Cold stress (lithium/metal plating risk below 15°C proportional to C-rate)
    const coldPlatingStress = temp < 15 ? Math.pow((15 - temp) / 10, 1.8) * Math.pow(cRate, 1.5) : 0;
    
    // C-Rate Mechanical Stress (anisotropic breathing & microcracking / GDE stress)
    const mechStress = Math.pow(cRate, isMetalAir ? 0.75 : 0.48);
    // DOD Stress (higher DOD expands volume change)
    const dodStress = Math.pow(depthOfDischarge / 80, 0.65);

    // Baseline cycle progress
    const cycleRatio = cycles / chem.cycleLifeNominal;
    
    // Total capacity degradation %
    const seiLoss = (isMetalAir ? 18 : 12) * Math.sqrt(cycleRatio) * tempStressSEI;
    const mechLoss = 8 * Math.pow(cycleRatio, 1.2) * mechStress * dodStress;
    const platingLoss = coldPlatingStress * 4.5 * (cycles / 100);

    // Metal-Air environmental penalties (CO2 carbonation + dryout/flooding)
    let metalAirPenalty = 0;
    if (isMetalAir) {
      const co2Leakage = (100 - co2ScrubberEfficiency) / 100;
      const humidityDeviation = Math.abs(relativeHumidity - 50) / 50;
      metalAirPenalty = (co2Leakage * 16 + humidityDeviation * 12) * (cycles / chem.cycleLifeNominal);
    }

    const totalLoss = Math.min(85, seiLoss + mechLoss + platingLoss + metalAirPenalty);
    const calculatedSoh = Math.max(15, 100 - totalLoss);

    // Resistance growth (R_sei + R_ct + GDE carbonation clogging)
    const rGrowth = 1.0 + (totalLoss / 100) * (isMetalAir ? 3.5 : 2.2) + (temp < 0 ? (0 - temp) * 0.05 : 0);

    return {
      soh: parseFloat(calculatedSoh.toFixed(1)),
      capacityLossPercent: parseFloat(totalLoss.toFixed(1)),
      resistanceGrowthRatio: parseFloat(rGrowth.toFixed(2)),
      lithiumPlatingRisk: !isMetalAir && (coldPlatingStress > 1.2 || (temp < 5 && cRate > 1.0)),
      metalAirSpecificLoss: parseFloat(metalAirPenalty.toFixed(1)),
    };
  }, [cycles, cRate, temp, depthOfDischarge, chem, isMetalAir, co2ScrubberEfficiency, relativeHumidity]);

  // Joule Heating & Thermal Runaway Metrics
  const dischargeCurrent_A = cellCapacityAh * cRate;
  const baseR_mOhm = chem.id === "zn-air" ? 4.5 : chem.id === "al-air" ? 6.0 : chem.id === "li-air" ? 12.0 : chem.id === "ssb-llzo" ? 1.6 : chem.id === "lfp" ? 1.1 : 0.75;
  const currentR_mOhm = baseR_mOhm * resistanceGrowthRatio;
  
  const jouleHeatWatts = useMemo(() => {
    // P = I² * R + entropic / overpotential polarization heat (I * eta)
    const iSqR = Math.pow(dischargeCurrent_A, 2) * (currentR_mOhm / 1000);
    const overpotentialLoss = isMetalAir && chem.metalAirSpecs ? dischargeCurrent_A * (chem.metalAirSpecs.overpotentialEta * 0.5) : dischargeCurrent_A * 0.035;
    return iSqR + overpotentialLoss;
  }, [dischargeCurrent_A, currentR_mOhm, isMetalAir, chem]);

  // Oxygen Flow Requirement for Metal-Air
  // Faraday: n = (I * t) / (z * F) -> for O2, z = 4 electrons
  // 1 Ampere = 1 C/s -> O2 consumption rate = (I / (4 * 96485)) mol/s -> * 24.45 L/mol * 60 s/min
  const o2ConsumptionLpm = useMemo(() => {
    if (!isMetalAir) return 0;
    const molPerSecO2 = dischargeCurrent_A / (4 * 96485);
    const litersPerMinPureO2 = molPerSecO2 * 24.45 * 60;
    // Air is 21% O2
    return litersPerMinPureO2 / 0.21;
  }, [isMetalAir, dischargeCurrent_A]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#090e18] p-5 rounded-2xl border border-[#162032] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
            <BatteryCharging className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white font-mono tracking-wide uppercase">
                Battery & Electrochemical Energy Lab
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">
                Metal-Air / Solid-State / Li-Ion / SIB
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Zinc-Air ORR/OER Catalysis, Solid-State Crystal Channels, SEI Kinetics, SOH Degradation & Gas Diffusion
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-[#050810] rounded-xl border border-[#162032] overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setActiveTab("diagnostics");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "diagnostics"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cathode & Lattice Specs</span>
          </button>

          {isMetalAir && (
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
                setActiveTab("metal-air-engine");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "metal-air-engine"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  : "text-amber-400 hover:text-amber-200 bg-amber-950/20 border border-amber-900/30"
              }`}
            >
              <Wind className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Metal-Air & ORR/OER Lab</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setActiveTab("p2d-physics");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "p2d-physics"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                : "text-emerald-400 hover:text-emerald-200 bg-emerald-950/25 border border-emerald-900/40"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>P2D Continuum &amp; LLI/LAM Studio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setActiveTab("soh-aging");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "soh-aging"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>SOH Aging & Cycle Life</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setActiveTab("eis-degradation");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "eis-degradation"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "text-emerald-400 hover:text-emerald-200 bg-emerald-950/20 border border-emerald-900/30"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>EIS &amp; Fast-Charge Plating</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setActiveTab("thermal");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "thermal"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Thermal & Joule Heat</span>
          </button>
        </div>
      </div>

      {/* Battery Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {BATTERY_CHEMISTRIES.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
              setSelectedId(b.id);
            }}
            className={`p-3 rounded-xl border text-left transition relative overflow-hidden ${
              selectedId === b.id
                ? b.category === "Metal-Air"
                  ? "bg-amber-500/15 border-amber-400 text-white shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                  : "bg-emerald-500/15 border-emerald-400 text-white shadow-[0_0_14px_rgba(16,185,129,0.25)]"
                : "bg-[#090e18] border-[#162032] text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            {b.category === "Metal-Air" && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]"></span>
            )}
            <span className={`text-xs font-bold font-mono block tracking-tight ${b.category === "Metal-Air" ? "text-amber-400" : "text-emerald-400"}`}>
              {b.abbreviation}
            </span>
            <span className="text-[10px] text-slate-300 font-sans line-clamp-1 mt-0.5">{b.name}</span>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-[#162032] pt-1">
              <span>{b.nominalVoltage}V</span>
              <span className={b.category === "Metal-Air" ? "text-amber-300 font-bold" : "text-emerald-300 font-bold"}>
                {b.practicalEnergyDensity} Wh/kg
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 1. CATHODE & CRYSTAL LATTICE SPECIFICATIONS              */}
      {/* ======================================================== */}
      {activeTab === "diagnostics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>{chem.name} Crystallographic Profile</span>
                </h3>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                  isMetalAir ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-slate-400"
                }`}>
                  {chem.category}
                </span>
              </div>

              {/* Formula & Lattice Space Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    {isMetalAir ? "Cathode Oxygen / Catalyst Formula" : "Stoichiometric Formula"}
                  </span>
                  <span className="text-sm font-bold text-emerald-400">{chem.cathodeFormula}</span>
                </div>
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Crystal Space Group & Phase</span>
                  <span className="text-sm font-bold text-sky-400">{chem.crystalSpaceGroup}</span>
                </div>
              </div>

              {/* Intercalation / Phase Reaction Channel Description */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <span className="text-[11px] text-slate-300 font-mono uppercase tracking-wider block font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ionic Transport & Triple-Phase Boundary Kinetics:</span>
                </span>
                <p className="text-xs text-slate-300 font-mono leading-relaxed">{chem.diffPathways}</p>
                <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-[#162032]">
                  <span className="text-slate-400">Ionic Diffusion / Transport Coeff:</span>
                  <span className="text-white font-bold">{chem.diffusionCoefficientLi} cm²/s</span>
                </div>
              </div>

              {/* Degradation Modes List */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2.5">
                <span className="text-[11px] text-slate-300 font-mono uppercase tracking-wider block font-bold">
                  Key Metallurgical & Interfacial Degradation Modes:
                </span>
                <ul className="space-y-1.5 text-xs font-mono text-slate-300">
                  {chem.degradationPhenomena.map((d, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right Panel: Electrochemical Parameter Matrix */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  <span>Cell Level Architecture</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block">Nominal Voltage</span>
                  <span className="text-base font-bold text-white">{chem.nominalVoltage} V</span>
                </div>
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block">Theoretical Energy</span>
                  <span className="text-base font-bold text-amber-300">{chem.theoreticalEnergyDensity} Wh/kg</span>
                </div>
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block">Anode Material</span>
                  <span className="text-xs font-bold text-emerald-400 line-clamp-1">{chem.anode}</span>
                  <span className="text-[10px] text-slate-400">{chem.anodeCapacity} mAh/g ({chem.anodeVolumeExpansion}% exp.)</span>
                </div>
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block">Electrolyte System</span>
                  <span className="text-xs font-bold text-sky-300 line-clamp-1">{chem.electrolyte}</span>
                </div>
              </div>

              {/* SEI / Passivation Layer Composition */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2">
                <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider block">
                  {isMetalAir ? "Anode Passivation Shell & Insoluble Crust Species" : "Dominant SEI Passivation Layer Species"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {chem.seiComponents.map((sei, i) => (
                    <span key={i} className="px-2 py-1 bg-[#0c1322] border border-[#1e2d46] text-sky-300 font-mono text-[11px] rounded">
                      {sei}
                    </span>
                  ))}
                </div>
              </div>

              {/* Thermal Runaway Safety Bar */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thermal Runaway / Breakdown (T_onset):</span>
                  </span>
                  <span className="text-amber-400 font-bold text-sm">{chem.thermalRunawayTemp} °C</span>
                </div>
                <div className="w-full bg-[#0c1322] h-2 rounded-full overflow-hidden border border-[#162032]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                    style={{ width: `${Math.min(100, (chem.thermalRunawayTemp / 400) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Optimal Operating Window: {chem.optimalTempRange}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. METAL-AIR CATALYSIS & GAS-DIFFUSION ELECTRODE LAB     */}
      {/* ======================================================== */}
      {activeTab === "metal-air-engine" && isMetalAir && chem.metalAirSpecs && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {/* Electrocatalytic ORR/OER Bifunctional Specs */}
            <div className="bg-[#090e18] p-5 rounded-xl border border-amber-500/30 space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-amber-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Atom className="w-4 h-4 text-amber-400" />
                  <span>{chem.name} — Electrocatalysis & ORR / OER Mechanisms</span>
                </h3>
                <span className="text-[11px] text-amber-300 font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                  {chem.metalAirSpecs.electrolyteType}
                </span>
              </div>

              {/* Chemical Equations */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-3 font-mono text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Discharge Reaction (Oxygen Reduction Reaction - ORR):</span>
                  </span>
                  <div className="p-2.5 bg-[#0c1322] rounded border border-emerald-900/40 text-slate-200 text-xs leading-relaxed font-bold">
                    {chem.metalAirSpecs.reactionDischarge}
                  </div>
                </div>

                {chem.metalAirSpecs.reactionCharge && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-sky-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 text-sky-400" />
                      <span>Recharge Reaction (Oxygen Evolution Reaction - OER):</span>
                    </span>
                    <div className="p-2.5 bg-[#0c1322] rounded border border-sky-900/40 text-slate-200 text-xs leading-relaxed font-bold">
                      {chem.metalAirSpecs.reactionCharge}
                    </div>
                  </div>
                )}
              </div>

              {/* Bifunctional Catalysts Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032] space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    ORR Cathode Catalyst (Discharge):
                  </span>
                  <span className="text-xs font-bold text-amber-300 block">{chem.metalAirSpecs.orrCatalyst}</span>
                  <span className="text-[10px] text-slate-400 block">4-Electron Pathway: O₂ + 2H₂O + 4e⁻ → 4OH⁻</span>
                </div>
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032] space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    OER Recharge Catalyst (Charge):
                  </span>
                  <span className="text-xs font-bold text-sky-300 block">{chem.metalAirSpecs.oerCatalyst}</span>
                  <span className="text-[10px] text-slate-400 block">High Overpotential Barrier Reduction</span>
                </div>
              </div>

              {/* Triple-Phase Boundary & Gas Diffusion Membrane */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-2.5 font-mono text-xs">
                <span className="text-[11px] text-white uppercase tracking-wider font-bold block flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  <span>Gas Diffusion Electrode (GDE) & Atmospheric Air Management:</span>
                </span>
                <div className="text-slate-300 space-y-1.5">
                  <p><strong className="text-amber-400">Oxygen Source:</strong> {chem.metalAirSpecs.oxygenSource}</p>
                  <p><strong className="text-red-400">Atmospheric CO₂ Carbonation Risk:</strong> {chem.metalAirSpecs.carbonationRisk}</p>
                  <p><strong className="text-sky-300">Moisture Balance / Humidity Management:</strong> {chem.metalAirSpecs.waterLossOrFlooding}</p>
                  <p><strong className="text-emerald-400">Anode Morphology & Dendrites:</strong> {chem.metalAirSpecs.dendriteShape}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Air Flow, CO2 Scrubber & Gas Kinetics Simulator */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Wind className="w-4 h-4 text-amber-400" />
                  <span>Atmospheric Intake & Gas Kinetics</span>
                </h3>
              </div>

              {/* Air Intake Requirements */}
              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Continuous Discharge Current:</span>
                  <span className="text-emerald-400 font-bold text-sm">{dischargeCurrent_A.toFixed(1)} A</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#162032] pt-2">
                  <span className="text-slate-400">Required Stoichiometric Air Flow:</span>
                  <span className="text-amber-300 font-bold text-sm">{o2ConsumptionLpm.toFixed(2)} L/min</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#162032] pt-2">
                  <span className="text-slate-400">Round-Trip Overpotential (η):</span>
                  <span className="text-red-400 font-bold text-sm">+{chem.metalAirSpecs.overpotentialEta} V</span>
                </div>
              </div>

              {/* Interactive Air Quality Controls */}
              <div className="space-y-4 font-mono text-xs">
                {/* CO2 Scrubber */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">CO₂ Scrubber Filter Efficiency:</span>
                    <span className="text-sky-400 font-bold">{co2ScrubberEfficiency}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={co2ScrubberEfficiency}
                    onChange={(e) => setCo2ScrubberEfficiency(parseInt(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {co2ScrubberEfficiency < 90 ? "⚠️ High carbonate crust precipitation risk" : "✓ Active K₂CO₃ pore-choking mitigation"}
                  </span>
                </div>

                {/* Relative Humidity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Ambient Relative Humidity (RH):</span>
                    <span className="text-emerald-400 font-bold">{relativeHumidity}% RH</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="5"
                    value={relativeHumidity}
                    onChange={(e) => setRelativeHumidity(parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>10% (Dry-Out Risk)</span>
                    <span>50% (Ideal Equilibrium)</span>
                    <span>95% (Flooding Risk)</span>
                  </div>
                </div>
              </div>

              {/* Performance Penalty Warning */}
              <div className="p-3.5 bg-[#050810] rounded-xl border border-amber-900/40 text-xs font-mono text-amber-300 space-y-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Metal-Air Lifetime & Open-Cell Summary</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  While Zinc-Air batteries deliver extraordinary theoretical energy densities ({chem.theoreticalEnergyDensity} Wh/kg) and inherent safety,
                  open-atmosphere interaction exposes the electrolyte to CO₂ carbonation and humidity fluctuations, shortening cycle life compared to sealed Li-ion cells.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. STATE OF HEALTH (SOH) & CYCLE AGING SIMULATOR         */}
      {/* ======================================================== */}
      {activeTab === "soh-aging" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Degradation Stress Factor Controls</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Arrhenius / Fatigue Model</span>
              </div>

              {/* Cycle Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Total Equivalent Full Cycles:</span>
                  <span className="text-emerald-400 font-bold">{cycles} cycles</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max={chem.cycleLifeNominal * 1.5}
                  step="10"
                  value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>10 (Fresh)</span>
                  <span>{chem.cycleLifeNominal} (Rated 80% EOL)</span>
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Cell Ambient Temperature:</span>
                  <span className={`font-bold ${temp > 40 ? "text-red-400" : temp < 10 ? "text-sky-300" : "text-emerald-400"}`}>
                    {temp} °C
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="65"
                  step="1"
                  value={temp}
                  onChange={(e) => setTemp(parseInt(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-20°C (Plating / Freezing Risk)</span>
                  <span>25°C (Ideal)</span>
                  <span>65°C (Accelerated Passivation)</span>
                </div>
              </div>

              {/* C-rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Charge / Discharge C-Rate:</span>
                  <span className="text-sky-400 font-bold">{cRate.toFixed(1)} C ({dischargeCurrent_A.toFixed(1)} A)</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="6.0"
                  step="0.1"
                  value={cRate}
                  onChange={(e) => setCRate(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Depth of Discharge (DOD) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Depth of Discharge (DOD %):</span>
                  <span className="text-white font-bold">{depthOfDischarge}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={depthOfDischarge}
                  onChange={(e) => setDepthOfDischarge(parseInt(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* SOH Output Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>State of Health Diagnostic</span>
                </h3>
              </div>

              {/* Big SOH Display */}
              <div className="p-5 bg-[#050810] rounded-xl border border-[#162032] text-center space-y-3">
                <span className="text-xs text-slate-400 font-mono uppercase tracking-wider block">
                  Remaining Battery Capacity (SOH)
                </span>
                <div className={`text-4xl font-black font-mono tracking-tight ${
                  soh >= 80 ? "text-emerald-400" : soh >= 65 ? "text-amber-400" : "text-red-400"
                }`}>
                  {soh}%
                </div>

                <div className="w-full bg-[#0c1322] h-2.5 rounded-full overflow-hidden border border-[#162032]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      soh >= 80
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : soh >= 65
                        ? "bg-gradient-to-r from-amber-500 to-orange-400"
                        : "bg-gradient-to-r from-red-600 to-rose-400"
                    }`}
                    style={{ width: `${soh}%` }}
                  ></div>
                </div>

                <div className="pt-1 text-xs font-mono text-slate-400">
                  Total Capacity Loss: <span className="text-red-400 font-bold">{capacityLossPercent}%</span>
                </div>
              </div>

              {/* Degradation Breakdown Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block">Internal Res. Growth</span>
                  <span className="text-sm font-bold text-white">{(resistanceGrowthRatio * 100 - 100).toFixed(0)}% increase</span>
                </div>
                <div className="p-3 bg-[#050810] rounded-lg border border-[#162032]">
                  <span className="text-[10px] text-slate-400 block">Effective Impedance</span>
                  <span className="text-sm font-bold text-amber-400">{currentR_mOhm.toFixed(2)} mΩ</span>
                </div>
              </div>

              {/* Metal-Air Environmental penalty */}
              {isMetalAir && metalAirSpecificLoss > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono flex items-center gap-2">
                  <Wind className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>CO₂ Carbonation & Humidity Stress Penalty: -{metalAirSpecificLoss}% SOH</span>
                </div>
              )}

              {/* Safety Warnings */}
              {lithiumPlatingRisk && (
                <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 text-sky-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Sub-zero fast charging risks metallic Lithium dendrite plating and internal micro-short circuit.</span>
                </div>
              )}

              {temp > 45 && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>High operating temperature causes rapid passivation dissolution and transition metal migration.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3.4. ADVANCED CONTINUUM & DEGRADATION (P2D / LLI / LAM)   */}
      {/* ======================================================== */}
      {activeTab === "p2d-physics" && (
        <div className="space-y-4">
          <AdvancedBatteryPhysicsStudio />
        </div>
      )}

      {/* ======================================================== */}
      {/* 3.5. PYTHON-POWERED EIS DEGRADATION & PLATING STUDIO      */}
      {/* ======================================================== */}
      {activeTab === "eis-degradation" && (
        <div className="space-y-4">
          <BatteryEISDegradationStudio initialChemistryId={selectedId} />
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. THERMAL & JOULE HEAT DISSIPATION                      */}
      {/* ======================================================== */}
      {activeTab === "thermal" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Joule Heating & Thermal Management</span>
                </h3>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Cell Nominal Capacity:</span>
                    <span className="text-emerald-400 font-bold">{cellCapacityAh} Ah</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="250"
                    step="5"
                    value={cellCapacityAh}
                    onChange={(e) => setCellCapacityAh(parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Discharge Current (I = C * Ah):</span>
                    <span className="text-white font-bold text-sm">{dischargeCurrent_A.toFixed(1)} Amperes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Instantaneous Heat Power (P = I²R + Q_overpotential):</span>
                    <span className="text-amber-400 font-bold text-base">{jouleHeatWatts.toFixed(1)} Watts / cell</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#090e18] p-5 rounded-xl border border-[#162032] space-y-5">
              <div className="flex items-center justify-between border-b border-[#162032] pb-3">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Module / Pack Cooling Requirement</span>
                </h3>
              </div>

              <div className="p-4 bg-[#050810] rounded-xl border border-[#162032] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">96S Module Heat Generation:</span>
                  <span className="text-red-400 font-bold text-sm">{(jouleHeatWatts * 96 / 1000).toFixed(2)} kW</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Recommended Cooling System:</span>
                  <span className="text-sky-300 font-bold">
                    {isMetalAir
                      ? "Natural Convection & Forced Draft Air Flow (Dual-purpose: O₂ supply + heat rejection)"
                      : jouleHeatWatts > 15
                      ? "Active Direct Liquid Cold-Plate (Glycol/Water)"
                      : "Forced Air Cooling"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


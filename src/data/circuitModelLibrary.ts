import { CircuitTopology } from "../components/EquivalentCircuitBuilder";

export interface CircuitModelDoc {
  id: string;
  name: string;
  category: "battery" | "corrosion" | "coating" | "fuel-cell" | "solid-state" | "bio-sensor";
  categoryLabel: string;
  description: string;
  physicalPhenomenon: string;
  cdcNotation: string;
  nyquistShapeDesc: string;
  bodeCharacteristics: string;
  keyParameters: {
    symbol: string;
    name: string;
    unit: string;
    typicalRange: string;
    physicalMeaning: string;
  }[];
  fittingNotes: string;
  suggestedFrequencyRange: string;
  topology: CircuitTopology;
}

export const EXTENDED_CIRCUIT_LIBRARY: CircuitModelDoc[] = [
  // 1. Classical Randles Cell
  {
    id: "classic-randles",
    name: "Classical Simplified Randles Cell",
    category: "battery",
    categoryLabel: "Battery / General Electrochemistry",
    description: "The seminal electrochemical model comprising electrolyte bulk solution resistance in series with a double-layer capacitance in parallel with charge transfer resistance and semi-infinite Warburg diffusion.",
    physicalPhenomenon: "Planar semi-infinite 1D mass transport paired with single-step interfacial redox reaction at an unperturbed ideal planar electrode.",
    cdcNotation: "R(C(RW))",
    nyquistShapeDesc: "Single high-to-mid frequency semicircle of diameter R_ct transitioning smoothly into a 45° linear Warburg diffusion tail at low frequencies.",
    bodeCharacteristics: "High-frequency resistive plateau (|Z| = R_s), mid-frequency phase minimum approaching -45° to -60°, and low-frequency magnitude increase with -45° phase angle.",
    keyParameters: [
      { symbol: "R_s", name: "Ohmic Solution Resistance", unit: "Ω", typicalRange: "0.05 - 5.0 Ω (battery) / 10 - 100 Ω (corrosion)", physicalMeaning: "Electrolyte bulk conductivity, contact resistance, and lead wire impedance." },
      { symbol: "C_dl", name: "Double Layer Capacitance", unit: "µF/cm²", typicalRange: "10 - 50 µF/cm²", physicalMeaning: "Helmholtz planar electrical double-layer capacitive charge separation." },
      { symbol: "R_ct", name: "Charge Transfer Resistance", unit: "Ω", typicalRange: "0.2 - 20 Ω", physicalMeaning: "Activation overpotential kinetic barrier for electron transfer across interface." },
      { symbol: "W", name: "Warburg Diffusion Coefficient (σ)", unit: "Ω·s⁻⁰·⁵", typicalRange: "0.5 - 50 Ω·s⁻⁰·⁵", physicalMeaning: "Semi-infinite planar ionic diffusion impedance (σ = RT / (n²F²A√2)(1/(C_O√D_O) + 1/(C_R√D_R)))." },
    ],
    fittingNotes: "Ideal baseline model for planar electrodes. If the high-frequency semicircle is depressed or distorted, upgrade to the Modified Randles with CPE.",
    suggestedFrequencyRange: "10 mHz - 100 kHz",
    topology: {
      id: "classic-randles",
      name: "Classic Randles Cell (R + (R||C) + W)",
      category: "battery",
      description: "Fundamental electrochemical cell model with bulk solution resistance, double-layer capacitance in parallel with charge transfer resistance and semi-infinite Warburg diffusion.",
      cdcNotation: "R(C(RW))",
      branches: [
        {
          id: "b-bulk",
          connection: "series",
          name: "Electrolyte Bulk Resistance",
          elements: [
            { id: "el-r0", type: "R", name: "R_s", label: "Electrolyte Ohmic R_s", value: 0.15, unit: "Ω", description: "High-frequency electrolyte & contact resistance" },
          ],
        },
        {
          id: "b-randles-loop",
          connection: "parallel",
          name: "Interfacial Double Layer & Faradaic Branch",
          elements: [
            { id: "el-cdl", type: "C", name: "C_dl", label: "Double Layer C_dl", value: 25e-6, unit: "F", description: "Helmholtz double-layer capacitance" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 1.25, unit: "Ω", description: "Faradaic activation kinetics barrier" },
            { id: "el-w", type: "W", name: "W", label: "Warburg Diffusion W", value: 3.5, unit: "Ω·s⁻⁰·⁵", description: "Semi-infinite planar ionic diffusion impedance" },
          ],
        },
      ],
    },
  },

  // 2. Modified Randles with Constant Phase Element (CPE)
  {
    id: "modified-randles-cpe",
    name: "Modified Randles with CPE (Porous Electrode)",
    category: "battery",
    categoryLabel: "Battery / Porous Electrodes",
    description: "Replaces the ideal capacitor with a Constant Phase Element (CPE, Q & n) to account for surface microscopic roughness, current distribution non-uniformity, and particle size distribution in porous battery cathodes/anodes.",
    physicalPhenomenon: "Spatial dispersion of RC time constants across porous active particle networks (NMC, LFP, NCA, graphite).",
    cdcNotation: "R(Q(RW))",
    nyquistShapeDesc: "Depressed semicircle (center below real axis by angle (1-n)×90°) with low-frequency 45° Warburg diffusion tail.",
    bodeCharacteristics: "Broadened phase angle valley with constant slope corresponding to the exponent n in the transition region.",
    keyParameters: [
      { symbol: "R_s", name: "Ohmic Resistance", unit: "Ω", typicalRange: "0.1 - 2.0 Ω", physicalMeaning: "Electrolyte and separator ionic resistance." },
      { symbol: "Q_dl", name: "CPE Admittance", unit: "S·sⁿ", typicalRange: "20 - 200 µS·sⁿ", physicalMeaning: "Pseudo-capacitive admittance of rough porous matrix." },
      { symbol: "n", name: "CPE Phase Exponent", unit: "-", typicalRange: "0.80 - 0.96", physicalMeaning: "Depression factor: n=1 is ideal capacitor, n<1 represents fractal roughness & porosity." },
      { symbol: "R_ct", name: "Charge Transfer Resistance", unit: "Ω", typicalRange: "0.5 - 15 Ω", physicalMeaning: "Intercalation/deintercalation kinetic resistance." },
      { symbol: "W", name: "Warburg Coefficient", unit: "Ω·s⁻⁰·⁵", typicalRange: "1.0 - 25 Ω·s⁻⁰·⁵", physicalMeaning: "Li+ chemical diffusion inside active material particles." },
    ],
    fittingNotes: "Crucial for realistic fitting of commercial Li-ion batteries (18650, 21700, pouch cells). Exponent n between 0.85 and 0.92 indicates typical porous calendered electrode coating.",
    suggestedFrequencyRange: "5 mHz - 100 kHz",
    topology: {
      id: "modified-randles-cpe",
      name: "Modified Randles with CPE (Porous Electrode)",
      category: "battery",
      description: "Standard model for porous battery electrodes (NMC, LFP, Graphite) where surface roughness and porosity distribute the capacitive time constant.",
      cdcNotation: "R(Q(RW))",
      branches: [
        {
          id: "b-bulk",
          connection: "series",
          name: "Ohmic Lead Resistance",
          elements: [
            { id: "el-r0", type: "R", name: "R_s", label: "Ohmic Bulk R_s", value: 0.22, unit: "Ω", description: "Bulk electrolyte and separator resistance" },
          ],
        },
        {
          id: "b-cpe-loop",
          connection: "parallel",
          name: "Porous Interfacial Kinetics",
          elements: [
            { id: "el-cpe-dl", type: "CPE", name: "CPE_dl", label: "Constant Phase Element", value: 45e-6, unit: "S·sⁿ", exponent: 0.88, description: "Non-ideal double-layer (n=0.88)" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 0.95, unit: "Ω", description: "Interfacial electron exchange resistance" },
            { id: "el-w", type: "W", name: "W_d", label: "Li+ Solid Diffusion W", value: 5.2, unit: "Ω·s⁻⁰·⁵", description: "Solid-state lithium ion diffusion inside active particles" },
          ],
        },
      ],
    },
  },

  // 3. Lithium-Ion Battery Full Cell with SEI Layer (Dual RC Loop)
  {
    id: "dual-sei-battery",
    name: "Li-Ion Cell with Passivating SEI Layer (2-RC Loop)",
    category: "battery",
    categoryLabel: "Battery / Degradation & SEI",
    description: "Two distinct relaxation time constants representing: (1) High-frequency lithium transport through the Solid Electrolyte Interphase (SEI) film, and (2) Mid-frequency interfacial charge transfer and double layer, followed by low-frequency solid diffusion.",
    physicalPhenomenon: "Passivation film ionic conduction paired with graphite/NMC redox intercalation.",
    cdcNotation: "R(Q_sei R_sei)(Q_dl(R_ct W))",
    nyquistShapeDesc: "Two overlapping semicircles at high and medium frequencies, followed by a 45° low-frequency Warburg tail.",
    bodeCharacteristics: "Two clear phase angle peaks/shoulders representing the two distinct interfacial time constants (τ_sei = R_sei × C_sei and τ_ct = R_ct × C_dl).",
    keyParameters: [
      { symbol: "R_0", name: "Electrolyte Ohmic Resistance", unit: "Ω", typicalRange: "0.05 - 0.5 Ω", physicalMeaning: "Liquid organic electrolyte bulk resistance and current collector leads." },
      { symbol: "CPE_sei", name: "SEI Layer Capacitance", unit: "S·sⁿ", typicalRange: "5 - 30 µS·sⁿ", physicalMeaning: "Dielectric capacitance across the nanometer-thin passivating SEI film." },
      { symbol: "R_sei", name: "SEI Transport Resistance", unit: "Ω", typicalRange: "0.1 - 2.5 Ω", physicalMeaning: "Li+ cation migration barrier across Li2CO3 / LiF / organic SEI inorganic matrix." },
      { symbol: "CPE_dl", name: "Double Layer Capacitance", unit: "S·sⁿ", typicalRange: "20 - 150 µS·sⁿ", physicalMeaning: "Charge accumulation at active material / electrolyte interface." },
      { symbol: "R_ct", name: "Faradaic Charge Transfer", unit: "Ω", typicalRange: "0.3 - 5.0 Ω", physicalMeaning: "Electrochemical redox desolvation and electron transfer." },
      { symbol: "W", name: "Warburg Diffusion", unit: "Ω·s⁻⁰·⁵", typicalRange: "1.5 - 15 Ω·s⁻⁰·⁵", physicalMeaning: "Solid-state Li+ bulk diffusion in active host particles." },
    ],
    fittingNotes: "Widely used for state-of-health (SOH) tracking. An increasing R_sei indicates SEI thickening and capacity degradation; an increasing R_ct indicates active material surface degradation or loss of active lithium.",
    suggestedFrequencyRange: "1 mHz - 100 kHz",
    topology: {
      id: "dual-sei-battery",
      name: "Lithium-Ion Full Cell with SEI Film (2-RC Loop)",
      category: "battery",
      description: "Two distinct semicircles: High-frequency SEI passivation layer conduction followed by mid-frequency Faradaic charge transfer and low-frequency Warburg tail.",
      cdcNotation: "R(Q_sei R_sei)(Q_dl(R_ct W))",
      branches: [
        {
          id: "b-bulk",
          connection: "series",
          name: "Electrolyte Resistance",
          elements: [
            { id: "el-r0", type: "R", name: "R_0", label: "Bulk Solution R_0", value: 0.12, unit: "Ω", description: "Electrolyte bulk ohmic drop" },
          ],
        },
        {
          id: "b-sei-loop",
          connection: "parallel",
          name: "Solid Electrolyte Interphase (SEI) Film",
          elements: [
            { id: "el-qsei", type: "CPE", name: "CPE_sei", label: "SEI Passivation CPE", value: 15e-6, unit: "S·sⁿ", exponent: 0.85, description: "Dielectric SEI surface layer capacitance" },
            { id: "el-rsei", type: "R", name: "R_sei", label: "SEI Film Resistance R_sei", value: 0.45, unit: "Ω", description: "Ionic transport resistance across passivating SEI" },
          ],
        },
        {
          id: "b-ct-loop",
          connection: "parallel",
          name: "Interfacial Charge Transfer & Diffusion",
          elements: [
            { id: "el-qdl", type: "CPE", name: "CPE_dl", label: "Double Layer CPE_dl", value: 55e-6, unit: "S·sⁿ", exponent: 0.92, description: "Electrode/electrolyte double layer" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 0.85, unit: "Ω", description: "Intercalation charge transfer barrier" },
            { id: "el-w", type: "W", name: "W_li", label: "Warburg Diffusion W", value: 4.8, unit: "Ω·s⁻⁰·⁵", description: "Lithium-ion solid-state diffusion" },
          ],
        },
      ],
    },
  },

  // 4. All-Solid-State Battery (Grain Boundary + Interphase)
  {
    id: "solid-state-battery",
    name: "All-Solid-State Battery (Grain Boundary + Interphase)",
    category: "solid-state",
    categoryLabel: "Solid-State / Ceramics",
    description: "Comprehensive multi-relaxation model for inorganic solid-state electrolytes (LLZO, NASICON, Argyrodites) resolving bulk crystalline lattice conductivity, ceramic grain boundary resistance, and solid-solid electrode interphase.",
    physicalPhenomenon: "Intra-grain ionic hopping (high-frequency MHz), grain boundary interfacial space-charge resistance (kHz), and composite cathode chemomechanical contact resistance (Hz).",
    cdcNotation: "R_bulk(C_gb R_gb)(Q_int R_int)(Q_dl(R_ct W))",
    nyquistShapeDesc: "Up to three cascading semicircles spanning the MHz to sub-Hz range: Bulk offset + Grain boundary arc + Interphase arc + Warburg diffusion tail.",
    bodeCharacteristics: "Multiple distinct phase valleys extending into high frequencies (>10 kHz) reflecting ultrafast dielectric grain-boundary relaxations.",
    keyParameters: [
      { symbol: "R_bulk", name: "Solid Electrolyte Lattice Resistance", unit: "Ω", typicalRange: "0.1 - 2.0 Ω", physicalMeaning: "Intragranular Li+ ionic conduction through crystalline lattice vacancies." },
      { symbol: "C_gb", name: "Grain Boundary Capacitance", unit: "nF", typicalRange: "0.1 - 10 nF", physicalMeaning: "Geometric dielectric capacitance between adjacent polycrystalline ceramic grains." },
      { symbol: "R_gb", name: "Grain Boundary Resistance", unit: "Ω", typicalRange: "0.5 - 10 Ω", physicalMeaning: "Space-charge layer and disorder barrier across ceramic grain boundaries." },
      { symbol: "R_int", name: "Solid-Solid Interphase Resistance", unit: "Ω", typicalRange: "1.0 - 25 Ω", physicalMeaning: "Chemomechanical contact loss and chemical reaction interphase layer." },
      { symbol: "W_ss", name: "Solid Diffusion", unit: "Ω·s⁻⁰·⁵", typicalRange: "2.0 - 50 Ω·s⁻⁰·⁵", physicalMeaning: "Chemical diffusion of Li within solid composite cathode." },
    ],
    fittingNotes: "Essential when analyzing symmetric Li|LLZO|Li pellets or full ASSBs. High-frequency equipment (>1 MHz) is required to fully resolve the bulk and grain-boundary arcs.",
    suggestedFrequencyRange: "10 mHz - 1 MHz",
    topology: {
      id: "solid-state-battery",
      name: "All-Solid-State Battery (Grain Boundary + Interphase)",
      category: "solid-state",
      description: "Multi-time-constant solid electrolyte (e.g. LLZO or Argyrodite) modeling bulk lattice, grain boundaries, and electrode-electrolyte chemomechanical interphase.",
      cdcNotation: "R_b(C_gb R_gb)(Q_sei R_sei)(Q_dl(R_ct W))",
      branches: [
        {
          id: "b-bulk",
          connection: "series",
          name: "Solid Electrolyte Bulk Lattice",
          elements: [
            { id: "el-rb", type: "R", name: "R_bulk", label: "Lattice Resistance R_bulk", value: 0.35, unit: "Ω", description: "Solid electrolyte crystal lattice resistance" },
          ],
        },
        {
          id: "b-gb",
          connection: "parallel",
          name: "Grain Boundary Intergrain Conduction",
          elements: [
            { id: "el-cgb", type: "C", name: "C_gb", label: "Grain Boundary C_gb", value: 2.5e-9, unit: "F", description: "High-frequency intergrain capacitance" },
            { id: "el-rgb", type: "R", name: "R_gb", label: "Grain Boundary R_gb", value: 0.75, unit: "Ω", description: "Solid-state grain boundary resistance" },
          ],
        },
        {
          id: "b-interphase",
          connection: "parallel",
          name: "Solid-Solid Interphase & Kinetics",
          elements: [
            { id: "el-qint", type: "CPE", name: "CPE_int", label: "Interphase CPE", value: 12e-6, unit: "S·sⁿ", exponent: 0.82, description: "Solid-solid contact roughness" },
            { id: "el-rint", type: "R", name: "R_int", label: "Charge Transfer R_int", value: 1.65, unit: "Ω", description: "Electrochemical redox barrier at solid interface" },
            { id: "el-w", type: "W", name: "W_ss", label: "Solid Diffusion W", value: 6.2, unit: "Ω·s⁻⁰·⁵", description: "Solid-state chemical diffusion" },
          ],
        },
      ],
    },
  },

  // 5. Damaged / Intact Organic Barrier Coating (ASTM G106)
  {
    id: "corrosion-coating-astm",
    name: "Intact & Porous Barrier Coating on Steel (ASTM G106)",
    category: "coating",
    categoryLabel: "Corrosion & Protective Coatings",
    description: "Standard model for organic coatings, epoxy primers, and polyurethanes applied over corroding metallic substrates according to ASTM G106.",
    physicalPhenomenon: "Electrolyte penetration through microscopic coating pores (high frequency) followed by electrochemical corrosion dissolution of the underlying steel substrate (low frequency).",
    cdcNotation: "R_s(C_c R_po)(Q_dl R_corr)",
    nyquistShapeDesc: "Two distinct semicircles: High-frequency coating pore arc (R_po) and large low-frequency substrate polarization resistance arc (R_corr).",
    bodeCharacteristics: "High coating impedance |Z| > 10^8 Ω·cm² at 0.1 Hz for intact coatings; drops below 10^6 Ω·cm² when pores saturate with saline water.",
    keyParameters: [
      { symbol: "R_sol", name: "Bulk Solution Resistance", unit: "Ω", typicalRange: "10 - 50 Ω", physicalMeaning: "Resistance of 3.5 wt% NaCl or immersion electrolyte." },
      { symbol: "C_c", name: "Coating Capacitance", unit: "nF/cm²", typicalRange: "0.1 - 2.0 nF/cm²", physicalMeaning: "Dielectric capacitance of intact polymer barrier (C = ε·ε0·A / d)." },
      { symbol: "R_po", name: "Coating Pore Resistance", unit: "Ω·cm²", typicalRange: "10^4 - 10^9 Ω·cm²", physicalMeaning: "Resistance of conductive electrolyte pathways inside microscopic pores/defects." },
      { symbol: "CPE_dl", name: "Substrate Double Layer", unit: "µS·sⁿ", typicalRange: "5 - 50 µS·sⁿ", physicalMeaning: "Active metal area exposed to corrosive moisture." },
      { symbol: "R_corr", name: "Corrosion Polarization Resistance (R_p)", unit: "Ω·cm²", typicalRange: "10^4 - 10^7 Ω·cm²", physicalMeaning: "Faradaic metal dissolution resistance (inversely proportional to corrosion rate via Stern-Geary)." },
    ],
    fittingNotes: "Tracking C_c over immersion time yields the Brasher-Kingsbury water absorption volume fraction. Tracking R_po detects pinhole degradation.",
    suggestedFrequencyRange: "10 mHz - 100 kHz",
    topology: {
      id: "corrosion-coating-astm",
      name: "Protective Barrier Coating & Corroding Substrate (ASTM G106)",
      category: "coating",
      description: "Standard equivalent circuit for organic paint / epoxy coatings on steel/aluminum. High frequency corresponds to dielectric coating pore resistance; low frequency corresponds to underfilm corrosion.",
      cdcNotation: "R_s(C_c R_po)(Q_dl R_corr)",
      branches: [
        {
          id: "b-electrolyte",
          connection: "series",
          name: "Bulk Solution Resistance",
          elements: [
            { id: "el-rs", type: "R", name: "R_sol", label: "Electrolyte R_sol", value: 15.0, unit: "Ω", description: "Sea water / aerated chloride solution resistance" },
          ],
        },
        {
          id: "b-coating",
          connection: "parallel",
          name: "Dielectric Barrier Coating (Pores)",
          elements: [
            { id: "el-cc", type: "C", name: "C_c", label: "Coating Capacitance C_c", value: 0.45e-9, unit: "F", description: "Dielectric intact polymer film capacitance" },
            { id: "el-rpo", type: "R", name: "R_pore", label: "Pore Resistance R_po", value: 250000.0, unit: "Ω", description: "Electrolyte ion pathway resistance in coating pores" },
          ],
        },
        {
          id: "b-corrosion",
          connection: "parallel",
          name: "Underfilm Metallic Corrosion Interface",
          elements: [
            { id: "el-qdl", type: "CPE", name: "CPE_dl", label: "Substrate Double Layer", value: 8.5e-6, unit: "S·sⁿ", exponent: 0.85, description: "Exposed metallic substrate double layer" },
            { id: "el-rcorr", type: "R", name: "R_p", label: "Polarization Res R_p", value: 1200000.0, unit: "Ω", description: "Faradaic metal dissolution resistance (Stern-Geary)" },
          ],
        },
      ],
    },
  },

  // 6. Passivated Passive Oxide Film (Aerospace Alloy / Stainless Steel)
  {
    id: "passivated-superalloy",
    name: "Passivated Alloy with Dense Passive Oxide Film",
    category: "corrosion",
    categoryLabel: "Corrosion & Metallurgy",
    description: "Two-layer oxide film model for corrosion-resistant alloys (Titanium Ti-6Al-4V, 316L Stainless Steel, Inconel 718, Super Duplex) featuring a compact inner barrier oxide and a porous outer hydrated oxide layer.",
    physicalPhenomenon: "Point Defect Model (PDM) transport of oxygen vacancies across compact Cr2O3 / TiO2 passive film.",
    cdcNotation: "R_s(Q_film R_film)(Q_dl R_ct)",
    nyquistShapeDesc: "Two highly overlapping large depressed semicircles with polarization resistances extending into the hundreds of kilo-ohms or mega-ohms.",
    bodeCharacteristics: "Broad capacitive phase plateau with phase angle near -80° to -85° extending across several frequency decades (100 Hz down to 10 mHz).",
    keyParameters: [
      { symbol: "R_s", name: "Solution Resistance", unit: "Ω", typicalRange: "15 - 50 Ω", physicalMeaning: "Ohmic resistance of electrolyte solution." },
      { symbol: "CPE_film", name: "Passive Film CPE", unit: "µS·sⁿ", typicalRange: "1.0 - 10 µS·sⁿ", physicalMeaning: "Capacitance of the nanometer-thin dense passivating barrier oxide." },
      { symbol: "R_film", name: "Passive Oxide Resistance", unit: "kΩ", typicalRange: "50 - 500 kΩ", physicalMeaning: "Defect hopping resistance within the passive oxide lattice." },
      { symbol: "CPE_dl", name: "Interface Double Layer", unit: "µS·sⁿ", typicalRange: "10 - 80 µS·sⁿ", physicalMeaning: "Charge separation at metal-oxide interface." },
      { symbol: "R_ct", name: "Charge Transfer Resistance", unit: "kΩ", typicalRange: "200 - 2000 kΩ", physicalMeaning: "Kinetic resistance to metal cation dissolution." },
    ],
    fittingNotes: "A high combined resistance (R_film + R_ct > 10^5 Ω·cm²) confirms stable passivation according to ASTM G102 standard.",
    suggestedFrequencyRange: "1 mHz - 100 kHz",
    topology: {
      id: "passivated-superalloy",
      name: "Passivated Aerospace Alloy (Compact Passive Oxide Film)",
      category: "corrosion",
      description: "Dual-layer oxide structure (dense inner barrier Cr2O3 / TiO2 + porous outer hydrated oxide) in aerospace titanium and nickel superalloys.",
      cdcNotation: "R_s(Q_film R_film)(Q_dl R_ct)",
      branches: [
        {
          id: "b-sol",
          connection: "series",
          name: "Electrolyte Solution",
          elements: [
            { id: "el-rs", type: "R", name: "R_s", label: "Bulk Solution R_s", value: 22.0, unit: "Ω", description: "Corrosive medium resistance" },
          ],
        },
        {
          id: "b-oxide",
          connection: "parallel",
          name: "Passive Oxide Film Barrier",
          elements: [
            { id: "el-qfilm", type: "CPE", name: "CPE_film", label: "Oxide Film CPE", value: 1.8e-6, unit: "S·sⁿ", exponent: 0.94, description: "Compact passive dielectric oxide layer" },
            { id: "el-rfilm", type: "R", name: "R_film", label: "Oxide Resistance R_film", value: 85000.0, unit: "Ω", description: "Ion vacancy hopping resistance in oxide" },
          ],
        },
        {
          id: "b-metal",
          connection: "parallel",
          name: "Charge Transfer & Metal Substrate",
          elements: [
            { id: "el-qdl", type: "CPE", name: "CPE_dl", label: "Substrate CPE_dl", value: 18e-6, unit: "S·sⁿ", exponent: 0.88, description: "Metal-oxide interface double layer" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 450000.0, unit: "Ω", description: "Metallic oxidation kinetic barrier" },
          ],
        },
      ],
    },
  },

  // 7. Finite-Length Transmissive Warburg (Porous Diffusion / Thin Film)
  {
    id: "finite-transmissive-warburg",
    name: "Finite-Length Warburg Cell (Thin-Film / Porous Diffusion)",
    category: "battery",
    categoryLabel: "Battery / Thin-Film Electrochemistry",
    description: "Captures finite-length boundary diffusion where the diffusion layer thickness δ is comparable to or thinner than the active material particle radius or thin-film thickness (short-circuit or reflective boundaries).",
    physicalPhenomenon: "Diffusion in thin film electrodes or shallow pores transitioning from semi-infinite 45° slope to resistive plateau at lowest frequencies.",
    cdcNotation: "R_s(Q_dl(R_ct W_delta))",
    nyquistShapeDesc: "High-frequency charge transfer semicircle followed by a 45° line that bends down into a low-frequency resistive arc.",
    bodeCharacteristics: "Phase angle rises toward -45° in the diffusion regime, then drops back to 0° at ultra-low frequencies as the diffusion boundary is reached.",
    keyParameters: [
      { symbol: "R_s", name: "Ohmic Bulk Resistance", unit: "Ω", typicalRange: "0.2 - 2.0 Ω", physicalMeaning: "Electrolyte solution resistance." },
      { symbol: "Q_dl", name: "Double Layer CPE", unit: "µS·sⁿ", typicalRange: "30 - 100 µS·sⁿ", physicalMeaning: "Interfacial charge accumulation." },
      { symbol: "R_ct", name: "Charge Transfer Resistance", unit: "Ω", typicalRange: "1.0 - 8.0 Ω", physicalMeaning: "Faradaic redox kinetic barrier." },
      { symbol: "W_delta", name: "Finite Diffusion Warburg", unit: "Ω·s⁻⁰·⁵", typicalRange: "2.0 - 15 Ω·s⁻⁰·⁵", physicalMeaning: "Diffusion parameter with finite boundary limit." },
    ],
    fittingNotes: "Use for microbatteries, ultra-thin battery electrodes, and flow battery porous gas-diffusion electrodes where diffusion boundary conditions are non-infinite.",
    suggestedFrequencyRange: "1 mHz - 50 kHz",
    topology: {
      id: "finite-transmissive-warburg",
      name: "Finite Diffusion Randles Cell",
      category: "battery",
      description: "Randles cell with finite-length diffusion modeling thin-film batteries and porous flow electrodes.",
      cdcNotation: "R(Q(RW))",
      branches: [
        {
          id: "b-bulk",
          connection: "series",
          name: "Electrolyte Resistance",
          elements: [
            { id: "el-rs", type: "R", name: "R_s", label: "Solution R_s", value: 0.18, unit: "Ω", description: "Bulk electrolyte resistance" },
          ],
        },
        {
          id: "b-transmissive",
          connection: "parallel",
          name: "Interfacial Kinetics & Finite Diffusion",
          elements: [
            { id: "el-qdl", type: "CPE", name: "CPE_dl", label: "Double Layer CPE", value: 38e-6, unit: "S·sⁿ", exponent: 0.90, description: "Interfacial double layer capacitance" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 1.85, unit: "Ω", description: "Interfacial electron exchange resistance" },
            { id: "el-w", type: "W", name: "W_fin", label: "Finite Warburg W", value: 2.8, unit: "Ω·s⁻⁰·⁵", description: "Diffusion within thin-film boundaries" },
          ],
        },
      ],
    },
  },

  // 8. Fuel Cell / PEMFC Membrane Electrode Assembly (MEA)
  {
    id: "pemfc-mea-model",
    name: "PEMFC Membrane Electrode Assembly (MEA)",
    category: "fuel-cell",
    categoryLabel: "Fuel Cells & Electrolyzers",
    description: "Equivalent circuit for Proton Exchange Membrane Fuel Cells (PEMFC) and Water Electrolyzers (PEMWE), separating protonic membrane resistance, catalyst layer double layer & oxygen reduction reaction (ORR) kinetics, and gas-phase mass transport.",
    physicalPhenomenon: "Proton transport through Nafion membrane coupled to slow ORR kinetics at Pt/C catalyst nanoparticles and O2/H2O gas diffusion.",
    cdcNotation: "R_mem(CPE_dl(R_orr W_gas))",
    nyquistShapeDesc: "High-frequency inductive tail (bipolar plates/cables) crossing the real axis at R_mem, followed by a large depressed ORR kinetic semicircle and mass transport arc.",
    bodeCharacteristics: "High-frequency phase positive due to wiring inductance, deep valley in the 10-1000 Hz region reflecting sluggish cathode ORR kinetics.",
    keyParameters: [
      { symbol: "R_mem", name: "Nafion Membrane Resistance", unit: "mΩ·cm²", typicalRange: "40 - 150 mΩ·cm²", physicalMeaning: "Hydrated perfluorosulfonic acid (PFSA) protonic conductivity." },
      { symbol: "CPE_dl", name: "Catalyst Double Layer", unit: "mF/cm²", typicalRange: "10 - 50 mF/cm²", physicalMeaning: "High surface-area Pt/carbon black interfacial capacitance." },
      { symbol: "R_orr", name: "ORR Charge Transfer Resistance", unit: "Ω·cm²", typicalRange: "0.1 - 2.5 Ω·cm²", physicalMeaning: "4-electron oxygen reduction reaction activation barrier at cathode." },
      { symbol: "W_gas", name: "Gas Diffusion Impedance", unit: "Ω·s⁻⁰·⁵", typicalRange: "0.5 - 5.0 Ω·s⁻⁰·⁵", physicalMeaning: "O2 transport limitation through gas diffusion layer (GDL) and microporous layer (MPL)." },
    ],
    fittingNotes: "An increasing R_mem indicates membrane drying or degradation; an increasing R_orr indicates catalyst platinum dissolution/agglomeration.",
    suggestedFrequencyRange: "10 mHz - 50 kHz",
    topology: {
      id: "pemfc-mea-model",
      name: "PEMFC Membrane Electrode Assembly",
      category: "fuel-cell",
      description: "Proton exchange membrane resistance coupled to Pt/C catalyst layer ORR kinetics and oxygen mass transport.",
      cdcNotation: "R_mem(Q_cat(R_orr W_gas))",
      branches: [
        {
          id: "b-mem",
          connection: "series",
          name: "Proton Membrane Resistance",
          elements: [
            { id: "el-rmem", type: "R", name: "R_mem", label: "Membrane R_mem", value: 0.08, unit: "Ω", description: "Nafion protonic membrane ohmic drop" },
          ],
        },
        {
          id: "b-catalyst",
          connection: "parallel",
          name: "Cathode Catalyst Layer (ORR)",
          elements: [
            { id: "el-qcat", type: "CPE", name: "CPE_cat", label: "Catalyst Layer CPE", value: 450e-6, unit: "S·sⁿ", exponent: 0.86, description: "Pt/C high surface area double layer" },
            { id: "el-rorr", type: "R", name: "R_orr", label: "ORR Resistance R_orr", value: 0.65, unit: "Ω", description: "Oxygen reduction reaction kinetic overpotential" },
            { id: "el-wgas", type: "W", name: "W_gas", label: "Gas Diffusion W", value: 1.8, unit: "Ω·s⁻⁰·⁵", description: "O2 mass transport through GDL/MPL" },
          ],
        },
      ],
    },
  },

  // 9. High-Frequency Lead Inductance + Porous Battery Cell
  {
    id: "battery-with-inductance",
    name: "Cylindrical Li-Ion Cell with Lead Inductance (L + R + 2RC)",
    category: "battery",
    categoryLabel: "Battery / High-Frequency & Pack Testing",
    description: "Includes high-frequency series inductance (L_0) from test cables, tab geometry, and jellyroll spiraling in 18650 / 21700 / 4680 cylindrical cells, which shifts the spectrum into the fourth quadrant (+Z'').",
    physicalPhenomenon: "Electromagnetic induction in wound current collectors and potentiostat cabling at frequencies above 1 kHz.",
    cdcNotation: "L_0 R_0(Q_sei R_sei)(Q_dl(R_ct W))",
    nyquistShapeDesc: "Crosses the real axis from positive imaginary impedance (fourth quadrant +Z'') at high frequencies before forming the standard SEI and charge transfer semicircles.",
    bodeCharacteristics: "Phase angle rises toward +90° at high frequencies (>5 kHz) due to inductive reactance (ωL).",
    keyParameters: [
      { symbol: "L_0", name: "High-Frequency Inductance", unit: "µH", typicalRange: "0.1 - 2.5 µH", physicalMeaning: "Inductance of cell tabs, wound electrode jellyroll, and external cable harness." },
      { symbol: "R_0", name: "High-Frequency Real Intercept", unit: "Ω", typicalRange: "0.015 - 0.050 Ω", physicalMeaning: "Pure ohmic resistance measured at zero phase crossing." },
      { symbol: "R_sei", name: "SEI Layer Resistance", unit: "mΩ", typicalRange: "5 - 35 mΩ", physicalMeaning: "Passivating SEI film conduction." },
      { symbol: "R_ct", name: "Charge Transfer Resistance", unit: "mΩ", typicalRange: "10 - 80 mΩ", physicalMeaning: "Anode + Cathode combined charge transfer resistance." },
    ],
    fittingNotes: "Crucial for accurately extracting the real high-frequency resistance R_0 in battery pack EIS measurements without erroneous negative resistance artifacts.",
    suggestedFrequencyRange: "10 mHz - 100 kHz",
    topology: {
      id: "battery-with-inductance",
      name: "Li-Ion Cell with Cable Inductance (L + R + 2RC)",
      category: "battery",
      description: "Cylindrical cell model including high-frequency inductive loops from jellyroll winding and test leads.",
      cdcNotation: "L_0 R_0(Q_sei R_sei)(Q_dl(R_ct W))",
      branches: [
        {
          id: "b-inductance",
          connection: "series",
          name: "High-Frequency Parasitic Inductance & Ohmic Lead",
          elements: [
            { id: "el-l0", type: "L", name: "L_0", label: "Lead Inductance L_0", value: 1.2e-6, unit: "H", description: "Jellyroll and cable inductance" },
            { id: "el-r0", type: "R", name: "R_0", label: "Ohmic Intercept R_0", value: 0.025, unit: "Ω", description: "Ohmic bulk resistance" },
          ],
        },
        {
          id: "b-sei",
          connection: "parallel",
          name: "SEI Passivation Layer",
          elements: [
            { id: "el-qsei", type: "CPE", name: "CPE_sei", label: "SEI CPE", value: 120e-6, unit: "S·sⁿ", exponent: 0.88, description: "SEI film capacitance" },
            { id: "el-rsei", type: "R", name: "R_sei", label: "SEI Resistance R_sei", value: 0.035, unit: "Ω", description: "SEI ionic conduction resistance" },
          ],
        },
        {
          id: "b-ct",
          connection: "parallel",
          name: "Double Layer & Charge Transfer",
          elements: [
            { id: "el-qdl", type: "CPE", name: "CPE_dl", label: "Double Layer CPE", value: 350e-6, unit: "S·sⁿ", exponent: 0.92, description: "Electrochemical double layer" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 0.055, unit: "Ω", description: "Redox charge transfer resistance" },
            { id: "el-w", type: "W", name: "W", label: "Warburg Diffusion", value: 1.2, unit: "Ω·s⁻⁰·⁵", description: "Li-ion solid-state diffusion" },
          ],
        },
      ],
    },
  },

  // 10. Localized Pitting Corrosion (Pit Initiation & Repassivation)
  {
    id: "pitting-corrosion-model",
    name: "Localized Pitting Corrosion (Active Pit + Passive Surrounding)",
    category: "corrosion",
    categoryLabel: "Corrosion & Metallurgy",
    description: "Equivalent circuit for localized pitting corrosion of stainless steels and aluminum alloys in halide electrolytes, partitioning the passive unattacked surface from the actively dissolving occluded pit cavity.",
    physicalPhenomenon: "Electrochemical coupling between a large passive cathode surface and a tiny, highly active pit anode undergoing autocatalytic dissolution and acidification.",
    cdcNotation: "R_sol(Q_pass R_pass)(Q_pit(R_pit W_pit))",
    nyquistShapeDesc: "A very large high-frequency capacitive loop from the passive background surface combined with a lower-frequency distorted inductive/diffusive loop from the active pits.",
    bodeCharacteristics: "Pronounced drop in mid-to-low frequency impedance when pit initiation occurs, marked by instability and phase shifts.",
    keyParameters: [
      { symbol: "R_sol", name: "Electrolyte Solution Resistance", unit: "Ω", typicalRange: "10 - 50 Ω", physicalMeaning: "Chloride electrolyte bulk resistance." },
      { symbol: "CPE_pass", name: "Passive Area CPE", unit: "µS·sⁿ", typicalRange: "5 - 20 µS·sⁿ", physicalMeaning: "Capacitance of the remaining intact passive oxide area." },
      { symbol: "R_pass", name: "Passive Surface Resistance", unit: "kΩ", typicalRange: "100 - 1000 kΩ", physicalMeaning: "High resistance of passive matrix." },
      { symbol: "CPE_pit", name: "Pit Cavity Double Layer", unit: "µS·sⁿ", typicalRange: "20 - 150 µS·sⁿ", physicalMeaning: "Micro-cavity localized double layer." },
      { symbol: "R_pit", name: "Pit Dissolution Resistance", unit: "Ω", typicalRange: "50 - 5000 Ω", physicalMeaning: "Active metal dissolution resistance inside acidified pit." },
      { symbol: "W_pit", name: "Pit Diffusion Resistance", unit: "Ω·s⁻⁰·⁵", typicalRange: "10 - 200 Ω·s⁻⁰·⁵", physicalMeaning: "Mass transport of metal ions (Fe²⁺, Al³⁺) out of the constricted pit mouth." },
    ],
    fittingNotes: "A sudden reduction in total impedance by orders of magnitude indicates the breakdown of the passive film and active pit propagation.",
    suggestedFrequencyRange: "5 mHz - 100 kHz",
    topology: {
      id: "pitting-corrosion-model",
      name: "Localized Pitting Corrosion Model",
      category: "corrosion",
      description: "Passive surface paired with active occluded pit dissolution and mass transport.",
      cdcNotation: "R_s(Q_pass R_pass)(Q_pit(R_pit W_pit))",
      branches: [
        {
          id: "b-sol",
          connection: "series",
          name: "Electrolyte Solution",
          elements: [
            { id: "el-rs", type: "R", name: "R_sol", label: "Electrolyte R_sol", value: 18.0, unit: "Ω", description: "Bulk electrolyte resistance" },
          ],
        },
        {
          id: "b-passive",
          connection: "parallel",
          name: "Passive Metal Surface",
          elements: [
            { id: "el-qpass", type: "CPE", name: "CPE_pass", label: "Passive Area CPE", value: 4.5e-6, unit: "S·sⁿ", exponent: 0.93, description: "Intact passive oxide film" },
            { id: "el-rpass", type: "R", name: "R_pass", label: "Passive Res R_pass", value: 350000.0, unit: "Ω", description: "Passive barrier resistance" },
          ],
        },
        {
          id: "b-pit",
          connection: "parallel",
          name: "Active Pitting Cavity & Diffusion",
          elements: [
            { id: "el-qpit", type: "CPE", name: "CPE_pit", label: "Pit Cavity CPE", value: 35e-6, unit: "S·sⁿ", exponent: 0.82, description: "Active pit cavity double layer" },
            { id: "el-rpit", type: "R", name: "R_pit", label: "Pit Dissolution R_pit", value: 1200.0, unit: "Ω", description: "Anodic dissolution kinetics in pit" },
            { id: "el-wpit", type: "W", name: "W_pit", label: "Pit Mass Transport W", value: 45.0, unit: "Ω·s⁻⁰·⁵", description: "Metal cation diffusion out of pit" },
          ],
        },
      ],
    },
  },

  // 11. Bisquert Open Porous Electrode Transmission Line (Battery / Supercapacitor)
  {
    id: "bisquert-open-tlm",
    name: "Bisquert Open Porous TLM (Blocking Substrate)",
    category: "battery",
    categoryLabel: "Battery / Supercapacitors / Porous Topologies",
    description: "De Levie & Bisquert transmission line model with a blocking/impermeable current collector boundary. Accurately simulates the high-frequency 45° transmission line line transitioning to a vertical capacitive tail (or finite Rct loop) in thick porous electrodes.",
    physicalPhenomenon: "Electrolyte ionic conduction resistance within the tortuous pore channels coupled with distributed interfacial double-layer charging and Faradaic charge transfer along the cylindrical pore walls.",
    cdcNotation: "R_s + TLM_open(R_ion, R_ct, CPE_d)",
    nyquistShapeDesc: "A distinct 45° straight-line segment at high frequencies (pore ionic resistance distribution) turning abruptly at the knee frequency into a low-frequency vertical capacitive line (supercapacitors) or low-frequency semicircle (batteries with Faradaic Rct).",
    bodeCharacteristics: "High-frequency phase plateau of -45° transitioning to -90° at low frequencies for ideal blocking pores.",
    keyParameters: [
      { symbol: "R_s", name: "Bulk Solution Resistance", unit: "Ω", typicalRange: "0.2 - 5.0 Ω", physicalMeaning: "Uncompensated electrolyte resistance between reference electrode and pore mouth." },
      { symbol: "R_ion", name: "Pore Channel Ionic Resistance", unit: "Ω", typicalRange: "10 - 250 Ω", physicalMeaning: "Total ionic resistance through the electrolyte filling the electrode pores (R_ion = L / (κ·A·ε_p))." },
      { symbol: "R_ct", name: "Interfacial Charge Transfer Resistance", unit: "Ω", typicalRange: "50 - 5000 Ω (or ∞ for EDLC)", physicalMeaning: "Distributed Faradaic charge transfer along the pore walls." },
      { symbol: "CPE_d", name: "Pore Wall Double Layer CPE", unit: "µS·sⁿ", typicalRange: "50 - 1000 µS·sⁿ", physicalMeaning: "Distributed interfacial double-layer capacitance per unit pore area." },
      { symbol: "α", name: "Interfacial Dispersion Exponent", unit: "-", typicalRange: "0.85 - 0.98", physicalMeaning: "Atomic-scale roughness and pore wall heterogeneity." },
    ],
    fittingNotes: "Crucial for high-loading battery cathodes (>3 mAh/cm²) and activated carbon EDLC supercapacitors. The real-axis intercept of the extrapolated low-frequency branch equals R_s + R_ion / 3.",
    suggestedFrequencyRange: "1 mHz - 100 kHz",
    topology: {
      id: "bisquert-open-tlm",
      name: "Bisquert Open Porous Electrode TLM",
      category: "battery",
      description: "Distributed transmission line with blocking current collector boundary for porous battery and supercapacitor electrodes.",
      cdcNotation: "R_s + TLM_open(R_ion, R_ct, CPE_d)",
      branches: [
        {
          id: "b-rs",
          connection: "series",
          name: "Bulk Solution Resistance",
          elements: [
            { id: "el-rs", type: "R", name: "R_s", label: "Electrolyte R_s", value: 1.5, unit: "Ω", description: "Bulk electrolyte and contact resistance" },
          ],
        },
        {
          id: "b-tlm",
          connection: "series",
          name: "Porous Transmission Line",
          elements: [
            { id: "el-tlm-op", type: "TLM_open", name: "TLM_open", label: "Bisquert Open TLM", value: 65.0, unit: "Ω", exponent: 0.92, secondaryValue: 350.0, description: "Pore ionic resistance R_ion=65Ω, R_ct=350Ω, α=0.92" },
          ],
        },
      ],
    },
  },

  // 12. Bisquert Short / Transmissive TLM (DSSC / Fuel Cell / Membrane Catalysis)
  {
    id: "bisquert-short-tlm",
    name: "Bisquert Short / Transmissive TLM (Catalytic Front)",
    category: "fuel-cell",
    categoryLabel: "Fuel Cells & Photovoltaics",
    description: "Bisquert transmission line model with a transmissive / zero-impedance boundary at the rear contact. Standard model for Dye-Sensitized Solar Cells (DSSC), porous electrocatalyst gas diffusion layers (PEMFC), and porous mixed ionic-electronic conductors.",
    physicalPhenomenon: "Coupled electron transport in semiconductor nanoparticle networks (TiO2 mesoporous films) and redox electrolyte diffusion/recombination across the film with collection at the transparent conductive oxide (FTO).",
    cdcNotation: "R_s + TLM_short(R_tr, R_rec, C_chem)",
    nyquistShapeDesc: "A 45° high-frequency transmission segment bending into a low-frequency depressed semicircle terminating on the real axis at (R_s + R_tr/3 + R_rec).",
    bodeCharacteristics: "High-frequency -45° phase transitioning into an intermediate kinetic peak representing electron lifetime τ_n = R_rec · C_chem.",
    keyParameters: [
      { symbol: "R_s", name: "Substrate Resistance", unit: "Ω", typicalRange: "5 - 30 Ω", physicalMeaning: "FTO substrate sheet resistance and contact resistance." },
      { symbol: "R_tr", name: "Electron Transport Resistance", unit: "Ω", typicalRange: "10 - 150 Ω", physicalMeaning: "Macroscopic electron hopping resistance through the TiO2 mesoporous network." },
      { symbol: "R_rec", name: "Recombination Resistance", unit: "Ω", typicalRange: "50 - 800 Ω", physicalMeaning: "Charge transfer resistance for electron recombination with I3- triiodide." },
      { symbol: "C_chem", name: "Chemical Capacitance", unit: "µF", typicalRange: "100 - 2000 µF", physicalMeaning: "Electronic chemical capacitance reflecting the density of states in the TiO2 conduction band." },
    ],
    fittingNotes: "Provides direct quantification of electron collection efficiency η_coll = 1 - (R_tr / (3·R_rec)) and effective electron diffusion length L_n = L·√(R_rec / R_tr).",
    suggestedFrequencyRange: "10 mHz - 100 kHz",
    topology: {
      id: "bisquert-short-tlm",
      name: "Bisquert Transmissive / Short TLM",
      category: "fuel-cell",
      description: "Transmissive boundary transmission line for DSSC, catalyst gas diffusion layers, and mesoporous solar cells.",
      cdcNotation: "R_s + TLM_short(R_tr, R_rec, C_chem)",
      branches: [
        {
          id: "b-rs",
          connection: "series",
          name: "Substrate & Electrolyte",
          elements: [
            { id: "el-rs", type: "R", name: "R_s", label: "FTO Substrate R_s", value: 12.0, unit: "Ω", description: "Fluorine-doped tin oxide sheet resistance" },
          ],
        },
        {
          id: "b-tlm-sh",
          connection: "series",
          name: "Transmissive Porous Layer",
          elements: [
            { id: "el-tlm-sh", type: "TLM_short", name: "TLM_short", label: "Bisquert Short TLM", value: 45.0, unit: "Ω", exponent: 0.94, secondaryValue: 220.0, description: "Transport R_tr=45Ω, Recombination R_rec=220Ω, α=0.94" },
          ],
        },
      ],
    },
  },

  // 13. Solid-State Dielectric & Polymer with Havriliak-Negami Relaxation
  {
    id: "solid-dielectric-havriliak-negami",
    name: "Solid Polymer / Ceramic Dielectric (Havriliak-Negami)",
    category: "solid-state",
    categoryLabel: "Solid State Batteries & Polymers",
    description: "Advanced dielectric impedance model pairing Ohmic contact resistance with Havriliak-Negami (HN) and Cole-Cole asymmetric relaxation for solid polymer electrolytes (PEO-LiTFSI), ceramic solid electrolytes (LLZO, LAGP), and high-durability barrier paint coatings.",
    physicalPhenomenon: "Dipolar orientation relaxation and non-Debye ionic hopping dynamics in amorphous polymer backbones and disordered grain boundaries.",
    cdcNotation: "R_s + HN(R_0, τ, α, β) + (R_ct || CPE_int)",
    nyquistShapeDesc: "Broadened, asymmetric arc skewed at high frequencies, characteristic of non-exponential relaxation functions in disordered media.",
    bodeCharacteristics: "Broad dielectric loss peak in imaginary modulus M'' and permittivity ε'' with distinct power-law high-frequency and low-frequency slopes (α and α·β).",
    keyParameters: [
      { symbol: "R_s", name: "Contact & Lead Resistance", unit: "Ω", typicalRange: "0.5 - 10 Ω", physicalMeaning: "Electrode contact resistance." },
      { symbol: "R_0", name: "Dielectric Relaxation Strength", unit: "kΩ", typicalRange: "1 - 50 kΩ", physicalMeaning: "Zero-frequency relaxation step resistance (Δε·ε_0 / τ)." },
      { symbol: "τ_HN", name: "Relaxation Time Constant", unit: "µs", typicalRange: "0.1 - 500 µs", physicalMeaning: "Characteristic dipole / segmental hopping reorientation time." },
      { symbol: "α", name: "HN Width Parameter", unit: "-", typicalRange: "0.70 - 0.95", physicalMeaning: "Symmetric broadening factor of relaxation time distribution." },
      { symbol: "β", name: "HN Asymmetry Parameter", unit: "-", typicalRange: "0.50 - 0.90", physicalMeaning: "High-frequency skewness / asymmetric tail exponent." },
    ],
    fittingNotes: "When β=1, the model reduces identically to the symmetric Cole-Cole relaxation. When α=1 and β=1, it simplifies to ideal Debye dielectric relaxation.",
    suggestedFrequencyRange: "100 mHz - 1 MHz",
    topology: {
      id: "solid-dielectric-havriliak-negami",
      name: "Solid Electrolyte Havriliak-Negami Relaxation",
      category: "solid-state",
      description: "Non-Debye asymmetric dielectric relaxation for solid polymer electrolytes and ceramic grain boundaries.",
      cdcNotation: "R_s + HN(R_0, τ, α, β) + (R_ct || CPE)",
      branches: [
        {
          id: "b-rs",
          connection: "series",
          name: "High Frequency Contact",
          elements: [
            { id: "el-rs", type: "R", name: "R_s", label: "Contact R_s", value: 2.5, unit: "Ω", description: "Contact and lead wire resistance" },
            { id: "el-hn", type: "HN", name: "HN_diel", label: "Havriliak-Negami Element", value: 4500.0, unit: "Ω", exponent: 0.85, secondaryValue: 0.72, description: "R0=4500Ω, τ=1e-4s, α=0.85, β=0.72" },
          ],
        },
        {
          id: "b-int",
          connection: "parallel",
          name: "Interfacial Charge Transfer",
          elements: [
            { id: "el-qint", type: "CPE", name: "CPE_int", label: "Interfacial CPE", value: 15e-6, unit: "S·sⁿ", exponent: 0.90, description: "Electrode/solid-electrolyte interface" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 150.0, unit: "Ω", description: "Li+ stripping/plating charge transfer" },
          ],
        },
      ],
    },
  },

  // 14. Thin-Film Battery with Finite Reflective Warburg (Ws)
  {
    id: "thin-film-reflective-warburg",
    name: "Thin-Film Battery with Finite Reflective Warburg (Ws)",
    category: "battery",
    categoryLabel: "Battery / Thin-Film Intercalation",
    description: "Finite-length diffusion with a reflective/impermeable boundary at the current collector interface. Models solid-state intercalation of Li+ into thin-film electrodes (e.g. LiCoO2, LFP, Si anodes) at low frequencies.",
    physicalPhenomenon: "Chemical diffusion of intercalated species through a bounded solid layer of thickness L with zero flux at the current collector substrate (dC/dx = 0 at x = L).",
    cdcNotation: "R_s + (R_sei || C_sei) + (R_ct || CPE_dl) + W_s(R_d, τ_d)",
    nyquistShapeDesc: "Mid-frequency charge transfer semicircle followed by a 45° Warburg transition that curves sharply upward into a vertical capacitive line (phase -90°) at frequencies below the diffusion characteristic frequency f_d = 1 / (2π·τ_d).",
    bodeCharacteristics: "Low-frequency phase angle rises toward -90° (intercalation capacitance C_int = τ_d / R_d) rather than staying at -45°.",
    keyParameters: [
      { symbol: "R_s", name: "Ohmic Resistance", unit: "Ω", typicalRange: "0.5 - 5 Ω", physicalMeaning: "Electrolyte and contact resistance." },
      { symbol: "R_ct", name: "Charge Transfer Resistance", unit: "Ω", typicalRange: "10 - 80 Ω", physicalMeaning: "Interfacial intercalation charge transfer." },
      { symbol: "R_d", name: "Diffusion Resistance", unit: "Ω", typicalRange: "50 - 500 Ω", physicalMeaning: "Steady-state diffusion resistance (R_d = L / (z²F²A·C·D))." },
      { symbol: "τ_d", name: "Diffusion Time Constant", unit: "s", typicalRange: "0.5 - 20 s", physicalMeaning: "Characteristic diffusion time (τ_d = L² / D_chem)." },
    ],
    fittingNotes: "Directly yields the solid-state chemical diffusion coefficient D_chem = L² / τ_d when film thickness L is known.",
    suggestedFrequencyRange: "1 mHz - 100 kHz",
    topology: {
      id: "thin-film-reflective-warburg",
      name: "Thin-Film Intercalation with Reflective Warburg",
      category: "battery",
      description: "Intercalation battery model with finite reflective diffusion boundary for thin films and micro-batteries.",
      cdcNotation: "R_s + (R_ct || CPE_dl) + Ws(R_d, τ_d)",
      branches: [
        {
          id: "b-rs",
          connection: "series",
          name: "Electrolyte Resistance",
          elements: [
            { id: "el-rs", type: "R", name: "R_s", label: "Ohmic R_s", value: 3.2, unit: "Ω", description: "Ohmic series resistance" },
          ],
        },
        {
          id: "b-ct",
          connection: "parallel",
          name: "Interfacial Kinetics",
          elements: [
            { id: "el-qdl", type: "CPE", name: "CPE_dl", label: "Double Layer CPE", value: 22e-6, unit: "S·sⁿ", exponent: 0.91, description: "Electrode double layer" },
            { id: "el-rct", type: "R", name: "R_ct", label: "Charge Transfer R_ct", value: 45.0, unit: "Ω", description: "Intercalation charge transfer" },
          ],
        },
        {
          id: "b-ws",
          connection: "series",
          name: "Finite Solid-State Diffusion",
          elements: [
            { id: "el-ws", type: "Ws", name: "W_s", label: "Reflective Warburg Ws", value: 120.0, unit: "Ω", exponent: 2.5, description: "Diffusion resistance Rd=120Ω, τd=2.5s" },
          ],
        },
      ],
    },
  },

  // 15. SOFC Cathode with Extended Gerischer Reaction-Diffusion Element
  {
    id: "sofc-gerischer-cathode",
    name: "SOFC Mixed Conductor Cathode (Extended Gerischer)",
    category: "fuel-cell",
    categoryLabel: "Solid Oxide Fuel Cells & High Temp",
    description: "Models oxygen reduction reaction (ORR) on mixed ionic-electronic conductor (MIEC) cathodes (such as LSCF, BSCF) in Solid Oxide Fuel Cells (SOFC) where oxygen surface exchange is coupled with solid-state bulk oxygen vacancy diffusion.",
    physicalPhenomenon: "Coupled chemical reaction (O2 adsorption and surface dissociation) with ionic diffusion (oxygen vacancy transport) governed by the Adler-Lane-Steele (ALS) impedance model.",
    cdcNotation: "R_s + (R_gb || C_gb) + Gerischer(R_G, τ_G, α)",
    nyquistShapeDesc: "A distinctive tear-drop shaped skewed arc whose high-frequency asymptote is 45° (diffusion dominated) and low-frequency real intercept is R_G (reaction-diffusion limited).",
    bodeCharacteristics: "Peak phase angle is limited to -45° at intermediate frequencies, decaying to 0° at both very low and high frequencies.",
    keyParameters: [
      { symbol: "R_s", name: "Electrolyte YSZ Resistance", unit: "Ω", typicalRange: "0.1 - 2.0 Ω", physicalMeaning: "YSZ / GDC oxygen ion conduction electrolyte resistance." },
      { symbol: "R_G", name: "Gerischer Resistance", unit: "Ω", typicalRange: "0.5 - 25 Ω", physicalMeaning: "Overall ALS impedance amplitude (R_G = (RT / (2F²)) · √(1 / (c_v · D_v · r_k · a_v)))." },
      { symbol: "τ_G", name: "Reaction-Diffusion Time Constant", unit: "ms", typicalRange: "1 - 100 ms", physicalMeaning: "Characteristic chemical relaxation time (τ_G = c_v / (r_k · a_v))." },
      { symbol: "α_G", name: "Gerischer Dispersion Exponent", unit: "-", typicalRange: "0.90 - 1.0", physicalMeaning: "Homogeneity of oxygen vacancy distribution along cathode grains." },
    ],
    fittingNotes: "Provides simultaneous extraction of the surface oxygen exchange coefficient k_chem and the chemical vacancy diffusion coefficient D_chem without requiring separate isotope exchange depth profiling (IEDP).",
    suggestedFrequencyRange: "10 mHz - 500 kHz",
    topology: {
      id: "sofc-gerischer-cathode",
      name: "SOFC MIEC Cathode Gerischer Model",
      category: "fuel-cell",
      description: "Adler-Lane-Steele coupled surface oxygen exchange and diffusion for SOFC cathodes (LSCF, BSCF).",
      cdcNotation: "R_s + (R_gb || C_gb) + G(R_G, τ_G)",
      branches: [
        {
          id: "b-rs",
          connection: "series",
          name: "YSZ Electrolyte Ohmic",
          elements: [
            { id: "el-rs", type: "R", name: "R_s", label: "YSZ Electrolyte R_s", value: 0.85, unit: "Ω", description: "High-temperature YSZ electrolyte resistance" },
          ],
        },
        {
          id: "b-gb",
          connection: "parallel",
          name: "Electrolyte Grain Boundary",
          elements: [
            { id: "el-cgb", type: "C", name: "C_gb", label: "Grain Boundary C_gb", value: 1.2e-6, unit: "F", description: "Grain boundary dielectric capacitance" },
            { id: "el-rgb", type: "R", name: "R_gb", label: "Grain Boundary R_gb", value: 0.35, unit: "Ω", description: "Grain boundary ionic resistance" },
          ],
        },
        {
          id: "b-gerischer",
          connection: "series",
          name: "ORR Reaction-Diffusion",
          elements: [
            { id: "el-g", type: "G", name: "G_orr", label: "Gerischer ORR Element", value: 8.5, unit: "Ω", exponent: 0.025, description: "Gerischer RG=8.5Ω, τG=0.025s (25ms)" },
          ],
        },
      ],
    },
  },
];

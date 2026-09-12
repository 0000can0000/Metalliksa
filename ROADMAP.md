# LPBF & Metallurgy Simulation Roadmap (`ROADMAP.md`)

This roadmap defines the phased developmental milestones for the **MetalliX Additive Manufacturing & Metallurgy Intelligence Platform**. Every completed phase must undergo dual academic & functional verification and be registered in [`PROOF.md`](./PROOF.md).

---

## Phase Overview

```
[Phase 1: Ground Truth Data] ➔ [Phase 2: Thermal & Melt Pool Physics] ➔ [Phase 3: Microstructure & Solidification]
                                                                                        │
[Phase 6: Digital Twin Interop]  [Phase 5: Defect & Fatigue Prediction]  [Phase 4: Residual Stress & Distortion]
```

---

## Phase 1: Ground Truth Data Foundation & Standards (✅ COMPLETED)
- [x] **5-Tier Relational Schema**: `Build` $\rightarrow$ `ProcessParams` $\rightarrow$ `Sample` $\rightarrow$ `Properties` $\rightarrow$ `Source`.
- [x] **Curated Literature Datasets**: Peer-reviewed ground truth for Ti-6Al-4V, 316L SS, and AlSi10Mg with resolvable DOIs.
- [x] **Derived Quantities Engine**: Real-time calculation of $E_L$ (LED), $E_A$ (AED), $E_V$ (VED), $I_0$ (Peak Intensity), and $\Delta H / h_s$ (Normalized Enthalpy).
- [x] **Iso-VED Limitation Demonstrator**: Interactive sandbox demonstrating laser spot diameter and thermal dwell time decoupling.
- [x] **Standards Integration**: ASTM F3055, ASTM B962 (Archimedes), ASTM E8/E8M (Tensile), ASTM E1245 (Porosity).
- [x] **Export Formats**: Structured JSON and CSV data pipelines.

---

## Phase 2: High-Fidelity Melt Pool & Thermal Physics (🟡 IN PROGRESS)
- [x] **Analytical Moving Heat Source**: Rosenthal 3D steady-state point source solver.
- [x] **3D Interactive Melt Pool Visualizer**: Dynamic isotherm geometry ($T_{\text{liquidus}}$, $T_{\text{solidus}}$, $T_{\text{vaporization}}$).
- [x] **Eagar-Tsai 3D Distributed Heat Source**: Finite 1/e² Gaussian (`eagar-tsai-v1`) on the Melt Pool 3D lab. Build Job verdict stays `rosenthal-screening-v1`. Not powder-bed k degradation and not Goldak FEA.
- [x] **Goldak double-ellipsoid field**: Fachinotti–Cardona (2008) erf-corrected Nguyen integral (`goldak-v1`). Beam-seeded axes, not FEA.
- [x] **Dynamic Keyhole Vaporization Depth**: Fabbro cylindrical keyhole (`fabbro-keyhole-v1`, Appl. Sci. 2020) on Goldak/ET lab paths. Fresnel \(A\) only (no stacked \(\eta_\mathrm{eff}\)). Recoil is Knight \(0.54 P_\mathrm{sat}(T_s)\) with \(T_s\le T_v\), not collapse CFD.
- [x] **Marangoni Convection (screening)**: Heiple–Roper \(\partial\gamma/\partial T\) sign + 30–60 ppm S inversion (`marangoni-heiple-v1`). Reports Ma / flow direction / \(\mathrm{Pe}_{Ma}\). Not Navier–Stokes CFD and not a W/D fit.

---

## Phase 3: Microstructure & Rapid Solidification Kinetics (🔵 UPCOMING)
- [ ] **Thermal Gradient ($G$) and Solidification Rate ($R$) Mapping**: Extraction of $G$ and $R$ along the melt pool boundary.
- [ ] **Solidification Morphology Criteria**: Predicting Columnar vs. Equiaxed grain transitions ($G/R$ ratio).
- [ ] **Microstructural Scale Estimation**: Primary Dendrite Arm Spacing ($\lambda_1 = a \cdot \dot{T}^{-n}$) where cooling rate $\dot{T} = G \cdot R$.
- [ ] **Solid-State Phase Transformation Models**:
  - Ti-6Al-4V: $\beta \rightarrow \alpha'$ hexagonal martensite transformation upon rapid cooling ($> 410\text{ K/s}$).
  - 316L SS: Austenite cellular dendritic network with sub-micron cell walls.
  - AlSi10Mg: $\alpha$-Al matrix with eutectic Si network.

---

## Phase 4: Macro-Scale Inherent Strain & Part Distortion (🔵 UPCOMING)
- [ ] **Inherent Strain Tensor Calibration**: Derivation of anisotropic inherent strains ($\varepsilon_{xx}^*, \varepsilon_{yy}^*, \varepsilon_{zz}^*$) from local thermal history.
- [ ] **Voxelized Multi-Layer Finite Element Solver**: Fast layer-by-layer mechanical relaxation.
- [ ] **Baseplate Springback & Support Separation**: Simulating residual stress release post-EDM wire cut.

---

## Phase 5: Defect Morphology & Fatigue Life Prediction (🔵 UPCOMING)
- [ ] **Lack of Fusion (LoF) Geometric Criterion**: $h > W$ (hatch overlap deficit) or $t > D$ (layer penetration deficit).
- [ ] **Keyhole Collapse & Gas Entrapment**: Aspect ratio ($D/W > 1.5$) thresholding.
- [ ] **Murakami $\sqrt{\text{area}}$ Fatigue Model**: Extreme value statistics for internal defect size distribution and fatigue limit ($\sigma_w$) prediction.

---

## Phase 6: Autonomous Closed-Loop Optimization (🔵 UPCOMING)
- [ ] **Bayesian Process Window Optimization**: Optimal Pareto front balancing productivity (volumetric build rate $\text{VBR} = v \cdot h \cdot t$) vs. relative density ($\ge 99.7\%$).
- [ ] **Generative In-Situ Defect Mitigation**: Feed-forward parameter adaptation for thin walls, overhangs, and bulk regions.

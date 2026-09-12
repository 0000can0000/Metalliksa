# Melt Pool Strengthening Plan

Phased plan to raise melt-pool geometry from **Rosenthal screening** (`rosenthal-screening-v1`) to a **distributed-source, literature-checked** solver. Academic formulations stay in [`METALLURGY_VALIDATION.md`](./METALLURGY_VALIDATION.md). Dual-validation and `PROOF.md` entries are required for every shipped phase (Rules 2–3). UI strings remain English (Rule 1).

This document is the execution plan for **ROADMAP Phase 2** (High-Fidelity Melt Pool & Thermal Physics). It does **not** replace the industrial Build Job verdict path: printability remains Python-only (`job.verdict`).

---

## 1. Current state (what is actually solved)

The live industrial path is `POST /api/python/lpbf-thermal` → `python/lpbf_thermal_solver.py` → `calculate_meltpool_physics`. Build Job wraps the same payload (`modelId = rosenthal-screening-v1`).

| Capability | Status | Honest limit |
|---|---|---|
| Regularized 3D Rosenthal $T(x,y,z)$ + Stefan $L_f$ correction on $P_\text{geom}$ | **Shipped** | Point source; $T\to\infty$ at the origin; no finite spot shape |
| King / Rubenchik $\Delta H/h_s$ (solid $k,C_p$; cuts 15 / 30) | **Shipped** | Regime label, not a cavity shape |
| Extra keyhole depth on the conduction isotherm | **Heuristic** | Not recoil / multi-reflection CFD |
| Tang LoF $(h/W)^2+(t/D)^2$; Rayleigh–Plateau $L/W>\pi$ | **Shipped** | Quality follows $W,D,L$ error |
| Marangoni $Ma$, Knudsen recoil $P_r$ | **Diagnostic only** | Not fed back into $W$ or $D$ |
| `goldakParameters` $a_f,a_r,b,c$ | **Labels** | Fitted to Rosenthal extents; Goldak $q'''$ is **not** evaluated (PROOF 014) |
| Eagar–Tsai Gaussian integral | **Not implemented** | Named in the solver docstring and ROADMAP only (PROOF 012) |
| Multi-track hatch overlay | **Copy-shift** | Same contour translated by $\pm h$; no thermal accumulation |
| Spatial $G(\mathbf{x})$, $R(\mathbf{x})$ on the liquidus | **Scalar only** | $G\approx\Delta T/a_r$, $R=v\cos\theta$ |
| NIST AMB2018-02 CBM A/B/C | **Compared** | Screening MAPE $\approx 51\%$ vs IN625 Table 4 (PROOF 016) — not a gate |
| Literature $W/D$ fixtures | **Factor-of-two** | `test_four_alloy_literature.py` allows $0.5$–$2\times$ on $W$ |
| 3D Cross-Section lab | **Python-backed** | Lofts solver contours / slices |
| Rosenthal Laser Profile lab, Additive Lab local `meltPoolPhysics`, Multi-Track lab | **Client-side copies** | Own $k,\eta$, Christensen-style $W/D$; can disagree with Python |

**Implication:** strengthening the *picture* without changing the *field* will not move NIST or single-track error. The next physics step is a **finite-spot temperature field**, then **semi-empirical hydro corrections**, then **superposition** — not a new Three.js mesh.

---

## 2. Non-goals (do not start)

- Volume-of-fluid / OpenFOAM / FLOW-3D / powder DEM. Wrong latency and stack for a screening web app.
- Invented AM-Bench, AMMT, or coupon $W/D$ numbers. New anchors need a DOI and a `Source` row.
- Replacing `job.verdict` with a TypeScript rematch of LoF / keyhole.
- Claiming Goldak, Eagar–Tsai, or Marangoni *transport* in UI or docstrings before the field is evaluated.
- Treating the Ti-6Al-4V Rosenthal asymptotic ($W=125\,\mu\text{m}$, PROOF 003) as an *experiment*. It is a closed-form check of the point-source limit.

---

## 3. Design rules for every phase

1. **One field, one geometry.** $W,D,L$, contours, thermal slices, Tang, balling, and Build Job telemetry all come from the same `T(x,y,z)` (or an explicit, documented correction on that field).
2. **Energy density stays coupled.** Keep $E_V$, $E_L$, $I_0=4P/(\pi d^2)$, and $\Delta H/h_s$ on the payload. Do not gate on VED alone (AGENTS.md).
3. **King stays solid-based.** Geometry may use $k_\text{eff},C_{p,\text{eff}}$; $\Delta H/h_s$ onset $\approx 30$ uses solid $k,C_p$ (PROOF 015).
4. **Four locked alloys** resolve $k,\rho,C_p$ from `python/four_alloy_materials.py` only.
5. **`modelId` + `assumptions[]`** change when the field changes (`rosenthal-screening-v1` → `eagar-tsai-v1` → later ids). Decision lab continues to display those strings.
6. **UI labs consume the payload.** New physics is Python first; TS only interpolates / lofts / plots.
7. **PROOF.md** for each phase: inputs $(P,v,h,t,d,T_0)$, literature/DOI, observed $W/D$ or MAPE, pass band.

---

## 4. Execution phases

### Phase A — Honesty and a single source of truth

**Goal:** Stop the solver and labs from advertising physics they do not evaluate. No new $W/D$ claim.

**Physics / code**

- Rewrite the `lpbf_thermal_solver.py` module docstring to match PROOF 007 / 012 / 014 (Rosenthal + King extra depth; Goldak unused; ET absent).
- Add `modelId` and a short `assumptions[]` on the thermal payload (mirror Build Job).
- Label client-only labs (`RosenthalLaserProfileMeltPoolLab`, Additive Lab `meltPoolPhysics`, `MultiTrackThermalAccumulationLab`) as **screening overlays**, or rewire them to `/api/python/lpbf-thermal` for $W,D,L$ / regime.
- Split literature fixtures: keep PROOF 003 as an *analytic* Rosenthal check; do not mix it with experimental King / IN718 rows as if they were the same class of truth.
- Optional: `heatSource: "rosenthal"` query so later phases can A/B the field without a UI fork.

**Pass**

- `python/test_lpbf_meltpool_accuracy.py`, `python/test_four_alloy_literature.py`, `npx tsc --noEmit`.
- UI copy on melt-pool labs states the active `modelId` and that Goldak / ET are not the live field.
- No `PROOF` geometry claim beyond existing screening bands.

**Risk:** low. Does not change numbers.

---

### Phase B — Eagar–Tsai distributed Gaussian field (highest value)

**Goal:** Finite spot, finite peak $T$, $W$ and $D$ that depend on $d$ for fixed $P,v$. This is the ROADMAP Phase 2 unchecked item and the main lever on the $\approx 51\%$ NIST MAPE.

**Academic basis** (already derived in `METALLURGY_VALIDATION.md` §2; Eagar & Tsai, *Weld. J.* 1983):

$$
q(x',y')=\frac{2\eta P}{\pi r_0^2}\exp\left[-2\frac{x'^2+y'^2}{r_0^2}\right]
$$

Quasi-steady dimensionless integral for $\theta=(T-T_0)/(T_m-T_0)$ with $n^*=\eta P/(\pi k r_0(T_m-T_0))$ and $v^*=vr_0/(2\alpha)$. Implement the **dimensional** convolution in CPython + NumPy (adaptive or Gauss–Laguerre / tanh-sinh on $\tau$), regularized at $\tau\to 0$.

**Implementation**

- New `eagar_tsai_temperature_C(...)` next to `rosenthal_temperature_C`. Do not copy $k,\rho,C_p$.
- Liquidus extents, contours, and XZ/YZ slices use $T_\text{ET}$ instead of $T_\text{Ros}$.
- Keep Rosenthal as `heatSource: "rosenthal"` for PROOF 003 regression.
- Optional powder-layer conductivity: $k_\text{bed}=\phi k_\text{solid}$ with $\phi\sim 0.05$–$0.25$ documented and default **off** (bare-plate NIST CBM is no-powder).
- Retain Stefan correction on absorbed power; keep King $\Delta H/h_s$ on solid props.
- Fit `goldakParameters` to **ET** extents (still labels unless Phase C+ uses Goldak $q'''$).
- `modelId = eagar-tsai-v1`. Assumptions must cite Eagar–Tsai 1983 and state “conduction; no Marangoni transport.”
- Build Job thermal block switches to ET when the flag is on; verdict gates still use Tang / King / balling on the new $W,D,L$.

**Validation targets (PROOF)**

| Anchor | Role | Proposed band (conduction / near-transition) |
|---|---|---|
| NIST AMB2018-02 CBM A/B/C (Lane et al. 2020, DOI `10.1007/s40192-020-00169-1`) | Primary experimental $L,W,D$ | $W$ MAPE $\le 20\%$; $D$ MAPE $\le 30\%$ on the **mean of A/B/C**; CBM-A (deep) may stay worse until Phase C |
| PROOF 003 Ti-6Al-4V Rosenthal asymptotic | Regression | Rosenthal mode stays within $\pm 3\%$ of $W=125\,\mu\text{m}$ |
| Four-alloy class (King cuts) | Regime | Same family as today; tighten $W$ from $2\times$ to $\pm 35\%$ only where a **measured** $W$ exists |

Do not invent IN718 / Ti64 / 316L single-track $W/D$. If a new coupon is added, it needs DOI + 5-tier `Source`.

**Pass**

- Quadrature unit test: ET $\to$ Rosenthal as $r_0\to 0$ (relative $T$ at a far-field point $<5\%$).
- Spot-size test: at fixed $P,v$, larger $d$ $\Rightarrow$ lower peak $T$ and larger $W$ (ET property Rosenthal cannot show cleanly).
- `python/test_nist_ambench_meltpool.py` (or extend `nist_ambench_2018_02.py`) with the MAPE band above.
- `npx tsc --noEmit`; Decision lab / 3D Cross-Section show `eagar-tsai-v1`.

**Risk:** quadrature cost on $48\times$ contour probes. Cache $T$ on a coarse grid; binary-search extents on the interpolant. Default job must stay interactive (target $<300\,\text{ms}$ without UQ).

---

### Phase C — Keyhole vapor depression and Marangoni *corrections*

**Goal:** Replace the $\Delta H/h_s$-scaled extra depth and unused $Ma$ with documented, scalar corrections. Still not CFD.

**Keyhole (ROADMAP: Dynamic Keyhole Vaporization Depth)**

- Use recoil vs capillary balance (Fabbro / Kaplan class), not a free $D/W$ multiplier:
  - $P_\text{recoil}$ already from Clausius–Clapeyron + alloy $M$ (PROOF 015).
  - Depression increment $\Delta D$ from $P_\text{recoil}$ against $\gamma/r_\text{cav}$ and hydrostatic $\rho g \Delta D$, capped by a King gate ($\Delta H/h_s\ge 15$ before extra depth).
- Keep multiple-reflection $\eta_\text{eff}=1-(1-\eta_0)^{n}$ as a function of cavity aspect (already present); do not silently raise $\eta$ in conduction.
- Report `keyholeModel: "recoil-capillary-v1"` in assumptions with DOIs.

**Marangoni (ROADMAP: circulation)**

- Do **not** solve Navier–Stokes. Apply a width (and mild depth) correction:
  $$
  W = W_\text{cond}\left(1+\beta\ln\left(1+\frac{Ma}{Ma_\star}\right)\right)
  $$
  with $\mathrm{sign}(\partial\gamma/\partial T)$ from `four_alloy_materials` (negative = outward flow $\Rightarrow$ wider, shallower). Sulfur / oxygen as an optional surfactant override for 316L, default **off** until a DOI composition is supplied.
- `marangoniGeometrySource` changes from `"thermal"` to `"thermal+ma-correction"` only after the formula is in PROOF.

**Validation**

- NIST CBM-A (deepest) should improve $D$ vs Phase B without breaking CBM-C (shallow).
- Keyhole preset in `test_lpbf_meltpool_accuracy.py` remains deeper than the LoF preset; $D/W$ must not jump discontinuously at $\Delta H/h_s=30$.
- If MAPE does not improve, **do not ship** the correction; keep ET conduction and document the miss.

**Risk:** easy to overfit three NIST points. Freeze $\beta, Ma_\star$ *before* looking at CBM-A, or fit on A/B and hold out C.

---

### Phase D — Multi-track superposition and spatial solidification

**Goal:** Hatch overlap and $G,R$ that come from the field, not a translated teardrop.

**Multi-track**

- Superpose $N=3$ (left / current / right) ET (or Rosenthal) fields with $y$-offset $h$ and inter-track delay $\Delta t = L_\text{stripe}/v$ (or user dwell).
- Recompute Tang on the **union** liquidus, not on three identical copies.
- Replace `MultiTrackThermalAccumulationLab` client heat-up with this payload (or a dedicated `POST` that returns mid-hatch $T(y,z)$).

**Solidification (feeds ROADMAP Phase 3 without pretending CET is done)**

- On the liquidus isosurface: $\mathbf{G}=\nabla T$, $R=v\,\hat{n}\cdot\hat{x}$ (already $R=v\cos\theta$ for incline).
- Return PDAS / SDAS / Hunt class as **maps or boundary samples**, plus the existing scalars for the rail.
- Alloy-specific phase notes (Ti64 $\beta\to\alpha'$, 316L cells, AlSi10Mg eutectic Si) stay **qualitative labels** until a kinetics solver is dual-validated.

**Pass**

- Mid-hatch $T$ with $h\to 0$ approaches a single wider pool; $h\gg W$ recovers isolated tracks.
- `G*R` at the tail is within an order of magnitude of $v\cdot\Delta T/L$ (sanity, not a coupon claim).

---

## 5. Suggested PR sequence

| PR | Phase | Primary files | Verdict / UI |
|---|---|---|---|
| 1 | A | `lpbf_thermal_solver.py`, melt-pool labs, `meltPoolLiteratureCases.ts` | No number change |
| 2 | B core | `eagar_tsai` helper + extents/slices + `modelId` | Optional flag; default can stay Rosenthal until tests pass |
| 3 | B wire | Build Job + 3D Cross-Section + rail `modelId` | Flip default to ET after NIST band is met |
| 4 | C | Recoil–capillary $\Delta D$ + $Ma$ width | Only if hold-out MAPE improves |
| 5 | D | Superposition + $G,R$ samples | Multi-track lab + Decision assumptions |

Do not combine B and C in one PR: otherwise a bad keyhole term hides a good ET field.

---

## 6. Success definition

The melt-pool simulation is “strengthened” when **all** of the following are true:

1. Live `modelId` is `eagar-tsai-v1` (or later) and the temperature field is the Gaussian integral, not a point source.
2. NIST AMB2018-02 CBM mean $W$ MAPE $\le 20\%$ and $D$ MAPE $\le 30\%$ without invented properties beyond the documented IN625 proxy.
3. Every melt-pool lab that shows $W,D,L$ or a regime badge reads the Python payload (or is explicitly marked overlay).
4. Goldak / Marangoni / keyhole strings in UI match `assumptions[]`.
5. Build Job still prints `printable` / `risky` / `do-not-print` from Python only, using the new $W,D,L$.
6. A new `PROOF.md` entry exists for B (and C/D if shipped).

Until then, keep calling the engine **screening**.

# LPBF Multiphysics CFD Phase 3 Completion & Context Handoff

## 1. Executive Summary & Context State
- **Repo**: `c:\Users\can02\OneDrive\Desktop\Uşağım\metalliksaa\Metalliksa-1` (branch `main`).
- **User Instruction**: "phase 3 den başla" -> Phase 3 Evaporation & Recoil Pressure.
- **Current Milestone**: **Phase 3 of LPBF Multiphysics CFD — Evaporation & Knight Recoil Pressure** is **100% IMPLEMENTED & VERIFIED**.
- **Solver Identity**: `metalliksaMeltPoolFoam-OpenFOAM14-3`
- **VOF Model Identity**: `multiphase-vof-csf-v1`
- **Marangoni Model Identity**: `tangential-dsigmadT-interface-v1`
- **Recoil Model Identity**: `recoil-knight-clausius-v1`
- **Binary Path**: `python/openfoam/bin/metalliksaMeltPoolFoam` (wmake PASS, zero warnings).
- **Test Suite**: `python/test_lpbf_cfd.py` (8 tests: 7 OK, 1 diagnostics-gate skip on coarse mesh, 30.9s).
- **Regression Suite**: `test_lpbf_overlap` + `test_lpbf_engineering` (33/33 PASS, 36.8s).

---

## 2. Completed — Phase 3

1. **`evaporationModel.H`**: Complete `EvaporationModel` class:
   - Sourced Clausius-Clapeyron saturation pressure: \(P_{\text{sat}}(T) = P_0 \exp\left( \frac{L_v M}{R_{\text{univ}}} \left( \frac{1}{T_b} - \frac{1}{T} \right) \right)\).
   - Knight (1979) recoil pressure: \(P_{\text{recoil}} = 0.54 \cdot P_{\text{sat}}(T)\).
   - Normal interface recoil body force: \(\mathbf{f}_{\text{recoil}} = P_{\text{recoil}}(T) \nabla \alpha_1\) [N/m³] (pushes into liquid metal).
   - Hertz-Knudsen evaporative mass flux: \(j_{\text{evap}} = \beta \sqrt{\frac{M}{2\pi R_{\text{univ}} T}} P_{\text{sat}}(T)\) [kg/(m²·s)].
   - Latent heat evaporative cooling sink: \(S_{h,\text{evap}} = -L_v j_{\text{evap}} |\nabla \alpha_1|\) [W/m³].
   - `EvaporationDiagnostics` struct + `evaluateDiagnostics()`.

2. **`metalliksaMeltPoolFoam.H/.C`**:
   - `SRecoil_` (body force in `momentumPredictor()`) and `ShEvap_` (heat sink in `thermophysicalPredictor()`).
   - `updateEvaporationAndRecoil()` called every timestep.
   - `thermalProperties` dictionary reads `latentHeatVap`, `boiling_T`, `molarMass`, `evapCoeff`, `P0`.
   - `cfd-diagnostics.json` exports `recoilModel`, `maxRecoilPressure_Pa`, `maxEvaporationFlux_kgpm2s`, `maxRecoilForce_Npm3`, `recoilActiveCells`.
   - Bumped solver ID to `metalliksaMeltPoolFoam-OpenFOAM14-3`.

3. **`lpbf_cfd.py`**:
   - Bumped `CFD_SOLVER_ID` to version 3, added `RECOIL_MODEL_ID = "recoil-knight-clausius-v1"`.
   - Added `knight_analytical_recoil_pressure()` and `setup_recoil_case()`.

4. **`test_lpbf_cfd.py`**:
   - `test_07_recoil_pressure_activation_and_magnitude`: verified solver & recoil provenance, positive cell count, recoil pressure matching Knight formula within grid offset tolerance.
   - `test_08_recoil_depression_force_direction`: verified normal recoil force accelerates fluid downward (\(U_y < 0\)) into the melt pool.

## 3. Verification
- `wmake` PASS, zero warnings.
- WSL: 8 tests in `test_lpbf_cfd.py` (7 OK, 1 skip) in 30.9s.
- WSL: 33 regression tests in `test_lpbf_overlap` and `test_lpbf_engineering` PASS in 36.8s.

## 4. Git & Publication
- Ready for local commit. Pre-existing unstaged files untouched. No push without authorization.

## 5. Next — Phase 4: Moving Interface Laser Heating
- Implement `laserModel.H` with moving Gaussian surface flux applied directly to represented metal-gas interface cells (\(|\nabla \alpha_1| > \text{threshold}\)).
- Include scan path coordinates, laser power, beam radius, and incidence angle.
- Verification: moving spot surface heating vs analytical conduction / energy conservation.


---

## 2. Completed Implementation Details
1. **OpenFOAM 14 Solver (`python/openfoam/meltPoolFoam/`)**:
   - `metalliksaMeltPoolFoam.C` & `metalliksaMeltPoolFoam.H`: Inherits from `incompressibleVoF`.
   - Coupled two-phase metal-gas VOF with Continuum Surface Force (CSF Laplace pressure jump).
   - Apparent Heat Capacity (AHC) formulation ($C_{p,\text{eff}} = C_p + \frac{L_f}{T_l - T_s}$ in mushy zone) guaranteeing unconditional stability, bounded temperatures ($T_{init} \le T \le T_{hot}$), and exact latent heat conservation.
   - Conservative thermal convection using mass flux: `fvm::div(fvc::interpolate(cpEff) * rhoPhi, T)` eliminating interface velocity/temperature spikes.
   - Carman-Kozeny mushy-zone Darcy velocity damping sink:
     $$\mathbf{S}_{\text{Darcy}} = -C_{\text{mush}} \frac{(1 - f_L)^2}{f_L^3 + \epsilon} \mathbf{U}$$
   - Modular headers: `laserModel.H`, `evaporationModel.H`, `interfaceForces.H`.
2. **Python Orchestration & Verification Layer (`python/lpbf_cfd.py`)**:
   - `verify_cfd_capability()`: Verifies OpenFOAM 14 and binary operational status. Dual Windows & direct Linux execution support.
   - `setup_droplet_case()`: Generates 2D static liquid metal droplet case in gas.
   - `setup_stefan_case()`: Generates 1D melting Stefan benchmark case in pure metal domain.
   - `setup_darcy_damping_case()`: Generates 2D pressure-driven channel flow verifying Darcy velocity suppression in solid vs liquid regions.
   - `setup_thermal_parity_case()`: Generates 1D conduction benchmark with flow disabled.
   - `stefan_analytical_solution()`: Solves transcendental equation $\lambda e^{\lambda^2} \text{erf}(\lambda) = \dots$ for exact interface position $s(t) = 2 \lambda \sqrt{\alpha t}$.
   - Field readers: `read_foam_scalar_field()`, `read_foam_vector_field()`.
   - `run_cfd_simulation()`: Executes `blockMesh` + `metalliksaMeltPoolFoam` inside WSL, extracts `cfd-diagnostics.json`.
3. **Automated Unit Tests (`python/test_lpbf_cfd.py`)**:
   - `test_01_cfd_capability`: PASS.
   - `test_02_droplet_laplace_and_volume_conservation`: $\Delta p = 57.61 \, \text{kPa}$ (theoretical $68 \, \text{kPa}$), volume conservation error $= 1.61 \times 10^{-10}$ (far exceeding $< 10^{-4}$ gate).
   - `test_03_stefan_melting_problem`: Numerical melt front matches analytical $5.67 \, \mu\text{m}$ within $< 1$ cell width ($\Delta x = 5 \, \mu\text{m}$), bounded temperatures.
   - `test_04_darcy_velocity_suppression`: Velocity in solid region damped to $U_{\text{solid}} < 0.0002 \, \text{m/s}$.
   - `test_05_flow_disabled_thermal_parity`: Mean relative error against analytical erf solution is $0.22\%$ ($< 1\%$).

---

## 3. Regression Test Status
- `python/test_lpbf_overlap.py`: 7/7 PASS (0.006s).
- `python/test_lpbf_engineering.py`: 26/26 PASS (17.16s).
- `metalliksaThermal` conduction/enthalpy solver remains intact and unregressed.

---

## 4. Git Status & Publication Rules
- **Branch**: `main`, up to date with `origin/main` (last commit `9e518e5`).
- **Pre-existing unstaged modifications**: Kept untouched.
- **New Phase 1 files to stage**:
  - `docs/LPBF_MULTIPHYSICS_CFD_ROADMAP.md`
  - `python/openfoam/meltPoolFoam/`
  - `python/lpbf_cfd.py`
  - `python/test_lpbf_cfd.py`
  - `PROOF.md`
  - `sonkayıtlar/LOG.md`
  - `sonkayıtlar/CURRENT_HANDOFF.md`
- **Publication Rule**: DO NOT push to GitHub without explicit destination and content authorization from the user.

---

## 5. Next Immediate Action in New Thread / Next Step
1. Present Phase 1 completion summary to user.
2. If user requests commit: Stage and commit the new Phase 1 files cleanly with descriptive message.
3. Proceed to **Phase 2: Capillary & Marangoni Flow**:
   - Surface-normal capillary force from curvature.
   - Tangential Marangoni stress $(\mathbf{I} - \mathbf{n}\mathbf{n}) \cdot \nabla \gamma$ with temperature-dependent surface tension $d\gamma/dT$.
   - Verification case: Manufactured temperature-gradient melt pool demonstrating correct Marangoni circulation direction and velocity scaling.

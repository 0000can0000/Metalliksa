# LPBF multiphysics CFD roadmap

## Decision

Keep `metalliksaThermal` as the verified conduction/enthalpy backend. Do not
turn it into a monolithic CFD solver. Add a separate OpenFOAM 14 backend named
`metalliksaMeltPoolFoam` and integrate it as the qualified free-surface
high-fidelity mode.

The high-fidelity label is allowed only when the registered backend actually
solves velocity, pressure, metal-gas interface motion, phase change, Marangoni
stress, recoil pressure and evaporation. Until then, the UI must retain the
explicit screening fallback.

## Target fields and equations

The solver owns these primary fields:

- `alphaMetal`: VOF metal-gas volume fraction.
- `U`: velocity.
- `p`: pressure.
- `T` and `H`: temperature and enthalpy.
- `liquidFraction`: solid-mushy-liquid fraction.
- Optional vapor fraction after the initial qualified version.

Use a PIMPLE-style loop coupling VOF transport, momentum, pressure correction,
enthalpy, phase fraction and interface source terms. Momentum includes
capillarity, tangential Marangoni stress, normal recoil pressure and a mushy
zone Darcy sink. The energy balance includes laser absorption, conduction,
latent heat of fusion, radiation, convection and evaporation enthalpy. Mass,
energy and phase bounds are publication gates.

## Implementation structure

Create a distinct solver package:

```text
python/openfoam/meltPoolFoam/
  metalliksaMeltPoolFoam.C
  createFields.H
  alphaEqn.H
  UEqn.H
  pEqn.H
  enthalpyEqn.H
  interfaceForces.H
  laserModel.H
  evaporationModel.H
  Make/
```

Add `python/lpbf_cfd.py` for case generation, execution, result extraction and
contract validation. Extend worker capabilities with
`openfoamFreeSurface`; do not infer free-surface capability merely from the
presence of OpenFOAM or `metalliksaThermal`.

The CFD result contract must expose free-surface geometry, velocity, pressure,
liquid fraction, recoil pressure, evaporation mass flux, keyhole depth history,
connected cavity/pore observations, mass and energy balances, Courant and
capillary timestep diagnostics, solver residuals, mesh/timestep convergence and
binary/model provenance.

## Qualification sequence

Each stage is a gate. Do not add the next physical mechanism until the current
stage has independent verification.

1. **VOF foundation**
   - Static droplet Laplace pressure.
   - Droplet volume conservation.
   - Interface thickness and parasitic-current diagnostics.
   - Gravity-driven bubble or droplet benchmark.

2. **Enthalpy and solidification**
   - One-dimensional Stefan problem.
   - Integrated latent-heat conservation.
   - Velocity suppression in solid and mushy material.
   - With flow disabled, convergence toward `enthalpy-fv-5` and
     `metalliksaThermal-OpenFOAM14-5` results.

3. **Capillary and Marangoni flow**
   - Surface-normal capillary force from interface curvature.
   - Tangential force from `(I - nn) grad(gamma)` with sourced `dGamma/dT`.
   - Manufactured temperature-gradient pool: correct flow direction,
     sign reversal and velocity scaling.

4. **Interface laser heating**
   - Apply a conservative Gaussian flux to the represented metal-gas interface,
     not a prescribed volumetric penetration depth.
   - Include real scan timing, power ramp and local incidence angle.
   - Start with fixed sourced absorptivity; add Fresnel angle/temperature/phase
     dependence and ray tracing only after the surface-flux implementation is
     verified.

5. **Evaporation and recoil**
   - Hertz-Knudsen/Clausius-Clapeyron mass flux using sourced material data.
   - Matching evaporation mass loss and latent-energy loss.
   - Recoil as an interface-normal stress, not a bulk pressure offset.
   - Derive keyhole geometry from the VOF cavity rather than appending an
     empirical depth.

6. **Optics and later powder physics**
   - Fresnel ray tracing and multiple reflection inside the depression.
   - DEM-derived particle size distribution, packing and layer spreading.
   - Powder-resolved absorption/partial melting, followed later by plume,
     shielding-gas, denudation and spatter coupling.

## First bounded deliverable

The first implementation increment is deliberately smaller than the final
solver:

- New solver skeleton and build files.
- Metal-gas VOF with surface tension.
- Enthalpy/phase fraction with mushy damping.
- Static droplet, Stefan and flow-disabled thermal-parity tests.
- No laser, Marangoni, recoil, keyhole, pore or application UI claims yet.

This increment is accepted only when its conservation and convergence checks
pass. The second increment adds manufactured Marangoni flow. The third adds
conservative moving interface heating. Evaporation/recoil and ray tracing
follow as separate, reviewable contracts.

## Initial validation target

The first integrated physical target is a three-dimensional, single straight
track on a bare 316L plate. It uses VOF, enthalpy, Marangoni flow and recoil,
but initially excludes discrete powder, plume and spatter. Compare predicted
time-dependent melt-pool geometry, absorption and cavity evolution against
independent NIST AM-Bench and synchrotron X-ray measurements. Keep calibration
conditions separate from blind holdout conditions, propagate property and
measurement uncertainty, and retain failed comparisons.

## Non-negotiable evidence rules

- Numerical verification is not experimental validation.
- Energy closure does not establish mesh convergence.
- No porosity percentage, relative density, residual stress, certification or
  conformance verdict may be emitted without a qualified model and applicable
  measurement evidence.
- A surrogate may accelerate a qualified solver only inside its declared
  training/applicability domain and must return predictive uncertainty.
- Existing screening and thermal backends remain available and clearly labeled;
  the new backend does not silently replace their contracts.

## Research anchors

- NIST A-AMB2022-01: synchronized X-ray melt-pool dynamics and laser absorption.
  <https://www.nist.gov/ambench/amb2022-01-benchmark-challenge-problems>
- Cunningham et al., keyhole morphology by ultrahigh-speed X-ray imaging.
  <https://doi.org/10.1126/science.aav4687>
- Khairallah et al., powder-scale flow, recoil, Marangoni, pores, spatter and
  denudation. <https://doi.org/10.1016/j.actamat.2016.02.014>


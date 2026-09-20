# LPBF physics development — 2026-09-16

## Implemented numerical contract

The reference enthalpy solver is now `enthalpy-fv-3`; the rebuilt OpenFOAM
backend is `metalliksaThermal-OpenFOAM14-3`. Both retain the stationary
enthalpy/latent-heat model and its boiling validity stop. These changes do not
add momentum, free surfaces, evaporation, gas transport, stress or measured
validation.

For a Gaussian with 1/e² radius r, the normalized probability in an interval
[a,b] is `(erf(sqrt(2)*(b-c)/r)-erf(sqrt(2)*(a-c)/r))/2`. Three axis integrals
give a cell weight. The depth integral uses layer thickness as its penetration
scale and clips the upper integration limit to the prescribed surface. The
existing center-selected active-cell mask remains authoritative. Stable erfc
differences retain small tail integrals. Mathematical definition:
[NIST DLMF §7.2](https://dlmf.nist.gov/7.2).

At two Gauss–Legendre nodes inside each accepted timestep, cell weights are
normalized separately to the absorbed laser power. Their average supplies the
volumetric source. Scan events bound every timestep; a dwell has no source. If
the 25 K sensible-equivalent enthalpy cap shortens a step, the moving source is
recomputed on that shorter interval. Failure to satisfy the cap in twelve
attempts is explicit. The thermal integrator remains first-order Euler; source
quadrature does not upgrade the full equation's order.

A local stability bound adds all harmonic interior-face conductances and the
baseplate/convection/radiation boundary conductances. The capacity uses fixed
reference density times the minimum sensible cp in the supplied table. A safety
factor of 0.9 and the previous Fourier and laser-motion bounds are retained.
The cp minimum is a numerical lower bound, not a new constitutive law.

## Observable numerical limitations

`numericalDiagnostics` records the source scheme, stability limiter, minimum
captured half-space Gaussian fraction, maximum power renormalization, maximum
distance between physical surface and represented top-cell face, maximum
accepted timestep, maximum sensible-equivalent increment and retry count.

Whole-cell layer mass and conduction are unchanged. Source clipping is not a
cut-cell method. Power normalization can hide an undersized domain, so the
capture/renormalization numbers must accompany results. Neither these numbers
nor energy closure establish mesh convergence. Maximum pool geometry still
comes from approximately sixty samples and needs a separate sampling study.

OpenFOAM emits `numerical-diagnostics.json`; the Python extractor requires the
new source integration identifier. A binary without that artifact fails with
an explicit rebuild message. Rebuild after changing the C++ source.

## Shared geometric defect diagnostics

Engineering results and analytical melt-pool results expose
`geometricDefectScreen` with model `elliptic-overlap-screening-v1`.
The idealized semi-ellipse uses `(h/W)^2+(t/D)^2 <= 1`. Its derived overlap
depth and geometric hatch limit are provided without an empirical correction.
Aggregate multi-track bounding boxes return unresolved rather than being
treated as local cross-sections. Zero melt remains explicit. Keyhole pores,
balling, gas pores and volumetric porosity remain unresolved.

[Harkin et al. (2023), Equation 5](https://link.springer.com/article/10.1007/s00170-023-11163-0)
supports the geometrical criterion and documents failures when inaccurate
analytical pool dimensions are substituted. Its Ti-6Al-4V-specific correction
is not applied to other materials or silently used as calibration here.
Legacy Build Job verdicts remain governed by their existing model contract.

## Verification obtained

- Seven new source tests: independent high-order quadrature, Gaussian tails,
  cell subdivision, beam translation/reversal, temporal integration error,
  source-cap reintegration, inactive powder, dark dwell, heterogeneous
  conduction positivity and schedule-integrated energy.
- Nine defect tests: analytical boundary, monotonicity, scale invariance,
  insufficient combined overlap despite individual width/depth sufficiency,
  aggregate/zero/invalid/extreme input and unresolved pore risks.
- WSL combined suite: 42/42 passed, including the existing actual OpenFOAM vs
  NumPy comparison for single-track, misaligned multilayer and island cases.
  Existing tolerance: identical voxel dimensions to eight decimal places,
  peak/G/R/cooling differences within 1% for the single-track fixture, 2%
  boundary-loss/peak tolerance on the other fixtures.
- TypeScript unit suite: 107/107 passed, including three new contract/render
  tests. Type checking, production build and fast analytical Build Job tests
  passed. These unchanged frontend checks were inherited across the handoff.

Initial Windows engineering tests encountered sandbox temp-directory/SQLite
access errors; the WSL run passed all tests with no skips. Native Windows lacks
SciPy, so the source implementation intentionally uses NumPy and Python's
standard math functions only; no new runtime dependency was added.

These are numerical and software verifications using synthetic fixtures, not
new experimental validation or proof of improved measured melt-pool accuracy.

## Broader development still open

### Liquidus crossing extraction contract (implemented)

For an active cell cooling from `T_old >= T_liquidus` to
`T_new < T_liquidus`, reconstruct the crossing fraction
`theta = (T_old - T_liquidus) / (T_old - T_new)` within the accepted step.
Interpolate the **components** of the active-neighbour spatial gradient:
`g_cross = (1-theta) g_old + theta g_new`. Report `G = |g_cross|` in K/m,
`cooling = (T_old-T_new)/dt` in K/s, and `R = cooling/G` in m/s.
The existing equal crossing-event weighting and `G > 1e-6 K/m` exclusion
remain explicit. Inactive powder is excluded at both endpoints. This is a
numerical reconstruction of the existing level-set kinematic identity,
not a new constitutive material law or a second-order thermal integrator.

Acceptance oracle: manufactured fields spatially affine and temporally affine (including
rotating gradient components) have analytically known crossing times and
gradients. Test step subdivision, zero gradient, inactive cells and heating
exclusion. Verify real OpenFOAM/reference parity using existing fixtures.
These synthetic oracles establish extraction correctness only, not physical
or experimental accuracy. Identifier: `linear-liquidus-crossing-v1`.

The user's request covers all LPBF simulations. The work above is a first
shared-physics increment. Remaining work includes every-step melt-volume
metrics/sampling convergence, liquidus-crossing temporal convergence studies,
material uncertainty and applicability, field-based local overlap/remelting,
CAD/scan/powder contracts, calibrated defect models, and independently verified
thermal-mechanical or thermal-fluid coupling. Do not mark these complete based
on this increment or invent missing material/validation data.

## Continuation verification — liquidus extraction and live UI

- Both thermal implementations now interpolate gradient components at each
  cooling liquidus crossing. Model IDs advanced to `enthalpy-fv-4` and
  `metalliksaThermal-OpenFOAM14-4`; extraction provenance is
  `linear-liquidus-crossing-v1`. Previous binaries fail the extraction guard.
- OpenFOAM rebuilt successfully. WSL combined source/defect/solidification/
  engineering suite: 47/47 PASS in 41.127 seconds, no skips. This includes
  actual OpenFOAM/reference comparisons and four new manufactured-field tests.
  A read-only independent source review found no numerical regression.
  A fifth solidification test separately passed in WSL, rejecting binaries
  without the new extraction contract (48 tests covered across the two runs).
- Browser UI smoke used a real OpenFOAM version-3 job before the crossing
  change: `7ab073a5c245488db3c43468eae626a2`, 316L, 40 W, 850 mm/s,
  20 µm mesh. Completed in 45.101 s; peak 2871.1 K, energy closure error
  1.46e-14%, reported L/W/D 200/80/20 µm. The new physics panel displayed
  integrated-source diagnostics, overlap index 5.5625, unresolved pore risks,
  expandable assumptions and the research source link. Visual inspection
  confirmed readable layout. Version-4 extraction is covered by the WSL
  suite; this browser run does not verify version 4.

## Final pre-handoff checks

Production build passed (49.14 s; existing large-chunk warning), and native fast Build Job tests passed. Independent review found stale diagnostics could survive a reused OpenFOAM case. The exact old diagnostics file is now removed before execution; the dedicated WSL regression passed (one additional test beyond the 42-test run). All 107 TypeScript tests and type checking passed. Browser verification was pending at that handoff and is recorded above for the continuation.

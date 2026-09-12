# LPBF engineering simulation — capability and verification record

This implementation is an **unvalidated transient thermal research solver**, with an actual OpenFOAM Foundation 14 backend. It is not a free-surface CFD solver, a process qualification system, or a production-ready LPBF model. The High-Fidelity option currently returns **Screening only** with an explicit reason. Installing OpenFOAM alone does not supply a laser/metal/gas/keyhole solver.

## Architecture and execution

`MeltPool3DCrossSectionLab` → typed HTTP client → `/api/lpbf/jobs` → Node JSON-lines bridge → Python worker in Ubuntu-22.04 WSL → persistent SQLite queue → isolated job process → `blockMesh`, `checkMesh`, `metalliksaThermal` → field extraction → JSON.

The bridge starts one worker lazily. It uses argument arrays, not a browser-provided shell command. The worker accepts only capabilities/submit/get/cancel RPCs. Queue capacity is 16, concurrency is one, and subprocess timeout is configurable from 10 to 3600 seconds. Cancellation and timeout kill the Linux process group including the mesher/solver. A child monitors its parent so a worker crash does not leave a long CFD process running. Jobs interrupted by worker restart become failed; completed jobs survive. An OS file lock prevents a second worker using the same queue.

The default job root is `.lpbf-jobs/` inside this project and is git-ignored. For regular WSL use, set `METALLIKSA_JOB_ROOT` to a dedicated directory on the Linux filesystem to avoid NTFS/OneDrive I/O overhead; launch the worker with that environment. Do not share a job root between separate application instances. Keep archived case files for reproducibility; there is no automatic deletion policy.

Node uses `METALLIKSA_WSL_DISTRO` (default `Ubuntu-22.04`). If WSL cannot start, it launches `py -3` locally. The independent reference thermal solver still works; High-Fidelity remains Screening only. Explicit selection of an unavailable OpenFOAM thermal backend returns a controlled job error. A transient run that boils returns a failed job, never an analytical result disguised as CFD.

### Build the OpenFOAM thermal backend

In WSL, from `Metalliksa-1/python/openfoam`:

```bash
source /opt/openfoam14/etc/bashrc
mkdir -p bin
wmake
```

Start Metalliksa normally with `npm run dev`. The capabilities endpoint must show `openfoamVersion: OpenFOAM-14` and `openfoamThermal: true`. `foamVersion` writes to stderr in the tested installation; detection handles both streams. The compiled binary is local and is not committed. The source, Make configuration and generated case input are reproducible artifacts.

### Modes

- **Quick Screening:** existing Rosenthal and Goldak temperature kernels, constant properties at preheat, no keyhole correction in the engineering comparison. Typical latency is seconds. Old analytical labs and Eagar–Tsai remain available.
- **Standard Simulation:** auto-selects the compiled OpenFOAM thermal solver in WSL; otherwise conservative NumPy reference finite volumes. Usually seconds to minutes; mesh, laser speed, dwell and timestep can make it substantially longer. A 600000-cell / 250000-step budget guards this research implementation.
- **High-Fidelity Simulation:** unavailable free-surface capability; explicit analytical screening fallback. It cannot produce a CFD validation badge.
- **Calibration / Validation:** Standard plus measured dimension comparison. Replicates must belong to the submitted process vector. Calibration is never automatically promoted to independent validation.

## Governing model

The stationary control volumes solve

`rho_ref * dh/dt = div(k(T, state) grad T) + Q_laser - boundary losses`.

Specific enthalpy is the integral of piecewise-linear `cp(T)` plus `L * liquidFraction(T)`. The liquid fraction varies linearly between solidus and liquidus. The enthalpy table includes every supplied property knot and both phase boundaries. Enthalpy-to-temperature inversion is monotonic. Pure copper's coincident phase boundaries use an explicitly recorded 1 K numerical regularization around the physical melting point.

Reference mass is fixed on a stationary grid: substrate density is evaluated at preheat; powder mass additionally uses packing fraction. Temperature-dependent density is retained as a constitutive table for diagnostics, but **is not substituted into stored energy without a continuity/moving-mesh equation**. This prevents fictitious energy/mass loss. No thermal expansion, shrinkage or moving solid mass is solved.

Face conductivity is the harmonic mean. Opposite internal face powers cancel exactly. Conductivity increases irreversibly from effective powder to dense material after reaching liquidus; the stationary mass remains conserved. This is a homogenized powder approximation, not a resolved powder packing or densification geometry model.

The 3D Gaussian is `exp(-2*r_xy²/r_beam² - 2*depth²/penetration²)`. Beam diameter means **1/e² intensity diameter**. Penetration is `max(layer thickness, cell size)` and is an assumption. Discrete cell source powers sum to `absorptivity * laser power` during laser-on intervals. There is no reflection or ray tracing. Powder geometry and attenuation assumptions can strongly affect temperature and depth.

The bottom boundary is held at baseplate preheat with half-cell conduction distance. Side walls are insulated. The current powder surface loses heat by convection and Stefan–Boltzmann radiation to preheat-temperature surroundings. Effective emissivity defaults to **estimated 0.35**. Preheat is prescribed, not computed from an entire build plate.

The grid activates powder layers at scan events, with newly active material at preheat. Meander and unidirectional tracks support hatch spacing, direction, layer rotation and dwell. Shared island scanning is explicitly unsupported and requires choosing a supported strategy. The current generator uses a uniform orthogonal mesh; adaptive/local mesh refinement is not implemented.

The explicit timestep is bounded by a conservative 3D Fourier limit, laser motion per step, scan event boundaries and a 25 K sensible-equivalent enthalpy increment. Refinement uses the realized grid spacing and mean used timestep; cap-limited sensitivity runs may be inconclusive.

**Validity stop:** nonfinite enthalpy, temperatures below the enthalpy domain, boiling, energy imbalance over 1%, mesh budget or step budget violation fail the job. Temperature is never clipped to boiling and then reported as a successful solution.

## Outputs and definitions

- Length/width/depth, volume and maximum YZ cross-sectional area are extracted from `T >= liquidus`. Geometry is sampled at approximately 60 instants and reported at the largest sampled molten volume. Length/width are rotated into scan coordinates. The YZ area is a grid-plane area, not a scan-normal area for rotated scans.
- Extents include all concurrently molten cells. Multiple disconnected pools are not reported as a resolved single-track contour. For multiple tracks, LoF/balling/keyhole heuristics based on aggregate width are disabled and overlap is unavailable. Remelting counts cells that cross liquidus again after cooling, divided by ever-melted cells. It is a volume fraction on this uniform grid, not an experimental bonding fraction.
- Peak temperature is tracked every step. `G=|grad T|`, `R=-(dT/dt)/G` and cooling rate are evaluated on cooling liquidus crossings. Reported means are crossing-event weighted; `mean(G)*mean(R)` need not equal `mean(GR)`.
- Marangoni number uses the temperature-dependent viscosity table, `|dγ/dT|`, temperature excess and pool width. Thermal Peclet uses laser translation speed, not a computed liquid velocity. These numbers do **not** establish resolved Marangoni flow.
- Keyhole depth and recoil pressure are **null** because no free surface or evaporation is solved. No porosity probability, cracking risk, residual stress or distortion is inferred from the thermal calculation.
- The reference backend writes `peak-field.npz`; OpenFOAM writes it plus `openfoam-case/coordinates.csv` and `snapshots.dat`. Snapshot rows contain `time, inputEnergy, lostEnergy, storedEnergy, minimumDt, steps, surfaceZ, peakT, sumG, sumR, sumCooling, frontCount, everMeltedCount, remeltedCount`, then cell temperatures in coordinate-file order. Coordinates include cell volume. Retain these files for subsequent thermal/mechanical coupling. Peak-temperature history JSON alone is insufficient for a full stress analysis.

## Material evidence

There are 15 explicit alloy identities. Eight have inherited solid/liquid endpoint data: Ti-6Al-4V, 316L, AlSi10Mg, IN718, CoCrMo, Scalmalloy, Hastelloy X and pure copper. These are marked **estimated** because this change does not independently verify their individual endpoint sources. Piecewise interpolation is an estimated law; viscosity remains constant where the legacy database provides one value.

IN625, 17-4PH, 15-5PH, 18Ni300, AlSi7Mg, CuCrZr and Ti-5553 require supplied data. They are registered identities with a data gap, **not seven newly validated material models**. No unknown alloy is silently replaced with IN718 in the new pipeline.

Supply a JSON object with:

```json
{
  "source": "Resolvable publication DOI / measured dataset and conditions",
  "solidus_K": 1533.15,
  "liquidus_K": 1609.15,
  "boiling_K": 3123.15,
  "latentHeat_J_kg": 270000,
  "absorptivity": 0.38,
  "emissivity": 0.35,
  "dGamma_dT": -0.0004,
  "table": [
    [273.15, 8190, 11.4, 435, 0.0055],
    [1609.15, 7450, 29, 730, 0.0055],
    [3123.15, 7450, 29, 730, 0.0055]
  ]
}
```

This example repeats **estimated legacy IN718 data to illustrate the schema**; it is not measured evidence and must not be relabelled for another alloy. Table columns are `T_K, rho_kg_m3, k_W_mK, cp_J_kgK, viscosity_Pa_s`. Tables must cover 273.15 K through boiling, be finite/positive and have strictly increasing temperature. User-supplied data remains unverified even with a source string.

## Verification and calibration

Every result records requested/effective modes, actual solver identity, OpenFOAM version, binary hash, implementation/input hashes, normalized settings, material evidence and assumptions. Cache identity includes inputs, properties, Python/C++ implementation and worker/binary capability. Failed, cancelled and timed-out results are never cached as successes.

Energy audit compares absorbed laser energy against stored enthalpy and integrated boundary losses. Machine-precision closure is necessary but **does not establish spatial accuracy**: a conservative coarse grid can still give very wrong dimensions. Domain-size independence, sampling convergence and powder/absorption uncertainty remain additional studies.

Three-level mesh/timestep studies report observed order and 1.25-factor GCI only for positive, monotone results with an approximately constant realized refinement ratio. Oscillations, identical voxel dimensions, cap-limited timestep ratios and non-asymptotic behavior are reported as **inconclusive**. No test automatically assigns “mesh independent”.

Measured widths/depths produce signed percentage errors, RMSE, signed bias and `sum(predicted*measured)/sum(predicted²)` as a dimension multiplier. If every prediction is zero, the factor is null and errors remain -100%. Factors are not absorptivity fits and are not silently applied. A held-out independent dataset, uncertainty intervals, matching beam definitions and measurement locations are still required for validation.

Tests:

```text
npm run lint
npm run build
py -3 python/test_lpbf_engineering.py
python3 python/test_lpbf_engineering.py        # WSL, includes real OpenFOAM comparison
py -3 python/test_lpbf_api.py                 # server running on localhost:3000
npm run test:meltpool
```

The reference/OpenFOAM verification fixture uses estimated IN718, 40 W, 800 mm/s, 80 µm beam, 80 °C preheat, 40 µm layer, 100 µm hatch, a 200 µm track, nominal 40 µm mesh and 1 µs max timestep. It is intentionally a low-power numerical fixture, not an industrial process prescription or an experimental benchmark.

## Scientific basis and remaining high-fidelity work

- [OpenFOAM Foundation 14 release](https://openfoam.org/version/14/) — backend identity and solver framework; this project compiles against the actual installed Foundation 14 headers.
- [Voller and Prakash, enthalpy methodology](https://doi.org/10.1016/0017-9310(87)90317-6) — latent heat/enthalpy basis. This implementation does not yet include their momentum sink coupling.
- [Goldak et al., finite element heat source](https://doi.org/10.1007/BF02667333) — retained analytical screening source model, not a validation of this LPBF case.
- [NIST AM model validation metrology](https://www.nist.gov/programs-projects/metrology-multi-physics-am-model-validation) and [NIST model uncertainty](https://www.nist.gov/publications/identifying-uncertainty-laser-powder-bed-fusion-models) — separate numerical verification, experimental validation and uncertainty evidence.
- [NIST keyhole/melt-pool benchmark](https://www.nist.gov/publications/benchmark-study-melt-pool-and-keyhole-dynamics-laser-absorption-and-porosity-additive) — a prospective validation target; no claim that this thermal solver reproduces it.

The user-requested end goal remains open: a tested metal/gas VOF solver with mass/momentum/enthalpy conservation, capillary curvature, temperature/composition-dependent Marangoni stress, enthalpy-porosity solid drag, evaporation mass/energy removal, recoil coupling, optical absorption/reflections, bounded interface transport and capillary/Courant timestep control. It then needs interface/spurious-current tests, evaporation energy/mass audits, free-surface benchmark comparisons, domain/mesh/timestep studies and independent experimental LPBF validation. None of these can be replaced by a thermal heat map or a status badge.

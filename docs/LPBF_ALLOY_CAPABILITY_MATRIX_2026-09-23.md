# LPBF alloy capability and IN625 data gate — 2026-09-23

## Current four-alloy capability

`python/four_alloy_materials.py` defines the locked identities, aliases, thermal
screening constants, slicer density, Marangoni and inherent-strain adapter
values, and literature P–v windows. Build-job
accepts only these identities. The transient registry derives estimated
solid/liquid endpoints from those constants; its interpolation is an assumed
constitutive model. A material hash identifies content, not source quality or
experimental validity. Sources: `python/four_alloy_materials.py`,
`python/lpbf_build_job_solver.py`, `python/lpbf_material_registry.py`,
`python/nist_ambench_2018_02.py`, and `PROOF.md` entries 012 and 016.

| Identity | Build-job thermal/slicer | Marangoni / inherent strain adapters | Transient material route | Direct melt-pool comparison in this repo | AMB2018-02 IN625 coverage | Same-physics GPU qualification |
| --- | --- | --- | --- | --- | --- | --- |
| Ti-6Al-4V (`ti6al4v`) | Screening available | Values present; model-level qualification open | `estimated-legacy` | Track class and W/D envelope; no full temperature property validation | `no_coverage` | Open |
| 316L (`ss316l`) | Screening available | Values present; model-level qualification open | `estimated-legacy` | Track class and W/D envelope; no full temperature property validation | `no_coverage` | Open |
| AlSi10Mg (`alsi10mg`) | Screening available | Values present; model-level qualification open | `estimated-legacy` | Read-style conduction class; published W/D absent in this fixture | `no_coverage` | Open |
| IN718 (`in718`) | Screening available | Values present; model-level qualification open | `estimated-legacy` | Track class and W/D envelope; no full temperature property validation | `proxy_only` | Open |

The W/D check is a factor-of-two *screening* envelope, per `PROOF.md` entry
012. The IN625 NIST comparison attached to build-job does not turn IN718 into
a directly validated case (`python/nist_ambench_2018_02.py`). The GPU boundary
remains open until an explicit-device thermal route matches CPU source,
material, boundaries, mesh and timestep, with energy closure and independent
numerical checks (`docs/LPBF_SHARED_CORE_CONTRACT.md`, GPU boundary).

## IN625 solid thermal source package

| Property | Source location and material state | Available data and unit | Usable scope here |
| --- | --- | --- | --- |
| Specific heat `Cp(T)` | [Special Metals INCONEL alloy 625 bulletin, Table 2, PDF p. 2](https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-625.pdf); footnote marks values as calculated | −18…1093 °C; J/(kg K) | Combined with `k(T)` only −18…982 °C |
| Solid conductivity `k(T)` | Same bulletin, Table 3, PDF p. 2; Battelle measurements, material annealed 2100 °F for 1 h | −157…982 °C; W/(m K) | Combined with `Cp(T)` only −18…982 °C |
| Reference density and melting interval | Same bulletin, Table 2, PDF p. 2 | 8.44 g/cm³; 1290…1350 °C | Reference facts, not a temperature-dependent density law |
| Alternative solid fit | [NIST-hosted Yang et al. 2021 paper, Table 1, PDF p. 8](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=932570) | `Cp = 0.2437 T + 338.39` J/(kg K), `k = 0.0153 T + 5.2366` W/(m K); Kelvin interpretation of `T` inferred from Table 1 units and room-temperature agreement | Paper gives no explicit fit validity range; no extrapolation into liquid phase |
| Powder conductivity | [NIST Zhang et al. 2019 abstract](https://www.nist.gov/publications/thermal-properties-metallic-powder-laser-powder-bed-fusion-additive-manufacturing) | 0.65 at 100 °C, 1.02 W/(m K) at 500 °C | Separate powder state; never substitute for bulk solid |

`python/in625_thermal_material.py` exposes only linearly interpolated solid
`k(T)` and `Cp(T)` over their common tabulated interval (−18…982 °C). It
rejects requests outside that interval, including the 1290…1350 °C melting
range. It is deliberately absent from `four_alloy_materials.py` and the
transient registry's automatic legacy table. Its values describe the bulletin's
bulk product condition, not LPBF powder or a melt pool.

## Missing evidence before broader admission

The transient registry requires a source-backed, positive five-column table
`[T_K, rho_kg_m3, k_W_mK, Cp_J_kgK, viscosity_Pa_s]` extending at least to
boiling temperature, plus solidus, liquidus, latent heat, absorptivity,
emissivity and surface-tension slope (`python/lpbf_material_registry.py`). The
sources above lack a supported liquid and high-temperature extension of that
table, temperature-dependent density and viscosity, and model-specific optical
properties. The NIST solid fit has no stated validity interval. Supplying
constants or continuing the solid fit through melting would invent model input.

IN625 remains `missing` in the transient catalog without a complete supplied
table and is rejected by the four-alloy build-job identity allowlist. Any
future thermal admission must first record source, material state, units,
temperature span, interpolation, uncertainty and numerical comparison. Separate
build-job, slicer, fatigue and qualification evidence would be required for
those features. [NIST AM-Bench 2018 benchmark description](https://www.nist.gov/ambench/amb2018-02-description)
describes bare-plate IN625 tracks; its melt-pool measurements are a comparison
target, not a thermophysical property source or approval of the model.

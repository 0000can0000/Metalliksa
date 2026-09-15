# CMU Ti-6Al-4V melt-pool measurements — offline import

Source: Justin Miner and Sneha Prabha Narra (2024), [CMU dataset version 1](https://doi.org/10.1184/R1/25696293.v1), CC BY 4.0. The [publisher API](https://api.figshare.com/v2/articles/25696293/versions/1) was checked on 2026-09-15. The dataset description identifies an EOS M290; this is source-reported machine metadata, not a matching declaration for the current application specimen.

## Archived evidence

The manifest records official download URLs, file sizes, publisher MD5 and local SHA-256 for STMeasurements.csv, MTMeasurements.csv and README.txt. All three match the publisher API. Raw payloads stay ignored by Git. The importer pins the three publisher identities for this version, reads the checked bytes directly, and rejects mutation, missing/duplicate files and metadata changes. MD5 matching is an acquisition identity check, not a general cryptographic authenticity guarantee.

To restore a missing payload, download its exact manifest URL to the named raw path, then run the verifier. There is no automatic download or network access in the importer.

```powershell
py -3 -B python/cmu_ti64_import.py data/benchmark/cmu-ti64-meltpool-v1 --summary
# Omit --summary to emit the complete normalized record set as JSON on stdout.
py -3 -B python/test_cmu_ti64_import.py
```

## Source review and conversion rules

- Actual ST file: 216 rows and six columns. Its power column is absent despite the README listing it. Import power as null; never copy MT power into ST.
- Actual MT file: 410 rows and seven columns including power in watts. It describes multi-track, powder-entrained cross sections; ST and MT remain separate measurement scopes.
- Preserve velocity in mm/s, orientation in degrees, width/remelt depth/cap height in micrometres. Depth and cap are separate quantities; no silent addition or conversion to a total pool depth.
- The documented `-1` missing sentinel becomes null with a named missing-field entry. Empty, nonnumeric, nonfinite, malformed and physically invalid values cause the whole import to fail. No row averaging, deduplication, outlier removal or missing-value imputation occurs.
- Each row retains filename, source line, DOI and source SHA-256. Slice is a source cross-section label, not a proven independent specimen identifier.
- The dataset description says ST measurements were not used in the associated manuscript. This is retained as a limitation.

The first successful local import contained 626 records. No values were copied into solver material laws, the current specimen or the application evidence registry.

## Grouping and eligibility

Rows with known power and speed receive a coarse condition-group candidate using those two quantities. Orientations and slices under that condition stay together. ST rows lack power and receive no candidate group. These candidates are not independent-build IDs and do not establish leakage-free separation. Every split remains `unassigned`.

Solver-comparison, ML-training and independent-validation eligibility remain false. Beam profile/diameter, layer thickness, powder lot and thermal boundaries are unresolved in this adapter; specimen/build independence and the intended comparison metric must be reviewed before a split or calibration is approved. Source-reported dimensions are measurements, but ingesting them is not validation of a model. No geometry error, predictive accuracy or industrial acceptance is claimed.

Next: review the associated experimental methods against a specific solver mode, resolve ST power with a cited source if possible, and define independent groups and acceptance tolerances before assigning calibration/holdout records.

### Follow-up source check (2026-09-15)

The indexed primary-publisher text for [Miner et al., section 2.2, fatigue coupon fabrication](https://doi.org/10.1016/j.addma.2024.104506) reports 370 W, a manufacturer-reported 100 µm spot, 140 µm hatch, 30 µm layers and 180 °C preheat for the fatigue coupons. That experiment scope does not establish applicability to every ST CSV measurement. Those values were not inserted into ST records or the solver. Direct full-text retrieval returned HTTP 403 in this session; this was a bounded indexed-text check, not a full-paper methods review. ST power, comparison geometry and independent build grouping remain unresolved.

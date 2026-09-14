# python/lpbf_evidence.py

- finite_tree · function · L13-L19 — def finite_tree(value)
- measurement_evidence · function · L22-L51 — def measurement_evidence(rows, p)
- resource_estimate · function · L54-L71 — def resource_estimate(p, m)
- thermal_audits · function · L74-L95 — def thermal_audits(coords, volumes, p, m, liquid_fraction)
- enforce_thermal_balances · function · L98-L124 — def enforce_thermal_balances(result)
- write_artifacts · function · L127-L147 — def write_artifacts(result, folder)
- write_field_slices · function · L150-L176 — def write_field_slices(field, folder, result)
- FieldRecorder · class · L179-L229 — class FieldRecorder
- __init__ · method · L185-L197 — def __init__(self, folder, coords, spacing, material, process=None)
- record · method · L199-L223 — def record(self, time, temperature, surface)
- finish · method · L225-L229 — def finish(self)

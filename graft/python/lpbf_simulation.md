# python/lpbf_simulation.py

- validate · function · L33-L64 — def validate(raw)
- fingerprint · function · L67-L78 — def fingerprint(p, m): # Source changes invalidate cache, including analytical and material dependencies.
- screening · function · L81-L107 — def screening(p, m)
- rosenthal · function · L88-L90 — def rosenthal(x, y, z)
- scan_segments · function · L110-L142 — def scan_segments(p)
- conduction_rate · function · L145-L155 — def conduction_rate(T, k, active, dx)
- active_gradient · function · L158-L175 — def active_gradient(T, active, dx)
- transient · function · L178-L308 — def transient(p, m, report=lambda *args: None, artifact_dir=None)
- run · function · L311-L393 — def run(raw, report=lambda *args: None, artifact_dir=None, capabilities=None)

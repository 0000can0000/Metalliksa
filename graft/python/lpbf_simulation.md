# python/lpbf_simulation.py

Refreshed from Python AST after the 2026-09-16 physics increment; call graph coverage remains unknown.

- validate · function · L35-L66 — def validate(raw):
- fingerprint · function · L69-L80 — def fingerprint(p, m):
- screening · function · L83-L109 — def screening(p, m):
- scan_segments · function · L112-L144 — def scan_segments(p):
- conduction_rate · function · L147-L157 — def conduction_rate(T, k, active, dx):
- active_gradient_components · function · L160-L177 — def active_gradient_components(T, active, dx):
- active_gradient · function · L180-L181 — def active_gradient(T, active, dx):
- liquidus_crossing_sums · function · L184-L203 — def liquidus_crossing_sums(old, new, active, dx, dt, liquidus):
- transient · function · L206-L343 — def transient(p, m, report=lambda *args: None, artifact_dir=None):
- run · function · L346-L432 — def run(raw, report=lambda *args: None, artifact_dir=None, capabilities=None):

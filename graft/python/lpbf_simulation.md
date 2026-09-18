# python/lpbf_simulation.py

- validate · function · L37-L68 — def validate(raw)
- fingerprint · function · L71-L82 — def fingerprint(p, m): # Source changes invalidate cache, including analytical and material dependencies.
- screening · function · L85-L111 — def screening(p, m)
- rosenthal · function · L92-L94 — def rosenthal(x, y, z)
- scan_segments · function · L114-L146 — def scan_segments(p)
- conduction_rate · function · L149-L159 — def conduction_rate(T, k, active, dx)
- active_gradient_components · function · L162-L179 — def active_gradient_components(T, active, dx)
- active_gradient · function · L182-L183 — def active_gradient(T, active, dx)
- liquidus_crossing_sums · function · L186-L205 — def liquidus_crossing_sums(old, new, active, dx, dt, liquidus)
- transient · function · L208-L341 — def transient(p, m, report=lambda *args: None, artifact_dir=None)
- run · function · L344-L451 — def run(raw, report=lambda *args: None, artifact_dir=None, capabilities=None)

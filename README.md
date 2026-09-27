# Metalliksa Research Engineering Workstation

Three connected workspaces: **LPBF Engineering**, **Materials Intelligence**, and **Evidence & Qualification**. LPBF is the default entry point; the Research Hub connects literature metadata, reviewed numeric findings and module evidence without silently changing solver inputs.

See the [documentation map](docs/README.md), [workstation architecture and workflows](docs/RESEARCH_WORKSTATION.md), and [LPBF model scope](docs/LPBF_ENGINEERING.md). Start with `npm run dev`; check with `npm run lint`, `npm run test:unit` and `npm run build`.

Industrial LPBF Build Job path: Python owns printability (`POST /api/python/lpbf-build-job`). UI is English-only.

## Progress continuity rule

Every work segment must be recorded in [sonkayıtlar/LOG.md](sonkayıtlar/LOG.md) with:

- What was done last
- What the next planned step is
- Whether the segment is complete or partial
- Any blocker/reason if not complete

Apply this for all modules (simulation, UI, materials, evidence, tests, and docs).

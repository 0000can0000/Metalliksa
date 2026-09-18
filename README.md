# Metalliksa Research Engineering Workstation

Three connected workspaces: **LPBF Engineering**, **Materials Intelligence**, and **Evidence & Qualification**. LPBF is the default entry point; the Research Hub connects literature metadata, reviewed numeric findings and module evidence without silently changing solver inputs.

See the [documentation map](docs/README.md), [workstation architecture and workflows](docs/RESEARCH_WORKSTATION.md), and [LPBF model scope](docs/LPBF_ENGINEERING.md). Start with `npm run dev`; check with `npm run lint`, `npm run test:unit` and `npm run build`.

Industrial LPBF Build Job path: Python owns printability (`POST /api/python/lpbf-build-job`). UI is English-only.

## LPBF Faz 5 notes

- **Default job** skips UQ and NIST AM-Bench (`enableUq=false`, `includeAmbench=false`). Use **Run UQ** / **Validate vs NIST** in the Decision lab.
- **Hash cache** keys alloy + P/v/h/t/d + seed + strategy + mesh fingerprint + flags.
- **Air-gap**: set `AIRGAPPED=1` to disable Gemini / NVIDIA cloud / live external DFT & pricing; local LPBF stays open.
- **SBOM**: `npm run sbom` → CycloneDX JSON under `sbom/` (Python + Node).
- **Tests**: `npm run test:lpbf` (fast); `npm run test:lpbf:slow` (UQ + NIST).

## Progress continuity rule

Every work segment must be recorded in [sonkayıtlar/LOG.md](sonkayıtlar/LOG.md) with:

- What was done last
- What the next planned step is
- Whether the segment is complete or partial
- Any blocker/reason if not complete

Apply this for all modules (simulation, UI, materials, evidence, tests, and docs).

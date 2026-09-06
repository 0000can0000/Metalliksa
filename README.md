# MetalliX Pocket Model

Industrial LPBF Build Job path: Python owns printability (`POST /api/python/lpbf-build-job`). UI is English-only.

## LPBF Faz 5 notes

- **Default job** skips UQ and NIST AM-Bench (`enableUq=false`, `includeAmbench=false`). Use **Run UQ** / **Validate vs NIST** in the Decision lab.
- **Hash cache** keys alloy + P/v/h/t/d + seed + strategy + mesh fingerprint + flags.
- **Air-gap**: set `AIRGAPPED=1` to disable Gemini / NVIDIA cloud / live external DFT & pricing; local LPBF stays open.
- **SBOM**: `npm run sbom` → CycloneDX JSON under `sbom/` (Python + Node).
- **Tests**: `npm run test:lpbf` (fast); `npm run test:lpbf:slow` (UQ + NIST).

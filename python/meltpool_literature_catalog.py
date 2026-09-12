#!/usr/bin/env python3
"""
Measured single-track melt-pool catalog (research database for physics checks).

Only peer-reviewed W/D with P, v, d, T0 and a DOI. Solver-echo / randomized
sweeps (e.g. the 640-row jsonl on the research-panel branch) are NOT ground
truth — Rule 4 in RULES.md.

Does not re-score Build Job printability.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

CATALOG_ID = "meltpool-lit-catalog-v1"

REQUIRED_MEASURED_FIELDS = (
    "laserPower_W",
    "scanSpeed_mm_s",
    "beamDiameter_um",
    "preheatTemp_C",
    "width_um",
    "depth_um",
    "doi",
)

# Isolated single-track rows only. Hatch-overlapped weld lines, cube top-layer
# melt pools, figure-digitized guesses, and solver-echo sweeps are not ingested.
GAPS: List[Dict[str, Any]] = [
    {
        "material": "AlSi10Mg",
        "status": "no_measured_track",
        "doi_notes": [
            "10.1016/j.addma.2022.103112 — Sow et al. Table 3 has W/D but samples 7–40 are 5 weld lines at 100 µm hatch; 1–6 and 41–57 are cube top layers.",
            "10.1007/s00170-025-17344-3 — Piedra et al. Table 3 reports experimental width without depth.",
        ],
        "reason": "No isolated single-track table with P, v, d, T0, W, and D that can be transcribed without inventing a missing field.",
    },
    {
        "material": "Ti-6Al-4V",
        "status": "no_measured_track",
        "doi_notes": [
            "10.1063/1.1712881 — Rosenthal asymptotic (PROOF 003); theory, not a micrograph. Keep kind=asymptotic.",
            "10.1007/s40964-017-0030-2 — Dilip et al. state selected depths in text (100 W / 500 mm/s → 45 µm; 195 W / 500 mm/s → 176 µm) but do not tabulate matching widths or T0.",
        ],
        "reason": "No complete measured P–v–d–T0–W–D row. Do not digitize Fig. 6 or copy third-party figure reads as ground truth.",
    },
]


TRACKS: List[Dict[str, Any]] = [
    # Lane et al., Integr. Mater. Manuf. Innov. (2024) Table 4 — IN718 bare plate, AMMT.
    {
        "id": "nist-amb2022-03-0",
        "material": "Inconel 718",
        "laserPower_W": 285.0,
        "scanSpeed_mm_s": 960.0,
        "beamDiameter_um": 67.0,
        "preheatTemp_C": 23.5,
        "width_um": 136.3,
        "depth_um": 139.7,
        "kind": "measured",
        "doi": "10.1007/s40192-024-00355-5",
        "source": "Lane et al. 2024 Table 4 case 0 (AMB2022-03 baseline)",
    },
    {
        "id": "nist-amb2022-03-1.1",
        "material": "Inconel 718",
        "laserPower_W": 285.0,
        "scanSpeed_mm_s": 960.0,
        "beamDiameter_um": 49.0,
        "preheatTemp_C": 23.5,
        "width_um": 106.2,
        "depth_um": 227.2,
        "kind": "measured",
        "doi": "10.1007/s40192-024-00355-5",
        "source": "Lane et al. 2024 Table 4 case 1.1 (spot 49 µm)",
    },
    {
        "id": "nist-amb2022-03-1.2",
        "material": "Inconel 718",
        "laserPower_W": 285.0,
        "scanSpeed_mm_s": 960.0,
        "beamDiameter_um": 82.0,
        "preheatTemp_C": 23.5,
        "width_um": 141.7,
        "depth_um": 102.4,
        "kind": "measured",
        "doi": "10.1007/s40192-024-00355-5",
        "source": "Lane et al. 2024 Table 4 case 1.2 (spot 82 µm)",
    },
    {
        "id": "nist-amb2022-03-2.1",
        "material": "Inconel 718",
        "laserPower_W": 285.0,
        "scanSpeed_mm_s": 1200.0,
        "beamDiameter_um": 67.0,
        "preheatTemp_C": 23.5,
        "width_um": 112.9,
        "depth_um": 109.7,
        "kind": "measured",
        "doi": "10.1007/s40192-024-00355-5",
        "source": "Lane et al. 2024 Table 4 case 2.1 (1200 mm/s)",
    },
    {
        "id": "nist-amb2022-03-2.2",
        "material": "Inconel 718",
        "laserPower_W": 285.0,
        "scanSpeed_mm_s": 800.0,
        "beamDiameter_um": 67.0,
        "preheatTemp_C": 23.5,
        "width_um": 156.1,
        "depth_um": 176.5,
        "kind": "measured",
        "doi": "10.1007/s40192-024-00355-5",
        "source": "Lane et al. 2024 Table 4 case 2.2 (800 mm/s)",
    },
    {
        "id": "nist-amb2022-03-3.1",
        "material": "Inconel 718",
        "laserPower_W": 325.0,
        "scanSpeed_mm_s": 960.0,
        "beamDiameter_um": 67.0,
        "preheatTemp_C": 23.5,
        "width_um": 134.3,
        "depth_um": 166.1,
        "kind": "measured",
        "doi": "10.1007/s40192-024-00355-5",
        "source": "Lane et al. 2024 Table 4 case 3.1 (325 W)",
    },
    {
        "id": "nist-amb2022-03-3.2",
        "material": "Inconel 718",
        "laserPower_W": 245.0,
        "scanSpeed_mm_s": 960.0,
        "beamDiameter_um": 67.0,
        "preheatTemp_C": 23.5,
        "width_um": 129.4,
        "depth_um": 116.9,
        "kind": "measured",
        "doi": "10.1007/s40192-024-00355-5",
        "source": "Lane et al. 2024 Table 4 case 3.2 (245 W)",
    },
    # Guo et al., Micromachines 15(2):170 (2024) Table 3 experimental W/D, 100 µm spot.
    {
        "id": "guo-316l-n01",
        "material": "316L Stainless Steel",
        "laserPower_W": 260.0,
        "scanSpeed_mm_s": 520.0,
        "beamDiameter_um": 100.0,
        "preheatTemp_C": 25.0,
        "width_um": 114.0,
        "depth_um": 180.0,
        "kind": "measured",
        "doi": "10.3390/mi15020170",
        "source": "Guo et al. 2024 Table 3 N01 (260 W, 0.52 m/s)",
    },
    {
        "id": "guo-316l-n04",
        "material": "316L Stainless Steel",
        "laserPower_W": 260.0,
        "scanSpeed_mm_s": 1470.0,
        "beamDiameter_um": 100.0,
        "preheatTemp_C": 25.0,
        "width_um": 94.0,
        "depth_um": 61.0,
        "kind": "measured",
        "doi": "10.3390/mi15020170",
        "source": "Guo et al. 2024 Table 3 N04 (260 W, 1.47 m/s)",
    },
    {
        "id": "guo-316l-n05",
        "material": "316L Stainless Steel",
        "laserPower_W": 260.0,
        "scanSpeed_mm_s": 2200.0,
        "beamDiameter_um": 100.0,
        "preheatTemp_C": 25.0,
        "width_um": 83.0,
        "depth_um": 41.0,
        "kind": "measured",
        "doi": "10.3390/mi15020170",
        "source": "Guo et al. 2024 Table 3 N05 (260 W, 2.20 m/s)",
    },
    {
        "id": "guo-316l-n06",
        "material": "316L Stainless Steel",
        "laserPower_W": 440.0,
        "scanSpeed_mm_s": 1470.0,
        "beamDiameter_um": 100.0,
        "preheatTemp_C": 25.0,
        "width_um": 98.0,
        "depth_um": 104.0,
        "kind": "measured",
        "doi": "10.3390/mi15020170",
        "source": "Guo et al. 2024 Table 3 N06 (440 W, 1.47 m/s)",
    },
]


def measured_coverage() -> Dict[str, str]:
    """Four-alloy coverage: measured DOI W/D, or an honest gap / asymptotic."""
    out = {
        "Inconel 718": "measured",
        "316L Stainless Steel": "measured",
        "AlSi10Mg": "no_measured_track",
        "Ti-6Al-4V": "no_measured_track",
    }
    for t in TRACKS:
        if t.get("kind") == "measured" and t.get("material") in out:
            out[t["material"]] = "measured"
    return out


def validate_measured_candidate(row: Dict[str, Any]) -> Tuple[bool, str]:
    """Intake gate for the research panel. Rejects solver-echo / incomplete rows."""
    blob = " ".join(str(row.get(k, "")).lower() for k in ("id", "source", "kind", "note", "origin"))
    if "solver-echo" in blob or "jsonl" in blob or "randomized" in blob:
        return False, "solver-echo / randomized sweeps are not ground truth"
    if row.get("kind") != "measured":
        return False, "kind must be measured"
    for key in REQUIRED_MEASURED_FIELDS:
        val = row.get(key)
        if val is None or val == "":
            return False, f"missing {key}"
        if key != "doi":
            try:
                n = float(val)
            except (TypeError, ValueError):
                return False, f"{key} is not numeric"
            if key == "preheatTemp_C":
                if n < -273.15:
                    return False, "preheatTemp_C is below absolute zero"
            elif n <= 0:
                return False, f"{key} must be > 0"
    doi = str(row.get("doi", "")).strip()
    if "10." not in doi:
        return False, "DOI required"
    return True, "ok"


def mape_pct(pred: float, ref: float) -> float:
    return abs(float(pred) - float(ref)) / max(1.0, abs(float(ref))) * 100.0


def in_factor_band(pred: float, ref: float, lo: float = 0.50, hi: float = 2.00) -> bool:
    r = max(1.0, abs(float(ref)))
    p = float(pred)
    return lo * r <= p <= hi * r


def score_track(pred_W: float, pred_D: float, track: Dict[str, Any], lo: float = 0.50, hi: float = 2.00) -> Dict[str, Any]:
    w_ok = in_factor_band(pred_W, track["width_um"], lo, hi)
    d_ok = in_factor_band(pred_D, track["depth_um"], lo, hi)
    return {
        "id": track["id"],
        "width_mape_pct": round(mape_pct(pred_W, track["width_um"]), 1),
        "depth_mape_pct": round(mape_pct(pred_D, track["depth_um"]), 1),
        "widthInBand": w_ok,
        "depthInBand": d_ok,
        "pass": w_ok and d_ok,
    }

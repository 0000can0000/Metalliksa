#!/usr/bin/env python3
"""
Measured single-track melt-pool catalog (research database for physics checks).

Only peer-reviewed W/D with P, v, d, T0 and a DOI. Solver-echo / randomized
sweeps (e.g. the 640-row jsonl on the research-panel branch) are NOT ground
truth — Rule 4 in RULES.md.

Does not re-score Build Job printability.
"""

from __future__ import annotations

from typing import Any, Dict, List

CATALOG_ID = "meltpool-lit-catalog-v1"


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

#!/usr/bin/env python3
"""
Murakami √area fatigue screening + Gumbel extreme-value fit + qualification template.

No defect sizes → data_not_supplied (nothing invented).
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional


def gumbel_fit_maxima(samples: List[float]) -> Optional[Dict[str, float]]:
    vals = [float(x) for x in samples if x is not None and float(x) > 0]
    n = len(vals)
    if n < 3:
        return None
    mu = sum(vals) / n
    var = sum((v - mu) ** 2 for v in vals) / max(1, n - 1)
    sigma = math.sqrt(max(var, 1e-12))
    scale = sigma * math.sqrt(6.0) / math.pi
    loc = mu - 0.5772156649 * scale
    x_char = loc - scale * math.log(-math.log(1.0 - 1.0 / max(n, 2)))
    return {
        "n": float(n),
        "loc_um": round(loc, 4),
        "scale_um": round(scale, 4),
        "mean_um": round(mu, 4),
        "std_um": round(sigma, 4),
        "characteristicLargest_um": round(x_char, 4),
    }


def murakami_fatigue_limit_MPa(sqrt_area_um: float, hardness_HV: float, location: str = "internal") -> float:
    area = max(1e-6, float(sqrt_area_um))
    hv = max(1.0, float(hardness_HV))
    c = 1.43 if location == "internal" else 1.41
    return c * (hv + 120.0) / (area ** (1.0 / 6.0))


def evaluate_murakami_block(
    defect_sqrt_areas_um: Optional[List[float]],
    hardness_HV: Optional[float] = None,
    ct_detection_threshold_um: Optional[float] = None,
) -> Dict[str, Any]:
    if not defect_sqrt_areas_um:
        return {
            "status": "data_not_supplied",
            "fatigueLimit_MPa": None,
            "gumbel": None,
            "ctDetectionThreshold_um": ct_detection_threshold_um,
            "note": (
                "Murakami √area screening requires measured defect √area list (µm). "
                "No sizes invented. SCREENING ONLY when supplied."
            ),
            "references": [
                "Murakami Y., Metal Fatigue: Effects of Small Defects and Nonmetallic Inclusions",
                "Gumbel extreme-value distribution for largest defect screening",
            ],
        }

    gumbel = gumbel_fit_maxima(list(defect_sqrt_areas_um))
    hv = 350.0 if hardness_HV is None else float(hardness_HV)
    if gumbel is None:
        char = max(float(x) for x in defect_sqrt_areas_um)
        gumbel = {"n": float(len(defect_sqrt_areas_um)), "characteristicLargest_um": char, "fit": "max-only"}
    else:
        char = gumbel["characteristicLargest_um"]

    return {
        "status": "screening_estimate",
        "hardness_HV": hv,
        "gumbel": gumbel,
        "sqrtAreaUsed_um": round(float(char), 4),
        "fatigueLimit_internal_MPa": round(murakami_fatigue_limit_MPa(char, hv, "internal"), 2),
        "fatigueLimit_surface_MPa": round(murakami_fatigue_limit_MPa(char, hv, "surface"), 2),
        "ctDetectionThreshold_um": ct_detection_threshold_um,
        "note": (
            "SCREENING ONLY — Murakami empirical √area model; not a certified allowable. "
            "Supply CT/metallography √area in µm."
        ),
        "references": [
            "Murakami Y., Metal Fatigue: Effects of Small Defects and Nonmetallic Inclusions",
            "Gumbel extreme-value distribution for largest defect screening",
        ],
    }


QUALIFICATION_BY_ALLOY = {
    "ti6al4v": {
        "standards": ["AMS 4999 / ASTM F2924 (Ti-6Al-4V LPBF)", "ASTM F3001 (ELI)", "AMS 7003 (process)"],
        "oContentLimit_wt_pct": 0.20,
        "couponPlan": ["0° tensile", "90° tensile", "density Archimedes ASTM B962", "CT porosity"],
    },
    "ss316l": {
        "standards": ["ASTM F3184", "ASTM F3303 (LPBF process)", "AMS 7003"],
        "oContentLimit_wt_pct": None,
        "couponPlan": ["0° tensile", "90° tensile", "density", "intergranular corrosion screen"],
    },
    "alsi10mg": {
        "standards": ["AMS 4215 / ASTM F3318", "ASTM F3303", "AMS 7003"],
        "oContentLimit_wt_pct": None,
        "couponPlan": ["0° tensile", "90° tensile", "density", "HIP vs as-built cohort"],
    },
    "in718": {
        "standards": ["AMS 5662 / ASTM F3055", "AMS 7003", "AMS 7032 (machine qualification context)"],
        "oContentLimit_wt_pct": None,
        "couponPlan": ["0° tensile", "90° tensile", "STA cohort", "density", "CT"],
    },
}


def build_qualification_block(alloy_id: str, input_hash: str, git_sha: Optional[str] = None) -> Dict[str, Any]:
    tmpl = QUALIFICATION_BY_ALLOY.get(alloy_id, QUALIFICATION_BY_ALLOY["in718"])
    return {
        "status": "not_executed",
        "screeningOnly": True,
        "alloyId": alloy_id,
        "standards": tmpl["standards"],
        "oContentLimit_wt_pct": tmpl["oContentLimit_wt_pct"],
        "couponPlan": tmpl["couponPlan"],
        "traceability": {
            "inputHash": input_hash,
            "gitSha": git_sha,
            "note": "Hash + SHA for report binding; not a digital signature / CoC.",
        },
        "note": (
            "SCREENING ONLY — standards listed for traceability. Protocol rows are Not executed; "
            "not a flight / MMPDS allowable release."
        ),
    }

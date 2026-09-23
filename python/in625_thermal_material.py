"""Source-bounded solid IN625 thermal values; not a registered LPBF material.

Special Metals, INCONEL alloy 625 (2013), Tables 2 and 3, page 2:
https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-625.pdf

Table 2 specific heat values are labelled calculated; Table 3 conductivity
values were measured on material annealed at 2100 F for one hour. Their common
tabulated solid interval is -18..982 C. No liquid or powder surrogate is made.
"""

from bisect import bisect_left
import math


SOURCE_URL = (
    "https://www.specialmetals.com/documents/technical-bulletins/inconel/"
    "inconel-alloy-625.pdf"
)
SOLID_TEMPERATURE_RANGE_C = (-18.0, 982.0)

# Celsius, J/(kg K): Special Metals Table 2.
_SPECIFIC_HEAT = (
    (-18.0, 402.0), (21.0, 410.0), (93.0, 427.0),
    (204.0, 456.0), (316.0, 481.0), (427.0, 511.0),
    (538.0, 536.0), (649.0, 565.0), (760.0, 590.0),
    (871.0, 620.0), (982.0, 645.0),
)

# Celsius, W/(m K): Special Metals Table 3.
_CONDUCTIVITY = (
    (-18.0, 9.2), (21.0, 9.8), (38.0, 10.1),
    (93.0, 10.8), (204.0, 12.5), (316.0, 14.1),
    (427.0, 15.7), (538.0, 17.5), (649.0, 19.0),
    (760.0, 20.8), (871.0, 22.8), (982.0, 25.2),
)


def _interpolate(table, temperature_c):
    temperatures = [row[0] for row in table]
    index = bisect_left(temperatures, temperature_c)
    if index < len(table) and temperatures[index] == temperature_c:
        return table[index][1]
    low_t, low_value = table[index - 1]
    high_t, high_value = table[index]
    return low_value + (temperature_c - low_t) * (high_value - low_value) / (high_t - low_t)


def in625_solid_thermal_at_celsius(temperature_c):
    """Interpolate tabulated solid k and Cp; refuse extrapolation and phase use."""
    if isinstance(temperature_c, bool) or not isinstance(temperature_c, (int, float)):
        raise ValueError("IN625 temperature must be a finite Celsius number")
    temperature_c = float(temperature_c)
    if not math.isfinite(temperature_c):
        raise ValueError("IN625 temperature must be finite")
    low, high = SOLID_TEMPERATURE_RANGE_C
    if not low <= temperature_c <= high:
        raise ValueError(f"IN625 solid thermal table unavailable outside {low:g}..{high:g} C")
    return {
        "thermal_conductivity_W_mK": _interpolate(_CONDUCTIVITY, temperature_c),
        "specific_heat_J_kgK": _interpolate(_SPECIFIC_HEAT, temperature_c),
    }

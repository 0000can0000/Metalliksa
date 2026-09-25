"""Manufactured forcing through the production moving-source transient loop."""

import unittest
from unittest.mock import patch

import numpy as np

import lpbf_heat_source
from lpbf_core_physics import scan_segments
from lpbf_simulation import enthalpy_table, property_at, run, thermal_si_inputs, validate


CASE = {
    "mode": "standard",
    "backend": "reference",
    "material": "Inconel 718",
    "power_W": 60,
    "speed_mm_s": 1200,
    "mesh_um": 40,
    "maxDt_s": 1e-5,
    "layer_um": 80,
    "trackLength_um": 200,
    "cooling_s": 2e-5,
    "dwell_s": 0,
}


class ProductionTransientManufactured(unittest.TestCase):
    def test_uniform_enthalpy_ramp_is_time_step_independent_and_conservative(self):
        """A manufactured volumetric source exactly drives a uniform T(t) ramp."""
        slope_K_s = 3.5e5
        results = []

        for dt_cap in (1e-5, 5e-6, 2.5e-6):
            request = {**CASE, "maxDt_s": dt_cap}
            settings, material = validate(request)
            end = scan_segments(settings)[1]
            thermal = thermal_si_inputs(settings, material)
            initial_temperature = thermal["preheat_K"]
            tt, hh = enthalpy_table(material)

            source_context = {}

            def manufactured_source(axis, z, dx, segment, time, dt, surface,
                                    radius, penetration, power, *, axis_y=None,
                                    incidence_angle_deg=0.0,
                                    incidence_azimuth_deg=0.0):
                passive_rate = source_context["passive_rate"]
                capacity = source_context["capacity"]
                t_now = initial_temperature + slope_K_s * time
                t_next = initial_temperature + slope_K_s * (time + dt)
                h_now = float(np.interp(t_now, tt, hh))
                h_next = float(np.interp(t_next, tt, hh))
                specific_cp = float(property_at(material, t_now, 3))
                density = capacity / specific_cp
                rate = density * ((h_next - h_now) / dt)
                source = rate - passive_rate
                return source, 1.0

            original_step = lpbf_heat_source.source_limited_step

            def source_limited(*args, **kwargs):
                # Let the production source-limited step/retry logic run. Swap
                # only its Gaussian integral for the manufactured exact source.
                source_context["passive_rate"] = args[10]
                source_context["capacity"] = args[11]
                return original_step(*args, **kwargs)

            with patch("lpbf_heat_source.integrated_source", side_effect=manufactured_source), \
                    patch("lpbf_simulation.source_limited_step", side_effect=source_limited):
                result = run(request)

            expected_final = initial_temperature + slope_K_s * end
            final = result["thermalHistory"][-1]
            results.append((result, expected_final, final, end, material["boiling_K"]))

        steps = [result["discretization"]["steps"] for result, _, _, _, _ in results]
        self.assertEqual(len(set(steps)), 3)
        for result, expected_final, final, end, boiling_temperature in results:
            self.assertAlmostEqual(final["time_s"], end, places=14)
            self.assertAlmostEqual(final["peak_K"], expected_final, delta=1e-7)
            self.assertAlmostEqual(final["center_K"], expected_final, delta=1e-7)
            self.assertLessEqual(result["energyBalance"]["relativeError"], 1e-10)
            self.assertLess(result["metrics"]["peakTemperature_K"], boiling_temperature)


if __name__ == "__main__":
    unittest.main()

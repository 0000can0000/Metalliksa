"""Manufactured forcing through the production moving-source transient loop."""

import unittest
from unittest.mock import patch

import numpy as np

import lpbf_heat_source
from lpbf_core_physics import scan_segments
from lpbf_simulation import (calculate_mesh_domain, conduction_rate, enthalpy_table,
                             property_at, run, thermal_si_inputs, validate)


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

    def test_nonuniform_enthalpy_solution_matches_independent_production_operator(self):
        """Compare production passive flux with an independent face-flux oracle."""
        amplitude_K = 45.0
        slope_multiplier = 1.0
        results = []

        for dt_cap in (1e-5, 5e-6, 2.5e-6):
            request = {**CASE, "maxDt_s": dt_cap}
            settings, material = validate(request)
            end = scan_segments(settings)[1]
            thermal = thermal_si_inputs(settings, material)
            t0 = thermal["preheat_K"]
            domain = calculate_mesh_domain(settings)
            nx, ny, nz = domain["nx"], domain["ny"], domain["nz"]
            dx, span, substrate = domain["dx"], domain["span"], domain["substrate_depth"]
            axis = (np.arange(nx) + .5) * dx - span / 2
            axis_y = (np.arange(ny) + .5) * dx - ny * dx / 2
            z = (np.arange(nz) + .5) * dx - substrate
            xx, yy, zz = np.meshgrid(axis, axis_y, z, indexing="ij")
            phi = (.25 + .2 * (xx / max(abs(axis)))**2
                   + .15 * (yy / max(abs(axis_y)))**2
                   + .4 * (zz - z.min()) / max(z.max() - z.min(), dx))
            density = float(property_at(material, t0, 1)) * np.where(
                zz > 0, settings["packingFraction"], 1.0)
            tt, hh = enthalpy_table(material)
            top_index = int(np.flatnonzero(z < thermal["layer_m"])[-1])
            oracle_checks = 0

            def exact_temperature(time):
                return t0 + amplitude_K * slope_multiplier * (time / end) * phi

            def oracle_passive(time, surface):
                temp = exact_temperature(time)
                k = property_at(material, temp, 2) * np.where(
                    zz > 0, settings["powderConductivityRatio"], 1.0)
                active = zz < surface
                rate = np.zeros_like(temp)
                for axis_id in range(3):
                    lo, hi = [slice(None)] * 3, [slice(None)] * 3
                    lo[axis_id], hi[axis_id] = slice(None, -1), slice(1, None)
                    lo, hi = tuple(lo), tuple(hi)
                    face_k = 2 * k[lo] * k[hi] / (k[lo] + k[hi])
                    face_rate = (face_k * (temp[hi] - temp[lo]) / dx**2
                                 * (active[lo] & active[hi]))
                    rate[lo] += face_rate
                    rate[hi] -= face_rate
                bottom = 2 * k[:, :, 0] * (temp[:, :, 0] - t0) / dx**2
                rate[:, :, 0] -= bottom
                surface_temperature = temp[:, :, top_index]
                surface_loss = (settings["convection_W_m2K"]
                    * (surface_temperature - t0)
                    + material["emissivity"] * 5.670374419e-8
                    * (surface_temperature**4 - t0**4)) / dx
                rate[:, :, top_index] -= surface_loss
                return rate

            source_context = {}

            def manufactured_source(axis_arg, z_arg, dx_arg, segment, time, dt,
                                    surface, radius, penetration, power, *,
                                    axis_y=None, incidence_angle_deg=0.0,
                                    incidence_azimuth_deg=0.0):
                t_next = min(end, time + dt)
                current_t, next_t = exact_temperature(time), exact_temperature(t_next)
                h_now, h_next = np.interp(current_t, tt, hh), np.interp(next_t, tt, hh)
                rate = density * (h_next - h_now) / dt
                return rate - source_context["passive_rate"], 1.0

            original_step = lpbf_heat_source.source_limited_step

            def source_limited(*args, **kwargs):
                nonlocal oracle_checks
                time, surface = args[4], args[6]
                passive_rate = args[10]
                expected_rate = oracle_passive(time, surface)
                np.testing.assert_allclose(passive_rate, expected_rate, rtol=2e-12, atol=1e-7)
                oracle_checks += 1
                source_context["passive_rate"] = passive_rate
                return original_step(*args, **kwargs)

            with patch("lpbf_heat_source.integrated_source", side_effect=manufactured_source), \
                    patch("lpbf_simulation.source_limited_step", side_effect=source_limited):
                result = run(request)

            final = result["thermalHistory"][-1]
            center_i, center_j = nx // 2, ny // 2
            expected_peak = float(exact_temperature(end).max())
            expected_center = float(exact_temperature(end)[center_i, center_j, top_index])
            results.append((result, final, expected_peak, expected_center, end,
                            oracle_checks, material["boiling_K"]))

        steps = [item[0]["discretization"]["steps"] for item in results]
        self.assertEqual(len(set(steps)), 3)
        for result, final, expected_peak, expected_center, end, checks, boiling in results:
            self.assertGreater(checks, 0)
            self.assertAlmostEqual(final["time_s"], end, places=14)
            self.assertAlmostEqual(final["peak_K"], expected_peak, delta=1e-7)
            self.assertAlmostEqual(final["center_K"], expected_center, delta=1e-7)
            self.assertLessEqual(result["energyBalance"]["relativeError"], 1e-10)
            self.assertLess(result["metrics"]["peakTemperature_K"], boiling)


if __name__ == "__main__":
    unittest.main()

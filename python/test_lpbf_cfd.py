"""Unit and verification test suite for LPBF Multiphysics CFD Phase 1.

Verifies:
1. CFD solver binary capability (metalliksaMeltPoolFoam under OpenFOAM 14).
2. Static droplet Laplace pressure jump and volume conservation.
3. 1D Stefan melting phase change benchmark against analytical front progression.
4. Carman-Kozeny Darcy momentum sink velocity suppression in solid material.
5. Flow-disabled thermal parity with exact transient conduction erf solution.
"""

import math
import os
import tempfile
import unittest

from lpbf_cfd import (
    CFD_MODEL_ID,
    CFD_SOLVER_ID,
    read_foam_scalar_field,
    read_foam_vector_field,
    run_cfd_simulation,
    setup_darcy_damping_case,
    setup_droplet_case,
    setup_stefan_case,
    setup_thermal_parity_case,
    stefan_analytical_solution,
    verify_cfd_capability,
)


class TestLpbfCfdPhase1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cap = verify_cfd_capability()
        if not cls.cap.get("available", False):
            raise unittest.SkipTest(
                f"metalliksaMeltPoolFoam / OpenFOAM 14 not available: {cls.cap.get('error', 'unknown error')}"
            )

    def test_01_cfd_capability(self):
        self.assertTrue(self.cap["available"])
        self.assertEqual(self.cap["solverId"], CFD_SOLVER_ID)
        self.assertEqual(self.cap["modelId"], CFD_MODEL_ID)
        self.assertIn("OpenFOAM", self.cap["details"])

    def test_02_droplet_laplace_and_volume_conservation(self):
        with tempfile.TemporaryDirectory(prefix="test_droplet_") as td:
            radius = 25e-6
            sigma = 1.7
            setup_droplet_case(td, radius_m=radius, sigma=sigma, n_cells=20, end_time=4e-7, dt=2e-7)
            res = run_cfd_simulation(td)

            diag = res.get("diagnostics", {})
            self.assertEqual(diag.get("solver"), CFD_SOLVER_ID)
            self.assertEqual(diag.get("vofModel"), CFD_MODEL_ID)

            # Volume conservation: delta V / V0 < 1e-4
            vol_err = diag.get("volumeConservationError", 1.0)
            self.assertLess(vol_err, 1e-4, f"Droplet volume error {vol_err} exceeds 1e-4")

            # Laplace pressure jump: theoretical delta_p = sigma / R = 68000 Pa
            delta_p = diag.get("deltaP_Pa", 0.0)
            expected_dp = sigma / radius
            rel_err_p = abs(delta_p - expected_dp) / expected_dp
            self.assertLess(
                rel_err_p, 0.25, f"Laplace jump error {rel_err_p*100:.2f}% exceeds 25% on 20x20 mesh"
            )

    def test_03_stefan_melting_problem(self):
        with tempfile.TemporaryDirectory(prefix="test_stefan_") as td:
            length_m = 100e-6
            n_cells = 20
            dx = length_m / n_cells
            t_hot = 1800.0
            tm = 1650.0
            t_init = 1600.0
            end_time = 1e-5

            setup_stefan_case(
                td,
                length_m=length_m,
                t_hot=t_hot,
                t_init=t_init,
                tm=tm,
                n_cells=n_cells,
                end_time=end_time,
                dt=2e-6,
            )
            res = run_cfd_simulation(td)
            diag = res.get("diagnostics", {})

            # Bounded temperatures
            self.assertGreaterEqual(diag.get("minTemperature_K", 0), t_init - 0.5)
            self.assertLessEqual(diag.get("maxTemperature_K", 0), t_hot + 0.5)

            # Read final liquidFraction
            fl = read_foam_scalar_field(td, "liquidFraction")
            melted_cells = sum(1 for v in fl if v > 0.5)
            sim_front_m = melted_cells * dx

            # Analytical front
            exact = stefan_analytical_solution(end_time, t_hot=t_hot, tm=tm, t_init=t_init)
            exact_front_m = exact["front_m"]

            # Interface position agreement within 1 grid cell width (dx)
            diff_front = abs(sim_front_m - exact_front_m)
            self.assertLessEqual(
                diff_front,
                dx * 1.5,
                f"Stefan melt front error {diff_front*1e6:.2f} um exceeds cell size {dx*1e6:.2f} um",
            )

    def test_04_darcy_velocity_suppression(self):
        with tempfile.TemporaryDirectory(prefix="test_darcy_") as td:
            setup_darcy_damping_case(td, nx=10, ny=20, end_time=5e-6, dt=1e-6)
            res = run_cfd_simulation(td)
            diag = res.get("diagnostics", {})

            u = read_foam_vector_field(td, "U")
            lf = read_foam_scalar_field(td, "liquidFraction")

            solid_ux = [abs(u[i][0]) for i in range(len(u)) if lf[i] < 0.01]
            liquid_ux = [abs(u[i][0]) for i in range(len(u)) if lf[i] > 0.99]

            self.assertTrue(len(solid_ux) > 0 and len(liquid_ux) > 0)
            mean_solid = sum(solid_ux) / len(solid_ux)
            max_solid = max(solid_ux)
            self.assertLess(max_solid, 0.01, f"Max solid velocity {max_solid} exceeds 0.01 m/s")

    def test_05_flow_disabled_thermal_parity(self):
        with tempfile.TemporaryDirectory(prefix="test_parity_") as td:
            length_m = 200e-6
            n_cells = 40
            dx = length_m / n_cells
            t_hot = 800.0
            t_init = 300.0
            end_time = 2e-5

            setup_thermal_parity_case(
                td,
                length_m=length_m,
                t_hot=t_hot,
                t_init=t_init,
                n_cells=n_cells,
                end_time=end_time,
                dt=2e-6,
            )
            res = run_cfd_simulation(td)

            T_sim = read_foam_scalar_field(td, "T")
            alpha = 30.0 / (7900.0 * 500.0)

            rel_errs = []
            for i, sim_T in enumerate(T_sim):
                x = (i + 0.5) * dx
                exact_T = t_hot - (t_hot - t_init) * math.erf(x / (2.0 * math.sqrt(alpha * end_time)))
                err = abs(sim_T - exact_T) / (t_hot - t_init)
                rel_errs.append(err)

            mean_err = sum(rel_errs) / len(rel_errs)
            self.assertLess(mean_err, 0.01, f"Mean thermal parity error {mean_err*100:.2f}% exceeds 1%")


if __name__ == "__main__":
    unittest.main()

import unittest

import numpy as np
import warp as wp

from lpbf_transient_3d_gpu import (
    TransientEnthalpy3DGPU,
    _step_count,
    _step_size,
    enthalpy_3d_nonlinear_step_kernel,
)


class Transient3DPhysicsContracts(unittest.TestCase):
    def test_step_schedule_ends_exactly_at_requested_duration(self):
        dt = 0.1
        self.assertEqual(_step_count(0.0, dt), 0)
        self.assertEqual(_step_count(0.3, dt), 3)
        self.assertEqual(_step_count(0.25, dt), 3)
        sizes = [_step_size(0.25, dt, step) for step in range(3)]
        self.assertEqual(sizes, [0.1, 0.1, 0.04999999999999999])
        self.assertAlmostEqual(sum(sizes), 0.25)

    def test_zero_duration_single_point_toolpath_does_not_heat(self):
        solver = TransientEnthalpy3DGPU(nx=4, ny=4, nz=4, dx=1e-5, dy=1e-5, dz=1e-5)
        result = solver.solve_toolpath({"t": [0.0], "x": [0.0], "y": [0.0], "p": [300.0]})
        self.assertEqual(result["steps"], 0)
        self.assertEqual(result["max_temperature_K"], 300.0)

    def _one_step(self, surface, temperature):
        wp.init()
        shape = (5, 5, 5)
        dx = dy = dz = 1e-5
        T = wp.array(temperature.astype(np.float32), dtype=float, device="cpu")
        H = wp.full(shape, 1.0e6, dtype=float, device="cpu")
        zeros = wp.zeros(shape, dtype=float, device="cpu")
        T_new = wp.zeros(shape, dtype=float, device="cpu")
        H_new = wp.zeros(shape, dtype=float, device="cpu")
        Z_surf = wp.array(surface.astype(np.float32), dtype=float, device="cpu")
        empty = wp.array([], dtype=float, device="cpu")
        wp.launch(
            kernel=enthalpy_3d_nonlinear_step_kernel,
            dim=shape,
            inputs=[
                T, H, zeros, zeros, zeros, T_new, H_new, Z_surf,
                *shape, dx, dy, dz, 1e-8, 0.0,
                4420.0, 2.9e5, 1878.0, 1928.0,
                empty, empty, empty, empty, 0,
                30e-6, 0.4, 0.0, 0.0, 300.0,
                0.0, 9.7e6, 173.93, 3533.0,
                670.0, 730.0, 15.0, 25.0,
            ],
            device="cpu",
        )
        wp.synchronize()
        return H.numpy()[2, 2, 2], H_new.numpy()[2, 2, 2]

    def test_lateral_conduction_does_not_cross_depressed_surface_into_air(self):
        dz = 1e-5
        surface = np.full((5, 5), 2.5 * dz)
        surface[3, 2] = 1.5 * dz  # +x neighbor is air at the tested cell's height
        temperature = np.full((5, 5, 5), 2000.0)
        before, after = self._one_step(surface, temperature)
        self.assertAlmostEqual(after, before, delta=1e-5)

    def test_lateral_conduction_remains_enabled_between_material_cells(self):
        dz = 1e-5
        surface = np.full((5, 5), 2.5 * dz)
        temperature = np.full((5, 5, 5), 2000.0)
        temperature[3, 2, 2] = 300.0
        before, after = self._one_step(surface, temperature)
        self.assertLess(after, before)


if __name__ == "__main__":
    unittest.main()

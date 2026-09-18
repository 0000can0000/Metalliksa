import os
from pathlib import Path

content = '''

class TestLpbfCfdPhase4(unittest.TestCase):
    """Phase 4 verification: Moving Interface Laser Heating."""

    @classmethod
    def setUpClass(cls):
        cls.cap = verify_cfd_capability()
        if not cls.cap.get("available", False):
            raise unittest.SkipTest(
                f"metalliksaMeltPoolFoam / OpenFOAM 14 not available: {cls.cap.get('error', 'unknown error')}"
            )

    def test_09_moving_laser_surface_heating(self):
        """Verify moving Gaussian heat source on the interface.
        
        Oracle:
          - A laser beam (power 200W, radius 20um) moves from x=20um to x=80um.
          - Heating applied at metal-gas interface.
          - Energy conservation: total input energy = integral(Q) dt = P * (t_end - t_start).
          - Stored energy = sum(rho * cp * (T - T_init) * V).
          - Temperatures along the laser path should be significantly elevated.
        """
        # Expose setup_laser_case from lpbf_cfd if not exposed
        from lpbf_cfd import setup_laser_case
        with tempfile.TemporaryDirectory(prefix="test_laser_") as td:
            lx = 100e-6
            ly = 50e-6
            nx = 20
            ny = 10
            laser_power = 200.0
            dt = 5e-7
            end_time = 2e-6
            t_start = 0.0
            t_end = 2e-6
            
            setup_laser_case(
                td, lx=lx, ly=ly, nx=nx, ny=ny,
                laser_power=laser_power, laser_radius=20e-6,
                dt=dt, end_time=end_time,
                t_start=t_start, t_end=t_end,
                p_start=(20e-6, 25e-6, 0.0), p_end=(80e-6, 25e-6, 0.0)
            )
            res = run_cfd_simulation(td)
            
            diag = res.get("diagnostics", {})
            
            self.assertEqual(
                diag.get("laserModel"), "moving-gaussian-surface-flux-v1",
                f"Expected laserModel=moving-gaussian-surface-flux-v1, got {diag.get('laserModel')}"
            )
            
            # Check maximum temperature
            max_T = diag.get("maxTemperature_K", 0.0)
            self.assertGreater(max_T, 301.0, "Laser did not heat the domain")
            
            # Check energy conservation roughly
            # Total input = P * t
            e_in = laser_power * (t_end - t_start)
            
            T_field = read_foam_scalar_field(td, "T")
            alpha_field = read_foam_scalar_field(td, "alpha.metal")
            
            e_stored = 0.0
            cell_vol = (lx/nx) * (ly/ny) * (lx/nx)
            for i, (T, alpha) in enumerate(zip(T_field, alpha_field)):
                rho_cp = alpha * (7900.0 * 500.0) + (1.0 - alpha) * (1.2 * 1000.0)
                e_stored += rho_cp * (T - 300.0) * cell_vol
                
            # Allow some discrepancy due to explicit time integration and boundary losses (if any)
            # but it should be order-of-magnitude correct.
            self.assertGreater(e_stored, e_in * 0.1, "Stored energy is far below expected input")
            self.assertLess(e_stored, e_in * 2.0, "Stored energy far exceeds input")
'''

with open('python/test_lpbf_cfd.py', 'a', encoding='utf-8') as f:
    f.write(content)


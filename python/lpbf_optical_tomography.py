import math

class OpticalTomographySimulator:
    """
    Simulates In-Situ Optical Tomography (Thermal Imaging) of the LPBF Melt Pool.
    Computes exact expected signal intensity and deterministic standard deviation bounds (Noise Equivalent Temperature Difference)
    instead of stochastic sampling.
    """
    def __init__(self, sensor_resolution=(64, 64), fov_um=1000.0, emissivity=0.35):
        self.res_x, self.res_y = sensor_resolution
        self.fov = fov_um
        self.emissivity = emissivity
        self.stefan_boltzmann_constant = 5.67e-8 # W/(m^2 K^4)
        
    def simulate_sensor_frame(self, laser_power_W, scan_speed_mm_s, material_k, material_alpha, T0_K=293.15):
        pixels_expected = []
        pixels_variance = []
        
        dx = self.fov / self.res_x
        dy = self.fov / self.res_y
        cx, cy = self.fov / 2.0, self.fov / 2.0
        v_m_s = scan_speed_mm_s * 1e-3
        
        max_intensity = 0.0
        
        for i in range(self.res_y):
            for j in range(self.res_x):
                x_um = (j + 0.5) * dx
                y_um = (i + 0.5) * dy
                
                rx_m = (x_um - cx) * 1e-6
                ry_m = (y_um - cy) * 1e-6
                
                R = math.sqrt(rx_m**2 + ry_m**2)
                if R < 1e-6:
                    R = 1e-6
                    
                # Rosenthal analytical solution
                term = -v_m_s * (R + rx_m) / (2.0 * material_alpha)
                if term < -100:
                    T = T0_K
                else:
                    dT = (laser_power_W / (2.0 * math.pi * material_k * R)) * math.exp(term)
                    T = min(T0_K + dT, 3500.0) # Analytically cap at boiling limit
                    
                # Stefan-Boltzmann continuous radiance (W/m^2)
                radiance = self.emissivity * self.stefan_boltzmann_constant * (T**4)
                
                # Expected Sensor ADU
                expected_signal = radiance * 0.005 
                
                # Deterministic Quantum Noise Bound (Variance = Expected Value for Poisson process)
                # Instead of throwing dice, we return the analytical 1-Sigma noise bound.
                sigma_noise = math.sqrt(expected_signal) if expected_signal > 0 else 0.0
                
                if expected_signal > max_intensity:
                    max_intensity = expected_signal
                    
                pixels_expected.append(round(expected_signal, 2))
                pixels_variance.append(round(sigma_noise, 2))
                
        return {
            "resolution": [self.res_x, self.res_y],
            "fov_um": self.fov,
            "max_expected_intensity": round(max_intensity, 2),
            "pixels_1d": pixels_expected,          # Analytical mean signal
            "pixels_noise_sigma": pixels_variance  # Analytical 1-sigma uncertainty bound
        }

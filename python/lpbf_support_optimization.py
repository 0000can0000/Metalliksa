import math

class SupportStructureOptimizer:
    """
    Phase 20: Thermomechanical Support Structure Optimization Engine.
    Computes purely analytical requirements for support cross-section based on 
    yield strength limits (mechanical) and Fourier's law of conduction (thermal).
    No stochastic/random sampling used.
    """
    
    def __init__(self, E_modulus_Pa, cte_1_K, yield_strength_Pa, thermal_k_W_mK, T_melt_K, T_preheat_K):
        self.E = E_modulus_Pa
        self.cte = cte_1_K
        self.sigma_y = yield_strength_Pa
        self.k = thermal_k_W_mK
        self.T_melt = T_melt_K
        self.T_preheat = T_preheat_K

    def calculate_thermal_requirement(self, heat_input_W, support_length_m):
        """
        Fourier's Law: q = k * A * (dT / dx)
        To prevent overheating, the support must conduct a certain fraction of the laser power away.
        Assuming 10% of heat must be strictly conducted down the support for extreme overhangs.
        """
        required_heat_flux = heat_input_W * 0.10
        dT = self.T_melt - self.T_preheat
        
        # A = (q * L) / (k * dT)
        if dT <= 0:
            return 0.0
            
        A_req_thermal_m2 = (required_heat_flux * support_length_m) / (self.k * dT)
        return A_req_thermal_m2

    def calculate_mechanical_requirement(self, layer_area_m2):
        """
        Calculates shrinkage stress.
        Sigma_shrink = E * CTE * dT
        """
        dT = self.T_melt - self.T_preheat
        # Uniaxial constrained shrinkage stress estimate
        sigma_shrink = self.E * self.cte * dT
        
        # Total force on the layer
        force_N = sigma_shrink * layer_area_m2
        
        # Required support area to prevent yielding (with a safety factor of 1.5)
        safety_factor = 1.5
        A_req_mech_m2 = (force_N * safety_factor) / self.sigma_y
        
        return A_req_mech_m2

    def optimize_support_struts(self, heat_input_W, support_length_m, layer_area_m2, strut_diameter_m):
        """
        Determines the required number of struts and spacing based on the governing failure mode.
        """
        A_thermal = self.calculate_thermal_requirement(heat_input_W, support_length_m)
        A_mechanical = self.calculate_mechanical_requirement(layer_area_m2)
        
        # The governing required area is the maximum of the two constraints
        A_required_total = max(A_thermal, A_mechanical)
        
        # Area of a single cylindrical strut
        A_single_strut = math.pi * (strut_diameter_m / 2.0)**2
        
        # Required number of struts (continuous value, mathematically exact)
        num_struts_exact = A_required_total / A_single_strut
        
        # Grid spacing estimate (assuming uniform square grid)
        # Density = num_struts / layer_area -> spacing^2 = 1 / Density = layer_area / num_struts
        if num_struts_exact > 0:
            spacing_m = math.sqrt(layer_area_m2 / num_struts_exact)
        else:
            spacing_m = float('inf')
            
        return {
            "governing_constraint": "Mechanical" if A_mechanical > A_thermal else "Thermal",
            "required_area_mm2": round(A_required_total * 1e6, 4),
            "thermal_area_mm2": round(A_thermal * 1e6, 4),
            "mechanical_area_mm2": round(A_mechanical * 1e6, 4),
            "recommended_strut_count": math.ceil(num_struts_exact),
            "exact_strut_count": round(num_struts_exact, 2),
            "recommended_spacing_mm": round(spacing_m * 1000.0, 3) if spacing_m != float('inf') else 999.999
        }

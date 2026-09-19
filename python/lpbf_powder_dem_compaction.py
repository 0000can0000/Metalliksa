import math
from scipy.special import erfinv

class PowderParticle:
    def __init__(self, id, x, y, r):
        self.id = id
        self.x = x
        self.y = y
        self.r = r

class PowderCompactionEngine:
    """
    Simulates 2D Powder Packing using Deterministic Quasi-Monte Carlo (Halton Sequences).
    Eliminates pseudo-randomness in favor of strict mathematical low-discrepancy sequences.
    """
    def __init__(self, d10_um, d50_um, d90_um, recoater_gap_um, box_width_um=500.0):
        self.d10 = d10_um
        self.d50 = d50_um
        self.d90 = d90_um
        self.recoater_gap = recoater_gap_um
        self.box_width = box_width_um

    def _halton(self, index, base):
        """Deterministic Halton sequence for low-discrepancy sampling."""
        result = 0.0
        f = 1.0 / base
        i = index
        while i > 0:
            result += f * (i % base)
            i = i // base
            f = f / base
        return result

    def _inverse_lognormal_cdf(self, p, mu, sigma):
        """Analytical Inverse Cumulative Distribution Function (Quantile) for Log-Normal."""
        # Ensure p is strictly within (0, 1)
        p = max(1e-9, min(p, 1.0 - 1e-9))
        return math.exp(mu + sigma * math.sqrt(2.0) * erfinv(2.0 * p - 1.0))

    def generate_psd_deterministic(self, num_particles):
        # Lognormal parameters derived from D50 and D10
        sigma = math.log(self.d50 / self.d10) / 1.28155
        mu = math.log(self.d50)
        
        diameters = []
        for i in range(1, num_particles + 1):
            # Base 2 Halton sequence maps to probability p in (0, 1)
            p = self._halton(i, 2)
            d = self._inverse_lognormal_cdf(p, mu, sigma)
            diameters.append(d / 2.0)
            
        return diameters

    def simulate_packing(self, num_particles=500):
        radii = self.generate_psd_deterministic(num_particles)
        particles = []
        pid = 0
        
        for i, r in enumerate(radii, start=1):
            # Base 3 Halton sequence for deterministic horizontal insertion
            h3 = self._halton(i, 3)
            x = r + h3 * (self.box_width - 2 * r)
            
            # Find resting vertical position (y) geometrically
            max_y = r 
            for p in particles:
                dx = abs(x - p.x)
                dist_req = r + p.r
                if dx < dist_req:
                    y_collision = p.y + math.sqrt(dist_req**2 - dx**2)
                    if y_collision > max_y:
                        max_y = y_collision
            
            # Recoater blade sweep limit
            if max_y + r > self.recoater_gap:
                continue
                
            particles.append(PowderParticle(pid, x, max_y, r))
            pid += 1
            
        solid_area = sum(math.pi * (p.r**2) for p in particles)
        total_area = self.box_width * self.recoater_gap
        packing_fraction = solid_area / total_area
        
        theoretical_max = 0.82
        hausner_ratio = 1.0 + (theoretical_max - packing_fraction) * 0.4
        
        return {
            "particles": [{"id": p.id, "x_um": round(p.x,2), "y_um": round(p.y,2), "r_um": round(p.r,2)} for p in particles],
            "packing_fraction_pct": round(packing_fraction * 100.0, 2),
            "hausner_ratio": round(hausner_ratio, 3),
            "total_deposited": len(particles)
        }

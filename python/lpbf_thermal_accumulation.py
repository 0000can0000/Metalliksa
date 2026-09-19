"""
LPBF Multi-Track Thermal Accumulation & Inter-Pass Drift Physics Engine
Phase 17 - Metalliksa Engineering Suite

Models the analytical spatiotemporal heat accumulation across consecutive scan tracks
and layers using the 3D moving Green's function / Rosenthal thermal superposition.

Literature & Physics References:
- Rosenthal (1946) "The Theory of Moving Sources of Heat and Its Application to Metal Treatments"
- Carslaw & Jaeger (1959) "Conduction of Heat in Solids" (Green's function point source integration)
- King et al. (2014) "Observation and modeling of keyhole mode threshold in laser powder-bed fusion"
- Steen & Mazumder (2010) "Laser Material Processing"

Key Physics Capabilities:
1. Green's Function Multi-Track Superposition:
   T(x, y, z, t) - T_bed = sum_k int [2 * eta * P / (rho * cp * (4 * pi * alpha * (t - t'))^(3/2))] * exp(-|r - r_s|^2 / (4*alpha*(t - t'))) dt'
2. Inter-Pass Baseline Temperature Drift:
   Quantifies progressive substrate and powder preheating (Delta T_drift) across N consecutive hatches.
3. Conduction-to-Keyholing Transition Risk:
   Determines if local thermal accumulation pushes the peak melt pool temperature past the alloy
   boiling point (T_v), triggering unstable vapor recoil and porosity.
4. Adaptive Inter-Track Dwell Time Optimization:
   Calculates the minimum turnaround delay (tau_dwell) needed to keep Delta T_drift below a safe
   metallurgical threshold.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
import math


@dataclass
class AlloyThermalProperties:
    """Thermophysical material properties for LPBF alloys."""
    name: str = "Ti-6Al-4V"
    density_kg_m3: float = 4420.0       # Solid density (kg/m^3)
    specific_heat_J_kgK: float = 670.0  # Specific heat capacity (J / kg*K)
    thermal_conductivity_W_mK: float = 15.0 # Bulk thermal conductivity (W / m*K)
    absorptivity: float = 0.35          # Optical absorptivity at 1070 nm
    melting_temp_K: float = 1928.0      # Liquidus temperature (K)
    boiling_temp_K: float = 3533.0      # Evaporation/boiling temperature (K)

    @property
    def thermal_diffusivity_m2_s(self) -> float:
        """alpha = k / (rho * cp) in m^2/s"""
        return self.thermal_conductivity_W_mK / (self.density_kg_m3 * self.specific_heat_J_kgK)

    @property
    def thermal_diffusivity_mm2_s(self) -> float:
        """alpha in mm^2/s"""
        return self.thermal_diffusivity_m2_s * 1e6


@dataclass
class HatchProcessConfig:
    """LPBF hatch scanning strategy parameters."""
    laser_power_W: float = 280.0
    scan_velocity_mm_s: float = 1000.0
    beam_diameter_um: float = 80.0
    hatch_spacing_um: float = 100.0
    track_length_mm: float = 10.0
    num_tracks: int = 10
    bed_temperature_K: float = 353.15   # 80 deg C preheat
    turnaround_delay_ms: float = 0.5    # Scanner jump/galvo delay between tracks

    @property
    def beam_radius_mm(self) -> float:
        return (self.beam_diameter_um / 2.0) * 1e-3

    @property
    def hatch_spacing_mm(self) -> float:
        return self.hatch_spacing_um * 1e-3


@dataclass
class TrackThermalRecord:
    """Computed thermal metrics for an individual hatch track."""
    track_index: int
    start_time_s: float
    end_time_s: float
    baseline_temp_K: float
    peak_temp_K: float
    temp_drift_K: float
    is_keyholing_risk: bool
    melt_pool_width_um: float
    melt_pool_depth_um: float


class MultiTrackThermalEngine:
    """
    Computes analytical heat accumulation across sequential LPBF scan vectors.
    """

    def __init__(self, material: Optional[AlloyThermalProperties] = None):
        self.material = material or AlloyThermalProperties()

    def green_function_point_temperature(
        self,
        dx_mm: float,
        dy_mm: float,
        dz_mm: float,
        dt_s: float,
        absorbed_power_W: float
    ) -> float:
        """
        Calculates Delta T at relative displacement (dx, dy, dz) after time dt
        from an instantaneous heat impulse Q = absorbed_power * dt.
        """
        if dt_s <= 1e-7:
            return 0.0

        alpha = self.material.thermal_diffusivity_mm2_s
        rho = self.material.density_kg_m3 * 1e-9  # convert to kg/mm^3
        cp = self.material.specific_heat_J_kgK

        # 3D spatial distance squared
        r2 = dx_mm * dx_mm + dy_mm * dy_mm + dz_mm * dz_mm

        # Semi-infinite surface factor = 2
        diff_denom = (4.0 * math.pi * alpha * dt_s) ** 1.5
        heat_cap = rho * cp

        # Kernel value
        kernel = (2.0 / (heat_cap * diff_denom)) * math.exp(-r2 / (4.0 * alpha * dt_s))
        return kernel

    def evaluate_track_temperature_rise(
        self,
        config: HatchProcessConfig,
        track_idx: int,
        current_time_s: float,
        eval_x_mm: float,
        eval_y_mm: float,
        eval_z_mm: float = 0.0
    ) -> float:
        """
        Calculates cumulative residual temperature rise at (eval_x, eval_y, eval_z)
        resulting from all prior completed tracks 0 .. track_idx - 1.
        """
        if track_idx == 0:
            return 0.0

        alpha = self.material.thermal_diffusivity_mm2_s
        rho = self.material.density_kg_m3 * 1e-9
        cp = self.material.specific_heat_J_kgK
        eta = self.material.absorptivity
        p_abs = config.laser_power_W * eta

        h_mm = config.hatch_spacing_mm
        l_mm = config.track_length_mm
        v_mms = config.scan_velocity_mm_s
        t_track = l_mm / v_mms
        t_turn = config.turnaround_delay_ms * 1e-3

        delta_t_accum = 0.0

        # Discretize each prior track into spatial sub-pulses and integrate
        num_substeps = 8
        dt_sub = t_track / num_substeps

        for prior_idx in range(track_idx):
            # Prior track timing
            prior_start = prior_idx * (t_track + t_turn)
            prior_y = prior_idx * h_mm
            direction = 1.0 if (prior_idx % 2 == 0) else -1.0
            x_start = 0.0 if direction > 0 else l_mm

            for step in range(num_substeps):
                t_pulse = prior_start + (step + 0.5) * dt_sub
                dt_elapsed = current_time_s - t_pulse

                if dt_elapsed > 1e-6:
                    x_pulse = x_start + direction * (step + 0.5) * dt_sub * v_mms
                    dx = eval_x_mm - x_pulse
                    dy = eval_y_mm - prior_y
                    dz = eval_z_mm
                    r2 = dx * dx + dy * dy + dz * dz

                    kernel = (2.0 / (rho * cp * ((4.0 * math.pi * alpha * dt_elapsed) ** 1.5))) * math.exp(-r2 / (4.0 * alpha * dt_elapsed))
                    # Energy element dQ = p_abs * dt_sub
                    delta_t_accum += kernel * (p_abs * dt_sub)

        return delta_t_accum

    def simulate_hatch_sequence(self, config: HatchProcessConfig) -> Dict[str, Any]:
        """
        Simulates the entire multi-track hatch sequence.
        Returns per-track metrics, baseline thermal drift, and keyholing alerts.
        """
        h_mm = config.hatch_spacing_mm
        l_mm = config.track_length_mm
        v_mms = config.scan_velocity_mm_s
        t_track = l_mm / v_mms
        t_turn = config.turnaround_delay_ms * 1e-3

        tracks: List[TrackThermalRecord] = []
        time_curr = 0.0

        k_th = self.material.thermal_conductivity_W_mK
        t_melt = self.material.melting_temp_K
        t_boil = self.material.boiling_temp_K
        sigma_b = config.beam_radius_mm
        eta = self.material.absorptivity

        # Rosenthal quasi-steady maximum temperature rise directly under laser spot:
        # Delta T_steady = sqrt(2) * eta * P / (pi * sqrt(pi) * k * r_b)
        delta_t_spot = (math.sqrt(2.0) * eta * config.laser_power_W) / (math.pi * math.sqrt(math.pi) * (k_th * 1e-3) * sigma_b)

        for i in range(config.num_tracks):
            t_start = time_curr
            t_end = t_start + t_track
            track_y = i * h_mm
            # Midpoint evaluation for baseline preheat
            mid_x = l_mm / 2.0

            # Residual drift from prior tracks at track start
            t_drift = self.evaluate_track_temperature_rise(
                config=config,
                track_idx=i,
                current_time_s=t_start + (t_track / 2.0),
                eval_x_mm=mid_x,
                eval_y_mm=track_y,
                eval_z_mm=0.0
            )

            baseline_temp = config.bed_temperature_K + t_drift
            peak_temp = baseline_temp + delta_t_spot

            # Keyholing criteria: Peak temperature exceeding boiling point
            is_keyhole = peak_temp >= t_boil

            # Melt pool width & depth scaling from King et al. (2014) & Gladush
            # Width scales with sqrt((Peak - Bed) / (Melt - Bed))
            overheat_ratio = max(1.0, (peak_temp - config.bed_temperature_K) / max(1.0, t_melt - config.bed_temperature_K))
            mp_width_um = config.beam_diameter_um * math.sqrt(overheat_ratio)
            # Conduction depth is ~0.4 * width; Keyhole depth jumps to ~1.0-1.5 * width
            depth_factor = 1.1 if is_keyhole else 0.42
            mp_depth_um = mp_width_um * depth_factor

            rec = TrackThermalRecord(
                track_index=i + 1,
                start_time_s=round(t_start, 5),
                end_time_s=round(t_end, 5),
                baseline_temp_K=round(baseline_temp, 2),
                peak_temp_K=round(peak_temp, 2),
                temp_drift_K=round(t_drift, 2),
                is_keyholing_risk=is_keyhole,
                melt_pool_width_um=round(mp_width_um, 1),
                melt_pool_depth_um=round(mp_depth_um, 1)
            )
            tracks.append(rec)
            time_curr = t_end + t_turn

        max_drift = max(t.temp_drift_K for t in tracks)
        keyhole_count = sum(1 for t in tracks if t.is_keyholing_risk)

        return {
            "alloy": self.material.name,
            "total_hatch_time_s": round(time_curr, 4),
            "num_tracks": config.num_tracks,
            "max_baseline_drift_K": round(max_drift, 2),
            "keyhole_mode_tracks_count": keyhole_count,
            "bed_temperature_K": config.bed_temperature_K,
            "melting_point_K": t_melt,
            "boiling_point_K": t_boil,
            "tracks": [
                {
                    "track_index": t.track_index,
                    "start_time_ms": round(t.start_time_s * 1000.0, 2),
                    "baseline_temp_K": t.baseline_temp_K,
                    "peak_temp_K": t.peak_temp_K,
                    "temp_drift_K": t.temp_drift_K,
                    "is_keyholing_risk": t.is_keyholing_risk,
                    "melt_pool_width_um": t.melt_pool_width_um,
                    "melt_pool_depth_um": t.melt_pool_depth_um,
                }
                for t in tracks
            ]
        }

    def optimize_dwell_delays(
        self,
        config: HatchProcessConfig,
        max_allowable_drift_K: float = 120.0
    ) -> Dict[str, Any]:
        """
        Calculates adaptive inter-track turnaround dwell times to prevent
        thermal drift from exceeding max_allowable_drift_K.
        """
        unmitigated = self.simulate_hatch_sequence(config)

        # Calculate optimal dwell delay
        # If max drift exceeds limit, estimate needed extra delay via 1D thermal decay
        alpha = self.material.thermal_diffusivity_mm2_s
        h = config.hatch_spacing_mm

        if unmitigated["max_baseline_drift_K"] > max_allowable_drift_K:
            excess_ratio = unmitigated["max_baseline_drift_K"] / max(1.0, max_allowable_drift_K)
            # Relaxation time scales with h^2 / (4 * alpha) * ln(excess)
            t_relax_ms = max(0.5, ((h ** 2) / (4.0 * alpha)) * math.log(excess_ratio) * 1000.0 * 2.5)
            opt_turnaround_ms = round(config.turnaround_delay_ms + t_relax_ms, 2)
        else:
            opt_turnaround_ms = config.turnaround_delay_ms

        mitigated_config = HatchProcessConfig(
            laser_power_W=config.laser_power_W,
            scan_velocity_mm_s=config.scan_velocity_mm_s,
            beam_diameter_um=config.beam_diameter_um,
            hatch_spacing_um=config.hatch_spacing_um,
            track_length_mm=config.track_length_mm,
            num_tracks=config.num_tracks,
            bed_temperature_K=config.bed_temperature_K,
            turnaround_delay_ms=opt_turnaround_ms
        )

        mitigated = self.simulate_hatch_sequence(mitigated_config)

        return {
            "unmitigated": unmitigated,
            "mitigated": mitigated,
            "recommended_turnaround_delay_ms": opt_turnaround_ms,
            "original_turnaround_delay_ms": config.turnaround_delay_ms,
            "target_allowable_drift_K": max_allowable_drift_K,
            "drift_reduction_K": round(unmitigated["max_baseline_drift_K"] - mitigated["max_baseline_drift_K"], 2),
            "keyhole_hazards_prevented": unmitigated["keyhole_mode_tracks_count"] - mitigated["keyhole_mode_tracks_count"]
        }

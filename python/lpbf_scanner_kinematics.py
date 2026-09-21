import math

def calculate_scanner_kinematics(nominal_speed_mms, track_length_um, a_max_mms2=200000.0, jump_delay_us=100, mark_delay_us=100):
    """
    Simulate galvo mirror kinematics, skywriting and acceleration constraints.
    Returns effective speeds at different positions of the track.
    
    nominal_speed_mms: Commanded scan speed in mm/s
    track_length_um: Length of the scan vector in micrometers
    a_max_mms2: Maximum scanner acceleration (mm/s^2), typically 100k - 300k
    jump_delay_us: Delay before laser on
    mark_delay_us: Delay after laser off
    """
    track_length_mm = track_length_um / 1000.0
    
    # Distance required to accelerate to nominal speed: d = v^2 / (2a)
    accel_dist_mm = (nominal_speed_mms ** 2) / (2.0 * a_max_mms2)
    
    # If the track is too short to reach nominal speed without skywriting:
    if 2 * accel_dist_mm > track_length_mm:
        # Triangular velocity profile
        peak_speed = math.sqrt(track_length_mm * a_max_mms2)
        mid_speed = peak_speed
        end_speed = 0.0 # Stopping at the end
    else:
        # Trapezoidal profile (skywriting allows reaching nominal speed before laser on, 
        # but if we model the vector endpoints without skywriting, they decelerate).
        # Assuming standard skywriting is ON, the laser turns on when speed is already nominal_speed.
        mid_speed = nominal_speed_mms
        # With skywriting, the speed at the exact start and end of the melt track is the nominal speed.
        # But if there's an issue with skywriting tuning, it might dip.
        # We will expose a "turnaround" speed representing the slowdown at the vector ends if skywriting fails.
        peak_speed = nominal_speed_mms

    return {
        "nominalSpeed_mms": nominal_speed_mms,
        "effectiveMidTrackSpeed_mms": mid_speed,
        "skywritingRequired_mm": round(accel_dist_mm, 3),
        "turnaroundTimePenalty_us": jump_delay_us + mark_delay_us,
        "acceleration_mms2": a_max_mms2,
        "warning": "Track too short to reach speed" if mid_speed < nominal_speed_mms else None
    }

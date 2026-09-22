import numpy as np
from shapely.geometry import Polygon, LineString, MultiLineString, box
import math
from typing import List, Dict, Any

from lpbf_thermal_accumulation import MultiTrackThermalEngine, HatchProcessConfig
from four_alloy_materials import resolve_alloy_id

def generate_lines_in_polygon(polygon: Polygon, hatch_spacing_mm: float, angle_deg: float) -> List[LineString]:
    minx, miny, maxx, maxy = polygon.bounds
    diag = np.sqrt((maxx - minx)**2 + (maxy - miny)**2)
    cx, cy = (minx + maxx)/2, (miny + maxy)/2
    
    lines = []
    angle_rad = np.radians(angle_deg)
    dx = -np.sin(angle_rad) * hatch_spacing_mm
    dy = np.cos(angle_rad) * hatch_spacing_mm
    lx = np.cos(angle_rad) * diag
    ly = np.sin(angle_rad) * diag
    
    steps = int(diag / max(0.01, hatch_spacing_mm)) + 1
    
    for i in range(-steps, steps):
        px = cx + i * dx
        py = cy + i * dy
        line = LineString([(px - lx, py - ly), (px + lx, py + ly)])
        intersection = polygon.intersection(line)
        if not intersection.is_empty:
            if isinstance(intersection, LineString):
                lines.append(intersection)
            elif isinstance(intersection, MultiLineString):
                lines.extend(list(intersection.geoms))
    return lines

def order_lines_greedy(lines: List[LineString]) -> List[LineString]:
    if not lines: return []
    unvisited = lines.copy()
    ordered = []
    
    # Start with the first line
    current = unvisited.pop(0)
    ordered.append(current)
    current_end = np.array(current.coords[-1])
    
    while unvisited:
        best_idx = 0
        best_dist = float('inf')
        best_reverse = False
        
        for i, line in enumerate(unvisited):
            p1 = np.array(line.coords[0])
            p2 = np.array(line.coords[-1])
            d1 = np.linalg.norm(p1 - current_end)
            d2 = np.linalg.norm(p2 - current_end)
            
            if d1 < best_dist:
                best_dist = d1
                best_idx = i
                best_reverse = False
            if d2 < best_dist:
                best_dist = d2
                best_idx = i
                best_reverse = True
                
        next_line = unvisited.pop(best_idx)
        if best_reverse:
            next_line = LineString(list(next_line.coords)[::-1])
        
        ordered.append(next_line)
        current_end = np.array(next_line.coords[-1])
        
    return ordered

def generate_toolpath_thermal_map(
    alloy: str,
    power_W: float,
    speed_mms: float,
    strategy: str,
    hatch_um: float,
    angle: float,
    island_size_mm: float = 5.0
) -> Dict[str, Any]:
    
    hatch_mm = hatch_um / 1000.0
    
    # 1. Define base geometry (10x10 mm square for this visualization)
    poly = box(0, 0, 10, 10)
    
    lines = []
    if strategy == "stripe":
        lines = generate_lines_in_polygon(poly, hatch_mm, angle)
    elif strategy == "chessboard":
        minx, miny, maxx, maxy = poly.bounds
        nx = int(np.ceil((maxx - minx) / island_size_mm))
        ny = int(np.ceil((maxy - miny) / island_size_mm))
        
        for ix in range(nx):
            for iy in range(ny):
                cell_poly = box(
                    minx + ix*island_size_mm, 
                    miny + iy*island_size_mm, 
                    minx + (ix+1)*island_size_mm, 
                    miny + (iy+1)*island_size_mm
                ).intersection(poly)
                
                # Alternate angle by 90 degrees
                cell_angle = angle if (ix + iy) % 2 == 0 else angle + 90
                cell_lines = generate_lines_in_polygon(cell_poly, hatch_mm, cell_angle)
                lines.extend(cell_lines)
    else:
        lines = generate_lines_in_polygon(poly, hatch_mm, angle)
        
    # 2. Greedy sort to form a continuous toolpath
    lines = order_lines_greedy(lines)
    
    if not lines:
        return {"error": "No toolpath generated."}
        
    # 3. Compute thermal accumulation
    # For Phase 17 engine, we need lengths of tracks and turnaround times.
    # We will simulate a sequence of tracks.
    
    config = HatchProcessConfig(
        laser_power_W=power_W,
        scan_velocity_mm_s=speed_mms,
        hatch_spacing_um=hatch_um,
        beam_diameter_um=80.0,
        track_length_mm=np.mean([line.length for line in lines]), # average for simplification
        num_tracks=len(lines),
        bed_temperature_K=300.0,
        turnaround_delay_ms=2.0 # default jump time
    )
    
    from lpbf_thermal_accumulation import AlloyThermalProperties
    mat_props = AlloyThermalProperties(name=alloy)
    engine = MultiTrackThermalEngine(material=mat_props)
    results = engine.simulate_hatch_sequence(config)
    track_records = results.get("tracks", [])
    tracks_json = []
    for i, line in enumerate(lines):
        c = list(line.coords)
        if i < len(track_records):
            t_data = track_records[i]
            drift = t_data.get('temp_drift_K', 0.0)
            t_max = t_data.get('peak_temp_K', 300.0)
        else:
            drift = 0.0
            t_max = 300.0
            
        tracks_json.append({
            "x1": c[0][0], "y1": c[0][1],
            "x2": c[1][0], "y2": c[1][1],
            "t_max": float(t_max),
            "t_drift": float(drift)
        })
        
    return {
        "alloy": alloy,
        "strategy": strategy,
        "hatch_um": hatch_um,
        "total_tracks": len(lines),
        "tracks": tracks_json
    }

if __name__ == "__main__":
    res = generate_toolpath_thermal_map("IN718", 250, 1000, "chessboard", 100, 45, 5.0)
    print(f"Generated {res['total_tracks']} tracks.")
    if res['tracks']:
        print(f"First track T_max: {res['tracks'][0]['t_max']:.1f} K")
        print(f"Last track T_max:  {res['tracks'][-1]['t_max']:.1f} K")

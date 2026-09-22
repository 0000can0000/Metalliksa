import numpy as np
from shapely.geometry import Polygon, LineString, MultiLineString
import matplotlib.pyplot as plt

def generate_stripe_toolpath(polygon, hatch_spacing, angle_deg):
    minx, miny, maxx, maxy = polygon.bounds
    diag = np.sqrt((maxx - minx)**2 + (maxy - miny)**2)
    cx, cy = (minx + maxx)/2, (miny + maxy)/2
    
    # Create lines covering the bounding circle
    lines = []
    angle_rad = np.radians(angle_deg)
    
    # Perpendicular direction for stepping
    dx = -np.sin(angle_rad) * hatch_spacing
    dy = np.cos(angle_rad) * hatch_spacing
    
    # Line direction
    lx = np.cos(angle_rad) * diag
    ly = np.sin(angle_rad) * diag
    
    # Number of steps
    steps = int(diag / hatch_spacing) + 1
    
    for i in range(-steps, steps):
        # Step center
        px = cx + i * dx
        py = cy + i * dy
        
        # Line segment
        line = LineString([(px - lx, py - ly), (px + lx, py + ly)])
        
        # Intersect with polygon
        intersection = polygon.intersection(line)
        if not intersection.is_empty:
            if isinstance(intersection, LineString):
                lines.append(intersection)
            elif isinstance(intersection, MultiLineString):
                lines.extend(list(intersection.geoms))
                
    return lines

# Quick test
if __name__ == "__main__":
    poly = Polygon([(0,0), (10,0), (10,10), (0,10)])
    stripes = generate_stripe_toolpath(poly, 1.0, 45)
    print(f"Generated {len(stripes)} hatch lines.")
    for line in stripes:
        print(line.coords[:])

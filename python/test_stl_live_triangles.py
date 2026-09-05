#!/usr/bin/env python3
"""Live customTriangles must drive bbox, not a demo CAD preset."""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOLVER = os.path.join(HERE, "stl_slicer_build_time_solver.py")


def run_solver(payload):
    proc = subprocess.run(
        [sys.executable, SOLVER],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=HERE,
    )
    if proc.returncode != 0:
        raise AssertionError(proc.stderr or proc.stdout)
    return json.loads(proc.stdout)


def box_triangles(dx, dy, dz):
    from stl_slicer_build_time_solver import create_box_triangles

    return create_box_triangles(0, 0, 0, dx, dy, dz)


def main():
    box = run_solver(
        {
            "preset": "nozzle",
            "cadAssetName": "coupon-20x10x8.stl",
            "customTriangles": box_triangles(20.0, 10.0, 8.0),
            "triangleCountNative": 12,
            "material": "Ti-6Al-4V ELI",
            "laserPower_W": 200,
            "scanSpeed_mms": 900,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
        }
    )
    assert box.get("geometrySource") == "uploaded-stl", box.get("geometrySource")
    assert abs(box["meshMetrics"]["sizeX_mm"] - 20.0) < 0.2, box["meshMetrics"]
    assert abs(box["meshMetrics"]["sizeY_mm"] - 10.0) < 0.2, box["meshMetrics"]
    assert abs(box["meshMetrics"]["sizeZ_mm"] - 8.0) < 0.2, box["meshMetrics"]
    assert box["preset"] == "custom"

    nozzle = run_solver(
        {
            "preset": "nozzle",
            "material": "Ti-6Al-4V ELI",
            "laserPower_W": 200,
            "scanSpeed_mms": 900,
            "layerThickness_um": 30,
            "hatchSpacing_um": 100,
        }
    )
    assert nozzle.get("geometrySource") == "demo-preset"
    assert nozzle["meshMetrics"]["sizeY_mm"] > 40.0, nozzle["meshMetrics"]
    assert box["meshMetrics"]["sizeY_mm"] < nozzle["meshMetrics"]["sizeY_mm"]

    print("PASS: live STL triangles override demo preset bbox")
    return 0


if __name__ == "__main__":
    sys.exit(main())

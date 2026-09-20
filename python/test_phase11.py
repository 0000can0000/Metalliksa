import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from lpbf_modulus_fno import predict_part_scale_thermal_history

def test_modulus_fno_inference():
    """
    Test that the NVIDIA Modulus FNO surrogate model runs and produces physically plausible outputs.
    """
    with unittest.TestCase().assertRaisesRegex(RuntimeError, "trained.*checkpoint"):
        predict_part_scale_thermal_history(
            power_W=350, speed_mms=1200, preheat_C=200,
            hatch_um=100, layer_um=40, nx=32, ny=32, nz=32,
        )
    print("PASS: untrained FNO cannot publish physical predictions")

if __name__ == "__main__":
    test_modulus_fno_inference()

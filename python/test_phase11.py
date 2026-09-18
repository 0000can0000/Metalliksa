import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from lpbf_modulus_fno import predict_part_scale_thermal_history

def test_modulus_fno_inference():
    """
    Test that the NVIDIA Modulus FNO surrogate model runs and produces physically plausible outputs.
    """
    res = predict_part_scale_thermal_history(
        power_W=350,
        speed_mms=1200,
        preheat_C=200,
        hatch_um=100,
        layer_um=40,
        nx=32,
        ny=32,
        nz=32
    )
    
    assert res["status"] == "success"
    assert res["inference_time_ms"] > 0
    assert "cuda" in res["device"] or "cpu" in res["device"]
    assert len(res["grid_shape"]) == 3
    assert res["max_temp_C"] > res["min_temp_C"]
    assert res["max_temp_C"] > 200.0  # Should be hotter than preheat
    assert len(res["thermal_field_sample"]) == 32
    
    print(f"Modulus FNO inference time: {res['inference_time_ms']:.2f} ms")
    print("Phase 11 Modulus FNO Test Passed.")

if __name__ == "__main__":
    test_modulus_fno_inference()

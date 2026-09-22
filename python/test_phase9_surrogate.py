import pytest
from pathlib import Path
from phase9_surrogate import generate_synthetic_data, train_surrogate, predict_surrogate

def test_phase9_surrogate_training():
    # Train a very small model just for test
    path_str = train_surrogate("IN718", 20)
    assert Path(path_str).exists()

def test_phase9_surrogate_prediction_in_distribution():
    # Assume model is trained from the previous test or manually
    # P=300, V=1000, T0=100 should be well within (100,500) and (400,2000) and (25,200)
    res = predict_surrogate("IN718", 300, 1000, 100)
    assert res["surrogate_used"] is True
    assert res["width_um"] > 0
    assert res["depth_um"] > 0
    assert res["error_budget"]["is_out_of_distribution"] is False
    assert res["error_budget"]["confidence_pct"] > 80.0 # High confidence for in-distribution

def test_phase9_surrogate_prediction_out_of_distribution():
    # Extreme parameters
    res = predict_surrogate("IN718", 1000, 50, 500)
    assert res["error_budget"]["is_out_of_distribution"] is True
    assert res["error_budget"]["confidence_pct"] == 0.0 # Confidence goes to 0 outside bounds

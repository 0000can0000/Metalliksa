"""
===================================================================================
METALLIX LABS: Mechanical Property Prediction Engine
Inputs: Chemical Composition (wt% Fe, Ni, Cr, Co, Mo, W, Al, Ti, Nb, V, C, B) + Heat Treatment
Outputs: Yield Strength (MPa), UTS (MPa), Elongation (%), Hardness (HV), Creep Life (hrs)
Models: XGBoost Regressor + PyTorch Physics-Informed Neural Network (PINN) -> ONNX
===================================================================================
"""

import os
import sys
import argparse
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error
try:
    import onnx
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

try:
    import xgboost as xgb
except ImportError:
    os.system("pip install xgboost")
    import xgboost as xgb

# ---------------------------------------------------------
# 1. ELEMENTAL CONSTANTS & METALLURGICAL FEATURE ENGINEERING
# ---------------------------------------------------------
ELEMENT_LIST = ["Ni", "Fe", "Cr", "Co", "Mo", "W", "Al", "Ti", "Nb", "V", "Ta", "C", "B"]
HEAT_TREATMENT_FEATURES = ["Solution_Temp_C", "Solution_Time_hrs", "Aging1_Temp_C", "Aging1_Time_hrs", "Aging2_Temp_C", "Aging2_Time_hrs"]

FEATURE_NAMES = ELEMENT_LIST + HEAT_TREATMENT_FEATURES

# Atomic radii in Angstroms for Solid Solution Misfit (\delta)
ATOMIC_RADII = {
    "Ni": 1.24, "Fe": 1.26, "Cr": 1.28, "Co": 1.25, "Mo": 1.39, "W": 1.39,
    "Al": 1.43, "Ti": 1.47, "Nb": 1.46, "V": 1.34, "Ta": 1.46, "C": 0.77, "B": 0.82
}

# Valence Electron Concentration (VEC)
VEC = {
    "Ni": 10, "Fe": 8, "Cr": 6, "Co": 9, "Mo": 6, "W": 6,
    "Al": 3, "Ti": 4, "Nb": 5, "V": 5, "Ta": 5, "C": 4, "B": 3
}


# 3. PYTORCH PINN REGRESSOR MODEL (For ONNX Web Export)
# ---------------------------------------------------------
class MetallurgicalPropertyPINN(nn.Module):
    def __init__(self, input_dim=len(FEATURE_NAMES), output_dim=5):
        super(MetallurgicalPropertyPINN, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.SiLU(),
            nn.BatchNorm1d(64),
            nn.Linear(64, 128),
            nn.SiLU(),
            nn.Dropout(0.1),
            nn.Linear(128, 64),
            nn.SiLU(),
            nn.Linear(64, output_dim)
        )

    def forward(self, x):
        return self.net(x)


# ---------------------------------------------------------
# 4. TRAINING & ONNX EXPORT PIPELINE
# ---------------------------------------------------------
def train_and_export(epochs=80, batch_size=32, lr=1e-3, data_csv_path=None):
    print("[*] Initializing Metallurgical Mechanical Property AI Training...")
    
    if not data_csv_path or not os.path.exists(data_csv_path):
        raise RuntimeError(
            "ERROR: A real empirical CSV dataset path must be provided. "
            "Generating dummy/synthetic material property data is strictly prohibited "
            "to ensure scientific validity. Please provide a path to actual experimental data."
        )

    print(f"[+] Loading REAL experimental alloy data from: {data_csv_path}")
    df = pd.read_csv(data_csv_path)
    
    # Ensure required columns exist
    missing_feats = [f for f in FEATURE_NAMES if f not in df.columns]
    if missing_feats:
        raise ValueError(f"CSV is missing required feature columns: {missing_feats}")

    target_cols = ["Yield_Strength_MPa", "UTS_MPa", "Elongation_pct", "Hardness_HV", "Creep_Life_hrs"]
    missing_targets = [t for t in target_cols if t not in df.columns]
    if missing_targets:
        raise ValueError(f"CSV is missing required target columns: {missing_targets}")

    # Drop NaNs
    df = df.dropna(subset=FEATURE_NAMES + target_cols)
    print(f"[*] Read {len(df)} empirical records.")

    X = df[FEATURE_NAMES].values
    y = df[target_cols].values

    scaler_X = StandardScaler()
    scaler_y = StandardScaler()

    X_scaled = scaler_X.fit_transform(X)
    y_scaled = scaler_y.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_scaled, test_size=0.15, random_state=42)

    # 1. Train XGBoost Baseline for reference
    print("\n--- 1. Training XGBoost Multi-Output Regressor ---")
    xgb_models = []
    target_names = ["Yield Strength", "UTS", "Elongation", "Hardness", "Creep Life"]
    for i, target in enumerate(target_names):
        reg = xgb.XGBRegressor(n_estimators=150, max_depth=5, learning_rate=0.08, random_state=42)
        reg.fit(X_train, y_train[:, i])
        y_pred = reg.predict(X_test)
        r2 = r2_score(y_test[:, i], y_pred)
        print(f"  [XGBoost] {target} R2 Score: {r2:.4f}")
        xgb_models.append(reg)

    # 2. Train PyTorch PINN for Web ONNX Export
    print("\n--- 2. Training PyTorch PINN Network ---")
    model = MetallurgicalPropertyPINN(input_dim=len(FEATURE_NAMES), output_dim=5)
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32)
    X_test_t = torch.tensor(X_test, dtype=torch.float32)
    y_test_t = torch.tensor(y_test, dtype=torch.float32)

    dataset = torch.utils.data.TensorDataset(X_train_t, y_train_t)
    loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

    for epoch in range(1, epochs + 1):
        model.train()
        for bx, by in loader:
            optimizer.zero_grad()
            pred = model(bx)
            loss = criterion(pred, by)
            loss.backward()
            optimizer.step()

        if epoch % 20 == 0 or epoch == epochs:
            model.eval()
            with torch.no_grad():
                test_pred = model(X_test_t)
                test_loss = criterion(test_pred, y_test_t).item()
                r2_overall = r2_score(y_test, test_pred.numpy())
                print(f"  Epoch {epoch}/{epochs} | Test MSE Loss: {test_loss:.4f} | Overall R2: {r2_overall:.4f}")

    # 3. Export to ONNX
    output_onnx = "metallix_mechanical_predictor.onnx"
    print(f"\n[*] Exporting PyTorch PINN to ONNX: {output_onnx}...")
    model.eval()
    dummy_input = torch.randn(1, len(FEATURE_NAMES), dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_onnx,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["alloy_composition_and_heat_treatment"],
        output_names=["predicted_mechanical_properties"],
        dynamic_axes={
            "alloy_composition_and_heat_treatment": {0: "batch_size"},
            "predicted_mechanical_properties": {0: "batch_size"}
        }
    )

    # Validate ONNX if available
    if HAS_ONNX:
        onnx_model = onnx.load(output_onnx)
        onnx.checker.check_model(onnx_model)
        print(f"[OK] ONNX Model verified successfully!")

        # Verify with ONNXRuntime
        ort_session = ort.InferenceSession(output_onnx)
        ort_inputs = {ort_session.get_inputs()[0].name: dummy_input.numpy()}
        ort_outs = ort_session.run(None, ort_inputs)
        print(f"[OK] ONNX Runtime Test Output Shape: {ort_outs[0].shape}")
        print(f"[*] Outputs: [Yield Strength, UTS, Elongation, Hardness, Creep Life]")
        print(f"[*] Model ready for client-side execution!")
    else:
        print("[!] ONNX/ONNXRuntime not installed. Skipping model verification.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train Metallurgical Mechanical Property Predictor")
    parser.add_argument("--data-file", type=str, required=True, help="Path to empirical alloy dataset (CSV)")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()

    train_and_export(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        data_csv_path=args.data_file
    )

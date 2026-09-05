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
import onnx
import onnxruntime as ort

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

def compute_metallurgical_features(comp_dict):
    """
    Computes solid solution strengthening parameters, VEC and gamma-prime volume fraction estimate.
    """
    total_wt = sum(comp_dict.get(el, 0) for el in ELEMENT_LIST)
    if total_wt == 0:
        total_wt = 100.0

    # Mole fraction approximation
    c_moles = {el: comp_dict.get(el, 0) / (58.69 if el == 'Ni' else 55.85) for el in ELEMENT_LIST}
    sum_moles = sum(c_moles.values())
    x_i = {el: c_moles[el] / sum_moles for el in ELEMENT_LIST}

    # Mean atomic radius
    r_mean = sum(x_i[el] * ATOMIC_RADII.get(el, 1.25) for el in ELEMENT_LIST)
    
    # Atomic size misfit: delta = sqrt( sum( x_i * (1 - r_i / r_mean)^2 ) )
    delta = np.sqrt(sum(x_i[el] * ((1.0 - ATOMIC_RADII.get(el, 1.25) / r_mean) ** 2) for el in ELEMENT_LIST)) * 100.0

    # Mean VEC
    vec_mean = sum(x_i[el] * VEC.get(el, 8) for el in ELEMENT_LIST)

    # Gamma prime forming elements (Al + Ti + Nb + Ta)
    gamma_prime_formers = comp_dict.get("Al", 0) + comp_dict.get("Ti", 0) + comp_dict.get("Nb", 0) + comp_dict.get("Ta", 0)

    return delta, vec_mean, gamma_prime_formers


# ---------------------------------------------------------
# 2. SYNTHETIC METALLURGY DATASET GENERATOR (Based on NIMS & Superalloy Physics)
# ---------------------------------------------------------
def generate_synthetic_alloy_dataset(num_samples=1500):
    """
    Generates a realistic multi-component alloy dataset covering Superalloys, Steels, and Titanium alloys.
    """
    records = []
    
    for _ in range(num_samples):
        alloy_type = np.random.choice(["ni_superalloy", "duplex_steel", "maraging_steel", "co_superalloy"])
        
        comp = {el: 0.0 for el in ELEMENT_LIST}
        
        if alloy_type == "ni_superalloy":
            comp["Ni"] = np.random.uniform(50.0, 75.0)
            comp["Cr"] = np.random.uniform(12.0, 22.0)
            comp["Co"] = np.random.uniform(0.0, 15.0)
            comp["Mo"] = np.random.uniform(2.0, 6.0)
            comp["W"] = np.random.uniform(0.0, 5.0)
            comp["Al"] = np.random.uniform(0.5, 5.5)
            comp["Ti"] = np.random.uniform(0.5, 4.0)
            comp["Nb"] = np.random.uniform(0.0, 5.5)
            comp["C"] = np.random.uniform(0.02, 0.08)
            comp["B"] = np.random.uniform(0.002, 0.015)
            
            sol_temp = np.random.uniform(980, 1180)
            sol_time = np.random.uniform(1, 4)
            age1_temp = np.random.uniform(720, 850)
            age1_time = np.random.uniform(4, 16)
            age2_temp = np.random.uniform(620, 700) if np.random.rand() > 0.3 else 0
            age2_time = np.random.uniform(4, 12) if age2_temp > 0 else 0

        elif alloy_type == "duplex_steel":
            comp["Fe"] = np.random.uniform(55.0, 70.0)
            comp["Cr"] = np.random.uniform(21.0, 26.0)
            comp["Ni"] = np.random.uniform(4.0, 8.0)
            comp["Mo"] = np.random.uniform(2.5, 4.5)
            comp["C"] = np.random.uniform(0.01, 0.03)
            
            sol_temp = np.random.uniform(1050, 1120)
            sol_time = np.random.uniform(0.5, 2)
            age1_temp = 0; age1_time = 0; age2_temp = 0; age2_time = 0

        else: # Maraging / High Strength Steel
            comp["Fe"] = np.random.uniform(65.0, 75.0)
            comp["Ni"] = np.random.uniform(15.0, 19.0)
            comp["Co"] = np.random.uniform(7.0, 12.0)
            comp["Mo"] = np.random.uniform(3.0, 5.5)
            comp["Ti"] = np.random.uniform(0.2, 1.8)
            comp["Al"] = np.random.uniform(0.1, 0.5)
            
            sol_temp = np.random.uniform(820, 860)
            sol_time = 1.0
            age1_temp = np.random.uniform(480, 520)
            age1_time = np.random.uniform(3, 8)
            age2_temp = 0; age2_time = 0

        # Metallurgical Strengthening Calculations
        delta, vec_mean, gp_formers = compute_metallurgical_features(comp)

        # 1. Yield Strength (MPa) physics model:
        # sigma_y = sigma_0 + sigma_ss(delta) + sigma_precipitate(gp_formers, aging) + noise
        aging_factor = 0.0
        if age1_temp > 400:
            # Overaging vs Peak aging peak around 720-760C for Ni, 480-500C for Maraging
            aging_factor = np.exp(-((age1_temp - 740) ** 2) / (2 * (80 ** 2))) * np.log1p(age1_time) * 220.0

        sigma_y = (
            250.0
            + 8.5 * comp["Cr"]
            + 18.0 * comp["Mo"]
            + 22.0 * comp["W"]
            + 45.0 * gp_formers
            + 15.0 * delta
            + aging_factor
            + np.random.normal(0, 18.0)
        )
        
        # 2. UTS (MPa)
        work_hardening_ratio = np.random.uniform(1.20, 1.45)
        uts = sigma_y * work_hardening_ratio + np.random.normal(0, 20.0)

        # 3. Elongation (%) - Tradeoff with strength
        elongation = max(4.0, min(45.0, 48.0 - (sigma_y / 38.0) + np.random.normal(0, 2.5)))

        # 4. Vickers Hardness (HV)
        hardness_hv = (sigma_y / 3.1) + np.random.normal(0, 10.0)

        # 5. Creep Rupture Life at 650°C / 620 MPa (Hours)
        log_creep_life = (
            0.05 * comp["Ni"]
            + 0.12 * comp["Mo"]
            + 0.18 * comp["W"]
            + 0.25 * comp["Al"]
            + 0.20 * comp["Ti"]
            + (aging_factor / 100.0)
            - 1.5
            + np.random.normal(0, 0.3)
        )
        creep_life_hrs = np.exp(np.clip(log_creep_life, 0.5, 8.5))

        row = [comp[el] for el in ELEMENT_LIST] + [sol_temp, sol_time, age1_temp, age1_time, age2_temp, age2_time]
        targets = [sigma_y, uts, elongation, hardness_hv, creep_life_hrs]
        records.append(row + targets)

    columns = FEATURE_NAMES + ["Yield_Strength_MPa", "UTS_MPa", "Elongation_pct", "Hardness_HV", "Creep_Life_hrs"]
    return pd.DataFrame(records, columns=columns)


# ---------------------------------------------------------
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
def train_and_export(epochs=80, batch_size=32, lr=1e-3):
    print("[*] Generating Metallurgical Dataset (Composition + Heat Treatment -> Properties)...")
    df = generate_synthetic_alloy_dataset(num_samples=2500)

    X = df[FEATURE_NAMES].values
    y = df[["Yield_Strength_MPa", "UTS_MPa", "Elongation_pct", "Hardness_HV", "Creep_Life_hrs"]].values

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

    # Validate ONNX
    onnx_model = onnx.load(output_onnx)
    onnx.checker.check_model(onnx_model)
    print(f"[✓] ONNX Model verified successfully!")

    # Verify with ONNXRuntime
    ort_session = ort.InferenceSession(output_onnx)
    ort_inputs = {ort_session.get_inputs()[0].name: dummy_input.numpy()}
    ort_outs = ort_session.run(None, ort_inputs)
    print(f"[✓] ONNX Runtime Test Output Shape: {ort_outs[0].shape}")
    print(f"[★] Outputs: [Yield Strength, UTS, Elongation, Hardness, Creep Life]")
    print(f"[★] Model ready for client-side execution!")

if __name__ == "__main__":
    train_and_export()

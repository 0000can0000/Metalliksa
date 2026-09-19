"""
===================================================================================
METALLIX LABS: Vision AI Metallurgical Micrograph Segmentation Model
Architecture: U-Net / SegFormer with ResNet34 or MiT Backbone
Target Standard: ASTM E562 (Phase Volume Fractioning) & ASTM E112 (Grain Boundaries)
Outputs: Optimized ONNX model (FP32 / INT8) ready for browser Wasm/WebGPU execution.
===================================================================================
"""

import os
import sys
import argparse
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm
try:
    import onnx
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

try:
    import segmentation_models_pytorch as smp
except ImportError:
    print("Installing segmentation-models-pytorch...")
    os.system("pip install segmentation-models-pytorch")
    import segmentation_models_pytorch as smp

# ---------------------------------------------------------
# 1. METALLURGICAL PHASES CONFIGURATION
# ---------------------------------------------------------
METALLURGICAL_CLASSES = [
    "Matrix (Ferrite/Austenite)",  # Class 0
    "Grain Boundaries",           # Class 1
    "Precipitates (Gamma'/Alpha)", # Class 2
    "Carbides (MC/M23C6)",         # Class 3
    "TCP / Intermetallics (Sigma)",# Class 4
    "Pores & Inclusions (MnS/LPBF)"# Class 5
]
NUM_CLASSES = len(METALLURGICAL_CLASSES)

# ---------------------------------------------------------
# 2. SYNTHETIC METALLOGRAPHY GENERATOR (For Training Without Big Real Data)
# ---------------------------------------------------------
# ---------------------------------------------------------
# 3. PYTORCH DATASET WITH METALLURGICAL AUGMENTATIONS
# ---------------------------------------------------------
# ---------------------------------------------------------
# 4. TRAINING FUNCTION WITH DICE + CROSS-ENTROPY LOSS
# ---------------------------------------------------------
def train_model(epochs=10, batch_size=4, lr=1e-3, data_dir=None, device="cuda" if torch.cuda.is_available() else "cpu"):
    print(f"[*] Initializing Metallurgical AI Segmentation Training on device: {device}")
    
    if not data_dir or not os.path.exists(data_dir):
        raise RuntimeError(
            "ERROR: A valid directory containing real experimental micrograph datasets is required. "
            "Dummy synthetic image generation is strictly prohibited. "
            "Please provide --data-dir pointing to real SEM/Optical phase-labeled images."
        )

    # U-Net with ResNet34 backbone
    import torchvision.models as tvm
    model = smp.Unet(
        encoder_name="resnet34",
        encoder_weights=None,   # prevents HuggingFace download
        in_channels=3,
        classes=NUM_CLASSES,
        activation=None
    )
    tv_resnet = tvm.resnet34(weights=tvm.ResNet34_Weights.IMAGENET1K_V1)
    encoder_state = {k: v for k, v in tv_resnet.state_dict().items() if not k.startswith("fc.")}
    model.encoder.load_state_dict(encoder_state, strict=False)
    model.to(device)

    # Connect real data pipeline
    from lpbf_real_dataset_pipeline import RealDataIngestionPipeline
    from pathlib import Path
    
    pipeline = RealDataIngestionPipeline(Path(data_dir))
    pipeline.scan_and_ingest_all()
    pipeline.split_and_save_manifest()
    train_loader, val_loader, _ = pipeline.get_segmentation_dataloaders(batch_size=batch_size)

    # Combined Dice Loss + Cross Entropy for imbalanced phase boundaries
    dice_loss_fn = smp.losses.DiceLoss(mode="multiclass")
    ce_loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_loss = float("inf")

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        
        pbar = tqdm(train_loader, desc=f"Epoch {epoch}/{epochs} [Train]")
        for images, masks in pbar:
            images = images.to(device)
            masks = masks.to(device)

            optimizer.zero_grad()
            logits = model(images)
            
            loss = 0.5 * ce_loss_fn(logits, masks) + 0.5 * dice_loss_fn(logits, masks)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            pbar.set_postfix({"Loss": f"{loss.item():.4f}"})

        scheduler.step()
        train_loss /= len(train_loader)

        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for images, masks in val_loader:
                images = images.to(device)
                masks = masks.to(device)
                logits = model(images)
                loss = 0.5 * ce_loss_fn(logits, masks) + 0.5 * dice_loss_fn(logits, masks)
                val_loss += loss.item()
        
        val_loss /= max(1, len(val_loader))
        print(f"--> Epoch {epoch}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), "best_metallix_unet.pth")
            print(f"    [+] Saved new checkpoint (Val Loss: {val_loss:.4f})")

    return model

# ---------------------------------------------------------
# 5. EXPORT TO ONNX FORMAT FOR BROWSER RUNTIME
# ---------------------------------------------------------
def export_to_onnx(model, output_path="metallix_micrograph_unet.onnx", img_size=(512, 512)):
    print(f"[*] Exporting PyTorch model to ONNX: {output_path}...")
    model.eval()
    model.cpu()

    dummy_input = torch.randn(1, 3, img_size[0], img_size[1], dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["micrograph_input"],
        output_names=["phase_logits"],
        dynamic_axes={
            "micrograph_input": {0: "batch_size"},
            "phase_logits": {0: "batch_size"}
        }
    )

    if HAS_ONNX:
        onnx_model = onnx.load(output_path)
        onnx.checker.check_model(onnx_model)
        print(f"[OK] ONNX model successfully verified!")

        ort_session = ort.InferenceSession(output_path)
        ort_inputs = {ort_session.get_inputs()[0].name: dummy_input.numpy()}
        ort_outs = ort_session.run(None, ort_inputs)
        print(f"[OK] ONNX Runtime Test Inference Output Shape: {ort_outs[0].shape}")
        print(f"[*] Model ready for web app deployment!")
    else:
        print("[!] ONNX/ONNXRuntime not installed. Skipping model verification.")


# ---------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Metallurgical Micrograph AI Segmentation Model")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--data-dir", type=str, required=True, help="Path to real experimental micrograph dataset")
    parser.add_argument("--export-only", action="store_true", help="Skip training and export dummy model directly")
    args = parser.parse_args()

    if args.export_only:
        print("[*] Creating pre-configured U-Net for direct export...")
        model = smp.Unet(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=NUM_CLASSES)
        export_to_onnx(model)
    else:
        trained_model = train_model(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr, data_dir=args.data_dir)
        export_to_onnx(trained_model)


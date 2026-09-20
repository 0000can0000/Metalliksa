"""
===================================================================================
METALLIX LABS: Vision AI Metallurgical Micrograph Segmentation Model
Architecture: U-Net / SegFormer with ResNet34 or MiT Backbone
Target Standard: ASTM E562 (Phase Volume Fractioning) & ASTM E112 (Grain Boundaries)
Research training only. Browser export is unavailable until a trained checkpoint,
dataset provenance, preprocessing contract and independent evaluation are supported.
===================================================================================
"""

import argparse
import math
from pathlib import Path
import torch
import torch.nn as nn
from tqdm import tqdm

try:
    import segmentation_models_pytorch as smp
except ImportError:
    smp = None

EXPORT_UNAVAILABLE = (
    "Micrograph ONNX export unavailable: no supported trained checkpoint with "
    "dataset provenance, class/preprocessing contract and independent evaluation. "
    "Random architecture initialization or an ImageNet encoder is not a trained "
    "metallurgical segmentation model."
)

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
# 4. TRAINING FUNCTION WITH DICE + CROSS-ENTROPY LOSS
# ---------------------------------------------------------
def train_model(epochs=10, batch_size=4, lr=1e-3, data_dir=None, device="cuda" if torch.cuda.is_available() else "cpu"):
    if isinstance(epochs, bool) or not isinstance(epochs, int) or epochs <= 0:
        raise ValueError("epochs must be a positive integer; zero epochs cannot produce a trained model")
    if isinstance(batch_size, bool) or not isinstance(batch_size, int) or batch_size <= 0:
        raise ValueError("batch_size must be a positive integer")
    if not math.isfinite(lr) or lr <= 0:
        raise ValueError("lr must be finite and positive")
    if not data_dir or not Path(data_dir).is_dir():
        raise RuntimeError(
            "A directory containing traceable labeled micrograph datasets is required. "
            "Please provide --data-dir pointing to real SEM/Optical phase-labeled images."
        )
    if smp is None:
        raise RuntimeError("Training unavailable: segmentation-models-pytorch is not installed in this interpreter. No automatic installation was attempted.")

    # Check data availability before allocating a model or requesting any weights.
    try:
        from lpbf_real_dataset_pipeline import RealDataIngestionPipeline
    except ImportError as exc:
        raise RuntimeError("Micrograph training data pipeline unavailable; no model was trained.") from exc
    pipeline = RealDataIngestionPipeline(Path(data_dir))
    pipeline.scan_and_ingest_all()
    pipeline.split_and_save_manifest()
    train_loader, val_loader, _ = pipeline.get_segmentation_dataloaders(batch_size=batch_size)
    if len(train_loader) == 0 or len(val_loader) == 0:
        raise RuntimeError("Nonempty training and validation splits are required; no model was trained.")

    print(f"[*] Initializing research segmentation training on device: {device}")

    # U-Net with ResNet34 backbone
    model = smp.Unet(
        encoder_name="resnet34",
        encoder_weights=None,   # prevents HuggingFace download
        in_channels=3,
        classes=NUM_CLASSES,
        activation=None
    )
    model.to(device)

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
            if not torch.isfinite(loss):
                raise RuntimeError("Non-finite training loss; model is unavailable.")
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
        
        val_loss /= len(val_loader)
        if not math.isfinite(val_loss):
            raise RuntimeError("Non-finite validation loss; model is unavailable.")
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
    # A shape smoke test cannot establish trained weights or scientific validity.
    # Keep the public entry point fail-closed until an artifact contract exists.
    raise RuntimeError(EXPORT_UNAVAILABLE)


# ---------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Metallurgical Micrograph AI Segmentation Model")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--data-dir", type=str, help="Path to traceable labeled micrograph dataset (required for training)")
    parser.add_argument("--export-only", action="store_true", help="Unavailable until trained artifact provenance and evaluation are supported")
    args = parser.parse_args()

    if args.export_only:
        parser.error(EXPORT_UNAVAILABLE)
    else:
        try:
            train_model(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr, data_dir=args.data_dir)
        except (ValueError, RuntimeError) as exc:
            parser.error(str(exc))
        print("Research checkpoint saved. " + EXPORT_UNAVAILABLE)


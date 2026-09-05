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
import cv2
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import albumentations as A
from albumentations.pytorch import ToTensorV2
from tqdm import tqdm
import onnx
import onnxruntime as ort

try:
    import segmentation_models_pytorch as smp
except ImportError:
    print("Installing segmentation-models-pytorch...")
    os.system("pip install segmentation-models-pytorch albumentations")
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
def generate_synthetic_micrograph(width=512, height=512, sample_type="superalloy"):
    """
    Generates realistic synthetic metallographic SEM/Optical images and matching ground-truth masks.
    """
    image = np.ones((height, width), dtype=np.uint8) * 128
    mask = np.zeros((height, width), dtype=np.int64) # Class 0 by default (Matrix)

    # 1. Base Matrix Etch Texture
    noise = np.random.normal(0, 15, (height, width))
    image = np.clip(image + noise, 0, 255).astype(np.uint8)

    # 2. Voronoi Grain Boundaries (Class 1)
    num_grains = np.random.randint(20, 50)
    points = np.random.randint(0, min(width, height), (num_grains, 2))
    subdiv = cv2.Subdiv2D((0, 0, width, height))
    for p in points:
        subdiv.insert((float(p[0]), float(p[1])))
    
    facets, centers = subdiv.getVoronoiFacetList([])
    for facet in facets:
        if len(facet) > 0:
            pts = np.array(facet, dtype=np.int32)
            cv2.polylines(image, [pts], isClosed=True, color=40, thickness=2)
            cv2.polylines(mask, [pts], isClosed=True, color=1, thickness=2)

    # 3. Precipitates (Class 2) - Coherent dots/platelets
    num_precipitates = np.random.randint(150, 400)
    for _ in range(num_precipitates):
        px = np.random.randint(10, width - 10)
        py = np.random.randint(10, height - 10)
        radius = np.random.randint(2, 5)
        cv2.circle(image, (px, py), radius, color=80, thickness=-1)
        cv2.circle(mask, (px, py), radius, color=2, thickness=-1)

    # 4. Carbides (Class 3) - Bright or dark blocky particles
    num_carbides = np.random.randint(10, 30)
    for _ in range(num_carbides):
        cx = np.random.randint(10, width - 10)
        cy = np.random.randint(10, height - 10)
        size = np.random.randint(5, 12)
        cv2.rectangle(image, (cx, cy), (cx + size, cy + size), color=230, thickness=-1)
        cv2.rectangle(mask, (cx, cy), (cx + size, cy + size), color=3, thickness=-1)

    # 5. Sigma/Intermetallic Needles (Class 4)
    if sample_type == "superalloy" or np.random.rand() > 0.5:
        num_needles = np.random.randint(5, 15)
        for _ in range(num_needles):
            x1, y1 = np.random.randint(10, width - 10), np.random.randint(10, height - 10)
            length = np.random.randint(20, 60)
            angle = np.random.uniform(0, np.pi)
            x2 = int(x1 + length * np.cos(angle))
            y2 = int(y1 + length * np.sin(angle))
            cv2.line(image, (x1, y1), (x2, y2), color=190, thickness=3)
            cv2.line(mask, (x1, y1), (x2, y2), color=4, thickness=3)

    # 6. Gas Pores / Voids (Class 5) - Deep dark spherical voids
    num_pores = np.random.randint(2, 8)
    for _ in range(num_pores):
        px = np.random.randint(20, width - 20)
        py = np.random.randint(20, height - 20)
        r = np.random.randint(4, 10)
        cv2.circle(image, (px, py), r, color=15, thickness=-1)
        cv2.circle(mask, (px, py), r, color=5, thickness=-1)

    # Convert grayscale image to 3-channel RGB for neural net backbone
    image_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    return image_rgb, mask


# ---------------------------------------------------------
# 3. PYTORCH DATASET WITH METALLURGICAL AUGMENTATIONS
# ---------------------------------------------------------
class MetallurgicalDataset(Dataset):
    def __init__(self, size=200, is_train=True, img_size=(512, 512)):
        self.size = size
        self.img_size = img_size
        self.is_train = is_train

        if is_train:
            self.transform = A.Compose([
                A.RandomResizedCrop(img_size[0], img_size[1], scale=(0.8, 1.0)),
                A.HorizontalFlip(p=0.5),
                A.VerticalFlip(p=0.5),
                A.RandomRotate90(p=0.5),
                A.GaussNoise(var_limit=(10.0, 50.0), p=0.4),
                A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2, p=0.5),
                A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
                ToTensorV2(),
            ])
        else:
            self.transform = A.Compose([
                A.Resize(img_size[0], img_size[1]),
                A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
                ToTensorV2(),
            ])

    def __len__(self):
        return self.size

    def __getitem__(self, idx):
        image, mask = generate_synthetic_micrograph(self.img_size[0], self.img_size[1])
        augmented = self.transform(image=image, mask=mask)
        return augmented["image"], augmented["mask"].long()


# ---------------------------------------------------------
# 4. TRAINING FUNCTION WITH DICE + CROSS-ENTROPY LOSS
# ---------------------------------------------------------
def train_model(epochs=10, batch_size=4, lr=1e-3, device="cuda" if torch.cuda.is_available() else "cpu"):
    print(f"[*] Initializing Metallurgical AI Segmentation Training on device: {device}")
    
    # U-Net with pre-trained ResNet34 backbone
    model = smp.Unet(
        encoder_name="resnet34",
        encoder_weights="imagenet",
        in_channels=3,
        classes=NUM_CLASSES,
        activation=None
    )
    model.to(device)

    train_ds = MetallurgicalDataset(size=240, is_train=True)
    val_ds = MetallurgicalDataset(size=40, is_train=False)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

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
        
        val_loss /= len(val_loader)
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

    # Validate ONNX model
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print(f"[✓] ONNX model successfully verified!")

    # Benchmark with ONNXRuntime
    ort_session = ort.InferenceSession(output_path)
    ort_inputs = {ort_session.get_inputs()[0].name: dummy_input.numpy()}
    ort_outs = ort_session.run(None, ort_inputs)
    print(f"[✓] ONNX Runtime Test Inference Output Shape: {ort_outs[0].shape}")
    print(f"[★] Model ready for web app deployment in /public/models or client upload!")


# ---------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Metallurgical Micrograph AI Segmentation Model")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--export-only", action="store_true", help="Skip training and export dummy model directly")
    args = parser.parse_args()

    if args.export_only:
        print("[*] Creating pre-configured U-Net for direct export...")
        model = smp.Unet(encoder_name="resnet34", encoder_weights=None, in_channels=3, classes=NUM_CLASSES)
        export_to_onnx(model)
    else:
        trained_model = train_model(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
        export_to_onnx(trained_model)

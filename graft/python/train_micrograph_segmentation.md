# python/train_micrograph_segmentation.py

- generate_synthetic_micrograph · function · L47-L113 — def generate_synthetic_micrograph(width=512, height=512, sample_type="superalloy")
- MetallurgicalDataset · class · L119-L149 — class MetallurgicalDataset(Dataset)
- __init__ · method · L120-L141 — def __init__(self, size=200, is_train=True, img_size=(512, 512))
- __len__ · method · L143-L144 — def __len__(self)
- __getitem__ · method · L146-L149 — def __getitem__(self, idx)
- train_model · function · L155-L223 — def train_model(epochs=10, batch_size=4, lr=1e-3, device="cuda" if torch.cuda.is_available() else "cpu")
- export_to_onnx · function · L229-L261 — def export_to_onnx(model, output_path="metallix_micrograph_unet.onnx", img_size=(512, 512))

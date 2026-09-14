# python/train_mechanical_property_predictor.py

- compute_metallurgical_features · function · L49-L74 — def compute_metallurgical_features(comp_dict)
- generate_synthetic_alloy_dataset · function · L80-L184 — def generate_synthetic_alloy_dataset(num_samples=1500)
- MetallurgicalPropertyPINN · class · L190-L206 — class MetallurgicalPropertyPINN(nn.Module)
- __init__ · method · L191-L203 — def __init__(self, input_dim=len(FEATURE_NAMES), output_dim=5)
- forward · method · L205-L206 — def forward(self, x)
- train_and_export · function · L212-L302 — def train_and_export(epochs=80, batch_size=32, lr=1e-3)

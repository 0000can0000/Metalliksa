#!/usr/bin/env bash
# Idempotent bootstrap for the MetalliX pocket-model dev environment.
# Installs Node dependencies and the Python scientific stack used by the
# server-side solver daemon (CALPHAD, DFT, EIS/CNLS, XRD, LPBF, kinetics, ...).
set -euo pipefail

cd "$(dirname "$0")/.."

# --- System packages required to create a venv and build native wheels ---
if ! dpkg -s python3-venv >/dev/null 2>&1 || ! command -v gcc >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3-venv python3-dev build-essential
fi

# --- Node dependencies (locked) ---
npm ci

# --- Python virtual environment ---
if [ ! -x ".venv/bin/python" ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --upgrade pip wheel setuptools

# torch/torchvision are only used by the offline training scripts; install the
# CPU-only wheels so the environment stays lean on this GPU-less VM.
.venv/bin/pip install "torch>=2.1.0" "torchvision>=0.16.0" \
  --index-url https://download.pytorch.org/whl/cpu

# Remaining scientific + runtime dependencies.
.venv/bin/pip install -r python/requirements.txt

echo "MetalliX environment bootstrap complete."

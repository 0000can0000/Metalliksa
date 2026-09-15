"""Read-only environment diagnostics. Uses only the standard library itself."""
import argparse
import json
import math
import os
import platform
import shutil
import subprocess
import sys


DEPENDENCIES = {
    "pycalphad": "pycalphad", "xarray": "xarray", "symengine": "symengine",
    "tinydb": "tinydb", "pint": "pint", "numpy": "numpy", "scipy": "scipy",
    "matplotlib": "matplotlib", "scikit-learn": "sklearn", "tqdm": "tqdm",
    "pydantic": "pydantic", "torch": "torch", "torchvision": "torchvision",
    "segmentation-models-pytorch": "segmentation_models_pytorch",
    "albumentations": "albumentations", "opencv-python-headless": "cv2",
    "onnx": "onnx", "onnxruntime": "onnxruntime",
}
MARKER = "ENVIRONMENT_DOCTOR_JSON="


def run_command(command, timeout):
    """No shell, installs, daemon starts, or environment-file reads."""
    try:
        result = subprocess.run(command, capture_output=True, text=True,
                                encoding="utf-8", errors="replace", timeout=timeout,
                                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1",
                                     "NO_ALBUMENTATIONS_UPDATE": "1"})
        return {"status": "ok" if result.returncode == 0 else "error",
                "returncode": result.returncode,
                "stdout": result.stdout[-12000:], "stderr": result.stderr[-2000:]}
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "timeout_seconds": timeout}
    except OSError as exc:
        return {"status": "unavailable", "error": str(exc)}


def python_probe(body, timeout):
    # Imports that print banners or crash stay in a separate, bounded process.
    script = "import json\n" + body + "\nprint(" + repr(MARKER) + " + json.dumps(data))"
    result = run_command([sys.executable, "-B", "-c", script], timeout)
    if result["status"] != "ok":
        return result
    for line in reversed(result["stdout"].splitlines()):
        if line.startswith(MARKER):
            try:
                return {"status": "ok", **json.loads(line[len(MARKER):])}
            except (ValueError, TypeError):
                break
    return {"status": "error", "error": "Probe produced no valid JSON result"}


def dependency_probe(distribution, module, timeout):
    return python_probe(
        "import importlib, importlib.metadata\n"
        f"module = importlib.import_module({module!r})\n"
        "try:\n"
        f"    version = importlib.metadata.version({distribution!r})\n"
        "except importlib.metadata.PackageNotFoundError:\n"
        "    version = getattr(module, '__version__', None)\n"
        "data = {'version': version, 'imported': True}", timeout)


def cuda_probe(timeout, smoke=False):
    body = """import torch
data = {'torch_version': torch.__version__, 'built_cuda': torch.version.cuda,
        'available': torch.cuda.is_available(), 'device_count': torch.cuda.device_count()}
if data['available']:
    data['devices'] = [torch.cuda.get_device_name(i) for i in range(data['device_count'])]
"""
    if smoke:
        body += """if not data['available']:
    data.update(status='unavailable', error='CUDA is not available; no CPU fallback')
else:
    torch.manual_seed(7)
    model = torch.nn.Linear(4, 1).to('cuda')
    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)
    x = torch.randn(16, 4, device='cuda')
    y = x.sum(dim=1, keepdim=True)
    before = model.weight.detach().clone()
    losses = []
    for _ in range(3):
        optimizer.zero_grad()
        loss = torch.nn.functional.mse_loss(model(x), y)
        if not torch.isfinite(loss).item():
            raise RuntimeError('Non-finite GPU loss')
        loss.backward()
        if any(p.grad is None or not torch.isfinite(p.grad).all().item() for p in model.parameters()):
            raise RuntimeError('Invalid GPU gradients')
        optimizer.step()
        losses.append(loss.item())
    torch.cuda.synchronize()
    if torch.equal(before, model.weight.detach()):
        raise RuntimeError('GPU optimizer did not update weights')
    if not all(torch.isfinite(p).all().item() for p in model.parameters()):
        raise RuntimeError('Non-finite GPU weights')
    data.update(device=str(model.weight.device), steps=3, losses=losses, weights_updated=True)
"""
    return python_probe(body, timeout)


def tool_probe(name, args, timeout):
    executable = shutil.which(name)
    if not executable:
        return {"status": "unavailable", "error": "Executable not on PATH"}
    return {"path": executable, **run_command([executable, *args], timeout)}


def collect_report(timeout=20, gpu_smoke=False, paraview_version=False):
    dependencies = {name: dependency_probe(name, module, timeout)
                    for name, module in DEPENDENCIES.items()}
    tools = {name: tool_probe(name, args, timeout) for name, args in {
        "node": ["--version"], "git": ["--version"],
        "nvidia-smi": ["--query-gpu=name,driver_version", "--format=csv,noheader"],
        "docker": ["--version"],
    }.items()}
    # Client presence/version does not establish daemon reachability.
    docker_engine = tool_probe("docker", ["info", "--format", "{{json .ServerVersion}}"], timeout)
    for name in ("paraview", "pvpython"):
        tools[name] = (tool_probe(name, ["--version"], timeout) if paraview_version
                       else {"status": "available" if shutil.which(name) else "unavailable",
                             "path": shutil.which(name), "version_check": "not_requested"})
    cuda = cuda_probe(timeout)
    smoke = cuda_probe(timeout, smoke=True) if gpu_smoke else {"status": "not_requested"}
    gaps = ["dependency:" + name for name, value in dependencies.items() if value["status"] != "ok"]
    gaps += ["tool:" + name for name, value in tools.items() if value["status"] not in ("ok", "available")]
    if docker_engine["status"] != "ok":
        gaps.append("docker_engine")
    if cuda["status"] != "ok" or not cuda.get("available"):
        gaps.append("cuda")
    if gpu_smoke and smoke["status"] != "ok":
        gaps.append("gpu_smoke")
    return {"schema_version": 1,
            "interpreter": {"executable": sys.executable, "version": platform.python_version(),
                            "prefix": sys.prefix, "base_prefix": sys.base_prefix,
                            "platform": platform.platform()},
            "dependencies": dependencies, "tools": tools, "docker_engine": docker_engine,
            "cuda": cuda, "gpu_smoke": smoke, "gaps": gaps,
            "scope": "Current interpreter and PATH; presence/import checks, not requirements constraint validation"}


def positive_timeout(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("timeout must be a finite positive number")
    return number


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=positive_timeout, default=20,
                        help="Seconds per subprocess (default: 20)")
    parser.add_argument("--gpu-smoke", action="store_true", help="Run three real CUDA training steps")
    parser.add_argument("--paraview-version", action="store_true", help="Run ParaView/pvpython --version")
    parser.add_argument("--strict", action="store_true", help="Exit 1 if any reported capability has a gap")
    args = parser.parse_args(argv)
    report = collect_report(args.timeout, args.gpu_smoke, args.paraview_version)
    print(json.dumps(report, indent=2, ensure_ascii=True))
    return int(args.strict and bool(report["gaps"]))


if __name__ == "__main__":
    sys.exit(main())

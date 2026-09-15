"""Read-only check of installed versions against the repository's simple requirements file.

Requires packaging (included in the full scientific lock). This does not resolve or
install dependencies; pip directives, extras and direct URLs are deliberately rejected.
"""
import argparse
import importlib.metadata
import json
from pathlib import Path

from packaging.requirements import InvalidRequirement, Requirement
from packaging.version import InvalidVersion, Version


def check_ranges(text, version_of=importlib.metadata.version):
    results = []
    for number, raw in enumerate(text.splitlines(), 1):
        line = raw.split(" #", 1)[0].strip()
        if not line or line.startswith("#"):
            continue
        try:
            requirement = Requirement(line)
        except InvalidRequirement as error:
            raise ValueError(f"Unsupported requirement at line {number}: {line}") from error
        if requirement.url or requirement.extras:
            raise ValueError(f"URLs and extras are not supported at line {number}")
        entry = {"name": requirement.name, "constraint": str(requirement.specifier), "line": number}
        if requirement.marker and not requirement.marker.evaluate():
            results.append({**entry, "status": "skipped", "reason": "Environment marker does not apply"})
            continue
        try:
            version = version_of(requirement.name)
            compatible = requirement.specifier.contains(Version(version))
        except importlib.metadata.PackageNotFoundError:
            results.append({**entry, "status": "missing", "installed": None})
            continue
        except InvalidVersion as error:
            raise ValueError(f"Invalid installed version for {requirement.name}") from error
        results.append({**entry, "installed": version, "status": "ok" if compatible else "incompatible"})
    if not results:
        raise ValueError("No requirements found")
    return results


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", type=Path, default=Path(__file__).with_name("requirements.txt"))
    args = parser.parse_args(argv)
    try:
        results = check_ranges(args.path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as error:
        print(json.dumps({"status": "error", "error": str(error)}))
        return 2
    ok = all(item["status"] in ("ok", "skipped") for item in results)
    print(json.dumps({"status": "ok" if ok else "incompatible", "requirements": results}, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

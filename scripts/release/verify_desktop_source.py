#!/usr/bin/env python3
"""Fail closed if the desktop source versions disagree or do not match a release tag.

Checks source metadata only. It does NOT attest to the provenance or content of
uploaded release binaries or the version of a bundled Feelcoin daemon.
"""
import argparse
import json
import re
import sys
import tomllib
from pathlib import Path


def read_versions(root: Path) -> dict[str, str]:
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    tauri = json.loads((root / "src-tauri/tauri.conf.json").read_text(encoding="utf-8"))
    cargo = tomllib.loads((root / "src-tauri/Cargo.toml").read_text(encoding="utf-8"))
    return {
        "package.json": str(package["version"]),
        "src-tauri/tauri.conf.json": str(tauri["version"]),
        "src-tauri/Cargo.toml": str(cargo["package"]["version"]),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", default="", help="release Git tag, e.g. v1.0.1")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    versions = read_versions(root)
    print("Desktop source version audit:")
    for path, version in versions.items():
        print(f"  {path}: {version}")

    unique = set(versions.values())
    if len(unique) != 1:
        print("ERROR: source versions do not match each other", file=sys.stderr)
        return 1

    actual = next(iter(unique))
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.+-]+)?", actual):
        print(f"ERROR: invalid version format: {actual}", file=sys.stderr)
        return 1

    if args.tag:
        expected = args.tag[1:] if args.tag.startswith("v") else args.tag
        if actual != expected:
            print(
                f"ERROR: tag {args.tag!r} does not match source version {actual!r}",
                file=sys.stderr,
            )
            return 1

    print("PASS: source versions are consistent" + (" and match the tag" if args.tag else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

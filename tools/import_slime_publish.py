#!/usr/bin/env python3
"""Verify and import the exact Slime build received on 2026-09-14.

This imports a built static site, not source code. No code from the ZIP is run.
The repository's existing source, public assets and workflow notes are untouched.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import tempfile
import zipfile

EXPECTED_SHA256 = "a1f30902980df7d9a481f6ecb9b59419633f161826f43f8cf89033adcfba8a87"
EXPECTED_FILES = 1278
EXPECTED_BYTES = 179497754
DESTINATION = Path("published/2026-09-14")


def validate_entries(archive: zipfile.ZipFile) -> list[zipfile.ZipInfo]:
    entries = [entry for entry in archive.infolist() if not entry.is_dir()]
    if len(entries) != EXPECTED_FILES or sum(e.file_size for e in entries) != EXPECTED_BYTES:
        raise ValueError("Archive file count or uncompressed size differs from the supplied build")
    seen: set[str] = set()
    for entry in entries:
        name = entry.filename
        path = PurePosixPath(name)
        mode = entry.external_attr >> 16
        if (path.is_absolute() or "\\" in name or ".." in path.parts
                or name != str(path) or name in seen or stat.S_ISLNK(mode)):
            raise ValueError(f"Unsafe or duplicate archive path: {name!r}")
        if path.parts[0] not in {"assets", "review", "index.html", "slime-motion.html"}:
            raise ValueError(f"Unexpected top-level path: {name!r}")
        if entry.flag_bits & 1:
            raise ValueError("Encrypted entries are not supported")
        seen.add(name)
    if not {"index.html", "slime-motion.html"}.issubset(seen):
        raise ValueError("Required HTML entry points are missing")
    return entries


def import_build(zip_path: Path, repository_root: Path) -> dict:
    with zip_path.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError(f"Wrong ZIP: expected SHA-256 {EXPECTED_SHA256}, got {digest}")
    root = repository_root.resolve(strict=True)
    destination = root / DESTINATION
    if (root / "published").is_symlink() or destination.exists() or destination.is_symlink():
        raise FileExistsError(f"Refusing to replace an existing destination: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Stage on the same filesystem. Publish the directory only after all files verify.
    with tempfile.TemporaryDirectory(prefix=".slime-import-", dir=destination.parent) as temp:
        stage = Path(temp) / "site"
        stage.mkdir()
        with zipfile.ZipFile(zip_path) as archive:
            entries = validate_entries(archive)
            for entry in entries:
                target = stage / entry.filename
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(entry) as source, target.open("xb") as output:
                    shutil.copyfileobj(source, output)
                if target.stat().st_size != entry.file_size:
                    raise ValueError(f"Extracted size mismatch: {entry.filename}")
            for entry in entries:
                with archive.open(entry) as source, (stage / entry.filename).open("rb") as target:
                    if hashlib.file_digest(source, "sha256").digest() != hashlib.file_digest(target, "sha256").digest():
                        raise ValueError(f"Extracted checksum mismatch: {entry.filename}")
        stage.rename(destination)
    return {"archive": zip_path.name, "sha256": digest, "files": EXPECTED_FILES,
            "uncompressed_bytes": EXPECTED_BYTES, "destination": str(DESTINATION),
            "source_code_replaced": False, "hosting_deployed": False}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--repository-root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    print(json.dumps(import_build(args.archive, args.repository_root), indent=2))


if __name__ == "__main__":
    main()

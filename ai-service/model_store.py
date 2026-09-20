"""Small, dependency-free model artifact store used by the local AI service."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


def model_dir() -> Path:
    return Path(os.getenv("AI_MODEL_DIR", "model_store"))


def load_artifact(name: str) -> dict[str, Any] | None:
    path = model_dir() / f"{name}.json"
    try:
        with path.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
        return value if isinstance(value, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def save_artifact(name: str, value: dict[str, Any], directory: str | None = None) -> Path:
    target_dir = Path(directory) if directory else model_dir()
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f"{name}.json"
    temporary = path.with_suffix(".json.tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
    temporary.replace(path)
    return path

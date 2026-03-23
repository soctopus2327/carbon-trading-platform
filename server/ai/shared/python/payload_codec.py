from __future__ import annotations

import base64
import json
import sys


def configure_utf8_stdio() -> None:
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def parse_base64_json_object(encoded: str) -> dict | None:
    if not encoded:
        return None

    try:
        decoded = base64.b64decode(encoded).decode("utf-8")
        parsed = json.loads(decoded)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        return None

from __future__ import annotations

import json
import re
from typing import Any


def extract_json_object(text: str) -> dict[str, Any] | None:
    trimmed = (text or "").strip()
    if not trimmed:
        return None

    try:
        parsed = json.loads(trimmed)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        pass

    fenced = re.search(r"```json\s*([\s\S]*?)\s*```", trimmed, flags=re.IGNORECASE)
    if fenced:
        try:
            parsed = json.loads(fenced.group(1).strip())
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            pass

    first = trimmed.find("{")
    last = trimmed.rfind("}")
    if first >= 0 and last > first:
        candidate = trimmed[first : last + 1]
        try:
            parsed = json.loads(candidate)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    return None


def normalize_payload(parsed: dict[str, Any] | None, raw_answer: str) -> dict[str, Any]:
    safe = parsed or {}

    findings = safe.get("findings") if isinstance(safe.get("findings"), list) else []
    recommendations = (
        safe.get("recommendations") if isinstance(safe.get("recommendations"), list) else []
    )
    limitations = safe.get("limitations") if isinstance(safe.get("limitations"), list) else []

    return {
        "summary": str(safe.get("summary") or "Insufficient evidence to generate a full summary."),
        "riskLevel": str(safe.get("riskLevel") or "MEDIUM").upper(),
        "findings": findings,
        "recommendations": recommendations,
        "limitations": limitations,
        "reportText": str(raw_answer or ""),
    }

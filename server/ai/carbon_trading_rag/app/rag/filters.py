from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class QueryProfile:
    query: str
    intents: list[str]
    preferred_source_types: list[str]
    latest_sensitive: bool
    dynamic_top_k: int
    pinecone_filter: dict | None


def _contains_any(text: str, keywords: list[str]) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def decide_dynamic_top_k(query: str, minimum: int, maximum: int) -> int:
    words = re.findall(r"\w+", query)
    complexity = 0

    if len(words) > 10:
        complexity += 1
    if len(words) > 22:
        complexity += 1
    if _contains_any(query, ["compare", "difference", "tradeoff", "strategy", "framework", "policy", "evidence", "step-by-step", "recommend"]):
        complexity += 1
    if query.count("?") > 1 or _contains_any(query, [" and ", " or ", " versus ", " vs "]):
        complexity += 1

    return max(minimum, min(maximum, minimum + complexity))


def build_query_profile(query: str, top_k_min: int, top_k_max: int) -> QueryProfile:
    lowered = query.lower()
    intents: list[str] = []
    preferred_source_types: list[str] = []
    latest_sensitive = _contains_any(lowered, ["latest", "recent", "current", "today", "newest", "2025", "2026"])

    if _contains_any(lowered, ["credit", "offset", "registry", "verra", "gold standard", "vcmi", "icvcm", "corsia", "article 6"]):
        intents.append("credit_strategy")
        preferred_source_types.extend(["government", "standard", "guideline", "NGO"])

    if _contains_any(lowered, ["emission factor", "calculate", "calculator", "egrid", "fuel", "electricity", "scope 1", "scope 2", "scope 3"]):
        intents.append("accounting")
        preferred_source_types.extend(["government", "dataset", "calculator", "guideline"])

    if _contains_any(lowered, ["reduce emissions", "mitigation", "efficiency", "electrification", "decarbonize", "supply chain", "abatement"]):
        intents.append("mitigation")
        preferred_source_types.extend(["journal", "government", "guideline", "NGO"])

    if not intents:
        intents = ["general_advisory"]
        preferred_source_types = ["government", "guideline", "journal", "NGO", "standard"]

    deduped_source_types = list(dict.fromkeys(preferred_source_types))
    dynamic_top_k = decide_dynamic_top_k(query, top_k_min, top_k_max)

    pinecone_filter = {"reliability_rating": {"$in": ["A", "B", "a", "b"]}}

    return QueryProfile(
        query=query,
        intents=intents,
        preferred_source_types=deduped_source_types,
        latest_sensitive=latest_sensitive,
        dynamic_top_k=dynamic_top_k,
        pinecone_filter=pinecone_filter,
    )


def metadata_boost(metadata: dict, profile: QueryProfile) -> float:
    boost = 0.0
    source_type = str(metadata.get("source_type", "")).strip()
    rating = str(metadata.get("reliability_rating", "")).upper().strip()

    if source_type in profile.preferred_source_types:
        boost += 0.05

    if rating == "A":
        boost += 0.03
    elif rating == "B":
        boost += 0.015

    publication_date = str(metadata.get("publication_date", "")).strip()
    if profile.latest_sensitive and publication_date:
        if publication_date.startswith("2026"):
            boost += 0.03
        elif publication_date.startswith("2025"):
            boost += 0.02
        elif publication_date.startswith("2024"):
            boost += 0.01

    return boost
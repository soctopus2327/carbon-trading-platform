from __future__ import annotations

import re


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\b[a-z0-9]{2,}\b", (text or "").lower())


def score_chunk(question: str, chunk_text: str, chunk_position: int = 0) -> float:
    q_tokens = _tokenize(question)
    c_tokens = _tokenize(chunk_text)
    if not c_tokens:
        return 0.0

    q_set = set(q_tokens)
    c_set = set(c_tokens)
    overlap = len(q_set.intersection(c_set))
    coverage = overlap / max(1, len(q_set))
    density = overlap / max(1, len(c_set))

    # Small position bias favors earlier sections in structured reports.
    position_bonus = max(0.0, 0.08 - (chunk_position * 0.002))
    return (coverage * 0.8) + (density * 0.15) + position_bonus


def select_relevant_chunks(
    question: str,
    chunks: list[dict],
    max_chunks: int = 8,
    max_context_chars: int = 12000,
) -> list[dict]:
    scored: list[dict] = []
    for index, chunk in enumerate(chunks):
        text = str(chunk.get("text") or "").strip()
        if not text:
            continue
        score = score_chunk(question, text, chunk_position=index)
        scored.append({**chunk, "score": score})

    scored.sort(key=lambda item: item["score"], reverse=True)

    selected: list[dict] = []
    current_chars = 0
    for item in scored:
        text_len = len(item["text"])
        if selected and current_chars + text_len > max_context_chars:
            continue
        selected.append(item)
        current_chars += text_len
        if len(selected) >= max_chunks:
            break

    # Keep deterministic order by original chunk number for readability in prompt.
    selected.sort(key=lambda item: int(item.get("chunk_number", 0)))
    return selected

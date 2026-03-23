from __future__ import annotations

from dataclasses import dataclass

from app.config import Settings


@dataclass
class TextChunk:
    chunk_id: str
    text: str
    chunk_number: int


def _split_long_paragraph(paragraph: str, chunk_size: int, overlap: int) -> list[str]:
    pieces: list[str] = []
    start = 0
    paragraph = paragraph.strip()
    if not paragraph:
        return pieces

    while start < len(paragraph):
        end = min(start + chunk_size, len(paragraph))
        pieces.append(paragraph[start:end])
        if end >= len(paragraph):
            break
        start = max(0, end - overlap)
    return pieces


def chunk_text(text: str, source_id: str, settings: Settings) -> list[TextChunk]:
    text = text.strip()
    if not text:
        return []

    paragraphs = [block.strip() for block in text.split("\n\n") if block.strip()]
    assembled: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) > settings.chunk_size:
            if current:
                assembled.append(current.strip())
                current = ""
            assembled.extend(_split_long_paragraph(paragraph, settings.chunk_size, settings.chunk_overlap))
            continue

        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= settings.chunk_size:
            current = candidate
        else:
            assembled.append(current.strip())
            current = paragraph

    if current:
        assembled.append(current.strip())

    chunks = [
        TextChunk(
            chunk_id=f"{source_id}::chunk::{index + 1}",
            text=chunk_text_value,
            chunk_number=index + 1,
        )
        for index, chunk_text_value in enumerate(assembled)
    ]
    return chunks
from __future__ import annotations

import math
from pathlib import Path

from app.config import Settings
from app.ingest.chunker import chunk_text
from app.ingest.extractors import extract_local_pdf
from app.rag.retriever import RetrievedChunk


def cosine_similarity(a: list[float], b: list[float]) -> float:
    numerator = sum(x * y for x, y in zip(a, b))
    denom_a = math.sqrt(sum(x * x for x in a))
    denom_b = math.sqrt(sum(y * y for y in b))
    if denom_a == 0 or denom_b == 0:
        return 0.0
    return numerator / (denom_a * denom_b)


def retrieve_from_temp_pdf(
    pdf_path: str,
    query_vector: list[float],
    embedder,
    settings: Settings,
    top_k: int,
) -> list[RetrievedChunk]:
    extracted = extract_local_pdf(pdf_path)
    chunks = chunk_text(extracted.text, source_id="TEMP-PDF", settings=settings)
    if not chunks:
        return []

    embeddings = embedder.embed_texts([chunk.text for chunk in chunks])

    results: list[RetrievedChunk] = []
    for chunk, vector in zip(chunks, embeddings):
        score = cosine_similarity(query_vector, vector)
        results.append(
            RetrievedChunk(
                chunk_id=chunk.chunk_id,
                score=score,
                adjusted_score=score + 0.02,
                metadata={
                    "title": extracted.title,
                    "source_type": "temporary_pdf",
                    "publication_date": "",
                    "source_url": str(Path(pdf_path).resolve()),
                    "chunk_text": chunk.text,
                    "chunk_number": chunk.chunk_number,
                },
            )
        )

    results.sort(key=lambda item: item.adjusted_score, reverse=True)
    return results[:top_k]
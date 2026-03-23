from __future__ import annotations

from app.rag.retriever import RetrievedChunk


def format_sources(retrieved_chunks: list[RetrievedChunk]) -> str:
    lines = ["\nSources used"]
    for index, chunk in enumerate(retrieved_chunks, start=1):
        metadata = chunk.metadata
        title = metadata.get("title", "Untitled")
        source_url = metadata.get("source_url", "")
        source_type = metadata.get("source_type", "unknown")
        publication_date = metadata.get("publication_date", "")

        line = f"{index}. {title}"
        if source_type or publication_date:
            details = " | ".join([part for part in [source_type, publication_date] if part])
            line += f" ({details})"
        lines.append(line)
        lines.append(f"   {source_url}")
    return "\n".join(lines)
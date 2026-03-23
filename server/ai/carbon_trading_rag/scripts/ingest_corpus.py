from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import load_settings
from app.ingest.chunker import chunk_text
from app.ingest.corpus_loader import SourceRecord, load_corpus_records
from app.ingest.embedder import OpenAIEmbedder
from app.ingest.extractors import extract_from_url
from app.ingest.pinecone_store import ensure_index, upsert_records


def build_chunk_metadata(
    record: SourceRecord,
    title: str,
    final_url: str,
    content_type: str,
    chunk_number: int,
    chunk_text_value: str,
) -> dict:
    metadata = {
        "source_id": record.source_id,
        "title": title or record.title or final_url,
        "source_url": final_url,
        "original_url": record.url,
        "source_type": record.source_type,
        "region": record.region,
        "publication_date": record.publication_date,
        "reliability_rating": record.reliability_rating,
        "tags": record.tags,
        "content_type": content_type,
        "chunk_number": chunk_number,
        "chunk_text": chunk_text_value,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }
    metadata.update(
        {
            key: value
            for key, value in record.extra_metadata.items()
            if value is not None and key not in metadata
        }
    )
    return metadata


def main() -> None:
    settings = load_settings()
    ensure_index(settings)

    records = load_corpus_records(settings)
    embedder = OpenAIEmbedder(settings)

    total_chunks = 0
    failures: list[tuple[str, str]] = []
    bm25_records: list[dict] = []

    for record in tqdm(records, desc="Ingesting sources"):
        try:
            extracted = extract_from_url(record.url, settings=settings, use_playwright_fallback=True)
            if len(extracted.text.strip()) < 250:
                failures.append((record.url, "Extracted text too short"))
                continue

            chunks = chunk_text(extracted.text, source_id=record.source_id, settings=settings)
            if not chunks:
                failures.append((record.url, "No chunks produced"))
                continue

            vectors = embedder.embed_texts([chunk.text for chunk in chunks])
            upsert_payload = []
            for chunk, vector in zip(chunks, vectors):
                metadata = build_chunk_metadata(
                    record=record,
                    title=extracted.title or record.title,
                    final_url=extracted.final_url,
                    content_type=extracted.content_type,
                    chunk_number=chunk.chunk_number,
                    chunk_text_value=chunk.text,
                )
                upsert_payload.append(
                    {
                        "id": chunk.chunk_id,
                        "values": vector,
                        "metadata": metadata,
                    }
                )
                bm25_records.append(
                    {
                        "chunk_id": chunk.chunk_id,
                        "text": chunk.text,
                        "metadata": metadata,
                    }
                )

            upsert_records(settings=settings, records=upsert_payload, batch_size=40)
            total_chunks += len(upsert_payload)

        except Exception as exc:
            failures.append((record.url, str(exc)))

    bm25_path = settings.project_root / "corpus" / "bm25_chunks.json"
    with bm25_path.open("w", encoding="utf-8") as f:
        json.dump(bm25_records, f, ensure_ascii=False, indent=2)

    print(f"\nDone. Total chunks upserted: {total_chunks}")
    print(f"Local BM25 corpus written to: {bm25_path}")

    if failures:
        print("\nFailures")
        for url, reason in failures:
            print(f"- {url} :: {reason}")


if __name__ == "__main__":
    main()
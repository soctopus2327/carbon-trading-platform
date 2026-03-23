from __future__ import annotations

import time
from typing import Any

from pinecone import Pinecone, ServerlessSpec

from app.config import Settings


def get_pinecone_client(settings: Settings) -> Pinecone:
    return Pinecone(api_key=settings.pinecone_api_key)


def ensure_index(settings: Settings) -> None:
    pc = get_pinecone_client(settings)
    if pc.has_index(settings.pinecone_index_name):
        return

    pc.create_index(
        name=settings.pinecone_index_name,
        vector_type="dense",
        dimension=settings.embedding_dimensions,
        metric="cosine",
        spec=ServerlessSpec(cloud=settings.pinecone_cloud, region=settings.pinecone_region),
        deletion_protection="disabled",
        tags={"project": "carbon_trading_rag"},
    )

    for _ in range(60):
        try:
            index = pc.Index(settings.pinecone_index_name)
            index.describe_index_stats()
            return
        except Exception:
            time.sleep(2)

    raise TimeoutError("Pinecone index creation timed out while waiting for readiness.")


def get_index(settings: Settings):
    pc = get_pinecone_client(settings)
    return pc.Index(settings.pinecone_index_name)


def upsert_records(settings: Settings, records: list[dict[str, Any]], batch_size: int = 50) -> None:
    index = get_index(settings)
    namespace = settings.pinecone_namespace

    for start in range(0, len(records), batch_size):
        batch = records[start : start + batch_size]
        index.upsert(vectors=batch, namespace=namespace)


def query_index(
    settings: Settings,
    query_vector: list[float],
    top_k: int,
    metadata_filter: dict[str, Any] | None = None,
):
    index = get_index(settings)
    namespace = settings.pinecone_namespace
    return index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace,
        filter=metadata_filter or None,
    )
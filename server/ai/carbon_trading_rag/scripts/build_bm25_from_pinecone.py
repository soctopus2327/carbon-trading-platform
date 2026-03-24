from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import load_settings
from app.ingest.pinecone_store import get_index


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build local bm25_chunks.json from existing Pinecone metadata without re-embedding."
    )
    parser.add_argument(
        "--namespace",
        type=str,
        default="",
        help="Optional Pinecone namespace override (defaults to PINECONE_NAMESPACE from .env).",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="",
        help="Optional output path (defaults to corpus/bm25_chunks.json).",
    )
    parser.add_argument(
        "--fetch-batch-size",
        type=int,
        default=200,
        help="How many vector IDs to fetch per API call.",
    )
    parser.add_argument(
        "--max-vectors",
        type=int,
        default=0,
        help="Optional cap for debugging (0 means no cap).",
    )
    return parser.parse_args()


def _extract_next_token(payload: Any) -> str | None:
    if payload is None:
        return None

    if isinstance(payload, dict):
        for key in ("pagination_token", "next_page_token", "next", "token"):
            value = payload.get(key)
            if isinstance(value, str) and value:
                return value

        pagination = payload.get("pagination")
        if isinstance(pagination, dict):
            for key in ("next", "next_page_token", "pagination_token"):
                value = pagination.get(key)
                if isinstance(value, str) and value:
                    return value

    for attr in ("pagination_token", "next_page_token", "next", "token"):
        value = getattr(payload, attr, None)
        if isinstance(value, str) and value:
            return value

    pagination_obj = getattr(payload, "pagination", None)
    if pagination_obj is not None:
        for attr in ("next", "next_page_token", "pagination_token"):
            value = getattr(pagination_obj, attr, None)
            if isinstance(value, str) and value:
                return value

    return None


def _extract_ids(payload: Any) -> list[str]:
    if payload is None:
        return []

    if isinstance(payload, str):
        return [payload]

    if isinstance(payload, (list, tuple, set)):
        ids: list[str] = []
        for item in payload:
            if isinstance(item, str):
                ids.append(item)
            elif isinstance(item, dict):
                item_id = item.get("id")
                if isinstance(item_id, str):
                    ids.append(item_id)
            else:
                item_id = getattr(item, "id", None)
                if isinstance(item_id, str):
                    ids.append(item_id)
        return ids

    if isinstance(payload, dict):
        vectors_obj = payload.get("vectors")
        if isinstance(vectors_obj, dict):
            return [str(k) for k in vectors_obj.keys()]
        if isinstance(vectors_obj, (list, tuple, set)):
            return _extract_ids(vectors_obj)

        ids_obj = payload.get("ids")
        if isinstance(ids_obj, (list, tuple, set)):
            return [str(x) for x in ids_obj]

    vectors_attr = getattr(payload, "vectors", None)
    if isinstance(vectors_attr, dict):
        return [str(k) for k in vectors_attr.keys()]
    if isinstance(vectors_attr, (list, tuple, set)):
        return _extract_ids(vectors_attr)

    ids_attr = getattr(payload, "ids", None)
    if isinstance(ids_attr, (list, tuple, set)):
        return [str(x) for x in ids_attr]

    return []


def _iter_ids_from_list(index: Any, namespace: str) -> Iterable[str]:
    list_method = getattr(index, "list", None)
    if list_method is None:
        return []

    calls = [
        {"namespace": namespace},
        {},
    ]

    for kwargs in calls:
        try:
            listing = list_method(**kwargs)
            break
        except TypeError:
            listing = None
            continue
    else:
        return []

    seen: set[str] = set()

    # Some SDK versions return a generator of pages/ID lists.
    if hasattr(listing, "__iter__") and not isinstance(listing, (dict, str, bytes)):
        for page in listing:
            page_ids = _extract_ids(page)
            for vector_id in page_ids:
                if vector_id not in seen:
                    seen.add(vector_id)
                    yield vector_id
        return

    # Other versions may return a single page-like object.
    page_ids = _extract_ids(listing)
    for vector_id in page_ids:
        if vector_id not in seen:
            seen.add(vector_id)
            yield vector_id


def _iter_ids_from_list_paginated(index: Any, namespace: str, page_size: int = 100) -> Iterable[str]:
    list_paginated = getattr(index, "list_paginated", None)
    if list_paginated is None:
        return []

    seen: set[str] = set()
    seen_tokens: set[str] = set()
    token: str | None = None

    while True:
        response = None
        call_variants = [
            {"namespace": namespace, "limit": page_size, "pagination_token": token},
            {"namespace": namespace, "limit": page_size, "page_token": token},
            {"namespace": namespace, "pagination_token": token},
            {"namespace": namespace},
        ]

        for kwargs in call_variants:
            try:
                response = list_paginated(**kwargs)
                break
            except TypeError:
                continue

        if response is None:
            break

        page_ids = _extract_ids(response)
        for vector_id in page_ids:
            if vector_id not in seen:
                seen.add(vector_id)
                yield vector_id

        next_token = _extract_next_token(response)
        if not next_token or next_token in seen_tokens:
            break

        seen_tokens.add(next_token)
        token = next_token


def _chunked(values: list[str], size: int) -> Iterable[list[str]]:
    for start in range(0, len(values), size):
        yield values[start : start + size]


def _extract_vectors_dict(fetch_result: Any) -> dict[str, Any]:
    if isinstance(fetch_result, dict):
        vectors = fetch_result.get("vectors")
        if isinstance(vectors, dict):
            return vectors
        return {}

    vectors_attr = getattr(fetch_result, "vectors", None)
    if isinstance(vectors_attr, dict):
        return vectors_attr

    return {}


def _to_metadata_and_text(vector_obj: Any) -> tuple[dict, str]:
    if isinstance(vector_obj, dict):
        metadata = dict(vector_obj.get("metadata") or {})
    else:
        metadata = dict(getattr(vector_obj, "metadata", {}) or {})

    chunk_text = metadata.get("chunk_text")
    if not isinstance(chunk_text, str):
        chunk_text = ""

    return metadata, chunk_text


def main() -> None:
    args = parse_args()
    settings = load_settings()
    index = get_index(settings)

    namespace = (args.namespace or settings.pinecone_namespace).strip()
    if not namespace:
        raise ValueError("Namespace is empty. Set PINECONE_NAMESPACE or pass --namespace.")

    output_path = Path(args.output).expanduser() if args.output else settings.project_root / "corpus" / "bm25_chunks.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    all_ids: list[str] = []

    ids_from_list = list(_iter_ids_from_list(index, namespace))
    if ids_from_list:
        all_ids = ids_from_list
    else:
        ids_from_paginated = list(_iter_ids_from_list_paginated(index, namespace, page_size=500))
        all_ids = ids_from_paginated

    if args.max_vectors and args.max_vectors > 0:
        all_ids = all_ids[: args.max_vectors]

    if not all_ids:
        with output_path.open("w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        print(f"No vectors found in namespace '{namespace}'. Wrote empty file: {output_path}")
        return

    fetch_batch_size = max(1, int(args.fetch_batch_size or 200))
    records: list[dict] = []
    skipped_without_text = 0

    for batch_ids in _chunked(all_ids, fetch_batch_size):
        fetch_result = index.fetch(ids=batch_ids, namespace=namespace)
        vectors = _extract_vectors_dict(fetch_result)

        for vector_id in batch_ids:
            vector_obj = vectors.get(vector_id)
            if not vector_obj:
                continue

            metadata, chunk_text = _to_metadata_and_text(vector_obj)
            if not chunk_text.strip():
                skipped_without_text += 1
                continue

            records.append(
                {
                    "chunk_id": str(vector_id),
                    "text": chunk_text,
                    "metadata": metadata,
                }
            )

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Namespace: {namespace}")
    print(f"Vector IDs discovered: {len(all_ids)}")
    print(f"BM25 records written: {len(records)}")
    print(f"Skipped (missing chunk_text): {skipped_without_text}")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()

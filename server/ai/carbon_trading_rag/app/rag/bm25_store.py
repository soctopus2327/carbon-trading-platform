from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from rank_bm25 import BM25Okapi


def simple_tokenize(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text.lower())


@dataclass
class BM25Hit:
    chunk_id: str
    score: float
    metadata: dict


class LocalBM25Store:
    def __init__(self, json_path: str | Path) -> None:
        self.json_path = Path(json_path)
        if not self.json_path.exists():
            raise FileNotFoundError(
                f"BM25 corpus file not found: {self.json_path}. "
                f"Run ingestion first so the local BM25 corpus gets created."
            )

        with self.json_path.open("r", encoding="utf-8") as f:
            self.records: list[dict] = json.load(f)

        self.tokenized_corpus = [
            simple_tokenize(record.get("text", ""))
            for record in self.records
        ]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

    def search(self, query: str, top_k: int = 5) -> list[BM25Hit]:
        query_tokens = simple_tokenize(query)
        if not query_tokens:
            return []

        scores = self.bm25.get_scores(query_tokens)
        ranked_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True,
        )[:top_k]

        hits: list[BM25Hit] = []
        for idx in ranked_indices:
            record = self.records[idx]
            score = float(scores[idx])
            if score <= 0:
                continue

            metadata = dict(record.get("metadata", {}))
            metadata.setdefault("chunk_text", record.get("text", ""))
            hits.append(
                BM25Hit(
                    chunk_id=record["chunk_id"],
                    score=score,
                    metadata=metadata,
                )
            )
        return hits
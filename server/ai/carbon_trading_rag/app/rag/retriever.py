from __future__ import annotations

from dataclasses import dataclass
import time

from app.config import Settings
from app.ingest.embedder import OpenAIEmbedder
from app.ingest.pinecone_store import query_index
from app.rag.bm25_store import LocalBM25Store
from app.rag.filters import QueryProfile, build_query_profile, metadata_boost


@dataclass
class RetrievedChunk:
    chunk_id: str
    score: float
    adjusted_score: float
    metadata: dict


class HybridRetriever:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.embedder = OpenAIEmbedder(settings)

        bm25_path = self.settings.project_root / "corpus" / "bm25_chunks.json"
        self.bm25_store = None
        if bm25_path.exists():
            self.bm25_store = LocalBM25Store(bm25_path)

    def retrieve(
        self,
        query: str,
        pdf_path: str | None = None,
        telemetry: dict | None = None,
    ) -> tuple[list[RetrievedChunk], QueryProfile]:
        total_start = time.perf_counter()

        profile_start = time.perf_counter()
        profile = build_query_profile(
            query=query,
            top_k_min=self.settings.top_k_min,
            top_k_max=self.settings.top_k_max,
        )
        profile_ms = (time.perf_counter() - profile_start) * 1000

        embed_start = time.perf_counter()
        query_vector = self.embedder.embed_query(query)
        embed_query_ms = (time.perf_counter() - embed_start) * 1000

        candidate_k = min(24, max(8, profile.dynamic_top_k * self.settings.retrieval_candidate_multiplier))

        pinecone_start = time.perf_counter()
        pinecone_response = query_index(
            settings=self.settings,
            query_vector=query_vector,
            top_k=candidate_k,
            metadata_filter=profile.pinecone_filter,
        )
        pinecone_query_ms = (time.perf_counter() - pinecone_start) * 1000

        results: list[RetrievedChunk] = []
        pinecone_unpack_start = time.perf_counter()
        for match in pinecone_response.matches:
            metadata = dict(match.metadata or {})
            raw_score = float(match.score)
            adjusted_score = raw_score + metadata_boost(metadata, profile)
            results.append(
                RetrievedChunk(
                    chunk_id=str(match.id),
                    score=raw_score,
                    adjusted_score=adjusted_score,
                    metadata=metadata,
                )
            )
        pinecone_unpack_ms = (time.perf_counter() - pinecone_unpack_start) * 1000

        # -------- BM25 retrieval (new local lexical path) --------
        bm25_ms = 0.0
        if self.bm25_store is not None:
            bm25_start = time.perf_counter()
            bm25_hits = self.bm25_store.search(query, top_k=max(5, profile.dynamic_top_k))
            for hit in bm25_hits:
                metadata = dict(hit.metadata or {})
                # BM25 scores are on a different scale than cosine similarity,
                # so we compress them to a small bonus-like range.
                normalized_score = min(hit.score / 10.0, 1.0)
                adjusted_score = normalized_score + metadata_boost(metadata, profile) + 0.02

                results.append(
                    RetrievedChunk(
                        chunk_id=hit.chunk_id,
                        score=hit.score,
                        adjusted_score=adjusted_score,
                        metadata=metadata,
                    )
                )
            bm25_ms = (time.perf_counter() - bm25_start) * 1000


        temp_pdf_ms = 0.0
        if pdf_path:
            from app.rag.temp_pdf import retrieve_from_temp_pdf

            temp_pdf_start = time.perf_counter()
            temp_pdf_results = retrieve_from_temp_pdf(
                pdf_path=pdf_path,
                query_vector=query_vector,
                embedder=self.embedder,
                settings=self.settings,
                top_k=profile.dynamic_top_k,
            )
            results.extend(temp_pdf_results)
            temp_pdf_ms = (time.perf_counter() - temp_pdf_start) * 1000

        rank_start = time.perf_counter()
        deduped: dict[str, RetrievedChunk] = {}
        for item in results:
            dedupe_key = f'{item.metadata.get("source_url", "")}::{item.metadata.get("chunk_number", "")}'
            if dedupe_key not in deduped or item.adjusted_score > deduped[dedupe_key].adjusted_score:
                deduped[dedupe_key] = item

        final_results = sorted(deduped.values(), key=lambda item: item.adjusted_score, reverse=True)
        rank_ms = (time.perf_counter() - rank_start) * 1000

        total_ms = (time.perf_counter() - total_start) * 1000

        if isinstance(telemetry, dict):
            telemetry.update(
                {
                    "profile_ms": round(profile_ms, 2),
                    "embed_query_ms": round(embed_query_ms, 2),
                    "pinecone_query_ms": round(pinecone_query_ms, 2),
                    "pinecone_unpack_ms": round(pinecone_unpack_ms, 2),
                    "bm25_ms": round(bm25_ms, 2),
                    "temp_pdf_ms": round(temp_pdf_ms, 2),
                    "rank_and_dedupe_ms": round(rank_ms, 2),
                    "retrieval_total_ms": round(total_ms, 2),
                    "candidate_k": candidate_k,
                    "dynamic_top_k": profile.dynamic_top_k,
                }
            )

        return final_results[: profile.dynamic_top_k], profile
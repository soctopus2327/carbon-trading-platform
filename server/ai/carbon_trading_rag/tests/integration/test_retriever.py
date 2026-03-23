from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app.rag.retriever import HybridRetriever


@pytest.fixture
def mock_settings(tmp_path):
    corpus_dir = tmp_path / "corpus"
    corpus_dir.mkdir(parents=True, exist_ok=True)

    return SimpleNamespace(
        project_root=tmp_path,
        top_k_min=2,
        top_k_max=5,
        retrieval_candidate_multiplier=2,
    )


@pytest.fixture
def mock_embedder(monkeypatch):
    class FakeEmbedder:
        def __init__(self, *_args, **_kwargs):
            pass

        def embed_query(self, query):
            return [1.0, 0.0]

    monkeypatch.setattr("app.rag.retriever.OpenAIEmbedder", FakeEmbedder)


@pytest.fixture
def mock_query_index(monkeypatch):
    class FakeMatch:
        def __init__(self, id, score, metadata):
            self.id = id
            self.score = score
            self.metadata = metadata

    def fake_query_index(*args, **kwargs):
        return SimpleNamespace(
            matches=[
                FakeMatch("c1", 0.9, {"source_url": "url1", "chunk_number": 1}),
                FakeMatch("c2", 0.8, {"source_url": "url2", "chunk_number": 1}),
            ]
        )

    monkeypatch.setattr("app.rag.retriever.query_index", fake_query_index)


@pytest.fixture
def mock_profile(monkeypatch):
    def fake_build_query_profile(query, top_k_min, top_k_max):
        return SimpleNamespace(
            query=query,
            intents=["general_advisory"],
            preferred_source_types=[],
            latest_sensitive=False,
            dynamic_top_k=3,
            pinecone_filter=None,
        )

    monkeypatch.setattr("app.rag.retriever.build_query_profile", fake_build_query_profile)


@pytest.fixture
def mock_metadata_boost(monkeypatch):
    monkeypatch.setattr("app.rag.retriever.metadata_boost", lambda metadata, profile: 0.0)


@pytest.fixture
def bm25_file_exists(mock_settings):
    bm25_path = mock_settings.project_root / "corpus" / "bm25_chunks.json"
    bm25_path.write_text("[]", encoding="utf-8")
    return bm25_path


@pytest.fixture
def mock_bm25_store(monkeypatch, bm25_file_exists):
    class FakeBM25Store:
        def __init__(self, json_path):
            self.json_path = json_path

        def search(self, query, top_k):
            return [
                SimpleNamespace(
                    chunk_id="bm1",
                    score=5.0,
                    metadata={"source_url": "url3", "chunk_number": 1},
                )
            ]

    monkeypatch.setattr("app.rag.retriever.LocalBM25Store", FakeBM25Store)


@pytest.fixture
def mock_temp_pdf(monkeypatch):
    def fake_temp_pdf(*args, **kwargs):
        return [
            SimpleNamespace(
                chunk_id="pdf1",
                score=0.7,
                adjusted_score=0.72,
                metadata={"source_url": "url4", "chunk_number": 1},
            )
        ]

    monkeypatch.setattr("app.rag.temp_pdf.retrieve_from_temp_pdf", fake_temp_pdf)


def test_retriever_basic_flow(
    mock_settings,
    mock_embedder,
    mock_query_index,
    mock_profile,
    mock_metadata_boost,
):
    retriever = HybridRetriever(mock_settings)

    results, profile = retriever.retrieve("carbon markets")

    assert len(results) > 0
    assert profile.query == "carbon markets"


def test_retriever_returns_sorted_results(
    mock_settings,
    mock_embedder,
    mock_query_index,
    mock_profile,
    mock_metadata_boost,
):
    retriever = HybridRetriever(mock_settings)

    results, _ = retriever.retrieve("carbon markets")

    scores = [r.adjusted_score for r in results]
    assert scores == sorted(scores, reverse=True)


def test_retriever_respects_top_k(
    mock_settings,
    mock_embedder,
    mock_query_index,
    mock_profile,
    mock_metadata_boost,
):
    retriever = HybridRetriever(mock_settings)

    results, profile = retriever.retrieve("complex carbon query")

    assert len(results) <= profile.dynamic_top_k


def test_retriever_includes_bm25_results(
    mock_settings,
    mock_embedder,
    mock_query_index,
    mock_profile,
    mock_metadata_boost,
    mock_bm25_store,
):
    retriever = HybridRetriever(mock_settings)

    results, _ = retriever.retrieve("carbon")

    ids = [r.chunk_id for r in results]
    assert "bm1" in ids


def test_retriever_includes_temp_pdf(
    mock_settings,
    mock_embedder,
    mock_query_index,
    mock_profile,
    mock_metadata_boost,
    mock_temp_pdf,
):
    retriever = HybridRetriever(mock_settings)

    results, _ = retriever.retrieve("carbon", pdf_path="file.pdf")

    ids = [r.chunk_id for r in results]
    assert "pdf1" in ids


def test_retriever_deduplicates_by_source_and_chunk(
    mock_settings,
    mock_embedder,
    mock_profile,
    mock_metadata_boost,
    monkeypatch,
):
    class FakeMatch:
        def __init__(self, id, score, metadata):
            self.id = id
            self.score = score
            self.metadata = metadata

    def fake_query_index(*args, **kwargs):
        return SimpleNamespace(
            matches=[
                FakeMatch("c1", 0.5, {"source_url": "same", "chunk_number": 1}),
                FakeMatch("c2", 0.9, {"source_url": "same", "chunk_number": 1}),
            ]
        )

    monkeypatch.setattr("app.rag.retriever.query_index", fake_query_index)

    retriever = HybridRetriever(mock_settings)

    results, _ = retriever.retrieve("test")

    assert len(results) == 1
    assert results[0].score == 0.9
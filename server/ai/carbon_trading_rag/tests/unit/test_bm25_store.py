from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.rag.bm25_store import LocalBM25Store, simple_tokenize


# ---------------------------
# tokenizer tests
# ---------------------------

def test_simple_tokenize_basic():
    text = "Carbon markets are evolving."
    tokens = simple_tokenize(text)

    assert tokens == ["carbon", "markets", "are", "evolving"]


def test_simple_tokenize_handles_empty():
    assert simple_tokenize("") == []
    assert simple_tokenize("   ") == []


def test_simple_tokenize_removes_punctuation():
    text = "Hello, world! Carbon-credit."
    tokens = simple_tokenize(text)

    assert "hello" in tokens
    assert "world" in tokens
    assert "carbon" in tokens
    assert "credit" in tokens


# ---------------------------
# BM25 store setup
# ---------------------------

@pytest.fixture
def bm25_json(tmp_path: Path):
    data = [
        {
            "chunk_id": "c1",
            "text": "carbon markets trading system",
            "metadata": {"title": "Doc1"},
        },
        {
            "chunk_id": "c2",
            "text": "emission reduction strategies",
            "metadata": {"title": "Doc2"},
        },
        {
            "chunk_id": "c3",
            "text": "renewable energy and electrification",
            "metadata": {"title": "Doc3"},
        },
    ]

    file_path = tmp_path / "bm25.json"
    with file_path.open("w", encoding="utf-8") as f:
        json.dump(data, f)

    return file_path


# ---------------------------
# initialization tests
# ---------------------------

def test_bm25_store_file_not_found():
    with pytest.raises(FileNotFoundError):
        LocalBM25Store("non_existent_file.json")


def test_bm25_store_loads_records(bm25_json):
    store = LocalBM25Store(bm25_json)

    assert len(store.records) == 3
    assert len(store.tokenized_corpus) == 3


# ---------------------------
# search tests
# ---------------------------

def test_search_returns_results(bm25_json):
    store = LocalBM25Store(bm25_json)

    results = store.search("carbon market", top_k=2)

    assert len(results) >= 1
    assert results[0].chunk_id == "c1"


def test_search_respects_top_k(bm25_json):
    store = LocalBM25Store(bm25_json)

    results = store.search("carbon energy reduction", top_k=2)

    assert len(results) <= 2


def test_search_returns_empty_for_empty_query(bm25_json):
    store = LocalBM25Store(bm25_json)

    results = store.search("", top_k=3)

    assert results == []


def test_search_filters_zero_score_hits(bm25_json):
    store = LocalBM25Store(bm25_json)

    results = store.search("completely unrelated words", top_k=5)

    # All results should have positive scores
    assert all(hit.score > 0 for hit in results)


def test_search_metadata_preserved(bm25_json):
    store = LocalBM25Store(bm25_json)

    results = store.search("carbon", top_k=1)

    hit = results[0]
    assert "title" in hit.metadata
    assert "chunk_text" in hit.metadata  # fallback must exist


def test_search_chunk_text_fallback(bm25_json):
    store = LocalBM25Store(bm25_json)

    results = store.search("carbon", top_k=1)

    hit = results[0]
    assert hit.metadata["chunk_text"] == "carbon markets trading system"
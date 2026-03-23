from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.rag.temp_pdf import cosine_similarity, retrieve_from_temp_pdf


# ---------------------------
# cosine similarity tests
# ---------------------------

def test_cosine_similarity_identical_vectors():
    v = [1, 2, 3]
    assert cosine_similarity(v, v) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors():
    a = [1, 0]
    b = [0, 1]
    assert cosine_similarity(a, b) == pytest.approx(0.0)


def test_cosine_similarity_zero_vector():
    a = [0, 0, 0]
    b = [1, 2, 3]
    assert cosine_similarity(a, b) == 0.0


# ---------------------------
# retrieve_from_temp_pdf tests
# ---------------------------

@pytest.fixture
def mock_pdf_extraction(monkeypatch):
    def fake_extract(_):
        return SimpleNamespace(
            text="chunk one\n\nchunk two",
            title="Temp PDF Title"
        )
    monkeypatch.setattr("app.rag.temp_pdf.extract_local_pdf", fake_extract)


@pytest.fixture
def mock_chunking(monkeypatch):
    def fake_chunk_text(text, source_id, settings):
        return [
            SimpleNamespace(
                chunk_id="TEMP-PDF::chunk::1",
                text="chunk one",
                chunk_number=1
            ),
            SimpleNamespace(
                chunk_id="TEMP-PDF::chunk::2",
                text="chunk two",
                chunk_number=2
            ),
        ]
    monkeypatch.setattr("app.rag.temp_pdf.chunk_text", fake_chunk_text)


@pytest.fixture
def mock_embedder():
    class FakeEmbedder:
        def embed_texts(self, texts):
            # deterministic vectors
            return [
                [1, 0],  # chunk one
                [0, 1],  # chunk two
            ]
    return FakeEmbedder()


def test_retrieve_from_temp_pdf_basic_flow(
    mock_pdf_extraction,
    mock_chunking,
    mock_embedder,
):
    query_vector = [1, 0]  # should match chunk one best

    results = retrieve_from_temp_pdf(
        pdf_path="dummy.pdf",
        query_vector=query_vector,
        embedder=mock_embedder,
        settings=SimpleNamespace(chunk_size=100, chunk_overlap=10),
        top_k=2,
    )

    assert len(results) == 2

    # first result should be best match
    assert results[0].metadata["chunk_text"] == "chunk one"
    assert results[0].score > results[1].score


def test_retrieve_from_temp_pdf_respects_top_k(
    mock_pdf_extraction,
    mock_chunking,
    mock_embedder,
):
    results = retrieve_from_temp_pdf(
        pdf_path="dummy.pdf",
        query_vector=[1, 0],
        embedder=mock_embedder,
        settings=SimpleNamespace(chunk_size=100, chunk_overlap=10),
        top_k=1,
    )

    assert len(results) == 1


def test_retrieve_from_temp_pdf_metadata_fields(
    mock_pdf_extraction,
    mock_chunking,
    mock_embedder,
):
    results = retrieve_from_temp_pdf(
        pdf_path="dummy.pdf",
        query_vector=[1, 0],
        embedder=mock_embedder,
        settings=SimpleNamespace(chunk_size=100, chunk_overlap=10),
        top_k=1,
    )

    meta = results[0].metadata

    assert meta["title"] == "Temp PDF Title"
    assert meta["source_type"] == "temporary_pdf"
    assert "source_url" in meta
    assert meta["chunk_number"] == 1


def test_retrieve_from_temp_pdf_adjusted_score_is_higher(
    mock_pdf_extraction,
    mock_chunking,
    mock_embedder,
):
    results = retrieve_from_temp_pdf(
        pdf_path="dummy.pdf",
        query_vector=[1, 0],
        embedder=mock_embedder,
        settings=SimpleNamespace(chunk_size=100, chunk_overlap=10),
        top_k=1,
    )

    result = results[0]
    assert result.adjusted_score == pytest.approx(result.score + 0.02)


def test_retrieve_from_temp_pdf_handles_no_chunks(monkeypatch, mock_embedder):
    def fake_extract(_):
        return SimpleNamespace(text="", title="Empty PDF")

    def fake_chunk_text(*args, **kwargs):
        return []

    monkeypatch.setattr("app.rag.temp_pdf.extract_local_pdf", fake_extract)
    monkeypatch.setattr("app.rag.temp_pdf.chunk_text", fake_chunk_text)

    results = retrieve_from_temp_pdf(
        pdf_path="dummy.pdf",
        query_vector=[1, 0],
        embedder=mock_embedder,
        settings=SimpleNamespace(chunk_size=100, chunk_overlap=10),
        top_k=3,
    )

    assert results == []
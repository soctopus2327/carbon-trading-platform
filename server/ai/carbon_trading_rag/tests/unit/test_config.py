from __future__ import annotations

from app.config import load_settings


def test_load_settings_raises_when_openai_key_missing(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("PINECONE_API_KEY", "test-pinecone-key")

    try:
        load_settings()
        assert False, "Expected ValueError when OPENAI_API_KEY is missing"
    except ValueError as exc:
        assert "OPENAI_API_KEY" in str(exc)


def test_load_settings_raises_when_pinecone_key_missing(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.delenv("PINECONE_API_KEY", raising=False)

    try:
        load_settings()
        assert False, "Expected ValueError when PINECONE_API_KEY is missing"
    except ValueError as exc:
        assert "PINECONE_API_KEY" in str(exc)


def test_load_settings_applies_defaults_and_overrides(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key")
    monkeypatch.setenv("PINECONE_API_KEY", "pinecone-key")
    monkeypatch.setenv("PINECONE_INDEX_NAME", "my-index")
    monkeypatch.setenv("TOP_K_MIN", "4")
    monkeypatch.setenv("TOP_K_MAX", "9")
    monkeypatch.setenv("EMBEDDING_DIMENSIONS", "1536")

    settings = load_settings()

    assert settings.openai_api_key == "openai-key"
    assert settings.pinecone_api_key == "pinecone-key"
    assert settings.pinecone_index_name == "my-index"
    assert settings.top_k_min == 4
    assert settings.top_k_max == 9
    assert settings.embedding_dimensions == 1536
    assert settings.corpus_csv_path.name == "corpus.csv"

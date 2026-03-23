from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import scripts.ingest_corpus as ingest_module


def test_build_chunk_metadata_includes_core_fields():
    record = SimpleNamespace(
        source_id="SRC-001",
        url="http://original.example",
        title="Original Title",
        source_type="government",
        region="Global",
        publication_date="2025-01-01",
        reliability_rating="A",
        tags=["policy", "carbon"],
        extra_metadata={"custom_field": "custom_value"},
    )

    metadata = ingest_module.build_chunk_metadata(
        record=record,
        title="Resolved Title",
        final_url="http://final.example",
        content_type="text/html",
        chunk_number=1,
        chunk_text_value="chunk text here",
    )

    assert metadata["source_id"] == "SRC-001"
    assert metadata["title"] == "Resolved Title"
    assert metadata["source_url"] == "http://final.example"
    assert metadata["original_url"] == "http://original.example"
    assert metadata["source_type"] == "government"
    assert metadata["region"] == "Global"
    assert metadata["publication_date"] == "2025-01-01"
    assert metadata["reliability_rating"] == "A"
    assert metadata["tags"] == ["policy", "carbon"]
    assert metadata["content_type"] == "text/html"
    assert metadata["chunk_number"] == 1
    assert metadata["chunk_text"] == "chunk text here"
    assert metadata["custom_field"] == "custom_value"
    assert "ingested_at" in metadata


def test_main_ingests_and_writes_bm25_json(monkeypatch, tmp_path):
    project_root = tmp_path
    corpus_dir = project_root / "corpus"
    corpus_dir.mkdir(parents=True, exist_ok=True)

    fake_settings = SimpleNamespace(
        project_root=project_root,
        chunk_size=100,
        chunk_overlap=10,
    )

    fake_record = SimpleNamespace(
        source_id="SRC-001",
        url="http://example.com",
        title="Example Title",
        source_type="journal",
        region="Global",
        publication_date="2025-02-02",
        reliability_rating="A",
        tags=["journal"],
        extra_metadata={},
    )

    fake_extracted = SimpleNamespace(
        text="This is a long enough extracted document text. " * 10,
        title="Fetched Title",
        final_url="http://example.com/final",
        content_type="text/html",
    )

    fake_chunks = [
        SimpleNamespace(chunk_id="SRC-001::chunk::1", text="chunk one text", chunk_number=1),
        SimpleNamespace(chunk_id="SRC-001::chunk::2", text="chunk two text", chunk_number=2),
    ]

    class FakeEmbedder:
        def __init__(self, settings):
            self.settings = settings

        def embed_texts(self, texts):
            return [[0.1, 0.2], [0.3, 0.4]]

    captured_upserts = []

    def fake_upsert_records(settings, records, batch_size=40):
        captured_upserts.extend(records)

    monkeypatch.setattr(ingest_module, "load_settings", lambda: fake_settings)
    monkeypatch.setattr(ingest_module, "ensure_index", lambda settings: None)
    monkeypatch.setattr(ingest_module, "load_corpus_records", lambda settings: [fake_record])
    monkeypatch.setattr(ingest_module, "extract_from_url", lambda url, settings, use_playwright_fallback=True: fake_extracted)
    monkeypatch.setattr(ingest_module, "chunk_text", lambda text, source_id, settings: fake_chunks)
    monkeypatch.setattr(ingest_module, "OpenAIEmbedder", FakeEmbedder)
    monkeypatch.setattr(ingest_module, "upsert_records", fake_upsert_records)

    ingest_module.main()

    assert len(captured_upserts) == 2
    assert captured_upserts[0]["id"] == "SRC-001::chunk::1"
    assert captured_upserts[1]["id"] == "SRC-001::chunk::2"
    assert captured_upserts[0]["metadata"]["chunk_text"] == "chunk one text"
    assert captured_upserts[1]["metadata"]["chunk_text"] == "chunk two text"

    bm25_path = project_root / "corpus" / "bm25_chunks.json"
    assert bm25_path.exists()

    data = json.loads(bm25_path.read_text(encoding="utf-8"))
    assert len(data) == 2
    assert data[0]["chunk_id"] == "SRC-001::chunk::1"
    assert data[1]["chunk_id"] == "SRC-001::chunk::2"
    assert data[0]["text"] == "chunk one text"
    assert data[1]["text"] == "chunk two text"


def test_main_skips_short_extractions_and_records_failure(monkeypatch, tmp_path, capsys):
    project_root = tmp_path
    corpus_dir = project_root / "corpus"
    corpus_dir.mkdir(parents=True, exist_ok=True)

    fake_settings = SimpleNamespace(
        project_root=project_root,
        chunk_size=100,
        chunk_overlap=10,
    )

    fake_record = SimpleNamespace(
        source_id="SRC-002",
        url="http://short.example",
        title="Short Doc",
        source_type="web",
        region="Global",
        publication_date="",
        reliability_rating="B",
        tags=[],
        extra_metadata={},
    )

    fake_extracted = SimpleNamespace(
        text="too short",
        title="Short",
        final_url="http://short.example/final",
        content_type="text/html",
    )

    class FakeEmbedder:
        def __init__(self, settings):
            self.settings = settings

        def embed_texts(self, texts):
            return []

    captured_upserts = []

    monkeypatch.setattr(ingest_module, "load_settings", lambda: fake_settings)
    monkeypatch.setattr(ingest_module, "ensure_index", lambda settings: None)
    monkeypatch.setattr(ingest_module, "load_corpus_records", lambda settings: [fake_record])
    monkeypatch.setattr(ingest_module, "extract_from_url", lambda url, settings, use_playwright_fallback=True: fake_extracted)
    monkeypatch.setattr(ingest_module, "chunk_text", lambda text, source_id, settings: [])
    monkeypatch.setattr(ingest_module, "OpenAIEmbedder", FakeEmbedder)
    monkeypatch.setattr(ingest_module, "upsert_records", lambda settings, records, batch_size=40: captured_upserts.extend(records))

    ingest_module.main()

    assert captured_upserts == []

    bm25_path = project_root / "corpus" / "bm25_chunks.json"
    assert bm25_path.exists()
    data = json.loads(bm25_path.read_text(encoding="utf-8"))
    assert data == []

    output = capsys.readouterr().out
    assert "Extracted text too short" in output
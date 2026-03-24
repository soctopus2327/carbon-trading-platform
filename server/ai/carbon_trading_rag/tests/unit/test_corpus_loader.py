from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from app.ingest.corpus_loader import (
    _guess_source_type_from_url,
    _normalize_key,
    _split_tags,
    load_corpus_records,
    load_from_csv,
    load_from_urls_txt,
)


def test_normalize_key_and_split_tags_helpers():
    assert _normalize_key(" Publication Date ") == "publication_date"
    assert _split_tags("a, b | c;d") == ["a", "b", "c", "d"]
    assert _split_tags(None) == []


def test_guess_source_type_from_url():
    assert _guess_source_type_from_url("https://example.com/file.pdf") == "pdf"
    assert _guess_source_type_from_url("https://www.epa.gov/example") == "government"
    assert _guess_source_type_from_url("https://www.nature.com/article") == "journal"
    assert _guess_source_type_from_url("https://ghgprotocol.org/something") == "guideline"
    assert _guess_source_type_from_url("https://example.com") == "web"


def test_load_from_urls_txt(tmp_path):
    urls_path = tmp_path / "corpus_urls.txt"
    urls_path.write_text(
        "# comment\n\nhttps://example.com/a\nhttps://example.com/b.pdf\n",
        encoding="utf-8",
    )

    records = load_from_urls_txt(urls_path)

    assert len(records) == 2
    assert records[0].source_id == "SRC-00003"
    assert records[0].source_type == "web"
    assert records[1].source_type == "pdf"


def test_load_from_csv_parses_columns_and_metadata(tmp_path):
    csv_path = tmp_path / "corpus.csv"
    csv_path.write_text(
        "ID,Link,Title,Type,Region,Date,Rating,Tags,Notes\n"
        "A-1,https://example.com/doc,Doc 1,guideline,EU,2025-01-01,A,policy|ets,alpha\n"
        "A-2,https://example.com/doc2.pdf,Doc 2,,US,,B,compliance,beta\n",
        encoding="utf-8",
    )

    records = load_from_csv(csv_path)

    assert len(records) == 2
    assert records[0].source_id == "A-1"
    assert records[0].source_type == "guideline"
    assert records[0].tags == ["policy", "ets"]
    assert records[0].extra_metadata["notes"] == "alpha"

    assert records[1].source_id == "A-2"
    assert records[1].source_type == "pdf"
    assert records[1].reliability_rating == "B"


def test_load_corpus_records_prefers_csv_then_urls(tmp_path):
    corpus_dir = tmp_path / "corpus"
    corpus_dir.mkdir(parents=True, exist_ok=True)

    csv_path = corpus_dir / "corpus.csv"
    urls_path = corpus_dir / "corpus_urls.txt"

    csv_path.write_text("url\nhttps://example.com/csv\n", encoding="utf-8")
    urls_path.write_text("https://example.com/urlstxt\n", encoding="utf-8")

    settings = SimpleNamespace(corpus_csv_path=csv_path, corpus_urls_path=urls_path)

    records = load_corpus_records(settings)
    assert len(records) == 1
    assert records[0].url == "https://example.com/csv"


def test_load_corpus_records_raises_when_no_input_files(tmp_path):
    settings = SimpleNamespace(
        corpus_csv_path=tmp_path / "missing.csv",
        corpus_urls_path=tmp_path / "missing.txt",
    )

    with pytest.raises(FileNotFoundError):
        load_corpus_records(settings)

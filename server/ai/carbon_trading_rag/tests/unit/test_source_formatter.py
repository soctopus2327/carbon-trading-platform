from __future__ import annotations

from types import SimpleNamespace

from app.rag.source_formatter import format_sources


def make_chunk(metadata: dict):
    return SimpleNamespace(metadata=metadata)


# ---------------------------
# basic structure tests
# ---------------------------

def test_format_sources_single_entry():
    chunk = make_chunk({
        "title": "Carbon Report",
        "source_url": "http://example.com",
        "source_type": "government",
        "publication_date": "2025-01-01",
    })

    output = format_sources([chunk])

    assert "Sources used" in output
    assert "1. Carbon Report" in output
    assert "(government | 2025-01-01)" in output
    assert "http://example.com" in output


def test_format_sources_multiple_entries_numbering():
    chunks = [
        make_chunk({"title": "A", "source_url": "urlA"}),
        make_chunk({"title": "B", "source_url": "urlB"}),
    ]

    output = format_sources(chunks)

    assert "1. A" in output
    assert "2. B" in output
    assert output.index("1. A") < output.index("2. B")


# ---------------------------
# fallback behavior
# ---------------------------

def test_format_sources_missing_metadata():
    chunk = make_chunk({})

    output = format_sources([chunk])

    assert "Untitled" in output
    assert "unknown" in output  # default source_type
    assert "1. Untitled" in output


def test_format_sources_missing_url_still_formats():
    chunk = make_chunk({
        "title": "Test Source",
        "source_type": "journal",
    })

    output = format_sources([chunk])

    assert "Test Source" in output
    # URL line should still exist (empty string)
    assert "\n   " in output


# ---------------------------
# formatting details
# ---------------------------

def test_format_sources_handles_only_one_detail_field():
    chunk = make_chunk({
        "title": "Test",
        "source_type": "NGO",
        # no publication_date
    })

    output = format_sources([chunk])

    assert "(NGO)" in output


def test_format_sources_no_details_section_if_both_missing():
    chunk = make_chunk({
        "title": "Test",
        # no source_type, no date
    })

    output = format_sources([chunk])

    # should not contain empty parentheses
    assert "()" not in output


def test_format_sources_empty_input():
    output = format_sources([])

    assert "Sources used" in output
    # should only contain header
    assert output.strip() == "Sources used"
from __future__ import annotations

from app.ingest.chunker import _split_long_paragraph, chunk_text


def test_split_long_paragraph_empty_returns_empty():
    assert _split_long_paragraph("", chunk_size=10, overlap=2) == []
    assert _split_long_paragraph("   ", chunk_size=10, overlap=2) == []


def test_split_long_paragraph_splits_with_overlap():
    paragraph = "abcdefghijklmnopqrstuvwxyz"
    pieces = _split_long_paragraph(paragraph, chunk_size=10, overlap=2)

    assert len(pieces) >= 3
    assert pieces[0] == "abcdefghij"
    assert pieces[1].startswith("ij")
    assert "".join([pieces[0], pieces[1][2:]])[:18] == paragraph[:18]


def test_chunk_text_empty_input_returns_no_chunks(small_settings):
    assert chunk_text("", "SRC-1", small_settings) == []
    assert chunk_text("   \n\n   ", "SRC-1", small_settings) == []


def test_chunk_text_single_small_paragraph_produces_one_chunk(small_settings):
    text = "Carbon markets can support decarbonization."
    chunks = chunk_text(text, "SRC-1", small_settings)

    assert len(chunks) == 1
    assert chunks[0].chunk_id == "SRC-1::chunk::1"
    assert chunks[0].chunk_number == 1
    assert chunks[0].text == text


def test_chunk_text_merges_multiple_small_paragraphs_when_they_fit(medium_settings):
    p1 = "First paragraph on emissions."
    p2 = "Second paragraph on offsets."
    text = f"{p1}\n\n{p2}"

    chunks = chunk_text(text, "SRC-2", medium_settings)

    assert len(chunks) == 1
    assert chunks[0].chunk_id == "SRC-2::chunk::1"
    assert chunks[0].chunk_number == 1
    assert chunks[0].text == f"{p1}\n\n{p2}"


def test_chunk_text_splits_when_combined_paragraphs_exceed_chunk_size(small_settings):
    p1 = "A" * 30
    p2 = "B" * 30
    text = f"{p1}\n\n{p2}"

    chunks = chunk_text(text, "SRC-3", small_settings)

    assert len(chunks) == 2
    assert chunks[0].chunk_id == "SRC-3::chunk::1"
    assert chunks[1].chunk_id == "SRC-3::chunk::2"
    assert chunks[0].text == p1
    assert chunks[1].text == p2


def test_chunk_text_oversized_paragraph_is_split_into_multiple_chunks(small_settings):
    text = "X" * 120
    chunks = chunk_text(text, "SRC-4", small_settings)

    assert len(chunks) >= 3
    assert chunks[0].chunk_id == "SRC-4::chunk::1"
    assert chunks[1].chunk_id == "SRC-4::chunk::2"
    assert all(chunk.chunk_number == i + 1 for i, chunk in enumerate(chunks))
    assert all(len(chunk.text) <= small_settings.chunk_size for chunk in chunks)


def test_chunk_text_flushes_current_chunk_before_splitting_long_paragraph(small_settings):
    small_para = "Short paragraph."
    long_para = "L" * 120
    text = f"{small_para}\n\n{long_para}"

    chunks = chunk_text(text, "SRC-5", small_settings)

    assert len(chunks) >= 2
    assert chunks[0].text == small_para
    assert chunks[0].chunk_id == "SRC-5::chunk::1"
    assert chunks[1].chunk_id == "SRC-5::chunk::2"


def test_chunk_text_ignores_extra_blank_lines_between_paragraphs(small_settings):
    text = "Para one.\n\n\n\nPara two."
    chunks = chunk_text(text, "SRC-6", small_settings)

    assert len(chunks) == 1
    assert chunks[0].text == "Para one.\n\nPara two."


def test_chunk_text_chunk_ids_and_numbers_are_stable(small_settings):
    p1 = "A" * 30
    p2 = "B" * 30
    p3 = "C" * 30
    text = f"{p1}\n\n{p2}\n\n{p3}"

    chunks = chunk_text(text, "SRC-7", small_settings)

    assert [chunk.chunk_id for chunk in chunks] == [
        "SRC-7::chunk::1",
        "SRC-7::chunk::2",
        "SRC-7::chunk::3",
    ]
    assert [chunk.chunk_number for chunk in chunks] == [1, 2, 3]
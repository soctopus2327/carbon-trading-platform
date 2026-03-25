from __future__ import annotations

from types import SimpleNamespace

from app.rag.prompts import SYSTEM_PROMPT, build_user_prompt, format_context


# ---------------------------
# SYSTEM PROMPT tests
# ---------------------------

def test_system_prompt_contains_guardrails():
    assert "Use retrieved evidence" in SYSTEM_PROMPT
    assert "Do not invent regulations" in SYSTEM_PROMPT
    assert "Do not fabricate source names" in SYSTEM_PROMPT
    assert "Brief answer" in SYSTEM_PROMPT
    assert "Evidence-backed details" in SYSTEM_PROMPT


def test_system_prompt_mentions_scope_of_assistant():
    assert "carbon advisory" in SYSTEM_PROMPT.lower()
    assert "reducing emissions" in SYSTEM_PROMPT.lower()
    assert "carbon credits" in SYSTEM_PROMPT.lower()


# ---------------------------
# format_context tests
# ---------------------------

def make_chunk(metadata: dict):
    return SimpleNamespace(metadata=metadata)


def test_format_context_single_chunk():
    chunk = make_chunk({
        "title": "Carbon Report",
        "source_type": "government",
        "publication_date": "2025-01-01",
        "source_url": "http://example.com",
        "chunk_text": "Carbon markets are evolving."
    })

    context = format_context([chunk])

    assert "[S1]" in context
    assert "Carbon Report" in context
    assert "government" in context
    assert "2025-01-01" in context
    assert "http://example.com" in context
    assert "Carbon markets are evolving." in context


def test_format_context_multiple_chunks_numbering():
    chunks = [
        make_chunk({"chunk_text": "Text A"}),
        make_chunk({"chunk_text": "Text B"}),
    ]

    context = format_context(chunks)

    assert "[S1]" in context
    assert "[S2]" in context
    assert context.index("[S1]") < context.index("[S2]")


def test_format_context_uses_fallbacks_when_metadata_missing():
    chunk = make_chunk({
        "chunk_text": "Fallback test."
    })

    context = format_context([chunk])

    assert "Untitled" in context
    assert "unknown" in context
    assert "Fallback test." in context


def test_format_context_strips_chunk_text():
    chunk = make_chunk({
        "chunk_text": "   padded text   "
    })

    context = format_context([chunk])

    assert "padded text" in context
    assert "   padded text   " not in context


# ---------------------------
# build_user_prompt tests
# ---------------------------

def test_build_user_prompt_includes_question():
    chunk = make_chunk({"chunk_text": "Some context"})
    question = "What are carbon offsets?"

    prompt = build_user_prompt(question, [chunk])

    assert question in prompt
    assert "User question:" in prompt


def test_build_user_prompt_includes_context():
    chunk = make_chunk({
        "title": "Test",
        "chunk_text": "Context info"
    })

    prompt = build_user_prompt("Q?", [chunk])

    assert "Retrieved context:" in prompt
    assert "Context info" in prompt
    assert "[S1]" in prompt


def test_build_user_prompt_contains_instruction_constraint():
    chunk = make_chunk({"chunk_text": "Context info"})

    prompt = build_user_prompt("Q?", [chunk])

    assert "write the answer from retrieved context" in prompt.lower()


def test_build_user_prompt_handles_empty_context():
    prompt = build_user_prompt("What is this?", [])

    assert "Retrieved context:" in prompt
    # Should not crash and should still contain structure
    assert "User question:" in prompt
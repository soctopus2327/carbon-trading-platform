from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_module(module_name: str, filename: str):
    module_path = Path(__file__).resolve().parents[3] / "audit_generator" / filename
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_build_audit_question_and_user_prompt_include_required_sections():
    prompt_builder = _load_module("prompt_builder", "prompt_builder.py")

    question = prompt_builder.build_audit_question({"company": "Acme"}, "2025-Q4")
    assert "Generate an emissions audit report" in question
    assert "Audit period: 2025-Q4." in question
    assert '"riskLevel": "LOW|MEDIUM|HIGH"' in question

    user_prompt = prompt_builder.build_audit_user_prompt(
        question="Analyze this report",
        company_context={"industry": "cement"},
        context_blocks=[{"chunk_id": "c1", "chunk_number": 1, "score": 0.8765, "text": "Evidence"}],
    )
    assert "Audit request:" in user_prompt
    assert "Company context:" in user_prompt
    assert "Extracted PDF evidence:" in user_prompt
    assert "[C1]" in user_prompt
    assert "Evidence" in user_prompt


def test_extract_json_object_handles_fenced_and_embedded_json():
    response_parser = _load_module("response_parser", "response_parser.py")

    fenced = """```json\n{\"summary\":\"ok\"}\n```"""
    parsed_fenced = response_parser.extract_json_object(fenced)
    assert parsed_fenced == {"summary": "ok"}

    embedded = "prefix {\"riskLevel\":\"HIGH\"} suffix"
    parsed_embedded = response_parser.extract_json_object(embedded)
    assert parsed_embedded == {"riskLevel": "HIGH"}


def test_normalize_payload_applies_safe_defaults():
    response_parser = _load_module("response_parser", "response_parser.py")

    normalized = response_parser.normalize_payload(None, "raw")

    assert normalized["summary"].startswith("Insufficient evidence")
    assert normalized["riskLevel"] == "MEDIUM"
    assert normalized["findings"] == []
    assert normalized["recommendations"] == []
    assert normalized["limitations"] == []
    assert normalized["reportText"] == "raw"

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
AI_ROOT = THIS_DIR.parent
RAG_ROOT = (THIS_DIR.parent / "carbon_trading_rag").resolve()

if str(RAG_ROOT) not in sys.path:
    sys.path.insert(0, str(RAG_ROOT))
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from prompt_builder import build_audit_question, build_audit_user_prompt
from response_parser import extract_json_object, normalize_payload
from shared.python.payload_codec import configure_utf8_stdio, parse_base64_json_object
from shared.python.context_ranker import select_relevant_chunks

from app.config import load_settings
from app.ingest.chunker import chunk_text
from app.ingest.extractors import extract_local_pdf
from app.rag.lmstudio_backend import stream_lmstudio_answer
from app.rag.openai_backend import stream_openai_answer
from app.rag.prompts import SYSTEM_PROMPT


def _build_sources(selected_chunks: list[dict], pdf_path: str, pdf_title: str) -> list[dict]:
    sources: list[dict] = []
    for chunk in selected_chunks:
        sources.append(
            {
                "title": pdf_title or "Uploaded audit report",
                "source_type": "temporary_pdf",
                "publication_date": "",
                "source_url": str(pdf_path),
                "chunk_id": str(chunk.get("chunk_id", "")),
                "score": float(chunk.get("score", 0.0)),
            }
        )
    return sources


def _run_generation(provider: str, settings, system_prompt: str, user_prompt: str) -> str:
    tokens: list[str] = []

    def on_token(token: str) -> None:
        tokens.append(token)

    if provider == "lmstudio":
        stream_lmstudio_answer(settings, system_prompt, user_prompt, on_token=on_token)
    else:
        stream_openai_answer(settings, system_prompt, user_prompt, on_token=on_token)

    return "".join(tokens)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit generator Python core")
    parser.add_argument("--provider", type=str, default="lmstudio", choices=["openai", "lmstudio"])
    parser.add_argument("--pdf", type=str, required=True)
    parser.add_argument("--report-period", type=str, default="")
    parser.add_argument("--company-context-base64", type=str, default="")
    parser.add_argument("--max-chunks", type=int, default=8)
    parser.add_argument("--max-context-chars", type=int, default=12000)
    return parser.parse_args()


def main() -> None:
    configure_utf8_stdio()

    args = parse_args()
    company_context = parse_base64_json_object(args.company_context_base64)

    start_total = time.perf_counter()
    timings: dict[str, float] = {}

    settings_start = time.perf_counter()
    settings = load_settings()
    timings["settings_load_ms"] = round((time.perf_counter() - settings_start) * 1000, 2)

    question_start = time.perf_counter()
    question = build_audit_question(company_context, args.report_period or None)
    timings["question_build_ms"] = round((time.perf_counter() - question_start) * 1000, 2)

    extract_start = time.perf_counter()
    extracted = extract_local_pdf(args.pdf)
    timings["pdf_extract_ms"] = round((time.perf_counter() - extract_start) * 1000, 2)

    chunk_start = time.perf_counter()
    chunks = chunk_text(extracted.text, source_id="AUDIT-PDF", settings=settings)
    timings["pdf_chunk_ms"] = round((time.perf_counter() - chunk_start) * 1000, 2)

    rank_start = time.perf_counter()
    selected_chunks = select_relevant_chunks(
        question=question,
        chunks=[
            {
                "chunk_id": chunk.chunk_id,
                "chunk_number": chunk.chunk_number,
                "text": chunk.text,
            }
            for chunk in chunks
        ],
        max_chunks=max(3, int(args.max_chunks)),
        max_context_chars=max(2500, int(args.max_context_chars)),
    )
    timings["chunk_rank_ms"] = round((time.perf_counter() - rank_start) * 1000, 2)

    prompt_start = time.perf_counter()
    user_prompt = build_audit_user_prompt(
        question=question,
        company_context=company_context,
        context_blocks=selected_chunks,
    )
    timings["prompt_build_ms"] = round((time.perf_counter() - prompt_start) * 1000, 2)

    generation_start = time.perf_counter()
    raw_answer = _run_generation(args.provider, settings, SYSTEM_PROMPT, user_prompt)
    timings["generation_ms"] = round((time.perf_counter() - generation_start) * 1000, 2)

    parse_start = time.perf_counter()
    parsed = extract_json_object(raw_answer)
    normalized = normalize_payload(parsed, raw_answer)
    timings["response_parse_ms"] = round((time.perf_counter() - parse_start) * 1000, 2)

    output = {
        **normalized,
        "sources": _build_sources(selected_chunks, args.pdf, extracted.title),
        "meta": {
            "provider_used": args.provider,
            "model_name": settings.lmstudio_model if args.provider == "lmstudio" else settings.openai_model,
            "context_chunks_used": len(selected_chunks),
            "runner_timings_ms": {
                **timings,
                "python_total_ms": round((time.perf_counter() - start_total) * 1000, 2),
            },
        },
    }

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)

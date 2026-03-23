from __future__ import annotations

import argparse
import io
import json
import sys
import time
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AI_ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from shared.python.payload_codec import configure_utf8_stdio, parse_base64_json_object

configure_utf8_stdio()

from app.config import load_settings
from app.rag.lmstudio_backend import stream_lmstudio_answer
from app.rag.openai_backend import stream_openai_answer
from app.rag.prompts import SYSTEM_PROMPT, build_user_prompt
from app.rag.retriever import HybridRetriever


def parse_args():
    parser = argparse.ArgumentParser(description="Web adapter for carbon advisory RAG")
    parser.add_argument("--question", type=str, required=True)
    parser.add_argument("--provider", type=str, default="openai", choices=["openai", "lmstudio"])
    parser.add_argument("--pdf", type=str, default=None)
    parser.add_argument("--company-context-base64", type=str, default="")
    parser.add_argument("--stream", action="store_true")
    return parser.parse_args()


def parse_company_context(encoded: str) -> dict | None:
    return parse_base64_json_object(encoded)


def main() -> None:
    total_start = time.perf_counter()

    parse_start = time.perf_counter()
    args = parse_args()
    parse_args_ms = (time.perf_counter() - parse_start) * 1000

    settings_start = time.perf_counter()
    settings = load_settings()
    settings_load_ms = (time.perf_counter() - settings_start) * 1000

    retriever_start = time.perf_counter()
    retriever = HybridRetriever(settings)
    retriever_init_ms = (time.perf_counter() - retriever_start) * 1000

    company_context = parse_company_context(args.company_context_base64)

    retrieve_telemetry: dict = {}
    retrieve_start = time.perf_counter()
    retrieved_chunks, profile = retriever.retrieve(
        args.question,
        pdf_path=args.pdf,
        telemetry=retrieve_telemetry,
    )
    retrieval_ms = (time.perf_counter() - retrieve_start) * 1000

    prompt_start = time.perf_counter()
    user_prompt = build_user_prompt(args.question, retrieved_chunks, company_context=company_context)
    prompt_build_ms = (time.perf_counter() - prompt_start) * 1000

    generation_start = time.perf_counter()

    def emit_event(payload: dict) -> None:
        print(json.dumps(payload, ensure_ascii=False), flush=True)

    if args.stream:
        def on_token(token: str) -> None:
            emit_event({"type": "token", "token": token})

        if args.provider == "lmstudio":
            answer = stream_lmstudio_answer(settings, SYSTEM_PROMPT, user_prompt, on_token=on_token)
        else:
            answer = stream_openai_answer(settings, SYSTEM_PROMPT, user_prompt, on_token=on_token)
    else:
        sink = io.StringIO()
        with redirect_stdout(sink):
            if args.provider == "lmstudio":
                answer = stream_lmstudio_answer(settings, SYSTEM_PROMPT, user_prompt)
            else:
                answer = stream_openai_answer(settings, SYSTEM_PROMPT, user_prompt)
    generation_ms = (time.perf_counter() - generation_start) * 1000

    sources = []
    for chunk in retrieved_chunks:
        metadata = chunk.metadata or {}
        sources.append(
            {
                "title": metadata.get("title", "Untitled"),
                "source_type": metadata.get("source_type", "unknown"),
                "publication_date": metadata.get("publication_date", ""),
                "source_url": metadata.get("source_url", ""),
                "chunk_id": chunk.chunk_id,
                "score": chunk.adjusted_score,
            }
        )

    response = {
        "answer": answer,
        "sources": sources,
        "meta": {
            "provider": args.provider,
            "model_name": settings.lmstudio_model if args.provider == "lmstudio" else settings.openai_model,
            "company_context_used": bool(company_context),
            "top_k": len(retrieved_chunks),
            "dynamic_top_k": profile.dynamic_top_k,
            "timings_ms": {
                "parse_args_ms": round(parse_args_ms, 2),
                "settings_load_ms": round(settings_load_ms, 2),
                "retriever_init_ms": round(retriever_init_ms, 2),
                "retrieval_ms": round(retrieval_ms, 2),
                "prompt_build_ms": round(prompt_build_ms, 2),
                "generation_ms": round(generation_ms, 2),
                "retrieval_breakdown": retrieve_telemetry,
                "python_total_ms": round((time.perf_counter() - total_start) * 1000, 2),
            },
        },
    }
    if args.stream:
        emit_event({"type": "final", "payload": response})
    else:
        print(json.dumps(response, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)
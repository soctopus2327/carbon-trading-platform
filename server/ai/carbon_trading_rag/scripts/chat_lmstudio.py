from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import load_settings
from app.rag.lmstudio_backend import stream_lmstudio_answer
from app.rag.prompts import SYSTEM_PROMPT, build_user_prompt
from app.rag.retriever import HybridRetriever
from app.rag.source_formatter import format_sources


def parse_args():
    parser = argparse.ArgumentParser(description="Chat with the carbon advisory RAG using LM Studio.")
    parser.add_argument("--pdf", type=str, default=None, help="Optional local PDF path for temporary query-time reasoning.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = load_settings()
    retriever = HybridRetriever(settings)

    print("Carbon Advisory RAG (LM Studio)")
    print("Type 'exit' to quit.\n")

    while True:
        question = input("You: ").strip()
        if not question:
            continue
        if question.lower() in {"exit", "quit"}:
            break

        retrieved_chunks, _ = retriever.retrieve(question, pdf_path=args.pdf)
        user_prompt = build_user_prompt(question, retrieved_chunks)

        print("\nAssistant:\n")
        stream_lmstudio_answer(settings, SYSTEM_PROMPT, user_prompt)
        print(format_sources(retrieved_chunks))
        print("\n" + "-" * 80 + "\n")


if __name__ == "__main__":
    main()
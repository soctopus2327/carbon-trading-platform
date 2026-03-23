from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    project_root: Path
    corpus_dir: Path
    corpus_csv_path: Path
    corpus_urls_path: Path

    openai_api_key: str
    pinecone_api_key: str

    pinecone_index_name: str
    pinecone_namespace: str
    pinecone_cloud: str
    pinecone_region: str

    embedding_model: str
    embedding_dimensions: int
    openai_model: str

    lmstudio_base_url: str
    lmstudio_model: str

    chunk_size: int
    chunk_overlap: int
    top_k_min: int
    top_k_max: int
    request_timeout_seconds: int
    retrieval_candidate_multiplier: int


def load_settings() -> Settings:
    project_root = Path(__file__).resolve().parent.parent
    corpus_dir = project_root / "corpus"

    openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
    pinecone_api_key = os.getenv("PINECONE_API_KEY", "").strip()

    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY is missing in .env")
    if not pinecone_api_key:
        raise ValueError("PINECONE_API_KEY is missing in .env")

    return Settings(
        project_root=project_root,
        corpus_dir=corpus_dir,
        corpus_csv_path=corpus_dir / "corpus.csv",
        corpus_urls_path=corpus_dir / "corpus_urls.txt",
        openai_api_key=openai_api_key,
        pinecone_api_key=pinecone_api_key,
        pinecone_index_name=os.getenv("PINECONE_INDEX_NAME", "carbon-advisory-rag").strip(),
        pinecone_namespace=os.getenv("PINECONE_NAMESPACE", "carbon-corpus").strip(),
        pinecone_cloud=os.getenv("PINECONE_CLOUD", "aws").strip(),
        pinecone_region=os.getenv("PINECONE_REGION", "us-east-1").strip(),
        embedding_model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small").strip(),
        embedding_dimensions=int(os.getenv("EMBEDDING_DIMENSIONS", "1536")),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip(),
        lmstudio_base_url=os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234/v1").strip(),
        lmstudio_model=os.getenv("LMSTUDIO_MODEL", "").strip(),
        chunk_size=int(os.getenv("CHUNK_SIZE", "1000")),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "180")),
        top_k_min=int(os.getenv("TOP_K_MIN", "3")),
        top_k_max=int(os.getenv("TOP_K_MAX", "8")),
        request_timeout_seconds=int(os.getenv("REQUEST_TIMEOUT_SECONDS", "35")),
        retrieval_candidate_multiplier=int(os.getenv("RETRIEVAL_CANDIDATE_MULTIPLIER", "3")),
    )
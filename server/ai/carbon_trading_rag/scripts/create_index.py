from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import load_settings
from app.ingest.pinecone_store import ensure_index


def main() -> None:
    settings = load_settings()
    ensure_index(settings)
    print(f"Index ready: {settings.pinecone_index_name}")


if __name__ == "__main__":
    main()
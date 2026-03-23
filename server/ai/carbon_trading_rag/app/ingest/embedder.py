from __future__ import annotations

from openai import OpenAI

from app.config import Settings


class OpenAIEmbedder:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)

    def embed_texts(self, texts: list[str], batch_size: int = 100) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            kwargs = {
                "model": self.settings.embedding_model,
                "input": batch,
            }
            if self.settings.embedding_model.startswith("text-embedding-3"):
                kwargs["dimensions"] = self.settings.embedding_dimensions
            response = self.client.embeddings.create(**kwargs)
            vectors.extend([item.embedding for item in response.data])
        return vectors

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]
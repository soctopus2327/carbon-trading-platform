from __future__ import annotations

from types import SimpleNamespace

from app.ingest.embedder import OpenAIEmbedder


class _FakeEmbeddingsAPI:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        batch = kwargs["input"]
        data = [SimpleNamespace(embedding=[float(i), 1.0]) for i, _ in enumerate(batch)]
        return SimpleNamespace(data=data)


class _FakeOpenAIClient:
    def __init__(self, api_key=None):
        self.api_key = api_key
        self.embeddings = _FakeEmbeddingsAPI()


def test_embed_texts_uses_dimensions_for_text_embedding_3(monkeypatch):
    import app.ingest.embedder as module

    monkeypatch.setattr(module, "OpenAI", _FakeOpenAIClient)

    settings = SimpleNamespace(
        openai_api_key="k",
        embedding_model="text-embedding-3-small",
        embedding_dimensions=1536,
    )

    embedder = OpenAIEmbedder(settings)
    vectors = embedder.embed_texts(["a", "b"], batch_size=1)

    assert len(vectors) == 2
    assert all("dimensions" in call for call in embedder.client.embeddings.calls)


def test_embed_texts_omits_dimensions_for_non_v3_model(monkeypatch):
    import app.ingest.embedder as module

    monkeypatch.setattr(module, "OpenAI", _FakeOpenAIClient)

    settings = SimpleNamespace(
        openai_api_key="k",
        embedding_model="text-embedding-ada-002",
        embedding_dimensions=1536,
    )

    embedder = OpenAIEmbedder(settings)
    vectors = embedder.embed_texts(["a", "b", "c"], batch_size=2)

    assert len(vectors) == 3
    assert all("dimensions" not in call for call in embedder.client.embeddings.calls)


def test_embed_query_returns_first_vector(monkeypatch):
    import app.ingest.embedder as module

    monkeypatch.setattr(module, "OpenAI", _FakeOpenAIClient)

    settings = SimpleNamespace(
        openai_api_key="k",
        embedding_model="text-embedding-3-small",
        embedding_dimensions=1536,
    )

    embedder = OpenAIEmbedder(settings)
    vector = embedder.embed_query("hello")

    assert vector == [0.0, 1.0]

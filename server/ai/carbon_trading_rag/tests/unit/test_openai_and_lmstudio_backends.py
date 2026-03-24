from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.rag.lmstudio_backend import stream_lmstudio_answer
from app.rag.openai_backend import stream_openai_answer


class _FakeCompletionsAPI:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return [
            SimpleNamespace(choices=[]),
            SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="Hello "))]),
            SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=None))]),
            SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="world"))]),
        ]


class _FakeOpenAIClient:
    def __init__(self, api_key=None, base_url=None):
        self.api_key = api_key
        self.base_url = base_url
        self.chat = SimpleNamespace(completions=_FakeCompletionsAPI())


def test_stream_openai_answer_raises_for_missing_required_settings():
    with pytest.raises(ValueError):
        stream_openai_answer(
            settings=SimpleNamespace(openai_api_key="", openai_model="gpt"),
            system_prompt="sys",
            user_prompt="usr",
        )

    with pytest.raises(ValueError):
        stream_openai_answer(
            settings=SimpleNamespace(openai_api_key="key", openai_model=""),
            system_prompt="sys",
            user_prompt="usr",
        )


def test_stream_openai_answer_collects_and_streams_tokens(monkeypatch):
    import app.rag.openai_backend as module

    monkeypatch.setattr(module, "OpenAI", _FakeOpenAIClient)

    seen = []
    text = stream_openai_answer(
        settings=SimpleNamespace(openai_api_key="key", openai_model="gpt-test"),
        system_prompt="sys",
        user_prompt="usr",
        on_token=lambda t: seen.append(t),
    )

    assert text == "Hello world"
    assert seen == ["Hello ", "world"]


def test_stream_lmstudio_answer_raises_for_missing_model():
    with pytest.raises(ValueError):
        stream_lmstudio_answer(
            settings=SimpleNamespace(lmstudio_model="", lmstudio_base_url="http://localhost:1234/v1"),
            system_prompt="sys",
            user_prompt="usr",
        )


def test_stream_lmstudio_answer_collects_and_streams_tokens(monkeypatch):
    import app.rag.lmstudio_backend as module

    monkeypatch.setattr(module, "OpenAI", _FakeOpenAIClient)

    seen = []
    text = stream_lmstudio_answer(
        settings=SimpleNamespace(lmstudio_model="model-x", lmstudio_base_url="http://localhost:1234/v1"),
        system_prompt="sys",
        user_prompt="usr",
        on_token=lambda t: seen.append(t),
    )

    assert text == "Hello world"
    assert seen == ["Hello ", "world"]

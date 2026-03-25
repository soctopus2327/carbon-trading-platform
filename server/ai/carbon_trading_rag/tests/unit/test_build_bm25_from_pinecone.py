from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace


def _load_script_module():
    script_path = (
        Path(__file__).resolve().parents[2]
        / "scripts"
        / "build_bm25_from_pinecone.py"
    )
    spec = importlib.util.spec_from_file_location("build_bm25_from_pinecone", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_extract_next_token_supports_multiple_shapes():
    module = _load_script_module()

    assert module._extract_next_token({"pagination_token": "abc"}) == "abc"
    assert module._extract_next_token({"pagination": {"next": "n1"}}) == "n1"

    payload = SimpleNamespace(pagination=SimpleNamespace(next_page_token="n2"))
    assert module._extract_next_token(payload) == "n2"


def test_extract_ids_from_common_payload_shapes():
    module = _load_script_module()

    class Obj:
        def __init__(self, value):
            self.id = value

    assert module._extract_ids("id-1") == ["id-1"]
    assert module._extract_ids(["a", {"id": "b"}, Obj("c")]) == ["a", "b", "c"]
    assert sorted(module._extract_ids({"vectors": {"k1": {}, "k2": {}}})) == ["k1", "k2"]


def test_iter_ids_from_list_dedupes():
    module = _load_script_module()

    class FakeIndex:
        def list(self, namespace=None):
            assert namespace == "ns"
            yield ["id-1", "id-2"]
            yield ["id-2", "id-3"]

    ids = list(module._iter_ids_from_list(FakeIndex(), "ns"))

    assert ids == ["id-1", "id-2", "id-3"]


def test_iter_ids_from_list_paginated_uses_next_token():
    module = _load_script_module()

    pages = [
        {"ids": ["id-1", "id-2"], "pagination_token": "t1"},
        {"ids": ["id-2", "id-3"], "pagination_token": ""},
    ]

    class FakeIndex:
        def __init__(self):
            self.calls = 0

        def list_paginated(self, **kwargs):
            result = pages[self.calls]
            self.calls += 1
            return result

    ids = list(module._iter_ids_from_list_paginated(FakeIndex(), "ns", page_size=2))

    assert ids == ["id-1", "id-2", "id-3"]


def test_main_writes_bm25_file_from_metadata(monkeypatch, tmp_path):
    module = _load_script_module()

    output_path = tmp_path / "bm25_chunks.json"

    args = SimpleNamespace(
        namespace="ns",
        output=str(output_path),
        fetch_batch_size=2,
        max_vectors=0,
    )

    settings = SimpleNamespace(
        pinecone_namespace="ns",
        project_root=tmp_path,
    )

    class FakeIndex:
        def list(self, namespace=None):
            assert namespace == "ns"
            yield ["id-1", "id-2"]

        def fetch(self, ids, namespace=None):
            assert namespace == "ns"
            return {
                "vectors": {
                    "id-1": {"metadata": {"chunk_text": "Chunk A", "title": "A"}},
                    "id-2": {"metadata": {"chunk_text": "   ", "title": "B"}},
                }
            }

    monkeypatch.setattr(module, "parse_args", lambda: args)
    monkeypatch.setattr(module, "load_settings", lambda: settings)
    monkeypatch.setattr(module, "get_index", lambda _: FakeIndex())

    module.main()

    assert output_path.exists()
    payload = json.loads(output_path.read_text(encoding="utf-8"))
    assert len(payload) == 1
    assert payload[0]["chunk_id"] == "id-1"
    assert payload[0]["text"] == "Chunk A"
    assert payload[0]["metadata"]["title"] == "A"

from __future__ import annotations

from types import SimpleNamespace

import pytest


@pytest.fixture
def small_settings():
    return SimpleNamespace(
        chunk_size=50,
        chunk_overlap=10,
    )


@pytest.fixture
def medium_settings():
    return SimpleNamespace(
        chunk_size=80,
        chunk_overlap=15,
    )
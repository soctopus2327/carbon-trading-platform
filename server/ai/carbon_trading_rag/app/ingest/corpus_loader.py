from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from app.config import Settings


@dataclass
class SourceRecord:
    source_id: str
    url: str
    title: str = ""
    source_type: str = "web"
    region: str = "Unknown"
    publication_date: str = ""
    reliability_rating: str = "B"
    tags: list[str] = field(default_factory=list)
    extra_metadata: dict[str, Any] = field(default_factory=dict)


def _normalize_key(key: str) -> str:
    key = key.strip().lower()
    key = re.sub(r"[^a-z0-9]+", "_", key)
    return key.strip("_")


def _guess_source_type_from_url(url: str) -> str:
    lowered = url.lower()
    if lowered.endswith(".pdf"):
        return "pdf"
    if any(domain in lowered for domain in ["unfccc.int", ".gov", "europa.eu", "epa.gov", "gov.uk"]):
        return "government"
    if any(domain in lowered for domain in ["nature.com", "sciencedirect.com", "springer.com", "pmc.ncbi.nlm.nih.gov"]):
        return "journal"
    if any(domain in lowered for domain in ["ghgprotocol.org", "sciencebasedtargets.org", "icvcm.org", "vcmintegrity.org", "carbonplan.org"]):
        return "guideline"
    return "web"


def _split_tags(value: Any) -> list[str]:
    if value is None:
        return []
    text = str(value).strip()
    if not text:
        return []
    parts = re.split(r"[|,;]", text)
    return [part.strip() for part in parts if part.strip()]


def load_corpus_records(settings: Settings) -> list[SourceRecord]:
    if settings.corpus_csv_path.exists():
        return load_from_csv(settings.corpus_csv_path)
    if settings.corpus_urls_path.exists():
        return load_from_urls_txt(settings.corpus_urls_path)
    raise FileNotFoundError(
        f"Neither {settings.corpus_csv_path} nor {settings.corpus_urls_path} exists."
    )


def load_from_csv(csv_path: Path) -> list[SourceRecord]:
    df = pd.read_csv(csv_path)
    df.columns = [_normalize_key(column) for column in df.columns]

    url_col = next(
        (column for column in ["url", "link", "href", "source_url"] if column in df.columns),
        None,
    )
    if not url_col:
        raise ValueError("corpus.csv must contain a url-like column such as url/link/href/source_url")

    title_col = next((column for column in ["title", "name", "document_title"] if column in df.columns), None)
    id_col = next((column for column in ["id", "source_id", "doc_id"] if column in df.columns), None)
    source_type_col = next((column for column in ["source_type", "type", "document_type"] if column in df.columns), None)
    region_col = next((column for column in ["region", "jurisdiction", "location_scope"] if column in df.columns), None)
    date_col = next((column for column in ["publication_date", "date", "published", "published_at"] if column in df.columns), None)
    rating_col = next((column for column in ["reliability_rating", "rating", "credibility"] if column in df.columns), None)
    tags_col = next((column for column in ["tags", "taxonomy", "topics"] if column in df.columns), None)

    records: list[SourceRecord] = []
    for index, row in df.iterrows():
        url = str(row[url_col]).strip()
        if not url or url.lower() == "nan":
            continue

        source_id = str(row[id_col]).strip() if id_col else f"SRC-{index + 1:05d}"
        title = str(row[title_col]).strip() if title_col and pd.notna(row[title_col]) else ""
        source_type = (
            str(row[source_type_col]).strip()
            if source_type_col and pd.notna(row[source_type_col])
            else _guess_source_type_from_url(url)
        )
        region = str(row[region_col]).strip() if region_col and pd.notna(row[region_col]) else "Unknown"
        publication_date = (
            str(row[date_col]).strip() if date_col and pd.notna(row[date_col]) else ""
        )
        reliability_rating = (
            str(row[rating_col]).strip() if rating_col and pd.notna(row[rating_col]) else "B"
        )
        tags = _split_tags(row[tags_col]) if tags_col else []

        extra_metadata = {
            key: (None if pd.isna(value) else value)
            for key, value in row.to_dict().items()
            if key not in {
                url_col,
                title_col,
                id_col,
                source_type_col,
                region_col,
                date_col,
                rating_col,
                tags_col,
            }
        }

        records.append(
            SourceRecord(
                source_id=source_id,
                url=url,
                title=title,
                source_type=source_type,
                region=region,
                publication_date=publication_date,
                reliability_rating=reliability_rating or "B",
                tags=tags,
                extra_metadata=extra_metadata,
            )
        )
    return records


def load_from_urls_txt(urls_path: Path) -> list[SourceRecord]:
    records: list[SourceRecord] = []
    with urls_path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle, start=1):
            url = line.strip()
            if not url or url.startswith("#"):
                continue
            records.append(
                SourceRecord(
                    source_id=f"SRC-{index:05d}",
                    url=url,
                    source_type=_guess_source_type_from_url(url),
                )
            )
    return records
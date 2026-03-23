from __future__ import annotations

import mimetypes
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import fitz
import requests
import trafilatura
from bs4 import BeautifulSoup

from app.config import Settings


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)


@dataclass
class ExtractedDocument:
    title: str
    text: str
    content_type: str
    source_url: str
    final_url: str


def _clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _title_from_url(url: str) -> str:
    parsed = urlparse(url)
    path_name = Path(parsed.path).stem.replace("-", " ").replace("_", " ").strip()
    return path_name or parsed.netloc


def _extract_pdf_text_from_bytes(pdf_bytes: bytes) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    parts: list[str] = []
    try:
        for page in doc:
            parts.append(page.get_text("text"))
    finally:
        doc.close()
    return _clean_text("\n\n".join(parts))


def extract_local_pdf(pdf_path: str | Path) -> ExtractedDocument:
    pdf_path = Path(pdf_path)
    pdf_bytes = pdf_path.read_bytes()
    text = _extract_pdf_text_from_bytes(pdf_bytes)
    return ExtractedDocument(
        title=pdf_path.stem,
        text=text,
        content_type="application/pdf",
        source_url=str(pdf_path),
        final_url=str(pdf_path),
    )


def _extract_html_text(html: str) -> tuple[str, str]:
    downloaded = trafilatura.extract(
        html,
        include_links=False,
        include_tables=True,
        favor_precision=True,
        deduplicate=True,
    )
    soup = BeautifulSoup(html, "lxml")
    title = soup.title.get_text(strip=True) if soup.title else ""

    if downloaded and len(downloaded.strip()) >= 400:
        return title, _clean_text(downloaded)

    fallback_text = soup.get_text("\n", strip=True)
    return title, _clean_text(fallback_text)


def _extract_with_playwright(url: str, timeout_ms: int = 25000) -> tuple[str, str]:
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        raise RuntimeError("Playwright is not installed or not available.") from exc

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            html = page.content()
        finally:
            browser.close()

    return _extract_html_text(html)


def extract_from_url(url: str, settings: Settings, use_playwright_fallback: bool = True) -> ExtractedDocument:
    with requests.Session() as session:
        session.headers.update({"User-Agent": USER_AGENT})
        response = session.get(url, timeout=settings.request_timeout_seconds, allow_redirects=True)
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
        final_url = response.url

        guessed_mime, _ = mimetypes.guess_type(final_url)
        if not content_type and guessed_mime:
            content_type = guessed_mime

        if "pdf" in content_type or final_url.lower().endswith(".pdf"):
            text = _extract_pdf_text_from_bytes(response.content)
            return ExtractedDocument(
                title=_title_from_url(final_url),
                text=text,
                content_type="application/pdf",
                source_url=url,
                final_url=final_url,
            )

        html = response.text
        title, text = _extract_html_text(html)

        if use_playwright_fallback and len(text) < 400:
            try:
                pw_title, pw_text = _extract_with_playwright(final_url)
                if len(pw_text) > len(text):
                    title, text = pw_title, pw_text
            except Exception:
                pass

        return ExtractedDocument(
            title=title or _title_from_url(final_url),
            text=text,
            content_type=content_type or "text/html",
            source_url=url,
            final_url=final_url,
        )
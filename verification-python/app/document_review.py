import io
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

import cv2
import httpx
import numpy as np
import pypdfium2
import pytesseract
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
MAX_SIDE_PIXELS = 2000
MAX_PDF_PAGES = 3
PDF_SCALE = 200 / 72
OCR_TIMEOUT_SECONDS = 45
MIN_SIDE_PIXELS = 500
MIN_SHARPNESS = 40.0
MIN_CONFIDENCE = 45.0
MIN_WORDS = 5
NAME_MATCH_SCORE = 0.84
NAME_TOKEN_SCORE = 0.7
LEGAL_WORDS = {"SRL", "LTDA", "SA", "S", "R", "L", "A", "DE", "DEL", "LA", "Y"}
CREDENTIAL_ISSUERS = ("SIRETUR", "FEBOGUIT")

Alert = Literal[
    "INVALID_FORMAT",
    "LOW_RESOLUTION",
    "BLURRY",
    "UNREADABLE",
    "NAME_NOT_FOUND",
    "ISSUER_NOT_FOUND",
]
MANUAL_ALERTS = {"INVALID_FORMAT", "UNREADABLE"}


class DocumentToReview(BaseModel):
    id: UUID
    type: str = Field(min_length=2, max_length=40)
    url: str = Field(max_length=1000)
    expected_name: str = Field(alias="expectedName", min_length=2, max_length=200)


class ReviewCommand(BaseModel):
    review_id: UUID = Field(alias="reviewId")
    documents: list[DocumentToReview] = Field(min_length=1, max_length=10)


class DownloadError(Exception):
    def __init__(self, transient: bool):
        super().__init__("download failed")
        self.transient = transient


def normalize(text: str) -> list[str]:
    plain = unicodedata.normalize("NFKD", text)
    plain = "".join(char for char in plain if not unicodedata.combining(char))
    return re.findall(r"[A-Z0-9]+", plain.upper())


def name_score(expected: str, words: list[str]) -> float:
    tokens = [token for token in normalize(expected) if token not in LEGAL_WORDS]
    if not tokens or not words:
        return 0.0
    scores = [
        max(SequenceMatcher(None, token, word).ratio() for word in words)
        for token in tokens
    ]
    if min(scores) < NAME_TOKEN_SCORE:
        return round(min(scores), 2)
    return round(sum(scores) / len(scores), 2)


def load_pages(content: bytes) -> list[np.ndarray]:
    if content.startswith(b"%PDF"):
        document = pypdfium2.PdfDocument(content)
        try:
            pages = []
            for index in range(min(len(document), MAX_PDF_PAGES)):
                bitmap = document[index].render(scale=PDF_SCALE)
                pages.append(np.array(bitmap.to_pil().convert("L")))
            return pages
        finally:
            document.close()
    if not content.startswith((b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n")):
        raise ValueError("Unsupported file")
    with Image.open(io.BytesIO(content)) as image:
        if image.width * image.height > MAX_IMAGE_PIXELS:
            raise ValueError("Image too large")
        page = ImageOps.exif_transpose(image).convert("L")
        page.thumbnail((MAX_SIDE_PIXELS, MAX_SIDE_PIXELS))
        return [np.array(page)]


def read_text(page: np.ndarray) -> tuple[list[str], list[float]]:
    data = pytesseract.image_to_data(
        page,
        lang="spa",
        config="--psm 3",
        timeout=OCR_TIMEOUT_SECONDS,
        output_type=pytesseract.Output.DICT,
    )
    words: list[str] = []
    confidences: list[float] = []
    for text, confidence in zip(data["text"], data["conf"], strict=True):
        value = float(confidence)
        if text.strip() and value >= 0:
            words.extend(normalize(text))
            confidences.append(value)
    return words, confidences


def analyze_document(content: bytes, document_type: str, expected_name: str) -> dict:
    try:
        pages = load_pages(content)
    except (ValueError, OSError, UnidentifiedImageError, pypdfium2.PdfiumError):
        pages = []
    if not pages:
        return finding(False, 0.0, None, ["INVALID_FORMAT"])

    alerts: list[Alert] = []
    if min(min(page.shape[:2]) for page in pages) < MIN_SIDE_PIXELS:
        alerts.append("LOW_RESOLUTION")
    sharpness = max(float(cv2.Laplacian(page, cv2.CV_64F).var()) for page in pages)
    if sharpness < MIN_SHARPNESS:
        alerts.append("BLURRY")

    words: list[str] = []
    confidences: list[float] = []
    try:
        for page in pages:
            page_words, page_confidences = read_text(page)
            words.extend(page_words)
            confidences.extend(page_confidences)
    except (RuntimeError, pytesseract.TesseractError):
        return finding(False, 0.0, None, [*alerts, "UNREADABLE"])

    confidence = round(sum(confidences) / len(confidences), 1) if confidences else 0.0
    if len(words) < MIN_WORDS or confidence < MIN_CONFIDENCE:
        return finding(False, confidence, None, [*alerts, "UNREADABLE"])

    score = name_score(expected_name, words)
    if score < NAME_MATCH_SCORE:
        alerts.append("NAME_NOT_FOUND")
    if document_type == "GUIDE_CREDENTIAL" and not any(
        issuer in words for issuer in CREDENTIAL_ISSUERS
    ):
        alerts.append("ISSUER_NOT_FOUND")
    return finding(True, confidence, score, alerts)


def finding(
    readable: bool, confidence: float, score: float | None, alerts: list[Alert]
) -> dict:
    return {
        "readable": readable,
        "confidence": confidence,
        "nameScore": score,
        "alerts": alerts,
    }


def recommendation(findings: list[dict]) -> str:
    alerts = {alert for item in findings for alert in item["alerts"]}
    if alerts & MANUAL_ALERTS:
        return "MANUAL_REVIEW"
    return "HAS_ALERTS" if alerts else "NO_ALERTS"


class DocumentDownloader:
    def __init__(self, allowed_base_url: str):
        allowed = urlsplit(allowed_base_url)
        self._scheme = allowed.scheme
        self._host = allowed.hostname

    def _check(self, url: str) -> None:
        target = urlsplit(url)
        if target.scheme != self._scheme or target.hostname != self._host:
            raise DownloadError(transient=False)

    async def fetch(self, url: str) -> bytes:
        self._check(url)
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        raise DownloadError(transient=response.status_code >= 500)
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > MAX_FILE_BYTES:
                            raise DownloadError(transient=False)
                    return bytes(body)
        except httpx.HTTPError as error:
            raise DownloadError(transient=True) from error

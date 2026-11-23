import io
from uuid import uuid4

import pytest
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.config import Settings
from app.contracts import (
    DOCUMENT_REVIEW_TYPE,
    DOCUMENT_REVIEWED_TYPE,
    Envelope,
    PermanentDeliveryError,
    TransientDeliveryError,
)
from app.document_review import (
    DocumentDownloader,
    DownloadError,
    analyze_document,
    name_score,
    normalize,
    recommendation,
)
from app.handlers import build_handlers


def document_image(lines: list[str], blur: float = 0, kind: str = "PNG") -> bytes:
    image = Image.new("RGB", (1400, 900), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=48)
    for index, line in enumerate(lines):
        draw.text((80, 90 + index * 100), line, fill="black", font=font)
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))
    buffer = io.BytesIO()
    image.save(buffer, kind)
    return buffer.getvalue()


CREDENTIAL = [
    "ESTADO PLURINACIONAL DE BOLIVIA",
    "REGISTRO SIRETUR DE GUIAS",
    "NOMBRE ANA MARIA QUISPE MAMANI",
    "GUIA DE TURISMO EN LA PAZ",
]


class FakeMail:
    async def send(self, message) -> None:
        return None


class FakeFiles:
    def __init__(self, content=None, error=None):
        self.content = content
        self.error = error

    async def fetch(self, url: str) -> bytes:
        if self.error:
            raise self.error
        return self.content


def review_command():
    return Envelope(
        type=DOCUMENT_REVIEW_TYPE,
        data={
            "reviewId": str(uuid4()),
            "documents": [
                {
                    "id": str(uuid4()),
                    "type": "GUIDE_CREDENTIAL",
                    "url": "http://backend/file",
                    "expectedName": "Ana María Quispe Mamani",
                }
            ],
        },
    )


def handler(files):
    settings = Settings(rabbitmq_url="amqp://unused")
    return build_handlers(settings, FakeMail(), files)[DOCUMENT_REVIEW_TYPE]


def test_normalize_removes_accents():
    assert normalize("Ána María-Núñez") == ["ANA", "MARIA", "NUNEZ"]


def test_name_score_tolerates_small_ocr_errors():
    words = normalize("ANA MARlA QUISPE MAMANI")
    assert name_score("Ana María Quispe Mamani", words) >= 0.84


def test_name_score_rejects_a_different_person():
    words = normalize("CARLOS ALBERTO ROJAS FLORES")
    assert name_score("Ana María Quispe Mamani", words) < 0.84


def test_name_score_ignores_legal_suffixes():
    words = normalize("ANDES TREKKING")
    assert name_score("Andes Trekking S.R.L.", words) >= 0.84


def test_a_clear_matching_document_has_no_alerts():
    result = analyze_document(
        document_image(CREDENTIAL), "GUIDE_CREDENTIAL", "Ana María Quispe Mamani"
    )
    assert result["readable"] is True
    assert result["alerts"] == []
    assert "text" not in result


def test_a_different_name_raises_an_alert():
    result = analyze_document(
        document_image(CREDENTIAL), "GUIDE_CREDENTIAL", "Carlos Rojas Flores"
    )
    assert "NAME_NOT_FOUND" in result["alerts"]


def test_a_credential_without_known_issuer_raises_an_alert():
    lines = [line.replace("SIRETUR", "CLUB") for line in CREDENTIAL]
    result = analyze_document(
        document_image(lines), "GUIDE_CREDENTIAL", "Ana María Quispe Mamani"
    )
    assert "ISSUER_NOT_FOUND" in result["alerts"]


def test_a_blurred_document_is_sent_to_manual_review():
    result = analyze_document(
        document_image(CREDENTIAL, blur=14),
        "GUIDE_CREDENTIAL",
        "Ana María Quispe Mamani",
    )
    assert result["readable"] is False
    assert recommendation([result]) == "MANUAL_REVIEW"


def test_a_file_that_is_not_a_document_is_invalid():
    result = analyze_document(b"not a document", "TAX_ID", "Andes Trekking")
    assert result["alerts"] == ["INVALID_FORMAT"]


@pytest.mark.parametrize(
    ("alerts", "expected"),
    [
        ([], "NO_ALERTS"),
        (["NAME_NOT_FOUND"], "HAS_ALERTS"),
        (["UNREADABLE"], "MANUAL_REVIEW"),
    ],
)
def test_recommendation_never_approves_or_rejects(alerts, expected):
    assert recommendation([{"alerts": alerts}]) == expected


async def test_downloader_rejects_other_hosts():
    downloader = DocumentDownloader("http://backend:3010")
    with pytest.raises(DownloadError) as caught:
        await downloader.fetch("http://169.254.169.254/latest")
    assert caught.value.transient is False


async def test_review_reports_findings_without_text():
    send = handler(FakeFiles(content=document_image(CREDENTIAL)))
    outcome = await send(review_command())
    event = outcome.events[0]
    assert event.type == DOCUMENT_REVIEWED_TYPE
    assert event.data["recommendation"] == "NO_ALERTS"
    assert "text" not in event.data["documents"][0]


async def test_a_backend_outage_can_be_retried():
    send = handler(FakeFiles(error=DownloadError(transient=True)))
    with pytest.raises(TransientDeliveryError):
        await send(review_command())


async def test_an_invalid_link_is_not_retried():
    send = handler(FakeFiles(error=DownloadError(transient=False)))
    with pytest.raises(PermanentDeliveryError):
        await send(review_command())

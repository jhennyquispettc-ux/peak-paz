from uuid import uuid4

import aiosmtplib
import pytest
from pydantic import ValidationError

from app.config import Settings
from app.contracts import (
    EMAIL_FAILED_TYPE,
    EMAIL_SEND_TYPE,
    EMAIL_SENT_TYPE,
    Envelope,
    PermanentDeliveryError,
    TransientDeliveryError,
)
from app.email_sender import EmailCommand, render_email
from app.handlers import build_handlers

TOKEN = "a" * 64


def payload(**overrides):
    return {
        "userId": str(uuid4()),
        "nonce": "b" * 64,
        "to": "ana@example.com",
        "firstName": "Ana",
        "language": "es",
        "link": f"http://localhost:5173/verificar-correo#token={TOKEN}",
        "expiresInMinutes": 30,
        "deliveryId": str(uuid4()),
        **overrides,
    }


class FakeMail:
    def __init__(self, error: Exception | None = None):
        self.error = error
        self.sent = []

    async def send(self, message) -> None:
        if self.error:
            raise self.error
        self.sent.append(message)


def handler(mail):
    settings = Settings(rabbitmq_url="amqp://unused")
    return build_handlers(settings, mail)[EMAIL_SEND_TYPE]


def bodies(message):
    return (
        message.get_body(("plain",)).get_content(),
        message.get_body(("html",)).get_content(),
    )


def test_email_is_rendered_in_the_user_language():
    spanish = render_email(EmailCommand(**payload()), "Peak <a@b.c>")
    english = render_email(
        EmailCommand(**payload(language="en")), "Peak <a@b.c>"
    )
    assert spanish["Subject"] == "Confirma tu correo en Peak Paz"
    assert english["Subject"] == "Confirm your email on Peak Paz"
    assert f"token={TOKEN}" in bodies(spanish)[0]
    assert f"token={TOKEN}" in bodies(english)[1]


def test_email_escapes_the_name():
    message = render_email(
        EmailCommand(**payload(firstName="<b>Ana & Juan</b>")), "Peak <a@b.c>"
    )
    html = bodies(message)[1]
    assert "<b>Ana" not in html
    assert "&lt;b&gt;Ana &amp; Juan" in html


@pytest.mark.parametrize(
    "overrides",
    [
        {"firstName": "Ana\r\nBcc: x@example.com"},
        {"to": "not-an-email"},
        {"link": "javascript:alert(1)"},
        {"language": "fr"},
    ],
)
def test_email_rejects_unsafe_commands(overrides):
    with pytest.raises(ValidationError):
        EmailCommand(**payload(**overrides))


async def test_sends_once_and_reports_the_same_delivery_twice():
    mail = FakeMail()
    send = handler(mail)
    command = Envelope(type=EMAIL_SEND_TYPE, data=payload())
    first = await send(command)
    second = await send(command)
    assert len(mail.sent) == 1
    assert first.events[0].type == EMAIL_SENT_TYPE
    assert second.events[0].type == EMAIL_SENT_TYPE
    assert first.events[0].data["nonce"] == "b" * 64


async def test_connection_problems_can_be_retried():
    send = handler(FakeMail(aiosmtplib.SMTPConnectError("down")))
    with pytest.raises(TransientDeliveryError) as caught:
        await send(Envelope(type=EMAIL_SEND_TYPE, data=payload()))
    assert caught.value.failure_event.type == EMAIL_FAILED_TYPE


async def test_a_rejected_recipient_is_not_retried():
    refused = aiosmtplib.SMTPRecipientsRefused(
        [aiosmtplib.SMTPRecipientRefused(550, "no", "ana@example.com")]
    )
    send = handler(FakeMail(refused))
    with pytest.raises(PermanentDeliveryError):
        await send(Envelope(type=EMAIL_SEND_TYPE, data=payload()))


async def test_a_temporary_rejection_is_retried():
    refused = aiosmtplib.SMTPRecipientsRefused(
        [aiosmtplib.SMTPRecipientRefused(451, "later", "ana@example.com")]
    )
    send = handler(FakeMail(refused))
    with pytest.raises(TransientDeliveryError):
        await send(Envelope(type=EMAIL_SEND_TYPE, data=payload()))

from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from html import escape
from typing import Literal, Protocol
from urllib.parse import unquote, urlsplit
from uuid import UUID

import aiosmtplib
from pydantic import BaseModel, Field, field_validator

from app.config import Settings


class EmailCommand(BaseModel):
    user_id: UUID = Field(alias="userId")
    nonce: str = Field(min_length=16, max_length=64)
    to: str = Field(pattern=r"^[^@\s]+@[^@\s]+$", max_length=160)
    first_name: str = Field(alias="firstName", min_length=1, max_length=80)
    language: Literal["es", "en"]
    link: str = Field(max_length=500)
    expires_in_minutes: int = Field(alias="expiresInMinutes", ge=1, le=1440)
    delivery_id: str = Field(alias="deliveryId", min_length=1, max_length=100)

    @field_validator("link")
    @classmethod
    def link_must_be_http(cls, value: str) -> str:
        if urlsplit(value).scheme not in {"http", "https"}:
            raise ValueError("The link must use http or https")
        return value

    @field_validator("first_name")
    @classmethod
    def name_must_be_one_line(cls, value: str) -> str:
        if "\r" in value or "\n" in value:
            raise ValueError("The name must fit in one line")
        return value


COPY = {
    "es": {
        "subject": "Confirma tu correo en Peak Paz",
        "title": "Tu siguiente camino empieza aquí",
        "hello": "Hola, {name}.",
        "body": "Confirma tu correo para completar tu cuenta en Peak Paz.",
        "action": "Confirmar mi correo",
        "note": (
            "Este enlace vence en {minutes} minutos y solo se puede utilizar "
            "una vez. Si no creaste esta cuenta, puedes ignorar este mensaje."
        ),
    },
    "en": {
        "subject": "Confirm your email on Peak Paz",
        "title": "Your next trail starts here",
        "hello": "Hi, {name}.",
        "body": "Confirm your email to complete your Peak Paz account.",
        "action": "Confirm my email",
        "note": (
            "This link expires in {minutes} minutes and can be used only "
            "once. If you did not create this account, you can ignore this "
            "message."
        ),
    },
}


def render_email(command: EmailCommand, sender: str) -> EmailMessage:
    copy = COPY[command.language]
    hello = copy["hello"].format(name=command.first_name)
    note = copy["note"].format(minutes=command.expires_in_minutes)
    message = EmailMessage()
    message["Subject"] = copy["subject"]
    message["From"] = sender
    message["To"] = formataddr((command.first_name, command.to))
    message["Message-ID"] = make_msgid(
        idstring=command.delivery_id, domain="peakpaz.local"
    )
    message.set_content(
        "\n\n".join(
            [
                copy["title"],
                hello,
                copy["body"],
                f"{copy['action']}: {command.link}",
                note,
            ]
        )
    )
    message.add_alternative(
        (
            f"<h1>{escape(copy['title'])}</h1>"
            f"<p>{escape(hello)}</p>"
            f"<p>{escape(copy['body'])}</p>"
            f'<p><a href="{escape(command.link, quote=True)}">'
            f"{escape(copy['action'])}</a></p>"
            f"<p>{escape(note)}</p>"
        ),
        subtype="html",
    )
    return message


class MailSender(Protocol):
    async def send(self, message: EmailMessage) -> None: ...


class SmtpSender:
    def __init__(self, settings: Settings):
        url = urlsplit(settings.smtp_url)
        self._hostname = url.hostname or "localhost"
        self._use_tls = url.scheme == "smtps"
        self._port = url.port or (465 if self._use_tls else 25)
        self._username = unquote(url.username) if url.username else None
        self._password = unquote(url.password) if url.password else None
        self._timeout = settings.smtp_timeout_seconds

    async def send(self, message: EmailMessage) -> None:
        await aiosmtplib.send(
            message,
            hostname=self._hostname,
            port=self._port,
            use_tls=self._use_tls,
            username=self._username,
            password=self._password,
            timeout=self._timeout,
        )

import json
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.broker import attempts_of
from app.config import Settings
from app.contracts import ATTEMPTS_HEADER, PING_TYPE, PONG_TYPE, Envelope
from app.handlers import build_handlers


class UnusedMail:
    async def send(self, message) -> None:
        raise AssertionError("Mail must not be sent")


def test_envelope_uses_the_shared_json_names():
    command = Envelope(type=PING_TYPE, correlation_id=uuid4())
    body = json.loads(command.to_bytes())
    assert set(body) == {
        "id",
        "type",
        "version",
        "occurredAt",
        "correlationId",
        "data",
    }


@pytest.mark.parametrize(
    "body",
    [
        "not json",
        '{"type":"system.ping","version":2}',
        '{"type":"system.ping","version":1,"extra":true}',
        '{"version":1}',
    ],
)
def test_envelope_rejects_invalid_messages(body):
    with pytest.raises(ValidationError):
        Envelope.model_validate_json(body)


async def test_ping_answers_with_the_command_id():
    settings = Settings(rabbitmq_url="amqp://unused")
    command = Envelope(type=PING_TYPE)
    outcome = await build_handlers(settings, UnusedMail())[PING_TYPE](command)
    assert outcome.reply.type == PONG_TYPE
    assert outcome.reply.correlation_id == command.id
    assert outcome.reply.data["service"] == settings.service_name


@pytest.mark.parametrize(
    ("headers", "expected"),
    [
        (None, 1),
        ({}, 1),
        ({ATTEMPTS_HEADER: 3}, 3),
        ({ATTEMPTS_HEADER: "3"}, 1),
        ({ATTEMPTS_HEADER: 0}, 1),
    ],
)
def test_attempts_are_read_safely(headers, expected):
    assert attempts_of(headers) == expected

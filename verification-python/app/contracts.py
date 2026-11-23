from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

EXCHANGE = "peakpaz.verification"
DEAD_EXCHANGE = "peakpaz.verification.dead"
RETRY_EXCHANGE = "peakpaz.verification.retry"
COMMANDS_QUEUE = "verification.commands"
DEAD_COMMANDS_QUEUE = "verification.commands.dead"
RETRY_QUEUE = "verification.commands.retry"
EVENTS_QUEUE = "backend.verification.events"
COMMAND_BINDING = "command.#"
EVENT_BINDING = "event.#"
PING_ROUTING_KEY = "command.system.ping"
PING_TYPE = "system.ping"
PONG_TYPE = "system.pong"
EMAIL_SEND_TYPE = "email.send"
EMAIL_SENT_TYPE = "email.sent"
EMAIL_FAILED_TYPE = "email.failed"
DOCUMENT_REVIEW_TYPE = "document.review"
DOCUMENT_REVIEWED_TYPE = "document.reviewed"
DOCUMENT_REVIEW_FAILED_TYPE = "document.review_failed"
ATTEMPTS_HEADER = "x-attempts"
MAX_ATTEMPTS = 5
RETRY_DELAY_MS = 5000


class Envelope(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: UUID = Field(default_factory=uuid4)
    type: str = Field(min_length=3, max_length=100)
    version: Literal[1] = 1
    occurred_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), alias="occurredAt"
    )
    correlation_id: UUID | None = Field(default=None, alias="correlationId")
    data: dict[str, Any] = Field(default_factory=dict)

    def to_bytes(self) -> bytes:
        return self.model_dump_json(by_alias=True).encode()


@dataclass
class Outcome:
    reply: Envelope | None = None
    events: list[Envelope] = field(default_factory=list)


class TransientDeliveryError(Exception):
    def __init__(self, failure_event: Envelope):
        super().__init__(failure_event.type)
        self.failure_event = failure_event


class PermanentDeliveryError(Exception):
    def __init__(self, failure_event: Envelope):
        super().__init__(failure_event.type)
        self.failure_event = failure_event

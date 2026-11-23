from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field

EXCHANGE = "peakpaz.verification"
DEAD_EXCHANGE = "peakpaz.verification.dead"
COMMANDS_QUEUE = "verification.commands"
DEAD_COMMANDS_QUEUE = "verification.commands.dead"
COMMAND_BINDING = "command.#"
PING_ROUTING_KEY = "command.system.ping"
PING_TYPE = "system.ping"
PONG_TYPE = "system.pong"


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

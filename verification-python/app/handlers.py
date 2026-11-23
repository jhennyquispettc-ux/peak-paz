from collections.abc import Awaitable, Callable

from app.config import Settings
from app.contracts import PING_TYPE, PONG_TYPE, Envelope

Handler = Callable[[Envelope], Awaitable[Envelope | None]]


def build_handlers(settings: Settings) -> dict[str, Handler]:
    async def ping(command: Envelope) -> Envelope:
        return Envelope(
            type=PONG_TYPE,
            correlation_id=command.id,
            data={
                "service": settings.service_name,
                "version": settings.service_version,
            },
        )

    return {PING_TYPE: ping}

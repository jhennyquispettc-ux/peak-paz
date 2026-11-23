import asyncio
import logging

import aio_pika
from aio_pika.abc import (
    AbstractIncomingMessage,
    AbstractRobustChannel,
    AbstractRobustConnection,
)
from aio_pika.exceptions import AMQPConnectionError

from app.config import Settings
from app.contracts import (
    COMMAND_BINDING,
    COMMANDS_QUEUE,
    DEAD_COMMANDS_QUEUE,
    DEAD_EXCHANGE,
    EXCHANGE,
    Envelope,
)
from app.handlers import Handler

logger = logging.getLogger(__name__)


class UnknownCommandError(Exception):
    pass


async def declare_topology(channel: AbstractRobustChannel):
    exchange = await channel.declare_exchange(
        EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True
    )
    dead_exchange = await channel.declare_exchange(
        DEAD_EXCHANGE, aio_pika.ExchangeType.FANOUT, durable=True
    )
    dead_queue = await channel.declare_queue(DEAD_COMMANDS_QUEUE, durable=True)
    await dead_queue.bind(dead_exchange)
    queue = await channel.declare_queue(
        COMMANDS_QUEUE,
        durable=True,
        arguments={"x-dead-letter-exchange": DEAD_EXCHANGE},
    )
    await queue.bind(exchange, COMMAND_BINDING)
    return queue


class Broker:
    def __init__(self, settings: Settings, handlers: dict[str, Handler]):
        self._settings = settings
        self._handlers = handlers
        self._connection: AbstractRobustConnection | None = None
        self._channel: AbstractRobustChannel | None = None
        self._task: asyncio.Task | None = None
        self._consuming = False

    @property
    def connected(self) -> bool:
        return (
            self._consuming
            and self._connection is not None
            and not self._connection.is_closed
            and self._channel is not None
            and not self._channel.is_closed
        )

    def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
        if self._connection:
            await self._connection.close()
        self._consuming = False

    async def _run(self) -> None:
        while True:
            try:
                self._connection = await aio_pika.connect_robust(
                    self._settings.rabbitmq_url
                )
                break
            except (AMQPConnectionError, OSError):
                logger.warning("RabbitMQ is not available yet")
                await asyncio.sleep(self._settings.reconnect_seconds)
        self._channel = await self._connection.channel()
        await self._channel.set_qos(prefetch_count=self._settings.prefetch_count)
        queue = await declare_topology(self._channel)
        await queue.consume(self._on_message)
        self._consuming = True
        logger.info("Consuming %s", COMMANDS_QUEUE)

    async def _on_message(self, message: AbstractIncomingMessage) -> None:
        try:
            async with message.process(requeue=False):
                command = Envelope.model_validate_json(message.body)
                handler = self._handlers.get(command.type)
                if handler is None:
                    raise UnknownCommandError(command.type)
                reply = await handler(command)
                if reply is not None and message.reply_to:
                    await self._reply(reply, message)
        except Exception as error:
            logger.warning(
                "Message %s moved to %s: %s",
                message.message_id,
                DEAD_COMMANDS_QUEUE,
                type(error).__name__,
            )

    async def _reply(
        self, reply: Envelope, message: AbstractIncomingMessage
    ) -> None:
        await self._channel.default_exchange.publish(
            aio_pika.Message(
                reply.to_bytes(),
                content_type="application/json",
                message_id=str(reply.id),
                correlation_id=message.correlation_id,
            ),
            routing_key=message.reply_to,
            mandatory=False,
        )

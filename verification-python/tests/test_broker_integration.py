import asyncio
import os
from uuid import uuid4

import aio_pika
import httpx
import pytest

from app.contracts import (
    DEAD_COMMANDS_QUEUE,
    EXCHANGE,
    PING_ROUTING_KEY,
    PING_TYPE,
    PONG_TYPE,
    Envelope,
)

pytestmark = pytest.mark.skipif(
    "RABBITMQ_URL" not in os.environ, reason="RabbitMQ is not configured"
)


async def wait_until_healthy() -> None:
    async with httpx.AsyncClient() as client:
        for _ in range(100):
            response = await client.get("http://127.0.0.1:3030/health")
            if response.status_code == 200:
                return
            await asyncio.sleep(0.1)
    raise AssertionError("The service did not connect to RabbitMQ")


async def test_ping_round_trip_through_rabbitmq():
    await wait_until_healthy()
    connection = await aio_pika.connect(os.environ["RABBITMQ_URL"])
    async with connection:
        channel = await connection.channel()
        replies = await channel.declare_queue(exclusive=True)
        exchange = await channel.get_exchange(EXCHANGE)
        command = Envelope(type=PING_TYPE)
        await exchange.publish(
            aio_pika.Message(
                command.to_bytes(),
                correlation_id=str(command.id),
                reply_to=replies.name,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=PING_ROUTING_KEY,
        )
        message = await replies.get(timeout=5, fail=False)
        for _ in range(50):
            if message:
                break
            await asyncio.sleep(0.1)
            message = await replies.get(timeout=5, fail=False)
        assert message is not None
        await message.ack()
        reply = Envelope.model_validate_json(message.body)
        assert reply.type == PONG_TYPE
        assert reply.correlation_id == command.id


@pytest.mark.parametrize(
    "body",
    [
        b"not json",
        Envelope(type="system.unknown").to_bytes(),
    ],
)
async def test_bad_messages_go_to_the_dead_letter_queue(body):
    await wait_until_healthy()
    connection = await aio_pika.connect(os.environ["RABBITMQ_URL"])
    async with connection:
        channel = await connection.channel()
        dead = await channel.get_queue(DEAD_COMMANDS_QUEUE)
        exchange = await channel.get_exchange(EXCHANGE)
        message_id = str(uuid4())
        await exchange.publish(
            aio_pika.Message(body, message_id=message_id),
            routing_key=PING_ROUTING_KEY,
        )
        found = None
        for _ in range(50):
            candidate = await dead.get(timeout=5, fail=False)
            if candidate:
                await candidate.ack()
                if candidate.message_id == message_id:
                    found = candidate
                    break
            else:
                await asyncio.sleep(0.1)
        assert found is not None
        assert found.body == body

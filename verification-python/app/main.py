import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response

from app.broker import Broker
from app.config import Settings
from app.email_sender import SmtpSender
from app.handlers import build_handlers

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings()
    broker = Broker(settings, build_handlers(settings, SmtpSender(settings)))
    app.state.settings = settings
    app.state.broker = broker
    broker.start()
    yield
    await broker.stop()


app = FastAPI(title="Peak Paz Verification", lifespan=lifespan)


@app.get("/health")
async def health(request: Request, response: Response) -> dict[str, str]:
    connected = request.app.state.broker.connected
    if not connected:
        response.status_code = 503
    return {
        "status": "ok" if connected else "degraded",
        "broker": "connected" if connected else "disconnected",
        "version": request.app.state.settings.service_version,
    }

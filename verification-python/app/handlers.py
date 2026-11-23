from collections import OrderedDict
from collections.abc import Awaitable, Callable

import aiosmtplib

from app.config import Settings
from app.contracts import (
    EMAIL_FAILED_TYPE,
    EMAIL_SEND_TYPE,
    EMAIL_SENT_TYPE,
    PING_TYPE,
    PONG_TYPE,
    Envelope,
    Outcome,
    PermanentDeliveryError,
    TransientDeliveryError,
)
from app.email_sender import EmailCommand, MailSender, render_email

Handler = Callable[[Envelope], Awaitable[Outcome]]

DELIVERED_MEMORY = 5000
PERMANENT_ERRORS = (
    aiosmtplib.SMTPRecipientsRefused,
    aiosmtplib.SMTPSenderRefused,
    aiosmtplib.SMTPDataError,
)


def is_permanent(error: Exception) -> bool:
    if isinstance(error, aiosmtplib.SMTPRecipientsRefused):
        return all(item.code >= 500 for item in error.recipients)
    if isinstance(error, PERMANENT_ERRORS):
        return error.code >= 500
    return False


def build_handlers(settings: Settings, mail: MailSender) -> dict[str, Handler]:
    delivered: OrderedDict[str, None] = OrderedDict()

    async def ping(command: Envelope) -> Outcome:
        return Outcome(
            reply=Envelope(
                type=PONG_TYPE,
                correlation_id=command.id,
                data={
                    "service": settings.service_name,
                    "version": settings.service_version,
                },
            )
        )

    async def send_email(command: Envelope) -> Outcome:
        email = EmailCommand.model_validate(command.data)
        identity = {"userId": str(email.user_id), "nonce": email.nonce}
        if email.delivery_id not in delivered:
            try:
                await mail.send(render_email(email, settings.mail_from))
            except (aiosmtplib.SMTPException, OSError, TimeoutError) as error:
                failure = Envelope(
                    type=EMAIL_FAILED_TYPE,
                    correlation_id=command.id,
                    data=identity,
                )
                if is_permanent(error):
                    raise PermanentDeliveryError(failure) from error
                raise TransientDeliveryError(failure) from error
            delivered[email.delivery_id] = None
            if len(delivered) > DELIVERED_MEMORY:
                delivered.popitem(last=False)
        return Outcome(
            events=[
                Envelope(
                    type=EMAIL_SENT_TYPE,
                    correlation_id=command.id,
                    data=identity,
                )
            ]
        )

    return {PING_TYPE: ping, EMAIL_SEND_TYPE: send_email}

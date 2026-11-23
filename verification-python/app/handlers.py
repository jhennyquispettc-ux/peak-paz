import asyncio
from collections import OrderedDict
from collections.abc import Awaitable, Callable

import aiosmtplib
from pydantic import ValidationError

from app.config import Settings
from app.contracts import (
    DOCUMENT_REVIEW_FAILED_TYPE,
    DOCUMENT_REVIEW_TYPE,
    DOCUMENT_REVIEWED_TYPE,
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
from app.document_review import (
    DocumentDownloader,
    DownloadError,
    ReviewCommand,
    analyze_document,
    recommendation,
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


def build_handlers(
    settings: Settings,
    mail: MailSender,
    downloader: DocumentDownloader | None = None,
) -> dict[str, Handler]:
    delivered: OrderedDict[str, None] = OrderedDict()
    files = downloader or DocumentDownloader(settings.document_base_url)
    ocr_slot = asyncio.Semaphore(1)

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

    async def review_documents(command: Envelope) -> Outcome:
        failure = Envelope(
            type=DOCUMENT_REVIEW_FAILED_TYPE,
            correlation_id=command.id,
            data={"reviewId": str(command.data.get("reviewId", ""))},
        )
        try:
            review = ReviewCommand.model_validate(command.data)
        except ValidationError as error:
            raise PermanentDeliveryError(failure) from error
        findings = []
        for document in review.documents:
            try:
                content = await files.fetch(document.url)
            except DownloadError as error:
                if error.transient:
                    raise TransientDeliveryError(failure) from error
                raise PermanentDeliveryError(failure) from error
            async with ocr_slot:
                result = await asyncio.to_thread(
                    analyze_document,
                    content,
                    document.type,
                    document.expected_name,
                )
            findings.append(
                {"documentId": str(document.id), "type": document.type, **result}
            )
        return Outcome(
            events=[
                Envelope(
                    type=DOCUMENT_REVIEWED_TYPE,
                    correlation_id=command.id,
                    data={
                        "reviewId": str(review.review_id),
                        "recommendation": recommendation(findings),
                        "documents": findings,
                    },
                )
            ]
        )

    return {
        PING_TYPE: ping,
        EMAIL_SEND_TYPE: send_email,
        DOCUMENT_REVIEW_TYPE: review_documents,
    }

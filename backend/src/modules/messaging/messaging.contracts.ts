export const EXCHANGE = 'peakpaz.verification';
export const DEAD_EXCHANGE = 'peakpaz.verification.dead';
export const COMMANDS_QUEUE = 'verification.commands';
export const DEAD_COMMANDS_QUEUE = 'verification.commands.dead';
export const EVENTS_QUEUE = 'backend.verification.events';
export const COMMAND_BINDING = 'command.#';
export const EVENT_BINDING = 'event.#';
export const PING_ROUTING_KEY = 'command.system.ping';
export const PING_TYPE = 'system.ping';
export const PONG_TYPE = 'system.pong';
export const EMAIL_SEND_TYPE = 'email.send';
export const EMAIL_SENT_TYPE = 'email.sent';
export const EMAIL_FAILED_TYPE = 'email.failed';
export const DOCUMENT_REVIEW_TYPE = 'document.review';
export const DOCUMENT_REVIEWED_TYPE = 'document.reviewed';
export const DOCUMENT_REVIEW_FAILED_TYPE = 'document.review_failed';
export const DIRECT_REPLY_QUEUE = 'amq.rabbitmq.reply-to';

export interface Envelope<T = Record<string, unknown>> {
  id: string;
  type: string;
  version: 1;
  occurredAt: string;
  correlationId: string | null;
  data: T;
}

export function parseEnvelope(body: Buffer): Envelope | null {
  try {
    const value = JSON.parse(body.toString()) as Partial<Envelope>;
    if (
      typeof value.id !== 'string' ||
      typeof value.type !== 'string' ||
      value.version !== 1 ||
      typeof value.data !== 'object' ||
      value.data === null
    ) {
      return null;
    }
    return value as Envelope;
  } catch {
    return null;
  }
}

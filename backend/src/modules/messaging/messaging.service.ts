import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import {
  COMMAND_BINDING,
  COMMANDS_QUEUE,
  DEAD_COMMANDS_QUEUE,
  DEAD_EXCHANGE,
  DIRECT_REPLY_QUEUE,
  Envelope,
  EVENT_BINDING,
  EVENTS_QUEUE,
  EXCHANGE,
  parseEnvelope,
  PING_ROUTING_KEY,
  PING_TYPE,
  PONG_TYPE,
} from './messaging.contracts.js';
import { MessagingPingDto, MessagingStatusDto } from './messaging.dto.js';
import { MessagingUnavailableException } from './messaging.exceptions.js';
import { WorkerWakeService } from './worker-wake.service.js';

const RECONNECT_MS = 3000;
const REPLY_TIMEOUT_MS = 5000;
const EVENT_PREFETCH = 10;

type EventHandler = (event: Envelope) => Promise<void>;

interface PendingReply {
  resolve: (reply: Envelope) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

@Injectable()
export class MessagingService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(MessagingService.name);
  private readonly pending = new Map<string, PendingReply>();
  private readonly eventHandlers = new Map<string, EventHandler>();
  private readonly url: string;
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(
    config: ConfigService,
    private readonly worker: WorkerWakeService,
  ) {
    this.url = config.get<string>('RABBITMQ_URL') ?? '';
  }

  onApplicationBootstrap(): void {
    if (this.url) void this.connect();
  }

  onEvent(type: string, handler: EventHandler): void {
    this.eventHandlers.set(type, handler);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.failPending();
    const connection = this.connection;
    this.connection = null;
    this.channel = null;
    await connection?.close().catch(() => undefined);
  }

  status(): MessagingStatusDto {
    return { configured: Boolean(this.url), connected: this.channel !== null };
  }

  async ping(): Promise<MessagingPingDto> {
    const channel = this.channel;
    if (!channel) throw new MessagingUnavailableException();
    const startedAt = Date.now();
    const command: Envelope = {
      id: randomUUID(),
      type: PING_TYPE,
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: null,
      data: {},
    };
    const reply = this.waitForReply(command.id);
    try {
      await this.publish(channel, PING_ROUTING_KEY, command, {
        replyTo: DIRECT_REPLY_QUEUE,
      });
    } catch {
      this.settle(command.id);
      throw new MessagingUnavailableException();
    }
    const pong = await reply;
    return {
      service: String(pong.data.service),
      version: String(pong.data.version),
      roundTripMs: Date.now() - startedAt,
    };
  }

  async sendCommand(
    type: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const channel = this.channel;
    if (!channel) throw new MessagingUnavailableException();
    const command: Envelope = {
      id: randomUUID(),
      type,
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: null,
      data,
    };
    try {
      await this.publish(channel, `command.${type}`, command);
    } catch {
      throw new MessagingUnavailableException();
    }
    this.worker.wake();
  }

  private publish(
    channel: ConfirmChannel,
    routingKey: string,
    command: Envelope,
    options: { replyTo?: string } = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      channel.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(command)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: command.id,
          correlationId: command.id,
          ...options,
        },
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }

  private waitForReply(id: string): Promise<Envelope> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new MessagingUnavailableException());
      }, REPLY_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  private settle(id: string): PendingReply | undefined {
    const entry = this.pending.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      this.pending.delete(id);
    }
    return entry;
  }

  private failPending(): void {
    for (const id of [...this.pending.keys()]) {
      this.settle(id)?.reject(new MessagingUnavailableException());
    }
  }

  private async connect(): Promise<void> {
    try {
      const connection = await amqp.connect(this.url);
      if (this.stopping) {
        await connection.close();
        return;
      }
      connection.on('error', (error: Error) =>
        this.logger.warn(`RabbitMQ connection error: ${error.message}`),
      );
      connection.on('close', () => this.onDisconnected(connection));
      this.connection = connection;
      const channel = await connection.createConfirmChannel();
      channel.on('error', (error: Error) =>
        this.logger.warn(`RabbitMQ channel error: ${error.message}`),
      );
      await this.declareTopology(channel);
      await channel.consume(
        DIRECT_REPLY_QUEUE,
        (message) => this.onReply(message),
        { noAck: true },
      );
      await channel.prefetch(EVENT_PREFETCH);
      await channel.consume(EVENTS_QUEUE, (message) => {
        if (message) void this.onEventMessage(channel, message);
      });
      this.channel = channel;
      this.logger.log('Connected to RabbitMQ');
    } catch {
      this.logger.warn('RabbitMQ is not available yet');
      this.scheduleReconnect();
    }
  }

  private async declareTopology(channel: ConfirmChannel): Promise<void> {
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertExchange(DEAD_EXCHANGE, 'fanout', { durable: true });
    await channel.assertQueue(DEAD_COMMANDS_QUEUE, { durable: true });
    await channel.bindQueue(DEAD_COMMANDS_QUEUE, DEAD_EXCHANGE, '');
    await channel.assertQueue(COMMANDS_QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': DEAD_EXCHANGE },
    });
    await channel.bindQueue(COMMANDS_QUEUE, EXCHANGE, COMMAND_BINDING);
    await channel.assertQueue(EVENTS_QUEUE, {
      durable: true,
      arguments: { 'x-dead-letter-exchange': DEAD_EXCHANGE },
    });
    await channel.bindQueue(EVENTS_QUEUE, EXCHANGE, EVENT_BINDING);
  }

  private async onEventMessage(
    channel: ConfirmChannel,
    message: ConsumeMessage,
  ): Promise<void> {
    const event = parseEnvelope(message.content);
    const handler = event ? this.eventHandlers.get(event.type) : undefined;
    try {
      if (!event || !handler) {
        channel.nack(message, false, false);
        return;
      }
      await handler(event);
      channel.ack(message);
    } catch (error) {
      this.logger.warn(
        `Event ${message.properties.messageId} failed: ${(error as Error).message}`,
      );
      try {
        channel.nack(message, false, !message.fields.redelivered);
      } catch {
        return;
      }
    }
  }

  private onReply(message: ConsumeMessage | null): void {
    if (!message) return;
    const reply = parseEnvelope(message.content);
    if (reply?.type !== PONG_TYPE || !reply.correlationId) return;
    this.settle(reply.correlationId)?.resolve(reply);
  }

  private onDisconnected(connection: ChannelModel): void {
    if (this.connection !== connection) return;
    this.connection = null;
    this.channel = null;
    this.failPending();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_MS);
    this.reconnectTimer.unref();
  }
}

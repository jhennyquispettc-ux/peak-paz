import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
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
  EXCHANGE,
  parseEnvelope,
  PING_ROUTING_KEY,
  PING_TYPE,
  PONG_TYPE,
} from './messaging.contracts.js';
import { MessagingPingDto, MessagingStatusDto } from './messaging.dto.js';
import { MessagingUnavailableException } from './messaging.exceptions.js';

const RECONNECT_MS = 3000;
const REPLY_TIMEOUT_MS = 5000;

interface PendingReply {
  resolve: (reply: Envelope) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

@Injectable()
export class MessagingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingService.name);
  private readonly pending = new Map<string, PendingReply>();
  private readonly url: string;
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(config: ConfigService) {
    this.url = config.get<string>('RABBITMQ_URL') ?? '';
  }

  onModuleInit(): void {
    if (this.url) void this.connect();
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
      await new Promise<void>((resolve, reject) => {
        channel.publish(
          EXCHANGE,
          PING_ROUTING_KEY,
          Buffer.from(JSON.stringify(command)),
          {
            persistent: true,
            contentType: 'application/json',
            messageId: command.id,
            correlationId: command.id,
            replyTo: DIRECT_REPLY_QUEUE,
          },
          (error) => (error ? reject(error) : resolve()),
        );
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

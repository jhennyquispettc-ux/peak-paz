import { ApiProperty } from '@nestjs/swagger';

export class MessagingStatusDto {
  @ApiProperty({ description: 'RABBITMQ_URL está configurada' })
  configured: boolean;

  @ApiProperty({ description: 'El backend está conectado a RabbitMQ' })
  connected: boolean;
}

export class MessagingPingDto {
  @ApiProperty({ example: 'verification-python' })
  service: string;

  @ApiProperty({ example: '0.1.0' })
  version: string;

  @ApiProperty({ example: 12, description: 'Milisegundos de ida y vuelta' })
  roundTripMs: number;
}

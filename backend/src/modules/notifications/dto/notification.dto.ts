import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Notification } from '../entities/notification.entity.js';
import { NotificationStatus } from '../notifications.enums.js';

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'true muestra solo los no leídos' })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  unread?: boolean;
}

export class NotificationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'BOOKING_ACCEPTED' })
  type: string;

  @ApiProperty({ example: 'Tu reserva PP-7K3M9QX2 fue aceptada' })
  subject: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ example: '/reservas/2f6a...', nullable: true })
  link: string | null;

  @ApiProperty({
    enum: NotificationStatus,
    description: 'Estado del correo: pendiente, enviado o fallido',
  })
  emailStatus: NotificationStatus;

  @ApiProperty({ nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(notification: Notification): NotificationDto {
    return {
      id: notification.id,
      type: notification.type,
      subject: notification.subject,
      body: notification.body,
      link: notification.link,
      emailStatus: notification.status,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}

export class NotificationPageDto {
  @ApiProperty({ type: [NotificationDto] })
  data: NotificationDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ example: 3, description: 'Avisos sin leer en total' })
  unread: number;
}

export class MarkAllReadDto {
  @ApiProperty({ example: 3 })
  updated: number;
}

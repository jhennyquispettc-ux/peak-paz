import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity.js';
import { Language, UserRole, UserStatus } from '../users.enums.js';

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ana.muller@example.com' })
  email: string;

  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'Müller' })
  lastName: string;

  @ApiProperty({ example: '+41 79 123 45 67', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'CH', nullable: true })
  country: string | null;

  @ApiProperty({ enum: Language })
  language: Language;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      language: user.language,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}

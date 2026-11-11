import { ApiProperty } from '@nestjs/swagger';

export class VerificationDocumentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'GUIDE_CREDENTIAL' })
  type: string;

  @ApiProperty({ example: '2027-06-30', nullable: true })
  expiresAt: string | null;

  @ApiProperty()
  uploadedAt: Date;

  static fromEntity(document: {
    id: string;
    type: string;
    expiresAt: string | null;
    uploadedAt: Date;
  }): VerificationDocumentDto {
    return {
      id: document.id,
      type: document.type,
      expiresAt: document.expiresAt,
      uploadedAt: document.uploadedAt,
    };
  }
}

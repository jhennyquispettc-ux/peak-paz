import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class OpenCaseDto {
  @IsUUID() userId: string;
  @IsEmail() @Length(3, 160) email: string;
  @IsString() @Length(1, 80) @Matches(/\S/) firstName: string;
  @IsIn(['TOURIST', 'GUIDE']) role: 'TOURIST' | 'GUIDE';
}
export class ConfirmEmailDto {
  @Matches(/^[a-f0-9]{64}$/) token: string;
}
export class DocumentDto {
  @IsUUID() id: string;
  @IsIn(['NATIONAL_ID', 'GUIDE_CREDENTIAL', 'FIRST_AID']) type: string;
  @IsOptional() @IsISO8601({ strict: true }) expiresAt: string | null;
}
export class SubmitReviewDto {
  @IsString() @Length(1, 80) @Matches(/\S/) firstName: string;
  @IsString() @Length(1, 80) @Matches(/\S/) lastName: string;
  @Matches(/^[0-9]{5,12}(-?[0-9A-Z]{1,3})?$/) nationalId: string;
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique((d: DocumentDto) => d.type)
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents: DocumentDto[];
}
export class DecideReviewDto {
  @IsIn(['APPROVED', 'REJECTED']) status: 'APPROVED' | 'REJECTED';
  @IsUUID() reviewerId: string;
  @ValidateIf(
    (d: DecideReviewDto) => d.status === 'REJECTED' || d.reason !== undefined,
  )
  @IsString()
  @Length(5, 500)
  @Matches(/\S/)
  reason?: string;
}

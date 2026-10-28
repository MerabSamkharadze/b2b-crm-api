/**
 * CreateActivityDto — CRM-ის "დღიურის" ჩანაწერი.
 *
 * აქტივობა სურვილისამებრ მიებმება კომპანიას, კონტაქტს ან გარიგებას.
 * ⚠️ ამჟამად ბაზა **არ** ითხოვს, რომ სულ ცოტა ერთი მშობელი იყოს —
 * "ობოლი" აქტივობა დასაშვებია. გასწორება სავარჯიშო #12-ია.
 */
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '../../../prisma-client.js';

export class CreateActivityDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiProperty({ example: 'სატელეფონო ზარი — ფასების განხილვა' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    example: '2026-11-05T14:00:00.000Z',
    description: 'დაგეგმილი დრო',
  })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dealId?: string;
}

/** ChangeStageDto — pipeline-ის ეტაპის ცვლილება (სავარჯიშო #07). */
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage } from '../../../prisma-client.js';

export class ChangeStageDto {
  @ApiProperty({ enum: DealStage })
  @IsEnum(DealStage)
  toStage: DealStage;

  @ApiPropertyOptional({ description: 'კომენტარი ისტორიისთვის' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'სავალდებულო LOST-ზე, აკრძალული WON-ზე' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lostReason?: string;

  /**
   * ოპტიმისტური კონკურენციის კონტროლი.
   *
   * ── Mechanism: კლიენტი ამბობს "ვიცი, რომ გარიგება PROPOSAL-ზეა და მინდა
   * NEGOTIATION-ში გადავიყვანო". თუ ამასობაში სხვამ უკვე შეცვალა ეტაპი,
   * განახლება უნდა ჩავარდეს 409-ით და არა ჩუმად გადააწეროს კოლეგის ცვლილება.
   * ამას "lost update problem" ჰქვია.
   */
  @ApiPropertyOptional({
    enum: DealStage,
    description: 'მიმდინარე ეტაპი კლიენტის ხედვით (lost update-ის დაცვა)',
  })
  @IsOptional()
  @IsEnum(DealStage)
  expectedFromStage?: DealStage;
}

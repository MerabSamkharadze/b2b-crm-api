/**
 * QueryDealsDto — გარიგებების ფილტრები.
 *
 * ეს DTO **სრულად დაწერილია** — სავარჯიშო #05 არის ამ ფილტრების Prisma-ს
 * `where`-ად გადათარგმნა (იხ. deals.service.ts → buildDealFilters).
 * ნიმუშად შეადარე QueryCompaniesDto-ს, სადაც ორივე ნაწილი გაკეთებულია.
 */
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage } from '../../../prisma-client.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

/** დასაშვები სორტირების ველების თეთრი სია (იხ. QueryCompaniesDto-ს კომენტარი). */
export const DEAL_SORT_FIELDS = [
  'createdAt',
  'amount',
  'expectedCloseDate',
  'stage',
] as const;
export type DealSortField = (typeof DEAL_SORT_FIELDS)[number];

export class QueryDealsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ძებნა სათაურში და კომპანიის სახელში' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /**
   * ეტაპების ფილტრი: `?stage=PROPOSAL&stage=NEGOTIATION`
   *
   * ── Mechanism: query string-ში ერთი პარამეტრი შეიძლება ერთხელ ან
   * რამდენჯერმე მოვიდეს. Express ერთ შემთხვევაში string-ს აბრუნებს,
   * მეორეში — მასივს. @Transform ამ განსხვავებას ასწორებს, რომ
   * service-ს ყოველთვის მასივი დახვდეს.
   */
  @ApiPropertyOptional({ enum: DealStage, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsEnum(DealStage, { each: true })
  stage?: DealStage[];

  @ApiPropertyOptional({ example: 1000, description: 'მინიმალური თანხა' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ example: 50000, description: 'მაქსიმალური თანხა' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  closeDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  closeDateTo?: string;

  @ApiPropertyOptional({ description: 'ფილტრი კომპანიით' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ enum: DEAL_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(DEAL_SORT_FIELDS)
  sortBy?: DealSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

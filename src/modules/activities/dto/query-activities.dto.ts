import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '../../../prisma-client.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryActivitiesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ActivityType })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  /**
   * ── Mechanism: query string-ში ყველაფერი string-ია — "false" არის
   * ჭეშმარიტი string! `Boolean("false") === true`. ამიტომ გარდაქმნა
   * ხელით უნდა გავწეროთ, თორემ `?completed=false` პირიქით იმუშავებდა.
   */
  @ApiPropertyOptional({ description: 'true = შესრულებული, false = დარჩენილი' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  completed?: boolean;
}

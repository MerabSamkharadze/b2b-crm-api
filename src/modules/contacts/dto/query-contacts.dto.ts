import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryContactsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ძებნა სახელში, გვარში და email-ში' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'ფილტრი კომპანიით' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

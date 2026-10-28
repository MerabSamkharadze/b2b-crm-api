/**
 * QueryCompaniesDto — სიის ფილტრები.
 *
 * ეს არის **დასრულებული მაგალითი**: ზუსტად ამ პრინციპით უნდა დაწერო
 * გარიგებების ფილტრები სავარჯიშო #05-ში (dto/query-deals.dto.ts).
 */
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyStatus } from '../../../prisma-client.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

/**
 * ⚠️ დასაშვები სორტირების ველების **თეთრი სია**.
 * WHY: თუ კლიენტს ნებისმიერი ველით სორტირების უფლებას მივცემთ, ის
 * `?sortBy=password`-ით შეძლებს ბაზის შიგთავსის ნაწილობრივ ამოცნობას
 * (სორტირების თანმიმდევრობიდან). ასევე არაინდექსირებულ ველზე სორტირება
 * მძიმე query-ია — ანუ ეს performance-ის დაცვაცაა.
 */
export const COMPANY_SORT_FIELDS = ['name', 'createdAt', 'status'] as const;
export type CompanySortField = (typeof COMPANY_SORT_FIELDS)[number];

export class QueryCompaniesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ძებნა სახელსა და დომენში' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: CompanyStatus })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional({ enum: COMPANY_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(COMPANY_SORT_FIELDS)
  sortBy?: CompanySortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

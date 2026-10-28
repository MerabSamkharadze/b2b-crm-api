/**
 * CreateCompanyDto — ახალი კომპანიის შექმნა.
 */
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyStatus } from '../../../prisma-client.js';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Georgia LLC' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  // ── Mechanism: domain-ის ნორმალიზება ვალიდაციამდე. "WWW.Acme.COM/" და
  // "acme.com" ერთი და იგივე კომპანიაა, მაგრამ ბაზის @unique მათ ორ
  // სხვადასხვა ჩანაწერად დაინახავდა. ნორმალიზების გარეშე დუბლიკატები გარდაუვალია.
  @ApiPropertyOptional({ example: 'acme.com' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/+$/, '')
      : value,
  )
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ example: 'Logistics' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string;

  @ApiPropertyOptional({
    example: 250,
    description: 'თანამშრომლების რაოდენობა',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;

  @ApiPropertyOptional({ enum: CompanyStatus, default: CompanyStatus.LEAD })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  /**
   * ვის ეკუთვნის კომპანია.
   *
   * ⚠️ უსაფრთხოება: SALES_REP-ს ამ ველის მითითება **არ** შეუძლია — service
   * მას უგულებელყოფს და მფლობელად თავად ავტორს დააყენებს. წინააღმდეგ
   * შემთხვევაში გამყიდველს სხვისი სახელით ჩანაწერის შექმნა შეეძლებოდა.
   */
  @ApiPropertyOptional({ description: 'მხოლოდ ADMIN/MANAGER-ისთვის' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

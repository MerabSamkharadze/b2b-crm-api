/** CreateDealDto — ახალი გარიგება. */
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage } from '../../../prisma-client.js';

export class CreateDealDto {
  @ApiProperty({ example: 'Acme — ERP ლიცენზიები 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  /**
   * თანხა — **string-ად**.
   *
   * ── Mechanism: რატომ string და არა number? JSON-ის number არის IEEE 754
   * float. დიდი ან ზუსტი თანხა (მაგ. 9007199254740993.55) უკვე **კლიენტის
   * მხარეს** კარგავს სიზუსტეს, ანუ სერვერამდე დამახინჯებული მოაღწევს.
   * string კი უდანაკარგოა და Prisma-ს Decimal-ში პირდაპირ ჯდება.
   *
   * @Transform რიცხვსაც იღებს (მოხერხებულობისთვის, Swagger-იდან ტესტირებაში),
   * მაგრამ უდანაკარგო ვარიანტი მხოლოდ string-ია.
   */
  @ApiProperty({
    type: String,
    example: '15000.00',
    description: 'ათწილადი string-ად',
  })
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
  @IsDecimal(
    { decimal_digits: '0,2', force_decimal: false },
    {
      message:
        'amount უნდა იყოს ათწილადი რიცხვი მაქსიმუმ 2 ციფრით (მაგ. "15000.00")',
    },
  )
  amount: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: DealStage, default: DealStage.LEAD })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  // ── Mechanism: @IsDateString ISO-8601 string-ს ითხოვს ("2026-03-01").
  // service-ში `new Date(...)`-ით გადავიყვანთ — DTO-ს დონეზე string-ად
  // დატოვება ნიშნავს, რომ არასწორი თარიღი ვალიდაციაზე იჭრება და არა
  // ბაზაში "Invalid Date"-ად ჩადის.
  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiProperty({ description: 'კომპანიის id (უნდა იყოს თქვენთვის ხილული)' })
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({ description: 'ძირითადი კონტაქტი ამ კომპანიიდან' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'მხოლოდ ADMIN/MANAGER-ისთვის' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

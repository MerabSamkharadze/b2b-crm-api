/**
 * PaginationQueryDto — ?page=2&limit=50 ყველა სიის endpoint-ისთვის.
 *
 * WHY ყოველთვის გვერდებით: `findMany()` ლიმიტის გარეშე ერთ დღეს 200 000
 * სტრიქონს ჩატვირთავს მეხსიერებაში და აპლიკაციას ჩააქცევს. ლიმიტი
 * აუცილებლად **server-side** უნდა იყოს და არა client-ის კეთილ ნებაზე.
 */
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  // ── Mechanism: query string-ის მნიშვნელობა ყოველთვის **string**-ია ("2").
  // @Type(() => Number) ეუბნება class-transformer-ს, რომ რიცხვად გარდაქმნას,
  // სანამ @IsInt შეამოწმებს. ამის გარეშე @IsInt ყოველთვის ჩავარდება.
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'გვერდის ნომერი',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Max(100) — დაცვა "?limit=999999"-სგან. ეს უსაფრთხოების ლიმიტია, არა კაპრიზი.
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

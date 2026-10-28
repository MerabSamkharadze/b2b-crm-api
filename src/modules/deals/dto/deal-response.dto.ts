/**
 * DealResponseDto — როგორ გამოიყურება გარიგება API-ის პასუხში.
 *
 * ── Mechanism (ფულის სერიალიზაცია — ექსპერიმენტულად შემოწმებული):
 * Prisma-ს Decimal-ს აქვს toJSON, ამიტომ `JSON.stringify` მას **string**-ად
 * აქცევს — მაგრამ "15000.5"-ად და არა "15000.50". ანუ ათწილადების
 * რაოდენობა არასტაბილურია და კლიენტს ფასების ფორმატირება უწევს.
 *
 * ამიტომ აქ ვაკეთებთ `toFixed(2)`-ს: ფული ყოველთვის ორი ათწილადით.
 *
 * ⚠️ რასაც **არ** უნდა გააკეთო:
 *   1. `Number(deal.amount)` — ზუსტად იმ float-ის პრობლემას აბრუნებს, რისგანაც
 *      Decimal-ით ვიცავთ თავს.
 *   2. `Decimal.prototype.toJSON`-ის გადაწერა — გლობალური ქცევის შეცვლა
 *      ბიბლიოთეკაში, რომელსაც სხვა კოდიც იყენებს. ასეთი "monkey patch"
 *      ერთ დღეს სრულიად სხვა ადგილას იფეთქებს.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Deal } from '../../../prisma-client.js';
import { DealStage } from '../../../prisma-client.js';

export class DealResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  /**
   * ⚠️ Swagger-ისთვის ტიპი **ხელით** ვუთითებთ.
   * WHY: @nestjs/swagger-ის CLI plugin-ი Decimal-ს ჩვეულებრივ ობიექტად
   * აღიქვამს და დოკუმენტაციაში უაზრო schema-ს აგენერირებს ({ d, e, s }).
   */
  @ApiProperty({ type: String, format: 'decimal', example: '15000.00' })
  amount: string;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ enum: DealStage })
  stage: DealStage;

  @ApiProperty({ example: 50 })
  probability: number;

  @ApiPropertyOptional({ nullable: true })
  expectedCloseDate: Date | null;

  @ApiPropertyOptional({ nullable: true })
  closedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lostReason: string | null;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional({ nullable: true })
  contactId: string | null;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  createdAt: Date;
}

/**
 * ── Mechanism: ეს არის DealResponseDto-ს "გაბრტყელებული" (plain) ვერსია.
 * WHY ორი ტიპი: კლასი Swagger-ს სჭირდება (დეკორატორები მხოლოდ კლასზე მუშაობს),
 * მაგრამ ფუნქცია რეალურად ჩვეულებრივ ობიექტს აბრუნებს და არა instance-ს.
 * ამ ტიპით ეს ნათლად ჩანს — და spread (`{ ...toDealResponse(d), company }`)
 * უსაფრთხოა, რადგან prototype, რომელიც დაიკარგებოდა, არც არსებობს.
 */
export type DealResponse = { [K in keyof DealResponseDto]: DealResponseDto[K] };

/** Prisma-ს entity → API-ის პასუხი. */
export function toDealResponse(deal: Deal): DealResponse {
  return {
    id: deal.id,
    title: deal.title,
    amount: deal.amount.toFixed(2),
    currency: deal.currency,
    stage: deal.stage,
    probability: deal.probability,
    expectedCloseDate: deal.expectedCloseDate,
    closedAt: deal.closedAt,
    lostReason: deal.lostReason,
    companyId: deal.companyId,
    contactId: deal.contactId,
    ownerId: deal.ownerId,
    createdAt: deal.createdAt,
  };
}

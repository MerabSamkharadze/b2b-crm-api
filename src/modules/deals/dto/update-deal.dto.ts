import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDealDto } from './create-deal.dto.js';

/**
 * UpdateDealDto.
 *
 * ── Mechanism: `stage` და `companyId` შეგნებულად ამოღებულია.
 * WHY stage: ეტაპის ცვლილება ჩვეულებრივი განახლება **არ არის** — მას
 * წესები აქვს, ისტორიაში იწერება და გვერდითი ეფექტები ახლავს. ამიტომ
 * მას ცალკე endpoint ემსახურება: PATCH /deals/:id/stage (სავარჯიშო #07).
 * თუ stage-ს აქაც დავტოვებდით, ყველა წესის გვერდის ავლა შეიძლებოდა.
 */
export class UpdateDealDto extends PartialType(
  OmitType(CreateDealDto, ['stage', 'companyId'] as const),
) {}

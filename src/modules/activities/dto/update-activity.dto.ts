import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto.js';

/** მშობლების (company/contact/deal) შეცვლა განახლებით არ ხდება. */
export class UpdateActivityDto extends PartialType(
  OmitType(CreateActivityDto, ['companyId', 'contactId', 'dealId'] as const),
) {}

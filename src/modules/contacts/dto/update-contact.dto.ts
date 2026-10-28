import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateContactDto } from './create-contact.dto.js';

/**
 * UpdateContactDto.
 *
 * ── Mechanism: companyId-ს აქ შეგნებულად **ვაშორებთ** (OmitType).
 * WHY: კონტაქტის სხვა კომპანიაში "გადატანა" არ არის უბრალო განახლება —
 * მას შეიძლება გარიგებებიც ჩამოყვეს და @@unique([companyId, email])
 * დაირღვეს. ასეთი ოპერაცია ცალკე endpoint-ს იმსახურებს.
 */
export class UpdateContactDto extends PartialType(
  OmitType(CreateContactDto, ['companyId'] as const),
) {}

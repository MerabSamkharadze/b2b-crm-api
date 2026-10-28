/**
 * UpdateCompanyDto.
 *
 * ── Mechanism: PartialType არის mapped type — ის CreateCompanyDto-ს ყველა
 * ველს optional-ად აქცევს, ვალიდაციის წესებისა და Swagger-ის მეტადატის შენახვით.
 * ხელით გადაწერა იგივეს გააკეთებდა, ოღონდ ორი ადგილის სინქრონიზაცია
 * მოგვიწევდა — და ერთი დღეს დაგვავიწყდებოდა.
 */
import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto.js';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

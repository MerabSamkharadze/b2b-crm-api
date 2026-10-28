/**
 * DealsService — pipeline-ის გული.
 *
 * აქ არის პროექტის სამი ყველაზე საინტერესო სავარჯიშო: ფილტრები (#05),
 * ეტაპების წესები (#06, helper-ში) და ეტაპის ცვლილება ისტორიით (#07).
 */
import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Role } from '../../prisma-client.js';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import {
  ownerScope,
  scopedWhereUnique,
} from '../../common/authorization/data-scope.helper.js';
import { paginate, toSkipTake } from '../../common/helper/pagination.helper.js';
import type { ChangeStageDto } from './dto/change-stage.dto.js';
import type { CreateDealDto } from './dto/create-deal.dto.js';
import type { QueryDealsDto } from './dto/query-deals.dto.js';
import type { UpdateDealDto } from './dto/update-deal.dto.js';
import { toDealResponse } from './dto/deal-response.dto.js';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ახალი გარიგება + ისტორიის პირველი ჩანაწერი.
   *
   * ── Mechanism ($transaction): ორი ჩაწერა უნდა მოხდეს **ერთად ან საერთოდ**.
   * თუ გარიგება შეიქმნა, ისტორია კი არა, აუდიტის კვალი თავიდანვე ხარვეზიანია.
   *
   * ⚠️ ოქროს წესი: transaction-ის შიგნით ყოველთვის `tx` გამოიყენე და არა
   * `this.prisma`. `this.prisma`-ზე გაკეთებული query **transaction-ის გარეთ**
   * სრულდება — rollback მას არ შეეხება და მონაცემები არათანმიმდევრული რჩება.
   */
  async create(actor: AuthUser, dto: CreateDealDto) {
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, ...ownerScope(actor) },
      select: { id: true },
    });

    if (!company) throw new NotFoundException('კომპანია ვერ მოიძებნა');

    // კონტაქტი, თუ მითითებულია, **იმავე კომპანიას** უნდა ეკუთვნოდეს.
    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: dto.contactId, companyId: dto.companyId },
        select: { id: true },
      });
      if (!contact) {
        throw new NotFoundException('კონტაქტი ამ კომპანიაში ვერ მოიძებნა');
      }
    }

    const ownerId = this.resolveOwnerId(actor, dto.ownerId);

    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          title: dto.title,
          amount: dto.amount, // Prisma string-ს Decimal-ად იღებს — უდანაკარგოდ
          ...(dto.currency ? { currency: dto.currency } : {}),
          ...(dto.stage ? { stage: dto.stage } : {}),
          ...(dto.probability !== undefined
            ? { probability: dto.probability }
            : {}),
          ...(dto.expectedCloseDate
            ? { expectedCloseDate: new Date(dto.expectedCloseDate) }
            : {}),
          companyId: dto.companyId,
          ...(dto.contactId ? { contactId: dto.contactId } : {}),
          ownerId,
        },
      });

      // ისტორიის "დაბადების" ჩანაწერი: fromStage = null.
      await tx.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStage: null,
          toStage: deal.stage,
          changedById: actor.id,
          note: 'გარიგება შეიქმნა',
        },
      });

      return toDealResponse(deal);
    });
  }

  /** სია — role-scope + ფილტრები + გვერდები. */
  async findAll(actor: AuthUser, query: QueryDealsDto) {
    const where: Prisma.DealWhereInput = {
      AND: [ownerScope(actor), this.buildDealFilters(query)],
    };

    const { skip, take } = toSkipTake(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip,
        take,
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.deal.count({ where }),
    ]);

    // amount → string (იხ. deal-response.dto.ts-ის კომენტარი ფულის შესახებ)
    return paginate(
      items.map((deal) => ({
        ...toDealResponse(deal),
        company: deal.company,
      })),
      total,
      query,
    );
  }

  /**
   * TODO: [Merab] #05 — გარიგებების ფილტრები
   *
   * GOAL:      გადათარგმნე QueryDealsDto → Prisma.DealWhereInput:
   *              • q            → OR: სათაური (contains, insensitive)
   *                               ან კომპანიის სახელი (ჩადგმული რელაციით)
   *              • stage[]      → { stage: { in: query.stage } }
   *              • minAmount/maxAmount → { amount: { gte, lte } }
   *              • closeDateFrom/To    → { expectedCloseDate: { gte, lte } }
   *              • companyId    → პირდაპირი დამთხვევა
   *
   * WHY:       ეს არის ყველაზე ხშირად გამოყენებადი ფუნქცია ნებისმიერ CRM-ში.
   *            ასევე კარგი შესაძლებლობაა, ნახო Prisma-ს დაგენერირებული SQL —
   *            ჩართე `log: ['query']` უკვე გვაქვს, უბრალოდ შეხედე ტერმინალს.
   *
   * HINT:      • ჩადგმული რელაციით ძებნა:
   *                { company: { name: { contains: q, mode: 'insensitive' } } }
   *            • თარიღი string-ია DTO-ში → `new Date(...)` გჭირდება.
   *            • ⚠️ `minAmount`-ს მხოლოდ მაშინ დაამატე where-ში, თუ ის
   *              მართლა მოვიდა. `{ gte: undefined }` Prisma-ში უვნებელია,
   *              მაგრამ `{ amount: {} }` ცარიელი ობიექტი — არა.
   *            • აწყობის ნიმუში: იხ. CompaniesService.findAll
   *
   * DONE WHEN: `GET /api/v1/deals?stage=WON&minAmount=10000` მხოლოდ შესაბამის
   *            გარიგებებს აბრუნებს (seed-ის მონაცემებზე შეამოწმე)
   *
   * ამჟამინდელი stub: ცარიელი ფილტრი — სია მუშაობს, ფილტრები უგულებელყოფილია.
   * ⚠️ role-scope ამაზე **არ** არის დამოკიდებული: ის findAll-ში ცალკე ემატება
   * AND-ით, ანუ ფილტრების არარსებობა უსაფრთხოებას არ არღვევს.
   */
  // oxlint-disable-next-line no-unused-vars -- `query` სავარჯიშო #05-ში გამოიყენება
  private buildDealFilters(query: QueryDealsDto): Prisma.DealWhereInput {
    return {};
  }

  async findOne(actor: AuthUser, id: string) {
    const deal = await this.prisma.deal.findFirstOrThrow({
      where: { id, ...ownerScope(actor) },
      include: {
        company: { select: { id: true, name: true, status: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      ...toDealResponse(deal),
      company: deal.company,
      contact: deal.contact,
    };
  }

  /** ეტაპების ისტორია — აუდიტის კვალი (იხ. DealStageHistory schema-ში). */
  async findStageHistory(actor: AuthUser, id: string) {
    // ჯერ ვრწმუნდებით, რომ გარიგება ხილულია — თორემ სხვისი ისტორია გაჟონავდა.
    await this.prisma.deal.findFirstOrThrow({
      where: { id, ...ownerScope(actor) },
      select: { id: true },
    });

    return this.prisma.dealStageHistory.findMany({
      where: { dealId: id },
      orderBy: { changedAt: 'asc' },
      include: {
        changedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateDealDto) {
    const { ownerId, amount, expectedCloseDate, contactId, ...rest } = dto;

    const deal = await this.prisma.deal.update({
      where: scopedWhereUnique(id, actor),
      data: {
        ...rest,
        ...(amount !== undefined ? { amount } : {}),
        ...(expectedCloseDate !== undefined
          ? { expectedCloseDate: new Date(expectedCloseDate) }
          : {}),
        ...(contactId !== undefined ? { contactId } : {}),
        ...(ownerId ? { ownerId: this.resolveOwnerId(actor, ownerId) } : {}),
      },
    });

    return toDealResponse(deal);
  }

  async remove(actor: AuthUser, id: string) {
    // ისტორია Cascade-ით წაიშლება (იხ. DealStageHistory.deal relation).
    await this.prisma.deal.delete({ where: scopedWhereUnique(id, actor) });
  }

  /**
   * TODO: [Merab] #07 — ეტაპის ცვლილება (პროექტის ყველაზე რთული სავარჯიშო)
   *
   * GOAL:      სრული ლოგიკა, ნაბიჯ-ნაბიჯ:
   *   1. წაიკითხე გარიგება scope-ით (findFirstOrThrow + ownerScope) — 404 სხვისზე.
   *   2. შეამოწმე `isTransitionAllowed(deal.stage, dto.toStage, actor.role)`
   *      (სავარჯიშო #06) → false-ზე BadRequestException გასაგები ტექსტით.
   *   3. ბიზნეს წესები:
   *        • LOST → `lostReason` **სავალდებულოა** (თორემ BadRequest)
   *        • WON  → `lostReason` **აკრძალულია**
   *        • WON/LOST → `closedAt = new Date()`; სხვა ეტაპზე → `closedAt = null`
   *        • probability → STAGE_PROBABILITY[toStage] (თუ ხელით არ მიუთითეს)
   *   4. ჩაწერა **$transaction-ში**: deal.update + dealStageHistory.create
   *   5. ოპტიმისტური კონტროლი: თუ `dto.expectedFromStage` მოვიდა, ჩასვი
   *      `where`-ში (`{ id, ownerId..., stage: dto.expectedFromStage }`).
   *      თუ ამასობაში ეტაპი შეიცვალა, Prisma აგდებს P2025-ს →
   *      PrismaExceptionFilter-ი 404-ს აბრუნებს. ⚠️ დაფიქრდი: აქ 404 სწორია
   *      თუ 409 ("კონფლიქტი")? სავარაუდოდ 409 — იპოვე გზა, როგორ გაარჩიო
   *      ეს შემთხვევა "არ არსებობს"-ისგან (მინიშნება: ნაბიჯი 1-ში უკვე
   *      წაიკითხე გარიგება, ანუ არსებობა დადასტურებულია).
   *
   * WHY:       ეს სავარჯიშო აერთიანებს ყველაფერს: ავტორიზაციას, ბიზნეს
   *            წესებს, ატომურობას, აუდიტს და კონკურენტულ წვდომას. სწორედ
   *            ასეთი კოდი განასხვავებს CRUD-ს რეალური სისტემისგან.
   *
   * HINT:      • create()-ში ზემოთ უკვე გაქვს $transaction-ის მუშა ნიმუში.
   *            • helper-ები მზადაა: isTransitionAllowed, isTerminal,
   *              STAGE_PROBABILITY — იმპორტი deal-stage.helper.js-დან.
   *            • არ დაგავიწყდეს `toDealResponse(deal)`-ით დაბრუნება.
   *
   * DONE WHEN: PATCH /api/v1/deals/:id/stage მუშაობს, GET .../stage-history
   *            ყველა გადასვლას აჩვენებს, WON-ზე closedAt ივსება, LOST-ზე
   *            lostReason-ის გარეშე 400 ბრუნდება
   */
  async changeStage(_actor: AuthUser, _id: string, _dto: ChangeStageDto) {
    throw new NotImplementedException(
      'სავარჯიშო #07: ეტაპის ცვლილება — იხ. docs/EXERCISES.md',
    );
  }

  private resolveOwnerId(actor: AuthUser, requested?: string): string {
    if (!requested || requested === actor.id) return actor.id;
    if (actor.role === Role.ADMIN) return requested;
    if (
      actor.role === Role.MANAGER &&
      actor.subordinateIds.includes(requested)
    ) {
      return requested;
    }
    throw new ForbiddenException(
      'მფლობელად მხოლოდ თავს ან გუნდის წევრს მიუთითებ',
    );
  }
}

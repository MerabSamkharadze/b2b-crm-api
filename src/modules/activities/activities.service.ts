/**
 * ActivitiesService — ზარები, შეხვედრები, დავალებები.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../prisma-client.js';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import {
  ownerScope,
  scopedWhereUnique,
} from '../../common/authorization/data-scope.helper.js';
import { paginate, toSkipTake } from '../../common/helper/pagination.helper.js';
import type { CreateActivityDto } from './dto/create-activity.dto.js';
import type { QueryActivitiesDto } from './dto/query-activities.dto.js';
import type { UpdateActivityDto } from './dto/update-activity.dto.js';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthUser, dto: CreateActivityDto) {
    // ყოველი მითითებული მშობელი ავტორისთვის ხილული უნდა იყოს.
    await this.assertParentsVisible(actor, dto);

    return this.prisma.activity.create({
      data: {
        type: dto.type,
        subject: dto.subject,
        ...(dto.notes ? { notes: dto.notes } : {}),
        ...(dto.dueAt ? { dueAt: new Date(dto.dueAt) } : {}),
        ...(dto.companyId ? { companyId: dto.companyId } : {}),
        ...(dto.contactId ? { contactId: dto.contactId } : {}),
        ...(dto.dealId ? { dealId: dto.dealId } : {}),
        ownerId: actor.id,
      },
    });
  }

  async findAll(actor: AuthUser, query: QueryActivitiesDto) {
    const filters: Prisma.ActivityWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      // ── Mechanism: "შესრულებულია" ნიშნავს completedAt !== null.
      // ცალკე boolean სვეტი არ გვჭირდება — თარიღი ორივე კითხვაზე პასუხობს
      // ("შესრულდა?" და "როდის?"). ერთი წყარო, ნაკლები არათანმიმდევრობა.
      ...(query.completed === true ? { completedAt: { not: null } } : {}),
      ...(query.completed === false ? { completedAt: null } : {}),
    };

    const where: Prisma.ActivityWhereInput = {
      AND: [ownerScope(actor), filters],
    };
    const { skip, take } = toSkipTake(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  /**
   * ვადაგადაცილებული დავალებები.
   *
   * ── Mechanism: ორი პირობა ერთად — ვადა გასულია **და** შესრულებული არ არის.
   * `completedAt: null`-ის გარეშე სიაში შესრულებული ძველი დავალებებიც მოხვდებოდა.
   * ეს query ზუსტად @@index([ownerId, dueAt])-ს იყენებს (იხ. schema).
   */
  async findOverdue(actor: AuthUser) {
    return this.prisma.activity.findMany({
      where: {
        AND: [
          ownerScope(actor),
          { dueAt: { lt: new Date() }, completedAt: null },
        ],
      },
      orderBy: { dueAt: 'asc' },
      take: 50,
      include: { deal: { select: { id: true, title: true } } },
    });
  }

  async findOne(actor: AuthUser, id: string) {
    return this.prisma.activity.findFirstOrThrow({
      where: { id, ...ownerScope(actor) },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateActivityDto) {
    // ── Mechanism: destructuring-ით `rest` ჩვეულებრივი ობიექტი ხდება.
    // `...dto`-ს პირდაპირ გაშლა DTO-ს **instance**-ს შლის — მუშაობს, მაგრამ
    // ტიპების დონეზე ბუნდოვანია; ასე განზრახვა ნათელია.
    const { dueAt, ...rest } = dto;

    return this.prisma.activity.update({
      where: scopedWhereUnique(id, actor),
      data: {
        ...rest,
        ...(dueAt !== undefined ? { dueAt: new Date(dueAt) } : {}),
      },
    });
  }

  /** დავალების დასრულება — completedAt-ის დადება მიმდინარე დროზე. */
  async complete(actor: AuthUser, id: string) {
    return this.prisma.activity.update({
      where: scopedWhereUnique(id, actor),
      data: { completedAt: new Date() },
    });
  }

  async remove(actor: AuthUser, id: string) {
    await this.prisma.activity.delete({ where: scopedWhereUnique(id, actor) });
  }

  /**
   * მშობელი ჩანაწერების ხილვადობის შემოწმება.
   *
   * WHY: ამის გარეშე გამყიდველს შეეძლო სხვისი გარიგებისთვის აქტივობის
   * მიბმა — ანუ უცხო ჩანაწერზე "მიწერა". id-ის გამოცნობა საკმარისი იქნებოდა.
   */
  private async assertParentsVisible(
    actor: AuthUser,
    dto: CreateActivityDto,
  ): Promise<void> {
    const scope = ownerScope(actor);

    if (dto.companyId) {
      const found = await this.prisma.company.findFirst({
        where: { id: dto.companyId, ...scope },
        select: { id: true },
      });
      if (!found) throw new NotFoundException('კომპანია ვერ მოიძებნა');
    }

    if (dto.contactId) {
      const found = await this.prisma.contact.findFirst({
        where: { id: dto.contactId, ...scope },
        select: { id: true },
      });
      if (!found) throw new NotFoundException('კონტაქტი ვერ მოიძებნა');
    }

    if (dto.dealId) {
      const found = await this.prisma.deal.findFirst({
        where: { id: dto.dealId, ...scope },
        select: { id: true },
      });
      if (!found) throw new NotFoundException('გარიგება ვერ მოიძებნა');
    }
  }
}

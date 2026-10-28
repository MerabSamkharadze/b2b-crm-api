/**
 * CompaniesService — CRM-ის ყველაზე მარტივი "owned" entity.
 *
 * ეს service არის **ნიმუში** დანარჩენებისთვის: აქ ნახავ, როგორ ერწყმის
 * role-scope ფილტრი მომხმარებლის ფილტრებს და რატომ ბრუნდება 404 (და არა 403)
 * სხვისი ჩანაწერის მოთხოვნაზე.
 */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Role } from '../../prisma-client.js';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import {
  ownerScope,
  scopedWhereUnique,
} from '../../common/authorization/data-scope.helper.js';
import { paginate, toSkipTake } from '../../common/helper/pagination.helper.js';
import type { CreateCompanyDto } from './dto/create-company.dto.js';
import type { QueryCompaniesDto } from './dto/query-companies.dto.js';
import type { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ახალი კომპანია.
   *
   * ── Mechanism: ownerId-ის განსაზღვრა სერვერზე ხდება და არა კლიენტზე.
   * SALES_REP-ის მიერ გაგზავნილი `ownerId` უგულებელყოფილია — თორემ
   * გამყიდველს სხვისი სახელით ჩანაწერის "დარგვა" შეეძლებოდა.
   */
  async create(actor: AuthUser, dto: CreateCompanyDto) {
    const ownerId = this.resolveOwnerId(actor, dto.ownerId);

    const { ownerId: _ignored, ...rest } = dto;

    return this.prisma.company.create({
      data: { ...rest, ownerId },
    });
  }

  /**
   * სია — role-scope + მომხმარებლის ფილტრები + გვერდები.
   *
   * ── Mechanism: ყურადღება მიაქციე `AND`-ს. ფილტრების უბრალო "შერევა"
   * ერთ ობიექტში სახიფათოა:
   *     { ...ownerScope(actor), ...filters }   ❌
   * თუ ფილტრებშიც `ownerId` აღმოჩნდა, ის **გადააწერს** scope-ს და
   * უსაფრთხოება ჩამოინგრევა. `AND` კი ორ პირობას ათავსებს ერთმანეთზე —
   * ანუ scope-ის გვერდის ავლა შეუძლებელია.
   */
  async findAll(actor: AuthUser, query: QueryCompaniesDto) {
    const filters: Prisma.CompanyWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              // mode: 'insensitive' → PostgreSQL-ის ILIKE.
              // ⚠️ `contains` ინდექსს ვერ გამოიყენებს (LIKE '%ტექსტი%').
              // დიდ ცხრილზე სწორი გზა PostgreSQL full-text search-ია (tsvector).
              { name: { contains: query.search, mode: 'insensitive' } },
              { domain: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const where: Prisma.CompanyWhereInput = {
      AND: [ownerScope(actor), filters],
    };

    const { skip, take } = toSkipTake(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip,
        take,
        // _count აბრუნებს ბავშვების რაოდენობას ცალკე query-ის გარეშე —
        // ასე სიაში მაშინვე ჩანს, რამდენი კონტაქტი/გარიგება აქვს კომპანიას.
        include: { _count: { select: { contacts: true, deals: true } } },
      }),
      this.prisma.company.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  /**
   * ერთი კომპანია.
   *
   * ── Mechanism: findFirstOrThrow + ownerScope. თუ ჩანაწერი არ არსებობს
   * **ან სხვისია**, Prisma აგდებს P2025-ს, რომელსაც PrismaExceptionFilter
   * 404-ად თარგმნის. ანუ "არ არსებობს" და "არ გეკუთვნის" გარედან
   * ერთნაირად გამოიყურება — არსებობის ფაქტი არ ჟონავს.
   */
  async findOne(actor: AuthUser, id: string) {
    return this.prisma.company.findFirstOrThrow({
      where: { id, ...ownerScope(actor) },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { contacts: true, deals: true, activities: true } },
      },
    });
  }

  /**
   * განახლება.
   *
   * ── Mechanism: ეს არის RBAC-ის "დავიწყებული ნახევარი" — **ჩაწერაც**
   * უნდა შეიზღუდოს. `scopedWhereUnique` აერთიანებს id-ს და scope-ს ერთ
   * where-ში (Prisma-ს extendedWhereUnique), ანუ სხვისი ჩანაწერის
   * განახლება ბაზამდეც ვერ მიდის.
   */
  async update(actor: AuthUser, id: string, dto: UpdateCompanyDto) {
    const { ownerId, ...rest } = dto;

    // მფლობელის შეცვლა (reassign) პრივილეგირებული ოპერაციაა.
    const nextOwner =
      ownerId && ownerId !== actor.id
        ? { ownerId: this.resolveOwnerId(actor, ownerId) }
        : {};

    return this.prisma.company.update({
      where: scopedWhereUnique(id, actor),
      data: { ...rest, ...nextOwner },
    });
  }

  /**
   * წაშლა.
   *
   * ⚠️ schema-ს მიხედვით: კონტაქტები Cascade-ით წაიშლება, გარიგებები კი
   * Restrict-ით წაშლას **დაბლოკავს** (P2003 → 409 Conflict). ანუ
   * გარიგებებიანი კომპანიის წაშლა შეუძლებელია — და ეს შეგნებული გადაწყვეტაა.
   */
  async remove(actor: AuthUser, id: string) {
    await this.prisma.company.delete({ where: scopedWhereUnique(id, actor) });
  }

  /**
   * ვინ შეიძლება იყოს მფლობელი.
   *
   * SALES_REP → მხოლოდ თავად.
   * MANAGER    → თავად ან გუნდის წევრი.
   * ADMIN      → ნებისმიერი.
   */
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
      'ჩანაწერის მფლობელად მხოლოდ საკუთარ თავს ან გუნდის წევრს მიუთითებ',
    );
  }
}

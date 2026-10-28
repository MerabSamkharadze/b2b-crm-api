/**
 * ContactsService.
 *
 * აქ ჩანს კავშირების (relations) უსაფრთხოების საკითხი: კონტაქტის შექმნამდე
 * უნდა დავრწმუნდეთ, რომ **კომპანიაც** ავტორისთვის ხილულია. ამის გარეშე
 * გამყიდველს სხვისი კომპანიაში კონტაქტის "ჩარგვა" შეეძლებოდა — მას
 * კომპანიის id-ის გამოცნობა სჭირდებოდა და მეტი არაფერი.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Role } from '../../prisma-client.js';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import {
  ownerScope,
  scopedWhereUnique,
} from '../../common/authorization/data-scope.helper.js';
import { paginate, toSkipTake } from '../../common/helper/pagination.helper.js';
import type { CreateContactDto } from './dto/create-contact.dto.js';
import type { QueryContactsDto } from './dto/query-contacts.dto.js';
import type { UpdateContactDto } from './dto/update-contact.dto.js';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthUser, dto: CreateContactDto) {
    // ── Mechanism: მშობელი ჩანაწერის ხილვადობის შემოწმება.
    // scope-ით ვეძებთ: თუ კომპანია სხვისია, findFirst არაფერს დააბრუნებს.
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, ...ownerScope(actor) },
      select: { id: true },
    });

    if (!company) {
      // 404 და არა 403 — იმავე მიზეზით, რაც ყველგან: არსებობა არ უნდა გაჟონოს.
      throw new NotFoundException('კომპანია ვერ მოიძებნა');
    }

    const { ownerId, ...rest } = dto;

    return this.prisma.contact.create({
      data: { ...rest, ownerId: this.resolveOwnerId(actor, ownerId) },
    });
  }

  async findAll(actor: AuthUser, query: QueryContactsDto) {
    const filters: Prisma.ContactWhereInput = {
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // AND და არა spread — იხ. CompaniesService.findAll-ის კომენტარი.
    const where: Prisma.ContactWhereInput = {
      AND: [ownerScope(actor), filters],
    };

    const { skip, take } = toSkipTake(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  async findOne(actor: AuthUser, id: string) {
    return this.prisma.contact.findFirstOrThrow({
      where: { id, ...ownerScope(actor) },
      include: {
        company: { select: { id: true, name: true, status: true } },
        _count: { select: { deals: true, activities: true } },
      },
    });
  }

  async update(actor: AuthUser, id: string, dto: UpdateContactDto) {
    const { ownerId, ...rest } = dto;

    return this.prisma.contact.update({
      where: scopedWhereUnique(id, actor),
      data: {
        ...rest,
        ...(ownerId ? { ownerId: this.resolveOwnerId(actor, ownerId) } : {}),
      },
    });
  }

  /**
   * ⚠️ schema-ს მიხედვით: კონტაქტის წაშლისას მის გარიგებებს `contactId`
   * null-ად დაუყენდება (onDelete: SetNull) — გარიგებები რჩება.
   * აქტივობები კი Cascade-ით წაიშლება.
   */
  async remove(actor: AuthUser, id: string) {
    await this.prisma.contact.delete({ where: scopedWhereUnique(id, actor) });
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

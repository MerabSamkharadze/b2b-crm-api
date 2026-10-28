/**
 * UsersService — მომხმარებლების მონაცემებზე წვდომის ერთადერთი წერტილი.
 *
 * არქიტექტურული წესი: **UsersModule არაფერს აიმპორტებს AuthModule-იდან.**
 * დამოკიდებულება მხოლოდ ერთი მიმართულებით მიდის (Auth → Users), ამიტომ
 * circular dependency და `forwardRef()` არ გვჭირდება. forwardRef მუშაობს,
 * მაგრამ ის თითქმის ყოველთვის არქიტექტურული პრობლემის სიმპტომია.
 *
 * პაროლის hash-ირება შეგნებულად **აქ** ხდება და არა AuthService-ში: `password`
 * სვეტი ამ service-ის საკუთრებაა, ანუ შეუძლებელია მომხმარებლის შექმნა
 * hash-ის გარეშე, რომელი გზითაც არ უნდა მოვიდეს მოთხოვნა.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Role } from '../../prisma-client.js';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { paginate, toSkipTake } from '../../common/helper/pagination.helper.js';

/**
 * ── Mechanism: პაროლის დაცვის **მთავარი** ხაზი.
 * ეს `select` არ შეიცავს password-სა და hashedRefreshToken-ს, ანუ ისინი
 * ბაზიდან არც კი ამოდის. ეს უფრო საიმედოა, ვიდრე წაკითხვის მერე "დამალვა":
 * დავიწყებული serializer მონაცემს გაჟონავს, დავიწყებული select — არა.
 */
export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{
  select: typeof USER_SAFE_SELECT;
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * ახალი მომხმარებლის შექმნა (პაროლის hash-ირებით).
   *
   * ── Mechanism: bcrypt არის **შეგნებულად ნელი** hash ფუნქცია. cost factor
   * 10 ნიშნავს 2^10 = 1024 იტერაციას (~100ms). სწორედ ეს სისუსტეა მისი ძალა:
   * თუ ბაზა მოიპარეს, თავდამსხმელს წამში მილიონობით ვარიანტის გასინჯვა
   * აღარ შეუძლია. SHA-256 ამ ამოცანისთვის **არ** გამოდგება — ის ძალიან სწრაფია.
   */
  async create(dto: CreateUserDto): Promise<SafeUser> {
    const rounds = this.config.get<number>('BCRYPT_ROUNDS', 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    /**
     * TODO: [Merab] #02 — "check-then-insert" რბოლის მოშორება
     *
     * GOAL:      წაშალე ქვემოთ მოცემული წინასწარი შემოწმება (findUnique) და
     *            დაეყრდენი ბაზის unique constraint-ს: `create`-ს გარშემო
     *            try/catch, სადაც Prisma-ს კოდი 'P2002' → ConflictException.
     *
     * WHY:       ამჟამინდელ კოდს **race condition** აქვს (TOCTOU — time of
     *            check to time of use). ორი პარალელური request ერთი email-ით:
     *            ორივე ამოწმებს → ორივე ვერ პოულობს → ორივე ცდილობს ჩაწერას.
     *            ერთი ჩავარდება უშნო 500-ით. ბაზის constraint არის **ერთადერთი**
     *            ადგილი, სადაც ატომური გარანტია არსებობს.
     *
     * HINT:      • `catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError
     *              && e.code === 'P2002') throw new ConflictException(...) ; throw e; }`
     *            • ალტერნატივა: არც catch — PrismaExceptionFilter-ი P2002-ს
     *              ისედაც 409-ად თარგმნის. აირჩიე და დაასაბუთე, რომელი სჯობს:
     *              ზუსტი შეტყობინება service-ში თუ ერთიანი წესი filter-ში?
     *
     * DONE WHEN: ორჯერ გაუშვებ POST /api/v1/auth/register ერთი email-ით →
     *            მეორედ 409 მოდის (და არა 500), ხოლო findUnique კოდში აღარ არის
     */
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('ასეთი email უკვე რეგისტრირებულია');
    }

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        // role-ის default (SALES_REP) schema-შია — აქ მხოლოდ მაშინ ვცვლით,
        // როცა ADMIN-მა პირდაპირ მიუთითა.
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.managerId ? { managerId: dto.managerId } : {}),
      },
      select: USER_SAFE_SELECT,
    });
  }

  /**
   * მომხმარებლის ძებნა login-ისთვის — **პაროლის hash-ით**.
   *
   * ეს ერთადერთი მეთოდია, რომელიც password-ს კითხულობს. მისი სახელი
   * შეგნებულად გრძელია (`...ForAuth`), რომ შემთხვევით არ გამოიყენო სიებში.
   */
  async findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
      },
    });
  }

  /**
   * JwtStrategy-სთვის: ავთენტიფიცირებული მომხმარებლის სრული კონტექსტი.
   *
   * ── Mechanism: `subordinates: { select: { id: true } }` არის JOIN, რომელიც
   * გუნდის წევრების id-ებს მოაქვს. ასე role-scope ფილტრი რჩება სუფთა
   * სინქრონული ფუნქცია (იხ. data-scope.helper.ts) — ფასი ერთი JOIN-ია
   * თითო request-ზე, მოგება — ტესტირებადი და გასაგები ავტორიზაცია.
   */
  async findAuthContext(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        subordinates: { select: { id: true } },
      },
    });
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });

    if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    return user;
  }

  /**
   * მომხმარებლების სია.
   *
   * ── Mechanism: ⚠️ აქ `ownerScope()`-ს **არ** ვიყენებთ. მიზეზი: User-ს
   * `ownerId` სვეტი არ აქვს — მომხმარებელი არავის "ეკუთვნის". მის შემთხვევაში
   * იგივე როლს `id` და `managerId` ასრულებს. ეს კარგი მაგალითია იმისა, რომ
   * ზოგადი helper-ის ბრმად მორგება ზოგჯერ მცდარია.
   */
  async findAll(actor: AuthUser, query: PaginationQueryDto) {
    const where: Prisma.UserWhereInput =
      actor.role === Role.ADMIN
        ? {}
        : { id: { in: [actor.id, ...actor.subordinateIds] } };

    const { skip, take } = toSkipTake(query);

    // ── Mechanism: $transaction([...]) ორ query-ს ერთ snapshot-ში ასრულებს.
    // Promise.all-ს ეს გარანტია **არ** აქვს: სიის წაკითხვასა და დათვლას შორის
    // ახალი ჩანაწერი შეიძლება დაემატოს და total არ დაემთხვეს items-ს.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SAFE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, query);
  }

  /** როლის შეცვლა — ADMIN-ის პრივილეგია (controller-ზე @Roles-ით დაცული). */
  async updateRole(id: string, role: Role): Promise<SafeUser> {
    await this.findOne(id); // 404, თუ არ არსებობს

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: USER_SAFE_SELECT,
    });
  }

  /**
   * მენეჯერის მიჩენა (გუნდის აწყობა).
   */
  async assignManager(id: string, managerId: string | null): Promise<SafeUser> {
    // თვითმიჩენა აშკარა ციკლია — ეს შემოწმება ჩვენ გვაქვს.
    if (managerId && managerId === id) {
      throw new BadRequestException(
        'მომხმარებელი თავისივე მენეჯერი ვერ იქნება',
      );
    }

    if (managerId) {
      const manager = await this.findOne(managerId);
      if (!manager.isActive) {
        throw new BadRequestException(
          'არააქტიური მომხმარებელი მენეჯერი ვერ იქნება',
        );
      }
    }

    /**
     * TODO: [Merab] #08b — ციკლის აღმოჩენა იერარქიაში
     *
     * GOAL:      აკრძალე ისეთი მიჩენა, რომელიც ციკლს ქმნის:
     *            A-ს მენეჯერია B, B-ს მენეჯერია C → C-ს მენეჯერად A-ს ვერ მივცემთ.
     *
     * WHY:       ბაზას ამის აკრძალვა **არ შეუძლია** (foreign key ციკლს ვერ ხედავს).
     *            ციკლი კი რეკურსიულ query-ს უსასრულო მარყუჟში გაახვევს.
     *
     * HINT:      • ასვლა managerId-ების ჯაჭვით: სანამ managerId არსებობს,
     *              წაიკითხე მშობელი; თუ გზაში `id`-ს შეხვდი — ციკლია.
     *            • დაამატე depth ლიმიტი (მაგ. 20) — დაცვა უსასრულო მარყუჟისგან,
     *              თუ ბაზაში ციკლი უკვე მოხვდა.
     *
     * DONE WHEN: ციკლის მცდელობაზე 400 ბრუნდება (ტესტი: users.service.spec.ts)
     */

    return this.prisma.user.update({
      where: { id },
      data: { managerId },
      select: USER_SAFE_SELECT,
    });
  }

  /**
   * TODO: [Merab] #08 — გუნდის წევრების id-ები
   *
   * GOAL:      დააბრუნე ამ მომხმარებლის ქვეშევრდომების id-ები.
   *            ეტაპი 1: პირდაპირი ქვეშევრდომები (depth 1) — ერთი findMany.
   *            ეტაპი 2 (არჩევითი): სრული ხე — `$queryRaw` + `WITH RECURSIVE`.
   *
   * WHY:       ამ სიაზეა დამოკიდებული MANAGER-ის ხედვა (სავარჯიშო #04).
   *            სანამ [] ბრუნდება, მენეჯერი მხოლოდ საკუთარს ხედავს.
   *
   * HINT:      • ეტაპი 1: `this.prisma.user.findMany({ where: { managerId: userId },
   *                select: { id: true } })` → `.map(u => u.id)`
   *            • ეტაპი 2 (PostgreSQL recursive CTE):
   *                WITH RECURSIVE team AS (
   *                  SELECT id FROM "User" WHERE "managerId" = $1
   *                  UNION ALL
   *                  SELECT u.id FROM "User" u JOIN team t ON u."managerId" = t.id
   *                ) SELECT id FROM team;
   *              გამოიყენე `this.prisma.$queryRaw<{ id: string }[]>` — ⚠️ ყოველთვის
   *              პარამეტრიზებული template literal-ით, არა string-ის შეწებებით
   *              (SQL injection).
   *
   * DONE WHEN: seed-ის მენეჯერით შესვლისას `GET /api/v1/companies` აჩვენებს
   *            გუნდის კომპანიებსაც (და არა მხოლოდ საკუთარს)
   */
  async findSubordinateIds(userId: string): Promise<string[]> {
    return [];
  }

  /** refresh token-ის hash-ის შენახვა/წაშლა (სავარჯიშო #09). */
  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { hashedRefreshToken: hash },
      select: { id: true },
    });
  }
}

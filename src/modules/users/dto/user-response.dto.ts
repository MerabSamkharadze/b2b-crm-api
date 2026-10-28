/**
 * UserResponseDto — რას ვაბრუნებთ კლიენტს მომხმარებლის შესახებ.
 *
 * ── Mechanism (მნიშვნელოვანი!): NestJS+Prisma-ს tutorial-ების ყველაზე
 * გავრცელებული შეცდომა: `ClassSerializerInterceptor` + `@Exclude()` **ჩუმად
 * არაფერს აკეთებს**, როცა service Prisma-ს ობიექტს აბრუნებს. მიზეზი:
 * Prisma plain object-ს (და არა კლასის instance-ს) აბრუნებს, ხოლო
 * serializer-ი მხოლოდ კლასის instance-ებზე მუშაობს — ამიტომ საჭიროა
 * `plainToInstance`.
 *
 * ამიტომ პაროლის დაცვა **ორ ფენაშია**:
 *   1. მთავარი: Prisma-ს `select`, რომელიც password-ს არც კი კითხულობს
 *      (იხ. USER_SAFE_SELECT) — "რაც არ წაგიკითხავს, ვერ გაჟონავს"
 *   2. დამატებითი: ეს DTO, რომელიც response-ის ფორმას განსაზღვრავს
 */
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../prisma-client.js';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  managerId: string | null;

  @ApiProperty()
  createdAt: Date;

  // ეს ველები არასდროს უნდა გავიდეს გარეთ.
  @Exclude()
  password?: string;

  @Exclude()
  hashedRefreshToken?: string;

  /**
   * TODO: [Merab] #10 — Response-ის სერიალიზაცია
   *
   * GOAL:      დააბრუნე UserResponseDto-ს **instance** (და არა plain object),
   *            `plainToInstance`-ის გამოყენებით, + დაამატე computed ველი
   *            `fullName` ("მერაბ სამხარაძე").
   *
   * WHY:       ეს ასწავლის class-transformer-ის მექანიკას და აჩვენებს,
   *            რატომ არ მუშაობს @Exclude() plain object-ზე. ასევე response-ის
   *            ფორმა აღმოჩნდება ერთ ადგილას — ბაზის სქემა და API-ის კონტრაქტი
   *            ერთმანეთისგან დამოუკიდებელი ხდება.
   *
   * HINT:      • `plainToInstance(UserResponseDto, user, { excludeExtraneousValues: false })`
   *            • fullName-ისთვის დაამატე getter + `@Expose()`:
   *                @Expose() get fullName(): string { return `${this.firstName} ${this.lastName}`; }
   *            • სცადე `@Exclude()`-ის მუშაობის შემოწმება: გადააწოდე ობიექტი,
   *              რომელსაც password აქვს, და დარწმუნდი რომ შედეგში არ ჩანს.
   *
   * DONE WHEN: `GET /api/v1/users/me` აბრუნებს fullName-ს და არასდროს password-ს
   *
   * ამჟამინდელი stub: ობიექტს უცვლელად აბრუნებს. ეს უსაფრთხოა, რადგან
   * password ბაზიდან არც იკითხება (იხ. USER_SAFE_SELECT), მაგრამ fullName არ აქვს.
   */
  static from(user: Record<string, unknown>): UserResponseDto {
    return user as unknown as UserResponseDto;
  }
}

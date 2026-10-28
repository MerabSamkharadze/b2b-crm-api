/**
 * AuthService — რეგისტრაცია, შესვლა და token-ების გამოშვება.
 *
 * პასუხისმგებლობების გაყოფა:
 *   UsersService → მონაცემები + პაროლის hash-ირება (password სვეტის მფლობელი)
 *   AuthService  → credential-ების შემოწმება + JWT-ის გამოშვება
 */
import {
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './types/jwt-payload.type.js';
import type { Role } from '../../prisma-client.js';

@Injectable()
export class AuthService {
  /**
   * "ყალბი" hash timing attack-ის წინააღმდეგ (იხ. login-ის კომენტარი).
   * ერთხელ ითვლება აპლიკაციის გაშვებისას.
   */
  private readonly dummyHash: string;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.dummyHash = bcrypt.hashSync(
      'timing-attack-mitigation',
      this.config.get<number>('BCRYPT_ROUNDS', 10),
    );
  }

  /** ახალი ანგარიში. role ყოველთვის SALES_REP-ია (იხ. RegisterDto). */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.users.create(dto);
    return this.issueTokens(user.id, user.email, user.role);
  }

  /**
   * შესვლა.
   *
   * ── Mechanism (timing attack): თუ არარსებულ email-ზე მაშინვე დავაბრუნებდით
   * პასუხს, request უფრო **სწრაფი** იქნებოდა, ვიდრე არსებულზე (სადაც bcrypt
   * ~100ms-ს ხარჯავს). ამ სხვაობის გაზომვით თავდამსხმელს email-ების
   * ჩამოთვლა შეუძლია. ამიტომ არარსებულ მომხმარებელზეც ვასრულებთ
   * bcrypt.compare-ს ყალბ hash-თან — დრო ემთხვევა.
   *
   * ასევე: შეტყობინება ორივე შემთხვევაში **იდენტურია** ("email ან პაროლი
   * არასწორია") — "ასეთი email არ არსებობს" უკვე გაჟონვაა.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmailForAuth(dto.email);

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.password ?? this.dummyHash,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('email ან პაროლი არასწორია');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('ანგარიში დეაქტივირებულია');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  /**
   * TODO: [Merab] #09 — Refresh token-ის rotation
   *
   * GOAL:      1. issueTokens()-ში დაამატე refreshToken (ცალკე secret:
   *               JWT_REFRESH_SECRET, ვადა: JWT_REFRESH_EXPIRES_IN).
   *            2. refresh token-ის **hash** შეინახე ბაზაში —
   *               `users.setRefreshTokenHash(id, await bcrypt.hash(token, rounds))`.
   *            3. ამ მეთოდში: შეამოწმე მოსული token (jwt.verifyAsync refresh
   *               secret-ით), შეადარე ბაზის hash-ს (bcrypt.compare), და
   *               გამოუშვი **ახალი წყვილი** (rotation).
   *            4. logout(): hash-ს დააყენე null.
   *
   * WHY:       access token მოკლევადიანია (15 წუთი) იმიტომ, რომ გაჟონვის
   *            შემთხვევაში ზარალი შეიზღუდოს. refresh token კი დიდხანს ცოცხლობს,
   *            ამიტომ **ბაზაში უნდა იყოს გასაუქმებელი** — სწორედ ამიტომ ვინახავთ.
   *            ვინახავთ hash-ს და არა token-ს იმავე მიზეზით, რატომაც პაროლს:
   *            ბაზის გაჟონვა არ უნდა გაუხსნას კარი თავდამსხმელს.
   *
   * HINT:      • `hashedRefreshToken` სვეტი schema-ში **უკვე არსებობს**.
   *            • `this.jwt.signAsync(payload, { secret, expiresIn })` — ცალკე
   *              secret-ის გადაცემა signAsync-ის ოპციებით ხდება.
   *            • rotation ნიშნავს: ერთი refresh token მხოლოდ ერთხელ გამოიყენება.
   *              გამოყენებული token-ის მეორედ მოსვლა საეჭვოა — დაფიქრდი, ხომ
   *              არ ჯობია ასეთ შემთხვევაში ყველა session-ის გაუქმება.
   *            • მრავალი მოწყობილობა ერთი სვეტით ვერ იმუშავებს (ახალი login
   *              ძველს ჩაანაცვლებს) — ამის გადაწყვეტა ცალკე RefreshToken
   *              ცხრილია, იხ. docs/DECISIONS.md
   *
   * DONE WHEN: POST /api/v1/auth/refresh აბრუნებს ახალ accessToken-ს, ხოლო
   *            იმავე refresh token-ით მეორე მცდელობა ჩავარდება 401-ით
   */
  async refresh(_refreshToken: string): Promise<AuthResponseDto> {
    throw new NotImplementedException(
      'სავარჯიშო #09: refresh token-ის rotation — იხ. docs/EXERCISES.md',
    );
  }

  /** TODO: [Merab] #09b — logout: refresh token-ის hash-ის გასუფთავება. */
  async logout(_userId: string): Promise<void> {
    throw new NotImplementedException(
      'სავარჯიშო #09: logout — hashedRefreshToken უნდა გასუფთავდეს',
    );
  }

  /**
   * JWT-ის ხელმოწერა.
   *
   * ── Mechanism: payload-ში მხოლოდ `sub` (id) მიდის. role **არ** იწერება,
   * რომ უფლებების ცვლილება მყისიერად მოქმედებდეს (იხ. jwt-payload.type.ts).
   * secret და ვადა JwtModule.registerAsync-იდან მოდის (იხ. auth.module.ts).
   */
  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: userId };

    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      user: { id: userId, email, role },
    };
  }
}

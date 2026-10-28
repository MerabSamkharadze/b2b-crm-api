/**
 * JwtStrategy — Bearer token-ის შემოწმება და request.user-ის აწყობა.
 *
 * ── Mechanism: Passport-ის "strategy" არის ავთენტიფიკაციის ერთი კონკრეტული
 * წესი. PassportStrategy(Strategy) NestJS-ის DI-სთვის ქმნის კლასს, რომელსაც
 * Passport-ი ასე იყენებს:
 *   1. jwtFromRequest — საიდან ამოიღოს token (ჩვენთან: Authorization header)
 *   2. ხელმოწერის და ვადის შემოწმება (secretOrKey + ignoreExpiration)
 *   3. validate(payload) — ჩვენი კოდი; რასაც დააბრუნებს, ხდება request.user
 *
 * თუ რომელიმე ეტაპი ჩავარდა, Passport-ი 401-ს აბრუნებს ჩვენი კოდის გარეშე.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../../../common/authorization/auth-user.js';
import { UsersService } from '../../users/users.service.js';
import type { JwtPayload } from '../types/jwt-payload.type.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    // ⚠️ super() უნდა იყოს პირველი ინსტრუქცია (TS-ის წესი parameter property-ებთან),
    // ამიტომ config-ს პირდაპირ არგუმენტებში ვკითხულობთ.
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // false ნიშნავს: ვადაგასული token-ი **არ** მიიღება. true-ზე დაყენება
      // უსაფრთხოების სერიოზული ხარვეზია (ხშირი "quick fix" tutorial-ებში).
      ignoreExpiration: false,

      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * token-ის ხელმოწერა უკვე შემოწმებულია — ახლა ვამოწმებთ, რომ მომხმარებელი
   * **ჯერ კიდევ** არსებობს და აქტიურია.
   *
   * WHY ბაზის კითხვა ყოველ request-ზე: ხელმოწერილი token-ი 15 წუთი "ცოცხალია"
   * მაშინაც, თუ ანგარიში დეაქტივირდა. ამ შემოწმების გარეშე გაშვებული
   * თანამშრომელი კიდევ 15 წუთს იმუშავებდა სისტემაში.
   *
   * WHY 401 და არა 403: 401 ნიშნავს "შენი credential აღარ ღირს", 403 —
   * "ვიცი ვინ ხარ, მაგრამ უფლება არ გაქვს". დეაქტივირებული ანგარიში პირველია.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findAuthContext(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'ანგარიში არ არსებობს ან დეაქტივირებულია',
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      // გუნდის id-ები აქ ერთხელ ითვლება, რომ role-scope ფილტრი სუფთა
      // სინქრონული ფუნქცია დარჩეს (იხ. common/authorization/data-scope.helper.ts).
      subordinateIds: user.subordinates.map((s) => s.id),
    };
  }
}

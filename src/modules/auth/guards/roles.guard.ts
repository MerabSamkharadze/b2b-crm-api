/**
 * RolesGuard — @Roles()-ით მონიშნული endpoint-ების როლობრივი შემოწმება.
 *
 * ეს არის ავტორიზაციის **პირველი ფენა**: "გაქვს თუ არა უფლება ამ ღილაკზე".
 * მეორე ფენა — "რომელ სტრიქონებს ხედავ" — service-ში where პირობით ხდება
 * (იხ. common/authorization/data-scope.helper.ts). Guard-ს SQL-ის გადაწერა
 * არ შეუძლია, ამიტომ row-level ფილტრაცია მისი საქმე არ არის.
 *
 * ⚠️ რიგითობა მნიშვნელოვანია: ეს guard `request.user`-ს ეყრდნობა, რომელსაც
 * JwtAuthGuard ავსებს. APP_GUARD-ების თანმიმდევრობა providers მასივში
 * მითითებული რიგით განისაზღვრება — იხ. app.module.ts-ის კომენტარი.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../../common/authorization/auth-user.js';
import { Role } from '../../../prisma-client.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { roleSatisfies } from '../helper/role-hierarchy.helper.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // @Roles() არ აწერია → როლობრივი შეზღუდვა არ არის (მაგრამ ავთენტიფიკაცია
    // მაინც საჭიროა — მას JwtAuthGuard უზრუნველყოფს).
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      // ეს ნორმაში არ უნდა მოხდეს (JwtAuthGuard წინ მუშაობს). თუ მოხდა —
      // ესე იგი guard-ების რიგი არეულია და fail closed უნდა მოვიქცეთ.
      throw new ForbiddenException('ავტორიზაციის კონტექსტი ვერ მოიძებნა');
    }

    // some(): საკმარისია ერთი დაშვებული როლის დაკმაყოფილება.
    const allowed = required.some((role) => roleSatisfies(user.role, role));

    if (!allowed) {
      throw new ForbiddenException(
        `ამ ოპერაციისთვის საჭიროა როლი: ${required.join(' ან ')}`,
      );
    }

    return true;
  }
}

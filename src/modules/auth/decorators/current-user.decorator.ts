/**
 * @CurrentUser() — ავთენტიფიცირებული მომხმარებელი controller-ის პარამეტრად.
 *
 * ── Mechanism: createParamDecorator-ს NestJS ExecutionContext-ს აწვდის,
 * საიდანაც request-ს ვიღებთ. `request.user` სწორედ JwtStrategy.validate()-ის
 * დაბრუნებული მნიშვნელობაა — Passport-ი მას ავტომატურად აბამს request-ზე.
 *
 * ტიპი `AuthUser`-ია და არა `any`, რადგან Express-ის ტიპები გავაფართოვეთ
 * (იხ. src/types/express.d.ts) — ანუ `actor.subordinateIds`-ის typo-ს
 * TypeScript დაიჭერს.
 *
 * გამოყენება:
 *   findAll(@CurrentUser() actor: AuthUser)         → სრული ობიექტი
 *   findMine(@CurrentUser('id') userId: string)     → მხოლოდ ერთი ველი
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../../common/authorization/auth-user.js';

export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser | undefined;

    if (!user) return undefined;
    return field ? user[field] : user;
  },
);

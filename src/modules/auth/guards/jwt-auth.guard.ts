/**
 * JwtAuthGuard — გლობალური "კარიბჭე": ყველა request-ს სჭირდება ვალიდური token,
 * გარდა იმ endpoint-ების, რომლებიც @Public()-ით არის მონიშნული.
 *
 * ── Mechanism: AuthGuard('jwt') არის @nestjs/passport-ის მზა guard-ი,
 * რომელიც JwtStrategy-ს უშვებს. ჩვენ მას ვაფართოვებთ, რომ @Public()-ის
 * შემოწმება დავამატოთ.
 *
 * ⚠️ ყველაზე ხშირი შეცდომა: `canActivate`-ის გადაფარვის შემდეგ
 * `super.canActivate(context)`-ის დაბრუნების დავიწყება — მაშინ token
 * საერთოდ არ შემოწმდება და ყველა endpoint ღია დარჩება.
 */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // ── Mechanism: getAllAndOverride ეძებს metadata-ს ორ დონეზე და
    // **უფრო კონკრეტულს ანიჭებს უპირატესობას**: ჯერ მეთოდი, მერე კლასი.
    // ანუ @Public()-ი controller-ზე ვრცელდება ყველა მეთოდზე, მაგრამ
    // კონკრეტულ მეთოდზე დადებული წესი კლასის წესს გადაწერს.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }
}

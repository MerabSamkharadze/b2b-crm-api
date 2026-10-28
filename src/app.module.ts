/**
 * AppModule — აპლიკაციის root module, რომელიც ყველა feature module-ს აერთიანებს.
 *
 * NestJS-ის module სისტემა dependency graph-ს აგებს: ყოველი module აცხადებს
 * რას იყენებს (imports), რას ქმნის (providers) და რას აძლევს სხვებს (exports).
 * სწორედ ეს graph-ია "modular architecture"-ის არსი — ერთი module-ის შეცვლა
 * არ უნდა აიძულოს სხვების გადაწერა.
 *
 * request-ის სრული მოგზაურობა: docs/ARCHITECTURE.md
 */
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, minutes } from '@nestjs/throttler';
import { validateEnv } from './common/config/env.validation.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './modules/auth/guards/roles.guard.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    // ── Mechanism: isGlobal: true ნიშნავს, რომ ConfigService ყველგან
    // ხელმისაწვდომია ხელახალი import-ის გარეშე. `validate` კი .env-ს
    // ჩატვირთვისთანავე ამოწმებს — არასწორ კონფიგურაციაზე აპლიკაცია არ აიწევს.
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // ბაზისური rate limit. რეალურად მხოლოდ იმ controller-ებზე მოქმედებს,
    // სადაც ThrottlerGuard პირდაპირ არის მითითებული (იხ. AuthController).
    ThrottlerModule.forRoot([{ ttl: minutes(1), limit: 60 }]),

    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],

  providers: [
    /**
     * ── Mechanism: APP_GUARD-ით რეგისტრირებული guard-ები **ყველა** route-ზე
     * მუშაობს. ⚠️ მათი რიგითობა ზუსტად ამ მასივის რიგითობაა:
     *
     *   1. JwtAuthGuard — ამოწმებს token-ს და ავსებს request.user-ს
     *   2. RolesGuard   — კითხულობს request.user.role-ს
     *
     * რიგის შეცვლა RolesGuard-ს ცარიელ request.user-თან დატოვებდა და
     * ყველა @Roles endpoint 403-ს დააბრუნებდა. ეს ის ტიპის bug-ია, რომელსაც
     * ტესტების გარეშე საათებს ეძებ.
     */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // Prisma-ს შეცდომები → გასაგები HTTP სტატუსები (409/404/400 და არა 500).
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },

    // ყოველი request-ის აღრიცხვა request-id-ით და ხანგრძლივობით.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

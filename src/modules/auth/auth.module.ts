/**
 * AuthModule.
 *
 * დამოკიდებულებების მიმართულება (მნიშვნელოვანი!):
 *   AuthModule → UsersModule        ✅
 *   UsersModule → AuthModule        ❌ არასდროს
 * ასე circular dependency ვერ წარმოიქმნება. Guard-ები და დეკორატორები
 * აქ ცხოვრობენ, ხოლო სხვა module-ებს მათი იმპორტი **არ** სჭირდებათ, რადგან
 * JwtAuthGuard გლობალურად არის რეგისტრირებული (იხ. app.module.ts).
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    UsersModule,
    PassportModule,

    // ── Mechanism: registerAsync + useFactory, რადგან secret .env-იდან მოდის
    // და ConfigService-ის მზადყოფნას უნდა დავუცადოთ.
    // ⚠️ `process.env.JWT_SECRET`-ის პირდაპირ ჩაწერა მუშაობს, მაგრამ ტესტებში
    // კონფიგურაციის გადაფარვას შეუძლებელს ხდის — ამიტომ ყოველთვის ConfigService.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // ── Mechanism: jsonwebtoken-ის ტიპები `expiresIn`-ს ავიწროებენ
          // template literal ტიპამდე ("15m" | "7d" | ...). .env-იდან წაკითხული
          // მნიშვნელობა კომპილაციის დროს უბრალო `string`-ია, ამიტომ cast
          // გვჭირდება. ვალიდაციას ისედაც ვაკეთებთ — იხ. env.validation.ts.
          expiresIn: config.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
            '15m',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

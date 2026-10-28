/**
 * AppModule — აპლიკაციის root module, რომელიც ყველა feature module-ს აერთიანებს.
 *
 * NestJS-ის module სისტემა dependency graph-ს აგებს: ყოველი module აცხადებს
 * რას იყენებს (imports), რას ქმნის (providers) და რას აძლევს სხვებს (exports).
 * სწორედ ეს graph-ია "modular architecture"-ის არსი — ერთი module-ის შეცვლა
 * არ უნდა აიძულოს სხვების გადაწერა.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './common/config/env.validation.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';

@Module({
  imports: [
    // ── Mechanism: isGlobal: true ნიშნავს, რომ ConfigService ყველგან
    // ხელმისაწვდომია ხელახალი import-ის გარეშე. `validate` კი .env-ს
    // ჩატვირთვისთანავე ამოწმებს — არასწორ კონფიგურაციაზე აპლიკაცია არ აიწევს.
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}

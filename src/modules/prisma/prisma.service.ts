/**
 * PrismaService — ბაზასთან კავშირის ერთადერთი წყარო მთელ აპლიკაციაში.
 *
 * ის `extends PrismaClient`-ია, ანუ ყველა generated მეთოდი
 * (`prisma.user.findMany()`, `prisma.$transaction()` და ა.შ.) პირდაპირ ამ
 * service-ზეა ხელმისაწვდომი. Repository wrapper ფენა შეგნებულად **არ** გვაქვს —
 * PrismaClient თავად არის data-mapper და მისი შეფუთვა generated ტიპებს კლავს
 * (იხ. docs/DECISIONS.md).
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../prisma-client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    // ── Mechanism: Prisma 7-მა Rust query engine წაშალა. ახლა SQL-ს ნამდვილ
    // JS driver-ს (node-postgres) ვაწვდით "driver adapter"-ის სახით. სწორედ
    // ამიტომ connection string schema.prisma-ში აღარ იწერება — აპლიკაცია
    // თავად ქმნის კავშირს, ანუ connection pool-ზე სრული კონტროლი გვაქვს.
    //
    // ⚠️ super() უნდა იყოს კონსტრუქტორის პირველი ინსტრუქცია (TS-ის წესი, როცა
    // კლასს property initializer აქვს — ჩვენი `logger`), ამიტომ config-ის
    // წაკითხვა პირდაპირ აქ, არგუმენტებშია ჩაწერილი.
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),

      // ── Mechanism: 'query' log-ი **სასწავლო ინსტრუმენტია**. development-ში
      // ყოველი Prisma გამოძახების დაგენერირებული SQL ტერმინალში დაიბეჭდება —
      // ასე ნახავ, რას აკეთებს შენი role-scope filter სინამდვილეში ბაზაში.
      log:
        config.get<string>('NODE_ENV') === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  /**
   * NestJS lifecycle hook: module-ის ინიციალიზაციისას ვუკავშირდებით ბაზას.
   *
   * WHY ხელით $connect(): Prisma lazy-ად უკავშირდება პირველივე query-ზე.
   * ჩვენ გვინდა, რომ არასწორი DATABASE_URL აპლიკაციის **გაშვებისას** გამოჩნდეს
   * და არა მაშინ, როცა პირველი მომხმარებელი request-ს გამოგზავნის.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('PostgreSQL-თან კავშირი დამყარებულია');
  }

  /**
   * NestJS lifecycle hook: აპლიკაციის გამორთვისას კავშირს ვხურავთ.
   *
   * ── Mechanism: ძველ tutorial-ებში ნახავ `this.$on('beforeExit', ...)`
   * პატერნს — Prisma 5+-ში ის **აღარ არსებობს** და TypeScript-ს ვერ გაივლის.
   * სწორი გზაა OnModuleDestroy + `app.enableShutdownHooks()` (იხ. main.ts).
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('PostgreSQL-ის კავშირი დახურულია');
  }
}

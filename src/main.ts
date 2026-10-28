/**
 * აპლიკაციის bootstrap.
 *
 * Request-ის სრული გზა (იხ. docs/ARCHITECTURE.md):
 *   Request → helmet/CORS → Guards → Interceptors → Pipes(DTO) → Controller
 *           → Service → PrismaService → PostgreSQL → უკან იმავე გზით
 *
 * გლობალური პარამეტრები configure-app.ts-შია, რომ e2e ტესტები **ზუსტად**
 * იმავე კონფიგურაციას ამოწმებდნენ.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './common/config/configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  configureApp(app);

  // ── Mechanism: SIGTERM/SIGINT-ზე NestJS გამოიძახებს OnModuleDestroy-ს,
  // ანუ PrismaService დაასრულებს კავშირს სწორად. ამის გარეშე deploy-ის დროს
  // მიმდინარე query-ები შეიძლება შუა გზაზე გაწყდეს.
  app.enableShutdownHooks();

  // ── Swagger: ინტერაქტიული დოკუმენტაცია /api/docs-ზე.
  // WHY: frontend-ის გარეშე ეს Postman-ს ცვლის — register → login →
  // "Authorize" ღილაკში token-ის ჩასმა → ყველა დაცული endpoint-ის ტესტირება.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('B2B CRM API')
    .setDescription(
      'სასწავლო პროექტი: NestJS + Prisma + PostgreSQL + JWT/RBAC. ' +
        'სავარჯიშოები: docs/EXERCISES.md',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 აპლიკაცია მუშაობს: http://localhost:${port}/api`);
  logger.log(`📚 Swagger:          http://localhost:${port}/api/docs`);
  logger.log(`❤️  Health:           http://localhost:${port}/api/health`);
}

await bootstrap();

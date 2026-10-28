/**
 * აპლიკაციის bootstrap — აქ ეწყობა ყველაფერი, რაც **ყველა** request-ს ეხება.
 *
 * Request-ის სრული გზა (იხ. docs/ARCHITECTURE.md):
 *   Request → helmet/CORS → Guards → Interceptors → Pipes(DTO) → Controller
 *           → Service → PrismaService → PostgreSQL → უკან იმავე გზით
 */
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── უსაფრთხოების HTTP header-ები.
  // გულწრფელად: helmet-ის უმეტესი ნაწილი browser-ზეა გათვლილი (XSS, clickjacking)
  // და cookie-ების გარეშე JSON API-სთვის ნაკლებად კრიტიკულია. მაგრამ ფასი
  // ორი ხაზია, ხოლო `X-Powered-By: Express`-ის მოშორება რეალური სარგებელია.
  app.use(helmet());

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ყველა route იწყება /api-თი — ასე static ფაილები და API ერთმანეთს არ ერევა.
  app.setGlobalPrefix('api');

  // ── Mechanism: URI versioning → /api/v1/companies.
  // WHY: როცა ერთ დღეს response-ის ფორმატს შეცვლი, ძველი მობილური აპლიკაციები
  // /v1-ზე დარჩებიან და არ დაემტვრევათ. სამი ხაზი ახლა — თავის ტკივილი ნაკლები მერე.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Mechanism: ValidationPipe არის კედელი გარე სამყაროსა და service-ებს შორის.
  // იგი DTO კლასის დეკორატორებს კითხულობს (class-validator) და არასწორ
  // request-ს 400-ით აბრუნებს, სანამ ის controller-ს მიაღწევს.
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: DTO-ში არაღწერილი ველები ჩუმად იშლება.
      // ⚠️ ეს მხოლოდ მაშინ მუშაობს, როცა DTO **კლასია** (და არა interface).
      whitelist: true,

      // forbidNonWhitelisted: ზედმეტ ველზე ჩუმად წაშლის ნაცვლად 400-ს ვაბრუნებთ.
      // WHY: typo-ს (`{ amont: 100 }`) აღმოჩენა მაშინვე სჯობს, ვიდრე გაკვირვებას,
      // თუ რატომ არ შეინახა მნიშვნელობა.
      forbidNonWhitelisted: true,

      // transform: plain JSON → DTO კლასის instance (სწორი ტიპებით).
      transform: true,

      transformOptions: {
        // შეგნებულად OFF: გვინდა, ყოველი კონვერტაცია DTO-ში explicit იყოს
        // (@Type(() => Number)). implicit მაგია ჩუმად აკეთებს ისეთ რამეს,
        // რასაც მერე საათობით ეძებ.
        enableImplicitConversion: false,
      },
    }),
  );

  // ── Mechanism: SIGTERM/SIGINT-ზე NestJS გამოიძახებს OnModuleDestroy-ს,
  // ანუ PrismaService დაასრულებს კავშირს სწორად. ამის გარეშე deploy-ის დროს
  // მიმდინარე query-ები შეიძლება შუა გზაზე გაწყდეს.
  app.enableShutdownHooks();

  // ── Swagger: ინტერაქტიული დოკუმენტაცია /api/docs-ზე.
  // WHY: frontend-ის გარეშე ეს Postman-ს ცვლის — register → login → "Authorize"
  // ღილაკში token-ის ჩასმა → ყველა დაცული endpoint-ის ტესტირება brauzer-იდან.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('B2B CRM API')
    .setDescription('სასწავლო პროექტი: NestJS + Prisma + PostgreSQL + JWT/RBAC')
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
  logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}

await bootstrap();

/**
 * configureApp — ყველა გლობალური პარამეტრი ერთ ადგილას.
 *
 * WHY ცალკე ფუნქცია და არა პირდაპირ main.ts-ში: e2e ტესტები აპლიკაციას
 * main.ts-ის გარეშე აწყობენ (`Test.createTestingModule`). თუ ეს კონფიგურაცია
 * მხოლოდ main.ts-ში იყო, ტესტებში ValidationPipe და global prefix არ
 * იმუშავებდა — ანუ ტესტი **სხვა** აპლიკაციას შეამოწმებდა, ვიდრე production-ში
 * გაშვებული. ასეთი განსხვავება ყველაზე მოღალატე bug-ების წყაროა.
 */
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';

export function configureApp(app: INestApplication): void {
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
      // თუ რატომ არ შეინახა მნიშვნელობა. ასევე ეს კლავს privilege escalation-ის
      // მცდელობას (`{"role":"ADMIN"}` რეგისტრაციაზე) — ჩუმად წაშლის ნაცვლად 400.
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
}

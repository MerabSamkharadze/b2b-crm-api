/**
 * Wiring ტესტი — აწყობის შემოწმება **ბაზის გარეშე**.
 *
 * WHY: TypeScript ვერ შეამოწმებს, რომ (ა) DI-ის გრაფი იხსნება,
 * (ბ) ყველა module რეგისტრირებულია app.module.ts-ში, (გ) route-ები
 * სწორ მისამართებზე დგება (`/api/v1/...`), (დ) guard-ები ეშვება.
 * ეს შეცდომები მხოლოდ გაშვებისას ჩნდება — ან ამ ტესტში.
 *
 * ── Mechanism: PrismaService-ს ვცვლით mock-ით (`overrideProvider`),
 * ამიტომ PostgreSQL არ გვჭირდება. `onModuleInit`/`onModuleDestroy`
 * სტუბია, რომ აპლიკაციამ ნორმალურად აიწიოს.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module.js';
import { configureApp } from './common/config/configure-app.js';
import { PrismaService } from './modules/prisma/prisma.service.js';

describe('AppModule wiring', () => {
  let app: INestApplication;
  let routes: string[];

  beforeAll(async () => {
    const prismaMock = {
      $connect: vi.fn().mockResolvedValue(undefined),
      $disconnect: vi.fn().mockResolvedValue(undefined),
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      onModuleInit: vi.fn().mockResolvedValue(undefined),
      onModuleDestroy: vi.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    // Express-ის router-იდან რეგისტრირებული გზების ამოღება.
    const server = app.getHttpAdapter().getInstance() as {
      router?: {
        stack: Array<{
          route?: { path: string; methods: Record<string, boolean> };
        }>;
      };
    };

    routes = (server.router?.stack ?? [])
      .filter((layer) => layer.route)
      .map((layer) => {
        const method =
          Object.keys(layer.route!.methods)[0]?.toUpperCase() ?? '?';
        return `${method} ${layer.route!.path}`;
      });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('DI-ის გრაფი იხსნება (ყველა provider მოიძებნა)', () => {
    expect(app).toBeDefined();
  });

  /**
   * ⚠️ რეგრესიის დაცვა: ეს ორი ტესტი ერთად ამტკიცებს, რომ "secure by
   * default + explicit opt-out" მართლა მუშაობს. ერთხელ უკვე დაიჭირეს
   * ნამდვილი bug: HealthController @Public()-ის გარეშე დაიწერა და
   * /api/health 401-ს აბრუნებდა — monitoring-ისთვის ეს მკვდარი endpoint-ია.
   */
  it('/api/health ღიაა token-ის გარეშე (@Public მოქმედებს)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('/api/v1/companies დაცულია token-ის გარეშე (default = closed)', async () => {
    await request(app.getHttpServer()).get('/api/v1/companies').expect(401);
  });

  it('global prefix და versioning მოქმედებს', () => {
    expect(routes.some((r) => r.startsWith('GET /api/v1/companies'))).toBe(
      true,
    );
  });

  it('health არის VERSION_NEUTRAL (/api/health და არა /api/v1/health)', () => {
    expect(routes).toContain('GET /api/health');
  });

  it.each([
    'POST /api/v1/auth/register',
    'POST /api/v1/auth/login',
    'GET /api/v1/users/me',
    'GET /api/v1/companies',
    'GET /api/v1/contacts',
    'GET /api/v1/deals',
    'PATCH /api/v1/deals/:id/stage',
    'GET /api/v1/deals/:id/stage-history',
    'GET /api/v1/activities/overdue',
    'GET /api/v1/dashboard/stats',
  ])('route რეგისტრირებულია: %s', (route) => {
    expect(routes).toContain(route);
  });

  it('activities/overdue დარეგისტრირდა :id-ზე ადრე (route-ების რიგითობა)', () => {
    // თუ ':id' წინ მოდის, "overdue" id-ად აღიქმება და ParseUUIDPipe 400-ს აგდებს.
    const overdue = routes.indexOf('GET /api/v1/activities/overdue');
    const byId = routes.indexOf('GET /api/v1/activities/:id');

    expect(overdue).toBeGreaterThanOrEqual(0);
    expect(byId).toBeGreaterThanOrEqual(0);
    expect(overdue).toBeLessThan(byId);
  });
});

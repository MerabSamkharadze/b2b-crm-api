/**
 * e2e smoke ტესტი — ნამდვილი HTTP, ნამდვილი ბაზა.
 *
 * ⚠️ მოითხოვს გაშვებულ PostgreSQL-ს და გატარებულ migration-ებს:
 *      npm run db:migrate && npm run db:seed && npm run test:e2e
 *
 * WHY unit ტესტების გარდა ესეც: unit ტესტმა არ იცის, რომ guard-ები
 * სწორი რიგით არის რეგისტრირებული, რომ ValidationPipe მართლა ირთვება
 * და რომ global prefix მუშაობს. ეს კითხვები მხოლოდ ასე მოწმდება.
 *
 * ── Mechanism: აპლიკაციას იმავე `configureApp()`-ით ვაწყობთ, რასაც main.ts
 * იყენებს — თორემ ტესტი სხვა კონფიგურაციას შეამოწმებდა, ვიდრე production.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/config/configure-app.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';

describe('Auth + RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // უნიკალური email ყოველ გაშვებაზე — თორემ მეორედ 409 დაგვხვდებოდა.
  const email = `e2e-${Date.now()}@crm.test`;
  const password = 'Password123!';
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // ტესტმა თავისი ნაგავი თვითონ უნდა დაალაგოს.
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  describe('health', () => {
    it('GET /api/health → 200 და ბაზა ხელმისაწვდომია', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    });
  });

  describe('რეგისტრაცია', () => {
    it('POST /api/v1/auth/register → 201 + token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password, firstName: 'E2E', lastName: 'ტესტი' })
        .expect(201);

      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.user.role).toBe('SALES_REP');
      accessToken = res.body.accessToken;
    });

    it('იმავე email-ით მეორედ → 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password, firstName: 'E2E', lastName: 'ტესტი' })
        .expect(409);
    });

    it('`role`-ის გაგზავნის მცდელობა → 400 (privilege escalation დაცული)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `admin-wannabe-${Date.now()}@crm.test`,
          password,
          firstName: 'ცბიერი',
          lastName: 'მომხმარებელი',
          role: 'ADMIN',
        })
        .expect(400);
    });

    it('73-სიმბოლოიანი პაროლი → 400 (bcrypt-ის 72-ბაიტიანი ლიმიტი)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `long-${Date.now()}@crm.test`,
          password: 'a'.repeat(73),
          firstName: 'გრძელი',
          lastName: 'პაროლი',
        })
        .expect(400);
    });
  });

  describe('შესვლა', () => {
    it('სწორი credential-ებით → 200', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body.accessToken).toBeTruthy();
    });

    it('არასწორი პაროლით → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('დაცული endpoint-ები', () => {
    it('token-ის გარეშე → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/companies').expect(401);
    });

    it('token-ით → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('გაყალბებული token-ით → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/companies')
        .set('Authorization', 'Bearer not.a.real.token')
        .expect(401);
    });
  });

  describe('როლობრივი შეზღუდვა (RolesGuard)', () => {
    it('SALES_REP ვერ ხედავს მომხმარებლების სიას → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('საკუთარ პროფილს კი ხედავს → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(email);
      // ⚠️ ყველაზე მნიშვნელოვანი მტკიცება ამ ფაილში:
      expect(res.body.password).toBeUndefined();
    });
  });

  describe('დაუსრულებელი სავარჯიშოები ხელმისაწვდომია (და არა ჩუმად გატეხილი)', () => {
    it('PATCH /deals/:id/stage → 501 Not Implemented (სავარჯიშო #07)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/deals/01930000-0000-7000-8000-0000000000ff/stage')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ toStage: 'QUALIFIED' })
        .expect(501);
    });
  });
});

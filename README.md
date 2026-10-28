# B2B CRM API

სასწავლო პროექტი enterprise-დონის backend არქიტექტურის ასათვისებლად:
**NestJS 12 + Prisma 7 + PostgreSQL 16 + JWT/RBAC**.

კოდი დეტალურად დაკომენტარებულია (რა, რატომ და როგორ მუშაობს), ხოლო
12 ადგილი შეგნებულად დაუსრულებელია — ისინი შენი სავარჯიშოებია.

📖 **დოკუმენტაცია**

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — request-ის გზა, module-ების გრაფი, RBAC, schema-ს ლოგიკა
- [`docs/EXERCISES.md`](docs/EXERCISES.md) — 12 სავარჯიშო, რეკომენდებული რიგითობა
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — 12 არქიტექტურული გადაწყვეტილება (და რა უარვყავით)

---

## 1. გაშვება

### ნაბიჯი 1 — PostgreSQL-ის ჩართვა

PostgreSQL 16 უკვე დაინსტალირებულია (`/Library/PostgreSQL/16`, EDB installer),
მაგრამ სერვისი შეიძლება გამორთული იყოს:

```bash
sudo launchctl bootstrap system /Library/LaunchDaemons/postgresql-16.plist
/Library/PostgreSQL/16/bin/pg_isready -h localhost -p 5432   # → accepting connections
```

გამორთვა: `sudo launchctl bootout system/postgresql-16`

### ნაბიჯი 2 — ბაზისა და როლის შექმნა

პაროლი `.env`-შია (git-ში არ ხვდება). ქვემოთ ბრძანება მას პირდაპირ
`.env`-იდან იღებს, ანუ არსად არ გჭირდება ხელით კოპირება:

```bash
PW=$(grep '^DATABASE_URL' .env | sed -E 's|.*crm_user:([^@]+)@.*|\1|')

/Library/PostgreSQL/16/bin/psql -U postgres -h localhost \
  -c "CREATE ROLE crm_user LOGIN CREATEDB PASSWORD '$PW';"

/Library/PostgreSQL/16/bin/createdb -U postgres -h localhost -O crm_user crm_db
```

⚠️ `CREATEDB` უფლება **აუცილებელია**: `prisma migrate dev` დროებით
"shadow database"-ს ქმნის, რომ migration-ის სისწორე შეადაროს schema-ს.
ამის გარეშე migration ჩავარდება.

ორივე ბრძანება `postgres`-ის პაროლს მოგთხოვთ (იგივე, რაც installer-ში მიუთითეთ).

### ნაბიჯი 3 — migration, seed და გაშვება

```bash
npm install          # postinstall ავტომატურად აკეთებს `prisma generate`
npm run db:migrate   # migration + generate
npm run db:seed      # საცდელი მონაცემები
npm run start:dev
```

გაიხსენი:

- **API** — http://localhost:3000/api/v1
- **Swagger** — http://localhost:3000/api/docs ← აქედან ტესტირება ყველაზე მოსახერხებელია
- **Health** — http://localhost:3000/api/health

---

## 2. საცდელი მომხმარებლები

პაროლი ყველასთვის: `Password123!`

| email              | როლი      | რას ფლობს                       |
| ------------------ | --------- | ------------------------------- |
| `admin@crm.test`   | ADMIN     | — (ყველაფერს ხედავს)            |
| `manager@crm.test` | MANAGER   | Initech; გუნდი: rep1 + rep2     |
| `rep1@crm.test`    | SALES_REP | Acme (4 გარიგება)               |
| `rep2@crm.test`    | SALES_REP | Globex (3 გარიგება)             |
| `lone@crm.test`    | SALES_REP | Umbrella — **მენეჯერის გარეშე** |

`lone@crm.test` სპეციალურად არსებობს: მისი ჩანაწერები მენეჯერს
**არასდროს** უნდა უჩანდეს. ეს შენი role-scope ლოგიკის "negative test"-ია.

### Swagger-ში ავტორიზაცია

1. `POST /api/v1/auth/login` → დააკოპირე `accessToken`
2. ზევით **Authorize** ღილაკი → ჩასვი token-ი
3. ყველა დაცული endpoint ხელმისაწვდომია

---

## 3. ბრძანებები

| ბრძანება             | რას აკეთებს                                                |
| -------------------- | ---------------------------------------------------------- |
| `npm run start:dev`  | watch რეჟიმში გაშვება                                      |
| `npm run build`      | TypeScript-ის კომპილაცია                                   |
| `npm run lint`       | oxlint (type-aware)                                        |
| `npm test`           | unit ტესტები (vitest)                                      |
| `npm run test:watch` | watch რეჟიმი — **სავარჯიშოებზე მუშაობისას ეს გამოიყენე**   |
| `npm run test:e2e`   | e2e ტესტები (სჭირდება გაშვებული ბაზა)                      |
| `npm run todos`      | ყველა სავარჯიშოს სია კოდიდან                               |
| `npm run db:migrate` | `prisma migrate dev` + `generate`                          |
| `npm run db:seed`    | საცდელი მონაცემები                                         |
| `npm run db:reset`   | ბაზის სრული გასუფთავება + migration-ების ხელახალი გატარება |
| `npm run db:studio`  | Prisma Studio — ბაზის ვიზუალური დათვალიერება               |

---

## 4. სტრუქტურა

```
prisma/
  schema.prisma         ბაზის სტრუქტურა (single source of truth)
  seed.ts               საცდელი მონაცემები
prisma.config.ts        Prisma 7-ის CLI კონფიგურაცია
src/
  main.ts               bootstrap + Swagger
  app.module.ts         root module, გლობალური guard/filter/interceptor
  prisma-client.ts      generated client-ის barrel (ერთადერთი შესასვლელი)
  generated/prisma/     ⚙️ generated (gitignore) — `npm run postinstall`
  common/
    authorization/      ⭐ ownerScope — row-level ავტორიზაცია
    config/             env-ის ვალიდაცია, configureApp
    dto/ helper/        pagination
    filters/            Prisma-ს შეცდომები → HTTP სტატუსები
    interceptors/       request-id + ხანგრძლივობა
  modules/
    prisma/             PrismaService (@Global)
    health/             GET /api/health
    auth/               JWT strategy, guards, decorators
    users/ companies/ contacts/ deals/ activities/ dashboard/
test/
  auth.e2e-spec.ts      HTTP-ის დონის smoke ტესტი
docs/                   ARCHITECTURE / EXERCISES / DECISIONS
```

---

## 5. სავარჯიშოებზე მუშაობა

```bash
npm run todos        # სად რა დარჩა
npm run test:watch   # ტესტები watch რეჟიმში
```

ყოველ სავარჯიშოს ტესტი **წინასწარ დაწერილია** და `describe.skip`-ით
გამორთული. პროცესი:

1. წაიკითხე `.spec.ts` ფაილი — ის ზუსტი სპეციფიკაციაა
2. წაშალე `.skip`
3. დაწერე კოდი, სანამ მწვანე არ გახდება

დაწყება: **#01** (გასათბობი) → **#04** (ყველაზე მნიშვნელოვანი).
სრული რიგითობა: [`docs/EXERCISES.md`](docs/EXERCISES.md).

---

## 6. ხშირი პრობლემები

| სიმპტომი                                            | მიზეზი და გამოსავალი                                               |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `Can't reach database server`                       | სერვისი გამორთულია → ნაბიჯი 1                                      |
| `P1012: url is no longer supported`                 | Prisma 7-ში `url` schema-ში აკრძალულია — ის `prisma.config.ts`-შია |
| `permission denied to create database`              | `crm_user`-ს `CREATEDB` არ აქვს → `ALTER ROLE crm_user CREATEDB;`  |
| `Cannot find module './generated/prisma/client.js'` | `npx prisma generate` (ან `npm install`)                           |
| `npm i prisma` აყენებს 8.0.0-rc-ს                   | ვერსიები `--save-exact`-ით არის pin-ული — არ მოხსნა                |
| 403 ყველგან ADMIN-ითაც                              | ეს ნორმაა სავარჯიშო #03-მდე (role იერარქია ჯერ არ არის)            |
| ყველა როლი ერთსა და იმავეს ხედავს                   | ეს ნორმაა სავარჯიშო #04-მდე (fail-closed stub)                     |
| 501 Not Implemented                                 | შეგნებული stub — იხ. `docs/EXERCISES.md`                           |

---

## 7. სტეკი

|            | ვერსია   | რატომ                                                                    |
| ---------- | -------- | ------------------------------------------------------------------------ |
| NestJS     | 12.3.2   | ESM + vitest + oxlint — ამ ვერსიის default scaffold                      |
| Prisma     | 7.10.1   | driver adapter (Rust engine-ის გარეშე), `prisma-client` generator        |
| PostgreSQL | 16.4     | ლოკალურად დაინსტალირებული (EDB)                                          |
| TypeScript | 6.0.3    | `experimentalDecorators` + `emitDecoratorMetadata` (DI-სთვის აუცილებელი) |
| ტესტები    | vitest 4 | NestJS 12-ის default (Jest-ის ნაცვლად)                                   |
| Linter     | oxlint   | NestJS 12-ის default (ESLint-ის ნაცვლად)                                 |

⚠️ **ESM-ის შედეგი:** ყველა relative import-ს სჭირდება `.js` გაფართოება
(`./auth.service.js`), თუნდაც TypeScript ფაილისთვის. ეს Node.js-ის ESM
სპეციფიკაციის მოთხოვნაა და არა NestJS-ის კაპრიზი.

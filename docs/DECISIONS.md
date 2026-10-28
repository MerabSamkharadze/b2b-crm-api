# გადაწყვეტილებები (ADR)

ყოველი ჩანაწერი აღწერს **რა ავირჩიეთ, რატომ, და რა უარვყავით**.
უარყოფილი ვარიანტი ხშირად უფრო სასწავლოა, ვიდრე არჩეული.

---

## ADR-01: Repository ფენა Prisma-ზე — უარვყავით

**არჩევანი:** service-ები პირდაპირ იძახებენ `PrismaService`-ს.

**უარყოფილი:** `DealsRepository`, რომელიც Prisma-ს ფუფუნებს.

**რატომ:** PrismaClient **თავად არის** data-mapper — ის აბსტრაქციაა ბაზაზე.
მისი შეფუთვა ნიშნავს აბსტრაქციის აბსტრაქციას, რასაც ორი ფასი აქვს:
ვკარგავთ generated ტიპებს (`Prisma.DealWhereInput`, `include`, `select`)
და ვიღებთ ათეულ ხაზს, რომელიც მხოლოდ გადასცემს გამოძახებას.

ეს "enterprise NestJS" tutorial-ების ყველაზე გავრცელებული შეცდომაა.
Repository აზრს იძენს, როცა ბაზის შეცვლა რეალური გეგმაა — ჩვენთან არ არის.

---

## ADR-02: role-scope — სუფთა ფუნქცია, არა Prisma `$extends`

**არჩევანი:** `ownerScope(actor)` — სუფთა, სინქრონული ფუნქცია, რომელიც
`where`-ის ფრაგმენტს აბრუნებს. გამოძახება explicit-ია ყოველ service-ში.

**უარყოფილი:** Prisma client extension, რომელიც `where`-ს ავტომატურად ავსებს.

**რატომ:** extension fail-closed და DRY იქნებოდა, მაგრამ (ა) სჭირდება
request-scoped კონტექსტი (AsyncLocalStorage ან `nestjs-cls`), (ბ) `$extends`
**ახალ ტიპს** აბრუნებს, ანუ `PrismaService extends PrismaClient` ტიპებს
ამტვრევს, (გ) `upsert`-ზე, nested write-ებზე და `groupBy`-ზე მწვავე
კუთხეები აქვს. სასწავლო პროექტისთვის მთავარი მინუსი: **მექანიზმი უხილავი ხდება.**

**ფასი, რომელსაც ვიხდით:** opt-in მიდგომაა — დავიწყება გაჟონვას იწვევს.
კომპენსაცია: წესი "`actor` ყოველი service მეთოდის პირველი პარამეტრია"
და e2e ტესტი, რომელიც როლებს შორის ხილვადობას ამოწმებს.

დეტალური შედარება: [`ARCHITECTURE.md#rbac`](./ARCHITECTURE.md#rbac).

---

## ADR-03: JWT-ში მხოლოდ `sub`

**არჩევანი:** payload = `{ sub: userId }`. role და გუნდი ყოველ request-ზე
ბაზიდან იკითხება.

**უარყოფილი:** `{ sub, email, role }` — კლასიკური "stateless" მიდგომა.

**რატომ:** token-ში ჩაწერილი role 15 წუთი "იყინება". თუ თანამშრომელს
უფლებებს ჩამოვართმევთ ან ანგარიშს დავაქტივირებთ, ძველი token კიდევ
იმუშავებს. უსაფრთხოება ჩვენთვის ამ შემთხვევაში ჯობია +1 SELECT-ს.

**ფასი:** თითო request = ერთი დამატებითი query. გადაწყვეტა, თუ გაიზრდება:
auth-კონტექსტის cache (Redis) მოკლე TTL-ით.

---

## ADR-04: Soft delete — v1-ში არ გვაქვს

**არჩევანი:** hard delete. გამონაკლისი: `User.isActive`, რადგან
ავთენტიფიკაციას ეს სჭირდება.

**უარყოფილი:** `deletedAt` ყველა ცხრილზე + გლობალური ფილტრი.

**რატომ:** `onDelete: Restrict` წესები ისედაც ბლოკავს საშიშ წაშლებს
(მომხმარებელი კლიენტებით, კომპანია გარიგებებით). ნახევრად დანერგილი
soft delete კი ყველაზე ცუდი ვარიანტია — ყოველ query-ს სჭირდება
`where: { deletedAt: null }` და **ერთი დავიწყება წაშლილ მონაცემს აბრუნებს**.

თუ დაგჭირდება: `$extends`-ით გლობალური ფილტრი + `deletedAt` ინდექსში.

---

## ADR-05: Pipeline-ის ეტაპები — enum, არა ცხრილი

**არჩევანი:** `enum DealStage` schema-ში.

**უარყოფილი:** `Pipeline` + `Stage` ცხრილები (კონფიგურირებადი pipeline).

**რატომ:** ეტაპები **კოდის ლოგიკის ნაწილია** — გადასვლის მატრიცა,
ალბათობები, dashboard-ის ფორმულები ყველა მათზეა აგებული. ცხრილი
მოითხოვდა, რომ ეს ლოგიკაც მონაცემებში გადასულიყო (rule engine).

**როდის გადავდივართ ცხრილზე:** როცა კლიენტს თავად უნდა შეეძლოს ეტაპების
განსაზღვრა (multi-tenant SaaS). ⚠️ enum-ის მნიშვნელობის წაშლა/გადარქმევა
მრავალსაფეხურიან migration-ს მოითხოვს — ეს enum-ის რეალური ფასია.

---

## ADR-06: ფული — Decimal + string API-ში

**არჩევანი:** ბაზაში `Decimal(12,2)`, API-ში string (`"15000.00"`).

**უარყოფილი:** (ა) `Float` — `0.1 + 0.2 !== 0.3`; (ბ) `Int` ცენტებში —
მუშაობს, მაგრამ ყოველ გამოთვლაში ×100/÷100 ჩნდება; (გ) JSON number
პასუხში — დიდ რიცხვზე სიზუსტე იკარგება **კლიენტის მხარეს**.

**ასევე უარყოფილი:** `Decimal.prototype.toJSON`-ის გადაწერა. გლობალური
ქცევის შეცვლა ბიბლიოთეკაში, რომელსაც სხვა კოდიც იყენებს, ერთ დღეს
სრულიად სხვა ადგილას იფეთქებს.

---

## ADR-07: `Activity.ownerId` და არა `userId`

**არჩევანი:** ოთხივე "owned" entity-ს (`Company`, `Contact`, `Deal`,
`Activity`) ერთი და იგივე სახელი აქვს — `ownerId`.

**რატომ:** ასე `ownerScope()` არის **ერთი** სუფთა ფუნქცია ერთ ველზე, და
არა პარამეტრიზებული generic, რომელსაც ველის სახელი უნდა გადასცე.
სახელების თანმიმდევრულობა აბსტრაქციის ფასს ამცირებს.

---

## ADR-08: `managerId` self-relation და არა `Team` ცხრილი

**არჩევანი:** `User.managerId → User` (self-relation), **depth 1**
scaffold-ში.

**უარყოფილი:** `Team` + `TeamMembership` ცხრილები.

**რატომ:** ერთი სვეტი, ნული დამატებითი module. ის სირთულე, რომელსაც ქმნის
(რეკურსიული ძებნა, ციკლის რისკი) **თავად არის გაკვეთილი** — სავარჯიშო #08.

**როდის იგებს `Team`:** როცა გამყიდველს რამდენიმე გუნდში უნდა იყოს
(many-to-many), ან გუნდს პირადი მენეჯერის გარეშე უნდა არსებობა.

---

## ADR-09: Multi-tenancy — არ გვაქვს (და სად დაემატებოდა)

**არჩევანი:** ერთი ორგანიზაცია. `organizationId` არსად არ არის.

**რატომ ეს ჩანაწერი არსებობს:** multi-tenancy-ის **შემდგომი** დამატება
მტკივნეულია — ყველა ცხრილს სჭირდება `organizationId`, ყველა unique
constraint-ს მისი ჩართვა (`@@unique([organizationId, domain])`), და
`ownerScope`-ს tenant-ის ფილტრი **ყველაზე გარეთა** დონეზე.

ანუ: თუ ეს ოდესმე დაგჭირდება, ჯერ ეს ჩანაწერი წაიკითხე.

---

## ADR-10: Prisma 7 + ESM (და არა Prisma 6 + CommonJS)

**არჩევანი:** Prisma 7.10.1, `prisma-client` generator, ESM
(`"type": "module"` — NestJS 12-ის default).

**უარყოფილი:** Prisma 6.19 + `prisma-client-js` + CommonJS — უფრო მეტი
tutorial ემთხვევა.

**რა შეიცვალა Prisma 7-ში (და სად აისახა):**

| ცვლილება                                                | სად                                                 |
| ------------------------------------------------------- | --------------------------------------------------- |
| `url` schema-ში **აკრძალულია**                          | `prisma.config.ts` (CLI) + driver adapter (runtime) |
| Rust query engine წაშლილია                              | `@prisma/adapter-pg` → node-postgres                |
| `output` სავალდებულოა, generated კოდი **TypeScript**-ია | `src/generated/prisma/` (gitignore + lint ignore)   |
| `.env` ავტომატურად აღარ იტვირთება                       | `import 'dotenv/config'` prisma.config.ts-ში        |
| seed აღარ ეშვება `migrate dev`-ზე                       | `npm run db:seed` ხელით                             |
| `migrate dev` აღარ აკეთებს `generate`-ს                 | `db:migrate` script ორივეს აკეთებს                  |

⚠️ **ვერსიები ზუსტად pin-ულია** (`--save-exact`): npm-ზე `prisma`-ს
`latest` tag ამ მომენტში `8.0.0-rc` (release candidate) იყო, `@prisma/client`-ის
კი `7.10.1`. უბრალო `npm i prisma` შეუთავსებელ RC-ს დააყენებდა.

**generated client-თან წვდომა:** ერთი barrel ფაილით (`src/prisma-client.ts`)
და **არა** tsconfig `paths` alias-ით. alias-ს runtime-ზე დამატებითი
ინსტრუმენტი სჭირდება (`tsc-alias`/`tsconfig-paths`), თორემ `nest build`-ის
შემდეგ "Cannot find module"-ით ვარდება.

---

## ADR-11: Dashboard — ცალკე module

**არჩევანი:** `DashboardModule` და არა `DealsService.getStats()`.

**რატომ:** სტატისტიკა რამდენიმე entity-ს კითხულობს (გარიგებები +
აქტივობები). `DealsService`-ში ჩადება მას ყველაფერზე დამოკიდებულს გახდიდა
და module-ების საზღვრებს დაშლიდა.

---

## ADR-12: რა შეგნებულად **არ** დავამატეთ

| ბიბლიოთეკა                       | რატომ არა                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `nestjs-cls` / AsyncLocalStorage | მხოლოდ Prisma `$extends`-ისთვის იყო საჭირო (ADR-02)                                                            |
| `nestjs-pino`                    | `LoggingInterceptor` + `x-request-id` საკმარისია ამ მასშტაბზე                                                  |
| `@casl/prisma`                   | სამი როლისთვის ზედმეტი სირთულე (ADR-02)                                                                        |
| `@nestjs/cqrs`                   | CRUD-ზე command/query გაყოფა ბლანკეტური over-engineering-ია                                                    |
| `@nestjs/terminus`               | health check 15 ხაზია — dependency არ ღირს                                                                     |
| Docker Compose                   | PostgreSQL 16 ლოკალურად **უკვე დაინსტალირებულია** (EDB installer). ამიტომ setup tutorial-ებისგან განსხვავდება. |

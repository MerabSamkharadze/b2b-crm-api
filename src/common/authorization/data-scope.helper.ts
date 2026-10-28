/**
 * Data Scope — "ვინ რომელ სტრიქონს ხედავს" (row-level visibility).
 *
 * ეს არის პროექტის ყველაზე მნიშვნელოვანი უსაფრთხოების ფუნქცია. მისი ამოცანაა
 * Prisma-ს `where` პირობის ის ნაწილი, რომელიც როლის მიხედვით ზღუდავს ხედვას:
 *   ADMIN     → ყველაფერი
 *   MANAGER   → საკუთარი + გუნდის
 *   SALES_REP → მხოლოდ საკუთარი
 *
 * ── Mechanism: რატომ **სუფთა ფუნქცია** და არა Guard/Interceptor/Prisma extension?
 * Guard-ს მხოლოდ "დიახ/არა"-ს თქმა შეუძლია — ის ვერ გადაწერს SQL-ის WHERE-ს.
 * სწორი არქიტექტურა ორფენოვანია:
 *   1. Guard  → უხეში შემოწმება: გაქვს თუ არა ამ endpoint-ზე უფლება (@Roles)
 *   2. where  → ზუსტი შემოწმება: რომელი სტრიქონები ხედავ
 * სრული შედარება (Prisma $extends-ის ჩათვლით): docs/ARCHITECTURE.md#rbac
 *
 * @see docs/EXERCISES.md — სავარჯიშო #04
 */
import type { AuthUser } from './auth-user.js';
import { Role } from '../../prisma-client.js';

/**
 * ობიექტი, რომელიც პირდაპირ ეწერება Prisma-ს `where`-ში.
 * ცარიელი ობიექტი `{}` ნიშნავს "ფილტრი არ არის" (ADMIN).
 */
export type OwnerScope = {
  ownerId?: string | { in: string[] };
};

/**
 * TODO: [Merab] #04 — Role-based data scope (პროექტის ცენტრალური სავარჯიშო)
 *
 * GOAL:      დააბრუნე Prisma-ს `where` ფრაგმენტი როლის მიხედვით:
 *              ADMIN     → {}                                   (შეზღუდვის გარეშე)
 *              MANAGER   → { ownerId: { in: [თავისი + გუნდის] } }
 *              SALES_REP → { ownerId: actor.id }
 *
 * WHY:       ამის გარეშე ყველა გამყიდველი ყველას კლიენტს დაინახავს. ეს
 *            არის multi-user CRM-ის ყველაზე ტიპური უსაფრთხოების ხარვეზი.
 *
 * HINT:      • `switch (actor.role)` + `Role` enum-ი უკვე იმპორტირებულია.
 *            • MANAGER-ს **თავისი** ჩანაწერებიც უნდა დარჩეს ხედვაში:
 *              `[actor.id, ...actor.subordinateIds]`
 *            • `subordinateIds` უკვე მოდის JwtStrategy-დან (იხ. auth-user.ts).
 *            • switch-ს `default` არ სჭირდება, თუ ყველა Role დაფარე —
 *              TypeScript-ი ახალი როლის დამატებაზე შეცდომას გაჩვენებს.
 *
 * DONE WHEN: წაშალე `.skip` ფაილში data-scope.helper.spec.ts → 8 ტესტი გაირბენს
 *
 * ⚠️ ამჟამინდელი stub შეგნებულად "fail closed"-ია: ყველა როლი მხოლოდ
 * საკუთარს ხედავს. უსაფრთხოების კოდში უმოქმედობამ **ნაკლები** უფლება უნდა
 * გასცეს და არა მეტი — ანუ bug იწვევს "ვერ ვხედავს"-ს და არა "ყველაფერს ვხედავ"-ს.
 */
export function ownerScope(actor: AuthUser): OwnerScope {
  return { ownerId: actor.id };
}

/**
 * `where` პირობა ერთი ჩანაწერის id-თ წაკითხვის/ცვლილებისთვის, scope-ით შეზღუდული.
 *
 * ── Mechanism: ეს არის RBAC-ის "დავიწყებული ნახევარი" — ჩაწერაც უნდა შეიზღუდოს.
 * Prisma-ს `extendedWhereUnique` საშუალებას გვაძლევს `where`-ში unique ველის
 * გარდა სხვა პირობებიც ჩავწეროთ:
 *     prisma.deal.update({ where: scopedWhereUnique(id, actor), data })
 * თუ სტრიქონი სხვისია, Prisma აგდებს **P2025**-ს, რომელსაც ჩვენი
 * PrismaExceptionFilter 404-ად თარგმნის.
 *
 * WHY 404 და არა 403: 403 ("არ გაქვს უფლება") ადასტურებს, რომ ჩანაწერი
 * არსებობს. ეს ინფორმაციის გაჟონვაა — თავდამსხმელს საშუალებას აძლევს
 * id-ების გადარჩევით გაიგოს, რა არსებობს ბაზაში. 404 არაფერს ამბობს.
 */
export function scopedWhereUnique(id: string, actor: AuthUser) {
  return { id, ...ownerScope(actor) };
}

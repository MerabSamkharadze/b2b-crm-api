/**
 * Prisma Client-ის ერთადერთი "კარიბჭე" (barrel) მთელი აპლიკაციისთვის.
 *
 * WHY: Prisma 7 generated კოდს `src/generated/prisma/`-ში წერს და ის
 * .gitignore-შია (regenerate-დება `npm install`-ზე). თუ ყველა ფაილი პირდაპირ
 * generated ფოლდერს მიმართავს, output path-ის შეცვლა ათეულ import-ს დაამტვრევს.
 * ამ ერთ ფაილში რომ გავიდეთ — ცვლილება მხოლოდ აქ ხდება.
 *
 * WHY NOT tsconfig `paths` alias: alias-ს runtime-ზე დამატებითი ინსტრუმენტი
 * სჭირდება (tsc-alias / tsconfig-paths), თორემ `nest build`-ის შემდეგ
 * "Cannot find module"-ით ვარდება. ერთი relative import ამას სჯობს.
 *
 * ── Mechanism: generated `client.ts` თავად აკეთებს `export * from './enums.js'`,
 * ამიტომ Role, DealStage და სხვა enum-ებიც აქედან მოდის — DTO-ებში
 * `@IsEnum(Role)`-სთვის საჭიროა **runtime value**, არა მხოლოდ type.
 */
export * from './generated/prisma/client.js';

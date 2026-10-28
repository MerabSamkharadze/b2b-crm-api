/**
 * Express-ის ტიპების გაფართოება (declaration merging).
 *
 * WHY: `request.user`-ს passport-ის ტიპებში ცარიელი interface აქვს, ანუ
 * `@CurrentUser()`-ის დაბრუნებული მნიშვნელობა პრაქტიკულად `any` იქნებოდა —
 * და `actor.subordinateIds`-ის typo TypeScript-ს ვერ დაეჭირა. ეს ფაილი
 * ავთენტიფიკაციის ტიპს მთელ აპლიკაციაში "აწებებს".
 *
 * ── Mechanism: `declare global` + `namespace Express` არსებულ ტიპს ავსებს
 * და არ ანაცვლებს. ფაილს import აქვს, ამიტომ module-ია — სწორედ ამიტომ
 * გვჭირდება `declare global`.
 */
import type { AuthUser } from '../common/authorization/auth-user.js';

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

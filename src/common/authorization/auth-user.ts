/**
 * AuthUser — ავთენტიფიცირებული მომხმარებლის "სურათი" ერთი request-ის ფარგლებში.
 *
 * WHY ცალკე ტიპი და არა Prisma-ს `User`: request-ის კონტექსტში არ გვჭირდება
 * password, createdAt და დანარჩენი — გვჭირდება მხოლოდ იმდენი, რამდენითაც
 * უფლებებს ვწყვეტთ. ასევე აქ არის `subordinateIds`, რომელიც ბაზაში სვეტად
 * არ არსებობს (ის JwtStrategy-ში ითვლება).
 *
 * ეს ობიექტი ხდება `request.user` (იხ. src/types/express.d.ts) და მას
 * `@CurrentUser()` დეკორატორი აწვდის controller-ებს.
 */
import type { Role } from '../../prisma-client.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;

  /**
   * პირდაპირი ქვეშევრდომების id-ები (depth 1).
   *
   * WHY აქ და არა ბაზიდან ყოველ ჯერზე: ასე role-scope ფილტრი რჩება **სუფთა,
   * სინქრონული ფუნქცია** — ბაზას არ ეკითხება, ანუ ტესტირება mock-ების გარეშე ხდება.
   * ფასი: ერთი დამატებითი JOIN JwtStrategy-ში თითო request-ზე, და მონაცემი
   * request-ის შიგნით შეიძლება ოდნავ "დაძველდეს". trade-off: docs/ARCHITECTURE.md#rbac
   */
  subordinateIds: string[];
}

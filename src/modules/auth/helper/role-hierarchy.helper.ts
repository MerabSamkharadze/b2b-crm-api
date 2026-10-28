/**
 * როლების იერარქია.
 *
 * ჩვენი RolesGuard ამჟამად **ზუსტ დამთხვევას** ითხოვს: `@Roles(Role.MANAGER)`
 * ADMIN-საც ჩააგდებს 403-ში, თუმცა ინტუიციურად ADMIN ყველაფერს უნდა შეეძლოს.
 * სწორედ ამ ინტუიციის კოდში გადმოტანაა სავარჯიშო #03.
 */
import { Role } from '../../../prisma-client.js';

/**
 * როლის "წონა" — რაც მეტია, მეტი უფლება.
 *
 * WHY რიცხვები და არა მხოლოდ სია: წონებით შედარება ერთი ოპერაციაა
 * (`weight(actual) >= weight(required)`) და ახალი როლის ჩამატება შუაში
 * არსებულ ლოგიკას არ ცვლის.
 */
export const ROLE_WEIGHT: Record<Role, number> = {
  [Role.SALES_REP]: 1,
  [Role.MANAGER]: 2,
  [Role.ADMIN]: 3,
};

/**
 * TODO: [Merab] #03 — როლების იერარქია
 *
 * GOAL:      დააბრუნე true, თუ `actual` როლი **აკმაყოფილებს** `required`-ს:
 *            ADMIN ⊃ MANAGER ⊃ SALES_REP.
 *            მაგ: roleSatisfies(Role.ADMIN, Role.MANAGER) === true
 *
 * WHY:       ამის გარეშე ყოველ endpoint-ზე ხელით უნდა ჩამოვთვალო
 *            `@Roles(Role.ADMIN, Role.MANAGER)` — და ერთ დღეს სადმე დაგავიწყდება
 *            ADMIN-ის მითითება, ანუ ადმინი თავისივე სისტემიდან "გაიგდება".
 *
 * HINT:      • ROLE_WEIGHT უკვე მზადაა — ერთი ხაზიც საკმარისია.
 *            • დაფიქრდი: ყოველთვის სწორია ასეთი წრფივი იერარქია? MANAGER-ს
 *              უნდა შეეძლოს ყველაფერი, რაც SALES_REP-ს? (პასუხი: ამ CRM-ში კი,
 *              მაგრამ "approve own expense"-ის ტიპის უფლებებთან წონები იშლება.
 *              სწორედ მაშინ გადმოდიან permission-ებზე — docs/DECISIONS.md)
 *
 * DONE WHEN: წაშალე `.skip` ფაილში role-hierarchy.helper.spec.ts → ტესტები მწვანეა
 *
 * ამჟამინდელი stub: ზუსტი დამთხვევა — "fail closed". ყველა endpoint ჩვენს
 * კოდში როლებს პირდაპირ ჩამოთვლის, ამიტომ აპლიკაცია სრულად მუშაობს.
 */
export function roleSatisfies(actual: Role, required: Role): boolean {
  return actual === required;
}

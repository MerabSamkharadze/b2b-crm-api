/**
 * Pagination — query-დან `skip`/`take`-ში და პასუხის meta-ინფორმაციაში გადაყვანა.
 *
 * ეს არის offset pagination (LIMIT/OFFSET). მისი უპირატესობა — "გვერდი 5"-ზე
 * პირდაპირ გადასვლა შეიძლება. მინუსი — დიდ offset-ზე ნელია (ბაზას ყველა
 * გამოტოვებული სტრიქონი მაინც უნდა წაიკითხოს). ალტერნატივა (cursor pagination)
 * და როდის გადავრთოთ: docs/DECISIONS.md
 */
import type { PaginationQueryDto } from '../dto/pagination-query.dto.js';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

/**
 * TODO: [Merab] #01 — Offset pagination
 *
 * GOAL:      გადააკეთე { page, limit } → { skip, take } Prisma-სთვის.
 *            გვერდი 1 → skip 0; გვერდი 3, limit 20 → skip 40.
 *
 * WHY:       ეს ყველაზე მარტივი სავარჯიშოა — მიზანია ჩაერთო ციკლში
 *            (კოდი → ტესტი → მწვანე) სანამ რთულ ლოგიკას მივადგებით.
 *
 * HINT:      • `page` და `limit` optional-ია, DTO-ში default-ები უწერია,
 *              მაგრამ ფუნქციას შეიძლება ცარიელი ობიექტიც მოუვიდეს —
 *              გამოიყენე `?? 1` და `?? 20`.
 *            • ფორმულა: skip = (page - 1) * limit
 *
 * DONE WHEN: წაშალე `.skip` ფაილში pagination.helper.spec.ts → ტესტები გაირბენს
 *
 * ამჟამინდელი stub: ყოველთვის პირველი 20 ჩანაწერი (ანუ "?page=2" იგივე
 * შედეგს აბრუნებს, რასაც "?page=1") — აპლიკაცია მუშაობს, უბრალოდ გვერდები არა.
 */
// oxlint-disable-next-line no-unused-vars -- `query` სავარჯიშო #01-ში გამოიყენება
export function toSkipTake(query: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  return { skip: 0, take: 20 };
}

/**
 * TODO: [Merab] #01b — Pagination-ის meta
 *
 * GOAL:      აწყობილი PageMeta: totalPages, hasNext, hasPrev.
 * HINT:      • totalPages = Math.ceil(total / limit) — ⚠️ total=0 შემთხვევაში
 *              გვინდა 0 და არა NaN/Infinity.
 *            • hasNext = page < totalPages
 * DONE WHEN: pagination.helper.spec.ts-ის `.skip` მოხსნილია და ტესტები მწვანეა
 */
export function buildPageMeta(
  total: number,
  query: PaginationQueryDto,
): PageMeta {
  return {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    total,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };
}

/**
 * მოკლე დამხმარე — service-ები ამას აბრუნებენ.
 * (ეს უკვე დაწერილია, რომ სავარჯიშო ფოკუსირებული დარჩეს.)
 */
export function paginate<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): Paginated<T> {
  return { items, meta: buildPageMeta(total, query) };
}

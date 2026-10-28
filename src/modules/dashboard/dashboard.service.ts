/**
 * DashboardService — ჯამური მაჩვენებლები (pipeline, forecast, აქტივობები).
 *
 * WHY ცალკე module და არა DealsService-ში: სტატისტიკა რამდენიმე entity-ს
 * კითხულობს (გარიგებები + აქტივობები). თუ მას DealsService-ში ჩავდებდით,
 * ეს service ყველაფერზე დამოკიდებული გახდებოდა და module-ების საზღვრები
 * დაიშლებოდა.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DealStage } from '../../prisma-client.js';
import type { AuthUser } from '../../common/authorization/auth-user.js';

/** პასუხის ფორმა — stub-იც ზუსტად ამ ფორმას აბრუნებს (ნულებით). */
export interface DashboardStats {
  /** თითო ეტაპზე: გარიგებების რაოდენობა და ჯამური თანხა. */
  pipeline: Array<{ stage: DealStage; count: number; totalAmount: string }>;
  /** მოგებული / წაგებული თანაფარდობა პროცენტებში. */
  winRatePercent: number;
  /** საშუალო გარიგების ზომა (მხოლოდ WON). */
  averageWonAmount: string;
  /** შეწონილი პროგნოზი: Σ (თანხა × ალბათობა / 100) აქტიურ გარიგებებზე. */
  weightedForecast: string;
  /** უახლოესი 30 დღეში დასახურებელი გარიგებების რაოდენობა. */
  closingNext30Days: number;
  /** ვადაგადაცილებული დავალებები. */
  overdueActivities: number;
}

/** ყველა ეტაპი ნულებით — zero-fill-ის საფუძველი (იხ. TODO-ს მინიშნება). */
const EMPTY_PIPELINE = Object.values(DealStage).map((stage) => ({
  stage,
  count: 0,
  totalAmount: '0.00',
}));

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TODO: [Merab] #10 — Dashboard-ის სტატისტიკა
   *
   * GOAL:      აწყობილი DashboardStats, **role-scope-ით შეზღუდული**
   *            (ownerScope(actor) ყველა query-ში — თორემ გამყიდველი მთელი
   *            კომპანიის ბრუნვას დაინახავს).
   *
   *   pipeline            → prisma.deal.groupBy({ by: ['stage'],
   *                           where, _count: true, _sum: { amount: true } })
   *   winRatePercent      → WON / (WON + LOST) × 100
   *   averageWonAmount    → aggregate({ where: { stage: WON }, _avg: { amount: true } })
   *   weightedForecast    → აქტიურ გარიგებებზე Σ (amount × probability / 100)
   *   closingNext30Days   → count({ expectedCloseDate: { gte: now, lte: now+30d },
   *                           stage: { notIn: [WON, LOST] } })
   *   overdueActivities   → count({ dueAt: { lt: now }, completedAt: null })
   *
   * WHY:       აგრეგაცია სხვა უნარია, ვიდრე CRUD. აქ ისწავლი groupBy-ს,
   *            aggregate-ს და — რაც მთავარია — აღმოაჩენ, რომ რეალური
   *            მონაცემებზე "აშკარა" ფორმულები ხარვეზიანია (იხ. ხაფანგები).
   *
   * ⚠️ ხაფანგები, რომლებიც შეგნებულად დაგელოდება:
   *   1. `groupBy` **არ აბრუნებს** იმ ეტაპებს, რომლებზეც გარიგება არ არის.
   *      ანუ ცარიელ pipeline-ზე ნახავ 2 ჩანაწერს 6-ის ნაცვლად. გამოსავალი:
   *      დაიწყე EMPTY_PIPELINE-ით და შედეგები მასში "ჩაასხი" (zero-fill).
   *   2. `_sum.amount` არის `Decimal | **null**` — null (და არა 0), როცა
   *      სტრიქონი არ არის. `_sum.amount.toFixed(2)` ასეთ შემთხვევაში იფეთქებს.
   *      გამოიყენე `?? new Prisma.Decimal(0)` ან პირდაპირ '0.00'.
   *   3. `orderBy`-ში მითითებული ველი **აუცილებლად** უნდა იყოს `by`-შიც,
   *      თორემ Prisma validation error-ს აგდებს.
   *   4. winRate-ის მნიშვნელი შეიძლება 0 იყოს → NaN. ნული ცალკე დაამუშავე.
   *   5. ეს ხუთი დამოუკიდებელი query ერთ `$transaction([...])`-ში ჩადე —
   *      `Promise.all` **არ** იძლევა ერთიან snapshot-ს, ანუ ციფრები
   *      ერთმანეთს შეიძლება არ დაემთხვეს (მაგ. deal დაემატა შუა გზაში).
   *
   * HINT:      • weightedForecast-ს Prisma-ს aggregate პირდაპირ ვერ დაითვლის
   *              (ორი სვეტის გამრავლება სჭირდება). ორი გზაა:
   *                ა) წაიკითხე აქტიური გარიგებები (amount, probability) და
   *                   დაითვალე JS-ში Prisma.Decimal-ით (მარტივი, საკმარისი);
   *                ბ) `$queryRaw` — SUM(amount * probability / 100) (სწრაფი).
   *              დაიწყე (ა)-თი.
   *            • Prisma.Decimal-ის ოპერაციები: .mul(), .div(), .add().
   *
   * DONE WHEN: `GET /api/v1/dashboard/stats` აბრუნებს რეალურ ციფრებს seed-ის
   *            მონაცემებზე, და ADMIN-ის ციფრები SALES_REP-ისას აღემატება
   *
   * ამჟამინდელი stub: სწორი ფორმის ნულოვანი პასუხი — frontend-ს/Swagger-ს
   * კონტრაქტი უკვე უჩანს, აპლიკაცია მუშაობს.
   */
  // oxlint-disable-next-line no-unused-vars -- `actor` სავარჯიშო #10-ში გამოიყენება
  async getStats(actor: AuthUser): Promise<DashboardStats> {
    return {
      pipeline: EMPTY_PIPELINE,
      winRatePercent: 0,
      averageWonAmount: '0.00',
      weightedForecast: '0.00',
      closingNext30Days: 0,
      overdueActivities: 0,
    };
  }
}

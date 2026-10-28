/**
 * Pipeline-ის წესები — სუფთა ფუნქციები, ბაზის გარეშე.
 *
 * WHY ცალკე ფაილი და არა service-ში: ასე წესების ტესტირება mock-ების,
 * ბაზისა და HTTP-ის გარეშე ხდება. ეს "functional core, imperative shell"
 * პატერნია — ლოგიკა სუფთაა, გვერდითი ეფექტები service-ში რჩება.
 */
import { DealStage, Role } from '../../../prisma-client.js';

/**
 * აქტიური ეტაპების თანმიმდევრობა (pipeline-ის "მილი").
 * WON/LOST აქ არ არის — ისინი ტერმინალურია, მილის გარეთ.
 */
export const ACTIVE_STAGE_ORDER = [
  DealStage.LEAD,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
] as const;

/** ტერმინალური ეტაპები — გარიგება დახურულია. */
export const TERMINAL_STAGES = [DealStage.WON, DealStage.LOST] as const;

export function isTerminal(stage: DealStage): boolean {
  return (TERMINAL_STAGES as readonly DealStage[]).includes(stage);
}

/**
 * ეტაპის "ტიპური" ალბათობა პროცენტებში.
 * გამოიყენება weighted forecast-ში (dashboard) და ეტაპის ცვლილებაზე.
 */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  [DealStage.LEAD]: 10,
  [DealStage.QUALIFIED]: 25,
  [DealStage.PROPOSAL]: 50,
  [DealStage.NEGOTIATION]: 75,
  [DealStage.WON]: 100,
  [DealStage.LOST]: 0,
};

/**
 * TODO: [Merab] #06 — ეტაპების გადასვლის მატრიცა
 *
 * GOAL:      დააბრუნე true მხოლოდ **დასაშვებ** გადასვლაზე. წესები:
 *
 *   1. from === to                  → false  (ეს გადასვლა არ არის)
 *   2. from ტერმინალურია (WON/LOST) → true მხოლოდ ADMIN-ისთვის ("reopen")
 *   3. to არის WON ან LOST          → true ყველა აქტიური ეტაპიდან
 *   4. აქტიური → აქტიური           → წინ **მხოლოდ ერთი ნაბიჯით**,
 *                                      უკან — ნებისმიერი მანძილით
 *      (LEAD → NEGOTIATION = false, NEGOTIATION → LEAD = true)
 *
 * WHY:       ამ წესების გარეშე გარიგება შეიძლება WON-იდან LEAD-ში დაბრუნდეს
 *            და ფინანსური ანგარიში დაემტვრეს. ასევე "ერთი ნაბიჯით წინ"
 *            აიძულებს გამყიდველს pipeline-ის რეალური მდგომარეობა აღწეროს
 *            და არა პირდაპირ "თითქმის მოვიგე"-ზე გადახტეს.
 *
 * HINT:      • ACTIVE_STAGE_ORDER.indexOf(stage) მოგცემს პოზიციას
 *              (ტერმინალურზე -1 დაბრუნდება — გაითვალისწინე).
 *            • isTerminal() უკვე დაწერილია.
 *            • წინ ერთი ნაბიჯი: `toIndex - fromIndex === 1`
 *            • უკან: `toIndex < fromIndex`
 *
 * DONE WHEN: წაშალე `.skip` ფაილში deal-stage.helper.spec.ts → 12 ტესტი მწვანეა
 *
 * ამჟამინდელი stub: ყოველთვის false. ეს სუფთა ფუნქციაა — აპლიკაციას
 * არაფერს ამტვრევს, უბრალოდ ეტაპის ცვლილება ჯერ ვერ მოხდება.
 */
/* oxlint-disable no-unused-vars -- პარამეტრები სავარჯიშო #06-ში გამოიყენება */
export function isTransitionAllowed(
  from: DealStage,
  to: DealStage,
  actorRole: Role,
): boolean {
  return false;
}
/* oxlint-enable no-unused-vars */

/** სავარჯიშო #06-ის ტესტები — ეს ფაილი არის წესების ზუსტი სპეციფიკაცია. */
import { isTransitionAllowed } from './deal-stage.helper.js';
import { DealStage, Role } from '../../../prisma-client.js';

const rep = Role.SALES_REP;
const admin = Role.ADMIN;

describe.skip('isTransitionAllowed (სავარჯიშო #06)', () => {
  describe('წესი 1: იმავე ეტაპზე გადასვლა არ არის გადასვლა', () => {
    it('LEAD → LEAD აკრძალულია', () => {
      expect(isTransitionAllowed(DealStage.LEAD, DealStage.LEAD, rep)).toBe(
        false,
      );
    });
  });

  describe('წესი 2: ტერმინალურიდან გამოსვლა მხოლოდ ADMIN-ს შეუძლია', () => {
    it('WON → NEGOTIATION აკრძალულია გამყიდველისთვის', () => {
      expect(
        isTransitionAllowed(DealStage.WON, DealStage.NEGOTIATION, rep),
      ).toBe(false);
    });

    it('WON → NEGOTIATION დასაშვებია ADMIN-ისთვის', () => {
      expect(
        isTransitionAllowed(DealStage.WON, DealStage.NEGOTIATION, admin),
      ).toBe(true);
    });

    it('LOST → QUALIFIED დასაშვებია ADMIN-ისთვის', () => {
      expect(
        isTransitionAllowed(DealStage.LOST, DealStage.QUALIFIED, admin),
      ).toBe(true);
    });

    it('LOST → WON აკრძალულია გამყიდველისთვის', () => {
      expect(isTransitionAllowed(DealStage.LOST, DealStage.WON, rep)).toBe(
        false,
      );
    });
  });

  describe('წესი 3: დახურვა ნებისმიერი აქტიური ეტაპიდან', () => {
    it('LEAD → LOST დასაშვებია (ადრეული უარი ნორმაა)', () => {
      expect(isTransitionAllowed(DealStage.LEAD, DealStage.LOST, rep)).toBe(
        true,
      );
    });

    it('NEGOTIATION → WON დასაშვებია', () => {
      expect(
        isTransitionAllowed(DealStage.NEGOTIATION, DealStage.WON, rep),
      ).toBe(true);
    });

    it('LEAD → WON დასაშვებია (იშვიათი, მაგრამ ხდება)', () => {
      expect(isTransitionAllowed(DealStage.LEAD, DealStage.WON, rep)).toBe(
        true,
      );
    });
  });

  describe('წესი 4: აქტიურ ეტაპებს შორის მოძრაობა', () => {
    it('LEAD → QUALIFIED დასაშვებია (ერთი ნაბიჯი წინ)', () => {
      expect(
        isTransitionAllowed(DealStage.LEAD, DealStage.QUALIFIED, rep),
      ).toBe(true);
    });

    it('LEAD → PROPOSAL აკრძალულია (ორი ნაბიჯი წინ)', () => {
      expect(isTransitionAllowed(DealStage.LEAD, DealStage.PROPOSAL, rep)).toBe(
        false,
      );
    });

    it('NEGOTIATION → LEAD დასაშვებია (უკან ნებისმიერი მანძილით)', () => {
      expect(
        isTransitionAllowed(DealStage.NEGOTIATION, DealStage.LEAD, rep),
      ).toBe(true);
    });

    it('PROPOSAL → QUALIFIED დასაშვებია (ერთი ნაბიჯი უკან)', () => {
      expect(
        isTransitionAllowed(DealStage.PROPOSAL, DealStage.QUALIFIED, rep),
      ).toBe(true);
    });
  });
});

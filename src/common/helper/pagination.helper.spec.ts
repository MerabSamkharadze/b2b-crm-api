/**
 * სავარჯიშო #01-ის ტესტები. წაშალე `.skip`, როცა დაწერ toSkipTake/buildPageMeta-ს.
 */
import { buildPageMeta, toSkipTake } from './pagination.helper.js';

describe.skip('pagination helper (სავარჯიშო #01)', () => {
  describe('toSkipTake', () => {
    it('პირველი გვერდი არ ტოვებს ჩანაწერებს', () => {
      expect(toSkipTake({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
    });

    it('მესამე გვერდი ტოვებს 40-ს', () => {
      expect(toSkipTake({ page: 3, limit: 20 })).toEqual({
        skip: 40,
        take: 20,
      });
    });

    it('იცავს default-ებს, როცა query ცარიელია', () => {
      expect(toSkipTake({})).toEqual({ skip: 0, take: 20 });
    });

    it('limit-ს ითვალისწინებს offset-ის დათვლისას', () => {
      expect(toSkipTake({ page: 4, limit: 5 })).toEqual({ skip: 15, take: 5 });
    });
  });

  describe('buildPageMeta', () => {
    it('totalPages-ს ზევით ამრგვალებს', () => {
      expect(buildPageMeta(45, { page: 1, limit: 20 })).toMatchObject({
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('ბოლო გვერდზე hasNext არის false', () => {
      expect(buildPageMeta(45, { page: 3, limit: 20 })).toMatchObject({
        hasNext: false,
        hasPrev: true,
      });
    });

    it('ცარიელ შედეგზე totalPages არის 0 (და არა NaN)', () => {
      expect(buildPageMeta(0, { page: 1, limit: 20 })).toMatchObject({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });
  });
});

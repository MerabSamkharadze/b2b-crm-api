/**
 * სავარჯიშო #04-ის ტესტები.
 *
 * ეს ფაილი შეგნებულად `describe.skip`-ით იწყება: სანამ ownerScope-ს არ
 * დაწერ, ტესტები არ გაირბენს და `npm test` მწვანე იქნება. როცა მზად იქნები —
 * წაშალე `.skip` და გაუშვი `npm run test:watch`.
 *
 * WHY ტესტები წინასწარ: ასე გაქვს უკუკავშირი (feedback loop) და არა მიხვედრა.
 * ტესტი არის სავარჯიშოს **სპეციფიკაცია** — წაიკითხე, სანამ კოდს დაიწყებ.
 */
import { ownerScope, scopedWhereUnique } from './data-scope.helper.js';
import { Role } from '../../prisma-client.js';
import type { AuthUser } from './auth-user.js';

/** ტესტის მონაცემების მოკლე შემქმნელი (test fixture factory). */
function user(role: Role, overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-self',
    email: 'self@crm.test',
    role,
    subordinateIds: [],
    ...overrides,
  };
}

describe.skip('ownerScope (სავარჯიშო #04)', () => {
  describe('ADMIN', () => {
    it('არ ამატებს ფილტრს — ცარიელ ობიექტს აბრუნებს', () => {
      expect(ownerScope(user(Role.ADMIN))).toEqual({});
    });

    it('ownerId საერთოდ არ უნდა იყოს გასაღებებში', () => {
      expect(Object.keys(ownerScope(user(Role.ADMIN)))).toHaveLength(0);
    });
  });

  describe('MANAGER', () => {
    it('ხედავს საკუთარ ჩანაწერებს', () => {
      const scope = ownerScope(
        user(Role.MANAGER, { subordinateIds: ['rep-1', 'rep-2'] }),
      );
      expect(scope.ownerId).toMatchObject({
        in: expect.arrayContaining(['user-self']),
      });
    });

    it('ხედავს გუნდის ყველა წევრის ჩანაწერს', () => {
      const scope = ownerScope(
        user(Role.MANAGER, { subordinateIds: ['rep-1', 'rep-2'] }),
      );
      expect(scope.ownerId).toMatchObject({
        in: expect.arrayContaining(['rep-1', 'rep-2']),
      });
    });

    it('გუნდის გარეშე მენეჯერი მხოლოდ საკუთარს ხედავს', () => {
      expect(ownerScope(user(Role.MANAGER))).toEqual({
        ownerId: { in: ['user-self'] },
      });
    });
  });

  describe('SALES_REP', () => {
    it('ownerId არის ზუსტი id (string), და არა { in: [...] }', () => {
      expect(ownerScope(user(Role.SALES_REP))).toEqual({
        ownerId: 'user-self',
      });
    });

    it('subordinateIds-ს უგულებელყოფს (გამყიდველს გუნდი არ ჰყავს)', () => {
      const scope = ownerScope(
        user(Role.SALES_REP, { subordinateIds: ['rep-1'] }),
      );
      expect(scope).toEqual({ ownerId: 'user-self' });
    });
  });

  describe('scopedWhereUnique', () => {
    it('აერთიანებს id-ს და scope-ს ერთ where პირობაში', () => {
      expect(scopedWhereUnique('deal-1', user(Role.SALES_REP))).toEqual({
        id: 'deal-1',
        ownerId: 'user-self',
      });
    });
  });
});

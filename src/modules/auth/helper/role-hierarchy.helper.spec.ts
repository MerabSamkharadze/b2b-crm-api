/** სავარჯიშო #03-ის ტესტები. წაშალე `.skip`, როცა roleSatisfies-ს დაწერ. */
import { roleSatisfies } from './role-hierarchy.helper.js';
import { Role } from '../../../prisma-client.js';

describe.skip('roleSatisfies (სავარჯიშო #03)', () => {
  it('ADMIN აკმაყოფილებს ყველა მოთხოვნას', () => {
    expect(roleSatisfies(Role.ADMIN, Role.ADMIN)).toBe(true);
    expect(roleSatisfies(Role.ADMIN, Role.MANAGER)).toBe(true);
    expect(roleSatisfies(Role.ADMIN, Role.SALES_REP)).toBe(true);
  });

  it('MANAGER აკმაყოფილებს MANAGER-ს და SALES_REP-ს', () => {
    expect(roleSatisfies(Role.MANAGER, Role.MANAGER)).toBe(true);
    expect(roleSatisfies(Role.MANAGER, Role.SALES_REP)).toBe(true);
  });

  it('MANAGER ვერ აკმაყოფილებს ADMIN-ს', () => {
    expect(roleSatisfies(Role.MANAGER, Role.ADMIN)).toBe(false);
  });

  it('SALES_REP აკმაყოფილებს მხოლოდ საკუთარ დონეს', () => {
    expect(roleSatisfies(Role.SALES_REP, Role.SALES_REP)).toBe(true);
    expect(roleSatisfies(Role.SALES_REP, Role.MANAGER)).toBe(false);
    expect(roleSatisfies(Role.SALES_REP, Role.ADMIN)).toBe(false);
  });
});

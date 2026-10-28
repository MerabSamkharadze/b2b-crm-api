/**
 * JWT-ის payload — **მინიმალური** შემადგენლობით.
 *
 * WHY მხოლოდ `sub` (subject = მომხმარებლის id):
 * ყველაფერი, რასაც token-ში ჩავწერთ, token-ის ვადის ბოლომდე "იყინება".
 * თუ role-ს ჩავწერდით და ADMIN-ს უფლებებს ჩამოვართმევდით, მას ძველი token-ით
 * 15 წუთი კიდევ იმუშავებდა. ამიტომ role და გუნდი ყოველ request-ზე ბაზიდან
 * იკითხება (JwtStrategy.validate).
 *
 * ფასი: თითო request = ერთი SELECT. ეს არის შეგნებული გაცვლა
 * "stateless სისწრაფე" ↔ "უფლებების მყისიერი გაუქმება" — docs/DECISIONS.md
 */
export interface JwtPayload {
  /** მომხმარებლის id (JWT-ის სტანდარტული claim). */
  sub: string;

  /** ამ ორს ხელს არ ვახლებთ — jsonwebtoken ავტომატურად ამატებს. */
  iat?: number;
  exp?: number;
}

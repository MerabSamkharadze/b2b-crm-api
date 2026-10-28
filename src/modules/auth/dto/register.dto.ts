/**
 * RegisterDto — საჯარო რეგისტრაცია.
 *
 * ── Mechanism: OmitType არის "mapped type" — ის CreateUserDto-ს აშენებს
 * ხელახლა, `role`-ისა და `managerId`-ის გარეშე, ვალიდაციის ყველა წესის შენახვით.
 *
 * WHY კრიტიკულია: role-ის ამოღების გარეშე ნებისმიერი სტუმარი
 * `{"email":"...","password":"...","role":"ADMIN"}`-ით დარეგისტრირდებოდა
 * და მყისიერად ადმინი გახდებოდა (privilege escalation).
 *
 * ბონუსი: ValidationPipe-ის `forbidNonWhitelisted: true`-ს წყალობით, role-ის
 * გაგზავნის მცდელობა ჩუმად არ წაიშლება — კლიენტი 400-ს მიიღებს.
 */
import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto.js';

export class RegisterDto extends OmitType(CreateUserDto, [
  'role',
  'managerId',
] as const) {}

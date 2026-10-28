/**
 * CreateUserDto — მომხმარებლის შექმნა **ადმინის მიერ**.
 *
 * ⚠️ ყურადღება: ეს DTO `role`-ს იღებს, ამიტომ მას მხოლოდ ADMIN-ის endpoint
 * იყენებს. საჯარო რეგისტრაციას ცალკე RegisterDto აქვს — თუ ორივეს ერთი DTO
 * ემსახურებოდა, ნებისმიერი სტუმარი `{"role": "ADMIN"}`-ით დარეგისტრირდებოდა.
 * ამ ხარვეზს "mass assignment / privilege escalation" ჰქვია.
 */
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../prisma-client.js';

export class CreateUserDto {
  // ── Mechanism: @Transform ამუშავებს მნიშვნელობას **ვალიდაციამდე**.
  // WHY აუცილებელია: PostgreSQL-ის @unique case-sensitive-ია, ანუ
  // "Merab@X.com" და "merab@x.com" ორ სხვადასხვა ჩანაწერად ჩაჯდება და
  // login-ის დროს მომხმარებელი ვერ გაიგებს, რატომ არ მუშაობს პაროლი.
  @ApiProperty({ example: 'merab@crm.test' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email არასწორი ფორმატისაა' })
  email: string;

  // ── Mechanism: MaxLength(72) **არ არის კაპრიზი** — bcrypt ალგორითმი
  // 72 ბაიტზე მეტს ჩუმად ჭრის. ანუ 100-სიმბოლოიანი პაროლის 73-ე სიმბოლოდან
  // შემდეგ ყველაფერი უგულებელყოფილია და მომხმარებელი ცრუ უსაფრთხოების
  // განცდაში რჩება. ჯობია გულწრფელად ვუთხრათ 400-ით.
  // (ზუსტად 72 **ბაიტია**; ქართული ასო 3 ბაიტია — ამიტომ ლიმიტი კონსერვატიულია.)
  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო' })
  @MaxLength(72, {
    message: 'პაროლი არ უნდა აღემატებოდეს 72 სიმბოლოს (bcrypt-ის ლიმიტი)',
  })
  password: string;

  @ApiProperty({ example: 'მერაბ' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'სამხარაძე' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({ enum: Role, default: Role.SALES_REP })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'მენეჯერის id (გუნდური იერარქიისთვის)' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

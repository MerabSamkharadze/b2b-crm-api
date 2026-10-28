/**
 * LoginDto — შესვლა.
 *
 * ⚠️ ყურადღება: აქ პაროლზე @MinLength **შეგნებულად არ გვაქვს**. login-ის
 * ვალიდაცია არ უნდა ამბობდეს, რამდენი სიმბოლო სჭირდება პაროლს — ეს
 * არასაჭირო ინფორმაციაა თავდამსხმელისთვის. უბრალოდ "არასწორია" და მორჩა.
 */
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@crm.test' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

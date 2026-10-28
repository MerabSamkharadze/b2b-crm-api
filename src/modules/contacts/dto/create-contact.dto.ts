/** CreateContactDto — კონტაქტი ყოველთვის კომპანიას ეკუთვნის. */
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'ნინო' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'ბერიძე' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  // ნორმალიზება იმავე მიზეზით, რაც User-ზე: @@unique([companyId, email])
  // case-sensitive-ია, ანუ "N@x.com" და "n@x.com" ორ ჩანაწერს დაუშვებდა.
  @ApiPropertyOptional({ example: 'nino@acme.com' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  // ── Mechanism: @IsPhoneNumber(null) ნებისმიერი ქვეყნის ფორმატს იღებს,
  // თუ ნომერი საერთაშორისო ფორმატშია (+995...). ქვეყნის კოდის მითითება
  // ('GE') მხოლოდ ლოკალურ ნომრებს დაუშვებდა — B2B-ში ეს ზედმეტი შეზღუდვაა.
  @ApiPropertyOptional({ example: '+995555123456' })
  @IsOptional()
  @IsPhoneNumber(undefined, {
    message: 'ტელეფონი საერთაშორისო ფორმატში უნდა იყოს (+995...)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'CTO' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  position?: string;

  @ApiProperty({ description: 'კომპანიის id (უნდა იყოს თქვენთვის ხილული)' })
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({ description: 'მხოლოდ ADMIN/MANAGER-ისთვის' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

/**
 * UpdateUserRoleDto — როლის შეცვლა (მხოლოდ ADMIN).
 *
 * WHY ცალკე DTO და არა `PartialType(CreateUserDto)`: როლის შეცვლა
 * პრივილეგირებული ოპერაციაა და მკაცრად ერთ ველს უნდა ეხებოდეს. ასე
 * შეუძლებელია შემთხვევით პაროლიც "განახლდეს" იმავე request-ით.
 */
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../prisma-client.js';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}

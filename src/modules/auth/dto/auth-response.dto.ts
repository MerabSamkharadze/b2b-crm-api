/** რას აბრუნებს register/login — ერთ ადგილას აღწერილი API-ის კონტრაქტი. */
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../prisma-client.js';

export class AuthResponseDto {
  @ApiProperty({ description: 'Bearer token Authorization header-ისთვის' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({
    example: '15m',
    description: 'token-ის სიცოცხლის ხანგრძლივობა',
  })
  expiresIn: string;

  @ApiProperty({
    example: { id: 'uuid', email: 'admin@crm.test', role: Role.ADMIN },
  })
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

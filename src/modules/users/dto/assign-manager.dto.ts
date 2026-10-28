/**
 * AssignManagerDto — მომხმარებლისთვის მენეჯერის მიჩენა (გუნდის აწყობა).
 * null ნიშნავს "მენეჯერის მოხსნას".
 */
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignManagerDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'null = მენეჯერის მოხსნა',
  })
  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}

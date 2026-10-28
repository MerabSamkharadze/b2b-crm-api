/**
 * UsersController — მომხმარებლების მართვა.
 *
 * ყურადღება მიაქციე, როგორ ფარავს ორი ფენა ერთმანეთს:
 *   @Roles(...)  → "შეგიძლია თუ არა ამ endpoint-ზე მოსვლა"  (RolesGuard)
 *   service-ის where → "რომელ ჩანაწერებს ხედავ"            (data-scope)
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma-client.js';
import { AssignManagerDto } from './dto/assign-manager.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * მიმდინარე მომხმარებლის პროფილი.
   *
   * ── Mechanism: ბაზაში წასვლა არც გვჭირდება id-ის გასაგებად — ის უკვე
   * `request.user`-შია (JwtStrategy-მ ჩაწერა). სრული პროფილისთვის კი
   * findOne-ს ვიძახებთ, რადგან token-ში მხოლოდ `sub` გვაქვს.
   */
  @Get('me')
  @ApiOperation({ summary: 'ჩემი პროფილი' })
  async me(@CurrentUser() actor: AuthUser): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.users.findOne(actor.id));
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'მომხმარებლების სია (ADMIN — ყველა, MANAGER — თავისი გუნდი)',
  })
  findAll(@CurrentUser() actor: AuthUser, @Query() query: PaginationQueryDto) {
    return this.users.findAll(actor, query);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'როლის შეცვლა (მხოლოდ ADMIN)' })
  async updateRole(
    // ── Mechanism: ParseUUIDPipe არასწორ id-ს 400-ით აბრუნებს, სანამ ბაზამდე
    // მივა. ასე არასწორი ფორმატი არასდროს აღწევს service-ს.
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.users.updateRole(id, dto.role));
  }

  @Patch(':id/manager')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'მენეჯერის მიჩენა — გუნდის აწყობა (მხოლოდ ADMIN)' })
  async assignManager(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignManagerDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.from(
      await this.users.assignManager(id, dto.managerId ?? null),
    );
  }
}

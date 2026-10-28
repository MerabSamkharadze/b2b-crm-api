import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'ჯამური მაჩვენებლები (სავარჯიშო #10)',
    description:
      'ციფრები role-scope-ით შეზღუდულია: ADMIN ხედავს მთელ კომპანიას, ' +
      'MANAGER — გუნდს, SALES_REP — მხოლოდ საკუთარს.',
  })
  getStats(@CurrentUser() actor: AuthUser) {
    return this.dashboard.getStats(actor);
  }
}

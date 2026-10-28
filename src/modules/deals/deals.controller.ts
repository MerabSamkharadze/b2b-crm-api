import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../../prisma-client.js';
import { DealsService } from './deals.service.js';
import { ChangeStageDto } from './dto/change-stage.dto.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import { DealResponseDto } from './dto/deal-response.dto.js';
import { QueryDealsDto } from './dto/query-deals.dto.js';
import { UpdateDealDto } from './dto/update-deal.dto.js';

@ApiTags('deals')
@ApiBearerAuth('access-token')
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'ახალი გარიგება (ისტორიის პირველი ჩანაწერითურთ)' })
  @ApiResponse({ status: 201, type: DealResponseDto })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateDealDto) {
    return this.deals.create(actor, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'გარიგებების სია',
    description: 'ფილტრები სავარჯიშო #05-ის დასრულებამდე უგულებელყოფილია.',
  })
  findAll(@CurrentUser() actor: AuthUser, @Query() query: QueryDealsDto) {
    return this.deals.findAll(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ერთი გარიგება' })
  findOne(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deals.findOne(actor, id);
  }

  @Get(':id/stage-history')
  @ApiOperation({ summary: 'ეტაპების ისტორია (აუდიტის კვალი)' })
  findStageHistory(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deals.findStageHistory(actor, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'გარიგების განახლება',
    description: 'ეტაპი აქ **არ** იცვლება — მისთვის ცალკე endpoint არსებობს.',
  })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.deals.update(actor, id, dto);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'pipeline-ის ეტაპის ცვლილება (სავარჯიშო #07)' })
  @ApiResponse({ status: 501, description: 'ჯერ არ არის იმპლემენტირებული' })
  changeStage(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStageDto,
  ) {
    return this.deals.changeStage(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'გარიგების წაშლა (ADMIN/MANAGER)' })
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deals.remove(actor, id);
  }
}

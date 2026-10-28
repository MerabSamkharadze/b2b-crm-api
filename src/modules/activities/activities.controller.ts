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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/authorization/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ActivitiesService } from './activities.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { QueryActivitiesDto } from './dto/query-activities.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

@ApiTags('activities')
@ApiBearerAuth('access-token')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Post()
  @ApiOperation({ summary: 'ახალი აქტივობა (ზარი/შეხვედრა/დავალება)' })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateActivityDto) {
    return this.activities.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'აქტივობების სია' })
  findAll(@CurrentUser() actor: AuthUser, @Query() query: QueryActivitiesDto) {
    return this.activities.findAll(actor, query);
  }

  /**
   * ⚠️ რიგითობა მნიშვნელოვანია: 'overdue' უნდა იყოს ':id'-ზე **ზემოთ**.
   * თორემ Express-ი "overdue"-ს id-ად აღიქვამს და ParseUUIDPipe 400-ს დააბრუნებს.
   * ეს NestJS/Express-ის routing-ის ტიპური ხაფანგია.
   */
  @Get('overdue')
  @ApiOperation({ summary: 'ვადაგადაცილებული დავალებები' })
  findOverdue(@CurrentUser() actor: AuthUser) {
    return this.activities.findOverdue(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ერთი აქტივობა' })
  findOne(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activities.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'აქტივობის განახლება' })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activities.update(actor, id, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'დავალების დასრულებულად მონიშვნა' })
  complete(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activities.complete(actor, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'აქტივობის წაშლა' })
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activities.remove(actor, id);
  }
}

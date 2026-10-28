/**
 * CompaniesController.
 *
 * ყველა route-ს ავთენტიფიკაცია სჭირდება (JwtAuthGuard გლობალურია და @Public()
 * აქ არ გვაქვს). როლობრივი შეზღუდვა მხოლოდ წაშლაზეა — დანარჩენს
 * ყველა როლი აკეთებს, ოღონდ **მხოლოდ იმ ჩანაწერებზე, რომლებსაც ხედავს**
 * (ამას service-ის ownerScope უზრუნველყოფს).
 */
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
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { QueryCompaniesDto } from './dto/query-companies.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@ApiTags('companies')
@ApiBearerAuth('access-token')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'ახალი კომპანია' })
  @ApiResponse({ status: 409, description: 'ასეთი domain უკვე არსებობს' })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(actor, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'კომპანიების სია (ხედვა როლზეა დამოკიდებული)',
    description:
      'ADMIN — ყველა, MANAGER — თავისი და გუნდის, SALES_REP — მხოლოდ თავისი. ' +
      'სანამ სავარჯიშო #04 არ გაკეთდება, ყველა მხოლოდ საკუთარს ხედავს.',
  })
  findAll(@CurrentUser() actor: AuthUser, @Query() query: QueryCompaniesDto) {
    return this.companies.findAll(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ერთი კომპანია' })
  @ApiResponse({ status: 404, description: 'არ არსებობს ან არ გეკუთვნის' })
  findOne(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companies.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'კომპანიის განახლება' })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  // 204 No Content — წაშლის შემდეგ დასაბრუნებელი სხეული არ გვაქვს.
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'კომპანიის წაშლა (ADMIN/MANAGER)' })
  @ApiResponse({
    status: 409,
    description: 'კომპანიას გარიგებები აქვს (onDelete: Restrict)',
  })
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.companies.remove(actor, id);
  }
}

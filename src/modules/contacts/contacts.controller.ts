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
import { ContactsService } from './contacts.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { QueryContactsDto } from './dto/query-contacts.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

@ApiTags('contacts')
@ApiBearerAuth('access-token')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'ახალი კონტაქტი კომპანიაში' })
  @ApiResponse({
    status: 404,
    description: 'კომპანია ვერ მოიძებნა ან არ გეკუთვნის',
  })
  @ApiResponse({
    status: 409,
    description: 'ამ კომპანიაში ასეთი email უკვე არსებობს',
  })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateContactDto) {
    return this.contacts.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'კონტაქტების სია' })
  findAll(@CurrentUser() actor: AuthUser, @Query() query: QueryContactsDto) {
    return this.contacts.findAll(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ერთი კონტაქტი' })
  findOne(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'კონტაქტის განახლება' })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.update(actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'კონტაქტის წაშლა (გარიგებები რჩება)' })
  remove(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contacts.remove(actor, id);
  }
}

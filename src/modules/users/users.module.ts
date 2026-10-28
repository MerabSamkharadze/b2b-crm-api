/**
 * UsersModule.
 *
 * ⚠️ exports: [UsersService] — ამის გარეშე AuthModule მას ვერ გამოიყენებდა.
 * NestJS-ში provider **კერძოა** (private) module-ისთვის, სანამ პირდაპირ
 * არ გააქვს export-ში. ეს შეგნებული დიზაინია: module-ის შიდა იმპლემენტაცია
 * არ უნდა გაჟონოს უნებლიედ.
 */
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

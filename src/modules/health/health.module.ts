/**
 * HealthModule — PrismaService-ს არ აიმპორტებს, რადგან PrismaModule @Global-ია.
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

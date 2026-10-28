import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller.js';
import { CompaniesService } from './companies.service.js';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService],
  // export, რადგან DealsService-ს კომპანიის არსებობის შემოწმება სჭირდება.
  exports: [CompaniesService],
})
export class CompaniesModule {}

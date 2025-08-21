import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { ScheduledTest } from './entities/scheduled-test.entity';
import { ScheduledTestsService } from './scheduled-test.service';
import { ScheduledTestsController } from './scheduled-test.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledTest]),
    ScheduleModule.forRoot(), // enable cron
  ],
  controllers: [ScheduledTestsController],
  providers: [ScheduledTestsService],
})
export class ScheduledTestsModule implements OnModuleInit {
  constructor(private readonly scheduledTestsService: ScheduledTestsService) {}

  async onModuleInit() {
    await this.scheduledTestsService.loadAllCronJobs();
  }
}

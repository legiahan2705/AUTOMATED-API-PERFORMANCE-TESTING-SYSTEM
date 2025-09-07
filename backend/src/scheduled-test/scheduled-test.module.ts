import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { ScheduledTest } from './entities/scheduled-test.entity';
import { ScheduledTestsService } from './scheduled-test.service';
import { ScheduledTestsController } from './scheduled-test.controller';
import { ReportsModule } from 'src/reports/reports.module';
import { TestRunModule } from 'src/test-run/test-run.module';
import { EmailModule } from 'src/email/email.module';
import { GcsService } from 'src/project/gcs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledTest]),
    ScheduleModule.forRoot(), // enable cron
    ReportsModule,
    TestRunModule, 
    EmailModule, 
    

  ],
  controllers: [ScheduledTestsController],
  providers: [ScheduledTestsService, GcsService],
  exports: [ScheduledTestsService],
})
export class ScheduledTestsModule implements OnModuleInit {
  constructor(private readonly scheduledTestsService: ScheduledTestsService) {}

  async onModuleInit() {
    await this.scheduledTestsService.loadAllCronJobs();
  }
}

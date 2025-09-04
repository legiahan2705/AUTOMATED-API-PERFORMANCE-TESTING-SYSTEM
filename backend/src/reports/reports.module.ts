import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ChartGeneratorService } from './chartgenerator.service';

@Module({
  providers: [ReportsService, ChartGeneratorService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}

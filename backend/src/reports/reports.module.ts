import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ChartGeneratorService } from './chartgenerator.service';
import { GcsService } from 'src/project/gcs.service';

@Module({
  providers: [ReportsService, ChartGeneratorService, GcsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}

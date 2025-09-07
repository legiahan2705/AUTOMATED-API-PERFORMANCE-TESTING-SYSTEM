import { Module } from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';
import { AiAnalysisController } from './ai-analysis.controller';
import { GcsService } from 'src/project/gcs.service';


@Module({
  providers: [AiAnalysisService, GcsService],
  controllers: [AiAnalysisController],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}

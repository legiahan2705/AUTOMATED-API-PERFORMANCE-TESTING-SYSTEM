import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TestRun } from './entities/test-run.entity';
import { ApiResultDetail } from './entities/api-result-detail.entity';
import { PerfQuickResultDetail } from './entities/perf_quick_result_detail.entity';
import { PerfScriptResultDetail } from './entities/perf_script_result_detail.entity';
import { Project } from 'src/project/entities/project.entity';

import { PostmanTestController } from './controllers/postman-test.controller';
import { QuickPerformanceTestController } from './controllers/quick-test.controller'; 
import { K6ScriptTestController } from './controllers/k6-script-test.controller';


import { PostmanTestService } from './services/postman-test.service';
import { QuickPerformanceTestService } from './services/quick-test.service'; 
import { K6ScriptTestService } from './services/k6-script-test.service';
import { TestRunController } from './test-run.controller';
import { TestRunService } from './test-run.service';
import { Test } from '@nestjs/testing';
import { ScheduledTest } from 'src/scheduled-test/entities/scheduled-test.entity';
import { AiAnalysisModule } from 'src/ai_analysis/ai-analysis.module';


@Module({
  imports: [TypeOrmModule.forFeature([
    TestRun, ApiResultDetail, PerfQuickResultDetail, Project, PerfScriptResultDetail, ScheduledTest
  ]) ,AiAnalysisModule,], 
  controllers: [
    PostmanTestController,
    QuickPerformanceTestController, 
    K6ScriptTestController,
    TestRunController,
  
  ],
  providers: [
    PostmanTestService,
    QuickPerformanceTestService, 
    K6ScriptTestService,
    TestRunService,
  
  ],
  exports: [TestRunService],
})
export class TestRunModule {}

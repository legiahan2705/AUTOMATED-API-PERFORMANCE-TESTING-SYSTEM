import { Controller, Post, Param, ParseIntPipe, Query } from '@nestjs/common';
import { QuickPerformanceTestService } from '../services/quick-test.service';

@Controller('test-run/performance')
export class QuickPerformanceTestController {
  constructor(private readonly quickPerfService: QuickPerformanceTestService) {}

  // POST /test-run/performance/quick/:projectId
  @Post('/quick/:projectId')
   runTest(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('scheduleId') scheduleId?: number,
  ) {
    return this.quickPerfService.runQuickTest(projectId, scheduleId);
  }
}

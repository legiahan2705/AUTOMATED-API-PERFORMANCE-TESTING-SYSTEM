import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { QuickPerformanceTestService } from '../services/quick-test.service';

@Controller('test-run/performance')
export class QuickPerformanceTestController {
  constructor(private readonly quickPerfService: QuickPerformanceTestService) {}

  // POST /test-run/performance/:projectId
  @Post('/quick/:projectId')
  async runQuickTest(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.quickPerfService.runQuickTest(projectId);
  }
}

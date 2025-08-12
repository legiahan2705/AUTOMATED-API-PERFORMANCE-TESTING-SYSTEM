import { Controller, Param, Post } from '@nestjs/common';
import { K6ScriptTestService } from '../services/k6-script-test.service';

@Controller('test-run/performance')
export class K6ScriptTestController {
  constructor(private readonly k6ScriptTestService: K6ScriptTestService) {}

  @Post('k6/:projectId')
  async runTest(@Param('projectId') projectId: number) {
    return await this.k6ScriptTestService.runK6ScriptTest(projectId);
  }
}

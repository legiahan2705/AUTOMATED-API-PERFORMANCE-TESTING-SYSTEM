import { Controller, Param, Post  , Query} from '@nestjs/common';
import { K6ScriptTestService } from '../services/k6-script-test.service';

@Controller('test-run/performance')
export class K6ScriptTestController {
  constructor(private readonly k6ScriptTestService: K6ScriptTestService) {}


  @Post('/script/:projectId')
  
  runTest(
    @Param('projectId') projectId: number,
    @Query('scheduleId') scheduleId?: number,
  ) {
    return this.k6ScriptTestService.runK6ScriptTest(projectId, scheduleId);
  }
  

}

import { Controller, Param, Post, Query } from '@nestjs/common';
import { PostmanTestService } from '../services/postman-test.service';

@Controller('test-run/postman')
export class PostmanTestController {
  constructor(private readonly postmanTestService: PostmanTestService) {}

  @Post(':projectId')
  runTest(
    @Param('projectId') projectId: number,
    @Query('scheduleId') scheduleId?: number,
  ) {
    return this.postmanTestService.runPostmanTest(projectId, scheduleId);
  }
}

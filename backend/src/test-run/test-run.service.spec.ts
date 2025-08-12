import { Test, TestingModule } from '@nestjs/testing';
import { TestRunService } from './test-run.service';

describe('TestRunService', () => {
  let service: TestRunService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestRunService],
    }).compile();

    service = module.get<TestRunService>(TestRunService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

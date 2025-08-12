import { Test, TestingModule } from '@nestjs/testing';
import { TestRunController } from './test-run.controller';

describe('TestRunController', () => {
  let controller: TestRunController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestRunController],
    }).compile();

    controller = module.get<TestRunController>(TestRunController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

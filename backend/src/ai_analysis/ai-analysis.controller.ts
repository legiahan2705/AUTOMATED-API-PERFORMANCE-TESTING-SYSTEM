import { Controller, Get, Query } from '@nestjs/common';
import { AiAnalysisService, HeuristicOutput } from './ai-analysis.service';

@Controller('ai-analysis')
export class AiAnalysisController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  @Get()
analyze(
  @Query('file') filePath: string
): { aiInput: string; aiOutput: string; structured: HeuristicOutput; meta: any } | { error: string } | null {
  if (!filePath) {
    return { error: 'Missing file query param' };
  }
  try {
    return this.aiAnalysisService.analyzeWithAI(filePath);
  } catch (err: any) {
    return { error: err.message };
  }
}

}
